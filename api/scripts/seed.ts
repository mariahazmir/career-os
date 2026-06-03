/**
 * Seed script — run with: npx tsx --env-file=.env scripts/seed.ts
 *
 * Creates:
 *   - Kinetic Analytics employer + employer_user (hiring manager)
 *   - 15 candidates (4 hero underemployed, 4 well-qualified, 4 partial, 3 weak)
 *   - capability_assessment for each candidate
 */

import { createClient } from '@supabase/supabase-js'
import { extractCandidateCapability } from '../src/ai/capability.js'
import type { CandidateProfileInput, CandidateCapabilityAssessment } from '../src/validators/index.js'

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 5000): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === attempts - 1) throw err
      console.log(`    retrying in ${delayMs / 1000}s… (attempt ${i + 2}/${attempts})`)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw new Error('unreachable')
}

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// ── Employer ───────────────────────────────────────────────────────────────

const EMPLOYER = {
  company_name: 'Kinetic Analytics',
  industry: 'analytics',
  size_band: 'sme' as const,
  website: 'https://kineticanalytics.my',
  verified: true,
}

const HIRING_MANAGER = {
  name: 'Faridah Noor',
  email: 'faridah@kineticanalytics.my',
  role: 'admin' as const,
}

// ── Candidates ─────────────────────────────────────────────────────────────

