# Meeting Calendar — deployment guide

## Purpose

Internal calendar for the sales team. Administrators see the whole calendar and
create manager accounts. A manager sees only their own clients, meetings and
time slots. Public registration is deliberately not available.

## Architecture

- React/Vite client in `client/`.
- Express API in `server/`; the browser only communicates with this API.
- PostgreSQL on the same server. Database access details never reach the browser.
- Passwords are stored as salted scrypt hashes. Login state is an HTTP-only,
  same-site session cookie stored in PostgreSQL.
- All API routes check the active server-side session and school scope. Manager
  requests are additionally limited to the manager's own calendar records.

## Roles

- `architect`: full owner access to the internal calendar.
- `admin`: sees all calendar data and creates/edits manager accounts.
- `manager`: sees their own data and fills their available time slots.

## Initial deployment

1. Create a dedicated PostgreSQL database and application role.
2. Apply `db/schema.sql` with a privileged local PostgreSQL account.
3. Put `DATABASE_URL`, a 32+ character `SESSION_SECRET`, `HOST`, `PORT` and
   `NODE_ENV=production` in the root-owned environment file.
4. Create the first admin through `script/create-admin.mjs` with temporary
   environment variables `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_NAME` and
   `INITIAL_ADMIN_PASSWORD`; do not place those values in source control.
5. Build with `npm run build` and run `dist/index.cjs` under systemd on a
   loopback-only port. Nginx proxies the staging domain to that port and keeps
   its existing HTTP Basic Auth boundary.

## Important files

| File | Purpose |
| --- | --- |
| `db/schema.sql` | PostgreSQL tables, indexes and update triggers |
| `script/create-admin.mjs` | one-time first-administrator provisioning |
| `server/routes.ts` | authentication, role checks and REST API |
| `server/passwords.ts` | password hashing and verification |
| `client/src/services/api.ts` | browser client for the internal API |
| `client/src/contexts/AuthContext.tsx` | browser session state |
| `client/src/components/UserManagement.tsx` | administrator UI for manager accounts |
