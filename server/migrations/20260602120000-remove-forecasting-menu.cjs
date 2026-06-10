'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return

    await queryInterface.sequelize.query(`
      DELETE FROM menu_master
      WHERE \`key\` = 'insights.forecasting'
         OR route = '/forecasting'
         OR label = 'Forecasting'
    `)
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return

    const { randomUUID } = require('node:crypto')
    const now = new Date()
    const [exists] = await queryInterface.sequelize.query(
      "SELECT id FROM menu_master WHERE `key` = 'insights.forecasting' LIMIT 1",
    )
    if (exists.length) return

    const [insightsRows] = await queryInterface.sequelize.query(
      "SELECT id FROM menu_master WHERE `key` = 'insights' LIMIT 1",
    )
    const parentId = insightsRows[0]?.id || null

    await queryInterface.bulkInsert('menu_master', [
      {
        id: randomUUID(),
        key: 'insights.forecasting',
        label: 'Forecasting',
        route: '/forecasting',
        parent_id: parentId,
        sort_order: 0,
        is_active: true,
        resource: 'reports',
        action: 'view',
        created_at: now,
        updated_at: now,
      },
    ])
  },
}
