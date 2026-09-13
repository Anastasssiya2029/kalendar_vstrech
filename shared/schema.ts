import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  isOnline: boolean("is_online").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === BASE SCHEMAS ===
export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;

// Request types
export type CreateMeetingRequest = InsertMeeting;
export type UpdateMeetingRequest = Partial<InsertMeeting>;

// Response types
export type MeetingResponse = Meeting;
export type MeetingsListResponse = Meeting[];
