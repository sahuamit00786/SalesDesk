'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */

async function columnExists(queryInterface, table, column) {
  const desc = await queryInterface.describeTable(table)
  return Boolean(desc[column])
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'campaigns', 'end_date'))) {
      await queryInterface.addColumn('campaigns', 'end_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      })
    }
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, 'campaigns', 'end_date')) {
      await queryInterface.removeColumn('campaigns', 'end_date')
    }
  },
}
