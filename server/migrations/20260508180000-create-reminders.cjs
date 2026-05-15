'use strict'

const { addIndexIfMissing } = require('../migration-helpers.cjs')

const userIdType = 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci'

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('reminders')) {
      await queryInterface.createTable(
        'reminders',
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
          owner_user_id: {
            type: userIdType,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'SET NULL',
          },
          created_by: {
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
            allowNull: false,
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          remind_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          status: {
            type: Sequelize.ENUM('pending', 'done', 'dismissed'),
            allowNull: false,
            defaultValue: 'pending',
          },
          completed_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          target_type: {
            type: Sequelize.ENUM('general', 'lead', 'opportunity', 'meeting', 'task', 'followup'),
            allowNull: false,
            defaultValue: 'general',
          },
          target_id: {
            type: Sequelize.UUID,
            allowNull: true,
          },
          color: {
            type: Sequelize.STRING(7),
            allowNull: true,
            defaultValue: '#f43f5e',
          },
          channel_push: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          channel_email: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        {
          charset: 'utf8mb4',
          collate: 'utf8mb4_0900_ai_ci',
        },
      )
    }

    await addIndexIfMissing(queryInterface, 'reminders', ['company_id'], { name: 'reminders_company_id' })
    await addIndexIfMissing(queryInterface, 'reminders', ['workspace_id'], { name: 'reminders_workspace_id' })
    await addIndexIfMissing(queryInterface, 'reminders', ['owner_user_id'], { name: 'reminders_owner_user_id' })
    await addIndexIfMissing(queryInterface, 'reminders', ['remind_at'], { name: 'reminders_remind_at' })
    await addIndexIfMissing(queryInterface, 'reminders', ['status'], { name: 'reminders_status' })
    await addIndexIfMissing(queryInterface, 'reminders', ['target_type', 'target_id'], {
      name: 'reminders_target_type_target_id',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reminders').catch(() => {})
  },
}
