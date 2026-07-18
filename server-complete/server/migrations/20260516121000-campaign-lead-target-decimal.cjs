'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('campaigns', 'lead_target', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: true,
      defaultValue: null,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('campaigns', 'lead_target', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    })
  },
}
