-- PixelReach AI — Postgres Helper Functions
-- Run this AFTER schema.sql in your Supabase SQL editor

-- ─────────────────────────────────────────
-- Concurrency-safe queue batch lock
-- Called from /api/jobs/process-send-queue
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION lock_queue_batch(p_limit INT, p_locked_by TEXT)
RETURNS SETOF email_send_queue
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
    UPDATE email_send_queue
    SET status = 'processing', locked_by = p_locked_by, locked_at = NOW()
    WHERE id IN (
      SELECT id FROM email_send_queue
      WHERE status = 'pending' AND scheduled_at <= NOW()
      ORDER BY scheduled_at ASC
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$;

-- ─────────────────────────────────────────
-- Campaign counter helpers (atomic increments)
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_campaign_sent(campaign_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_campaign_open(send_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE campaigns c
  SET open_count = open_count + 1
  FROM email_sends es
  WHERE es.id = send_id AND c.id = es.campaign_id AND es.open_count = 1;
END;
$$;

CREATE OR REPLACE FUNCTION increment_campaign_click(send_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE campaigns c
  SET click_count = click_count + 1
  FROM email_sends es
  WHERE es.id = send_id AND c.id = es.campaign_id AND es.click_count = 1;
END;
$$;

CREATE OR REPLACE FUNCTION increment_campaign_bounce(campaign_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE campaigns SET bounce_count = bounce_count + 1 WHERE id = campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_campaign_reply(campaign_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE campaigns SET reply_count = reply_count + 1 WHERE id = campaign_id;
END;
$$;

-- ─────────────────────────────────────────
-- Unlock stale processing rows (safety net)
-- Run via a scheduled DB job or add to cron
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION unlock_stale_queue_rows()
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  cnt INT;
BEGIN
  UPDATE email_send_queue
  SET status = 'pending', locked_by = NULL, locked_at = NULL
  WHERE status = 'processing'
    AND locked_at < NOW() - INTERVAL '5 minutes';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;
