'use strict'

async function tableExists(queryInterface, table) {
  const tables = await queryInterface.showAllTables()
  return tables.includes(table)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'activity_types'))) {
      await queryInterface.createTable('activity_types', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        key: { type: Sequelize.STRING(64), allowNull: false },
        name: { type: Sequelize.STRING(120), allowNull: false },
        icon: { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'Sparkles' },
        color: { type: Sequelize.STRING(32), allowNull: false, defaultValue: '#64748b' },
        description: { type: Sequelize.STRING(500), allowNull: true },
        is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      })
      await queryInterface.addIndex('activity_types', ['company_id', 'key'], {
        name: 'activity_types_company_key_uq',
        unique: true,
      })
    }

    if (!(await tableExists(queryInterface, 'activity_reminders'))) {
      await queryInterface.createTable('activity_reminders', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        activity_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'activities', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        created_by: {
          type: Sequelize.CHAR(36),
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        remind_at: { type: Sequelize.DATE, allowNull: false },
        channel_push: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        channel_email: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        status: { type: Sequelize.STRING(24), allowNull: false, defaultValue: 'pending' },
        sent_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      })
      await queryInterface.addIndex('activity_reminders', ['company_id', 'remind_at'], {
        name: 'activity_reminders_company_remindat_idx',
      })
      await queryInterface.addIndex('activity_reminders', ['activity_id'], {
        name: 'activity_reminders_activity_idx',
      })
    }

    if (!(await tableExists(queryInterface, 'activity_booking_links'))) {
      await queryInterface.createTable('activity_booking_links', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        user_id: {
          type: Sequelize.CHAR(36),
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        token: { type: Sequelize.STRING(120), allowNull: false, unique: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      })
      await queryInterface.addIndex('activity_booking_links', ['company_id', 'user_id'], {
        name: 'activity_booking_links_company_user_idx',
      })
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activity_booking_links').catch(() => {})
    await queryInterface.dropTable('activity_reminders').catch(() => {})
    await queryInterface.dropTable('activity_types').catch(() => {})
  },
}
