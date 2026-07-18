'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */

async function columnExists(queryInterface, table, column) {
  const desc = await queryInterface.describeTable(table).catch(() => null)
  return !!(desc && desc[column])
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'campaigns', 'lead_target'))) {
      await queryInterface.addColumn('campaigns', 'lead_target', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      })
    }
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, 'campaigns', 'lead_target')) {
      await queryInterface.removeColumn('campaigns', 'lead_target')
    }
  },
}
