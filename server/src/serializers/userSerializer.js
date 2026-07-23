/**
 * Dashboard is available to every company user regardless of role menu matrix.
 * `synthetic: true` marks this as a fallback (not a real grant) so callers — e.g. the
 * login gate that blocks users with zero real menu permissions — can tell it apart from
 * an actual UserMenuPermission row for the dashboard menu.
 */
const DASHBOARD_ALLOWED_MENU = {
  key: 'main.dashboard',
  route: '/',
  label: 'Dashboard',
  parentId: null,
  canView: true,
  canCreate: true,
  canUpdate: true,
  canDelete: true,
  synthetic: true,
}

const ADMIN_MENU_PERMS = { canView: true, canCreate: true, canUpdate: true, canDelete: true }

function withDashboardMenuAlways(allowedMenus) {
  const base = Array.isArray(allowedMenus) ? [...allowedMenus] : []
  if (base.some((m) => m && (m.route === '/' || m.key === 'main.dashboard'))) return base
  return [DASHBOARD_ALLOWED_MENU, ...base]
}

export function serializeUser(user) {
  const c = user.company
  const companyRole = user.companyRole
  const memberships = Array.isArray(user.workspaceMemberships) ? user.workspaceMemberships : []
  const companyName = c?.name ?? null
  const needsOnboarding = Boolean(
    user.isCompanyAdmin && user.companyId && (!c || !c.onboardingCompletedAt),
  )
  // Permissions are per-user (UserMenuPermission), not role-scoped — companyRole is a label only.
  let allowedMenus = Array.isArray(user.menuPermissions)
    ? user.menuPermissions
        .filter((l) => l.menu)
        .map((l) => ({
          key: l.menu.key,
          route: l.menu.route,
          label: l.menu.label,
          parentId: l.menu.parentId || null,
          // canEdit=Create, canUpdate=Update per the CRUD-flag semantics — see UserMenuPermission.
          canView: Boolean(l.canView),
          canCreate: Boolean(l.canEdit),
          canUpdate: Boolean(l.canUpdate),
          canDelete: Boolean(l.canDelete),
        }))
    : []
  if (user.isCompanyAdmin) {
    allowedMenus = allowedMenus.length
      ? allowedMenus.map((m) => ({ ...m, ...ADMIN_MENU_PERMS }))
      : [DASHBOARD_ALLOWED_MENU]
  }
  const memberWorkspaces = memberships
    .map((m) => m.workspace)
    .filter(Boolean)
    .map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description ?? null,
      archived: Boolean(w.archivedAt),
      themeColor: w.themeColor ?? null,
      sidebarTextColor: w.sidebarTextColor ?? null,
      defaultCurrency: w.defaultCurrency ?? null,
    }))
  const companyWorkspaces = Array.isArray(c?.workspaces)
    ? c.workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description ?? null,
        archived: Boolean(w.archivedAt),
        themeColor: w.themeColor ?? null,
        sidebarTextColor: w.sidebarTextColor ?? null,
        defaultCurrency: w.defaultCurrency ?? null,
      }))
    : []
  const scopedWorkspaces = user.isCompanyAdmin ? companyWorkspaces : memberWorkspaces
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.isCompanyAdmin ? 'company_admin' : 'member',
    companyRole: companyRole
      ? {
          id: companyRole.id,
          name: companyRole.name,
          description: companyRole.description ?? null,
          userRoleKind: companyRole.userRoleKind || 'custom',
          roleNo: companyRole.roleNo != null ? Number(companyRole.roleNo) : null,
        }
      : null,
    companyRoleId: user.companyRoleId ?? null,
    isCompanyAdmin: Boolean(user.isCompanyAdmin),
    avatar: user.avatar,
    department: user.department ?? null,
    jobTitle: user.jobTitle ?? null,
    businessPhone: user.businessPhone ?? null,
    whatsappNumber: user.whatsappNumber ?? null,
    profilePhotoUrl: user.profilePhotoUrl ?? null,
    street: user.street ?? null,
    city: user.city ?? null,
    country: user.country ?? null,
    postalCode: user.postalCode ?? null,
    lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
    companyId: user.companyId,
    companyName,
    company: c
      ? {
          id: c.id,
          name: c.name,
          industry: c.industry,
          websiteUrl: c.websiteUrl,
          country: c.country,
          city: c.city,
          employeeRange: c.employeeRange,
          monthlyLeadsBand: c.monthlyLeadsBand,
          leadPainTags: c.leadPainTags,
          leadPainNotes: c.leadPainNotes,
          currentToolsNotes: c.currentToolsNotes,
          baseCurrency: c.baseCurrency ?? 'USD',
          onboardingCompletedAt: c.onboardingCompletedAt,
          workspaces: scopedWorkspaces,
        }
      : null,
    needsOnboarding,
    emailVerified: Boolean(user.emailVerified),
    isActive: user.isActive !== false,
    allowedMenus: withDashboardMenuAlways(allowedMenus),
  }
}
