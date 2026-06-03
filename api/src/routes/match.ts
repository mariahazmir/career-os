import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/client.js'
import { extractCandidateCapability } from '../ai/capability.js'
import { scoreAndExplainMatch } from '../ai/matching.js'
import { draftOutreach } from '../ai/outreach.js'
import { getEmployerContext, logEvent } from '../middleware/auth.js'
import type { CandidateProfileInput, MatchDimension } from '../validators/index.js'

export const matchRouter = new Hono()

// Run the matching pipeline for a role
matchRouter.post('/run', async (c) => {
  const { employerUser } = await getEmployerContext(c)
  const { role_id } = await c.req.json() as { role_id: string }
  if (!role_id) return c.json({ error: 'role_id required' }, 400)

  // Fetch role + map
  const { data: role, error: roleError } = await db
    .from('role')
    .select('*, role_capability_map(*)')
    .eq('id', role_id)
    .eq('employer_id', employerUser.employer_id)
    .single()

  if (roleError || !role) throw new HTTPException(404, { message: 'Role not found' })

  const maps = role.role_capability_map as Array<{ id: string; dimensions: unknown }>
  if (!maps?.length) throw new HTTPException(400, { message: 'Role has no capability map yet' })
  const map = maps[0]
  const roleDimensions = map.dimensions as Array<{
    tier: number; name: string; required_score: number; weight: number; must_have: boolean
  }>

  // Fetch all visible candidates
  const { data: profiles, error: profilesError } = await db
    .from('candidate_profile')
    .select('*, candidate(id, name, email)')
    .in('visibility_status', ['open', 'passive'])

  if (profilesError) throw new HTTPException(500, { message: profilesError.message })
  if (!profiles?.length) return c.json({ created: 0, message: 'No visible candidates found' })

  let created = 0

  for (const profile of profiles) {
    const candidate = profile.candidate as { id: string; name: string; email: string } | null
    if (!candidate) continue

    // Skip if match already exists for this role + candidate
    const { data: existing } = await db
      .from('match')
      .select('id')
      .eq('candidate_id', candidate.id)
      .eq('role_id', role_id)
      .limit(1)

    if (existing?.length) continue

    // Get or create capability assessment
    let assessmentId: string
    const { data: latestAssessment } = await db
      .from('capability_assessment')
      .select('id, dimensions, underemployment_signal')
      .eq('candidate_id', candidate.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let candidateDimensions: Array<{
      tier: number; name: string; score: number; confidence: 'verified' | 'inferred' | 'self_reported'; evidence_source: string
    }>

    if (latestAssessment) {
      assessmentId = latestAssessment.id
      candidateDimensions = latestAssessment.dimensions as typeof candidateDimensions
    } else {
      // Run assessment
      const profileInput: CandidateProfileInput = {
        degree: profile.degree,
        field_of_study: profile.field_of_study,
        institution: profile.institution,
        graduation_year: profile.graduation_year,
        current_job_title: profile.current_job_title,
        current_employer: profile.current_employer,
        years_of_experience: profile.years_of_experience,
        underemployment_flag: profile.underemployment_flag,
        career_intent: profile.career_intent,
        skills: profile.skills,
        projects: profile.projects,
        certifications: profile.certifications,
      }
      const assessment = await extractCandidateCapability(profileInput)
      const { data: newAssessment, error: assessmentError } = await db
        .from('capability_assessment')
        .insert({
          candidate_id: candidate.id,
          model_version: 'gemini-2.5-pro',
          dimensions: assessment.dimensions as never,
          underemployment_signal: assessment.underemployment_signal,
          tier_1_coverage: assessment.tier_1_coverage ?? null,
          tier_2_coverage: assessment.tier_2_coverage ?? null,
          tier_3_coverage: assessment.tier_3_coverage ?? null,
          tier_4_trajectory_score: assessment.tier_4_trajectory_score ?? null,
        })
        .select()
        .single()
      if (assessmentError || !newAssessment) continue
      assessmentId = newAssessment.id
      candidateDimensions = assessment.dimensions
    }

    // Score the match
    const matchScore = await scoreAndExplainMatch({
      candidateDimensions,
      roleDimensions,
      contextNotes: role.context_notes,
      candidateSummary: {
        name: candidate.name,
        current_job_title: profile.current_job_title,
        degree: profile.degree,
        field_of_study: profile.field_of_study,
        underemployment_flag: profile.underemployment_flag,
      },
    })

    // Store match
    const { data: match, error: matchError } = await db
      .from('match')
      .insert({
        candidate_id: candidate.id,
        role_id,
        assessment_id: assessmentId,
        map_id: map.id,
        overall_score: matchScore.overall_score,
        tier_1_score: matchScore.tier_scores.tier_1,
        tier_2_score: matchScore.tier_scores.tier_2,
        tier_3_score: matchScore.tier_scores.tier_3,
        tier_4_score: matchScore.tier_scores.tier_4,
        underemployment_surfaced: matchScore.underemployment_surfaced,
        status: 'pending' as never,
        model_version: 'gemini-2.5-pro',
      })
      .select()
      .single()

    if (matchError || !match) continue

    // Store explanation (invariant: never surface a match without explanation)
    await db.from('match_explanation').insert({
      match_id: match.id,
      strong_dimensions: matchScore.strong_dimensions as never,
      partial_dimensions: matchScore.partial_dimensions as never,
      gap_dimensions: matchScore.gap_dimensions as never,
      ats_bypass_reasoning: matchScore.ats_bypass_reasoning ?? null,
      candidate_facing_text: matchScore.candidate_facing_text,
      employer_facing_text: matchScore.employer_facing_text,
      bridge_suggestion: matchScore.bridge_suggestion ?? null,
      model_version: 'gemini-2.5-pro',
    })

    created++
  }

  return c.json({ created })
})

// Get discovery pool for a role
matchRouter.get('/', async (c) => {
  const { employerUser } = await getEmployerContext(c)
  const role_id = c.req.query('role_id')
  if (!role_id) return c.json({ error: 'role_id required' }, 400)

  const { data: matches, error } = await db
    .from('match')
    .select(`
      *,
      match_explanation(
        strong_dimensions, partial_dimensions, gap_dimensions,
        ats_bypass_reasoning, employer_facing_text, candidate_facing_text,
        bridge_suggestion, model_version
      ),
      candidate_profile(
        degree, field_of_study, current_job_title, current_employer,
        years_of_experience, underemployment_flag, visibility_status,
        candidate(id, name, email)
      )
    `)
    .eq('role_id', role_id)
    .order('overall_score', { ascending: false })

  if (error) throw new HTTPException(500, { message: error.message })
  return c.json(matches ?? [])
})

// Get a single match with full detail
matchRouter.get('/:id', async (c) => {
  await getEmployerContext(c)
  const id = c.req.param('id')

  const { data: match, error } = await db
    .from('match')
    .select(`
      *,
      match_explanation(*),
      candidate_profile(
        *, candidate(id, name, email)
      ),
      capability_assessment(dimensions, underemployment_signal),
      role(title, description_raw, context_notes, seniority_level, location_type),
      role_capability_map: role_capability_map!match_map_id_fkey(dimensions, employer_edited)
    `)
    .eq('id', id)
    .single()

  if (error || !match) throw new HTTPException(404, { message: 'Match not found' })
  return c.json(match)
})

// Employer expresses interest → draft outreach
matchRouter.post('/:id/interest', async (c) => {
  const { employerUser } = await getEmployerContext(c)
  const id = c.req.param('id')

  // Fetch the match with explanation + candidate + role
  const { data: match, error: matchError } = await db
    .from('match')
    .select(`
      *,
      match_explanation(strong_dimensions, employer_facing_text),
      candidate_profile(
        degree, field_of_study, current_job_title,
        candidate(id, name)
      ),
      role(title, context_notes)
    `)
    .eq('id', id)
    .single()

  if (matchError || !match) throw new HTTPException(404, { message: 'Match not found' })

  // Update match status
  await db.from('match').update({ status: 'notified' as never }).eq('id', id)

  const explanation = Array.isArray(match.match_explanation)
    ? match.match_explanation[0]
    : match.match_explanation
  const profile = Array.isArray(match.candidate_profile)
    ? match.candidate_profile[0]
    : match.candidate_profile
  const role = Array.isArray(match.role) ? match.role[0] : match.role
  const candidate = profile?.candidate as { id: string; name: string } | null

  // Draft outreach
  const outreach = await draftOutreach({
    strongDimensions: (explanation?.strong_dimensions ?? []) as MatchDimension[],
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

  // Store outreach message
  const { data: message, error: msgError } = await db
    .from('outreach_message')
    .insert({
      match_id: id,
      draft_text: outreach.draft_text,
      employer_edited: false,
      character_count: outreach.draft_text.length,
      delivery_status: 'draft' as never,
    })
    .select()
    .single()

  if (msgError) throw new HTTPException(500, { message: msgError.message })

  // Log event
  await logEvent({
    actor_type: 'employer',
    actor_id: employerUser.employer_id,
    event_type: 'interest_expressed',
    related_entity_type: 'match',
    related_entity_id: id,
    payload: { match_id: id, role_id: match.role_id },
  })

  return c.json(message, 201)
})
