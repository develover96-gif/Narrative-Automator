# LinkedQueue - Automated Building in Public Content

## Overview
LinkedQueue is a MicroSaaS web application that automates "Building in Public" content creation for LinkedIn by connecting to developer tools (GitHub, Linear, Stripe) and automatically converting daily work activities (commits, completed tickets, revenue milestones) into engaging LinkedIn posts — without requiring manual content creation from technical founders.

## Current State
The MVP is complete with:
- Dashboard with activity stats, content queue overview, and onboarding empty state
- Integration hub for GitHub and Linear (with Stripe/Jira/Asana coming soon)
- Activity feed showing all captured events with filtering
- Content queue management with draft/edit/approve/archive workflow
- AI-powered content generation using OpenAI GPT-5 via `POST /api/activities/:id/generate`
- Analytics page with engagement metrics, pipeline visualization, and top posts
- Trending Topics page for monitoring keywords, influencers, and competitors
- Style customization settings with card-based UI for tone, style, and format
- LinkedIn post preview in content editor
- Demo data seeding via `/api/seed`
- Dark/light theme support
- Responsive layout

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT-5 for content generation
- **Integrations**: GitHub (Octokit), Linear SDK

## Project Architecture

### Frontend (`client/src/`)
- `pages/` - Main views (Dashboard, Integrations, Activities, Content, Analytics, Topics, Settings)
- `components/` - Reusable components including app-sidebar, theme-toggle
- `lib/` - Utilities (queryClient, theme-provider)
- `hooks/` - Custom hooks

### Backend (`server/`)
- `routes.ts` - API endpoints
- `storage.ts` - Database storage layer
- `db.ts` - Database connection
- `integrations/` - GitHub, Linear, and OpenAI clients

### Shared (`shared/`)
- `schema.ts` - Drizzle schemas for integrations, activities, content, styleSettings, watchedTopics

## API Endpoints

### Integrations
- `GET /api/integrations` - List all integrations with status
- `POST /api/integrations/connect` - Connect an integration
- `POST /api/integrations/disconnect` - Disconnect an integration
- `POST /api/integrations/sync` - Sync activities from an integration

### Activities
- `GET /api/activities` - List all activities
- `GET /api/activities/:id` - Get single activity
- `POST /api/activities/:id/generate` - Generate LinkedIn content from an activity

### Content
- `GET /api/content` - List all content
- `GET /api/content/:id` - Get single content item
- `PATCH /api/content/:id` - Update content (body, status)
- `DELETE /api/content/:id` - Delete content

### Analytics
- `GET /api/analytics` - Aggregate stats (engagement, pipeline, recent content)

### Topics
- `GET /api/topics` - List watched topics
- `POST /api/topics` - Add a watched topic
- `DELETE /api/topics/:id` - Remove a watched topic

### Settings
- `GET /api/settings/style` - Get style settings
- `POST /api/settings/style` - Update style settings (tone, style, format, examples, keywords, avoidWords)

### Demo
- `POST /api/seed` - Seed realistic demo data

## Design System
- **Primary Color**: Indigo (#6366F1 / 239 84% 67%)
- **Secondary Color**: Emerald (#10B981 / 160 84% 39%)
- **Font**: Inter (UI), Roboto Mono (code)

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key for content generation
- GitHub and Linear connections are managed via Replit integrations

## Running the Project
The project runs with `npm run dev` which starts both the Express backend and Vite frontend.
