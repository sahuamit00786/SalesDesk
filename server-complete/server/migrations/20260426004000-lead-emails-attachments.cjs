'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('lead_emails').catch(() => null)
    if (table && !table.attachments) {
      await queryInterface.addColumn('lead_emails', 'attachments', {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      })
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('lead_emails').catch(() => null)
    if (table?.attachments) {
      await queryInterface.removeColumn('lead_emails', 'attachments')
    }
  },
}
