import { 
  users, 
  integrations, 
  activities, 
  content, 
  styleSettings,
  type User, 
  type InsertUser,
  type Integration,
  type InsertIntegration,
  type Activity,
  type InsertActivity,
  type Content,
  type InsertContent,
  type StyleSettings,
  type InsertStyleSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Integrations
  getIntegrations(): Promise<Integration[]>;
  getIntegration(id: string): Promise<Integration | undefined>;
  getIntegrationByType(type: string): Promise<Integration | undefined>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: string, data: Partial<InsertIntegration>): Promise<Integration | undefined>;

  // Activities
  getActivities(): Promise<Activity[]>;
  getActivity(id: string): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: string, data: Partial<InsertActivity>): Promise<Activity | undefined>;

  // Content
  getContent(): Promise<Content[]>;
  getContentItem(id: string): Promise<Content | undefined>;
  createContent(item: InsertContent): Promise<Content>;
  updateContent(id: string, data: Partial<InsertContent>): Promise<Content | undefined>;
  deleteContent(id: string): Promise<boolean>;

  // Style Settings
  getStyleSettings(): Promise<StyleSettings | undefined>;
  createOrUpdateStyleSettings(settings: InsertStyleSettings): Promise<StyleSettings>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Integrations
  async getIntegrations(): Promise<Integration[]> {
    return db.select().from(integrations);
  }

  async getIntegration(id: string): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations).where(eq(integrations.id, id));
    return integration || undefined;
  }

  async getIntegrationByType(type: string): Promise<Integration | undefined> {
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
  async getActivities(): Promise<Activity[]> {
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

  // Content
  async getContent(): Promise<Content[]> {
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

  // Style Settings
  async getStyleSettings(): Promise<StyleSettings | undefined> {
    const [settings] = await db.select().from(styleSettings).limit(1);
    return settings || undefined;
  }

  async createOrUpdateStyleSettings(settings: InsertStyleSettings): Promise<StyleSettings> {
    const existing = await this.getStyleSettings();
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
}

export const storage = new DatabaseStorage();
