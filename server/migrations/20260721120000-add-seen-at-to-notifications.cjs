'use strict'

// "Seen" tracks whether a notification has been rendered in the bell dropdown
// or notification center (auto-marked on view), separate from "read" (is_read,
// set on explicit click / mark-read). Lets the UI show a "new" dot that clears
// on view, independent of the read/unread badge count.
module.exports = {
  async up(queryInterface, Sequelize) {
    const cols = await queryInterface.describeTable('notifications')

    if (!cols.seen_at) {
      await queryInterface.addColumn('notifications', 'seen_at', {
        type: Sequelize.DATE,
        allowNull: true,
        after: 'is_read',
      })
    }

    try {
      await queryInterface.addIndex('notifications', ['user_id', 'seen_at'], {
        name: 'idx_notifications_user_seen',
      })
    } catch (e) {
      if (!e.message?.includes('Duplicate') && !e.message?.includes('already exists')) throw e
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex('notifications', 'idx_notifications_user_seen')
    } catch {}
    try {
      await queryInterface.removeColumn('notifications', 'seen_at')
    } catch {}
  },
}
