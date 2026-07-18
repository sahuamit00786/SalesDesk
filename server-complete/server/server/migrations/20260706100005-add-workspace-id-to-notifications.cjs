'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('notifications', 'workspace_id', { type: Sequelize.UUID, allowNull: true })

    await queryInterface.sequelize.query(`
      UPDATE notifications n
      JOIN (
        SELECT uw1.user_id, uw1.workspace_id
        FROM user_workspaces uw1
        JOIN (
          SELECT user_id, MIN(created_at) AS min_created_at
          FROM user_workspaces
          GROUP BY user_id
        ) first_uw ON first_uw.user_id = uw1.user_id AND first_uw.min_created_at = uw1.created_at
      ) primary_ws ON primary_ws.user_id = n.user_id
      SET n.workspace_id = primary_ws.workspace_id
      WHERE n.workspace_id IS NULL
    `)

    await queryInterface.sequelize.query(`
      UPDATE notifications n
      JOIN (
        SELECT w1.company_id, w1.id
        FROM workspaces w1
        JOIN (
          SELECT company_id, MIN(created_at) AS min_created_at
          FROM workspaces
          GROUP BY company_id
        ) first_ws ON first_ws.company_id = w1.company_id AND first_ws.min_created_at = w1.created_at
      ) fallback_ws ON fallback_ws.company_id = n.company_id
      SET n.workspace_id = fallback_ws.id
      WHERE n.workspace_id IS NULL
    `)

    await queryInterface.changeColumn('notifications', 'workspace_id', { type: Sequelize.UUID, allowNull: false })
    await queryInterface.addIndex('notifications', ['workspace_id'], { name: 'notifications_workspace_idx' })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('notifications', 'notifications_workspace_idx').catch(() => {})
    await queryInterface.removeColumn('notifications', 'workspace_id')
  },
}
