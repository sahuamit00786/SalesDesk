'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */

async function columnExists(queryInterface, table, column) {
  const desc = await queryInterface.describeTable(table)
  return Boolean(desc[column])
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'campaigns', 'prefer_existing_team_assignee'))) {
      await queryInterface.addColumn('campaigns', 'prefer_existing_team_assignee', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      })
    }
    if (!(await columnExists(queryInterface, 'campaigns', 'skip_updating_lead_assigned_to'))) {
      await queryInterface.addColumn('campaigns', 'skip_updating_lead_assigned_to', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      })
    }
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, 'campaigns', 'prefer_existing_team_assignee')) {
      await queryInterface.removeColumn('campaigns', 'prefer_existing_team_assignee')
    }
    if (await columnExists(queryInterface, 'campaigns', 'skip_updating_lead_assigned_to')) {
      await queryInterface.removeColumn('campaigns', 'skip_updating_lead_assigned_to')
    }
  },
}
