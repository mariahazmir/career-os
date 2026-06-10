# Career OS

> AI-powered talent matching that sees past job titles.

Built for the **Talentbank Tech Hackathon 2026**.

---

## The problem

**35.5% of degree and diploma holders in Malaysia — roughly 1.96 million people — are working in jobs that don't require their qualifications.**

They aren't unqualified. They're invisible to the systems employers use to hire. Standard ATS tools filter on job title keywords, so a CS graduate working as a Sales Admin Executive never surfaces for a Data Analyst role — even if they have the Python, SQL, and analytical skills to do it well.

Employers simultaneously report a critical talent shortage in high-growth sectors.

The two groups can't find each other because the infrastructure between them is broken.

---

## What Career OS does

Career OS is an **employer-led** matching platform. Hiring managers define roles in plain language. The AI extracts a capability map — not a keyword list — and matches it against candidates based on what they can actually do and where they're heading.

Candidates who would be filtered out by a traditional ATS are surfaced and flagged as **Hidden Talent**, with a plain-language explanation of why the AI thinks they're worth a conversation.

### Modules

| Module | Description |
|---|---|
| **Career OS** | Foundation — candidate profiles, employer role definitions, matching infrastructure |
| **Smart Talent Matching** | AI capability extraction and forward-looking match engine. Surfaces candidates an ATS would reject |
| **Talent Re-Engagement** | Tracks near-misses. Notifies employers when a previously declined candidate has closed the gap |

---

## Live demo

| | |
|---|---|
| **Frontend** | https://careeros.tapau.me |
| **API** | https://career-os-dgbt.onrender.com/health |

### Demo credentials

| Role | Email | Password |
|---|---|---|
| Employer (hiring manager) | `benho@kineticanalytics.my` | `Demo2026!` |
| Candidate (underemployed CS grad) | `amirah@candidate.dev` | `Demo2026!` |

The demo is seeded with 15 candidates across four profiles — hero underemployed candidates, well-qualified matches, partial fits, and weak matches — and three active roles at Kinetic Analytics.

---

## Tech stack

| Concern | Choice |
|---|---|
| Frontend | React 19 + Vite |
| Router | TanStack Router (file-based) |
| Language | TypeScript (strict) |
| UI | shadcn/ui + custom CSS design system |
| API server | Hono (Node.js) |
| Database + Auth | Supabase (PostgreSQL) |
| AI | Google Gemini 2.5 Pro |
| Validation | Zod |
| Deployment | Render (API) + custom domain (frontend) |

---

## How the AI works

All AI calls go through `api/src/ai/` using the Google Gemini SDK. There are five distinct tasks:

1. **Role capability extraction** — parses a plain-language job description into a structured capability map with tiers, weights, and must-have flags
2. **Candidate capability assessment** — evaluates a candidate's full profile (not just their current title) into scored capability dimensions with confidence levels (`verified`, `inferred`, `self_reported`)
3. **Match scoring + explanation** — compares candidate and role capability maps, generates an overall score, tier scores, and plain-language explanations for both the employer and candidate
4. **Outreach drafting** — writes a personalised 400-character outreach message grounded in the candidate's actual profile
5. **Gap delta (re-engagement)** — computes which capability gaps have closed since a previous assessment, triggering re-engagement for near-misses

The key invariant: **no keyword matching anywhere in the pipeline**. Every score traces to specific capability evidence. Every "verified" tag requires demonstrated or degree-backed evidence.

---

## Project structure

```
career-os/
├── frontend/                # React + Vite + TanStack Router
│   ├── src/
│   │   ├── routes/
│   │   │   ├── candidate/   # Dashboard, profile setup, matches
│   │   │   └── employer/    # Dashboard, role definition, pool, match detail, outreach
│   │   ├── contexts/auth.tsx
│   │   └── lib/
│   │       ├── api.ts       # Typed HTTP client
│   │       └── supabase.ts  # Supabase browser client
│   └── index.html
│
├── api/                     # Hono API server
│   ├── src/
│   │   ├── routes/          # candidate, match, role, outreach, reengage
│   │   ├── ai/              # All Gemini SDK calls (capability, matching, outreach, reengage)
│   │   ├── db/client.ts     # Supabase server client
│   │   └── validators/      # Zod schemas for all AI outputs and route inputs
│   └── scripts/seed.ts      # Demo data seed script
│
├── supabase/
│   └── migrations/          # SQL schema migrations
│
└── render.yaml              # Render deployment config
```

---

## Running locally

### Prerequisites

- Node.js 20+
- A Supabase project (or local Supabase via `supabase start`)
- A Google Gemini API key

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Create `frontend/.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:3000
```

### API

```bash
cd api
npm install
npm run dev        # http://localhost:3000
```

Create `api/.env`:
```
GEMINI_API_KEY=AIza...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173
```

### Seed demo data

```bash
cd api
npx tsx --env-file=.env scripts/seed.ts
```

This creates Kinetic Analytics (employer), 15 candidates with AI-generated capability assessments, 3 role definitions with capability maps, and full match scores across all combinations. Takes ~5–10 minutes due to AI calls.

---

## Deployment

Deployed via `render.yaml` at the repo root. Push to GitHub → Render auto-deploys both services.

Set these environment variables in the Render dashboard:

**API service:** `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS`

**Frontend static site:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`

---

## Hackathon context

| | |
|---|---|
| **Competition** | Talentbank Tech Hackathon 2026 |
| **Deadline** | 15 June 2026 |
| **Judging** | Product & UX Thinking 30% · Technical Execution 25% · Real-World Relevance 20% · AI Craft 15% · Presentation 10% |
