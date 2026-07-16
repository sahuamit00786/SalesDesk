'use strict'

const { randomUUID } = require('node:crypto')

/** Adds a settings.email permission-menu entry so it can be granted independently of settings.workspace/settings.team. */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return

    const [existing] = await queryInterface.sequelize.query(
      "SELECT id FROM menu_master WHERE `key` = 'settings.email' LIMIT 1",
    )
    if (existing?.length) return

    const [parentRows] = await queryInterface.sequelize.query(
      "SELECT id FROM menu_master WHERE `key` = 'settings' LIMIT 1",
    )
    const parentId = parentRows?.[0]?.id || null

    const [maxSortRows] = await queryInterface.sequelize.query(
      'SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM menu_master',
    )
    const sortOrder = Number(maxSortRows[0]?.maxSort || 0) + 1

    const now = new Date()
    await queryInterface.bulkInsert('menu_master', [
      {
        id: randomUUID(),
        key: 'settings.email',
        label: 'Email settings',
        route: '/workspace/email',
        parent_id: parentId,
        sort_order: sortOrder,
        is_active: true,
        resource: 'settings.email',
        action: 'view',
        created_at: now,
        updated_at: now,
      },
    ])
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query("DELETE FROM menu_master WHERE `key` = 'settings.email'")
  },
}
