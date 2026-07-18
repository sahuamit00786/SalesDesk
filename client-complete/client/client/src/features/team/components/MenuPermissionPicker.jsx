import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { NAV_SECTIONS } from '@/components/layout/navConfig'
import { normalizeMenuRoute } from '@/utils/menuAccess'
import { buildPermissionMap } from '@/utils/permissionAccess'

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
  // Grant ceiling (mirrors putUserMenuPermissions on the server): a
  // non-company-admin can only grant flags they hold themselves, and the
  // 'settings.team' menu is company-admin-only to hand out. Checkboxes above
  // the ceiling render disabled; the server rejects them regardless.
  const actor = useSelector((s) => s.auth.user)
  const actorIsCompanyAdmin = Boolean(actor?.isCompanyAdmin)
  const actorPermMap = useMemo(() => buildPermissionMap(actor?.allowedMenus), [actor?.allowedMenus])
  const FLAG_TO_ACTOR_KEY = { canView: 'canView', canEdit: 'canCreate', canUpdate: 'canUpdate', canDelete: 'canDelete' }
  function actorMayGrant(menu, flagKey) {
    if (actorIsCompanyAdmin) return true
    if (menu?.key === 'settings.team') return false
    const own = actorPermMap.get(menu?.key)
    if (!own) return false
    if (flagKey === 'canView') return own.canView || own.canCreate || own.canUpdate || own.canDelete
    return Boolean(own[FLAG_TO_ACTOR_KEY[flagKey]])
  }

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
    return menuPermissions.find((m) => m.menuId === menuId) || emptyPermission(menuId)
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
    setMenuPermissions(menuId, { ...current, [key]: !current[key] })
  }

  function setMenuAll(menu, enabled) {
    const menuId = menu.id
    setMenuPermissions(menuId, {
      menuId,
      canView: enabled && actorMayGrant(menu, 'canView'),
      canEdit: enabled && actorMayGrant(menu, 'canEdit'),
      canUpdate: enabled && actorMayGrant(menu, 'canUpdate'),
      canDelete: enabled && actorMayGrant(menu, 'canDelete'),
    })
  }

  function selectAllMenuPermissions() {
    onChange(
      sidebarMenus
        .map((m) => ({
          menuId: m.id,
          canView: actorMayGrant(m, 'canView'),
          canEdit: actorMayGrant(m, 'canEdit'),
          canUpdate: actorMayGrant(m, 'canUpdate'),
          canDelete: actorMayGrant(m, 'canDelete'),
        }))
        .filter((p) => p.canView || p.canEdit || p.canUpdate || p.canDelete),
    )
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
                const menuEnabled = p.canView || p.canEdit || p.canUpdate || p.canDelete
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
                            disabled={!actorIsCompanyAdmin && m.key === 'settings.team'}
                            title={!actorIsCompanyAdmin && m.key === 'settings.team' ? 'Only the company admin can grant Team & roles access' : undefined}
                            onChange={(e) => setMenuAll(m, e.target.checked)}
                            className="h-5 w-5 rounded border-surface-border text-brand-600 focus:ring-brand-500/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </div>

                        {PERMISSION_COLS.map(([key]) => (
                          <div key={key} className="flex justify-center w-16">
                            <input
                              type="checkbox"
                              checked={p[key]}
                              disabled={!actorMayGrant(m, key) && !p[key]}
                              title={!actorMayGrant(m, key) ? 'You cannot grant permissions you do not hold yourself' : undefined}
                              onChange={() => togglePermission(m.id, key)}
                              className="h-5 w-5 rounded border-surface-border text-brand-600 focus:ring-brand-500/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
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
