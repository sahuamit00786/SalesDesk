'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('tags')
    if (table.workspace_id && table.workspace_id.allowNull === false) {
      await queryInterface.changeColumn('tags', 'workspace_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'workspaces', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('tags')
    if (table.workspace_id && table.workspace_id.allowNull === true) {
      await queryInterface.changeColumn('tags', 'workspace_id', {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'workspaces', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    }
  },
}
