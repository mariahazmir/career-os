/**
 * Phase 1 end-to-end validation script.
 * Run with: npm run validate:ai
 *
 * Demo scenario:
 *   Employer: Kinetic Analytics, hiring a Data Analyst
 *   Candidate: CS grad, 2 years as Sales Admin, Python side projects
 */

import { extractRoleCapability, extractCandidateCapability } from '../src/ai/capability.js'
import { scoreAndExplainMatch } from '../src/ai/matching.js'
import { draftOutreach } from '../src/ai/outreach.js'
import { computeGapDelta } from '../src/ai/reengage.js'

const ROLE_DESCRIPTION = `
We are Kinetic Analytics, a mid-size data and analytics consultancy in Kuala Lumpur. We are building out our internal analytics function and need a Data Analyst to join the team.

The role involves:
- Working directly with our CFO and engineering leads to identify business questions and translate them into data queries
- Building and maintaining dashboards in Looker or Power BI
- Writing SQL queries against our PostgreSQL data warehouse
- Using Python for data cleaning, ad-hoc analysis, and basic automation
- Presenting findings in weekly business reviews - you need to be able to explain data clearly to non-technical stakeholders
- Gradually owning the analytics roadmap as the function grows

This is a build-from-scratch role. The person we hire will be our first dedicated analyst. We are comfortable with someone who is early in their career if they are driven and technically grounded.
`.trim()

const ROLE_CONTEXT = `
We are a 45-person company. The analytics team will be small (you + 1 senior hire later in the year). We value people who can work autonomously, ask good questions, and are not afraid to push back on bad assumptions. The role has a clear path to Analytics Lead within 18 months if things go well.
`.trim()

const CANDIDATE_PROFILE = {
  degree: 'Bachelor of Computer Science',
  field_of_study: 'Computer Science',
  institution: 'Universiti Malaya',
  graduation_year: 2022,
  current_job_title: 'Sales Administration Executive',
  current_employer: 'Petaling Jaya Trading Sdn Bhd',
  years_of_experience: 2,
  underemployment_flag: true,
  career_intent:
    'I want to move into data analytics. I have been building my skills on the side - Python, SQL, and I recently started a personal project analysing public datasets from DOSM. I took this sales admin role because I needed income after graduation but it is not where I want to be.',
  skills: [
    { name: 'Python', category: 'technical', years: 2 },
    { name: 'SQL', category: 'technical', years: 1 },
    { name: 'Excel', category: 'technical', years: 3 },
    { name: 'Data visualisation', category: 'technical', years: 1 },
    { name: 'Stakeholder communication', category: 'transferable', years: 2 },
  ],
  projects: [
    {
      title: 'Malaysia Labour Market Dashboard',
      description:
        'Personal project analysing DOSM public datasets to visualise employment trends by state and industry. Built with Python (pandas, matplotlib) and deployed as a Streamlit app.',
      skills_used: ['Python', 'pandas', 'Streamlit', 'SQL'],
    },
    {
      title: 'Sales Performance Tracker',
      description:
        'Built an Excel + Python script to automate weekly sales reporting at current employer. Reduced reporting time from 3 hours to 20 minutes.',
      skills_used: ['Python', 'Excel', 'automation'],
    },
  ],
  certifications: [
    { name: 'Google Data Analytics Certificate', issuer: 'Google / Coursera', year: 2023 },
  ],
}

const CANDIDATE_PROFILE_UPDATED = {
  ...CANDIDATE_PROFILE,
  certifications: [
    { name: 'Google Data Analytics Certificate', issuer: 'Google / Coursera', year: 2023 },
    { name: 'dbt Analytics Engineering', issuer: 'dbt Labs', year: 2026 },
  ],
  projects: [
    ...CANDIDATE_PROFILE.projects,
    {
      title: 'Freelance BI Dashboard',
      description:
        'Built Power BI dashboards for a local e-commerce client. Wrote SQL views on their PostgreSQL database to power the reports.',
      skills_used: ['Power BI', 'SQL', 'PostgreSQL'],
    },
  ],
  skills: [
    ...CANDIDATE_PROFILE.skills,
    { name: 'Power BI', category: 'technical', years: 1 },
    { name: 'dbt', category: 'technical', years: 1 },
    { name: 'PostgreSQL', category: 'technical', years: 1 },
  ],
}

