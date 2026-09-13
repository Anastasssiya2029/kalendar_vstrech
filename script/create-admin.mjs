import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const required = ["DATABASE_URL", "INITIAL_ADMIN_EMAIL", "INITIAL_ADMIN_NAME", "INITIAL_ADMIN_PASSWORD"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} must be set`);
}

const scrypt = promisify(scryptCallback);
const salt = randomBytes(16).toString("hex");
const derived = await scrypt(process.env.INITIAL_ADMIN_PASSWORD, salt, 64);
const passwordHash = `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
const schoolName = process.env.INITIAL_SCHOOL_NAME || "Календарь встреч";
const accountRole = process.env.INITIAL_ACCOUNT_ROLE || "admin";
if (!new Set(["admin", "architect"]).has(accountRole)) {
  throw new Error("INITIAL_ACCOUNT_ROLE must be admin or architect");
}
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
  await client.query("BEGIN");
  const schoolResult = await client.query(
    `INSERT INTO schools (name, admin_name, admin_email)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [schoolName, process.env.INITIAL_ADMIN_NAME, process.env.INITIAL_ADMIN_EMAIL.toLowerCase()],
  );
  const schoolId = schoolResult.rows[0]?.id ?? (await client.query(
    "SELECT id FROM schools ORDER BY created_at ASC LIMIT 1",
  )).rows[0]?.id;
  if (!schoolId) throw new Error("Could not create the calendar workspace");

  await client.query(
    `INSERT INTO users (email, name, password_hash, role, school_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           school_id = EXCLUDED.school_id,
           is_active = true`,
    [process.env.INITIAL_ADMIN_EMAIL.toLowerCase(), process.env.INITIAL_ADMIN_NAME, passwordHash, accountRole, schoolId],
  );
  await client.query("COMMIT");
  console.log(`Administrator prepared for ${process.env.INITIAL_ADMIN_EMAIL.toLowerCase()}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
