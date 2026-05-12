export function serializeUser(user) {
  const c = user.company
  const companyRole = user.companyRole
  const memberships = Array.isArray(user.workspaceMemberships) ? user.workspaceMemberships : []
  const companyName = c?.name ?? null
  const needsOnboarding = Boolean(user.companyId && (!c || !c.onboardingCompletedAt))
  const allowedMenus = Array.isArray(companyRole?.menuLinks)
    ? companyRole.menuLinks
        .map((l) => l.menu)
        .filter(Boolean)
        .map((m) => ({ key: m.key, route: m.route, label: m.label, parentId: m.parentId || null }))
    : []
  const memberWorkspaces = memberships
    .map((m) => m.workspace)
    .filter(Boolean)
    .map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description ?? null,
      archived: Boolean(w.archivedAt),
    }))
  const companyWorkspaces = Array.isArray(c?.workspaces)
    ? c.workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description ?? null,
        archived: Boolean(w.archivedAt),
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
          employeeRange: c.employeeRange,
          monthlyLeadsBand: c.monthlyLeadsBand,
          leadPainTags: c.leadPainTags,
          leadPainNotes: c.leadPainNotes,
          currentToolsNotes: c.currentToolsNotes,
          onboardingCompletedAt: c.onboardingCompletedAt,
          workspaces: scopedWorkspaces,
        }
      : null,
    needsOnboarding,
    emailVerified: Boolean(user.emailVerified),
    isActive: user.isActive !== false,
    allowedMenus,
  }
}
