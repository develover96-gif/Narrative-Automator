import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertActivitySchema, insertContentSchema, insertStyleSettingsSchema, insertWatchedTopicSchema } from "@shared/schema";
import { isGitHubConnected, fetchRecentCommits } from "./integrations/github";
import { isLinearConnected, fetchCompletedIssues, fetchMilestones } from "./integrations/linear";
import { generateBuildInPublicContent } from "./integrations/openai";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const initIntegrations = async () => {
    const types = ["github", "linear", "jira", "asana", "stripe"];
    for (const type of types) {
      const existing = await storage.getIntegrationByType(type);
      if (!existing) {
        await storage.createIntegration({ type, status: "disconnected" });
      }
    }
  };
  await initIntegrations();

  // =========================
  // INTEGRATIONS
  // =========================

  app.get("/api/integrations", async (req, res) => {
    try {
      const integrations = await storage.getIntegrations();
      const [githubConnected, linearConnected] = await Promise.all([
        isGitHubConnected().catch(() => false),
        isLinearConnected().catch(() => false),
      ]);

      const updated = await Promise.all(integrations.map(async (integration) => {
        if (integration.type === "github" && githubConnected && integration.status !== "connected") {
          return storage.updateIntegration(integration.id, { status: "connected" });
        }
        if (integration.type === "linear" && linearConnected && integration.status !== "connected") {
          return storage.updateIntegration(integration.id, { status: "connected" });
        }
        if (integration.type === "github" && !githubConnected && integration.status === "connected") {
          return storage.updateIntegration(integration.id, { status: "disconnected" });
        }
        if (integration.type === "linear" && !linearConnected && integration.status === "connected") {
          return storage.updateIntegration(integration.id, { status: "disconnected" });
        }
        return integration;
      }));

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/integrations/connect", async (req, res) => {
    try {
      const { type } = req.body;
      if (!["github", "linear"].includes(type)) {
        return res.status(400).json({ error: "Integration type not supported for connection" });
      }
      const integration = await storage.getIntegrationByType(type);
      if (!integration) return res.status(404).json({ error: "Integration not found" });

      let isConnected = false;
      if (type === "github") isConnected = await isGitHubConnected().catch(() => false);
      else if (type === "linear") isConnected = await isLinearConnected().catch(() => false);

      if (!isConnected) {
        return res.status(400).json({ error: `${type} is not connected. Please connect it through the Replit integrations panel.` });
      }

      const updated = await storage.updateIntegration(integration.id, { status: "connected", lastSyncAt: new Date() });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/integrations/disconnect", async (req, res) => {
    try {
      const { type } = req.body;
      const integration = await storage.getIntegrationByType(type);
      if (!integration) return res.status(404).json({ error: "Integration not found" });
      const updated = await storage.updateIntegration(integration.id, { status: "disconnected" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/integrations/sync", async (req, res) => {
    try {
      const { type } = req.body;
      const integration = await storage.getIntegrationByType(type);
      if (!integration) return res.status(404).json({ error: "Integration not found" });

      await storage.updateIntegration(integration.id, { status: "syncing" });

      let newActivities: any[] = [];

      if (type === "github") {
        newActivities = await fetchRecentCommits(20).catch(() => []);
      } else if (type === "linear") {
        const [issues, milestones] = await Promise.all([
          fetchCompletedIssues(20).catch(() => []),
          fetchMilestones().catch(() => []),
        ]);
        newActivities = [...issues, ...milestones];
      }

      const created = await Promise.all(
        newActivities.map(a => storage.createActivity({ ...a, integrationId: integration.id }))
      );

      await storage.updateIntegration(integration.id, { status: "connected", lastSyncAt: new Date() });
      res.json({ success: true, activitiesCreated: created.length, message: `Synced ${created.length} activities from ${type}` });
    } catch (error: any) {
      const integration = await storage.getIntegrationByType(req.body.type).catch(() => null);
      if (integration) await storage.updateIntegration(integration.id, { status: "error" });
      res.status(500).json({ error: error.message });
    }
  });

  // =========================
  // ACTIVITIES
  // =========================

  app.get("/api/activities", async (req, res) => {
    try {
      const allActivities = await storage.getActivities();
      res.json(allActivities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/activities/:id", async (req, res) => {
    try {
      const activity = await storage.getActivity(req.params.id);
      if (!activity) return res.status(404).json({ error: "Activity not found" });
      res.json(activity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      const { source, type, title, description, metadata } = req.body;
      if (!source || !type || !title) return res.status(400).json({ error: "Source, type, and title are required" });
      const activity = await storage.createActivity({ source, type, title, description: description || "", metadata: metadata || null, eventDate: new Date(), isProcessed: false });
      res.json(activity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/activities/:id/generate", async (req, res) => {
    try {
      const { id } = req.params;
      const activity = await storage.getActivity(id);
      if (!activity) return res.status(404).json({ error: "Activity not found" });

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ error: "OpenAI API key is not configured. Please add OPENAI_API_KEY to generate AI content." });
      }

      const styleConfig = await storage.getStyleSettings();
      const generatedBody = await generateBuildInPublicContent({
        activityType: activity.type,
        activityTitle: activity.title,
        activityDescription: activity.description || "",
        metadata: activity.metadata,
        tone: styleConfig?.tone || "professional",
        style: styleConfig?.style || "builder",
        keywords: styleConfig?.keywords || [],
        avoidWords: styleConfig?.avoidWords || [],
        examples: styleConfig?.examples || [],
      });

      const newContent = await storage.createContent({
        activityId: id,
        body: generatedBody,
        contentType: styleConfig?.format || "post",
        status: "draft",
      });

      await storage.updateActivity(id, { isProcessed: true });
      res.json(newContent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Legacy generate endpoint
  app.post("/api/content/generate", async (req, res) => {
    try {
      const { activityId } = req.body;
      if (!activityId) return res.status(400).json({ error: "Activity ID is required" });
      if (!process.env.OPENAI_API_KEY) return res.status(400).json({ error: "OpenAI API key is not configured." });

      const activity = await storage.getActivity(activityId);
      if (!activity) return res.status(404).json({ error: "Activity not found" });

      const styleSettings = await storage.getStyleSettings();
      const generatedBody = await generateBuildInPublicContent({
        activityType: activity.type,
        activityTitle: activity.title,
        activityDescription: activity.description || "",
        metadata: activity.metadata,
        tone: styleSettings?.tone || "professional",
        style: styleSettings?.style || "builder",
        keywords: styleSettings?.keywords || [],
        avoidWords: styleSettings?.avoidWords || [],
        examples: styleSettings?.examples || [],
      });

      const newContent = await storage.createContent({ activityId: activity.id, body: generatedBody, contentType: "post", status: "draft" });
      await storage.updateActivity(activity.id, { isProcessed: true });
      res.json(newContent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =========================
  // CONTENT
  // =========================

  app.get("/api/content", async (req, res) => {
    try {
      const allContent = await storage.getContent();
      res.json(allContent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/content/:id", async (req, res) => {
    try {
      const item = await storage.getContentItem(req.params.id);
      if (!item) return res.status(404).json({ error: "Content not found" });
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/content", async (req, res) => {
    try {
      const data = insertContentSchema.parse(req.body);
      const newContent = await storage.createContent(data);
      res.json(newContent);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/content/:id", async (req, res) => {
    try {
      const { body, status, scheduledAt, title, contentType, engagementMetrics } = req.body;
      const updated = await storage.updateContent(req.params.id, {
        ...(body !== undefined && { body }),
        ...(title !== undefined && { title }),
        ...(contentType !== undefined && { contentType }),
        ...(status !== undefined && { status }),
        ...(scheduledAt !== undefined && { scheduledAt: new Date(scheduledAt) }),
        ...(status === "published" && { publishedAt: new Date() }),
        ...(engagementMetrics !== undefined && { engagementMetrics }),
      });
      if (!updated) return res.status(404).json({ error: "Content not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/content/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteContent(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Content not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =========================
  // STYLE SETTINGS
  // =========================

  app.get("/api/settings/style", async (req, res) => {
    try {
      let settings = await storage.getStyleSettings();
      if (!settings) {
        settings = await storage.createOrUpdateStyleSettings({ tone: "professional", style: "builder", format: "post", examples: [], keywords: [], avoidWords: [] });
      }
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings/style", async (req, res) => {
    try {
      const { tone, style, format, examples, keywords, avoidWords } = req.body;
      const settings = await storage.createOrUpdateStyleSettings({
        tone: tone || "professional",
        style: style || "builder",
        format: format || "post",
        examples: examples || [],
        keywords: keywords || [],
        avoidWords: avoidWords || [],
      });
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =========================
  // WATCHED TOPICS
  // =========================

  app.get("/api/topics", async (req, res) => {
    try {
      const topics = await storage.getWatchedTopics();
      res.json(topics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/topics", async (req, res) => {
    try {
      const data = insertWatchedTopicSchema.parse(req.body);
      const topic = await storage.createWatchedTopic(data);
      res.json(topic);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/topics/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteWatchedTopic(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Topic not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =========================
  // ANALYTICS
  // =========================

  app.get("/api/analytics", async (req, res) => {
    try {
      const [allContent, allActivities] = await Promise.all([
        storage.getContent(),
        storage.getActivities(),
      ]);

      const published = allContent.filter(c => c.status === "published");
      const drafts = allContent.filter(c => c.status === "draft");
      const scheduled = allContent.filter(c => c.status === "scheduled");

      const totalViews = published.reduce((sum, c) => sum + ((c.engagementMetrics as any)?.views || 0), 0);
      const totalLikes = published.reduce((sum, c) => sum + ((c.engagementMetrics as any)?.likes || 0), 0);
      const totalComments = published.reduce((sum, c) => sum + ((c.engagementMetrics as any)?.comments || 0), 0);
      const totalShares = published.reduce((sum, c) => sum + ((c.engagementMetrics as any)?.shares || 0), 0);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyPosts = published.filter(c => c.publishedAt && new Date(c.publishedAt) >= weekAgo).length;

      const topPosts = published
        .sort((a, b) => {
          const aTotal = ((a.engagementMetrics as any)?.likes || 0) + ((a.engagementMetrics as any)?.comments || 0);
          const bTotal = ((b.engagementMetrics as any)?.likes || 0) + ((b.engagementMetrics as any)?.comments || 0);
          return bTotal - aTotal;
        })
        .slice(0, 3);

      res.json({
        totalPublished: published.length,
        totalDrafts: drafts.length,
        totalScheduled: scheduled.length,
        totalActivities: allActivities.length,
        processedActivities: allActivities.filter(a => a.isProcessed).length,
        weeklyPosts,
        engagement: {
          totalViews,
          totalLikes,
          totalComments,
          totalShares,
          avgEngagementRate: totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(1) : "0",
        },
        topPosts,
        recentContent: allContent.slice(0, 5),
        recentActivities: allActivities.slice(0, 5),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =========================
  // SEED DEMO DATA
  // =========================

  app.post("/api/seed", async (req, res) => {
    try {
      await storage.clearActivities();
      await storage.clearContent();

      const now = new Date();
      const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

      const demoActivities = [
        {
          source: "github", type: "commit",
          title: "Refactor database query optimization for 10x faster load times",
          description: "Replaced N+1 queries with batch fetching. Reduced average page load from 2.4s to 240ms across all dashboard views.",
          metadata: { repo: "my-saas", sha: "a1b2c3d", branch: "main" },
          eventDate: daysAgo(0), isProcessed: false,
        },
        {
          source: "github", type: "pr_merged",
          title: "Ship dark mode support across entire application",
          description: "Added full dark mode using CSS variables and theme provider. 847 users requested this feature.",
          metadata: { repo: "my-saas", pr: 142, branch: "feature/dark-mode" },
          eventDate: daysAgo(1), isProcessed: false,
        },
        {
          source: "linear", type: "issue_completed",
          title: "Complete onboarding flow redesign",
          description: "New 3-step onboarding reduces time-to-value from 12 minutes to under 3 minutes. A/B test showing 34% better activation.",
          metadata: { identifier: "ENG-234", team: "Product", project: "Growth Q1" },
          eventDate: daysAgo(2), isProcessed: false,
        },
        {
          source: "github", type: "commit",
          title: "Rewrite authentication system to use JWT + refresh tokens",
          description: "Fixed critical session handling bug. Upgraded from cookie-only auth to a proper JWT implementation with token refresh.",
          metadata: { repo: "my-saas", sha: "d4e5f6g", branch: "feature/auth-rewrite" },
          eventDate: daysAgo(3), isProcessed: false,
        },
        {
          source: "linear", type: "milestone",
          title: "Q1 Sprint 3 completed — 12 features shipped",
          description: "Closed 12 tickets, shipped 4 major features, resolved 18 bugs. Team velocity up 23% from last sprint.",
          metadata: { cycle: "Sprint 3", completedIssues: 12, team: "Engineering" },
          eventDate: daysAgo(5), isProcessed: true,
        },
        {
          source: "stripe", type: "revenue_milestone",
          title: "Reached $5,000 MRR milestone",
          description: "Hit $5K MRR after 4 months. Growth driven by word-of-mouth from developer community.",
          metadata: { mrr: 5000, currency: "USD", customers: 67 },
          eventDate: daysAgo(7), isProcessed: true,
        },
        {
          source: "github", type: "commit",
          title: "Add real-time collaboration with WebSockets",
          description: "Implemented live cursor tracking and simultaneous editing. Latency under 50ms using optimistic updates.",
          metadata: { repo: "my-saas", sha: "g7h8i9j", branch: "feature/realtime" },
          eventDate: daysAgo(8), isProcessed: true,
        },
        {
          source: "linear", type: "issue_completed",
          title: "Launch mobile-responsive redesign",
          description: "Complete UI overhaul for mobile users. Mobile sessions now convert at 2.1x higher rate.",
          metadata: { identifier: "DESIGN-89", team: "Design", project: "Mobile First" },
          eventDate: daysAgo(10), isProcessed: true,
        },
      ];

      const createdActivities = await Promise.all(demoActivities.map(a => storage.createActivity(a)));

      const demoPosts = [
        {
          activityId: createdActivities[4].id,
          title: "From 0 to Sprint 3: What shipping 12 features in a month actually looks like",
          body: `Three months into building my SaaS in public, and Sprint 3 just wrapped.\n\n12 features shipped. 18 bugs squashed. Team velocity up 23%.\n\nBut here's what the numbers don't show:\n\nWeek 1 was chaos. We had 22 tickets and no clear priority. I made the call to cut half of them and ship the other half properly. That decision saved us.\n\nWeek 2 we hit our first real scaling wall. A query that worked fine at 100 users fell apart at 2,000. We spent 3 days on it. Worth every hour.\n\nWeek 3 was flow state. When the foundation is solid, features just happen.\n\nWeek 4 we shipped the onboarding redesign. Time-to-value dropped from 12 minutes to under 3. Activation rate up 34%.\n\nThe lesson from Sprint 3: Ruthless prioritization beats ambitious planning every time.\n\nWhat's your biggest sprint lesson?`,
          contentType: "post", status: "published", publishedAt: daysAgo(4),
          engagementMetrics: { views: 8420, likes: 312, comments: 47, shares: 28 },
        },
        {
          activityId: createdActivities[5].id,
          title: "Zero to $5K MRR: The honest breakdown",
          body: `Hit $5,000 MRR today. 4 months in.\n\nNo VC money. No Product Hunt launch. No viral tweet.\n\nJust word-of-mouth from developers who kept telling other developers.\n\nMonth 1: $0 → $200. Built in public obsessively. 3 paying customers who found me through LinkedIn.\n\nMonth 2: $200 → $800. Doubled down on the content. 9 more customers. All inbound.\n\nMonth 3: $800 → $2,400. One post went semi-viral. 2,200 impressions. 31 new trial signups. 18 converted.\n\nMonth 4: $2,400 → $5,000. Referrals started compounding.\n\nThe pattern: content → trust → referrals → compounding.\n\nNot glamorous. But it works.\n\nWhat's your current MRR if you're building?`,
          contentType: "post", status: "published", publishedAt: daysAgo(6),
          engagementMetrics: { views: 14200, likes: 891, comments: 134, shares: 67 },
        },
        {
          activityId: createdActivities[6].id,
          title: "Why we rebuilt real-time from scratch (and what we learned)",
          body: `We shipped real-time collaboration this week.\n\n50ms latency. Optimistic updates. Live cursor tracking.\n\nIt took 6 weeks and 3 failed attempts.\n\nHere's what we learned the hard way:\n\nAttempt 1: Polling. Simple, but 800ms delays killed the collaborative feel.\n\nAttempt 2: Server-Sent Events. Better. But one-way. Couldn't handle conflict resolution.\n\nAttempt 3: WebSockets with naive conflict resolution. Worked until two users edited simultaneously.\n\nFinal approach: Operational Transformation (OT) with WebSockets + Redis pub/sub.\n\nThe thing nobody tells you about real-time: It's not the WebSocket that's hard. It's the conflict resolution. Budget 80% of your time for the 20% edge cases.\n\nWould you use real-time collaboration in your workflow?`,
          contentType: "post", status: "published", publishedAt: daysAgo(7),
          engagementMetrics: { views: 6100, likes: 198, comments: 29, shares: 15 },
        },
        {
          activityId: createdActivities[2].id,
          title: "34% better activation from one UI change",
          body: `We spent 3 weeks redesigning onboarding.\n\nResult: Time-to-value dropped from 12 minutes to under 3. Activation rate up 34%.\n\nHere's what actually changed:\n\nOld onboarding: 8 steps, asked for everything upfront. Users bailed at step 4.\n\nNew onboarding: 3 steps. Connect one tool. See one result. That's it.\n\nThe insight that changed everything: Users don't want to set up your product. They want to see value.\n\nWe moved all configuration to "after first win." Once a user sees their first generated post, they're happy to spend 10 minutes on settings.\n\nLesson: Optimize for the first "wow" moment, not completeness.\n\nWhat's your biggest activation bottleneck right now?`,
          contentType: "post", status: "scheduled",
          scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        },
        {
          activityId: createdActivities[1].id,
          title: "847 users asked for dark mode. Here's what shipping it taught us.",
          body: `847 users requested dark mode. So we built it.\n\nThen we almost shipped it wrong.\n\nThe naive approach: Add a dark class, invert colors, ship it. Done in a day.\n\nThe problem: Our data visualizations broke. Charts designed for white backgrounds looked terrible inverted.\n\nThe right approach: CSS custom properties (variables) for every color. A theme provider that switches the variables.\n\nIt took 3x longer. It was 10x better.\n\nNow adding a new theme takes 20 minutes, not 3 days.\n\nThe meta lesson: Technical debt in styling compounds faster than anywhere else. The right abstraction now saves you from a refactor later.\n\nAre you using CSS variables in your project?`,
          contentType: "post", status: "draft",
        },
        {
          activityId: createdActivities[3].id,
          title: "We rewrote auth. Here's why it was worth it.",
          body: `Auth rewrites are supposed to be scary.\n\nOurs took 4 days and made everything better.\n\nThe catalyst: A user reported they kept getting logged out randomly. I looked at the code and was embarrassed. Cookie-only sessions. No refresh tokens. Zero security best practices.\n\nThe fix:\n— JWT access tokens (15 min expiry)\n— Refresh tokens (30 days, rotating)\n— Secure httpOnly cookies for the refresh token\n— Automatic silent refresh in the client\n\nThe result: Zero reported logout issues since shipping. Login success rate up from 94.1% to 99.7%.\n\nThe lesson I keep relearning: Ship it clean or fix it publicly. There is no in-between.\n\nWhat auth approach are you using?`,
          contentType: "post", status: "draft",
        },
      ];

      await Promise.all(demoPosts.map(p => storage.createContent(p as any)));

      res.json({
        success: true,
        activitiesCreated: createdActivities.length,
        contentCreated: demoPosts.length,
        message: "Demo data loaded successfully",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
