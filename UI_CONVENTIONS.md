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

## Icons — semantic tones

**Import icons from `@/components/ui/icons`, never from `lucide-react`.**

The wrapper tags each icon with an `icon-tone-*` class based on what the icon
*means*, not where it sits: `Trash2` is rose everywhere, `Mail` is blue
everywhere, `DollarSign` is emerald everywhere. Chrome (chevrons, `X`, `Search`,
`Loader2`) and editor-toolbar icons (`Bold`, `AlignLeft`, …) are deliberately
untoned — they are structure, not signal.

| File | Purpose |
|------|---------|
| `client/src/utils/iconTones.js` | icon name → tone key |
| `client/src/index.css` | tone key → colour (`:where(.icon-tone-*)`) |
| `client/src/components/ui/icons.jsx` | **generated** — `python scripts/gen-icons.py` |

**Tones are a default, never a decision.** Their CSS lives inside `:where()`, so
it carries zero specificity and loses to anything more deliberate:

- an explicit class on the icon — `<Trash2 className="text-white" />` stays white
- a surface that owns its icon colour — add **`cx-icon-inherit`** to the container
  and every icon inside reverts to `currentColor`. Already on `Button`
  `primary`/`danger`. Add it to any new dark or coloured surface.
- `.cx-icon-tone-dark` on a container swaps tones to their 300-shade for dark
  backgrounds (used by the sidebar).

So no `!important`, and no tone ever fights an intentional colour.

**Adding a new lucide icon:** import it somewhere, then re-run
`python scripts/gen-icons.py` to regenerate `icons.jsx`. Untoned icons are
re-exported unwrapped, so there is no runtime cost for chrome.

Public landing (`features/leadflow-landing/`) is exempt — it keeps its own
monochrome + violet art direction and imports `lucide-react` directly.
