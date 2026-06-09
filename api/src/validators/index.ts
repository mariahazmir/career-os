import { z } from 'zod'

// Shared primitives

const TierSchema = z.number().int().min(1).max(4)
const ScoreSchema = z.number().min(0).max(1)
const ConfidenceSchema = z.enum(['verified', 'inferred', 'self_reported']).catch('inferred')

// Role capability

export const RoleCapabilityDimensionSchema = z.object({
  tier: TierSchema,
  name: z.string().trim().min(1),
  required_score: ScoreSchema,
  weight: z.number().positive().max(2),
  must_have: z.boolean(),
})

export const RoleCapabilityDimensionArraySchema = z
  .array(RoleCapabilityDimensionSchema)
  .min(8, 'role capability map must include at least 8 dimensions')
  .max(15, 'role capability map must include no more than 15 dimensions')
  .superRefine((dimensions, ctx) => {
    const tiers = new Set(dimensions.map((dimension) => dimension.tier))
    for (const tier of [1, 2, 3, 4]) {
      if (!tiers.has(tier)) {
        ctx.addIssue({
          code: 'custom',
          message: `role capability map must include at least one tier ${tier} dimension`,
        })
      }
    }

    const mustHaveCount = dimensions.filter((dimension) => dimension.must_have).length
    if (mustHaveCount > 3) {
      ctx.addIssue({
        code: 'custom',
        message: 'role capability map must not include more than 3 must-have dimensions',
      })
    }
  })

export type RoleCapabilityDimension = z.infer<typeof RoleCapabilityDimensionSchema>

// Candidate capability

export const CandidateCapabilityDimensionSchema = z.object({
  tier: TierSchema,
  name: z.string().trim().min(1),
  score: ScoreSchema,
  confidence: ConfidenceSchema,
  evidence_source: z.string().trim().min(1),
})

export const CandidateCapabilityAssessmentSchema = z.object({
  dimensions: z.array(CandidateCapabilityDimensionSchema).min(4),
  underemployment_signal: z.boolean(),
  tier_1_coverage: ScoreSchema.nullable().optional(),
  tier_2_coverage: ScoreSchema.nullable().optional(),
  tier_3_coverage: ScoreSchema.nullable().optional(),
  tier_4_trajectory_score: ScoreSchema.nullable().optional(),
})

export type CandidateCapabilityDimension = z.infer<typeof CandidateCapabilityDimensionSchema>
export type CandidateCapabilityAssessment = z.infer<typeof CandidateCapabilityAssessmentSchema>

// Candidate profile input (mirrors candidate_profile table)

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

// Match scoring

export const MatchDimensionSchema = z.object({
  name: z.string().trim().min(1),
  tier: TierSchema,
  candidate_score: ScoreSchema,
  required_score: ScoreSchema,
  confidence: ConfidenceSchema,
  explanation: z.string().trim().min(1),
})

export const MatchScoreSchema = z
  .object({
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
    ats_bypass_reasoning: z.string().trim().min(1).optional(),
    candidate_facing_text: z.string().trim().min(1),
    employer_facing_text: z.string().trim().min(1),
    bridge_suggestion: z.string().trim().min(1).optional(),
  })
  .superRefine((score, ctx) => {
    if (score.underemployment_surfaced && !score.ats_bypass_reasoning) {
      ctx.addIssue({
        code: 'custom',
        message: 'ats_bypass_reasoning is required when underemployment_surfaced is true',
        path: ['ats_bypass_reasoning'],
      })
    }
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

// Outreach

export const OutreachDraftSchema = z.object({
  draft_text: z.string().trim().min(1).max(400),
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

// Gap delta

export const GapDeltaItemSchema = z
  .object({
    dimension_name: z.string().trim().min(1),
    tier: TierSchema,
    previous_score: ScoreSchema,
    current_score: ScoreSchema,
    delta: z.number().gt(0.1),
    confidence: ConfidenceSchema,
  })
  .superRefine((item, ctx) => {
    const computedDelta = item.current_score - item.previous_score
    if (computedDelta <= 0.1) {
      ctx.addIssue({
        code: 'custom',
        message: 'current_score - previous_score must be greater than 0.1',
        path: ['delta'],
      })
    }

    if (Math.abs(computedDelta - item.delta) > 0.02) {
      ctx.addIssue({
        code: 'custom',
        message: 'delta must match current_score - previous_score within 0.02',
        path: ['delta'],
      })
    }
  })

export const GapDeltaArraySchema = z.array(GapDeltaItemSchema)

export type GapDeltaItem = z.infer<typeof GapDeltaItemSchema>

export interface GapDeltaInput {
  previousDimensions: CandidateCapabilityDimension[]
  currentDimensions: CandidateCapabilityDimension[]
  originalGapDimensions: MatchDimension[]
}

// Helper

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
