'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('attendance_sessions', 'workspace_id', { type: Sequelize.UUID, allowNull: true })

    // Backfill via the parent attendance_logs row (migrated in the previous migration).
    await queryInterface.sequelize.query(`
      UPDATE attendance_sessions asess
      JOIN attendance_logs al ON al.id = asess.log_id
      SET asess.workspace_id = al.workspace_id
      WHERE asess.workspace_id IS NULL AND asess.log_id IS NOT NULL
    `)

    // Fallback for sessions with no log_id: user's oldest workspace membership.
    await queryInterface.sequelize.query(`
      UPDATE attendance_sessions asess
      JOIN (
        SELECT uw1.user_id, uw1.workspace_id
        FROM user_workspaces uw1
        JOIN (
          SELECT user_id, MIN(created_at) AS min_created_at
          FROM user_workspaces
          GROUP BY user_id
        ) first_uw ON first_uw.user_id = uw1.user_id AND first_uw.min_created_at = uw1.created_at
      ) primary_ws ON primary_ws.user_id = asess.user_id
      SET asess.workspace_id = primary_ws.workspace_id
      WHERE asess.workspace_id IS NULL
    `)

    // Final fallback: company's oldest workspace.
    await queryInterface.sequelize.query(`
      UPDATE attendance_sessions asess
      JOIN (
        SELECT w1.company_id, w1.id
        FROM workspaces w1
        JOIN (
          SELECT company_id, MIN(created_at) AS min_created_at
          FROM workspaces
          GROUP BY company_id
        ) first_ws ON first_ws.company_id = w1.company_id AND first_ws.min_created_at = w1.created_at
      ) fallback_ws ON fallback_ws.company_id = asess.company_id
      SET asess.workspace_id = fallback_ws.id
      WHERE asess.workspace_id IS NULL
    `)

    await queryInterface.changeColumn('attendance_sessions', 'workspace_id', { type: Sequelize.UUID, allowNull: false })
    await queryInterface.addIndex('attendance_sessions', ['workspace_id'], { name: 'attendance_sessions_workspace_idx' })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('attendance_sessions', 'attendance_sessions_workspace_idx').catch(() => {})
    await queryInterface.removeColumn('attendance_sessions', 'workspace_id')
  },
}
