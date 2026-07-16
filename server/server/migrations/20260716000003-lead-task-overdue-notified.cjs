'use strict'

/**
 * Phase 1 — task-overdue notify (item #9). One additive nullable column so the
 * overdue pass can fire exactly once per task instead of re-alerting on every
 * cron tick. NULL = not yet notified (existing rows unaffected).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lead_tasks', 'overdue_notified_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('lead_tasks', 'overdue_notified_at')
  },
}
