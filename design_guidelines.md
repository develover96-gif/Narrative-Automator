# Design Guidelines: Building in Public MicroSaaS

## Design Approach

**Selected Framework**: Reference-based approach inspired by **Buffer's content composer** and **Notion's clean documentation interface**, combined with modern SaaS dashboard patterns from Linear and Stripe.

**Core Principles**: 
- Streamlined content creation workflows with minimal friction
- Clear visual hierarchy emphasizing integration status and content queue
- Clean, spacious layouts that reduce cognitive load for technical founders
- Dashboard-first design optimized for daily content review workflows

---

## Typography System

**Font Stack**:
- **Primary**: Inter (headings, UI elements, body text)
- **Secondary**: SF Pro (alternative for Apple ecosystem optimization)
- **Monospace**: Roboto Mono (code snippets, technical content previews)

**Hierarchy**:
- **Page Titles**: 32px (2xl), font-weight 700
- **Section Headers**: 24px (xl), font-weight 600
- **Card Titles**: 18px (lg), font-weight 600
- **Body Text**: 16px (base), font-weight 400
- **Captions/Meta**: 14px (sm), font-weight 500

---

## Layout & Spacing

**Spacing System**: Use Tailwind units of **4, 6, 8, 12, 16, 20** (e.g., p-4, gap-6, my-8, py-20)
- Component padding: p-6 or p-8
- Section spacing: py-12 or py-20
- Card gaps: gap-6
- Element margins: mb-4, mt-8

**Grid Structure**:
- **Dashboard Layout**: Sidebar navigation (280px) + Main content area
- **Integration Cards**: 3-column grid on desktop (grid-cols-3), 2-column on tablet, single column on mobile
- **Content Queue**: Full-width cards with left metadata column (200px) + content preview
- **Max Container Width**: max-w-7xl for main dashboard, max-w-4xl for content editors

---

## Component Library

### 1. Integration Cards
- Clean card design with subtle border and light background (#F9FAFB)
- Integration logo/icon at top (48px)
- Connection status indicator (connected: emerald dot, disconnected: gray dot)
- "Connect" or "Manage" button based on status
- Last sync timestamp in small text

### 2. Activity Feed
- Timeline-style vertical layout with connecting lines
- Activity type icons on left (GitHub, Linear, Jira, Asana branded)
- Activity description with timestamp
- "Generate Content" action button for each activity
- Expandable detail view showing commit messages or task descriptions

### 3. Content Queue Cards
- Large horizontal cards with three sections:
  - **Left**: Source indicator (GitHub icon, Linear icon) + timestamp
  - **Center**: Generated content preview with editable textarea
  - **Right**: Action buttons (Edit, Approve, Schedule, Delete)
- Draft/Scheduled/Published status badge at top
- Character count indicator
- Preview toggle showing LinkedIn-style rendering

### 4. Content Editor Panel
- Side-by-side layout: Editor (left) + Preview (right)
- Toolbar with formatting options (minimal: bold, italic, lists, links)
- AI regeneration options: "Make more technical", "Add storytelling", "Shorten"
- Style tone selector dropdown
- Schedule date/time picker

### 5. Navigation
- Left sidebar with icon + label navigation items
- Dashboard, Integrations, Content Queue, Published, Analytics, Settings
- User profile dropdown at bottom
- Collapsed mobile navigation with hamburger menu

### 6. Forms & Inputs
- Clean input fields with subtle borders
- Focused state: indigo border (#6366F1)
- Label above input, helper text below
- OAuth connection buttons with service branding
- Toggle switches for settings (style: modern iOS-style)

### 7. Status Indicators
- **Connected**: Emerald green dot + "Connected" text
- **Syncing**: Animated spinner + "Syncing..." text
- **Error**: Red dot + error message
- **Pending**: Yellow dot + "Awaiting approval"

### 8. Buttons
- **Primary**: Indigo background (#6366F1), white text, rounded corners
- **Secondary**: White background, indigo border and text
- **Danger**: Red background for delete actions
- **Ghost**: Transparent with gray text for tertiary actions

---

## Dashboard Layout Structure

### Main Dashboard View
1. **Header**: Page title + "New Content" primary action button
2. **Stats Row**: 4 metric cards (Activities Today, Drafts Pending, Posts Published, Engagement Rate)
3. **Recent Activity Feed**: 5 most recent activities with quick-generate buttons
4. **Content Queue Preview**: 3 pending drafts with inline edit/approve

### Integrations Hub
1. **Connection Status Banner**: Shows X/4 integrations connected
2. **Integration Grid**: 2x2 grid of GitHub, Linear, Jira, Asana cards
3. **Settings Per Integration**: Expandable sections for filtering rules, sync frequency

### Content Queue
1. **Filter Tabs**: All, Drafts, Scheduled, Published
2. **Bulk Actions Bar**: Select all, approve selected, delete selected
3. **Infinite Scroll List**: Content cards with all metadata visible

---

## Visual Treatments

**Card Shadows**: Use subtle shadow (shadow-sm) for cards, shadow-md on hover
**Borders**: 1px solid borders using gray-200, indigo-500 for active states
**Rounded Corners**: rounded-lg (8px) for cards, rounded-md (6px) for buttons
**Animations**: Minimal - fade-in for content loading, smooth transitions on hover (duration-200)

---

## Responsive Breakpoints

- **Mobile**: < 768px - Single column, stacked layout, hamburger nav
- **Tablet**: 768px - 1024px - 2-column grids, visible sidebar
- **Desktop**: > 1024px - Full 3-column grids, expanded sidebar with labels

---

## Images

**Dashboard Hero (Optional)**: Small illustration (300x200px) on empty state showing workflow visualization (GitHub → AI → LinkedIn). Use only when no content exists.

**Integration Logos**: Use official brand logos for GitHub, Linear, Jira, Asana (40x40px) in integration cards.

**Empty States**: Simple SVG illustrations for "No activities yet", "No drafts", "Connect your first integration" (200x200px centered).