'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('leave_balances', 'workspace_id', { type: Sequelize.UUID, allowNull: true })

    await queryInterface.sequelize.query(`
      UPDATE leave_balances lb
      JOIN (
        SELECT uw1.user_id, uw1.workspace_id
        FROM user_workspaces uw1
        JOIN (
          SELECT user_id, MIN(created_at) AS min_created_at
          FROM user_workspaces
          GROUP BY user_id
        ) first_uw ON first_uw.user_id = uw1.user_id AND first_uw.min_created_at = uw1.created_at
      ) primary_ws ON primary_ws.user_id = lb.user_id
      SET lb.workspace_id = primary_ws.workspace_id
      WHERE lb.workspace_id IS NULL
    `)

    await queryInterface.sequelize.query(`
      UPDATE leave_balances lb
      JOIN (
        SELECT w1.company_id, w1.id
        FROM workspaces w1
        JOIN (
          SELECT company_id, MIN(created_at) AS min_created_at
          FROM workspaces
          GROUP BY company_id
        ) first_ws ON first_ws.company_id = w1.company_id AND first_ws.min_created_at = w1.created_at
      ) fallback_ws ON fallback_ws.company_id = lb.company_id
      SET lb.workspace_id = fallback_ws.id
      WHERE lb.workspace_id IS NULL
    `)

    await queryInterface.changeColumn('leave_balances', 'workspace_id', { type: Sequelize.UUID, allowNull: false })
    await queryInterface.addIndex('leave_balances', ['workspace_id'], { name: 'leave_balances_workspace_idx' })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('leave_balances', 'leave_balances_workspace_idx').catch(() => {})
    await queryInterface.removeColumn('leave_balances', 'workspace_id')
  },
}
