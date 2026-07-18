'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('workspaces').catch(() => null)
    if (!desc || desc.archived_at) return

    await queryInterface.addColumn('workspaces', 'archived_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('workspaces').catch(() => null)
    if (!desc || !desc.archived_at) return
    await queryInterface.removeColumn('workspaces', 'archived_at')
  },
}
