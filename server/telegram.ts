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
  recipient_role: "architect" | "manager" | "admin";
  school_name: string;
  manager_name: string;
  first_name: string;
  last_name: string;
  username: string;
  comment: string | null;
  date: string;
  start_time: string;
};

type SummaryTotals = {
  slots_offered: number;
  meetings_booked: number;
  meetings_sold: number;
  meetings_rescheduled: number;
  meetings_cancelled: number;
};
type ManagerSummary = SummaryTotals & { manager_name: string };
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
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({})) as TelegramApiResponse<T>;
  if (!response.ok || !body.ok || body.result === undefined) throw new Error(body.description || "Telegram API request failed");
  return body.result;
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

function notificationText(item: PendingNotification) {
  const clientName = [item.first_name, item.last_name].filter(Boolean).join(" ") || "Без имени";
  const eventTitle: Record<TelegramEventType, string> = {
    booked: "📅 Новая запись на встречу",
    cancelled: "⛔ Встреча отменена",
    rescheduled: "↪️ Встреча перенесена",
  };
  const lines = [eventTitle[item.event_type], ""];
  if (item.recipient_role === "architect") lines.push(`Школа: ${item.school_name}`, `Менеджер: ${item.manager_name}`);
  lines.push(`Клиент: ${clientName}`, `Дата: ${formatMeetingDate(item.date)}`, `Время: ${item.start_time}`);
  if (item.username) lines.push(`Username: ${item.username.startsWith("@") ? item.username : `@${item.username}`}`);
  if (item.comment) lines.push(`Комментарий: ${item.comment}`);
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
        manager.name AS manager_name, client.first_name, client.last_name, client.username, client.comment,
        meeting.date::text, meeting.start_time
      FROM claimed
      LEFT JOIN telegram_connections connection ON connection.user_id = claimed.recipient_id
      JOIN users recipient ON recipient.id = claimed.recipient_id
      JOIN meetings meeting ON meeting.id = claimed.meeting_id
      JOIN schools school ON school.id = meeting.school_id
      JOIN users manager ON manager.id = claimed.manager_id
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
    SELECT connection.user_id
    FROM telegram_connections connection
    JOIN users recipient ON recipient.id = connection.user_id AND recipient.is_active = true
    WHERE (connection.user_id = $1 AND recipient.role = 'manager') OR recipient.role = 'architect'
  `, [meeting.manager_id]);
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

function moscowWeeklyPeriod(): WeeklyPeriod | null {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  if (get("weekday") !== "Sun" || Number(get("hour")) < 20) return null;
  const today = new Date(Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day"))));
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - 6);
  return { start: monday.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) };
}

function formatPeriod(period: WeeklyPeriod) {
  return `${formatMeetingDate(period.start)} — ${formatMeetingDate(period.end)}`;
}

async function weeklyMetrics(schoolId: string, period: WeeklyPeriod) {
  const totals = await query<SummaryTotals>(`
    SELECT
      COALESCE(SUM(quantity) FILTER (WHERE event_type = 'slots_offered'), 0)::int AS slots_offered,
      COUNT(*) FILTER (WHERE event_type = 'meeting_booked')::int AS meetings_booked,
      COUNT(*) FILTER (WHERE event_type = 'meeting_sold')::int AS meetings_sold,
      COUNT(*) FILTER (WHERE event_type = 'meeting_rescheduled')::int AS meetings_rescheduled,
      COUNT(*) FILTER (WHERE event_type = 'meeting_cancelled')::int AS meetings_cancelled
    FROM telegram_activity_events
    WHERE school_id = $1 AND created_at >= $2::date AND created_at < now()
  `, [schoolId, period.start]);
  const managers = await query<ManagerSummary>(`
    SELECT
      user.name AS manager_name,
      COALESCE(SUM(event.quantity) FILTER (WHERE event.event_type = 'slots_offered'), 0)::int AS slots_offered,
      COUNT(event.id) FILTER (WHERE event.event_type = 'meeting_booked')::int AS meetings_booked,
      COUNT(event.id) FILTER (WHERE event.event_type = 'meeting_sold')::int AS meetings_sold,
      COUNT(event.id) FILTER (WHERE event.event_type = 'meeting_rescheduled')::int AS meetings_rescheduled,
      COUNT(event.id) FILTER (WHERE event.event_type = 'meeting_cancelled')::int AS meetings_cancelled
    FROM users user
    LEFT JOIN telegram_activity_events event ON event.manager_id = user.id AND event.created_at >= $2::date AND event.created_at < now()
    WHERE user.school_id = $1 AND user.role = 'manager'
    GROUP BY user.id, user.name
    ORDER BY user.name ASC
  `, [schoolId, period.start]);
  return { totals: totals.rows[0] ?? { slots_offered: 0, meetings_booked: 0, meetings_sold: 0, meetings_rescheduled: 0, meetings_cancelled: 0 }, managers: managers.rows };
}

function weeklySummaryText(schoolName: string, period: WeeklyPeriod, totals: SummaryTotals, managers: ManagerSummary[]) {
  const lines = [
    "📊 Еженедельная сводка",
    `Школа: ${schoolName}`,
    `Период: ${formatPeriod(period)}`,
    "",
    "Всего",
    `• Выслано окошек: ${totals.slots_offered}`,
    `• Записей на встречи: ${totals.meetings_booked} · конверсия ${conversion(totals.meetings_booked, totals.slots_offered)}`,
    `• Продаж: ${totals.meetings_sold} · конверсия ${conversion(totals.meetings_sold, totals.meetings_booked)}`,
    `• Переносов: ${totals.meetings_rescheduled} · отмен: ${totals.meetings_cancelled}`,
    "",
    "По менеджерам",
  ];
  if (managers.length === 0) lines.push("• Пока нет менеджеров");
  for (const manager of managers) {
    lines.push(`• ${manager.manager_name}: окошек ${manager.slots_offered}, встреч ${manager.meetings_booked} (${conversion(manager.meetings_booked, manager.slots_offered)}), продаж ${manager.meetings_sold} (${conversion(manager.meetings_sold, manager.meetings_booked)}), переносов ${manager.meetings_rescheduled}, отмен ${manager.meetings_cancelled}`);
  }
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
    const { totals, managers } = await weeklyMetrics(schoolId, period);
    await telegramApi("sendMessage", { chat_id: Number(chatId), text: weeklySummaryText(schoolName, period, totals, managers) });
    await query("UPDATE telegram_weekly_summaries SET sent_at = now(), last_error = NULL WHERE id = $1", [summaryId]);
  } catch {
    await query("UPDATE telegram_weekly_summaries SET last_error = 'Не удалось отправить еженедельную сводку' WHERE id = $1", [summaryId]);
  }
}

export async function deliverWeeklyTelegramSummaries() {
  if (!isTelegramConfigured()) return;
  const period = moscowWeeklyPeriod();
  if (!period) return;
  const architects = await query<{ id: string; chat_id: string }>(`
    SELECT user.id, connection.chat_id::text
    FROM users user JOIN telegram_connections connection ON connection.user_id = user.id
    WHERE user.role = 'architect' AND user.is_active = true
  `);
  if (architects.rows.length === 0) return;
  const schools = await query<{ id: string; name: string }>("SELECT id, name FROM schools ORDER BY name ASC");
  for (const architect of architects.rows) {
    for (const school of schools.rows) await deliverWeeklySummary(architect.id, architect.chat_id, school.id, school.name, period);
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
    void deliverWeeklyTelegramSummaries().catch(() => undefined);
    if (!deliveryTimer) {
      deliveryTimer = setInterval(() => {
        void deliverPendingTelegramNotifications().catch(() => undefined);
        void deliverWeeklyTelegramSummaries().catch(() => undefined);
      }, 10 * 60_000);
      deliveryTimer.unref();
    }
  } catch {
    console.error("Telegram integration could not be initialized");
  }
}
