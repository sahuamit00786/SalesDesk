'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('teams', 'workspace_id', { type: Sequelize.UUID, allowNull: true })

    // Teams have no user reference — backfill from the company's oldest workspace.
    await queryInterface.sequelize.query(`
      UPDATE teams t
      JOIN (
        SELECT w1.company_id, w1.id
        FROM workspaces w1
        JOIN (
          SELECT company_id, MIN(created_at) AS min_created_at
          FROM workspaces
          GROUP BY company_id
        ) first_ws ON first_ws.company_id = w1.company_id AND first_ws.min_created_at = w1.created_at
      ) fallback_ws ON fallback_ws.company_id = t.company_id
      SET t.workspace_id = fallback_ws.id
      WHERE t.workspace_id IS NULL
    `)

    await queryInterface.changeColumn('teams', 'workspace_id', { type: Sequelize.UUID, allowNull: false })
    await queryInterface.addIndex('teams', ['workspace_id'], { name: 'teams_workspace_idx' })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('teams', 'teams_workspace_idx').catch(() => {})
    await queryInterface.removeColumn('teams', 'workspace_id')
  },
}
