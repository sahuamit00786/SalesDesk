---
date: 2026-07-12
title: Campaign Detail Toolbar — Single Row Layout
---

# Campaign Detail Toolbar Single-Row Layout

## Problem
Action buttons on campaign detail page wrap to multiple rows, reducing scanability and visual consistency.

## Solution
Force all toolbar buttons into a single horizontal row with horizontal scroll if content exceeds viewport.

## Changes
**File:** `client/src/pages/CampaignDetailPage.jsx`

**Line 570:** Button container className
- **Before:** `className="mt-3 flex flex-wrap gap-2"`
- **After:** `className="mt-3 flex gap-2 overflow-x-auto"`

## Scope
- Desktop only (no mobile adjustments)
- Affects 7 buttons: Add leads, Add members, Distribute unassigned, Edit stages, Export leads, Export payments, View report
- No button styling or behavior changes

## Testing
- Verify all buttons appear in single row
- Check overflow-x-auto works on narrow viewports
- Confirm button spacing and styling unchanged
