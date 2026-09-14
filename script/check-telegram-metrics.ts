import { pool, query } from "../server/db";
import { operationalMetrics } from "../server/telegram";

const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const schools = await query<{ id: string }>("SELECT id FROM schools ORDER BY id");

for (const school of schools.rows) {
  const result = await operationalMetrics(school.id, { start: date, end: date });
  if (!result.totals || !Array.isArray(result.managers)) {
    throw new Error("Telegram metrics returned an unexpected result");
  }
}

console.log(`Telegram metrics query succeeded for ${schools.rows.length} school(s)`);
await pool.end();
