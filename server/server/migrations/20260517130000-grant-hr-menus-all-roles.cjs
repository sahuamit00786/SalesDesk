'use strict'

/** Idempotent: ensure attendance + leave menus are linked to every company role. */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master') || !tables.includes('company_role_menus')) return

    const [menuRows] = await queryInterface.sequelize.query(
      "SELECT id, route FROM menu_master WHERE route IN ('/attendance','/leave','/leave/requests','/leave/approval','/leave/config') AND is_active = 1",
    )
    if (!menuRows?.length) return

    const [roles] = await queryInterface.sequelize.query('SELECT id, role_no, is_default FROM company_roles')
    const { randomUUID } = require('node:crypto')
    const now = new Date()

    for (const role of roles || []) {
      const isAdminOrManager = role.is_default === 1 || role.role_no === 1 || role.role_no === 2
      const menusForRole = menuRows.filter((m) => {
        if (['/attendance', '/leave', '/leave/requests'].includes(m.route)) return true
        return isAdminOrManager
      })
      for (const menu of menusForRole) {
        const [link] = await queryInterface.sequelize.query(
          'SELECT id FROM company_role_menus WHERE company_role_id = :roleId AND menu_id = :menuId LIMIT 1',
          { replacements: { roleId: role.id, menuId: menu.id } },
        )
        if (link?.length) continue
        await queryInterface.bulkInsert('company_role_menus', [
          {
            id: randomUUID(),
            company_role_id: role.id,
            menu_id: menu.id,
            created_at: now,
            updated_at: now,
          },
        ])
      }
    }
  },

  async down() {},
}
