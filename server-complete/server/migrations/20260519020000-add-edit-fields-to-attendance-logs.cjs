'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('attendance_logs')

    if (!desc.note) {
      await queryInterface.addColumn('attendance_logs', 'note', {
        type: Sequelize.TEXT,
        allowNull: true,
        after: 'status',
      })
    }

    if (!desc.edited_by_user_id) {
      await queryInterface.addColumn('attendance_logs', 'edited_by_user_id', {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        after: 'note',
      })
    }

    if (!desc.edited_at) {
      await queryInterface.addColumn('attendance_logs', 'edited_at', {
        type: Sequelize.DATE,
        allowNull: true,
        after: 'edited_by_user_id',
      })
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('attendance_logs')
    if (desc.edited_at) await queryInterface.removeColumn('attendance_logs', 'edited_at')
    if (desc.edited_by_user_id) await queryInterface.removeColumn('attendance_logs', 'edited_by_user_id')
    if (desc.note) await queryInterface.removeColumn('attendance_logs', 'note')
  },
}
