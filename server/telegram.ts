import { randomBytes, timingSafeEqual } from "node:crypto";
import { query } from "./db";

export type TelegramEventType = "booked" | "cancelled" | "rescheduled";
type ActivityEventType = "slots_offered" | "meeting_booked" | "meeting_rescheduled" | "meeting_cancelled" | "meeting_sold";
type TelegramApiResponse<T> = { ok: boolean; result?: T; description?: string };
type TelegramBot = { id: number; username?: string };
type TelegramUpdate = { message?: { text?: string; chat?: { id?: number }; from?: { id?: number } } };

type PendingNotification = {
  id: number;
  meeting_id: string;
  manager_id: string;
  recipient_id: string;
  event_type: TelegramEventType;
  chat_id: string | null;
  recipient_role: "architect" | "manager" | "admin" | "super_admin";
  school_name: string;
  manager_name: string;
  first_name: string;
  last_name: string;
  username: string;
  comment: string | null;
  date: string;
  start_time: string;
  previous_date: string | null;
  previous_start_time: string | null;
};

type PendingSlotNotification = {
  id: number;
  time_slot_id: string;
  recipient_id: string;
  chat_id: string | null;
  school_name: string;
  creator_name: string;
  manager_name: string;
  date: string;
  start_time: string;
};

type OperationalTotals = {
  slots_total: number;
  slots_booked: number;
  slots_offered: number;
  clients_booked: number;
  meetings_completed: number;
  meetings_sold: number;
  meetings_rescheduled: number;
  meetings_cancelled: number;
};
type ManagerOperationalSummary = OperationalTotals & { manager_name: string };
type WeeklyPeriod = { start: string; end: string };

let botIdentity: TelegramBot | null = null;
let deliveryTimer: NodeJS.Timeout | undefined;

function config() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "",
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? "",
    appBaseUrl: (process.env.APP_BASE_URL?.trim() || "https://new.calendar-vstrech.ru").replace(/\/$/, ""),
  };
}

export function isTelegramConfigured() {
  const { token, webhookSecret } = config();
  return Boolean(token && webhookSecret);
}

function hasValidWebhookSecret(value: string | undefined) {
  const expected = config().webhookSecret;
  if (!value || !expected || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

async function telegramApi<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const { token } = config();
  if (!token) throw new Error("Telegram is not configured");
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({})) as TelegramApiResponse<T>;
      if (!response.ok || !body.ok || body.result === undefined) throw new Error(body.description || "Telegram API request failed");
      return body.result;
    } catch (cause) {
      lastError = cause;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 350));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Telegram API request failed");
}

async function getBotIdentity() {
  if (botIdentity) return botIdentity;
  botIdentity = await telegramApi<TelegramBot>("getMe", {});
  return botIdentity;
}

async function configureWebhook() {
  const { appBaseUrl, webhookSecret } = config();
  await getBotIdentity();
  await telegramApi("setWebhook", {
    url: `${appBaseUrl}/api/telegram/webhook`,
    secret_token: webhookSecret,
    allowed_updates: ["message"],
  });
}

