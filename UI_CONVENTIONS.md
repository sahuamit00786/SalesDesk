# UI Conventions

## Team & Roles Pattern Baseline

Use `Team & Roles` page as the reference style for tabbed top controls and page spacing.

## Tabs Standard

- All top-level page tabs should use the same container pattern:
  - wrapper: rounded border card, `bg-white/90`, compact `px-3 py-2`
  - tab button: `h-8`, `rounded-lg`, `px-3`, `text-xs`
  - active tab: brand filled (`bg-brand-600 text-white`)
  - inactive tab: neutral chip (`bg-surface-subtle text-ink-muted`)
- Action buttons placed on the right of the same top bar should match:
  - `h-8`, `rounded-lg`, compact icon + text sizing (`text-xs`, icon `h-3.5 w-3.5`)

## Icon-Only Action Button Standard

- Use icon-only buttons in **table row action columns** by default (no visible text labels in row actions).
- For top toolbars / page-level controls, keep text labels unless there is a specific design exception.
- Accessibility is required for icon-only actions:
  - add `aria-label`
  - add `title` tooltip
- Color treatment must be hue-matched:
  - icon color, border color, and light background should use the same color family.
  - examples:
    - brand action: `text-brand-700 border-brand-200 bg-brand-50`
    - danger action: `text-danger border-red-200 bg-red-50`
- Hover should stay in the same hue family with a slightly stronger tint (for example `bg-brand-100`, `bg-red-100`).
- Disabled icon-only actions should remain visible with reduced emphasis (`disabled:opacity-50`) instead of being hidden.

## Padding / Spacing Standard

- For pages following this pattern, use `PageShell fullWidth`.
- Primary page stack spacing should be `space-y-4` for compact, consistent vertical rhythm.
- Content cards should prefer `rounded-xl` and avoid oversized internal paddings unless needed for readability.

## Workspace Alignment Rule

- `Workspace` tab controls and spacing must match this exact Team & Roles tab/padding standard.
- New pages introducing tabbed toolbars should follow the same baseline unless there is a documented exception.
