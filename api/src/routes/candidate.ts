import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { db } from '../db/client.js'
import { extractCandidateCapability } from '../ai/capability.js'
import { getCandidateContext, logEvent } from '../middleware/auth.js'
import type { CandidateProfileInput } from '../validators/index.js'

export const candidateRouter = new Hono()

const SkillSchema = z.object({
  name: z.string(),
  category: z.string().optional(),
  years: z.number().optional(),
})

const ProjectSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  url: z.string().optional(),
  skills_used: z.array(z.string()).optional(),
})

const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  year: z.number().optional(),
  url: z.string().optional(),
})

const ProfileBodySchema = z.object({
  degree: z.string().optional(),
  field_of_study: z.string().optional(),
  institution: z.string().optional(),
  graduation_year: z.number().int().optional(),
  current_job_title: z.string().optional(),
  current_employer: z.string().optional(),
  years_of_experience: z.number().int().min(0).optional(),
  underemployment_flag: z.boolean().default(false),
  visibility_status: z.enum(['open', 'passive', 'closed']).default('passive'),
  career_intent: z.string().optional(),
  skills: z.array(SkillSchema).optional(),
  projects: z.array(ProjectSchema).optional(),
  certifications: z.array(CertificationSchema).optional(),
})

// Create or update profile, then run AI assessment
candidateRouter.post('/profile', async (c) => {
  const { candidate } = await getCandidateContext(c)
  const body = await c.req.json()
  const parsed = ProfileBodySchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400)

  const { visibility_status, ...profileFields } = parsed.data

  // Upsert profile
  const { error: profileError } = await db
    .from('candidate_profile')
    .upsert(
      {
        candidate_id: candidate.id,
        visibility_status: visibility_status as never,
        degree: profileFields.degree ?? null,
        field_of_study: profileFields.field_of_study ?? null,
        institution: profileFields.institution ?? null,
        graduation_year: profileFields.graduation_year ?? null,
        current_job_title: profileFields.current_job_title ?? null,
        current_employer: profileFields.current_employer ?? null,
        years_of_experience: profileFields.years_of_experience ?? null,
        underemployment_flag: profileFields.underemployment_flag,
        career_intent: profileFields.career_intent ?? null,
        skills: (profileFields.skills ?? []) as never,
        projects: (profileFields.projects ?? []) as never,
        certifications: (profileFields.certifications ?? []) as never,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'candidate_id' },
    )

  if (profileError) throw new HTTPException(500, { message: profileError.message })

  // Build input for AI
  const profileInput: CandidateProfileInput = {
    degree: profileFields.degree ?? null,
    field_of_study: profileFields.field_of_study ?? null,
    institution: profileFields.institution ?? null,
    graduation_year: profileFields.graduation_year ?? null,
    current_job_title: profileFields.current_job_title ?? null,
    current_employer: profileFields.current_employer ?? null,
    years_of_experience: profileFields.years_of_experience ?? null,
    underemployment_flag: profileFields.underemployment_flag,
    career_intent: profileFields.career_intent ?? null,
    skills: profileFields.skills ?? [],
    projects: profileFields.projects ?? [],
    certifications: profileFields.certifications ?? [],
  }

  // Run AI assessment
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

  if (assessmentError) throw new HTTPException(500, { message: assessmentError.message })

  await logEvent({
    actor_type: 'candidate',
    actor_id: candidate.id,
    event_type: 'profile_updated',
    related_entity_type: 'candidate_profile',
    related_entity_id: candidate.id,
  })

  return c.json({ assessment: newAssessment }, 201)
})

// Get own profile + latest assessment
candidateRouter.get('/profile', async (c) => {
  const { candidate } = await getCandidateContext(c)

  const [profileResult, assessmentResult] = await Promise.all([
    db.from('candidate_profile').select('*').eq('candidate_id', candidate.id).single(),
    db
      .from('capability_assessment')
      .select('*')
      .eq('candidate_id', candidate.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  return c.json({
    candidate,
    profile: profileResult.data,
    assessment: assessmentResult.data,
  })
})

// Update visibility only
candidateRouter.patch('/profile/visibility', async (c) => {
  const { candidate } = await getCandidateContext(c)
  const { visibility_status } = await c.req.json() as { visibility_status: string }

  const { data: existing } = await db
    .from('candidate_profile')
    .select('visibility_status')
    .eq('candidate_id', candidate.id)
    .single()

  const { data, error } = await db
    .from('candidate_profile')
    .update({ visibility_status: visibility_status as never, updated_at: new Date().toISOString() })
    .eq('candidate_id', candidate.id)
    .select()
    .single()

  if (error) throw new HTTPException(500, { message: error.message })

  await logEvent({
    actor_type: 'candidate',
    actor_id: candidate.id,
    event_type: 'visibility_changed',
    payload: { from: existing?.visibility_status, to: visibility_status },
  })

  return c.json(data)
})

// List pending matches for the candidate
candidateRouter.get('/matches', async (c) => {
  const { candidate } = await getCandidateContext(c)

  const { data: matches, error } = await db
    .from('match')
    .select(`
      id, overall_score, underemployment_surfaced, status, created_at,
      match_explanation(candidate_facing_text, strong_dimensions, gap_dimensions, bridge_suggestion, ats_bypass_reasoning),
      role(id, title, context_notes, employer(company_name, industry))
    `)
    .eq('candidate_id', candidate.id)
    .eq('status', 'notified')
    .order('overall_score', { ascending: false })

  if (error) throw new HTTPException(500, { message: error.message })
  return c.json(matches ?? [])
})

// Single match detail for candidate
candidateRouter.get('/matches/:id', async (c) => {
  const { candidate } = await getCandidateContext(c)
  const id = c.req.param('id')

  const { data: match, error } = await db
    .from('match')
    .select(`
      *,
      match_explanation(
        candidate_facing_text, employer_facing_text,
        strong_dimensions, partial_dimensions, gap_dimensions,
        bridge_suggestion, ats_bypass_reasoning
      ),
      role(id, title, context_notes, seniority_level, employer(company_name, industry)),
      role_capability_map(dimensions)
    `)
    .eq('id', id)
    .eq('candidate_id', candidate.id)
    .single()

  if (error || !match) throw new HTTPException(404, { message: 'Match not found' })
  return c.json(match)
})

// Accept or decline a match
candidateRouter.post('/matches/:id/respond', async (c) => {
  const { candidate } = await getCandidateContext(c)
  const id = c.req.param('id')
  const { decision } = await c.req.json() as { decision: string }

  if (decision !== 'accepted' && decision !== 'declined') {
    return c.json({ error: 'decision must be accepted or declined' }, 400)
  }

  const { data: match } = await db
    .from('match')
    .select('id, status, outreach_message(id)')
    .eq('id', id)
    .eq('candidate_id', candidate.id)
    .single()

  if (!match) throw new HTTPException(404, { message: 'Match not found' })

  await db.from('match').update({ status: decision as never }).eq('id', id)

  if (decision === 'accepted') {
    const msgs = match.outreach_message as Array<{ id: string }> | null
    const msgId = msgs?.[0]?.id
    if (msgId) {
      await db
        .from('outreach_message')
        .update({ delivery_status: 'sent' as never, sent_at: new Date().toISOString() })
        .eq('id', msgId)
    }
  }

  await logEvent({
    actor_type: 'candidate',
    actor_id: candidate.id,
    event_type: decision === 'accepted' ? 'match_accepted' : 'match_declined',
    related_entity_type: 'match',
    related_entity_id: id,
    payload: { match_id: id },
  })

  return c.json({ ok: true, status: decision })
})
