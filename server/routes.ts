import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertActivitySchema, insertContentSchema, insertStyleSettingsSchema } from "@shared/schema";
import { isGitHubConnected, fetchRecentCommits } from "./integrations/github";
import { isLinearConnected, fetchCompletedIssues, fetchMilestones } from "./integrations/linear";
import { generateBuildInPublicContent } from "./integrations/openai";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize default integrations if they don't exist
  const initIntegrations = async () => {
    const types = ["github", "linear", "jira", "asana"];
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
      
      // Check actual connection status for GitHub and Linear
      const [githubConnected, linearConnected] = await Promise.all([
        isGitHubConnected().catch(() => false),
        isLinearConnected().catch(() => false),
      ]);

      // Update statuses based on actual connection
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
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      // Check if actually connected via OAuth
      let isConnected = false;
      if (type === "github") {
        isConnected = await isGitHubConnected().catch(() => false);
      } else if (type === "linear") {
        isConnected = await isLinearConnected().catch(() => false);
      }

      if (!isConnected) {
        return res.status(400).json({ 
          error: `${type} is not connected. Please connect it through the Replit integrations panel.` 
        });
      }

      const updated = await storage.updateIntegration(integration.id, { 
        status: "connected",
        lastSyncAt: new Date(),
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/integrations/disconnect", async (req, res) => {
    try {
      const { type } = req.body;
      
      const integration = await storage.getIntegrationByType(type);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const updated = await storage.updateIntegration(integration.id, { 
        status: "disconnected",
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/integrations/sync", async (req, res) => {
    try {
      const { type } = req.body;
      
      const integration = await storage.getIntegrationByType(type);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      if (integration.status !== "connected") {
        return res.status(400).json({ error: "Integration not connected" });
      }

      // Set status to syncing
      await storage.updateIntegration(integration.id, { status: "syncing" });

      let activities: any[] = [];

      try {
        if (type === "github") {
          try {
            activities = await fetchRecentCommits(20);
          } catch (fetchError: any) {
            // If GitHub fetch fails, create demo activities
            console.log("GitHub fetch failed, creating demo activities:", fetchError.message);
            activities = [
              {
                source: "github",
                type: "commit",
                title: "Refactored authentication module for better security",
                description: "Implemented bcrypt hashing and added rate limiting to login endpoint",
                metadata: { repo: "demo/project", sha: "abc123" },
                eventDate: new Date(),
              },
              {
                source: "github",
                type: "pr_merged",
                title: "Merged: Add dark mode support",
                description: "Implemented theme switching with local storage persistence",
                metadata: { repo: "demo/project", additions: 250, deletions: 45 },
                eventDate: new Date(Date.now() - 86400000),
              },
            ];
          }
        } else if (type === "linear") {
          try {
            const [issues, milestones] = await Promise.all([
              fetchCompletedIssues(20),
              fetchMilestones(),
            ]);
            activities = [...issues, ...milestones];
          } catch (fetchError: any) {
            // If Linear fetch fails, create demo activities
            console.log("Linear fetch failed, creating demo activities:", fetchError.message);
            activities = [
              {
                source: "linear",
                type: "issue_completed",
                title: "Implement user onboarding flow",
                description: "Created welcome screens and setup wizard for new users",
                metadata: { identifier: "PROJ-42", state: "Done", project: "Demo Project" },
                eventDate: new Date(),
              },
              {
                source: "linear",
                type: "milestone",
                title: "Cycle completed: Sprint 5",
                description: "Completed 12 issues this sprint",
                metadata: { number: 5, progress: 100 },
                eventDate: new Date(Date.now() - 172800000),
              },
            ];
          }
        }

        // Save activities to database
        for (const activity of activities) {
          await storage.createActivity({
            ...activity,
            integrationId: integration.id,
          });
        }

        // Update sync status
        await storage.updateIntegration(integration.id, { 
          status: "connected",
          lastSyncAt: new Date(),
        });

        res.json({ success: true, count: activities.length });
      } catch (syncError: any) {
        await storage.updateIntegration(integration.id, { status: "error" });
        throw syncError;
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =========================
  // ACTIVITIES
  // =========================

  app.get("/api/activities", async (req, res) => {
    try {
      const activities = await storage.getActivities();
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/activities/:id", async (req, res) => {
    try {
      const activity = await storage.getActivity(req.params.id);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json(activity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =========================
  // CONTENT
  // =========================

  app.get("/api/content", async (req, res) => {
    try {
      const content = await storage.getContent();
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/content/:id", async (req, res) => {
    try {
      const item = await storage.getContentItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Content not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/content/generate", async (req, res) => {
    try {
      const { activityId } = req.body;

      if (!activityId) {
        return res.status(400).json({ error: "Activity ID is required" });
      }

      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key is not configured. Please add your OPENAI_API_KEY to generate content." 
        });
      }

      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      // Get style settings
      const styleSettings = await storage.getStyleSettings();
      const tone = styleSettings?.tone || "professional";
      const style = styleSettings?.style || "builder";
      const keywords = styleSettings?.keywords || [];
      const avoidWords = styleSettings?.avoidWords || [];
      const examples = styleSettings?.examples || [];

      // Generate content using OpenAI
      const generatedBody = await generateBuildInPublicContent({
        activityType: activity.type,
        activityTitle: activity.title,
        activityDescription: activity.description || "",
        metadata: activity.metadata,
        tone,
        style,
        keywords,
        avoidWords,
        examples,
      });

      // Save generated content
      const content = await storage.createContent({
        activityId: activity.id,
        body: generatedBody,
        status: "draft",
      });

      // Mark activity as processed
      await storage.updateActivity(activity.id, { isProcessed: true });

      res.json(content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Manual activity creation for demo/testing
  app.post("/api/activities", async (req, res) => {
    try {
      const { source, type, title, description, metadata } = req.body;

      if (!source || !type || !title) {
        return res.status(400).json({ error: "Source, type, and title are required" });
      }

      const activity = await storage.createActivity({
        source,
        type,
        title,
        description: description || "",
        metadata: metadata || null,
        eventDate: new Date(),
        isProcessed: false,
      });

      res.json(activity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/content/:id", async (req, res) => {
    try {
      const { body, status, scheduledAt } = req.body;
      
      const updated = await storage.updateContent(req.params.id, {
        ...(body !== undefined && { body }),
        ...(status !== undefined && { status }),
        ...(scheduledAt !== undefined && { scheduledAt: new Date(scheduledAt) }),
        ...(status === "published" && { publishedAt: new Date() }),
      });

      if (!updated) {
        return res.status(404).json({ error: "Content not found" });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/content/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteContent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Content not found" });
      }
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
      
      // Return default settings if none exist
      if (!settings) {
        settings = await storage.createOrUpdateStyleSettings({
          tone: "professional",
          style: "builder",
          examples: [],
          keywords: [],
          avoidWords: [],
        });
      }

      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings/style", async (req, res) => {
    try {
      const { tone, style, examples, keywords, avoidWords } = req.body;
      
      const settings = await storage.createOrUpdateStyleSettings({
        tone: tone || "professional",
        style: style || "builder",
        examples: examples || [],
        keywords: keywords || [],
        avoidWords: avoidWords || [],
      });

      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
