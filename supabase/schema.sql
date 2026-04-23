-- PixelReach AI — Supabase Postgres Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- Lead Lists (categorized folders)
-- ─────────────────────────────────────────
CREATE TABLE lead_lists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  location_tag  TEXT,
  description   TEXT,
  total_leads   INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Leads
-- ─────────────────────────────────────────
CREATE TABLE leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id       UUID REFERENCES lead_lists(id) ON DELETE SET NULL,
  first_name    TEXT,
  last_name     TEXT,
  email         TEXT NOT NULL,
  phone         TEXT,
  company       TEXT,
  job_title     TEXT,
  location      TEXT,
  linkedin_url  TEXT,
  website       TEXT,
  notes         TEXT,
  status        TEXT DEFAULT 'new' CHECK (status IN ('new','emailed','replied','bounced','unsubscribed')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_list      ON leads(list_id);
CREATE INDEX idx_leads_user      ON leads(user_id);
CREATE INDEX idx_leads_email     ON leads(email);
CREATE INDEX idx_leads_location  ON leads(location);

-- ─────────────────────────────────────────
-- Sender Profiles (company card)
-- ─────────────────────────────────────────
CREATE TABLE sender_profiles (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name                  TEXT NOT NULL,
  company_address               TEXT,
  services                      TEXT,
  portfolio_url                 TEXT,
  details                       TEXT,
  from_name                     TEXT NOT NULL,
  reply_to                      TEXT,
  daily_limit                   INT DEFAULT 50,
  delay_seconds                 INT DEFAULT 60,
  openrouter_api_key_encrypted  TEXT,
  openrouter_model              TEXT DEFAULT 'anthropic/claude-sonnet-4',
  openrouter_fallback_model     TEXT DEFAULT 'openai/gpt-4o-mini',
  openrouter_temperature        FLOAT DEFAULT 0.7,
  openrouter_max_tokens         INT DEFAULT 600,
  created_at                    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Email Accounts (SMTP / IMAP per inbox)
-- ─────────────────────────────────────────
CREATE TABLE email_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_profile_id     UUID REFERENCES sender_profiles(id) ON DELETE CASCADE,
  label                 TEXT NOT NULL,
  from_email            TEXT NOT NULL,
  smtp_host             TEXT NOT NULL,
  smtp_port             INT DEFAULT 587,
  smtp_user             TEXT NOT NULL,
  smtp_pass_encrypted   TEXT NOT NULL,
  imap_host             TEXT,
  imap_port             INT DEFAULT 993,
  imap_user             TEXT,
  imap_pass_encrypted   TEXT,
  imap_enabled          BOOLEAN DEFAULT FALSE,
  is_active             BOOLEAN DEFAULT TRUE,
  daily_sent            INT DEFAULT 0,
  daily_reset_at        DATE DEFAULT CURRENT_DATE,
  rotation_order        INT DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_accounts_profile ON email_accounts(sender_profile_id);

-- ─────────────────────────────────────────
-- Campaigns
-- ─────────────────────────────────────────
CREATE TABLE campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_profile_id   UUID REFERENCES sender_profiles(id) ON DELETE SET NULL,
  lead_list_id        UUID REFERENCES lead_lists(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  status              TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed')),
  subject_prompt      TEXT NOT NULL,
  body_prompt         TEXT NOT NULL,
  total_leads         INT DEFAULT 0,
  sent_count          INT DEFAULT 0,
  open_count          INT DEFAULT 0,
  click_count         INT DEFAULT 0,
  bounce_count        INT DEFAULT 0,
  reply_count         INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  started_at          TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- Follow-up Steps
-- ─────────────────────────────────────────
CREATE TABLE follow_ups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  step            INT NOT NULL,
  delay_days      INT NOT NULL DEFAULT 3,
  subject_prompt  TEXT NOT NULL,
  body_prompt     TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_followup_step ON follow_ups(campaign_id, step);

-- ─────────────────────────────────────────
-- Email Sends (individual records)
-- ─────────────────────────────────────────
CREATE TABLE email_sends (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  follow_up_id      UUID REFERENCES follow_ups(id) ON DELETE SET NULL,
  lead_id           UUID REFERENCES leads(id) ON DELETE CASCADE,
  email_account_id  UUID REFERENCES email_accounts(id) ON DELETE SET NULL,
  tracking_id       UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  subject           TEXT,
  body_html         TEXT,
  status            TEXT DEFAULT 'pending_gen' CHECK (status IN ('pending_gen','ready','sent','failed','bounced')),
  sent_at           TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  clicked_at        TIMESTAMPTZ,
  replied_at        TIMESTAMPTZ,
  open_count        INT DEFAULT 0,
  click_count       INT DEFAULT 0,
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_sends_campaign    ON email_sends(campaign_id);
CREATE INDEX idx_email_sends_tracking    ON email_sends(tracking_id);
CREATE INDEX idx_email_sends_status      ON email_sends(status);
CREATE INDEX idx_email_sends_lead        ON email_sends(lead_id);

-- ─────────────────────────────────────────
-- Email Send Queue (Postgres-backed job queue)
-- ─────────────────────────────────────────
CREATE TABLE email_send_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id   UUID REFERENCES email_sends(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed')),
  retry_count     INT DEFAULT 0,
  last_error      TEXT,
  locked_by       TEXT,
  locked_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_queue_ready ON email_send_queue(scheduled_at, status) WHERE status = 'pending';

-- ─────────────────────────────────────────
-- IMAP Ingest Buffer
-- ─────────────────────────────────────────
CREATE TABLE imap_ingest_buffer (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id  UUID,
  from_address      TEXT,
  subject           TEXT,
  in_reply_to       TEXT,
  references        TEXT,
  body              TEXT,
  received_at       TIMESTAMPTZ,
  processed         BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Tracking Events
-- ─────────────────────────────────────────
CREATE TABLE tracking_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id   UUID REFERENCES email_sends(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL CHECK (event_type IN ('sent','opened','clicked','replied','bounced','unsubscribed')),
  metadata        JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_send      ON tracking_events(email_send_id);
CREATE INDEX idx_events_type      ON tracking_events(event_type);
CREATE INDEX idx_events_created   ON tracking_events(created_at);

-- ─────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────
ALTER TABLE lead_lists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sender_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns         ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends       ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_send_queue  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE imap_ingest_buffer ENABLE ROW LEVEL SECURITY;

-- Policies: users own their own data
CREATE POLICY "own lead_lists"       ON lead_lists       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own leads"            ON leads            FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own sender_profiles"  ON sender_profiles  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own email_accounts"   ON email_accounts   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own campaigns"        ON campaigns        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own email_sends"      ON email_sends      FOR ALL USING (
  campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
);
CREATE POLICY "own follow_ups"       ON follow_ups       FOR ALL USING (
  campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
);
CREATE POLICY "own tracking_events"  ON tracking_events  FOR ALL USING (
  email_send_id IN (
    SELECT es.id FROM email_sends es
    JOIN campaigns c ON c.id = es.campaign_id
    WHERE c.user_id = auth.uid()
  )
);

-- Service role can bypass RLS for cron jobs
-- (service role key used in PHP cron scripts)
