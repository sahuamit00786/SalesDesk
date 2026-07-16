'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const cols = await queryInterface.describeTable('deal_payments')
    if (!cols.invoice_payment_id) {
      await queryInterface.addColumn('deal_payments', 'invoice_payment_id', {
        type: Sequelize.UUID,
        allowNull: true,
        defaultValue: null,
      })
      await queryInterface.addIndex('deal_payments', ['invoice_payment_id'], {
        name: 'idx_deal_payments_invoice_payment_id',
      })
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex('deal_payments', 'idx_deal_payments_invoice_payment_id')
    } catch {}
    try {
      await queryInterface.removeColumn('deal_payments', 'invoice_payment_id')
    } catch {}
  },
}
