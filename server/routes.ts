import type { Express, NextFunction, Request, Response } from "express";
import type { Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool, query } from "./db";
import { hashPassword, verifyPassword } from "./passwords";
import {
  createTelegramConnectUrl,
  disconnectTelegram,
  getTelegramStatus,
  initializeTelegramIntegration,
  processTelegramWebhook,
  queueMeetingNotification,
  queueTimeSlotCreatedNotification,
  recordMeetingActivity,
  recordSlotsOffered,
} from "./telegram";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

type Role = "architect" | "super_admin" | "admin" | "manager";
type AuthUser = { id: string; email: string; name: string; role: Role; school_id: string };
type Entity = "clients" | "meetings" | "time_slots" | "tariffs" | "payments";

function isSchoolRole(value: unknown): value is "manager" | "admin" | "super_admin" {
  return value === "manager" || value === "admin" || value === "super_admin";
}

const entityConfig: Record<Entity, { fields: readonly string[]; orderBy: string; adminOnly?: boolean }> = {
  clients: { fields: ["owner_id", "first_name", "last_name", "username", "comment", "status", "form_completed", "pinned", "provided_slot_ids", "time_selection_closed"], orderBy: "created_at DESC" },
  meetings: { fields: ["client_id", "manager_id", "manager_name", "date", "start_time", "status", "sold_tariff", "sale_amount", "payment_method", "original_date", "reschedule_reason", "reschedule_history", "rescheduled_to_meeting_id", "rescheduled_from_meeting_id", "notes"], orderBy: "date ASC, start_time ASC" },
  time_slots: { fields: ["manager_id", "manager_name", "date", "start_time", "is_booked", "booking_id"], orderBy: "date ASC, start_time ASC" },
  tariffs: { fields: ["name", "price", "description", "is_active"], orderBy: "created_at DESC", adminOnly: true },
  payments: { fields: ["client_id", "meeting_id", "amount", "due_date", "paid", "paid_date", "payment_method", "notes"], orderBy: "due_date ASC" },
};

function error(message: string, status = 400) {
  const result = new Error(message) as Error & { status: number };
  result.status = status;
  return result;
}

function camelize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelize);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())] = camelize(nested);
    }
    for (const moneyField of ["price", "saleAmount", "amount"]) {
      if (typeof result[moneyField] === "string") result[moneyField] = Number(result[moneyField]);
    }
    return result;
  }
  return value;
}

function isAdmin(user: AuthUser) {
  return user.role === "admin" || user.role === "super_admin" || user.role === "architect";
}

function canUseTelegram(user: AuthUser) {
  return user.role === "manager" || user.role === "admin" || user.role === "super_admin" || user.role === "architect";
}

function canAssignRole(actor: AuthUser, role: "manager" | "admin" | "super_admin") {
  if (actor.role === "architect") return true;
  if (actor.role === "super_admin") return role === "manager" || role === "admin";
  return actor.role === "admin" && role === "manager";
}

function canManageMember(actor: AuthUser, targetRole: Role) {
  if (targetRole === "architect") return false;
  if (actor.role === "architect") return true;
  if (actor.role === "super_admin") return targetRole === "manager" || targetRole === "admin";
  return actor.role === "admin" && targetRole === "manager";
}

function publicUser(user: AuthUser) {
  return camelize({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    school_id: user.school_id,
  });
}

function readBody(body: unknown, fields: readonly string[]) {
  const source = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(source, field) && source[field] !== undefined) {
      const value = source[field];
      data[field] = field === "reschedule_history" && value !== null ? JSON.stringify(value) : value;
    }
  }
  return data;
}

function placeholders(offset: number, count: number) {
  return Array.from({ length: count }, (_, index) => `$${offset + index}`).join(", ");
}

function pathParam(req: Request, name: string) {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function currentUser(req: Request): Promise<AuthUser | null> {
  if (!req.session.userId) return null;
  const result = await query<AuthUser>(
    "SELECT id, email, name, role, school_id FROM users WHERE id = $1 AND is_active = true",
    [req.session.userId],
  );
  return result.rows[0] ?? null;
}

async function requireUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ message: "Требуется вход в систему" });
    res.locals.user = user;
    return next();
  } catch (cause) {
    return next(cause);
  }
}

