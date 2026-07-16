'use strict'

const { addIndexIfMissing } = require('../migration-helpers.cjs')

const userIdType = 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci'

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()

    if (!tables.includes('chat_sessions')) {
      await queryInterface.createTable(
        'chat_sessions',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          company_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'companies',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          workspace_id: {
            type: Sequelize.UUID,
            allowNull: false,
          },
          user_id: {
            type: userIdType,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          title: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          resolved_entities: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          last_message_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        {
          charset: 'utf8mb4',
          collate: 'utf8mb4_0900_ai_ci',
        },
      )
    }

    if (!tables.includes('chat_messages')) {
      await queryInterface.createTable(
        'chat_messages',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          session_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'chat_sessions',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          company_id: {
            type: Sequelize.UUID,
            allowNull: false,
          },
          workspace_id: {
            type: Sequelize.UUID,
            allowNull: false,
          },
          role: {
            type: Sequelize.ENUM('user', 'assistant', 'tool', 'system'),
            allowNull: false,
          },
          content: {
            type: Sequelize.TEXT('long'),
            allowNull: true,
          },
          blocks: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          tool_name: {
            type: Sequelize.STRING(64),
            allowNull: true,
          },
          tool_args: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          tool_call_id: {
            type: Sequelize.STRING(64),
            allowNull: true,
          },
          status: {
            type: Sequelize.ENUM('complete', 'pending_disambiguation'),
            allowNull: false,
            defaultValue: 'complete',
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        {
          charset: 'utf8mb4',
          collate: 'utf8mb4_0900_ai_ci',
        },
      )
    }

    await addIndexIfMissing(queryInterface, 'chat_sessions', ['company_id'], { name: 'chat_sessions_company_id' })
    await addIndexIfMissing(queryInterface, 'chat_sessions', ['workspace_id', 'user_id', 'last_message_at'], {
      name: 'chat_sessions_workspace_user_lastmsg',
    })
    await addIndexIfMissing(queryInterface, 'chat_messages', ['session_id', 'created_at'], {
      name: 'chat_messages_session_created',
    })
    await addIndexIfMissing(queryInterface, 'chat_messages', ['workspace_id'], { name: 'chat_messages_workspace_id' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('chat_messages').catch(() => {})
    await queryInterface.dropTable('chat_sessions').catch(() => {})
  },
}
