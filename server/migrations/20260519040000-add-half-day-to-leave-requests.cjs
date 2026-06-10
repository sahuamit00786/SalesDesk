'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('leave_requests')
    if (!desc.is_half_day) {
      await queryInterface.addColumn('leave_requests', 'is_half_day', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: 'days',
      })
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('leave_requests')
    if (desc.is_half_day) await queryInterface.removeColumn('leave_requests', 'is_half_day')
  },
}
