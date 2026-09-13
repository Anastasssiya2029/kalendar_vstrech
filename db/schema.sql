-- Internal PostgreSQL schema for the meeting calendar.
-- The application connects as a private database user; no browser has database access.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  admin_name TEXT,
  admin_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('architect', 'admin', 'manager')),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'selecting_time' CHECK (status IN ('selecting_time', 'scheduled', 'ready', 'completed', 'completed_with_sale', 'cancelled')),
  form_completed BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,
  provided_slot_ids TEXT[] NOT NULL DEFAULT '{}',
  time_selection_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  manager_name TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'scheduled_ready', 'completed', 'completed_with_sale', 'cancelled', 'rescheduled')),
  sold_tariff TEXT,
  sale_amount NUMERIC(12, 2),
  payment_method TEXT CHECK (payment_method IN ('link', 'invoice', 'bank_installment', 'internal_installment')),
  original_date DATE,
  reschedule_reason TEXT,
  reschedule_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  rescheduled_to_meeting_id UUID,
  rescheduled_from_meeting_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manager_name TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  booking_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (manager_id, date, start_time)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS overdue_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  original_date DATE NOT NULL,
  new_date DATE NOT NULL,
  reason TEXT,
  postponed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Telegram is linked to an employee's private chat rather than to browser data.
-- Bot credentials remain in the server environment; only chat IDs are stored here.
CREATE TABLE IF NOT EXISTS telegram_connections (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL UNIQUE,
  telegram_user_id BIGINT NOT NULL UNIQUE,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telegram_link_tokens (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telegram_notification_outbox (
  id BIGSERIAL PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'booked' CHECK (event_type IN ('booked', 'cancelled', 'rescheduled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ,
  last_error TEXT
);

-- Immutable operational events make the weekly architect summary auditable and
-- avoid trying to reconstruct history from the current state of a client card.
CREATE TABLE IF NOT EXISTS telegram_activity_events (
  id BIGSERIAL PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('slots_offered', 'meeting_booked', 'meeting_rescheduled', 'meeting_cancelled', 'meeting_sold')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telegram_weekly_summaries (
  id BIGSERIAL PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  UNIQUE (recipient_id, school_id, period_end)
);

CREATE INDEX IF NOT EXISTS idx_users_school_role ON users(school_id, role);
CREATE INDEX IF NOT EXISTS idx_clients_school_owner ON clients(school_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_meetings_school_manager_date ON meetings(school_id, manager_id, date);
CREATE INDEX IF NOT EXISTS idx_time_slots_school_manager_date ON time_slots(school_id, manager_id, date);
CREATE INDEX IF NOT EXISTS idx_tariffs_school ON tariffs(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_school_client ON payments(school_id, client_id);
CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_expiry ON telegram_link_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_telegram_outbox_pending ON telegram_notification_outbox(created_at)
  WHERE delivered_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_telegram_activity_school_date ON telegram_activity_events(school_id, created_at, manager_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_schools_updated_at ON schools;
CREATE TRIGGER set_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_clients_updated_at ON clients;
CREATE TRIGGER set_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_meetings_updated_at ON meetings;
CREATE TRIGGER set_meetings_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_payments_updated_at ON payments;
CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
