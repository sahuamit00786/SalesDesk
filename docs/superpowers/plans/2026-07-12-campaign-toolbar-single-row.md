# Campaign Toolbar Single-Row Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Force campaign detail action buttons into a single horizontal row instead of wrapping to multiple lines.

**Architecture:** Change the button container's Tailwind classes from `flex flex-wrap` to `flex flex-nowrap` with horizontal scroll on overflow. No component restructuring or behavioral changes.

**Tech Stack:** React, Tailwind CSS, Lucide icons

## Global Constraints

- Desktop view only (no mobile-specific adjustments)
- Existing button styling and functionality unchanged
- File: `client/src/pages/CampaignDetailPage.jsx` line 570

---

### Task 1: Update button container to single-row layout

**Files:**
- Modify: `client/src/pages/CampaignDetailPage.jsx:570`

**Interfaces:**
- Consumes: existing Button component props
- Produces: horizontally-scrollable button row (no API changes)

- [ ] **Step 1: Edit the className on the button container**

Open `client/src/pages/CampaignDetailPage.jsx` and locate line 570:

```jsx
<div className="mt-3 flex flex-wrap gap-2">
```

Change to:

```jsx
<div className="mt-3 flex gap-2 overflow-x-auto">
```

(Remove `flex-wrap`, add `overflow-x-auto`)

- [ ] **Step 2: Start dev server and view the page**

Run: `npm run dev:client`

Navigate to any campaign detail page (e.g., `http://localhost:5173/campaigns/<any-id>`)

- [ ] **Step 3: Verify buttons are in single row**

- All 7 buttons visible in one horizontal line: Add leads, Add members, Distribute unassigned, Edit stages, Export leads, Export payments, View report
- No wrapping to second row
- Buttons remain properly styled and clickable
- Horizontal scroll appears if viewport is narrow

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/CampaignDetailPage.jsx
git commit -m "fix(campaigns): force toolbar buttons into single row"
```
