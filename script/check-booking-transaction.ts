import { pool } from "../server/db";

const transaction = await pool.connect();
try {
  await transaction.query("BEGIN");
  const fixture = await transaction.query<{
    slot_id: string;
    school_id: string;
    manager_id: string;
    manager_name: string;
    date: string;
    start_time: string;
    client_id: string;
    form_completed: boolean;
  }>(`
    SELECT slot.id AS slot_id, slot.school_id, slot.manager_id, slot.manager_name,
      slot.date::text, slot.start_time, client.id AS client_id, client.form_completed
    FROM time_slots slot
    JOIN LATERAL (
      SELECT candidate.id, candidate.form_completed
      FROM clients candidate
      WHERE candidate.school_id = slot.school_id
      ORDER BY candidate.created_at DESC
      LIMIT 1
    ) client ON true
    WHERE slot.is_booked = false
    ORDER BY slot.date ASC, slot.start_time ASC
    LIMIT 1
    FOR UPDATE OF slot
  `);
  const row = fixture.rows[0];
  if (!row) {
    console.log("Booking transaction check skipped: no free slot and client pair");
  } else {
    const meeting = await transaction.query<{ id: string }>(`
      INSERT INTO meetings (school_id, client_id, manager_id, manager_name, date, start_time, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
      RETURNING id
    `, [row.school_id, row.client_id, row.manager_id, row.manager_name, row.date, row.start_time]);
    await transaction.query(`
      UPDATE clients
      SET status = $1, provided_slot_ids = ARRAY[]::text[], time_selection_closed = false, updated_at = now()
      WHERE id = $2 AND school_id = $3
    `, [row.form_completed ? "ready" : "scheduled", row.client_id, row.school_id]);
    await transaction.query(`
      UPDATE time_slots
      SET is_booked = true, booking_id = $1, updated_at = now()
      WHERE id = $2 AND school_id = $3
    `, [meeting.rows[0].id, row.slot_id, row.school_id]);
    console.log("Booking transaction check succeeded and will be rolled back");
  }
} finally {
  await transaction.query("ROLLBACK");
  transaction.release();
  await pool.end();
}
