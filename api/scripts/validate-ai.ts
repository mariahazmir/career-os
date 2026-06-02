/**
 * Phase 1 end-to-end validation script.
 * Run with: npx tsx --env-file=.env scripts/validate-ai.ts
 *
 * Demo scenario:
 *   Employer: Kinetic Analytics — hiring a Data Analyst
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
- Presenting findings in weekly business reviews — you need to be able to explain data clearly to non-technical stakeholders
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
    'I want to move into data analytics. I have been building my skills on the side — Python, SQL, and I recently started a personal project analysing public datasets from DOSM. I took this sales admin role because I needed income after graduation but it is not where I want to be.',
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

// A "6 months later" version of the candidate for gap delta testing
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

async function run() {
  console.log('═══════════════════════════════════════')
  console.log('Phase 1 — AI Engine Validation Run')
  console.log('═══════════════════════════════════════\n')

  // ── Task 1: Extract role capability ──────────────────────────────────────
  console.log('▶ Task 1: extractRoleCapability()')
  const roleDimensions = await extractRoleCapability(ROLE_DESCRIPTION, ROLE_CONTEXT)
  console.log(`  ✓ ${roleDimensions.length} dimensions extracted`)
  console.log('  Tiers:', roleDimensions.map((d) => d.tier).sort().join(', '))
  console.log('  Must-haves:', roleDimensions.filter((d) => d.must_have).map((d) => d.name).join(', '))
  console.log('  Sample:', JSON.stringify(roleDimensions[0], null, 2))

  // ── Task 2: Extract candidate capability ─────────────────────────────────
  console.log('\n▶ Task 2: extractCandidateCapability() — underemployed CS grad')
  const assessment = await extractCandidateCapability(CANDIDATE_PROFILE)
  console.log(`  ✓ ${assessment.dimensions.length} dimensions extracted`)
  console.log(`  underemployment_signal: ${assessment.underemployment_signal}`)
  console.log(`  tier_4_trajectory_score: ${assessment.tier_4_trajectory_score}`)
  const verifiedCount = assessment.dimensions.filter((d) => d.confidence === 'verified').length
  console.log(`  Verified dimensions: ${verifiedCount} / ${assessment.dimensions.length}`)
  console.log('  Sample:', JSON.stringify(assessment.dimensions[0], null, 2))

  // ── Task 3: Score and explain match ──────────────────────────────────────
  console.log('\n▶ Task 3: scoreAndExplainMatch()')
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
  console.log(`  ✓ overall_score: ${matchScore.overall_score}`)
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

  // ── Task 4: Draft outreach ────────────────────────────────────────────────
  console.log('\n▶ Task 4: draftOutreach()')
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
  console.log(`  ✓ ${outreach.draft_text.length} characters`)
  console.log(`  "${outreach.draft_text}"`)

  // ── Task 5: Compute gap delta ─────────────────────────────────────────────
  console.log('\n▶ Task 5: computeGapDelta() — 6 months later scenario')
  const updatedAssessment = await extractCandidateCapability(CANDIDATE_PROFILE_UPDATED)
  const delta = await computeGapDelta({
    previousDimensions: assessment.dimensions,
    currentDimensions: updatedAssessment.dimensions,
    originalGapDimensions: matchScore.gap_dimensions,
  })
  console.log(`  ✓ ${delta.length} dimensions improved meaningfully (delta > 0.1)`)
  delta.forEach((d) => {
    console.log(`  ${d.dimension_name}: ${d.previous_score} → ${d.current_score} (+${d.delta.toFixed(2)}) [${d.confidence}]`)
  })

  console.log('\n═══════════════════════════════════════')
  console.log('Validation complete. Review output above.')
  console.log('═══════════════════════════════════════')
}

run().catch((err) => {
  console.error('Validation failed:', err)
  process.exit(1)
})
