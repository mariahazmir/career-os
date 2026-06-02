import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  RoleCapabilityDimensionArraySchema,
  CandidateCapabilityAssessmentSchema,
  parseAIResponse,
  type RoleCapabilityDimension,
  type CandidateCapabilityAssessment,
  type CandidateProfileInput,
} from '../validators/index.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// ── Prompts ────────────────────────────────────────────────────────────────

const EXTRACT_ROLE_CAPABILITY_SYSTEM_PROMPT = `
You are a capability mapping specialist. Your job is to analyse a job description and extract the functional capabilities required to perform the role effectively.

RULES:
1. Extract what the person needs to DO — not what job title they should have held. A Data Analyst role requires Python, SQL, stakeholder communication, and business problem framing. Extract those, not "must have been a Data Analyst before."
2. Map each capability to the correct tier:
   - Tier 1 (hard/technical): specific technical skills, tools, languages, domain knowledge
   - Tier 2 (transferable): cross-functional skills that work across roles — communication, project management, data literacy, structured thinking
   - Tier 3 (contextual/behavioural): ways of working, stakeholder management, cultural behaviours
   - Tier 4 (trajectory): growth orientation, learning velocity, ambition signals, adaptability
3. required_score (0.0–1.0): how well the candidate must demonstrate this capability. Senior roles skew higher; entry roles can accept 0.5–0.6 with growth potential.
4. weight (float): relative importance. 0.5 = minor, 1.0 = normal, 1.5 = important, 2.0 = critical.
5. must_have: true only for genuinely non-negotiable requirements. Max 3 per role. Use sparingly.
6. Extract 8–15 dimensions. Cover all four tiers. Do not pad with generic filler.

Respond only with valid JSON. No preamble, no explanation, no markdown code fences.

Output format:
[
  {
    "tier": 1,
    "name": "Python",
    "required_score": 0.7,
    "weight": 1.5,
    "must_have": true
  }
]
`.trim()

const EXTRACT_CANDIDATE_CAPABILITY_SYSTEM_PROMPT = `
You are a capability assessor specialised in identifying latent potential in non-traditional career profiles.

Your job is to build an honest capability profile from everything you know about the candidate — NOT just their current job title.

RULES:
1. Underemployment: if underemployment_flag is true, a degree-qualified person is working below their qualification level. Weight their formal education and self-directed work (projects, certifications, side work) significantly more than their current job title. The title is not a ceiling — it is an accident of circumstance.
2. Confidence levels must be accurate:
   - "verified": backed by a degree, certification, or demonstrated project output
   - "inferred": implied by context (e.g., a CS graduate likely understands algorithms even if unlisted)
   - "self_reported": stated by the candidate without external backing — take at face value but note it
3. Tier 4 (trajectory) MUST reflect BOTH stated career_intent AND revealed preference from skills, projects, and learning choices. A candidate who has self-studied Python AND states career_intent of "data analytics" has a strong, coherent tier 4 signal.
4. Do not penalise candidates for not having done the specific job before. Assess capability, not past job titles.
5. evidence_source: be specific — cite what in the profile led to this score.
6. underemployment_signal: true if the candidate's formal qualifications and/or self-directed capabilities meaningfully exceed what their current job title suggests.
7. tier_X_coverage scores (0–1): average capability coverage for dimensions in that tier.

Respond only with valid JSON. No preamble, no explanation, no markdown code fences.

Output format:
{
  "dimensions": [
    {
      "tier": 1,
      "name": "Python",
      "score": 0.65,
      "confidence": "verified",
      "evidence_source": "CS degree (covered in curriculum) + 3 self-directed Python projects"
    }
  ],
  "underemployment_signal": true,
  "tier_1_coverage": 0.62,
  "tier_2_coverage": 0.71,
  "tier_3_coverage": 0.55,
  "tier_4_trajectory_score": 0.84
}
`.trim()

// ── Helpers ────────────────────────────────────────────────────────────────

function formatProfile(p: CandidateProfileInput): string {
  const skills = Array.isArray(p.skills)
    ? (p.skills as Array<{ name: string; category?: string; years?: number }>)
        .map((s) => `  - ${s.name}${s.category ? ` (${s.category})` : ''}${s.years ? `, ${s.years} yrs` : ''}`)
        .join('\n')
    : '  None listed'

  const projects = Array.isArray(p.projects)
    ? (p.projects as Array<{ title: string; description?: string; skills_used?: string[] }>)
        .map(
          (pr) =>
            `  - ${pr.title}${pr.description ? ': ' + pr.description : ''}${pr.skills_used?.length ? ' [' + pr.skills_used.join(', ') + ']' : ''}`,
        )
        .join('\n')
    : '  None listed'

  const certs = Array.isArray(p.certifications)
    ? (p.certifications as Array<{ name: string; issuer?: string; year?: number }>)
        .map((c) => `  - ${c.name}${c.issuer ? ' by ' + c.issuer : ''}${c.year ? ' (' + c.year + ')' : ''}`)
        .join('\n')
    : '  None listed'

  return `
EDUCATION
  Degree: ${p.degree ?? 'Not specified'}
  Field: ${p.field_of_study ?? 'Not specified'}
  Institution: ${p.institution ?? 'Not specified'}
  Graduation year: ${p.graduation_year ?? 'Not specified'}

CURRENT SITUATION
  Job title: ${p.current_job_title ?? 'Not specified'}
  Employer: ${p.current_employer ?? 'Not specified'}
  Years of experience: ${p.years_of_experience ?? 'Not specified'}
  Underemployment flag: ${p.underemployment_flag ? 'YES — candidate is working below qualification level' : 'No'}

CAREER INTENT
  "${p.career_intent ?? 'Not stated'}"

SKILLS
${skills}

PROJECTS & SELF-DIRECTED WORK
${projects}

CERTIFICATIONS
${certs}
`.trim()
}

// ── Exports ────────────────────────────────────────────────────────────────

export async function extractRoleCapability(
  descriptionRaw: string,
  contextNotes: string | null,
): Promise<RoleCapabilityDimension[]> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    systemInstruction: EXTRACT_ROLE_CAPABILITY_SYSTEM_PROMPT,
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  })

  const prompt = `Job description:\n${descriptionRaw}\n\nContext notes:\n${contextNotes ?? 'None provided'}`
  const result = await model.generateContent(prompt)
  return parseAIResponse(result.response.text(), RoleCapabilityDimensionArraySchema, 'extractRoleCapability')
}

export async function extractCandidateCapability(
  profile: CandidateProfileInput,
): Promise<CandidateCapabilityAssessment> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    systemInstruction: EXTRACT_CANDIDATE_CAPABILITY_SYSTEM_PROMPT,
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  })

  const result = await model.generateContent(formatProfile(profile))
  return parseAIResponse(result.response.text(), CandidateCapabilityAssessmentSchema, 'extractCandidateCapability')
}