function formatMeetingDate(date: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function conversion(numerator: number, denominator: number) {
  return denominator > 0 ? `${Math.round((numerator / denominator) * 100)}%` : "—";
}

function escapeTelegramHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function notificationText(item: PendingNotification) {
  const clientName = [item.first_name, item.last_name].filter(Boolean).join(" ") || "Без имени";
  const eventTitle: Record<TelegramEventType, string> = {
    booked: "📅 ВСТРЕЧА НАЗНАЧЕНА",
    cancelled: "⛔ ВСТРЕЧА ОТМЕНЕНА",
    rescheduled: "↪️ ВСТРЕЧА ПЕРЕНЕСЕНА",
  };
  const lines = [`<b>${eventTitle[item.event_type]}</b>`, ""];
  if (item.recipient_role === "architect") {
    lines.push(`Школа: ${escapeTelegramHtml(item.school_name)}`, `Менеджер: ${escapeTelegramHtml(item.manager_name)}`);
  }
  lines.push(`Клиент: ${escapeTelegramHtml(clientName)}`);
  if (item.username) {
    const username = item.username.startsWith("@") ? item.username : `@${item.username}`;
    lines.push(`Username: ${escapeTelegramHtml(username)}`);
  }
  if (item.event_type === "rescheduled" && item.previous_date && item.previous_start_time) {
    lines.push(`Было: ${formatMeetingDate(item.previous_date)}, ${escapeTelegramHtml(item.previous_start_time)}`);
    lines.push(`Стало: ${formatMeetingDate(item.date)}, ${escapeTelegramHtml(item.start_time)}`);
  } else {
    lines.push(`Дата: ${formatMeetingDate(item.date)}`, `Время: ${escapeTelegramHtml(item.start_time)}`);
  }
  if (item.comment) lines.push(`Комментарий: ${escapeTelegramHtml(item.comment)}`);
  return lines.join("\n");
}

async function nextPendingNotification(): Promise<PendingNotification | null> {
  const candidates = await query<{ id: number }>(`
    SELECT id FROM telegram_notification_outbox
    WHERE delivered_at IS NULL
      AND attempts < 5
      AND (locked_until IS NULL OR locked_until < now())
      AND (last_attempt_at IS NULL OR last_attempt_at < now() - interval '1 minute')
    ORDER BY created_at ASC
    LIMIT 10
  `);
  for (const { id } of candidates.rows) {
    const claimed = await query<PendingNotification>(`
      WITH claimed AS (
        UPDATE telegram_notification_outbox
        SET attempts = attempts + 1, last_attempt_at = now(), locked_until = now() + interval '1 minute'
        WHERE id = $1 AND delivered_at IS NULL AND (locked_until IS NULL OR locked_until < now())
        RETURNING id, meeting_id, manager_id, recipient_id, event_type
      )
      SELECT claimed.id, claimed.meeting_id, claimed.manager_id, claimed.recipient_id, claimed.event_type,
        connection.chat_id::text, recipient.role AS recipient_role, school.name AS school_name,
        COALESCE(target_manager.name, manager.name) AS manager_name,
        client.first_name, client.last_name, client.username, client.comment,
        CASE WHEN claimed.event_type = 'rescheduled' THEN COALESCE(target.date, meeting.date)::text ELSE meeting.date::text END AS date,
        CASE WHEN claimed.event_type = 'rescheduled' THEN COALESCE(target.start_time, meeting.start_time) ELSE meeting.start_time END AS start_time,
        CASE WHEN claimed.event_type = 'rescheduled' THEN meeting.date::text ELSE NULL END AS previous_date,
        CASE WHEN claimed.event_type = 'rescheduled' THEN meeting.start_time ELSE NULL END AS previous_start_time
      FROM claimed
      LEFT JOIN telegram_connections connection ON connection.user_id = claimed.recipient_id
      JOIN users recipient ON recipient.id = claimed.recipient_id
      JOIN meetings meeting ON meeting.id = claimed.meeting_id
      LEFT JOIN meetings target ON target.id = meeting.rescheduled_to_meeting_id
      JOIN schools school ON school.id = meeting.school_id
      JOIN users manager ON manager.id = claimed.manager_id
      LEFT JOIN users target_manager ON target_manager.id = target.manager_id
      JOIN clients client ON client.id = meeting.client_id
    `, [id]);
    const item = claimed.rows[0];
    if (!item) continue;
    if (!item.chat_id) {
      await query("UPDATE telegram_notification_outbox SET delivered_at = now(), locked_until = NULL WHERE id = $1", [item.id]);
      continue;
    }
    return item;
  }
  return null;
}

async function deliverNotification(item: PendingNotification) {
  try {
    const { appBaseUrl } = config();
    await telegramApi("sendMessage", {
      chat_id: Number(item.chat_id),
      text: notificationText(item),
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "Открыть календарь", url: `${appBaseUrl}/?tab=calendar` }]] },
    });
    await query("UPDATE telegram_notification_outbox SET delivered_at = now(), locked_until = NULL, last_error = NULL WHERE id = $1", [item.id]);
  } catch {
    await query("UPDATE telegram_notification_outbox SET locked_until = NULL, last_error = 'Не удалось отправить уведомление Telegram' WHERE id = $1", [item.id]);
  }
}

export async function deliverPendingTelegramNotifications() {
  if (!isTelegramConfigured()) return;
  for (let delivered = 0; delivered < 10; delivered += 1) {
    const item = await nextPendingNotification();
    if (!item) return;
    await deliverNotification(item);
  }
}