const WELL_QUALIFIED_PROFILE = {
  degree: 'Bachelor of Computer Science',
  field_of_study: 'Computer Science',
  institution: 'Asia Pacific University',
  graduation_year: 2020,
  current_job_title: 'Data Analyst',
  current_employer: 'Fintech DataWorks',
  years_of_experience: 3,
  underemployment_flag: false,
  career_intent:
    'I want to own an analytics roadmap in a smaller company, work directly with finance and engineering leaders, and grow into an Analytics Lead role.',
  skills: [
    { name: 'Python', category: 'technical', years: 4 },
    { name: 'SQL', category: 'technical', years: 4 },
    { name: 'PostgreSQL', category: 'technical', years: 3 },
    { name: 'Power BI', category: 'technical', years: 2 },
    { name: 'Looker', category: 'technical', years: 2 },
    { name: 'dbt', category: 'technical', years: 2 },
    { name: 'Stakeholder communication', category: 'transferable', years: 3 },
    { name: 'Business problem framing', category: 'transferable', years: 3 },
    { name: 'Executive presentation', category: 'transferable', years: 2 },
    { name: 'Analytics roadmap ownership', category: 'contextual', years: 2 },
  ],
  projects: [
    {
      title: 'CFO Revenue Analytics Dashboard',
      description:
        'Worked with the CFO to define revenue, churn, and cohort questions, then built dbt models and executive Power BI dashboards on a PostgreSQL warehouse.',
      skills_used: ['SQL', 'dbt', 'PostgreSQL', 'Power BI', 'business problem framing'],
    },
    {
      title: 'Weekly Business Review Automation',
      description:
        'Created Python checks and Looker dashboards for weekly business reviews, then presented findings to product and engineering leads.',
      skills_used: ['Python', 'pandas', 'Looker', 'stakeholder communication'],
    },
  ],
  certifications: [
    { name: 'Microsoft Power BI Data Analyst Associate', issuer: 'Microsoft', year: 2024 },
    { name: 'Google Business Intelligence Certificate', issuer: 'Google / Coursera', year: 2025 },
  ],
}

const WEAK_PROFILE = {
  degree: 'Diploma in Culinary Arts',
  field_of_study: 'Hospitality',
  institution: 'Kolej Komuniti Selayang',
  graduation_year: 2021,
  current_job_title: 'Cafe Shift Supervisor',
  current_employer: 'KL Roastery',
  years_of_experience: 4,
  underemployment_flag: false,
  career_intent:
    'I want a more stable office role. I am curious about business but have not studied data analysis, SQL, Python, or dashboarding yet.',
  skills: [
    { name: 'Customer service', category: 'transferable', years: 4 },
    { name: 'Team scheduling', category: 'operations', years: 3 },
    { name: 'Cash handling', category: 'operations', years: 4 },
  ],
  projects: [
    {
      title: 'Cafe Roster Template',
      description:
        'Created a spreadsheet template to organise staff shifts and leave requests for the cafe team.',
      skills_used: ['Excel'],
    },
  ],
  certifications: [
    { name: 'Food Handling Certificate', issuer: 'Ministry of Health Malaysia', year: 2022 },
  ],
}

