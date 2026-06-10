# UI Conventions — Purple CRM

## Page layout (all authenticated CRM list pages)

Use **`PageShell fullWidth`** + **`PageStack`**:

```
Topbar (route title — white, unchanged)
└─ PageStack (px-3 sm:px-4 py-3, space-y-3)
   ├─ PageFilterBar — all filters, search, tabs, primary actions (one card, h-10 controls)
   └─ PageContentPanel — tables, grids, kanban (rounded-xl border, white; use flush + p-0 for DataGrid)
```

| Component | Path |
|-----------|------|
| `PageStack` | `client/src/components/layout/PageStack.jsx` |
| `PageFilterBar` | `client/src/components/layout/PageFilterBar.jsx` |
| `PageContentPanel` | `client/src/components/layout/PageContentPanel.jsx` |
| `PageTabButton` | `client/src/components/layout/PageTabButton.jsx` |

**DataGrid inside panel:** `className="rounded-none border-0 shadow-none"` to avoid double borders.

## Purple usage matrix

| Element | Style |
|---------|--------|
| Sidebar | `bg-brand-900`, active `bg-brand-800/80`, `border-brand-400` |
| Primary buttons | `bg-brand-600 hover:bg-brand-700` (`<Button variant="primary">`) |
| Secondary buttons | white + border; hover `border-brand-300 bg-brand-50` |
| DataGrid header | `.cx-data-grid` → `bg-brand-600`, white header text |
| DataGrid footer | `bg-brand-50/50`, `border-brand-200` |
| Active tabs | `PageTabButton` active = `bg-brand-600 text-white` |
| Focus rings | `focus:border-brand-500 focus:ring-brand-500/15` |

**Not purple:** Topbar, table body rows, status badges (success/danger/warning), delete actions (red).

## Form controls

- Height: **`h-10`** via `fieldTokens` / `inputFieldClassName`
- Radius: **`rounded-xl`**
- Import from `@/components/ui/fieldTokens` or `@/components/ui/Input`

## List search + filters

Use **`ListSearchToolbar`** (wraps `PageFilterBar`) on leads/tasks-style pages.

## HR pages

Use **`HrToolbar`** (also uses `PageFilterBar`) for leave/attendance filter rows.

## Tabs (Team, Workspace, Settings)

Tabs + right actions live in **`PageFilterBar`**. Member-specific filters in a second `PageFilterBar` when needed.

## Icon-only row actions

- `aria-label` + `title` required
- Brand actions: `text-brand-700 border-brand-200 bg-brand-50`
- Danger: `text-danger border-red-200 bg-red-50`