function slotNotificationText(item: PendingSlotNotification) {
  const lines = [
    "<b>🗓 ДОБАВЛЕНО ОКОШКО</b>",
    "",
    `Школа: ${escapeTelegramHtml(item.school_name)}`,
    `Добавил: ${escapeTelegramHtml(item.creator_name)}`,
    `Для менеджера: ${escapeTelegramHtml(item.manager_name)}`,
    `Дата: ${formatMeetingDate(item.date)}`,
    `Время: ${escapeTelegramHtml(item.start_time)}`,
  ];
  return lines.join("\n");
}

async function nextPendingSlotNotification(): Promise<PendingSlotNotification | null> {
  const candidates = await query<{ id: number }>(`
    SELECT id FROM telegram_slot_notification_outbox
    WHERE delivered_at IS NULL
      AND attempts < 5
      AND (locked_until IS NULL OR locked_until < now())
      AND (last_attempt_at IS NULL OR last_attempt_at < now() - interval '1 minute')
    ORDER BY created_at ASC
    LIMIT 10
  `);
  for (const { id } of candidates.rows) {
    const claimed = await query<PendingSlotNotification>(`
      WITH claimed AS (
        UPDATE telegram_slot_notification_outbox
        SET attempts = attempts + 1, last_attempt_at = now(), locked_until = now() + interval '1 minute'
        WHERE id = $1 AND delivered_at IS NULL AND (locked_until IS NULL OR locked_until < now())
        RETURNING id, time_slot_id, creator_id, manager_id, recipient_id
      )
      SELECT claimed.id, claimed.time_slot_id, claimed.recipient_id,
        connection.chat_id::text, school.name AS school_name,
        creator.name AS creator_name, manager.name AS manager_name,
        slot.date::text, slot.start_time
      FROM claimed
      LEFT JOIN telegram_connections connection ON connection.user_id = claimed.recipient_id
      JOIN time_slots slot ON slot.id = claimed.time_slot_id
      JOIN schools school ON school.id = slot.school_id
      JOIN users creator ON creator.id = claimed.creator_id
      JOIN users manager ON manager.id = claimed.manager_id
    `, [id]);
    const item = claimed.rows[0];
    if (!item) continue;
    if (!item.chat_id) {
      await query("UPDATE telegram_slot_notification_outbox SET delivered_at = now(), locked_until = NULL WHERE id = $1", [item.id]);
      continue;
    }
    return item;
  }
  return null;
}

async function deliverSlotNotification(item: PendingSlotNotification) {
  try {
    const { appBaseUrl } = config();
    await telegramApi("sendMessage", {
      chat_id: Number(item.chat_id),
      text: slotNotificationText(item),
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "Открыть окошки", url: `${appBaseUrl}/?tab=timeslots` }]] },
    });
    await query("UPDATE telegram_slot_notification_outbox SET delivered_at = now(), locked_until = NULL, last_error = NULL WHERE id = $1", [item.id]);
  } catch {
    await query("UPDATE telegram_slot_notification_outbox SET locked_until = NULL, last_error = 'Не удалось отправить уведомление об окошке' WHERE id = $1", [item.id]);
  }
}

export async function deliverPendingSlotNotifications() {
  if (!isTelegramConfigured()) return;
  for (let delivered = 0; delivered < 10; delivered += 1) {
    const item = await nextPendingSlotNotification();
    if (!item) return;
    await deliverSlotNotification(item);
  }
}

export async function queueTimeSlotCreatedNotification(
  slot: { id: string; manager_id: string },
  creator: { id: string },
) {
  if (!isTelegramConfigured()) return;
  const recipients = await query<{ user_id: string }>(`
    SELECT connection.user_id
    FROM telegram_connections connection
    JOIN users recipient ON recipient.id = connection.user_id
    WHERE recipient.role = 'architect' AND recipient.is_active = true
  `);
  for (const recipient of recipients.rows) {
    await query(`
      INSERT INTO telegram_slot_notification_outbox (time_slot_id, creator_id, manager_id, recipient_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (time_slot_id, recipient_id) DO NOTHING
    `, [slot.id, creator.id, slot.manager_id, recipient.user_id]);
  }
  void deliverPendingSlotNotifications().catch(() => undefined);
}

export async function recordSlotsOffered(schoolId: string, clientId: string, rawSlotIds: unknown) {
  if (!Array.isArray(rawSlotIds)) return;
  const slotIds = Array.from(new Set(rawSlotIds.filter((id): id is string => typeof id === "string")));
  if (slotIds.length === 0) return;
  const managers = await query<{ manager_id: string; quantity: number }>(`
    SELECT manager_id, COUNT(*)::int AS quantity
    FROM time_slots
    WHERE school_id = $1 AND id = ANY($2::uuid[])
    GROUP BY manager_id
  `, [schoolId, slotIds]);
  for (const manager of managers.rows) {
    await query(`
      INSERT INTO telegram_activity_events (school_id, manager_id, client_id, event_type, quantity)
      VALUES ($1, $2, $3, 'slots_offered', $4)
    `, [schoolId, manager.manager_id, clientId, manager.quantity]);
  }
}

