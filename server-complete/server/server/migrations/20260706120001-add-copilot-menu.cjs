'use strict'

const { randomUUID } = require('node:crypto')

/**
 * AI Copilot menu entry. No route (it's a drawer, not a page) and no default
 * grants — matches the post-20260706000002 convention that every user starts
 * with zero menu access and admins grant per-user; company admins already get
 * everything via the '*:admin' wildcard in permissionService.js.
 */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return

    const [existing] = await queryInterface.sequelize.query(
      "SELECT id FROM menu_master WHERE `key` = 'main.copilot' LIMIT 1",
    )
    if (existing?.length) return

    const now = new Date()
    const [maxSortRows] = await queryInterface.sequelize.query(
      'SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM menu_master',
    )
    const sortOrder = Number(maxSortRows[0]?.maxSort || 0) + 1

    await queryInterface.bulkInsert('menu_master', [
      {
        id: randomUUID(),
        key: 'main.copilot',
        label: 'AI Copilot',
        route: null,
        parent_id: null,
        sort_order: sortOrder,
        is_active: true,
        resource: 'main.copilot',
        action: 'view',
        created_at: now,
        updated_at: now,
      },
    ])
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query("DELETE FROM menu_master WHERE `key` = 'main.copilot'")
  },
}
