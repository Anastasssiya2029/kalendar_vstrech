BEGIN;

ALTER TABLE time_slots
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS telegram_slot_notification_outbox (
  id BIGSERIAL PRIMARY KEY,
  time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ,
  last_error TEXT,
  UNIQUE (time_slot_id, recipient_id)
);

CREATE TABLE IF NOT EXISTS telegram_daily_summaries (
  id BIGSERIAL PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  report_window TEXT NOT NULL CHECK (report_window IN ('morning', 'evening')),
  sent_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  UNIQUE (recipient_id, school_id, report_date, report_window)
);

CREATE INDEX IF NOT EXISTS idx_telegram_slot_outbox_pending
  ON telegram_slot_notification_outbox(created_at)
  WHERE delivered_at IS NULL;

DROP TRIGGER IF EXISTS set_time_slots_updated_at ON time_slots;
CREATE TRIGGER set_time_slots_updated_at
  BEFORE UPDATE ON time_slots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DO $grant_application_role$
DECLARE
  application_role name;
BEGIN
  SELECT tableowner INTO application_role
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'telegram_notification_outbox';

  IF application_role IS NOT NULL THEN
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON telegram_slot_notification_outbox, telegram_daily_summaries TO %I',
      application_role
    );
    EXECUTE format(
      'GRANT USAGE, SELECT ON SEQUENCE telegram_slot_notification_outbox_id_seq, telegram_daily_summaries_id_seq TO %I',
      application_role
    );
  END IF;
END
$grant_application_role$;

COMMIT;
