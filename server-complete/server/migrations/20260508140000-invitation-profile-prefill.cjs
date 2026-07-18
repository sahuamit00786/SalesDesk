'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('invitations')
    if (!table.profile_prefill) {
      await queryInterface.addColumn('invitations', 'profile_prefill', {
        type: Sequelize.JSON,
        allowNull: true,
      })
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('invitations')
    if (table.profile_prefill) {
      await queryInterface.removeColumn('invitations', 'profile_prefill')
    }
  },
}
