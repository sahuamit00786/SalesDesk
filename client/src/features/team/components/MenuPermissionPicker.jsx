import { useMemo } from 'react'
import { NAV_SECTIONS } from '@/components/layout/navConfig'
import { normalizeMenuRoute } from '@/utils/menuAccess'

const PERMISSION_COLS = [
  ['canView', 'View'],
  ['canEdit', 'Create'],
  ['canUpdate', 'Edit'],
  ['canDelete', 'Delete'],
]

function emptyPermission(menuId) {
  return { menuId, canView: false, canEdit: false, canUpdate: false, canDelete: false }
}

export function MenuPermissionPicker({ menuItems, value, onChange }) {
  const sidebarMenus = useMemo(() => {
    const menuByRoute = new Map()
    for (const m of menuItems || []) {
      const route = normalizeMenuRoute(m.route)
      if (!route) continue
      const navRoute = route === '/' ? '/dashboard' : route
      menuByRoute.set(navRoute, m)
    }

    const items = []
    for (const section of NAV_SECTIONS) {
      for (const navItem of section.items) {
        const apiMenu = menuByRoute.get(navItem.to)
        if (!apiMenu) continue
        items.push({
          ...apiMenu,
          label: navItem.label,
          icon: navItem.icon,
          sectionLabel: section.label,
        })
      }
    }
    return items
  }, [menuItems])

  const menusBySection = useMemo(() => {
    const groups = new Map()
    for (const m of sidebarMenus) {
      if (!groups.has(m.sectionLabel)) groups.set(m.sectionLabel, [])
      groups.get(m.sectionLabel).push(m)
    }
    return NAV_SECTIONS.map((section) => [section.label, groups.get(section.label) || []]).filter(
      ([, sectionMenus]) => sectionMenus.length > 0,
    )
  }, [sidebarMenus])

  const menuPermissions = value || []

  function permissionFor(menuId) {
    const p = menuPermissions.find((m) => m.menuId === menuId) || emptyPermission(menuId)
    // Normalize stale/legacy rows saved before view-implication was enforced (create/update/
    // delete without view) so the checkboxes never show a state the server wouldn't grant.
    if (p.canEdit || p.canUpdate || p.canDelete) return { ...p, canView: true }
    return p
  }

  function setMenuPermissions(menuId, nextState) {
    const rest = menuPermissions.filter((m) => m.menuId !== menuId)
    if (!nextState.canView && !nextState.canEdit && !nextState.canUpdate && !nextState.canDelete) {
      onChange(rest)
      return
    }
    onChange([...rest, nextState])
  }

  function togglePermission(menuId, key) {
    const current = permissionFor(menuId)
    const next = { ...current, [key]: !current[key] }
    if (key === 'canView' && !next.canView) {
      // Can't create/update/delete without view — matches the server's `can()` fallback
      // (create/update/delete each imply view), so the checkboxes never lie about that.
      next.canEdit = false
      next.canUpdate = false
      next.canDelete = false
    } else if (key !== 'canView' && next[key]) {
      // Granting create/update/delete implies view.
      next.canView = true
    }
    setMenuPermissions(menuId, next)
  }

  function setMenuAll(menuId, enabled) {
    setMenuPermissions(menuId, { menuId, canView: enabled, canEdit: enabled, canUpdate: enabled, canDelete: enabled })
  }

  function selectAllMenuPermissions() {
    onChange(sidebarMenus.map((m) => ({ menuId: m.id, canView: true, canEdit: true, canUpdate: true, canDelete: true })))
  }

  function clearAllMenuPermissions() {
    onChange([])
  }

  const allMenusFullAccess =
    sidebarMenus.length > 0 &&
    sidebarMenus.every((m) => {
      const p = permissionFor(m.id)
      return p.canView && p.canEdit && p.canUpdate && p.canDelete
    })

  return (
    <div className="w-full rounded-xl border border-surface-border bg-white overflow-hidden">
      <div className="border-b border-surface-border px-6 py-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={allMenusFullAccess}
            onChange={(e) => (e.target.checked ? selectAllMenuPermissions() : clearAllMenuPermissions())}
            className="h-5 w-5 rounded border-surface-border text-brand-600 focus:ring-brand-500/30 cursor-pointer"
          />
          <span className="text-sm font-semibold text-ink">Select all</span>
        </label>
      </div>

      <div className="scrollbar-subtle overflow-y-auto">
        {menusBySection.map(([sectionLabel, sectionMenus]) => (
          <div key={sectionLabel}>
            <div className="border-b border-surface-border bg-slate-50 px-6 py-3 sticky top-0">
              <div className="flex items-center justify-between gap-6">
                <h3 className="text-sm font-semibold text-ink">{sectionLabel}</h3>
                <div className="flex items-center gap-16 flex-shrink-0">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-8 text-center">All</span>
                  {PERMISSION_COLS.map(([, colLabel]) => (
                    <span key={colLabel} className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-16 text-center">
                      {colLabel}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="divide-y divide-surface-border">
              {sectionMenus.map((m) => {
                const p = permissionFor(m.id)
                const menuEnabled = p.canView && p.canEdit && p.canUpdate && p.canDelete
                const IconComponent = m.icon
                return (
                  <div key={m.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-3 min-w-0">
                        {IconComponent && <IconComponent className="h-4 w-4 flex-shrink-0 text-ink-muted" strokeWidth={2} />}
                        <span className="truncate text-sm font-medium text-ink">{m.label}</span>
                      </div>

                      <div className="flex items-center gap-16 flex-shrink-0">
                        <div className="flex justify-center w-8">
                          <input
                            type="checkbox"
                            checked={menuEnabled}
                            onChange={(e) => setMenuAll(m.id, e.target.checked)}
                            className="h-5 w-5 rounded border-surface-border text-brand-600 focus:ring-brand-500/30 cursor-pointer"
                          />
                        </div>

                        {PERMISSION_COLS.map(([key]) => (
                          <div key={key} className="flex justify-center w-16">
                            <input
                              type="checkbox"
                              checked={p[key]}
                              onChange={() => togglePermission(m.id, key)}
                              className="h-5 w-5 rounded border-surface-border text-brand-600 focus:ring-brand-500/30 cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
