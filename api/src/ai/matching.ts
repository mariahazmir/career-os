import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  MatchScoreSchema,
  parseAIResponse,
  type MatchScore,
  type MatchInput,
} from '../validators/index.js'
import { generateGeminiText } from './gemini.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const SCORE_AND_EXPLAIN_MATCH_SYSTEM_PROMPT = `
You are a capability matching engine for a talent platform that surfaces qualified candidates standard ATS systems would filter out.

You receive a candidate's capability assessment, a role's requirements, and a candidate summary. Score the match and write plain-language explanations for both the employer and the candidate.

SCORING RULES:
1. For each role requirement dimension, find the candidate's matching dimension by name or semantic equivalence.
2. Categorise each matched dimension:
   - strong_dimensions: candidate_score >= required_score
   - partial_dimensions: candidate_score >= required_score - 0.2
   - gap_dimensions: candidate_score < required_score - 0.2
3. overall_score: weighted average across all role dimensions. Apply each dimension's weight. Must-have dimensions with gaps should significantly reduce the score.
4. tier_scores: average match ratio (candidate_score / required_score, capped at 1.0) per tier. Use keys exactly: tier_1, tier_2, tier_3, tier_4. Default 0.5 for tiers with no role requirements.
5. underemployment_surfaced: true if the candidate's current job title would be filtered by a standard ATS, but their capability assessment justifies the match.
6. ats_bypass_reasoning: MANDATORY when underemployment_surfaced is true. (a) Name the actual job title. (b) Explain why ATS would reject it. (c) Cite specific capability evidence justifying surfacing them.
7. employer_facing_text: 2-4 sentences. Why is this person worth considering despite the non-traditional path?
8. candidate_facing_text: 2-3 sentences. What makes them a strong fit? What are the real gaps?
9. bridge_suggestion: 1-2 sentences. Specific steps to close the largest gap - name a tool, project type, or certification.
10. Each dimension object in the arrays must include: name, tier, candidate_score, required_score, confidence, explanation.
11. Be strict when the candidate lacks technical evidence. An unrelated profile with no SQL/Python/dashboard/project evidence should score below 0.35 and have more gap dimensions than strong dimensions.
12. If underemployment_surfaced is false, omit ats_bypass_reasoning.

Output exactly this JSON structure (no other field names):
{
  "overall_score": 0.76,
  "tier_scores": { "tier_1": 0.82, "tier_2": 0.71, "tier_3": 0.65, "tier_4": 0.88 },
  "underemployment_surfaced": true,
  "strong_dimensions": [{ "name": "...", "tier": 1, "candidate_score": 0.85, "required_score": 0.7, "confidence": "verified", "explanation": "..." }],
  "partial_dimensions": [],
  "gap_dimensions": [],
  "ats_bypass_reasoning": "...",
  "candidate_facing_text": "...",
  "employer_facing_text": "...",
  "bridge_suggestion": "..."
}

Respond only with valid JSON. No preamble, no explanation, no markdown code fences.
`.trim()

export async function scoreAndExplainMatch(params: MatchInput): Promise<MatchScore> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    systemInstruction: SCORE_AND_EXPLAIN_MATCH_SYSTEM_PROMPT,
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  })

  const { candidateDimensions, roleDimensions, contextNotes, candidateSummary } = params

  const prompt = `
CANDIDATE SUMMARY
  Name: ${candidateSummary.name}
  Current title: ${candidateSummary.current_job_title ?? 'Not specified'}
  Degree: ${candidateSummary.degree ?? 'None'} in ${candidateSummary.field_of_study ?? 'unspecified field'}
  Underemployment flag: ${candidateSummary.underemployment_flag ? 'YES' : 'No'}

ROLE CONTEXT
  ${contextNotes ?? 'No additional context provided'}

CANDIDATE CAPABILITY DIMENSIONS:
${JSON.stringify(candidateDimensions, null, 2)}

ROLE CAPABILITY REQUIREMENTS:
${JSON.stringify(roleDimensions, null, 2)}
`.trim()

  const text = await generateGeminiText('scoreAndExplainMatch', () => model.generateContent(prompt))
  return parseAIResponse(text, MatchScoreSchema, 'scoreAndExplainMatch')
}
