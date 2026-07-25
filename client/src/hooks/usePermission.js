/**
 * Menu-level visibility is role-based now (see utils/menuAccess.js) — there is no more
 * per-action (view/create/update/delete) grant to check, so any user who can see a menu
 * has full access to it. Kept as a hook (rather than deleting its ~50 call sites) so
 * existing `usePermission(menu, action)` / `<RequirePermission>` usages keep working.
 */
export function usePermission() {
  return true
}
