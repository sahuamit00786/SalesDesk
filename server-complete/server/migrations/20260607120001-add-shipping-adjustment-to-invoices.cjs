'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const cols = await queryInterface.describeTable('invoices').catch(() => null)
    if (!cols) return
    if (!cols.shipping) {
      await queryInterface.addColumn('invoices', 'shipping', {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        after: 'discount_total',
      })
    }
    if (!cols.adjustment) {
      await queryInterface.addColumn('invoices', 'adjustment', {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        after: 'shipping',
      })
    }
  },

  async down(queryInterface) {
    const cols = await queryInterface.describeTable('invoices').catch(() => null)
    if (!cols) return
    if (cols.shipping) await queryInterface.removeColumn('invoices', 'shipping')
    if (cols.adjustment) await queryInterface.removeColumn('invoices', 'adjustment')
  },
}