const CANDIDATES: Array<{
  name: string
  email: string
  profile: CandidateProfileInput
}> = [
  // === HERO CANDIDATES — underemployed, degree-qualified ==================
  {
    name: 'Amirah Zulkifli',
    email: 'amirah@candidate.dev',
    profile: {
      degree: 'Bachelor of Computer Science',
      field_of_study: 'Computer Science',
      institution: 'Universiti Malaya',
      graduation_year: 2022,
      current_job_title: 'Sales Administration Executive',
      current_employer: 'Petaling Jaya Trading Sdn Bhd',
      years_of_experience: 2,
      underemployment_flag: true,
      career_intent: 'Move into data analytics. Building skills in Python and SQL on the side. Started a personal project analysing DOSM public datasets.',
      skills: [
        { name: 'Python', category: 'technical', years: 2 },
        { name: 'SQL', category: 'technical', years: 1 },
        { name: 'Excel', category: 'technical', years: 3 },
        { name: 'Stakeholder communication', category: 'transferable', years: 2 },
      ],
      projects: [
        { title: 'Malaysia Labour Market Dashboard', description: 'DOSM public datasets visualised in Python (pandas, matplotlib) + Streamlit app', skills_used: ['Python', 'pandas', 'Streamlit', 'SQL'] },
        { title: 'Sales Performance Tracker', description: 'Python script automating weekly sales reports — cut 3 hours to 20 minutes', skills_used: ['Python', 'Excel', 'automation'] },
      ],
      certifications: [{ name: 'Google Data Analytics Certificate', issuer: 'Google / Coursera', year: 2023 }],
    },
  },
  {
    name: 'Hafiz Rashdan',
    email: 'hafiz@candidate.dev',
    profile: {
      degree: 'Bachelor of Mathematics',
      field_of_study: 'Applied Mathematics',
      institution: 'Universiti Putra Malaysia',
      graduation_year: 2023,
      current_job_title: 'Grab Driver',
      current_employer: 'Self-employed',
      years_of_experience: 1,
      underemployment_flag: true,
      career_intent: 'Data analytics or finance analytics. Self-taught Excel and SQL. Looking for a company that cares about skills over job titles.',
      skills: [
        { name: 'SQL', category: 'technical', years: 1 },
        { name: 'Excel', category: 'technical', years: 2 },
        { name: 'Statistical modelling', category: 'technical', years: 3 },
        { name: 'Data interpretation', category: 'transferable', years: 2 },
      ],
      projects: [
        { title: 'Personal Finance Tracker', description: 'Built an Excel model with SQL backend tracking personal spending vs income with trend analysis', skills_used: ['SQL', 'Excel', 'statistical modelling'] },
      ],
      certifications: [{ name: 'Microsoft Excel Expert', issuer: 'Microsoft', year: 2024 }],
    },
  },
  {
    name: 'Nurul Aina Baharum',
    email: 'nurul@candidate.dev',
    profile: {
      degree: 'Bachelor of Statistics',
      field_of_study: 'Statistics',
      institution: 'Universiti Teknologi MARA',
      graduation_year: 2024,
      current_job_title: 'Barista',
      current_employer: 'Common Ground Coffee KL',
      years_of_experience: 1,
      underemployment_flag: true,
      career_intent: 'Data analyst role. Just started a Google Data Analytics course and working through a Kaggle dataset on Malaysian e-commerce.',
      skills: [
        { name: 'R', category: 'technical', years: 3 },
        { name: 'Python', category: 'technical', years: 1 },
        { name: 'SPSS', category: 'technical', years: 2 },
        { name: 'Data visualisation', category: 'technical', years: 1 },
      ],
      projects: [
        { title: 'E-commerce Trend Analysis', description: 'Kaggle project analysing Malaysian e-commerce dataset using Python and pandas, building product category trend visualisations', skills_used: ['Python', 'pandas', 'data visualisation'] },
      ],
      certifications: [],
    },
  },
  {
    name: 'Darren Lim Chee Keong',
    email: 'darren@candidate.dev',
    profile: {
      degree: 'Bachelor of Computer Science',
      field_of_study: 'Software Engineering',
      institution: 'Asia Pacific University',
      graduation_year: 2021,
      current_job_title: 'Clerical Worker',
      current_employer: 'Jabatan Pengangkutan Jalan (JPJ)',
      years_of_experience: 3,
      underemployment_flag: true,
      career_intent: 'Data engineering or analytics. Built small internal dashboards at current employer using Excel. Want to move to a tech company.',
      skills: [
        { name: 'Python', category: 'technical', years: 2 },
        { name: 'SQL', category: 'technical', years: 2 },
        { name: 'Excel dashboards', category: 'technical', years: 3 },
        { name: 'Process improvement', category: 'transferable', years: 3 },
      ],
      projects: [
        { title: 'JPJ Internal Report Automation', description: 'Built Python script + Excel dashboard to automate monthly vehicle registration report for management — reduced prep time by 4 hours/month', skills_used: ['Python', 'Excel', 'automation'] },
        { title: 'Personal Portfolio Site', description: 'Full-stack web project built in React and Node.js to practice software skills', skills_used: ['React', 'Node.js', 'JavaScript'] },
      ],
      certifications: [{ name: 'Python for Data Science', issuer: 'IBM / Coursera', year: 2023 }],
    },
  },

  // === WELL-QUALIFIED — matching backgrounds ===============================
  {
    name: 'Priya Devi Krishnan',
    email: 'priya@candidate.dev',
    profile: {
      degree: 'Bachelor of Computer Science',
      field_of_study: 'Data Science',
      institution: 'Multimedia University',
      graduation_year: 2020,
      current_job_title: 'Data Analyst',
      current_employer: 'Fintech DataWorks Sdn Bhd',
      years_of_experience: 4,
      underemployment_flag: false,
      career_intent: 'Own an analytics roadmap at a smaller company. Want to work directly with finance and engineering leadership.',
      skills: [
        { name: 'Python', category: 'technical', years: 4 },
        { name: 'SQL', category: 'technical', years: 4 },
        { name: 'Power BI', category: 'technical', years: 3 },
        { name: 'dbt', category: 'technical', years: 2 },
        { name: 'PostgreSQL', category: 'technical', years: 3 },
        { name: 'Stakeholder communication', category: 'transferable', years: 4 },
      ],
      projects: [
        { title: 'CFO Revenue Dashboard', description: 'Built dbt models + Power BI executive dashboard on PostgreSQL warehouse, working directly with CFO', skills_used: ['SQL', 'dbt', 'PostgreSQL', 'Power BI'] },
      ],
      certifications: [
        { name: 'Microsoft Power BI Data Analyst Associate', issuer: 'Microsoft', year: 2024 },
        { name: 'Google Business Intelligence Certificate', issuer: 'Google', year: 2023 },
      ],
    },
  },
  {
    name: 'Farouk Ismail',
    email: 'farouk@candidate.dev',
    profile: {
      degree: 'Bachelor of Information Technology',
      field_of_study: 'Business Intelligence',
      institution: 'Universiti Utara Malaysia',
      graduation_year: 2019,
      current_job_title: 'Senior Data Analyst',
      current_employer: 'Revenue Monster',
      years_of_experience: 5,
      underemployment_flag: false,
      career_intent: 'Analytics leadership role. Build and grow a team. Open to consultancy or product companies.',
      skills: [
        { name: 'SQL', category: 'technical', years: 5 },
        { name: 'Python', category: 'technical', years: 4 },
        { name: 'Looker', category: 'technical', years: 3 },
        { name: 'BigQuery', category: 'technical', years: 3 },
        { name: 'Business problem framing', category: 'transferable', years: 5 },
        { name: 'Presenting to executives', category: 'transferable', years: 4 },
      ],
      projects: [
        { title: 'Analytics Platform Migration', description: 'Led migration from spreadsheet reporting to Looker + BigQuery analytics stack across 5 business units', skills_used: ['Looker', 'BigQuery', 'SQL', 'stakeholder management'] },
      ],
      certifications: [{ name: 'Google Cloud Professional Data Engineer', issuer: 'Google', year: 2022 }],
    },
  },
  {
    name: 'Lim Wei Ling',
    email: 'wl@candidate.dev',
    profile: {
      degree: 'Bachelor of Business Administration',
      field_of_study: 'Business Analytics',
      institution: 'Sunway University',
      graduation_year: 2021,
      current_job_title: 'Business Intelligence Analyst',
      current_employer: 'CIMB Bank',
      years_of_experience: 3,
      underemployment_flag: false,
      career_intent: 'Move from banking to a growth-stage tech or consultancy environment. Want to work on more interesting datasets.',
      skills: [
        { name: 'SQL', category: 'technical', years: 3 },
        { name: 'Power BI', category: 'technical', years: 3 },
        { name: 'Excel', category: 'technical', years: 5 },
        { name: 'Business problem framing', category: 'transferable', years: 3 },
        { name: 'Regulatory reporting', category: 'contextual', years: 2 },
      ],
      projects: [
        { title: 'Loan Portfolio Dashboard', description: 'Built Power BI dashboard for loan portfolio analysis used in monthly executive reporting at CIMB', skills_used: ['Power BI', 'SQL', 'Excel'] },
      ],
      certifications: [{ name: 'Certified Business Intelligence Professional', issuer: 'TDWI', year: 2023 }],
    },
  },
  {
    name: 'Karthik Subramaniam',
    email: 'karthik@candidate.dev',
    profile: {
      degree: 'Master of Science',
      field_of_study: 'Data Science',
      institution: 'Universiti Malaya',
      graduation_year: 2022,
      current_job_title: 'Data Scientist',
      current_employer: 'Axiata Digital Labs',
      years_of_experience: 3,
      underemployment_flag: false,
      career_intent: 'Interested in analytics-first roles with business impact. Less ML research, more practical analytics.',
      skills: [
        { name: 'Python', category: 'technical', years: 5 },
        { name: 'SQL', category: 'technical', years: 3 },
        { name: 'Machine learning', category: 'technical', years: 3 },
        { name: 'Data storytelling', category: 'transferable', years: 3 },
        { name: 'Stakeholder communication', category: 'transferable', years: 2 },
      ],
      projects: [
        { title: 'Churn Prediction Model', description: 'Built and deployed churn prediction model for Axiata mobile subscribers — reduced churn by 8%', skills_used: ['Python', 'scikit-learn', 'SQL', 'data storytelling'] },
      ],
      certifications: [{ name: 'AWS Certified Machine Learning Specialty', issuer: 'AWS', year: 2023 }],
    },
  },

  // === PARTIAL MATCHES — some fit, some gaps ================================
  {
    name: 'Siti Hajar Mohd Noor',
    email: 'sitihajar@candidate.dev',
    profile: {
      degree: 'Bachelor of Accounting',
      field_of_study: 'Finance and Accounting',
      institution: 'Universiti Kebangsaan Malaysia',
      graduation_year: 2020,
      current_job_title: 'Finance Executive',
      current_employer: 'Petronas Twin Towers Office Holdings',
      years_of_experience: 4,
      underemployment_flag: false,
      career_intent: 'Move into FP&A analytics or financial data analysis. Already use Excel and basic SQL for monthly close.',
      skills: [
        { name: 'Excel', category: 'technical', years: 5 },
        { name: 'SQL', category: 'technical', years: 1 },
        { name: 'Financial modelling', category: 'technical', years: 3 },
        { name: 'Business problem framing', category: 'transferable', years: 3 },
        { name: 'Presenting to management', category: 'transferable', years: 3 },
      ],
      projects: [],
      certifications: [{ name: 'ACCA', issuer: 'Association of Chartered Certified Accountants', year: 2021 }],
    },
  },
  {
    name: 'Bryan Ong Cheng Wei',
    email: 'bryan@candidate.dev',
    profile: {
      degree: 'Bachelor of Engineering',
      field_of_study: 'Electrical Engineering',
      institution: 'Universiti Teknologi Malaysia',
      graduation_year: 2021,
      current_job_title: 'Systems Engineer',
      current_employer: 'Motorola Solutions Malaysia',
      years_of_experience: 3,
      underemployment_flag: false,
      career_intent: 'Transition into data engineering or IoT analytics. Strong Python background from engineering automation work.',
      skills: [
        { name: 'Python', category: 'technical', years: 4 },
        { name: 'SQL', category: 'technical', years: 1 },
        { name: 'Data pipelines', category: 'technical', years: 1 },
        { name: 'Structured problem solving', category: 'transferable', years: 3 },
      ],
      projects: [
        { title: 'Network Performance Monitor', description: 'Python dashboard monitoring network equipment uptime and latency across 20 sites', skills_used: ['Python', 'pandas', 'data visualisation'] },
      ],
      certifications: [],
    },
  },
  {
    name: 'Amira Shahira Razak',
    email: 'amira@candidate.dev',
    profile: {
      degree: 'Diploma in Information Technology',
      field_of_study: 'IT',
      institution: 'Politeknik Sultan Salahuddin Abdul Aziz Shah',
      graduation_year: 2019,
      current_job_title: 'IT Support Analyst',
      current_employer: 'RHB Bank',
      years_of_experience: 5,
      underemployment_flag: false,
      career_intent: 'Move into data analysis or BI. Have been self-studying Power BI for 6 months.',
      skills: [
        { name: 'Power BI', category: 'technical', years: 1 },
        { name: 'Excel', category: 'technical', years: 4 },
        { name: 'SQL', category: 'technical', years: 1 },
        { name: 'Customer communication', category: 'transferable', years: 5 },
      ],
      projects: [
        { title: 'IT Ticket Dashboard', description: 'Personal project: Power BI dashboard analysing IT helpdesk ticket volumes and resolution times using exported CSV data', skills_used: ['Power BI', 'Excel'] },
      ],
      certifications: [{ name: 'Microsoft Power BI Data Analyst Associate', issuer: 'Microsoft', year: 2025 }],
    },
  },
  {
    name: 'Nadzrin Azree',
    email: 'nadzrin@candidate.dev',
    profile: {
      degree: 'Bachelor of Economics',
      field_of_study: 'Economics',
      institution: 'University of Nottingham Malaysia',
      graduation_year: 2022,
      current_job_title: 'Market Research Analyst',
      current_employer: 'Nielsen Malaysia',
      years_of_experience: 2,
      underemployment_flag: false,
      career_intent: 'Data analytics at a tech company. Good at framing business questions and interpreting data — weak on SQL and Python.',
      skills: [
        { name: 'Excel', category: 'technical', years: 3 },
        { name: 'SPSS', category: 'technical', years: 2 },
        { name: 'Business problem framing', category: 'transferable', years: 2 },
        { name: 'Research presentation', category: 'transferable', years: 2 },
      ],
      projects: [],
      certifications: [],
    },
  },

  // === WEAK MATCHES — genuinely unrelated ==================================
  {
    name: 'Hazwani Ramli',
    email: 'hazwani@candidate.dev',
    profile: {
      degree: 'Diploma in Culinary Arts',
      field_of_study: 'Hospitality',
      institution: 'Kolej Komuniti Selayang',
      graduation_year: 2021,
      current_job_title: 'Cafe Shift Supervisor',
      current_employer: 'KL Roastery',
      years_of_experience: 4,
      underemployment_flag: false,
      career_intent: 'Looking for a stable office job. Curious about business but have not studied data or programming.',
      skills: [
        { name: 'Customer service', category: 'transferable', years: 4 },
        { name: 'Team scheduling', category: 'operations', years: 3 },
      ],
      projects: [{ title: 'Cafe Roster Template', description: 'Excel spreadsheet to manage shift scheduling', skills_used: ['Excel'] }],
      certifications: [{ name: 'Food Handling Certificate', issuer: 'MOH Malaysia', year: 2022 }],
    },
  },
  {
    name: 'Mohd Azlan Hussain',
    email: 'azlan@candidate.dev',
    profile: {
      degree: 'Bachelor of Education',
      field_of_study: 'TESL (Teaching English as a Second Language)',
      institution: 'Universiti Pendidikan Sultan Idris',
      graduation_year: 2018,
      current_job_title: 'Secondary School English Teacher',
      current_employer: 'SMK Taman Melati',
      years_of_experience: 6,
      underemployment_flag: false,
      career_intent: 'Career change out of teaching. Open to admin or support roles but no specific tech background.',
      skills: [
        { name: 'Curriculum design', category: 'contextual', years: 6 },
        { name: 'Communication', category: 'transferable', years: 6 },
      ],
      projects: [],
      certifications: [],
    },
  },
  {
    name: 'Rosnah Binti Ahmad',
    email: 'rosnah@candidate.dev',
    profile: {
      degree: 'Diploma in Nursing',
      field_of_study: 'Healthcare',
      institution: 'Institut Latihan Kementerian Kesihatan Malaysia',
      graduation_year: 2015,
      current_job_title: 'Staff Nurse',
      current_employer: 'Hospital Kuala Lumpur',
      years_of_experience: 9,
      underemployment_flag: false,
      career_intent: 'Looking to transition to healthcare administration or medical records. No programming background.',
      skills: [
        { name: 'Patient care', category: 'contextual', years: 9 },
        { name: 'Medical documentation', category: 'contextual', years: 9 },
        { name: 'Team coordination', category: 'transferable', years: 6 },
      ],
      projects: [],
      certifications: [{ name: 'Registered Nurse', issuer: 'Nursing Board Malaysia', year: 2015 }],
    },
  },
]

