'use strict'

const { randomUUID } = require('node:crypto')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return

    await queryInterface.sequelize.query(`
      DELETE FROM menu_master
      WHERE \`key\` IN ('manage.products', 'manage.quotes', 'manage.invoices')
         OR route IN ('/products', '/quotes', '/invoices')
         OR label IN ('Products / services', 'Quotes / proposals', 'Invoices')
    `)
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return

    const now = new Date()
    const [manageRows] = await queryInterface.sequelize.query("SELECT id FROM menu_master WHERE `key`='manage' LIMIT 1")
    const parentId = manageRows[0]?.id || null

    const entries = [
      { key: 'manage.products', label: 'Products / services', route: '/products' },
      { key: 'manage.quotes', label: 'Quotes / proposals', route: '/quotes' },
      { key: 'manage.invoices', label: 'Invoices', route: '/invoices' },
    ]

    for (const e of entries) {
      const [exists] = await queryInterface.sequelize.query('SELECT id FROM menu_master WHERE `key` = :key LIMIT 1', {
        replacements: { key: e.key },
      })
      if (exists.length) continue
      await queryInterface.bulkInsert('menu_master', [
        {
          id: randomUUID(),
          key: e.key,
          label: e.label,
          route: e.route,
          parent_id: parentId,
          sort_order: 0,
          is_active: true,
          resource: 'reports',
          action: 'view',
          created_at: now,
          updated_at: now,
        },
      ])
    }
  },
}
