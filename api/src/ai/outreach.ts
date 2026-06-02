import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  OutreachDraftSchema,
  parseAIResponse,
  type OutreachDraft,
  type OutreachInput,
} from '../validators/index.js'
import { generateGeminiText } from './gemini.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const DRAFT_OUTREACH_SYSTEM_PROMPT = `
You are drafting a short outreach message from a hiring manager to a potential candidate.

MANDATORY RULES - every one must be satisfied:
1. Hard limit: 400 characters including spaces. Count carefully. Shorten if needed.
2. Reference something specific from the candidate's profile - their degree field, a named project, a specific skill, or their self-directed learning. Generic messages are rejected.
3. Use at least one exact hook visible in the input, such as "Computer Science", "Python", "SQL", a project name, or another named capability. Do not paraphrase the hook into vague language like "your background" or "a tool you built".
4. Banned phrases: "exciting opportunity", "rockstar", "ninja", "guru", "passionate about", "dynamic", "fast-paced", "synergy", "leverage", "world-class", any recruiter cliche.
5. Tone: direct and human. One professional reaching out to another.
6. The message must tell the candidate: (a) who you are and the role, (b) why you are reaching out to them specifically, (c) what makes this worth their attention.
7. Do NOT include a call-to-action - the platform handles that.

Respond only with valid JSON. No preamble, no explanation, no markdown code fences.

Output format: {"draft_text": "..."}
`.trim()

export async function draftOutreach(params: OutreachInput): Promise<OutreachDraft> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    systemInstruction: DRAFT_OUTREACH_SYSTEM_PROMPT,
    generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
  })

  const { strongDimensions, candidate, role } = params

  const topStrong = strongDimensions.slice(0, 3).map((d) => d.name).join(', ')

  const prompt = `
CANDIDATE
  Name: ${candidate.name}
  Current title: ${candidate.current_job_title ?? 'Not specified'}
  Degree: ${candidate.degree ?? 'None'} in ${candidate.field_of_study ?? 'unspecified field'}

ROLE
  Title: ${role.title}
  Context: ${role.context_notes ?? 'Not provided'}

TOP MATCHING CAPABILITIES (use these as hooks for personalisation):
  ${topStrong || 'See candidate profile'}

Full strong dimension detail:
${JSON.stringify(strongDimensions, null, 2)}
`.trim()

  const text = await generateGeminiText('draftOutreach', () => model.generateContent(prompt))
  const draft = parseAIResponse(text, OutreachDraftSchema, 'draftOutreach')

  // Hard enforce 400-char limit even if AI slips.
  if (draft.draft_text.length > 400) {
    throw new Error(`draftOutreach: draft_text exceeds 400 characters (${draft.draft_text.length})`)
  }

  return draft
}
