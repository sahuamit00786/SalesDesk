'use strict'

/**
 * FIX (BUG-4) — restore menu access for users who had it before the per-user
 * permission model landed.
 *
 * `20260706000002-create-user-menu-permissions` introduced `user_menu_permissions`
 * as the sole enforcement source (see `permissionService.loadPermissionSetForUser`)
 * and deliberately did NOT backfill. The live consequence: every pre-existing
 * non-admin user resolved to an EMPTY permission set and received 403 on every
 * module, while the role-configuration UI still displayed their `company_role_menus`
 * grants — so admins saw "35 menus granted" for a user who could not open a page.
 *
 * This migration copies each user's role-level grants (`company_role_menus` for
 * their `company_role_id`) into `user_menu_permissions`, preserving the exact
 * view/edit/update/delete flags. It is:
 *
 *   - IDEMPOTENT: `INSERT IGNORE` against the `(user_id, menu_id)` unique key, so
 *     re-running changes nothing.
 *   - NON-DESTRUCTIVE: users who already have per-user rows keep them; existing
 *     rows are never overwritten or downgraded.
 *   - SCOPED: company admins are skipped — they short-circuit to the `*:admin`
 *     wildcard and need no rows.
 *
 * After this runs, per-user editing from the profile page remains the source of
 * truth going forward; this only recovers the access users already had.
 */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('user_menu_permissions') || !tables.includes('company_role_menus')) return

    // SAFETY AUDIT — this migration faithfully restores whatever admins configured
    // at role level. If a role was configured over-permissively, that breadth is
    // restored too. Surface those roles loudly BEFORE granting, so the operator can
    // abort and tighten the role rather than silently handing reps admin menus.
    const [risky] = await queryInterface.sequelize.query(`
      SELECT cr.id, cr.name, cr.user_role_kind, c.name AS company_name,
             GROUP_CONCAT(DISTINCT mm.resource ORDER BY mm.resource SEPARATOR ', ') AS elevated_menus
      FROM company_role_menus crm
      JOIN company_roles cr ON cr.id = crm.company_role_id
      JOIN companies c ON c.id = cr.company_id
      JOIN menu_master mm ON mm.id = crm.menu_id
      WHERE mm.resource IN ('settings.team', 'settings.workspace', 'settings.billing_profile')
        AND (crm.can_view = 1 OR crm.can_edit = 1 OR crm.can_update = 1 OR crm.can_delete = 1)
        AND COALESCE(cr.user_role_kind, '') NOT IN ('workspace_admin')
      GROUP BY cr.id
    `)

    if (risky.length) {
      console.warn(
        '\n[backfill-user-menu-permissions] WARNING — non-admin roles hold administrative menus.\n' +
        'These grants WILL be copied to every user holding the role:\n' +
        risky.map((r) => `  - ${r.company_name} / "${r.name}" (${r.user_role_kind || 'custom'}): ${r.elevated_menus}`).join('\n') +
        '\nIf this is unintended, abort now, tighten the role in Settings → Team → Roles, then re-run.\n'
      )
    }

    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO user_menu_permissions
        (id, user_id, menu_id, can_view, can_edit, can_update, can_delete, created_at, updated_at)
      SELECT
        UUID(),
        u.id,
        crm.menu_id,
        crm.can_view,
        crm.can_edit,
        crm.can_update,
        crm.can_delete,
        NOW(),
        NOW()
      FROM users u
      JOIN company_role_menus crm ON crm.company_role_id = u.company_role_id
      WHERE u.company_role_id IS NOT NULL
        AND u.is_company_admin = 0
        AND (crm.can_view = 1 OR crm.can_edit = 1 OR crm.can_update = 1 OR crm.can_delete = 1)
    `)
  },

  /**
   * Irreversible by design: once an admin edits per-user permissions we cannot
   * distinguish backfilled rows from hand-granted ones, and deleting the wrong
   * ones would silently revoke real access. Rolling back is a no-op.
   */
  async down() {
    // intentionally empty
  },
}