export async function recordMeetingActivity(
  schoolId: string,
  meeting: { id: string; manager_id: string; client_id: string },
  eventType: ActivityEventType,
) {
  await query(`
    INSERT INTO telegram_activity_events (school_id, manager_id, client_id, meeting_id, event_type)
    VALUES ($1, $2, $3, $4, $5)
  `, [schoolId, meeting.manager_id, meeting.client_id, meeting.id, eventType]);
}

export async function queueMeetingNotification(
  meeting: { id: string; manager_id: string },
  eventType: TelegramEventType,
) {
  if (!isTelegramConfigured()) return;
  const recipients = await query<{ user_id: string }>(`
    SELECT DISTINCT connection.user_id
    FROM telegram_connections connection
    JOIN users recipient ON recipient.id = connection.user_id AND recipient.is_active = true
    WHERE (
      recipient.role IN ('manager', 'admin', 'super_admin', 'architect')
      AND (
        ($2 <> 'rescheduled' AND connection.user_id = $1)
        OR ($2 = 'rescheduled' AND connection.user_id IN (
          SELECT source.manager_id FROM meetings source WHERE source.id = $3
          UNION
          SELECT target.manager_id
          FROM meetings source JOIN meetings target ON target.id = source.rescheduled_to_meeting_id
          WHERE source.id = $3
        ))
      )
    ) OR (recipient.role = 'architect' AND $2 <> 'booked')
  `, [meeting.manager_id, eventType, meeting.id]);
  for (const recipient of recipients.rows) {
    await query(`
      INSERT INTO telegram_notification_outbox (meeting_id, manager_id, recipient_id, event_type)
      VALUES ($1, $2, $3, $4)
    `, [meeting.id, meeting.manager_id, recipient.user_id, eventType]);
  }
  void deliverPendingTelegramNotifications().catch(() => undefined);
}

export async function getTelegramStatus(userId: string) {
  const configured = isTelegramConfigured();
  const connection = await query<{ connected_at: string }>("SELECT connected_at FROM telegram_connections WHERE user_id = $1", [userId]);
  let botUsername: string | undefined;
  if (configured) {
    try { botUsername = (await getBotIdentity()).username; } catch { /* Profile settings remain available during an outage. */ }
  }
  return { configured, connected: Boolean(connection.rows[0]), connectedAt: connection.rows[0]?.connected_at, botUsername };
}

export async function createTelegramConnectUrl(userId: string) {
  if (!isTelegramConfigured()) throw new Error("Интеграция Telegram ещё не настроена на сервере");
  const bot = await getBotIdentity();
  if (!bot.username) throw new Error("У Telegram-бота не задано имя пользователя");
  const token = randomBytes(24).toString("base64url");
  await query("DELETE FROM telegram_link_tokens WHERE expires_at < now() OR user_id = $1", [userId]);
  await query("INSERT INTO telegram_link_tokens (token, user_id, expires_at) VALUES ($1, $2, now() + interval '15 minutes')", [token, userId]);
  return `https://t.me/${bot.username}?start=${token}`;
}

export async function disconnectTelegram(userId: string) {
  await query("DELETE FROM telegram_connections WHERE user_id = $1", [userId]);
  await query("DELETE FROM telegram_link_tokens WHERE user_id = $1", [userId]);
}

