'use strict'

const { randomUUID } = require('node:crypto')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return

    const now = new Date()

    const [existing] = await queryInterface.sequelize.query(
      "SELECT id FROM menu_master WHERE `key` = 'main.opportunities' LIMIT 1",
    )
    let menuId = existing[0]?.id || null

    if (!menuId) {
      const [mainRows] = await queryInterface.sequelize.query("SELECT id FROM menu_master WHERE `key`='main' LIMIT 1")
      const parentId = mainRows[0]?.id || null
      const [maxSortRows] = await queryInterface.sequelize.query(
        'SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM menu_master',
      )
      const maxSort = Number(maxSortRows[0]?.maxSort || 0)

      menuId = randomUUID()
      await queryInterface.bulkInsert('menu_master', [
        {
          id: menuId,
          key: 'main.opportunities',
          label: 'Opportunities',
          route: '/opportunities',
          parent_id: parentId,
          sort_order: maxSort + 1,
          is_active: true,
          resource: 'reports',
          action: 'view',
          created_at: now,
          updated_at: now,
        },
      ])
    }

    if (!tables.includes('company_roles') || !tables.includes('company_role_menus')) return
    const [roles] = await queryInterface.sequelize.query('SELECT id FROM company_roles')
    if (!roles.length || !menuId) return

    for (const role of roles) {
      const [linkExists] = await queryInterface.sequelize.query(
        'SELECT id FROM company_role_menus WHERE company_role_id = :roleId AND menu_id = :menuId LIMIT 1',
        { replacements: { roleId: role.id, menuId } },
      )
      if (linkExists.length) continue
      await queryInterface.bulkInsert('company_role_menus', [
        {
          id: randomUUID(),
          company_role_id: role.id,
          menu_id: menuId,
          can_view: true,
          can_edit: false,
          can_update: false,
          can_delete: false,
          created_at: now,
          updated_at: now,
        },
      ])
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menu_master WHERE `key` = 'main.opportunities' OR route = '/opportunities'",
    )
    const menuIds = rows.map((r) => r.id)

    if (menuIds.length && tables.includes('company_role_menus')) {
      await queryInterface.sequelize.query(
        'DELETE FROM company_role_menus WHERE menu_id IN (:menuIds)',
        { replacements: { menuIds } },
      )
    }

    await queryInterface.sequelize.query(
      "DELETE FROM menu_master WHERE `key` = 'main.opportunities' OR route = '/opportunities'",
    )
  },
}
