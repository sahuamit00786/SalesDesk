'use strict'

const userIdType = (Sequelize) => Sequelize.CHAR(36)
const companyIdType = (Sequelize) => Sequelize.UUID

module.exports = {
  async up(queryInterface, Sequelize) {
    const companyTable = await queryInterface.describeTable('companies')
    if (!companyTable.notification_email_settings) {
      await queryInterface.addColumn('companies', 'notification_email_settings', {
        type: Sequelize.JSON,
        allowNull: true,
      })
    }

    const tables = await queryInterface.showAllTables()
    const hasLogTable = tables.some(
      (t) => String(t).toLowerCase() === 'notification_delivery_logs',
    )
    if (hasLogTable) return

    await queryInterface.createTable('notification_delivery_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      company_id: {
        type: companyIdType(Sequelize),
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      workspace_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'workspaces', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      recipient_user_id: {
        type: userIdType(Sequelize),
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      actor_user_id: {
        type: userIdType(Sequelize),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      event_type: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      channel: {
        type: Sequelize.ENUM('email', 'in_app'),
        allowNull: false,
        defaultValue: 'email',
      },
      status: {
        type: Sequelize.ENUM('queued', 'sent', 'failed', 'skipped'),
        allowNull: false,
        defaultValue: 'queued',
      },
      subject: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      recipient_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      job_id: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      sent_at: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    })

    await queryInterface.addIndex('notification_delivery_logs', ['company_id', 'created_at'], {
      name: 'notification_delivery_logs_company_created',
    })
    await queryInterface.addIndex('notification_delivery_logs', ['recipient_user_id', 'created_at'], {
      name: 'notification_delivery_logs_recipient_created',
    })
    await queryInterface.addIndex('notification_delivery_logs', ['event_type'], {
      name: 'notification_delivery_logs_event_type',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notification_delivery_logs')
    await queryInterface.removeColumn('companies', 'notification_email_settings')
  },
}
