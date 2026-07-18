'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()

    if (!tables.includes('user_workspaces')) {
      await queryInterface.createTable('user_workspaces', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        user_id: {
          type: 'CHAR(36) COLLATE utf8mb4_0900_ai_ci',
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        workspace_id: {
          type: 'CHAR(36) COLLATE utf8mb4_bin',
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      })
      await queryInterface.addIndex('user_workspaces', ['user_id'], { name: 'user_workspaces_user_idx' })
      await queryInterface.addIndex('user_workspaces', ['workspace_id'], { name: 'user_workspaces_workspace_idx' })
      await queryInterface.addIndex('user_workspaces', ['user_id', 'workspace_id'], {
        name: 'user_workspaces_user_workspace_uq',
        unique: true,
      })
    }

    const invitationsDesc = await queryInterface.describeTable('invitations').catch(() => null)
    if (invitationsDesc && !invitationsDesc.invited_workspace_ids) {
      await queryInterface.addColumn('invitations', 'invited_workspace_ids', {
        type: Sequelize.JSON,
        allowNull: true,
      })
    }
  },

  async down(queryInterface) {
    const invitationsDesc = await queryInterface.describeTable('invitations').catch(() => null)
    if (invitationsDesc?.invited_workspace_ids) {
      await queryInterface.removeColumn('invitations', 'invited_workspace_ids')
    }
    const tables = await queryInterface.showAllTables()
    if (tables.includes('user_workspaces')) {
      await queryInterface.dropTable('user_workspaces')
    }
  },
}
