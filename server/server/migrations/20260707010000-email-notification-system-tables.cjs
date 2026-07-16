'use strict'

const userIdType = (Sequelize) => Sequelize.CHAR(36)
const companyIdType = (Sequelize) => Sequelize.UUID

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    const has = (name) => tables.some((t) => String(t).toLowerCase() === name)

    if (!has('company_email_settings')) {
      await queryInterface.createTable('company_email_settings', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
        company_id: {
          type: companyIdType(Sequelize),
          allowNull: false,
          unique: true,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        smtp_host: { type: Sequelize.STRING(255), allowNull: true },
        smtp_port: { type: Sequelize.INTEGER, allowNull: true },
        smtp_secure: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        smtp_user: { type: Sequelize.STRING(255), allowNull: true },
        smtp_pass_encrypted: { type: Sequelize.TEXT, allowNull: true },
        from_name: { type: Sequelize.STRING(160), allowNull: true },
        from_address: { type: Sequelize.STRING(255), allowNull: true },
        reply_to: { type: Sequelize.STRING(255), allowNull: true },
        is_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        last_verified_at: { type: Sequelize.DATE, allowNull: true },
        last_error: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      })
    }

    if (!has('role_notification_preferences')) {
      await queryInterface.createTable('role_notification_preferences', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
        company_id: {
          type: companyIdType(Sequelize),
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        role_kind: { type: Sequelize.STRING(40), allowNull: false },
        event_type: { type: Sequelize.STRING(80), allowNull: false },
        enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        email: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        in_app: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        digest_frequency: {
          type: Sequelize.ENUM('immediate', 'daily', 'weekly'),
          allowNull: false,
          defaultValue: 'immediate',
        },
        digest_hour: { type: Sequelize.INTEGER, allowNull: true },
        digest_minute: { type: Sequelize.INTEGER, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      })
      await queryInterface.addIndex('role_notification_preferences', ['company_id', 'role_kind', 'event_type'], {
        name: 'role_notification_preferences_unique',
        unique: true,
      })
    }

    if (!has('user_notification_preferences')) {
      await queryInterface.createTable('user_notification_preferences', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
        company_id: {
          type: companyIdType(Sequelize),
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        user_id: {
          type: userIdType(Sequelize),
          allowNull: false,
        },
        event_type: { type: Sequelize.STRING(80), allowNull: false },
        email: { type: Sequelize.BOOLEAN, allowNull: true },
        in_app: { type: Sequelize.BOOLEAN, allowNull: true },
        muted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      })
      // users.id is utf8mb4_0900_ai_ci while the DB default (used above) is utf8mb4_general_ci —
      // align collation before adding the FK, or MySQL rejects the constraint as "incompatible".
      await queryInterface.sequelize.query(
        'ALTER TABLE user_notification_preferences MODIFY user_id CHAR(36) COLLATE utf8mb4_0900_ai_ci NOT NULL',
      )
      await queryInterface.addConstraint('user_notification_preferences', {
        fields: ['user_id'],
        type: 'foreign key',
        name: 'user_notification_preferences_user_fk',
        references: { table: 'users', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      })
      await queryInterface.addIndex('user_notification_preferences', ['company_id', 'user_id', 'event_type'], {
        name: 'user_notification_preferences_unique',
        unique: true,
      })
    }

    if (!has('system_email_templates')) {
      await queryInterface.createTable('system_email_templates', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
        company_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        event_type: { type: Sequelize.STRING(80), allowNull: false },
        subject_template: { type: Sequelize.STRING(500), allowNull: false },
        body_html_template: { type: Sequelize.TEXT('long'), allowNull: false },
        variables_schema: { type: Sequelize.JSON, allowNull: false },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        updated_by: {
          type: userIdType(Sequelize),
          allowNull: true,
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      })
      await queryInterface.sequelize.query(
        'ALTER TABLE system_email_templates MODIFY updated_by CHAR(36) COLLATE utf8mb4_0900_ai_ci NULL',
      )
      await queryInterface.addConstraint('system_email_templates', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: 'system_email_templates_updated_by_fk',
        references: { table: 'users', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })
      await queryInterface.addIndex('system_email_templates', ['company_id', 'event_type'], {
        name: 'system_email_templates_company_event',
      })
    }

    const userTable = await queryInterface.describeTable('users')
    if (!userTable.last_login_ip) {
      await queryInterface.addColumn('users', 'last_login_ip', {
        type: Sequelize.STRING(64),
        allowNull: true,
      })
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('system_email_templates')
    await queryInterface.dropTable('user_notification_preferences')
    await queryInterface.dropTable('role_notification_preferences')
    await queryInterface.dropTable('company_email_settings')
    const userTable = await queryInterface.describeTable('users')
    if (userTable.last_login_ip) {
      await queryInterface.removeColumn('users', 'last_login_ip')
    }
  },
}
