'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('campaigns', 'status', {
      type: Sequelize.ENUM('active', 'inactive', 'draft', 'archived'),
      allowNull: false,
      defaultValue: 'active',
    })
    await queryInterface.sequelize.query("UPDATE campaigns SET status='inactive' WHERE status='archived'")
    await queryInterface.changeColumn('campaigns', 'status', {
      type: Sequelize.ENUM('active', 'inactive', 'draft'),
      allowNull: false,
      defaultValue: 'active',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('campaigns', 'status', {
      type: Sequelize.ENUM('active', 'archived'),
      allowNull: false,
      defaultValue: 'active',
    })
    await queryInterface.sequelize.query("UPDATE campaigns SET status='archived' WHERE status='inactive'")
  },
}
