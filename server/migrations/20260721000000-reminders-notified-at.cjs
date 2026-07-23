'use strict'

async function columnExists(queryInterface, table, column) {
  const desc = await queryInterface.describeTable(table).catch(() => null)
  return Boolean(desc?.[column])
}

/**
 * reminders.notified_at — tracks when the due-reminder cron actually fired a
 * reminder, independent of `status` (which stays user-controlled: pending/done/dismissed).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'reminders', 'notified_at'))) {
      await queryInterface.addColumn('reminders', 'notified_at', { type: Sequelize.DATE, allowNull: true })
    }
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, 'reminders', 'notified_at')) {
      await queryInterface.removeColumn('reminders', 'notified_at').catch(() => {})
    }
  },
}
