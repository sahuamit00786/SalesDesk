'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reminders', {
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
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      created_by: {
        type: Sequelize.CHAR(36),
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
    })

    await queryInterface.addIndex('reminders', ['company_id'])
    await queryInterface.addIndex('reminders', ['workspace_id'])
    await queryInterface.addIndex('reminders', ['owner_user_id'])
    await queryInterface.addIndex('reminders', ['remind_at'])
    await queryInterface.addIndex('reminders', ['status'])
    await queryInterface.addIndex('reminders', ['target_type', 'target_id'])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('reminders')
  },
}
