import { z } from 'zod'

// ── Shared primitives ──────────────────────────────────────────────────────

const TierSchema = z.number().int().min(1).max(4)
const ScoreSchema = z.number().min(0).max(1)
const ConfidenceSchema = z.enum(['verified', 'inferred', 'self_reported'])

// ── Role capability ────────────────────────────────────────────────────────

export const RoleCapabilityDimensionSchema = z.object({
  tier: TierSchema,
  name: z.string(),
  required_score: ScoreSchema,
  weight: z.number().positive(),
  must_have: z.boolean(),
})

export const RoleCapabilityDimensionArraySchema = z.array(RoleCapabilityDimensionSchema)

export type RoleCapabilityDimension = z.infer<typeof RoleCapabilityDimensionSchema>

// ── Candidate capability ───────────────────────────────────────────────────

export const CandidateCapabilityDimensionSchema = z.object({
  tier: TierSchema,
  name: z.string(),
  score: ScoreSchema,
  confidence: ConfidenceSchema,
  evidence_source: z.string(),
})

export const CandidateCapabilityAssessmentSchema = z.object({
  dimensions: z.array(CandidateCapabilityDimensionSchema),
  underemployment_signal: z.boolean(),
  tier_1_coverage: ScoreSchema.nullable().optional(),
  tier_2_coverage: ScoreSchema.nullable().optional(),
  tier_3_coverage: ScoreSchema.nullable().optional(),
  tier_4_trajectory_score: ScoreSchema.nullable().optional(),
})

export type CandidateCapabilityDimension = z.infer<typeof CandidateCapabilityDimensionSchema>
export type CandidateCapabilityAssessment = z.infer<typeof CandidateCapabilityAssessmentSchema>

// ── Candidate profile input (mirrors candidate_profile table) ──────────────

export interface CandidateProfileInput {
  degree: string | null
  field_of_study: string | null
  institution: string | null
  graduation_year: number | null
  current_job_title: string | null
  current_employer: string | null
  years_of_experience: number | null
  underemployment_flag: boolean
  career_intent: string | null
  skills: unknown
  projects: unknown
  certifications: unknown
}

// ── Match scoring ──────────────────────────────────────────────────────────

export const MatchDimensionSchema = z.object({
  name: z.string(),
  tier: TierSchema,
  candidate_score: ScoreSchema,
  required_score: ScoreSchema,
  confidence: ConfidenceSchema,
  explanation: z.string(),
})

export const MatchScoreSchema = z.object({
  overall_score: ScoreSchema,
  tier_scores: z.object({
    tier_1: ScoreSchema,
    tier_2: ScoreSchema,
    tier_3: ScoreSchema,
    tier_4: ScoreSchema,
  }),
  underemployment_surfaced: z.boolean(),
  strong_dimensions: z.array(MatchDimensionSchema),
  partial_dimensions: z.array(MatchDimensionSchema),
  gap_dimensions: z.array(MatchDimensionSchema),
  ats_bypass_reasoning: z.string().optional(),
  candidate_facing_text: z.string(),
  employer_facing_text: z.string(),
  bridge_suggestion: z.string().optional(),
})

export type MatchDimension = z.infer<typeof MatchDimensionSchema>
export type MatchScore = z.infer<typeof MatchScoreSchema>

export interface MatchInput {
  candidateDimensions: CandidateCapabilityDimension[]
  roleDimensions: RoleCapabilityDimension[]
  contextNotes: string | null
  candidateSummary: {
    name: string
    current_job_title: string | null
    degree: string | null
    field_of_study: string | null
    underemployment_flag: boolean
  }
}

// ── Outreach ───────────────────────────────────────────────────────────────

export const OutreachDraftSchema = z.object({
  draft_text: z.string().max(400),
})

export type OutreachDraft = z.infer<typeof OutreachDraftSchema>

export interface OutreachInput {
  strongDimensions: MatchDimension[]
  candidate: {
    name: string
    current_job_title: string | null
    degree: string | null
    field_of_study: string | null
  }
  role: {
    title: string
    context_notes: string | null
  }
}

// ── Gap delta ──────────────────────────────────────────────────────────────

export const GapDeltaItemSchema = z.object({
  dimension_name: z.string(),
  tier: TierSchema,
  previous_score: ScoreSchema,
  current_score: ScoreSchema,
  delta: z.number(),
  confidence: ConfidenceSchema,
})

export const GapDeltaArraySchema = z.array(GapDeltaItemSchema)

export type GapDeltaItem = z.infer<typeof GapDeltaItemSchema>

export interface GapDeltaInput {
  previousDimensions: CandidateCapabilityDimension[]
  currentDimensions: CandidateCapabilityDimension[]
  originalGapDimensions: MatchDimension[]
}

// ── Helper ─────────────────────────────────────────────────────────────────

export function parseAIResponse<T>(
  text: string,
  schema: z.ZodType<T>,
  fnName: string,
): T {
  const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(clean)
  } catch {
    console.error(`[${fnName}] Invalid JSON from AI:`, clean.slice(0, 400))
    throw new Error(`${fnName}: AI returned invalid JSON`)
  }
  const result = schema.safeParse(parsed)
  if (!result.success) {
    console.error(`[${fnName}] Schema validation failed:`, JSON.stringify(result.error.flatten()))
    console.error(`[${fnName}] Raw output:`, clean.slice(0, 400))
    throw new Error(`${fnName}: AI output failed schema validation`)
  }
  return result.data
}
