'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('workspaces').catch(() => null)
    if (!desc || desc.description) return

    await queryInterface.addColumn('workspaces', 'description', {
      type: Sequelize.STRING(199),
      allowNull: true,
    })
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('workspaces').catch(() => null)
    if (!desc || !desc.description) return
    await queryInterface.removeColumn('workspaces', 'description')
  },
}