export async function processTelegramWebhook(update: unknown, providedSecret: string | undefined) {
  if (!isTelegramConfigured() || !hasValidWebhookSecret(providedSecret)) return false;
  const message = (update as TelegramUpdate | undefined)?.message;
  const text = message?.text?.trim() ?? "";
  const startToken = /^\/start(?:@\w+)?\s+([A-Za-z0-9_-]{20,})$/.exec(text)?.[1];
  const chatId = message?.chat?.id;
  const telegramUserId = message?.from?.id;
  if (!startToken || !chatId || !telegramUserId) return true;
  const link = await query<{ user_id: string }>("DELETE FROM telegram_link_tokens WHERE token = $1 AND expires_at > now() RETURNING user_id", [startToken]);
  const userId = link.rows[0]?.user_id;
  if (!userId) {
    await telegramApi("sendMessage", { chat_id: chatId, text: "Ссылка устарела. Откройте настройки профиля и создайте новую." });
    return true;
  }
  const occupied = await query<{ user_id: string }>(`
    SELECT user_id FROM telegram_connections
    WHERE (chat_id = $1 OR telegram_user_id = $2) AND user_id <> $3
  `, [chatId, telegramUserId, userId]);
  if (occupied.rows[0]) {
    await telegramApi("sendMessage", { chat_id: chatId, text: "Этот Telegram уже привязан к другому профилю." });
    return true;
  }
  await query(`
    INSERT INTO telegram_connections (user_id, chat_id, telegram_user_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id) DO UPDATE
    SET chat_id = EXCLUDED.chat_id, telegram_user_id = EXCLUDED.telegram_user_id, connected_at = now()
  `, [userId, chatId, telegramUserId]);
  await telegramApi("sendMessage", { chat_id: chatId, text: "Telegram подключён. Настройки уведомлений применены." });
  return true;
}

type MoscowClock = { date: string; weekday: string; hour: number };
type DailyWindow = "morning" | "evening";

function moscowClock(): MoscowClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: get("weekday"),
    hour: Number(get("hour")),
  };
}

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function weekContaining(date: string): WeeklyPeriod {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysAfterMonday = (weekday + 6) % 7;
  const start = shiftDate(date, -daysAfterMonday);
  return { start, end: shiftDate(start, 6) };
}

function moscowDailyWindow(): { date: string; window: DailyWindow } | null {
  const clock = moscowClock();
  if (clock.hour === 9) return { date: clock.date, window: "morning" };
  if (clock.hour === 20) return { date: clock.date, window: "evening" };
  return null;
}

function moscowWeeklyPeriod(): WeeklyPeriod | null {
  const clock = moscowClock();
  if (clock.weekday !== "Sun" || clock.hour < 20) return null;
  return weekContaining(clock.date);
}

function formatPeriod(period: WeeklyPeriod) {
  return `${formatMeetingDate(period.start)} — ${formatMeetingDate(period.end)}`;
}

const emptyOperationalTotals = (): OperationalTotals => ({
  slots_total: 0,
  slots_booked: 0,
  slots_offered: 0,
  clients_booked: 0,
  meetings_completed: 0,
  meetings_sold: 0,
  meetings_rescheduled: 0,
  meetings_cancelled: 0,
});

