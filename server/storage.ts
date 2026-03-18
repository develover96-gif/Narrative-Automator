import { 
  users, 
  integrations, 
  activities, 
  content, 
  styleSettings,
  watchedTopics,
  type User, 
  type InsertUser,
  type PublicUser,
  type Integration,
  type InsertIntegration,
  type Activity,
  type InsertActivity,
  type Content,
  type InsertContent,
  type StyleSettings,
  type InsertStyleSettings,
  type WatchedTopic,
  type InsertWatchedTopic,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  // Integrations
  getIntegrations(userId?: string): Promise<Integration[]>;
  getIntegration(id: string): Promise<Integration | undefined>;
  getIntegrationByType(type: string, userId?: string): Promise<Integration | undefined>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: string, data: Partial<InsertIntegration>): Promise<Integration | undefined>;

  // Activities
  getActivities(userId?: string): Promise<Activity[]>;
  getActivity(id: string): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: string, data: Partial<InsertActivity>): Promise<Activity | undefined>;
  clearActivities(userId?: string): Promise<void>;

  // Content
  getContent(userId?: string): Promise<Content[]>;
  getContentItem(id: string): Promise<Content | undefined>;
  createContent(item: InsertContent): Promise<Content>;
  updateContent(id: string, data: Partial<InsertContent>): Promise<Content | undefined>;
  deleteContent(id: string): Promise<boolean>;
  clearContent(userId?: string): Promise<void>;

  // Style Settings
  getStyleSettings(userId?: string): Promise<StyleSettings | undefined>;
  createOrUpdateStyleSettings(settings: InsertStyleSettings): Promise<StyleSettings>;

  // Watched Topics
  getWatchedTopics(userId?: string): Promise<WatchedTopic[]>;
  createWatchedTopic(topic: InsertWatchedTopic): Promise<WatchedTopic>;
  deleteWatchedTopic(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated || undefined;
  }

  // Integrations
  async getIntegrations(userId?: string): Promise<Integration[]> {
    if (userId) {
      return db.select().from(integrations).where(eq(integrations.userId, userId));
    }
    return db.select().from(integrations);
  }

  async getIntegration(id: string): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations).where(eq(integrations.id, id));
    return integration || undefined;
  }

  async getIntegrationByType(type: string, userId?: string): Promise<Integration | undefined> {
    if (userId) {
      const [integration] = await db.select().from(integrations)
        .where(and(eq(integrations.type, type), eq(integrations.userId, userId)));
      return integration || undefined;
    }
    const [integration] = await db.select().from(integrations).where(eq(integrations.type, type));
    return integration || undefined;
  }

  async createIntegration(integration: InsertIntegration): Promise<Integration> {
    const [created] = await db.insert(integrations).values(integration).returning();
    return created;
  }

  async updateIntegration(id: string, data: Partial<InsertIntegration>): Promise<Integration | undefined> {
    const [updated] = await db.update(integrations).set(data).where(eq(integrations.id, id)).returning();
    return updated || undefined;
  }

  // Activities
  async getActivities(userId?: string): Promise<Activity[]> {
    if (userId) {
      return db.select().from(activities)
        .where(eq(activities.userId, userId))
        .orderBy(desc(activities.eventDate));
    }
    return db.select().from(activities).orderBy(desc(activities.eventDate));
  }

  async getActivity(id: string): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || undefined;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [created] = await db.insert(activities).values(activity).returning();
    return created;
  }

  async updateActivity(id: string, data: Partial<InsertActivity>): Promise<Activity | undefined> {
    const [updated] = await db.update(activities).set(data).where(eq(activities.id, id)).returning();
    return updated || undefined;
  }

  async clearActivities(userId?: string): Promise<void> {
    if (userId) {
      await db.delete(activities).where(eq(activities.userId, userId));
    } else {
      await db.delete(activities);
    }
  }

  // Content
  async getContent(userId?: string): Promise<Content[]> {
    if (userId) {
      return db.select().from(content)
        .where(eq(content.userId, userId))
        .orderBy(desc(content.createdAt));
    }
    return db.select().from(content).orderBy(desc(content.createdAt));
  }

  async getContentItem(id: string): Promise<Content | undefined> {
    const [item] = await db.select().from(content).where(eq(content.id, id));
    return item || undefined;
  }

  async createContent(item: InsertContent): Promise<Content> {
    const [created] = await db.insert(content).values(item).returning();
    return created;
  }

  async updateContent(id: string, data: Partial<InsertContent>): Promise<Content | undefined> {
    const [updated] = await db.update(content).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(content.id, id)).returning();
    return updated || undefined;
  }

  async deleteContent(id: string): Promise<boolean> {
    const result = await db.delete(content).where(eq(content.id, id)).returning();
    return result.length > 0;
  }

  async clearContent(userId?: string): Promise<void> {
    if (userId) {
      await db.delete(content).where(eq(content.userId, userId));
    } else {
      await db.delete(content);
    }
  }

  // Style Settings
  async getStyleSettings(userId?: string): Promise<StyleSettings | undefined> {
    if (userId) {
      const [settings] = await db.select().from(styleSettings)
        .where(eq(styleSettings.userId, userId))
        .limit(1);
      return settings || undefined;
    }
    const [settings] = await db.select().from(styleSettings).limit(1);
    return settings || undefined;
  }

  async createOrUpdateStyleSettings(settings: InsertStyleSettings): Promise<StyleSettings> {
    const existing = await this.getStyleSettings(settings.userId ?? undefined);
    if (existing) {
      const [updated] = await db.update(styleSettings)
        .set(settings)
        .where(eq(styleSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(styleSettings).values(settings).returning();
    return created;
  }

  // Watched Topics
  async getWatchedTopics(userId?: string): Promise<WatchedTopic[]> {
    if (userId) {
      return db.select().from(watchedTopics)
        .where(eq(watchedTopics.userId, userId))
        .orderBy(desc(watchedTopics.createdAt));
    }
    return db.select().from(watchedTopics).orderBy(desc(watchedTopics.createdAt));
  }

  async createWatchedTopic(topic: InsertWatchedTopic): Promise<WatchedTopic> {
    const [created] = await db.insert(watchedTopics).values(topic).returning();
    return created;
  }

  async deleteWatchedTopic(id: string): Promise<boolean> {
    const result = await db.delete(watchedTopics).where(eq(watchedTopics.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