function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  const user = res.locals.user as AuthUser | undefined;
  if (!user || !isAdmin(user)) return res.status(403).json({ message: "Доступно только администратору" });
  return next();
}

function assertSchool(req: Request, res: Response): AuthUser | null {
  const user = res.locals.user as AuthUser | undefined;
  if (!user) {
    res.status(401).json({ message: "Требуется вход в систему" });
    return null;
  }
  if (user.role !== "architect" && user.school_id !== pathParam(req, "schoolId")) {
    res.status(403).json({ message: "Нет доступа к этому календарю" });
    return null;
  }
  return user;
}

function scopeFor(entity: Entity, schoolId: string, user: AuthUser) {
  const values: unknown[] = [schoolId];
  const conditions = ["school_id = $1"];
  // Tariffs belong to a school rather than a manager. Do not add an unused
  // manager parameter here: PostgreSQL rejects a prepared statement when the
  // parameters and placeholders no longer match.
  if (user.role === "manager" && entity !== "tariffs") {
    values.push(user.id);
    const parameter = `$${values.length}`;
    if (entity === "time_slots" || entity === "meetings") conditions.push(`manager_id = ${parameter}`);
    if (entity === "clients") {
      conditions.push(`(owner_id = ${parameter} OR EXISTS (SELECT 1 FROM meetings WHERE meetings.client_id = clients.id AND meetings.manager_id = ${parameter}))`);
    }
    if (entity === "payments") {
      conditions.push(`EXISTS (SELECT 1 FROM clients WHERE clients.id = payments.client_id AND (clients.owner_id = ${parameter} OR EXISTS (SELECT 1 FROM meetings WHERE meetings.client_id = clients.id AND meetings.manager_id = ${parameter})))`);
    }
  }
  return { conditions, values };
}

function appendFilters(entity: Entity, queryParams: Request["query"], conditions: string[], values: unknown[]) {
  const allowed: Record<Entity, Record<string, [string, string]>> = {
    clients: { managerId: ["owner_id", "="], status: ["status", "="] },
    meetings: { date: ["date", "="], dateFrom: ["date", ">="], dateTo: ["date", "<="], managerId: ["manager_id", "="], status: ["status", "="], clientId: ["client_id", "="] },
    time_slots: { date: ["date", "="], dateFrom: ["date", ">="], dateTo: ["date", "<="], managerId: ["manager_id", "="], isBooked: ["is_booked", "="] },
    tariffs: {},
    payments: { clientId: ["client_id", "="] },
  };
  for (const [key, [column, operator]] of Object.entries(allowed[entity])) {
    const raw = queryParams[key];
    if (typeof raw !== "string") continue;
    values.push(key === "isBooked" ? raw === "true" : raw);
    conditions.push(`${column} ${operator} $${values.length}`);
  }
}

async function enforceManagerReference(schoolId: string, managerId: unknown) {
  if (typeof managerId !== "string") throw error("Укажите менеджера");
  const manager = await query<{ id: string; name: string }>(
    `SELECT id, name FROM users
     WHERE id = $1
       AND is_active = true
       AND role IN ('manager', 'admin', 'super_admin', 'architect')
       AND (school_id = $2 OR role = 'architect')`,
    [managerId, schoolId],
  );
  if (!manager.rows[0]) throw error("Сотрудник не найден", 404);
  return manager.rows[0];
}

async function listEntity(req: Request, res: Response, entity: Entity) {
  const user = assertSchool(req, res);
  if (!user) return;
  const config = entityConfig[entity];
  const { conditions, values } = scopeFor(entity, pathParam(req, "schoolId"), user);
  appendFilters(entity, req.query, conditions, values);
  const result = await query(`SELECT * FROM ${entity} WHERE ${conditions.join(" AND ")} ORDER BY ${config.orderBy}`, values);
  return res.json({ [entity === "time_slots" ? "timeSlots" : entity]: result.rows.map(camelize) });
}