export async function operationalMetrics(schoolId: string, period: WeeklyPeriod) {
  const totals = await query<OperationalTotals>(`
    WITH slot_metrics AS (
      SELECT COUNT(*)::int AS slots_total,
        COUNT(*) FILTER (WHERE is_booked)::int AS slots_booked
      FROM time_slots
      WHERE school_id = $1 AND date BETWEEN $2::date AND $3::date
    ), meeting_metrics AS (
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed')::int AS meetings_completed,
        COUNT(*) FILTER (WHERE status = 'completed_with_sale')::int AS meetings_sold,
        COUNT(*) FILTER (WHERE status = 'rescheduled')::int AS meetings_rescheduled,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS meetings_cancelled
      FROM meetings
      WHERE school_id = $1 AND date BETWEEN $2::date AND $3::date
    ), booking_metrics AS (
      SELECT COUNT(*)::int AS clients_booked
      FROM meetings
      WHERE school_id = $1
        AND rescheduled_from_meeting_id IS NULL
        AND created_at >= ($2::date::timestamp AT TIME ZONE 'Europe/Moscow')
        AND created_at < (($3::date + 1)::timestamp AT TIME ZONE 'Europe/Moscow')
    ), offered_metrics AS (
      SELECT COALESCE(SUM(quantity) FILTER (WHERE event_type = 'slots_offered'), 0)::int AS slots_offered
      FROM telegram_activity_events
      WHERE school_id = $1
        AND created_at >= ($2::date::timestamp AT TIME ZONE 'Europe/Moscow')
        AND created_at < (($3::date + 1)::timestamp AT TIME ZONE 'Europe/Moscow')
    )
    SELECT slot_metrics.slots_total, slot_metrics.slots_booked, offered_metrics.slots_offered,
      booking_metrics.clients_booked, meeting_metrics.meetings_completed, meeting_metrics.meetings_sold,
      meeting_metrics.meetings_rescheduled, meeting_metrics.meetings_cancelled
    FROM slot_metrics, meeting_metrics, booking_metrics, offered_metrics
  `, [schoolId, period.start, period.end]);

  const managers = await query<ManagerOperationalSummary>(`
    WITH slot_metrics AS (
      SELECT manager_id, COUNT(*)::int AS slots_total,
        COUNT(*) FILTER (WHERE is_booked)::int AS slots_booked
      FROM time_slots
      WHERE school_id = $1 AND date BETWEEN $2::date AND $3::date
      GROUP BY manager_id
    ), meeting_metrics AS (
      SELECT manager_id,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS meetings_completed,
        COUNT(*) FILTER (WHERE status = 'completed_with_sale')::int AS meetings_sold,
        COUNT(*) FILTER (WHERE status = 'rescheduled')::int AS meetings_rescheduled,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS meetings_cancelled
      FROM meetings
      WHERE school_id = $1 AND date BETWEEN $2::date AND $3::date
      GROUP BY manager_id
    ), booking_metrics AS (
      SELECT manager_id, COUNT(*)::int AS clients_booked
      FROM meetings
      WHERE school_id = $1
        AND rescheduled_from_meeting_id IS NULL
        AND created_at >= ($2::date::timestamp AT TIME ZONE 'Europe/Moscow')
        AND created_at < (($3::date + 1)::timestamp AT TIME ZONE 'Europe/Moscow')
      GROUP BY manager_id
    ), offered_metrics AS (
      SELECT manager_id, COALESCE(SUM(quantity) FILTER (WHERE event_type = 'slots_offered'), 0)::int AS slots_offered
      FROM telegram_activity_events
      WHERE school_id = $1
        AND created_at >= ($2::date::timestamp AT TIME ZONE 'Europe/Moscow')
        AND created_at < (($3::date + 1)::timestamp AT TIME ZONE 'Europe/Moscow')
      GROUP BY manager_id
    )
    SELECT employee.name AS manager_name,
      COALESCE(slot_metrics.slots_total, 0)::int AS slots_total,
      COALESCE(slot_metrics.slots_booked, 0)::int AS slots_booked,
      COALESCE(offered_metrics.slots_offered, 0)::int AS slots_offered,
      COALESCE(booking_metrics.clients_booked, 0)::int AS clients_booked,
      COALESCE(meeting_metrics.meetings_completed, 0)::int AS meetings_completed,
      COALESCE(meeting_metrics.meetings_sold, 0)::int AS meetings_sold,
      COALESCE(meeting_metrics.meetings_rescheduled, 0)::int AS meetings_rescheduled,
      COALESCE(meeting_metrics.meetings_cancelled, 0)::int AS meetings_cancelled
    FROM users employee
    LEFT JOIN slot_metrics ON slot_metrics.manager_id = employee.id
    LEFT JOIN meeting_metrics ON meeting_metrics.manager_id = employee.id
    LEFT JOIN booking_metrics ON booking_metrics.manager_id = employee.id
    LEFT JOIN offered_metrics ON offered_metrics.manager_id = employee.id
    WHERE employee.school_id = $1 AND employee.role IN ('manager', 'admin', 'super_admin', 'architect') AND employee.is_active = true
    ORDER BY employee.name ASC
  `, [schoolId, period.start, period.end]);
  return { totals: totals.rows[0] ?? emptyOperationalTotals(), managers: managers.rows };
}

function managerHasActivity(manager: ManagerOperationalSummary) {
  return manager.slots_total + manager.slots_offered + manager.clients_booked + manager.meetings_completed
    + manager.meetings_sold + manager.meetings_rescheduled + manager.meetings_cancelled > 0;
}

function managerSummaryLine(manager: ManagerOperationalSummary) {
  return `• ${escapeTelegramHtml(manager.manager_name)}: окошек ${manager.slots_total}, занято ${manager.slots_booked}; записей ${manager.clients_booked}; проведено ${manager.meetings_completed}, с продажей ${manager.meetings_sold}; переносов ${manager.meetings_rescheduled}, отмен ${manager.meetings_cancelled}`;
}

