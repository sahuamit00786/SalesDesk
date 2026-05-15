'use strict'

/** Weekly off days for leave calculation (0=Sun … 6=Sat). Default Sat+Sun. */
const DEFAULT_WEEKLY_OFF = JSON.stringify([0, 6])

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('companies')) return

    const desc = await queryInterface.describeTable('companies')
    if (!desc.leave_weekly_off_days) {
      await queryInterface.addColumn('companies', 'leave_weekly_off_days', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: DEFAULT_WEEKLY_OFF,
      })
    }

    await queryInterface.sequelize.query(
      `UPDATE companies SET leave_weekly_off_days = :def WHERE leave_weekly_off_days IS NULL`,
      { replacements: { def: DEFAULT_WEEKLY_OFF } },
    )
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('companies')
    if (desc.leave_weekly_off_days) {
      await queryInterface.removeColumn('companies', 'leave_weekly_off_days')
    }
  },
}
