# BuildPublic - Automated Building in Public Content

## Overview
BuildPublic is a MicroSaaS web application that automates "Building in Public" content creation by connecting to GitHub and Linear to automatically research daily activities and generate engaging marketing narratives without manual input.

## Current State
The MVP is complete with:
- Dashboard with activity stats and content queue overview
- Integration hub for GitHub and Linear (with Jira/Asana coming soon)
- Activity feed showing all captured events with filtering
- Content queue management with draft/edit/approve workflow
- AI-powered content generation using OpenAI GPT-5
- Style customization settings for tone and writing style
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
- `pages/` - Main views (Dashboard, Integrations, Activities, Content, Settings)
- `components/` - Reusable components including app-sidebar, theme-toggle
- `lib/` - Utilities (queryClient, theme-provider)
- `hooks/` - Custom hooks

### Backend (`server/`)
- `routes.ts` - API endpoints
- `storage.ts` - Database storage layer
- `db.ts` - Database connection
- `integrations/` - GitHub, Linear, and OpenAI clients

### Shared (`shared/`)
- `schema.ts` - Drizzle schemas for users, integrations, activities, content, styleSettings

## API Endpoints

### Integrations
- `GET /api/integrations` - List all integrations with status
- `POST /api/integrations/connect` - Connect an integration
- `POST /api/integrations/disconnect` - Disconnect an integration
- `POST /api/integrations/sync` - Sync activities from an integration

### Activities
- `GET /api/activities` - List all activities
- `GET /api/activities/:id` - Get single activity

### Content
- `GET /api/content` - List all content
- `GET /api/content/:id` - Get single content item
- `POST /api/content/generate` - Generate content from an activity
- `PATCH /api/content/:id` - Update content
- `DELETE /api/content/:id` - Delete content

### Settings
- `GET /api/settings/style` - Get style settings
- `POST /api/settings/style` - Update style settings

## Design System
- **Primary Color**: Indigo (#6366F1 / 239 84% 67%)
- **Secondary Color**: Emerald (#10B981 / 160 84% 39%)
- **Font**: Inter (UI), Roboto Mono (code)
- **Spacing**: 4, 6, 8, 12, 16, 20 units

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key for content generation
- GitHub and Linear connections are managed via Replit integrations

## Running the Project
The project runs with `npm run dev` which starts both the Express backend and Vite frontend.
