-- ══════════════════════════════════════════════════════════
-- Career OS — Initial Schema
-- ══════════════════════════════════════════════════════════

-- Enum types
CREATE TYPE visibility_status_enum AS ENUM ('open', 'passive', 'closed');
CREATE TYPE role_status_enum AS ENUM ('draft', 'active', 'paused', 'filled', 'closed');
CREATE TYPE match_status_enum AS ENUM ('pending', 'notified', 'accepted', 'declined', 'expired', 'withdrawn');
CREATE TYPE seniority_enum AS ENUM ('junior', 'mid', 'senior', 'lead', 'executive');
CREATE TYPE location_type_enum AS ENUM ('remote', 'hybrid', 'onsite');
CREATE TYPE actor_type_enum AS ENUM ('candidate', 'employer');
CREATE TYPE event_type_enum AS ENUM (
  'visibility_changed',
  'match_accepted',
  'match_declined',
  'interest_expressed',
  'reengage_opted_in',
  'reengage_opted_out',
  'profile_updated',
  'message_sent',
  'message_read',
  'role_posted',
  'role_closed'
);
CREATE TYPE reengage_status_enum AS ENUM ('pending', 'notified', 'accepted', 'declined', 'expired');
CREATE TYPE confidence_enum AS ENUM ('verified', 'inferred', 'self_reported');
CREATE TYPE delivery_status_enum AS ENUM ('draft', 'sent', 'delivered', 'failed');
CREATE TYPE employer_user_role_enum AS ENUM ('admin', 'member', 'viewer');
CREATE TYPE employer_size_enum AS ENUM ('startup', 'sme', 'enterprise');

-- ══════════════════════════════════════════════════════════
-- CANDIDATE DOMAIN
-- ══════════════════════════════════════════════════════════

CREATE TABLE candidate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE candidate_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate(id) ON DELETE CASCADE,
  degree VARCHAR(255),
  field_of_study VARCHAR(255),
  institution VARCHAR(255),
  graduation_year SMALLINT CHECK (graduation_year > 1950),
  current_job_title VARCHAR(255),
  current_employer VARCHAR(255),
  years_of_experience SMALLINT CHECK (years_of_experience >= 0),
  underemployment_flag BOOLEAN NOT NULL DEFAULT false,
  visibility_status visibility_status_enum NOT NULL DEFAULT 'passive',
  career_intent TEXT,
  skills JSONB,
  projects JSONB,
  certifications JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id)
);

CREATE TABLE capability_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate(id) ON DELETE CASCADE,
  model_version VARCHAR(50) NOT NULL,
  dimensions JSONB NOT NULL,
  underemployment_signal BOOLEAN NOT NULL DEFAULT false,
  tier_1_coverage FLOAT CHECK (tier_1_coverage BETWEEN 0 AND 1),
  tier_2_coverage FLOAT CHECK (tier_2_coverage BETWEEN 0 AND 1),
  tier_3_coverage FLOAT CHECK (tier_3_coverage BETWEEN 0 AND 1),
  tier_4_trajectory_score FLOAT CHECK (tier_4_trajectory_score BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- EMPLOYER DOMAIN
-- ══════════════════════════════════════════════════════════

CREATE TABLE employer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  size_band employer_size_enum,
  website VARCHAR(255),
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employer_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employer(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role employer_user_role_enum NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employer(id) ON DELETE CASCADE,
  created_by UUID REFERENCES employer_user(id),
  title VARCHAR(255) NOT NULL,
  description_raw TEXT NOT NULL,
  context_notes TEXT,
  seniority_level seniority_enum,
  location_type location_type_enum,
  status role_status_enum NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_capability_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  model_version VARCHAR(50) NOT NULL,
  dimensions JSONB NOT NULL,
  employer_edited BOOLEAN NOT NULL DEFAULT false,
  edit_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- MATCHING ENGINE
-- ══════════════════════════════════════════════════════════

CREATE TABLE match (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate(id),
  role_id UUID NOT NULL REFERENCES role(id),
  assessment_id UUID NOT NULL REFERENCES capability_assessment(id),
  map_id UUID NOT NULL REFERENCES role_capability_map(id),
  overall_score FLOAT NOT NULL CHECK (overall_score BETWEEN 0 AND 1),
  tier_1_score FLOAT CHECK (tier_1_score BETWEEN 0 AND 1),
  tier_2_score FLOAT CHECK (tier_2_score BETWEEN 0 AND 1),
  tier_3_score FLOAT CHECK (tier_3_score BETWEEN 0 AND 1),
  tier_4_score FLOAT CHECK (tier_4_score BETWEEN 0 AND 1),
  underemployment_surfaced BOOLEAN NOT NULL DEFAULT false,
  status match_status_enum NOT NULL DEFAULT 'pending',
  model_version VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT match_unique UNIQUE (candidate_id, role_id, assessment_id, map_id)
);

CREATE INDEX idx_match_candidate_id ON match(candidate_id);
CREATE INDEX idx_match_role_id ON match(role_id);
CREATE INDEX idx_match_status ON match(status);
CREATE INDEX idx_match_overall_score ON match(overall_score);
CREATE INDEX idx_match_created_at ON match(created_at DESC);

CREATE TABLE match_explanation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES match(id) ON DELETE CASCADE,
  strong_dimensions JSONB NOT NULL,
  partial_dimensions JSONB,
  gap_dimensions JSONB,
  ats_bypass_reasoning TEXT,
  candidate_facing_text TEXT NOT NULL,
  employer_facing_text TEXT NOT NULL,
  bridge_suggestion TEXT,
  model_version VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id)
);

CREATE TABLE outreach_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES match(id) ON DELETE CASCADE,
  draft_text TEXT NOT NULL,
  final_text TEXT,
  employer_edited BOOLEAN NOT NULL DEFAULT false,
  character_count SMALLINT CHECK (character_count > 0),
  delivery_status delivery_status_enum NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  UNIQUE (match_id)
);

-- ══════════════════════════════════════════════════════════
-- EVENT LOG — append-only, never UPDATE or DELETE
-- ══════════════════════════════════════════════════════════

CREATE TABLE interaction_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type actor_type_enum NOT NULL,
  actor_id UUID NOT NULL,
  event_type event_type_enum NOT NULL,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION block_interaction_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'interaction_event is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_mutate_interaction_event
  BEFORE UPDATE OR DELETE ON interaction_event
  FOR EACH ROW EXECUTE FUNCTION block_interaction_event_mutation();

-- ══════════════════════════════════════════════════════════
-- RE-ENGAGEMENT
-- ══════════════════════════════════════════════════════════

CREATE TABLE reengage_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate(id),
  employer_id UUID NOT NULL REFERENCES employer(id),
  original_match_id UUID NOT NULL REFERENCES match(id),
  trigger_assessment_id UUID NOT NULL REFERENCES capability_assessment(id),
  previous_assessment_id UUID NOT NULL REFERENCES capability_assessment(id),
  gap_delta JSONB NOT NULL,
  outreach_message_id UUID REFERENCES outreach_message(id),
  status reengage_status_enum NOT NULL DEFAULT 'pending',
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
