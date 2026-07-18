'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('companies')
    if (!desc.late_threshold_hour) {
      await queryInterface.addColumn('companies', 'late_threshold_hour', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 10,
      })
    }
    if (!desc.late_threshold_minute) {
      await queryInterface.addColumn('companies', 'late_threshold_minute', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      })
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('companies')
    if (desc.late_threshold_minute)
      await queryInterface.removeColumn('companies', 'late_threshold_minute')
    if (desc.late_threshold_hour)
      await queryInterface.removeColumn('companies', 'late_threshold_hour')
  },
}
