import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/client.js'
import { computeGapDelta } from '../ai/reengage.js'
import { draftOutreach } from '../ai/outreach.js'
import { getCandidateContext, getEmployerContext, logEvent } from '../middleware/auth.js'
import type { MatchDimension, CandidateCapabilityDimension } from '../validators/index.js'

export const reengageRouter = new Hono()

// POST /reengage/trigger — employer triggers re-engagement check for a near-miss candidate
reengageRouter.post('/trigger', async (c) => {
  const { employerUser } = await getEmployerContext(c)
  const { candidate_id, original_match_id } = await c.req.json() as {
    candidate_id: string
    original_match_id: string
  }

  if (!candidate_id || !original_match_id) {
    return c.json({ error: 'candidate_id and original_match_id are required' }, 400)
  }

  // Fetch original match with explanation and candidate context
  const { data: originalMatch, error: matchError } = await db
    .from('match')
    .select(`
      id, assessment_id,
      match_explanation(gap_dimensions),
      candidate(
        id, name,
        candidate_profile(degree, field_of_study, current_job_title)
      ),
      role(title, context_notes)
    `)
    .eq('id', original_match_id)
    .single()

  if (matchError || !originalMatch) throw new HTTPException(404, { message: 'Original match not found' })

  // Fetch assessment used at time of original match (the "previous" baseline)
  const { data: previousAssessment } = await db
    .from('capability_assessment')
    .select('id, dimensions')
    .eq('id', originalMatch.assessment_id)
    .single()

  if (!previousAssessment) throw new HTTPException(404, { message: 'Original assessment not found' })

  // Fetch candidate's current latest assessment (the "trigger" — new data)
  const { data: currentAssessment } = await db
    .from('capability_assessment')
    .select('id, dimensions')
    .eq('candidate_id', candidate_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!currentAssessment) throw new HTTPException(404, { message: 'No assessment found for candidate' })

  if (currentAssessment.id === previousAssessment.id) {
    return c.json({ triggered: false, reason: 'No new assessment found since original match' })
  }

  const explanation = Array.isArray(originalMatch.match_explanation)
    ? originalMatch.match_explanation[0]
    : originalMatch.match_explanation

  const gapDelta = await computeGapDelta({
    previousDimensions: previousAssessment.dimensions as CandidateCapabilityDimension[],
    currentDimensions: currentAssessment.dimensions as CandidateCapabilityDimension[],
    originalGapDimensions: (explanation?.gap_dimensions ?? []) as MatchDimension[],
  })

  if (gapDelta.length === 0) {
    return c.json({ triggered: false, reason: 'No meaningful capability change detected' })
  }

  // Draft re-engagement outreach — frame improved dimensions as the hook
  const candidate = Array.isArray(originalMatch.candidate)
    ? originalMatch.candidate[0]
    : originalMatch.candidate as { id: string; name: string; candidate_profile: Array<{ degree: string | null; field_of_study: string | null; current_job_title: string | null }> } | null
  const profile = candidate?.candidate_profile?.[0] ?? null
  const role = Array.isArray(originalMatch.role)
    ? originalMatch.role[0]
    : originalMatch.role as { title: string; context_notes: string | null } | null

  const improvedAsDimensions: MatchDimension[] = gapDelta.map((g) => ({
    name: g.dimension_name,
    tier: g.tier,
    candidate_score: g.current_score,
    required_score: g.previous_score,
    confidence: g.confidence,
    explanation: `Improved from ${Math.round(g.previous_score * 100)}% to ${Math.round(g.current_score * 100)}%`,
  }))

  const outreach = await draftOutreach({
    strongDimensions: improvedAsDimensions,
    candidate: {
      name: candidate?.name ?? 'the candidate',
      current_job_title: profile?.current_job_title ?? null,
      degree: profile?.degree ?? null,
      field_of_study: profile?.field_of_study ?? null,
    },
    role: {
      title: role?.title ?? '',
      context_notes: role?.context_notes ?? null,
    },
  })

  // Upsert outreach_message — UNIQUE(match_id) means update if already exists
  const { data: existingMsg } = await db
    .from('outreach_message')
    .select('id')
    .eq('match_id', original_match_id)
    .single()

  let messageId: string

  if (existingMsg) {
    const { data: updated, error: updateError } = await db
      .from('outreach_message')
      .update({
        draft_text: outreach.draft_text,
        final_text: null,
        employer_edited: false,
        character_count: outreach.draft_text.length,
        delivery_status: 'draft' as never,
        sent_at: null,
      })
      .eq('id', existingMsg.id)
      .select('id')
      .single()
    if (updateError || !updated) throw new HTTPException(500, { message: 'Failed to update outreach message' })
    messageId = updated.id
  } else {
    const { data: created, error: createError } = await db
      .from('outreach_message')
      .insert({
        match_id: original_match_id,
        draft_text: outreach.draft_text,
        employer_edited: false,
        character_count: outreach.draft_text.length,
        delivery_status: 'draft' as never,
      })
      .select('id')
      .single()
    if (createError || !created) throw new HTTPException(500, { message: 'Failed to create outreach message' })
    messageId = created.id
  }

  // Create reengage_record
  const { data: reengageRecord, error: reengageError } = await db
    .from('reengage_record')
    .insert({
      candidate_id,
      employer_id: employerUser.employer_id,
      original_match_id,
      trigger_assessment_id: currentAssessment.id,
      previous_assessment_id: previousAssessment.id,
      gap_delta: gapDelta as never,
      outreach_message_id: messageId,
      status: 'pending' as never,
    })
    .select()
    .single()

  if (reengageError || !reengageRecord) {
    throw new HTTPException(500, { message: reengageError?.message ?? 'Failed to create reengage record' })
  }

  return c.json(
    { triggered: true, reengage_record: reengageRecord, outreach_message: { id: messageId, draft_text: outreach.draft_text } },
    201,
  )
})

