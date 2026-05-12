'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    const t = Array.isArray(tables) ? tables : Object.values(tables)
    if (!t.includes('invoices')) return
    const cols = await queryInterface.describeTable('invoices')
    if (cols.show_bank_details) return
    await queryInterface.addColumn('invoices', 'show_bank_details', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    })
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
