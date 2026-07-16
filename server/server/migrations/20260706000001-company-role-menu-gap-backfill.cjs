'use strict'

const { randomUUID } = require('node:crypto')

/**
 * Gap-fill only — NOT a blanket copy. Existing (role, menu) company_role_menus rows
 * already hold whatever an admin intended via the picker (they were just read
 * incorrectly by the old resource-collapsed permission lookup, fixed in the prior
 * migration). The real gap is roles that predate a given menu's existence (e.g. a
 * role created before Quotations/Workflows/Sales-doc-template menus were added to
 * menu_master) — those pairs have no row at all and would otherwise fail closed.
 *
 * For any (role, active leaf menu) pair missing a link, insert one using that
 * role's existing main.leads flags as the safety-net default, so enabling real
 * per-menu enforcement doesn't silently lock anyone out of a module they already
 * had equivalent access to under the old collapsed 'leads' check.
 */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master') || !tables.includes('company_role_menus') || !tables.includes('company_roles')) {
      return
    }

    const [roles] = await queryInterface.sequelize.query('SELECT id FROM company_roles')
    if (!roles?.length) return

    const [leafMenus] = await queryInterface.sequelize.query(
      "SELECT id, `key` FROM menu_master WHERE is_active = 1 AND route IS NOT NULL",
    )
    if (!leafMenus?.length) return

    const now = new Date()
    let inserted = 0

    for (const role of roles) {
      const [leadsLinkRows] = await queryInterface.sequelize.query(
        `SELECT crm.can_view AS canView, crm.can_edit AS canEdit, crm.can_update AS canUpdate, crm.can_delete AS canDelete
         FROM company_role_menus crm
         JOIN menu_master m ON m.id = crm.menu_id
         WHERE crm.company_role_id = :roleId AND m.\`key\` = 'main.leads'
         LIMIT 1`,
        { replacements: { roleId: role.id } },
      )
      const fallback = leadsLinkRows?.[0] || { canView: 1, canEdit: 0, canUpdate: 0, canDelete: 0 }

      const [existingLinks] = await queryInterface.sequelize.query(
        'SELECT menu_id FROM company_role_menus WHERE company_role_id = :roleId',
        { replacements: { roleId: role.id } },
      )
      const existingMenuIds = new Set((existingLinks || []).map((r) => r.menu_id))

      const rowsToInsert = leafMenus
        .filter((m) => !existingMenuIds.has(m.id))
        .map((m) => ({
          id: randomUUID(),
          company_role_id: role.id,
          menu_id: m.id,
          can_view: Boolean(fallback.canView),
          can_edit: Boolean(fallback.canEdit),
          can_update: Boolean(fallback.canUpdate),
          can_delete: Boolean(fallback.canDelete),
          created_at: now,
          updated_at: now,
        }))

      if (rowsToInsert.length) {
        await queryInterface.bulkInsert('company_role_menus', rowsToInsert)
        inserted += rowsToInsert.length
      }
    }

    // eslint-disable-next-line no-console
    console.log(`[company-role-menu-gap-backfill] inserted ${inserted} gap-fill rows across ${roles.length} roles`)
  },

  async down() {
    // Non-destructive: gap-fill rows are indistinguishable from legitimately-created
    // rows after the fact, so rollback intentionally leaves them in place.
  },
}
