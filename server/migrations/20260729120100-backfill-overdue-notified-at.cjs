'use strict'

/**
 * Before this release, runOverdueTaskAlerts() stamped overdue_notified_at even when the
 * alert failed to deliver (§1.1/§1.4 of the bug audit — most of these silently never sent
 * because the notification-channel gate dropped the event type). Clear the flag for every
 * still-open task so the now-fixed job actually notifies once for each of them.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE lead_tasks
      SET overdue_notified_at = NULL
      WHERE overdue_notified_at IS NOT NULL
        AND status NOT IN ('completed', 'cancelled')
    `)
  },

  async down() {
    // Not reversible — original stamp timestamps aren't recoverable, and re-suppressing
    // alerts on rollback isn't a meaningful "down" migration.
  },
}
