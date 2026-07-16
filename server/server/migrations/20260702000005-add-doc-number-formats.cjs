'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const cols = await queryInterface.describeTable('workspace_billing_profiles')
    if (!cols.quotation_number_format) {
      await queryInterface.addColumn('workspace_billing_profiles', 'quotation_number_format', {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'PREFIX/DDMMYYYY/SEQ',
      })
    }
    if (!cols.invoice_number_format) {
      await queryInterface.addColumn('workspace_billing_profiles', 'invoice_number_format', {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'PREFIX/DDMMYYYY/SEQ',
      })
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn('workspace_billing_profiles', 'quotation_number_format')
    } catch {}
    try {
      await queryInterface.removeColumn('workspace_billing_profiles', 'invoice_number_format')
    } catch {}
  },
}