async function createEntity(req: Request, res: Response, entity: Entity) {
  const user = assertSchool(req, res);
  if (!user) return;
  const config = entityConfig[entity];
  if (config.adminOnly && !isAdmin(user)) return res.status(403).json({ message: "Доступно только администратору" });
  const data = readBody(req.body, config.fields);
  const schoolId = pathParam(req, "schoolId");

  if (entity === "clients" && user.role === "manager") data.owner_id = user.id;
  if (entity === "time_slots") {
    const manager = user.role === "manager" ? user : await enforceManagerReference(schoolId, data.manager_id);
    data.manager_id = manager.id;
    data.manager_name = manager.name;
  }
  if (entity === "meetings") {
    const manager = user.role === "manager" ? user : await enforceManagerReference(schoolId, data.manager_id);
    data.manager_id = manager.id;
    data.manager_name = manager.name;
  }

  const fields = ["school_id", ...Object.keys(data)];
  const values = [schoolId, ...Object.values(data)];
  const result = await query(
    `INSERT INTO ${entity} (${fields.join(", ")}) VALUES (${placeholders(1, fields.length)}) RETURNING *`,
    values,
  );
  const created = result.rows[0] as { id: string; manager_id?: string; client_id?: string; rescheduled_from_meeting_id?: string | null };
  if (entity === "time_slots" && created.manager_id) {
    await queueTimeSlotCreatedNotification(
      { id: created.id, manager_id: created.manager_id },
      { id: user.id },
    ).catch(() => undefined);
  }
  if (entity === "meetings" && created.manager_id && created.client_id && !created.rescheduled_from_meeting_id) {
    // Operational telemetry and external delivery never prevent a client from being booked.
    await recordMeetingActivity(schoolId, { id: created.id, manager_id: created.manager_id, client_id: created.client_id }, "meeting_booked").catch(() => undefined);
    await queueMeetingNotification({ id: created.id, manager_id: created.manager_id }, "booked").catch(() => undefined);
  }
  const key = entity === "time_slots" ? "timeSlot" : entity.slice(0, -1);
  return res.status(201).json({ [key]: camelize(created) });
}

async function updateEntity(req: Request, res: Response, entity: Entity) {
  const user = assertSchool(req, res);
  if (!user) return;
  const config = entityConfig[entity];
  if (config.adminOnly && !isAdmin(user)) return res.status(403).json({ message: "Доступно только администратору" });
  const data = readBody(req.body, config.fields);
  delete data.owner_id;
  if (!isAdmin(user) && (entity === "meetings" || entity === "time_slots")) {
    delete data.manager_id;
    delete data.manager_name;
  }
  if (isAdmin(user) && (entity === "meetings" || entity === "time_slots") && Object.prototype.hasOwnProperty.call(data, "manager_id")) {
    const manager = await enforceManagerReference(pathParam(req, "schoolId"), data.manager_id);
    data.manager_id = manager.id;
    data.manager_name = manager.name;
  }
  if (Object.keys(data).length === 0) throw error("Нет данных для обновления");

  const schoolId = pathParam(req, "schoolId");
  const entityId = pathParam(req, "id");
  const { conditions, values } = scopeFor(entity, schoolId, user);
  let previousMeeting: { status: string; id: string; manager_id: string; client_id: string } | undefined;
  if (entity === "meetings" && Object.prototype.hasOwnProperty.call(data, "status")) {
    const previousConditions = [...conditions, `id = $${values.length + 1}`];
    const previous = await query<{ status: string; id: string; manager_id: string; client_id: string }>(
      `SELECT id, manager_id, client_id, status FROM meetings WHERE ${previousConditions.join(" AND ")}`,
      [...values, entityId],
    );
    previousMeeting = previous.rows[0];
  }
  values.push(entityId);
  conditions.push(`id = $${values.length}`);
  const assignments = Object.keys(data).map((field, index) => `${field} = $${values.length + index + 1}`);
  const result = await query(
    `UPDATE ${entity} SET ${assignments.join(", ")} WHERE ${conditions.join(" AND ")} RETURNING *`,
    [...values, ...Object.values(data)],
  );
  const updated = result.rows[0] as { id: string; status?: string; manager_id?: string; client_id?: string } | undefined;
  if (!updated) throw error("Запись не найдена", 404);
  if (entity === "clients" && Object.prototype.hasOwnProperty.call(data, "provided_slot_ids")) {
    await recordSlotsOffered(schoolId, updated.id, data.provided_slot_ids).catch(() => undefined);
  }
  if (entity === "meetings" && previousMeeting && updated.manager_id && updated.client_id && updated.status && updated.status !== previousMeeting.status) {
    const eventByStatus: Record<string, { activity: "meeting_rescheduled" | "meeting_cancelled" | "meeting_sold"; notification?: "rescheduled" | "cancelled" }> = {
      rescheduled: { activity: "meeting_rescheduled", notification: "rescheduled" },
      cancelled: { activity: "meeting_cancelled", notification: "cancelled" },
      completed_with_sale: { activity: "meeting_sold" },
    };
    const event = eventByStatus[updated.status];
    if (event) {
      const meeting = { id: updated.id, manager_id: updated.manager_id, client_id: updated.client_id };
      await recordMeetingActivity(schoolId, meeting, event.activity).catch(() => undefined);
      if (event.notification) await queueMeetingNotification(meeting, event.notification).catch(() => undefined);
    }
  }
  const key = entity === "time_slots" ? "timeSlot" : entity.slice(0, -1);
  return res.json({ [key]: camelize(updated) });
}