// ── Main ───────────────────────────────────────────────────────────────────

async function seed() {
  console.log('═══════════════════════════════════════')
  console.log('Career OS — Seed Script')
  console.log('═══════════════════════════════════════\n')

  // 1. Find or create employer
  console.log('▶ Creating Kinetic Analytics employer…')
  let employer
  const { data: existingEmployer } = await db
    .from('employer')
    .select()
    .eq('company_name', EMPLOYER.company_name)
    .single()

  if (existingEmployer) {
    employer = existingEmployer
    console.log(`  ✓ employer already exists, id = ${employer.id}`)
  } else {
    const { data: newEmployer, error: empError } = await db
      .from('employer')
      .insert(EMPLOYER)
      .select()
      .single()
    if (empError) throw new Error(`Employer insert failed: ${empError.message}`)
    employer = newEmployer
    console.log(`  ✓ employer.id = ${employer.id}`)
  }

  // 2. Find or create employer_user
  let empUser
  const { data: existingEmpUser } = await db
    .from('employer_user')
    .select()
    .eq('email', HIRING_MANAGER.email)
    .single()

  if (existingEmpUser) {
    empUser = existingEmpUser
    console.log(`  ✓ employer_user already exists, id = ${empUser.id}\n`)
  } else {
    const { data: newEmpUser, error: euError } = await db
      .from('employer_user')
      .insert({ ...HIRING_MANAGER, employer_id: employer.id })
      .select()
      .single()
    if (euError) throw new Error(`employer_user insert failed: ${euError.message}`)
    empUser = newEmpUser
    console.log(`  ✓ employer_user.id = ${empUser.id}\n`)
  }

  // 3. Seed candidates
  for (const c of CANDIDATES) {
    process.stdout.write(`▶ ${c.name} (${c.profile.current_job_title})… `)

    // Upsert candidate
    const { data: candidate, error: cErr } = await db
      .from('candidate')
      .upsert({ name: c.name, email: c.email }, { onConflict: 'email' })
      .select()
      .single()
    if (cErr) { console.log(`FAILED: ${cErr.message}`); continue }

    // Upsert candidate_profile
    const { error: pErr } = await db
      .from('candidate_profile')
      .upsert({
        candidate_id: candidate.id,
        degree: c.profile.degree,
        field_of_study: c.profile.field_of_study,
        institution: c.profile.institution,
        graduation_year: c.profile.graduation_year,
        current_job_title: c.profile.current_job_title,
        current_employer: c.profile.current_employer,
        years_of_experience: c.profile.years_of_experience,
        underemployment_flag: c.profile.underemployment_flag,
        visibility_status: 'open' as never,
        career_intent: c.profile.career_intent,
        skills: c.profile.skills as never,
        projects: c.profile.projects as never,
        certifications: c.profile.certifications as never,
      }, { onConflict: 'candidate_id' })
    if (pErr) { console.log(`profile FAILED: ${pErr.message}`); continue }

    // Skip if assessment already exists
    const { data: existingAssessment } = await db
      .from('capability_assessment')
      .select('id')
      .eq('candidate_id', candidate.id)
      .limit(1)
      .single()

    if (existingAssessment) {
      console.log(`✓ (assessment already exists, skipping)`)
      continue
    }

    // Run capability assessment with retry
    let assessment: CandidateCapabilityAssessment
    try {
      assessment = await withRetry(() => extractCandidateCapability(c.profile))
    } catch (e) {
      console.log(`assessment FAILED: ${e}`)
      continue
    }

    // Store assessment
    const { error: aErr } = await db
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
    if (aErr) { console.log(`assessment insert FAILED: ${aErr.message}`); continue }

    console.log(`✓ (underemployed: ${c.profile.underemployment_flag}, signal: ${assessment.underemployment_signal})`)
  }

  console.log('\n═══════════════════════════════════════')
  console.log(`Seed complete. ${CANDIDATES.length} candidates processed.`)
  console.log('Next: create the Data Analyst role via the employer UI.')
  console.log('═══════════════════════════════════════')
}

seed().catch((err) => {
  console.error('\nSeed failed:', err)
  process.exit(1)
})
