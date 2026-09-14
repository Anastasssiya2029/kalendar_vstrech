BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('architect', 'super_admin', 'admin', 'manager'));

COMMIT;
