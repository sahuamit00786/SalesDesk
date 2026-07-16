'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    const t = Array.isArray(tables) ? tables : Object.values(tables)
    if (!t.includes('invoices')) return

    const [rows] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'show_bank_details'`,
    )
    const c = Number(rows?.[0]?.c ?? 0)
    if (c > 0) return

    await queryInterface.sequelize.query(
      `ALTER TABLE invoices ADD COLUMN show_bank_details TINYINT(1) NOT NULL DEFAULT 1`,
    )
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    const t = Array.isArray(tables) ? tables : Object.values(tables)
    if (!t.includes('invoices')) return
    const cols = await queryInterface.describeTable('invoices')
    if (!cols.show_bank_details) return
    await queryInterface.removeColumn('invoices', 'show_bank_details')
  },
}
