'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('lead_followups')
    if (!desc.notified_at) {
      await queryInterface.addColumn('lead_followups', 'notified_at', { type: Sequelize.DATE, allowNull: true })
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('lead_followups', 'notified_at').catch(() => {})
  },
}
