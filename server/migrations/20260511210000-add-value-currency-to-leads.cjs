'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('leads', 'value_currency', {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('leads', 'value_currency')
  },
}
