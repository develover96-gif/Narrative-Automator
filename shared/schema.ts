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
  name: text("name"),
  email: text("email").unique(),
  headline: text("headline"),
  linkedInUrl: text("linkedin_url"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Integration settings table - stores connection configs
export const integrations = pgTable("integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: text("type").notNull(), // 'github', 'linear', 'jira', 'asana', 'stripe'
  status: text("status").notNull().default("disconnected"),
  lastSyncAt: timestamp("last_sync_at"),
  config: jsonb("config"),
});

// Activities table - events from integrations
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationId: varchar("integration_id").references(() => integrations.id),
  userId: varchar("user_id").references(() => users.id),
  source: text("source").notNull(),
  type: text("type").notNull(), // 'commit', 'issue_completed', 'pr_merged', 'milestone', 'revenue_milestone'
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  eventDate: timestamp("event_date").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  isProcessed: boolean("is_processed").default(false),
});

// Content table - generated posts
export const content = pgTable("content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").references(() => activities.id),
  userId: varchar("user_id").references(() => users.id),
  title: text("title"),
  body: text("body").notNull(),
  contentType: text("content_type").notNull().default("post"), // 'post', 'carousel', 'long_form'
  status: text("status").notNull().default("draft"), // 'draft', 'scheduled', 'published', 'archived'
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  engagementMetrics: jsonb("engagement_metrics"), // { views, likes, comments, shares }
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Style settings table - user preferences for content generation
export const styleSettings = pgTable("style_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  tone: text("tone").notNull().default("professional"),
  style: text("style").notNull().default("builder"),
  format: text("format").notNull().default("post"),
  examples: text("examples").array(),
  keywords: text("keywords").array(),
  avoidWords: text("avoid_words").array(),
});

// Watched topics - influencers / keywords to monitor
export const watchedTopics = pgTable("watched_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  keyword: text("keyword").notNull(),
  type: text("type").notNull().default("keyword"), // 'keyword', 'influencer', 'competitor'
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  integrations: many(integrations),
  activities: many(activities),
  content: many(content),
  styleSettings: many(styleSettings),
  watchedTopics: many(watchedTopics),
}));

export const integrationsRelations = relations(integrations, ({ many, one }) => ({
  activities: many(activities),
  user: one(users, { fields: [integrations.userId], references: [users.id] }),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  integration: one(integrations, {
    fields: [activities.integrationId],
    references: [integrations.id],
  }),
  user: one(users, { fields: [activities.userId], references: [users.id] }),
  content: many(content),
}));

export const contentRelations = relations(content, ({ one }) => ({
  activity: one(activities, {
    fields: [content.activityId],
    references: [activities.id],
  }),
  user: one(users, { fields: [content.userId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  headline: true,
  linkedInUrl: true,
  avatarUrl: true,
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

export const insertWatchedTopicSchema = createInsertSchema(watchedTopics).omit({
  id: true,
  createdAt: true,
});

// Auth schemas
export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  headline: z.string().max(200).optional(),
  linkedInUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  avatarUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PublicUser = Omit<User, "password">;

export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrations.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertContent = z.infer<typeof insertContentSchema>;
export type Content = typeof content.$inferSelect;

export type InsertStyleSettings = z.infer<typeof insertStyleSettingsSchema>;
export type StyleSettings = typeof styleSettings.$inferSelect;

export type InsertWatchedTopic = z.infer<typeof insertWatchedTopicSchema>;
export type WatchedTopic = typeof watchedTopics.$inferSelect;
