'use strict'

// This migration adds resource_type and resource_id columns to notifications
// if they don't already exist, and adds body column (the table may already exist
// from the original notifications migration).
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    const hasTable = tables.some((t) => String(t).toLowerCase() === 'notifications')

    if (!hasTable) {
      await queryInterface.createTable('notifications', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        type: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'info',
        },
        title: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        resource_type: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        resource_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        is_read: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        link: {
          type: Sequelize.STRING(512),
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      })
    } else {
      // Table already exists — add missing columns if needed
      const cols = await queryInterface.describeTable('notifications')

      if (!cols.resource_type) {
        await queryInterface.addColumn('notifications', 'resource_type', {
          type: Sequelize.STRING(50),
          allowNull: true,
          after: 'message',
        })
      }
      if (!cols.resource_id) {
        await queryInterface.addColumn('notifications', 'resource_id', {
          type: Sequelize.UUID,
          allowNull: true,
          after: 'resource_type',
        })
      }
    }

    // Add indexes safely
    try {
      await queryInterface.addIndex('notifications', ['user_id', 'is_read'], {
        name: 'idx_notifications_user_read',
      })
    } catch (e) {
      if (!e.message?.includes('Duplicate') && !e.message?.includes('already exists')) throw e
    }

    try {
      await queryInterface.addIndex('notifications', ['user_id', 'created_at'], {
        name: 'idx_notifications_user_date',
      })
    } catch (e) {
      if (!e.message?.includes('Duplicate') && !e.message?.includes('already exists')) throw e
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex('notifications', 'idx_notifications_user_read')
    } catch {}
    try {
      await queryInterface.removeIndex('notifications', 'idx_notifications_user_date')
    } catch {}
    try {
      await queryInterface.removeColumn('notifications', 'resource_type')
    } catch {}
    try {
      await queryInterface.removeColumn('notifications', 'resource_id')
    } catch {}
  },
}
