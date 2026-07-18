'use strict'

/** Adds HR module entries to menu_master and grants them to company admin roles. */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return

    const hrMenus = [
      { key: 'main.attendance', label: 'Attendance', route: '/attendance', sort_order: 95 },
      { key: 'main.leave', label: 'Leave', route: '/leave', sort_order: 96 },
      { key: 'main.leave_approval', label: 'Leave approval', route: '/leave/approval', sort_order: 97 },
      { key: 'main.leave_config', label: 'Leave settings', route: '/leave/config', sort_order: 98 },
    ]

    const [mainRows] = await queryInterface.sequelize.query("SELECT id FROM menu_master WHERE `key`='main' LIMIT 1")
    const parentId = mainRows?.[0]?.id || null

    for (const m of hrMenus) {
      const [ex] = await queryInterface.sequelize.query('SELECT id FROM menu_master WHERE `key` = :key LIMIT 1', {
        replacements: { key: m.key },
      })
      if (ex?.length) continue
      await queryInterface.bulkInsert('menu_master', [
        {
          id: require('node:crypto').randomUUID(),
          parent_id: parentId,
          key: m.key,
          label: m.label,
          route: m.route,
          sort_order: m.sort_order,
          is_active: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
    }

    const [menuRows] = await queryInterface.sequelize.query(
      "SELECT id, route FROM menu_master WHERE route IN ('/attendance','/leave','/leave/approval','/leave/config')",
    )
    if (!tables.includes('company_role_menus') || !menuRows?.length) return

    const [roles] = await queryInterface.sequelize.query(
      'SELECT id FROM company_roles WHERE is_default = 1 OR role_no IN (1, 2)',
    )
    for (const role of roles || []) {
      for (const menu of menuRows) {
        const [link] = await queryInterface.sequelize.query(
          'SELECT id FROM company_role_menus WHERE company_role_id = :roleId AND menu_id = :menuId LIMIT 1',
          { replacements: { roleId: role.id, menuId: menu.id } },
        )
        if (link?.length) continue
        await queryInterface.bulkInsert('company_role_menus', [
          {
            id: require('node:crypto').randomUUID(),
            company_role_id: role.id,
            menu_id: menu.id,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ])
      }
    }

    // Grant attendance + leave to all active roles (employees need self-service)
    const [allRoles] = await queryInterface.sequelize.query('SELECT id FROM company_roles')
    const employeeMenus = menuRows.filter((m) => ['/attendance', '/leave'].includes(m.route))
    for (const role of allRoles || []) {
      for (const menu of employeeMenus) {
        const [link] = await queryInterface.sequelize.query(
          'SELECT id FROM company_role_menus WHERE company_role_id = :roleId AND menu_id = :menuId LIMIT 1',
          { replacements: { roleId: role.id, menuId: menu.id } },
        )
        if (link?.length) continue
        await queryInterface.bulkInsert('company_role_menus', [
          {
            id: require('node:crypto').randomUUID(),
            company_role_id: role.id,
            menu_id: menu.id,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ])
      }
    }
  },

  async down() {
    // Leave menus in place on rollback
  },
}