async function deleteEntity(req: Request, res: Response, entity: Entity) {
  const user = assertSchool(req, res);
  if (!user) return;
  const config = entityConfig[entity];
  if (config.adminOnly && !isAdmin(user)) return res.status(403).json({ message: "Доступно только администратору" });

  // A client record can affect meetings and booked slots, therefore it is an
  // administrator-only operation and is handled atomically below.
  if (entity === "clients") {
    if (!isAdmin(user)) return res.status(403).json({ message: "Удалять клиентов может только администратор" });
    const schoolId = pathParam(req, "schoolId");
    const clientId = pathParam(req, "id");
    const transaction = await pool.connect();
    try {
      await transaction.query("BEGIN");
      const client = await transaction.query<{ id: string }>(
        "SELECT id FROM clients WHERE id = $1 AND school_id = $2 FOR UPDATE",
        [clientId, schoolId],
      );
      if (!client.rows[0]) throw error("Клиент не найден", 404);
      await transaction.query(
        `UPDATE time_slots
         SET is_booked = false, booking_id = NULL, updated_at = now()
         WHERE school_id = $1
           AND booking_id IN (SELECT id FROM meetings WHERE client_id = $2 AND school_id = $1)`,
        [schoolId, clientId],
      );
      await transaction.query("DELETE FROM clients WHERE id = $1 AND school_id = $2", [clientId, schoolId]);
      await transaction.query("COMMIT");
      return res.status(204).end();
    } catch (cause) {
      await transaction.query("ROLLBACK").catch(() => undefined);
      throw cause;
    } finally {
      transaction.release();
    }
  }

  const { conditions, values } = scopeFor(entity, pathParam(req, "schoolId"), user);
  values.push(pathParam(req, "id"));
  conditions.push(`id = $${values.length}`);
  const result = await query(`DELETE FROM ${entity} WHERE ${conditions.join(" AND ")} RETURNING id`, values);
  if (!result.rows[0]) throw error("Запись не найдена", 404);
  return res.status(204).end();
}

