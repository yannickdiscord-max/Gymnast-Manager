import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

/** Single-row catalog of custom onderdelen per toestel (JSON: Record<toestel, TurnOnderdeel[]>). */
export const onderdelenCatalog = pgTable("onderdelen_catalog", {
  id: varchar("id", { length: 36 }).primaryKey(),
  data: jsonb("data").notNull(),
});

export const sporters = pgTable("sporters", {
  id: varchar("id", { length: 64 }).primaryKey(),
  naam: text("naam").notNull(),
  geboortedatum: varchar("geboortedatum", { length: 16 }).notNull().default(""),
  niveau: text("niveau").notNull(),
  favoriet: boolean("favoriet").notNull().default(false),
  onderdelen: jsonb("onderdelen").notNull(),
  oefening: jsonb("oefening").notNull(),
});

export const sporterBlessures = pgTable("sporter_blessures", {
  sporterId: varchar("sporter_id", { length: 64 })
    .primaryKey()
    .references(() => sporters.id, { onDelete: "cascade" }),
  current: jsonb("current").notNull(),
  previous: jsonb("previous").notNull(),
});

export const trainingSessions = pgTable("training_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  datum: varchar("datum", { length: 16 }).notNull().unique(),
  attendeeSporterIds: jsonb("attendee_sporter_ids").notNull(),
});

/** Samenvatting aanwezigheid per sporter na afsluiten van een turnseizoen. */
export const sporterAttendanceArchives = pgTable("sporter_attendance_archives", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sporterId: varchar("sporter_id", { length: 64 })
    .notNull()
    .references(() => sporters.id, { onDelete: "cascade" }),
  seasonBatchId: varchar("season_batch_id", { length: 64 }).notNull(),
  seasonLabel: text("season_label").notNull(),
  archivedAt: varchar("archived_at", { length: 16 }).notNull(),
  attendedSessions: integer("attended_sessions").notNull(),
  totalSessions: integer("total_sessions").notNull(),
  percentage: integer("percentage").notNull(),
});

export const ouderGesprekken = pgTable("ouder_gesprekken", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sporterId: varchar("sporter_id", { length: 64 })
    .notNull()
    .references(() => sporters.id, { onDelete: "cascade" }),
  datum: varchar("datum", { length: 16 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  notities: text("notities").notNull(),
});

export const wedstrijden = pgTable("wedstrijden", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sporterId: varchar("sporter_id", { length: 64 })
    .notNull()
    .references(() => sporters.id, { onDelete: "cascade" }),
  sharedMatchId: varchar("shared_match_id", { length: 64 }),
  naam: text("naam").notNull(),
  datum: varchar("datum", { length: 16 }).notNull(),
  locatie: text("locatie").notNull(),
  scores: jsonb("scores").notNull(),
  expectedDWaarde: jsonb("expected_d_waarde"),
  targetNiveaus: jsonb("target_niveaus"),
});

export const customAgendaEvents = pgTable("custom_agenda_events", {
  id: varchar("id", { length: 64 }).primaryKey(),
  titel: text("titel").notNull(),
  datum: varchar("datum", { length: 16 }).notNull(),
  locatie: text("locatie").notNull(),
  categorie: varchar("categorie", { length: 32 }).notNull(),
  notitie: text("notitie").notNull(),
  /** Empty string except for categorie `lesplan`: `private` | `public`. */
  lesplanVisibility: varchar("lesplan_visibility", { length: 16 })
    .notNull()
    .default(""),
  /** When multi-user auth exists, private lesplans are visible only to this user id. */
  ownerUserId: varchar("owner_user_id", { length: 64 }),
});

export const appMeta = pgTable("app_meta", {
  key: varchar("key", { length: 128 }).primaryKey(),
  value: text("value").notNull(),
});
