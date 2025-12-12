import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Integration settings table - stores connection configs
export const integrations = pgTable("integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'github', 'linear', 'jira', 'asana'
  status: text("status").notNull().default("disconnected"), // 'connected', 'disconnected', 'syncing', 'error'
  lastSyncAt: timestamp("last_sync_at"),
  config: jsonb("config"), // stores additional config like selected repos/projects
});

// Activities table - events from integrations
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationId: varchar("integration_id").references(() => integrations.id),
  source: text("source").notNull(), // 'github', 'linear'
  type: text("type").notNull(), // 'commit', 'issue_completed', 'pr_merged', 'milestone'
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"), // stores raw event data
  eventDate: timestamp("event_date").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  isProcessed: boolean("is_processed").default(false),
});

// Content table - generated posts
export const content = pgTable("content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").references(() => activities.id),
  title: text("title"),
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"), // 'draft', 'scheduled', 'published', 'archived'
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Style settings table - user preferences for content generation
export const styleSettings = pgTable("style_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tone: text("tone").notNull().default("professional"), // 'professional', 'casual', 'technical', 'storytelling'
  style: text("style").notNull().default("builder"), // 'builder', 'contrarian', 'data-focused', 'humble'
  examples: text("examples").array(), // sample posts for style reference
  keywords: text("keywords").array(), // preferred keywords/phrases
  avoidWords: text("avoid_words").array(), // words to avoid
});

// Relations
export const integrationsRelations = relations(integrations, ({ many }) => ({
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  integration: one(integrations, {
    fields: [activities.integrationId],
    references: [integrations.id],
  }),
  content: many(content),
}));

export const contentRelations = relations(content, ({ one }) => ({
  activity: one(activities, {
    fields: [content.activityId],
    references: [activities.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertContentSchema = createInsertSchema(content).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStyleSettingsSchema = createInsertSchema(styleSettings).omit({
  id: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrations.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertContent = z.infer<typeof insertContentSchema>;
export type Content = typeof content.$inferSelect;

export type InsertStyleSettings = z.infer<typeof insertStyleSettingsSchema>;
export type StyleSettings = typeof styleSettings.$inferSelect;