function dailySummaryText(
  schoolName: string,
  date: string,
  window: DailyWindow,
  today: OperationalTotals,
  todayManagers: ManagerOperationalSummary[],
  week: OperationalTotals,
  weekPeriod: WeeklyPeriod,
) {
  const title = window === "morning" ? "🌤 УТРЕННЯЯ СВОДКА" : "🌙 ВЕЧЕРНЯЯ СВОДКА";
  const activeManagers = todayManagers.filter(managerHasActivity);
  const conducted = week.meetings_completed + week.meetings_sold;
  const lines = [
    `<b>${title}</b>`,
    `Школа: ${escapeTelegramHtml(schoolName)}`,
    `Дата: ${formatMeetingDate(date)}`,
    "",
    "<b>Сегодня</b>",
    `• Окошек: ${today.slots_total} · занято: ${today.slots_booked}`,
    `• Клиентов записано сегодня: ${today.clients_booked}`,
    `• Проведено: ${today.meetings_completed} · с продажей: ${today.meetings_sold}`,
    `• Перенесено: ${today.meetings_rescheduled} · отменено: ${today.meetings_cancelled}`,
    "",
    "<b>По менеджерам сегодня</b>",
    ...(activeManagers.length > 0 ? activeManagers.map(managerSummaryLine) : ["• Окошек и встреч пока нет"]),
    "",
    `<b>Заполняемость недели</b> · ${formatPeriod(weekPeriod)}`,
    `• Всего окошек: ${week.slots_total}`,
    `• Заполнено: ${week.slots_booked} · ${conversion(week.slots_booked, week.slots_total)}`,
    `• Предложено клиентам: ${week.slots_offered}`,
    `• Записано клиентов: ${week.clients_booked}`,
    `• Проведено: ${week.meetings_completed} · с продажей: ${week.meetings_sold}`,
    `• Перенесено: ${week.meetings_rescheduled} · отменено: ${week.meetings_cancelled}`,
    `• Конверсия проведённых в продажу: ${conversion(week.meetings_sold, conducted)}`,
  ];
  return lines.join("\n");
}

async function deliverDailySummary(
  recipientId: string,
  chatId: string,
  schoolId: string,
  schoolName: string,
  date: string,
  window: DailyWindow,
) {
  const claim = await query<{ id: number }>(`
    INSERT INTO telegram_daily_summaries (recipient_id, school_id, report_date, report_window, attempts, last_attempt_at)
    VALUES ($1, $2, $3::date, $4, 1, now())
    ON CONFLICT (recipient_id, school_id, report_date, report_window) DO UPDATE
      SET attempts = telegram_daily_summaries.attempts + 1, last_attempt_at = now(), last_error = NULL
      WHERE telegram_daily_summaries.sent_at IS NULL
        AND (telegram_daily_summaries.last_attempt_at IS NULL OR telegram_daily_summaries.last_attempt_at < now() - interval '5 minutes')
    RETURNING id
  `, [recipientId, schoolId, date, window]);
  const summaryId = claim.rows[0]?.id;
  if (!summaryId) return;
  try {
    const todayPeriod = { start: date, end: date };
    const weekPeriod = weekContaining(date);
    const [{ totals: today, managers }, { totals: week }] = await Promise.all([
      operationalMetrics(schoolId, todayPeriod),
      operationalMetrics(schoolId, weekPeriod),
    ]);
    await telegramApi("sendMessage", {
      chat_id: Number(chatId),
      text: dailySummaryText(schoolName, date, window, today, managers, week, weekPeriod),
      parse_mode: "HTML",
    });
    await query("UPDATE telegram_daily_summaries SET sent_at = now(), last_error = NULL WHERE id = $1", [summaryId]);
  } catch {
    await query("UPDATE telegram_daily_summaries SET last_error = 'Не удалось отправить ежедневную сводку' WHERE id = $1", [summaryId]);
  }
}

async function architectsAndSchools() {
  const architects = await query<{ id: string; chat_id: string }>(`
    SELECT employee.id, connection.chat_id::text
    FROM users employee JOIN telegram_connections connection ON connection.user_id = employee.id
    WHERE employee.role = 'architect' AND employee.is_active = true
  `);
  const schools = await query<{ id: string; name: string }>("SELECT id, name FROM schools ORDER BY name ASC");
  return { architects: architects.rows, schools: schools.rows };
}

export async function deliverDailyTelegramSummaries() {
  if (!isTelegramConfigured()) return;
  const schedule = moscowDailyWindow();
  if (!schedule) return;
  const { architects, schools } = await architectsAndSchools();
  for (const architect of architects) {
    for (const school of schools) {
      await deliverDailySummary(architect.id, architect.chat_id, school.id, school.name, schedule.date, schedule.window);
    }
  }
}