// Бронирование — единая операция. Так слот не сможет оказаться «свободным»
// после созданной встречи, а параллельная запись не заберёт одно окно дважды.
async function bookTimeSlot(req: Request, res: Response) {
  const user = assertSchool(req, res);
  if (!user) return;

  const schoolId = pathParam(req, "schoolId");
  const source = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  // Accept both wire formats so a cached browser bundle can still book after
  // the API moved to snake_case. The current client sends snake_case.
  const clientId = typeof source.client_id === "string"
    ? source.client_id
    : typeof source.clientId === "string" ? source.clientId : "";
  const slotId = typeof source.slot_id === "string"
    ? source.slot_id
    : typeof source.slotId === "string" ? source.slotId : "";
  if (!clientId || !slotId) throw error("Выберите клиента и окошко");

  const transaction = await pool.connect();
  let createdMeeting: Record<string, unknown> | undefined;
  let bookedSlot: Record<string, unknown> | undefined;
  let updatedClient: Record<string, unknown> | undefined;

  try {
    await transaction.query("BEGIN");
    const slotResult = await transaction.query<Record<string, any>>(
      "SELECT * FROM time_slots WHERE id = $1 AND school_id = $2 FOR UPDATE",
      [slotId, schoolId],
    );
    const slot = slotResult.rows[0];
    if (!slot) throw error("Окошко не найдено", 404);
    if (user.role === "manager" && slot.manager_id !== user.id) throw error("Можно бронировать только свои окошки", 403);
    if (slot.is_booked) throw error("Это окошко уже занято. Выберите другое", 409);

    const clientValues: unknown[] = [clientId, schoolId];
    let clientScope = "";
    if (user.role === "manager") {
      clientValues.push(user.id);
      clientScope = " AND (owner_id = $3 OR EXISTS (SELECT 1 FROM meetings WHERE meetings.client_id = clients.id AND meetings.manager_id = $3))";
    }
    const clientResult = await transaction.query<Record<string, any>>(
      `SELECT * FROM clients WHERE id = $1 AND school_id = $2${clientScope} FOR UPDATE`,
      clientValues,
    );
    const client = clientResult.rows[0];
    if (!client) throw error("Клиент не найден или недоступен", 404);

    const meetingResult = await transaction.query<Record<string, unknown>>(
      `INSERT INTO meetings (school_id, client_id, manager_id, manager_name, date, start_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'scheduled') RETURNING *`,
      [schoolId, client.id, slot.manager_id, slot.manager_name, slot.date, slot.start_time],
    );
    const created = meetingResult.rows[0];
    if (!created) throw error("Не удалось создать встречу", 500);
    createdMeeting = created;

    const nextClientStatus = client.form_completed ? "ready" : "scheduled";
    const clientUpdate = await transaction.query<Record<string, unknown>>(
      `UPDATE clients
       SET status = $1, provided_slot_ids = ARRAY[]::text[], time_selection_closed = false, updated_at = now()
       WHERE id = $2 AND school_id = $3
       RETURNING *`,
      [nextClientStatus, client.id, schoolId],
    );
    updatedClient = clientUpdate.rows[0];

    const slotUpdate = await transaction.query<Record<string, unknown>>(
      `UPDATE time_slots
       SET is_booked = true, booking_id = $1, updated_at = now()
       WHERE id = $2 AND school_id = $3
       RETURNING *`,
      [created.id, slot.id, schoolId],
    );
    bookedSlot = slotUpdate.rows[0];
    await transaction.query("COMMIT");
  } catch (cause) {
    await transaction.query("ROLLBACK").catch(() => undefined);
    throw cause;
  } finally {
    transaction.release();
  }

  if (createdMeeting) {
    const meeting = createdMeeting as { id: string; manager_id: string; client_id: string };
    await recordMeetingActivity(schoolId, meeting, "meeting_booked").catch(() => undefined);
    await queueMeetingNotification(meeting, "booked").catch(() => undefined);
  }

  return res.status(201).json({
    meeting: camelize(createdMeeting),
    timeSlot: camelize(bookedSlot),
    client: camelize(updatedClient),
  });
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");

  app.post("/api/telegram/webhook", async (req, res, next) => {
    try {
      const header = req.headers["x-telegram-bot-api-secret-token"];
      const providedSecret = Array.isArray(header) ? header[0] : header;
      const accepted = await processTelegramWebhook(req.body, providedSecret);
      return accepted ? res.sendStatus(200) : res.sendStatus(404);
    } catch (cause) {
      return next(cause);
    }
  });

  app.set("trust proxy", 1);
  const PgSession = connectPgSimple(session);
  app.use(session({
    store: new PgSession({ pool, tableName: "meeting_calendar_sessions", createTableIfMissing: true }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 12 },
  }));

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      if (!email || !password) throw error("Введите email и пароль");
      const result = await query<AuthUser & { password_hash: string; is_active: boolean }>(
        "SELECT id, email, name, role, school_id, password_hash, is_active FROM users WHERE email = $1", [email],
      );
      const user = result.rows[0];
      if (!user || !user.is_active || !(await verifyPassword(password, user.password_hash))) throw error("Неверный email или пароль", 401);
      await new Promise<void>((resolve, reject) => req.session.regenerate((sessionError) => sessionError ? reject(sessionError) : resolve()));
      req.session.userId = user.id;
      const school = await query("SELECT * FROM schools WHERE id = $1", [user.school_id]);
      return res.json({ user: publicUser(user), school: camelize(school.rows[0]) });
    } catch (cause) { return next(cause); }
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);
      res.clearCookie("connect.sid");
      return res.status(204).end();
    });
  });

  app.get("/api/auth/me", requireUser, async (_req, res, next) => {
    try {
      const user = res.locals.user as AuthUser;
      const school = await query("SELECT * FROM schools WHERE id = $1", [user.school_id]);
      return res.json({ user: publicUser(user), school: camelize(school.rows[0]) });
    } catch (cause) { return next(cause); }
  });

  app.patch("/api/auth/profile", requireUser, async (req, res, next) => {
    try {
      const user = res.locals.user as AuthUser;
      const data = readBody(req.body, ["name", "email"]);
      if (typeof data.name === "string") data.name = data.name.trim();
      if (typeof data.email === "string") data.email = data.email.trim().toLowerCase();
      if (!data.name && !data.email) throw error("Нет данных для обновления");
      if (typeof data.name === "string" && !data.name) throw error("Укажите имя");
      if (typeof data.email === "string" && !/^\S+@\S+\.\S+$/.test(data.email)) throw error("Укажите корректный email");

      const fields = Object.keys(data);
      const values = Object.values(data);
      values.push(user.id);
      const result = await query<AuthUser>(
        `UPDATE users SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(", ")}
         WHERE id = $${values.length}
         RETURNING id, email, name, role, school_id`,
        values,
      );
      return res.json({ user: publicUser(result.rows[0]) });
    } catch (cause) { return next(cause); }
  });

  app.get("/api/auth/telegram", requireUser, async (_req, res, next) => {
    try {
      const user = res.locals.user as AuthUser;
      if (!canUseTelegram(user)) return res.status(403).json({ message: "Telegram доступен менеджеру, администратору или архитектору" });
      return res.json({ telegram: await getTelegramStatus(user.id) });
    } catch (cause) { return next(cause); }
  });

  app.post("/api/auth/telegram/connect", requireUser, async (_req, res, next) => {
    try {
      const user = res.locals.user as AuthUser;
      if (!canUseTelegram(user)) return res.status(403).json({ message: "Telegram доступен менеджеру, администратору или архитектору" });
      const url = await createTelegramConnectUrl(user.id);
      return res.json({ url, expiresInMinutes: 15 });
    } catch (cause) { return next(cause); }
  });

  app.delete("/api/auth/telegram", requireUser, async (_req, res, next) => {
    try {
      const user = res.locals.user as AuthUser;
      if (!canUseTelegram(user)) return res.status(403).json({ message: "Telegram доступен менеджеру, администратору или архитектору" });
      await disconnectTelegram(user.id);
      return res.status(204).end();
    } catch (cause) { return next(cause); }
  });

  app.get("/api/schools", requireUser, async (_req, res, next) => {
    try {
      const user = res.locals.user as AuthUser;
      const result = user.role === "architect"
        ? await query("SELECT * FROM schools ORDER BY created_at DESC")
        : await query("SELECT * FROM schools WHERE id = $1", [user.school_id]);
      return res.json({ schools: result.rows.map(camelize) });
    } catch (cause) { return next(cause); }
  });

  app.post("/api/schools", requireUser, async (req, res, next) => {
    try {
      const user = res.locals.user as AuthUser;
      if (user.role !== "architect") return res.status(403).json({ message: "Создавать школы может только архитектор" });
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const description = typeof req.body?.description === "string" ? req.body.description.trim() || null : null;
      if (!name) throw error("Укажите название школы");
      if (name.length > 160) throw error("Название школы слишком длинное");
      const result = await query(
        `INSERT INTO schools (name, description, admin_name, admin_email)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, description, user.name, user.email],
      );
      return res.status(201).json({ school: camelize(result.rows[0]) });
    } catch (cause) { return next(cause); }
  });

  app.patch("/api/schools/:schoolId", requireUser, async (req, res, next) => {
    try {
      const user = res.locals.user as AuthUser;
      if (user.role !== "architect") return res.status(403).json({ message: "Редактировать школы может только архитектор" });

      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const adminName = typeof req.body?.adminName === "string" ? req.body.adminName.trim() || null : null;
      const adminEmail = typeof req.body?.adminEmail === "string" ? req.body.adminEmail.trim() || null : null;

      if (!name) throw error("Укажите название школы");
      if (name.length > 160) throw error("Название школы слишком длинное");
      if (adminName && adminName.length > 160) throw error("Имя администратора слишком длинное");
      if (adminEmail && (adminEmail.length > 254 || !/^\S+@\S+\.\S+$/.test(adminEmail))) throw error("Укажите корректный email администратора");

      const result = await query(
        `UPDATE schools
         SET name = $1, admin_name = $2, admin_email = $3, updated_at = now()
         WHERE id = $4
         RETURNING *`,
        [name, adminName, adminEmail, pathParam(req, "schoolId")],
      );
      if (!result.rows[0]) throw error("Школа не найдена", 404);
      return res.json({ school: camelize(result.rows[0]) });
    } catch (cause) { return next(cause); }
  });

  app.get("/api/schools/:schoolId", requireUser, async (req, res, next) => {
    try {
      const user = assertSchool(req, res);
      if (!user) return;
      const result = await query("SELECT * FROM schools WHERE id = $1", [pathParam(req, "schoolId")]);
      if (!result.rows[0]) throw error("Школа не найдена", 404);
      return res.json(camelize(result.rows[0]));
    } catch (cause) { return next(cause); }
  });

  app.get("/api/schools/:schoolId/users", requireUser, async (req, res, next) => {
    try {
      const user = assertSchool(req, res);
      if (!user) return;
      if (!isAdmin(user)) return res.status(403).json({ message: "Доступно только администратору" });
      const schoolId = pathParam(req, "schoolId");
      const managersOnly = req.query.role === "manager";
      const result = await query(
        `SELECT id, email, name, role, school_id, is_active, created_at, updated_at FROM users
         WHERE school_id = $1
           AND is_active = true
            ${managersOnly ? "AND role IN ('manager', 'admin', 'super_admin')" : ""}
         ORDER BY name ASC`, [schoolId],
      );
      return res.json({ [managersOnly ? "managers" : "members"]: result.rows.map(camelize) });
    } catch (cause) { return next(cause); }
  });

  app.post("/api/schools/:schoolId/users", requireUser, requireAdmin, async (req, res, next) => {
    try {
      const user = assertSchool(req, res);
      if (!user) return;
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const role = req.body?.role ?? "manager";
      if (!email || !name || !password) throw error("Заполните имя, email и пароль");
      if (!isSchoolRole(role)) throw error("Можно создать только менеджера, администратора или супер-администратора");
      if (!canAssignRole(user, role)) return res.status(403).json({ message: "Недостаточно прав для назначения этой роли" });
      const passwordHash = await hashPassword(password);
      const result = await query<AuthUser>(
        "INSERT INTO users (email, name, password_hash, role, school_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, school_id, created_at",
        [email, name, passwordHash, role, pathParam(req, "schoolId")],
      );
      return res.status(201).json({ user: publicUser(result.rows[0]) });
    } catch (cause) { return next(cause); }
  });

  app.patch("/api/schools/:schoolId/users/:id", requireUser, requireAdmin, async (req, res, next) => {
    try {
      const user = assertSchool(req, res);
      if (!user) return;
      const targetId = pathParam(req, "id");
      const schoolId = pathParam(req, "schoolId");
      const target = await query<{ id: string; role: Role }>(
        "SELECT id, role FROM users WHERE id = $1 AND school_id = $2 AND is_active = true",
        [targetId, schoolId],
      );
      const targetUser = target.rows[0];
      if (!targetUser || !canManageMember(user, targetUser.role)) return res.status(403).json({ message: "Недостаточно прав для изменения этого сотрудника" });

      const data = readBody(req.body, ["name", "email", "password", "role"]);
      if (typeof data.email === "string") data.email = data.email.trim().toLowerCase();
      if (typeof data.password === "string") { data.password_hash = await hashPassword(data.password); delete data.password; }
      if (Object.prototype.hasOwnProperty.call(data, "role")) {
        if (!isSchoolRole(data.role)) throw error("Можно назначить только роль менеджера, администратора или супер-администратора");
        if (!canAssignRole(user, data.role)) return res.status(403).json({ message: "Недостаточно прав для назначения этой роли" });
      }
      if (Object.keys(data).length === 0) throw error("Нет данных для обновления");
      const fields = Object.keys(data);
      const values = Object.values(data);
      values.push(targetId, schoolId);
      const result = await query<AuthUser>(
        `UPDATE users SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(", ")}
         WHERE id = $${values.length - 1} AND school_id = $${values.length} AND role IN ('manager', 'admin', 'super_admin')
         RETURNING id, email, name, role, school_id, created_at`, values,
      );
      if (!result.rows[0]) throw error("Сотрудник не найден", 404);
      return res.json({ user: publicUser(result.rows[0]) });
    } catch (cause) { return next(cause); }
  });

  app.delete("/api/schools/:schoolId/users/:id", requireUser, requireAdmin, async (req, res, next) => {
    try {
      const user = assertSchool(req, res);
      if (!user) return;
      const targetId = pathParam(req, "id");
      const schoolId = pathParam(req, "schoolId");
      if (targetId === user.id) throw error("Нельзя удалить собственную учётную запись");
      const target = await query<{ id: string; role: Role }>(
        "SELECT id, role FROM users WHERE id = $1 AND school_id = $2 AND is_active = true",
        [targetId, schoolId],
      );
      const targetUser = target.rows[0];
      if (!targetUser || !canManageMember(user, targetUser.role)) return res.status(403).json({ message: "Недостаточно прав для удаления этого сотрудника" });
      const result = await query(
        `UPDATE users SET is_active = false, updated_at = now()
         WHERE id = $1 AND school_id = $2 AND role IN ('manager', 'admin', 'super_admin')
         RETURNING id`,
        [targetId, schoolId],
      );
      if (!result.rows[0]) throw error("Сотрудник не найден", 404);
      return res.status(204).end();
    } catch (cause) { return next(cause); }
  });

  app.post("/api/schools/:schoolId/bookings", requireUser, (req, res, next) => bookTimeSlot(req, res).catch(next));

  for (const entity of Object.keys(entityConfig) as Entity[]) {
    app.get(`/api/schools/:schoolId/${entity}`, requireUser, (req, res, next) => listEntity(req, res, entity).catch(next));
    app.post(`/api/schools/:schoolId/${entity}`, requireUser, (req, res, next) => createEntity(req, res, entity).catch(next));
    app.patch(`/api/schools/:schoolId/${entity}/:id`, requireUser, (req, res, next) => updateEntity(req, res, entity).catch(next));
    app.delete(`/api/schools/:schoolId/${entity}/:id`, requireUser, (req, res, next) => deleteEntity(req, res, entity).catch(next));
  }

  void initializeTelegramIntegration().catch(() => undefined);

  return httpServer;
}
