import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  GapDeltaArraySchema,
  parseAIResponse,
  type GapDeltaItem,
  type GapDeltaInput,
} from '../validators/index.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const COMPUTE_GAP_DELTA_SYSTEM_PROMPT = `
You are comparing two capability assessments for the same candidate to identify meaningful improvements since their last evaluation.

RULES:
1. Only include dimensions where delta > 0.1 (current_score - previous_score > 0.1). Smaller changes are noise.
2. Focus on dimensions that were originally identified as gaps between the candidate and the role - those are the ones that matter for re-engagement.
3. Use the NEW assessment's confidence level for each dimension included.
4. delta = current_score - previous_score (must be positive and > 0.1 to be included).
5. If no dimensions meet the threshold, return an empty array [].
6. Do not include dimensions that got worse or stayed the same.

Respond only with valid JSON. No preamble, no explanation, no markdown code fences.

Output format:
[
  {
    "dimension_name": "Python",
    "tier": 1,
    "previous_score": 0.45,
    "current_score": 0.82,
    "delta": 0.37,
    "confidence": "verified"
  }
]
`.trim()

export async function computeGapDelta(params: GapDeltaInput): Promise<GapDeltaItem[]> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    systemInstruction: COMPUTE_GAP_DELTA_SYSTEM_PROMPT,
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  })

  const { previousDimensions, currentDimensions, originalGapDimensions } = params

  const prompt = `
ORIGINAL GAP DIMENSIONS (what was missing when the candidate was first evaluated):
${JSON.stringify(originalGapDimensions, null, 2)}

PREVIOUS CAPABILITY ASSESSMENT:
${JSON.stringify(previousDimensions, null, 2)}

CURRENT CAPABILITY ASSESSMENT:
${JSON.stringify(currentDimensions, null, 2)}
`.trim()

  const result = await model.generateContent(prompt)
  return parseAIResponse(result.response.text(), GapDeltaArraySchema, 'computeGapDelta')
}