// GET /reengage/candidate — pending re-engagements for the authenticated candidate
reengageRouter.get('/candidate', async (c) => {
  const { candidate } = await getCandidateContext(c)

  const { data: records, error } = await db
    .from('reengage_record')
    .select(`
      id, gap_delta, status, created_at,
      outreach_message:outreach_message_id(draft_text, character_count),
      original_match:original_match_id(
        id,
        role(title, employer(company_name, industry))
      )
    `)
    .eq('candidate_id', candidate.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw new HTTPException(500, { message: error.message })
  return c.json(records ?? [])
})

// GET /reengage/:id — full re-engagement record with gap delta and outreach
reengageRouter.get('/:id', async (c) => {
  const id = c.req.param('id')

  const { data: record, error } = await db
    .from('reengage_record')
    .select(`
      *,
      outreach_message:outreach_message_id(*),
      original_match:original_match_id(
        id, overall_score,
        role(title, context_notes, employer(company_name, industry))
      )
    `)
    .eq('id', id)
    .single()

  if (error || !record) throw new HTTPException(404, { message: 'Re-engagement record not found' })
  return c.json(record)
})

// POST /reengage/:id/respond — candidate accepts or declines re-engagement
reengageRouter.post('/:id/respond', async (c) => {
  const { candidate } = await getCandidateContext(c)
  const id = c.req.param('id')
  const { decision } = await c.req.json() as { decision: string }

  if (decision !== 'accepted' && decision !== 'declined') {
    return c.json({ error: 'decision must be accepted or declined' }, 400)
  }

  const { data: record } = await db
    .from('reengage_record')
    .select('id, outreach_message_id')
    .eq('id', id)
    .eq('candidate_id', candidate.id)
    .single()

  if (!record) throw new HTTPException(404, { message: 'Re-engagement record not found' })

  await db.from('reengage_record').update({ status: decision as never }).eq('id', id)

  if (decision === 'accepted' && record.outreach_message_id) {
    await db
      .from('outreach_message')
      .update({ delivery_status: 'sent' as never, sent_at: new Date().toISOString() })
      .eq('id', record.outreach_message_id)
  }

  await logEvent({
    actor_type: 'candidate',
    actor_id: candidate.id,
    event_type: decision === 'accepted' ? 'reengage_opted_in' : 'reengage_opted_out',
    related_entity_type: 'reengage_record',
    related_entity_id: id,
  })

  return c.json({ ok: true, status: decision })
})