function assertGate(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Validation gate failed: ${message}`)
  }
}

function includesSpecificProfileHook(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('computer science') ||
    lower.includes('python') ||
    lower.includes('dashboard') ||
    lower.includes('dosm') ||
    lower.includes('sales performance tracker')
  )
}

async function run() {
  console.log('=======================================')
  console.log('Phase 1 - AI Engine Validation Run')
  console.log('=======================================\n')

  console.log('Task 1: extractRoleCapability()')
  const roleDimensions = await extractRoleCapability(ROLE_DESCRIPTION, ROLE_CONTEXT)
  console.log(`  OK: ${roleDimensions.length} dimensions extracted`)
  console.log('  Tiers:', roleDimensions.map((d) => d.tier).sort().join(', '))
  console.log('  Must-haves:', roleDimensions.filter((d) => d.must_have).map((d) => d.name).join(', ') || 'None')
  console.log('  Sample:', JSON.stringify(roleDimensions[0], null, 2))
  assertGate(roleDimensions.length >= 8 && roleDimensions.length <= 15, 'role dimensions must be 8-15')
  assertGate(new Set(roleDimensions.map((d) => d.tier)).size === 4, 'role dimensions must cover all four tiers')
  assertGate(roleDimensions.filter((d) => d.must_have).length <= 3, 'role must-have count must be <= 3')

  console.log('\nTask 2: extractCandidateCapability() - underemployed CS grad')
  const assessment = await extractCandidateCapability(CANDIDATE_PROFILE)
  console.log(`  OK: ${assessment.dimensions.length} dimensions extracted`)
  console.log(`  underemployment_signal: ${assessment.underemployment_signal}`)
  console.log(`  tier_4_trajectory_score: ${assessment.tier_4_trajectory_score}`)
  const verifiedCount = assessment.dimensions.filter((d) => d.confidence === 'verified').length
  console.log(`  Verified dimensions: ${verifiedCount} / ${assessment.dimensions.length}`)
  console.log('  Sample:', JSON.stringify(assessment.dimensions[0], null, 2))
  assertGate(assessment.underemployment_signal, 'candidate assessment must surface underemployment signal')
  assertGate((assessment.tier_4_trajectory_score ?? 0) >= 0.7, 'underemployed candidate should have strong trajectory signal')
  assertGate(verifiedCount > 0, 'candidate assessment should include verified dimensions')

  console.log('\nTask 2b: extractCandidateCapability() - well-qualified data candidate')
  const wellQualifiedAssessment = await extractCandidateCapability(WELL_QUALIFIED_PROFILE)
  const wellQualifiedVerifiedCount = wellQualifiedAssessment.dimensions.filter((d) => d.confidence === 'verified').length
  console.log(`  OK: ${wellQualifiedAssessment.dimensions.length} dimensions extracted`)
  console.log(`  Verified dimensions: ${wellQualifiedVerifiedCount} / ${wellQualifiedAssessment.dimensions.length}`)
  console.log(`  tier_1_coverage: ${wellQualifiedAssessment.tier_1_coverage}`)
  assertGate(wellQualifiedVerifiedCount > 0, 'well-qualified candidate should include verified dimensions')
  assertGate((wellQualifiedAssessment.tier_1_coverage ?? 0) >= 0.7, 'well-qualified candidate should have high tier 1 coverage')

  console.log('\nTask 3: scoreAndExplainMatch()')
  const matchScore = await scoreAndExplainMatch({
    candidateDimensions: assessment.dimensions,
    roleDimensions,
    contextNotes: ROLE_CONTEXT,
    candidateSummary: {
      name: 'Amirah Zulkifli',
      current_job_title: CANDIDATE_PROFILE.current_job_title,
      degree: CANDIDATE_PROFILE.degree,
      field_of_study: CANDIDATE_PROFILE.field_of_study,
      underemployment_flag: CANDIDATE_PROFILE.underemployment_flag,
    },
  })
  console.log(`  OK: overall_score ${matchScore.overall_score}`)
  console.log(`  underemployment_surfaced: ${matchScore.underemployment_surfaced}`)
  console.log(`  strong: ${matchScore.strong_dimensions.length}, partial: ${matchScore.partial_dimensions.length}, gap: ${matchScore.gap_dimensions.length}`)
  if (matchScore.ats_bypass_reasoning) {
    console.log(`\n  ATS bypass reasoning:\n  "${matchScore.ats_bypass_reasoning}"`)
  }
  console.log(`\n  Employer text:\n  "${matchScore.employer_facing_text}"`)
  console.log(`\n  Candidate text:\n  "${matchScore.candidate_facing_text}"`)
  if (matchScore.bridge_suggestion) {
    console.log(`\n  Bridge suggestion:\n  "${matchScore.bridge_suggestion}"`)
  }
  assertGate(matchScore.overall_score > 0.55, 'demo candidate should be at least a plausible match')
  assertGate(matchScore.underemployment_surfaced, 'match should surface underemployed candidate')
  assertGate(Boolean(matchScore.ats_bypass_reasoning), 'ATS bypass reasoning must be present')
  assertGate(matchScore.strong_dimensions.length > 0, 'match should include strong dimensions')

  console.log('\nTask 3b: scoreAndExplainMatch() - obvious match')
  const obviousMatchScore = await scoreAndExplainMatch({
    candidateDimensions: wellQualifiedAssessment.dimensions,
    roleDimensions,
    contextNotes: ROLE_CONTEXT,
    candidateSummary: {
      name: 'Daniel Tan',
      current_job_title: WELL_QUALIFIED_PROFILE.current_job_title,
      degree: WELL_QUALIFIED_PROFILE.degree,
      field_of_study: WELL_QUALIFIED_PROFILE.field_of_study,
      underemployment_flag: WELL_QUALIFIED_PROFILE.underemployment_flag,
    },
  })
  console.log(`  OK: overall_score ${obviousMatchScore.overall_score}`)
  console.log(`  underemployment_surfaced: ${obviousMatchScore.underemployment_surfaced}`)
  assertGate(obviousMatchScore.overall_score > 0.75, 'obvious match should score above 0.75')
  assertGate(!obviousMatchScore.underemployment_surfaced, 'obvious match should not be treated as underemployment surfaced')
  assertGate(!obviousMatchScore.ats_bypass_reasoning, 'obvious match should not include ATS bypass reasoning')

  console.log('\nTask 3c: scoreAndExplainMatch() - weak unrelated match')
  const weakAssessment = await extractCandidateCapability(WEAK_PROFILE)
  const weakMatchScore = await scoreAndExplainMatch({
    candidateDimensions: weakAssessment.dimensions,
    roleDimensions,
    contextNotes: ROLE_CONTEXT,
    candidateSummary: {
      name: 'Farah Rahman',
      current_job_title: WEAK_PROFILE.current_job_title,
      degree: WEAK_PROFILE.degree,
      field_of_study: WEAK_PROFILE.field_of_study,
      underemployment_flag: WEAK_PROFILE.underemployment_flag,
    },
  })
  console.log(`  OK: overall_score ${weakMatchScore.overall_score}`)
  console.log(`  strong: ${weakMatchScore.strong_dimensions.length}, gap: ${weakMatchScore.gap_dimensions.length}`)
  assertGate(weakMatchScore.overall_score < 0.35, 'weak unrelated match should score below 0.35')
  assertGate(weakMatchScore.gap_dimensions.length > weakMatchScore.strong_dimensions.length, 'weak match should be gap-dominant')

  console.log('\nTask 4: draftOutreach()')
  const outreach = await draftOutreach({
    strongDimensions: matchScore.strong_dimensions,
    candidate: {
      name: 'Amirah Zulkifli',
      current_job_title: CANDIDATE_PROFILE.current_job_title,
      degree: CANDIDATE_PROFILE.degree,
      field_of_study: CANDIDATE_PROFILE.field_of_study,
    },
    role: { title: 'Data Analyst', context_notes: ROLE_CONTEXT },
  })
  console.log(`  OK: ${outreach.draft_text.length} characters`)
  console.log(`  "${outreach.draft_text}"`)
  assertGate(outreach.draft_text.length <= 400, 'outreach must be <= 400 characters')
  assertGate(includesSpecificProfileHook(outreach.draft_text), 'outreach must mention a specific candidate hook')

  console.log('\nTask 5: computeGapDelta() - 6 months later scenario')
  const updatedAssessment = await extractCandidateCapability(CANDIDATE_PROFILE_UPDATED)
  const delta = await computeGapDelta({
    previousDimensions: assessment.dimensions,
    currentDimensions: updatedAssessment.dimensions,
    originalGapDimensions: matchScore.gap_dimensions,
  })
  console.log(`  OK: ${delta.length} dimensions improved meaningfully (delta > 0.1)`)
  delta.forEach((d) => {
    console.log(`  ${d.dimension_name}: ${d.previous_score} -> ${d.current_score} (+${d.delta.toFixed(2)}) [${d.confidence}]`)
  })
  assertGate(delta.every((d) => d.delta > 0.1), 'all gap deltas must be > 0.1')

  console.log('\n=======================================')
  console.log('Validation complete. All gates passed.')
  console.log('=======================================')
}

run().catch((err) => {
  console.error('Validation failed:', err)
  process.exit(1)
})