function weeklySummaryText(schoolName: string, period: WeeklyPeriod, totals: OperationalTotals, managers: ManagerOperationalSummary[]) {
  const activeManagers = managers.filter(managerHasActivity);
  const conducted = totals.meetings_completed + totals.meetings_sold;
  const lines = [
    "<b>📊 ЕЖЕНЕДЕЛЬНАЯ СВОДКА</b>",
    `Школа: ${escapeTelegramHtml(schoolName)}`,
    `Период: ${formatPeriod(period)}`,
    "",
    "<b>Итоги недели</b>",
    `• Всего окошек: ${totals.slots_total}`,
    `• Заполнено: ${totals.slots_booked} · ${conversion(totals.slots_booked, totals.slots_total)}`,
    `• Предложено клиентам: ${totals.slots_offered}`,
    `• Записано клиентов: ${totals.clients_booked}`,
    `• Проведено: ${totals.meetings_completed} · с продажей: ${totals.meetings_sold}`,
    `• Перенесено: ${totals.meetings_rescheduled} · отменено: ${totals.meetings_cancelled}`,
    `• Конверсия записей во встречу: ${conversion(conducted, totals.clients_booked)}`,
    `• Конверсия проведённых в продажу: ${conversion(totals.meetings_sold, conducted)}`,
    "",
    "<b>По менеджерам</b>",
    ...(activeManagers.length > 0 ? activeManagers.map(managerSummaryLine) : ["• Данных за неделю пока нет"]),
  ];
  return lines.join("\n");
}

async function deliverWeeklySummary(recipientId: string, chatId: string, schoolId: string, schoolName: string, period: WeeklyPeriod) {
  const claim = await query<{ id: number }>(`
    INSERT INTO telegram_weekly_summaries (recipient_id, school_id, period_start, period_end, attempts, last_attempt_at)
    VALUES ($1, $2, $3::date, $4::date, 1, now())
    ON CONFLICT (recipient_id, school_id, period_end) DO UPDATE
      SET attempts = telegram_weekly_summaries.attempts + 1, last_attempt_at = now(), last_error = NULL
      WHERE telegram_weekly_summaries.sent_at IS NULL
        AND (telegram_weekly_summaries.last_attempt_at IS NULL OR telegram_weekly_summaries.last_attempt_at < now() - interval '5 minutes')
    RETURNING id
  `, [recipientId, schoolId, period.start, period.end]);
  const summaryId = claim.rows[0]?.id;
  if (!summaryId) return;
  try {
    const { totals, managers } = await operationalMetrics(schoolId, period);
    await telegramApi("sendMessage", {
      chat_id: Number(chatId),
      text: weeklySummaryText(schoolName, period, totals, managers),
      parse_mode: "HTML",
    });
    await query("UPDATE telegram_weekly_summaries SET sent_at = now(), last_error = NULL WHERE id = $1", [summaryId]);
  } catch {
    await query("UPDATE telegram_weekly_summaries SET last_error = 'Не удалось отправить еженедельную сводку' WHERE id = $1", [summaryId]);
  }
}

export async function deliverWeeklyTelegramSummaries() {
  if (!isTelegramConfigured()) return;
  const period = moscowWeeklyPeriod();
  if (!period) return;
  const { architects, schools } = await architectsAndSchools();
  for (const architect of architects) {
    for (const school of schools) await deliverWeeklySummary(architect.id, architect.chat_id, school.id, school.name, period);
  }
}

export async function initializeTelegramIntegration() {
  if (!isTelegramConfigured()) {
    console.log("Telegram notifications are disabled: configuration is missing");
    return;
  }
  try {
    await configureWebhook();
    void deliverPendingTelegramNotifications().catch(() => undefined);
    void deliverPendingSlotNotifications().catch(() => undefined);
    void deliverDailyTelegramSummaries().catch(() => undefined);
    void deliverWeeklyTelegramSummaries().catch(() => undefined);
    if (!deliveryTimer) {
      deliveryTimer = setInterval(() => {
        void deliverPendingTelegramNotifications().catch(() => undefined);
        void deliverPendingSlotNotifications().catch(() => undefined);
        void deliverDailyTelegramSummaries().catch(() => undefined);
        void deliverWeeklyTelegramSummaries().catch(() => undefined);
      }, 10 * 60_000);
      deliveryTimer.unref();
    }
  } catch {
    console.error("Telegram integration could not be initialized");
  }
}
