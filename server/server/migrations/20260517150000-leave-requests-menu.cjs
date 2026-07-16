'use strict'

const { randomUUID } = require('node:crypto')

/** Add Leave requests menu and grant to all company roles (with attendance/leave). */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master') || !tables.includes('company_role_menus')) return

    const now = new Date()
    const [existing] = await queryInterface.sequelize.query(
      "SELECT id FROM menu_master WHERE route = '/leave/requests' LIMIT 1",
    )

    let menuId = existing?.[0]?.id
    if (!menuId) {
      menuId = randomUUID()
      await queryInterface.bulkInsert('menu_master', [
        {
          id: menuId,
          key: 'main.leave_requests',
          label: 'Leave requests',
          route: '/leave/requests',
          sort_order: 97,
          is_active: 1,
          created_at: now,
          updated_at: now,
        },
      ])
    }

    const [roles] = await queryInterface.sequelize.query('SELECT id FROM company_roles')
    for (const role of roles || []) {
      const [link] = await queryInterface.sequelize.query(
        'SELECT id FROM company_role_menus WHERE company_role_id = :roleId AND menu_id = :menuId LIMIT 1',
        { replacements: { roleId: role.id, menuId } },
      )
      if (link?.length) continue
      await queryInterface.bulkInsert('company_role_menus', [
        {
          id: randomUUID(),
          company_role_id: role.id,
          menu_id: menuId,
          created_at: now,
          updated_at: now,
        },
      ])
    }
  },

  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menu_master WHERE route = '/leave/requests'",
    )
    const id = rows?.[0]?.id
    if (!id) return
    await queryInterface.bulkDelete('company_role_menus', { menu_id: id })
    await queryInterface.bulkDelete('menu_master', { id })
  },
}
