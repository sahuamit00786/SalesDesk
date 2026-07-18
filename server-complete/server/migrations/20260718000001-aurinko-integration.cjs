'use strict'

/**
 * Aurinko integration — Gmail (read+send) + Google Calendar (read+write) via
 * "Continue with Google", event-first / fetch-on-demand.
 *
 * Tables:
 *  - aurinko_accounts        one row per (company,user) connected account
 *  - aurinko_email_messages  METADATA per new email (cheap, always written)
 *  - aurinko_email_bodies    FULL content, lazily fetched on first open
 *  - aurinko_calendar_events cached calendar events (webhook-synced)
 *
 * NOTE: new_dump.sql already contains these tables AND this migration name in
 * SequelizeMeta, so restoring the dump requires no extra migration run. Fresh
 * (empty) environments get the same schema through this file on boot.
 */

async function tableExists(queryInterface, tableName) {
  try {
    await queryInterface.describeTable(tableName)
    return true
  } catch {
    return false
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const usersDesc = await queryInterface.describeTable('users')
    const usersIdType = String(usersDesc?.id?.type || '').toLowerCase()
    const userFkType = usersIdType.includes('char') ? Sequelize.CHAR(36) : usersIdType.includes('int') ? Sequelize.INTEGER.UNSIGNED : Sequelize.UUID

    if (!(await tableExists(queryInterface, 'aurinko_accounts'))) {
      await queryInterface.createTable('aurinko_accounts', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        user_id: {
          type: userFkType,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        aurinko_account_id: { type: Sequelize.STRING(64), allowNull: false },
        access_token: { type: Sequelize.TEXT, allowNull: false },
        service_type: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'Google' },
        email: { type: Sequelize.STRING(320), allowNull: true },
        name: { type: Sequelize.STRING(255), allowNull: true },
        scopes: { type: Sequelize.TEXT, allowNull: true },
        status: {
          type: Sequelize.ENUM('active', 'reauth_required', 'disconnected'),
          allowNull: false,
          defaultValue: 'active',
        },
        connected_from: { type: Sequelize.DATE, allowNull: false },
        email_subscription_id: { type: Sequelize.STRING(64), allowNull: true },
        email_subscription_at: { type: Sequelize.DATE, allowNull: true },
        calendar_subscription_id: { type: Sequelize.STRING(64), allowNull: true },
        calendar_subscription_at: { type: Sequelize.DATE, allowNull: true },
        calendar_id: { type: Sequelize.STRING(255), allowNull: true },
        last_webhook_at: { type: Sequelize.DATE, allowNull: true },
        last_error: { type: Sequelize.TEXT, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface
        .addIndex('aurinko_accounts', ['company_id', 'user_id'], { name: 'aurinko_accounts_company_user_uq', unique: true })
        .catch(() => {})
      await queryInterface
        .addIndex('aurinko_accounts', ['aurinko_account_id'], { name: 'aurinko_accounts_aurinko_id_idx' })
        .catch(() => {})
    }

    if (!(await tableExists(queryInterface, 'aurinko_email_messages'))) {
      await queryInterface.createTable('aurinko_email_messages', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        account_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'aurinko_accounts', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        company_id: { type: Sequelize.UUID, allowNull: false },
        user_id: { type: userFkType, allowNull: false },
        // CRM linkage — the ingest filter only stores messages matched to a
        // lead, and visibility scoping joins through these columns.
        lead_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'leads', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        workspace_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'workspaces', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        aurinko_message_id: { type: Sequelize.STRING(512), allowNull: false },
        thread_id: { type: Sequelize.STRING(512), allowNull: true },
        internet_message_id: { type: Sequelize.STRING(512), allowNull: true },
        folder: { type: Sequelize.ENUM('inbox', 'sent', 'other'), allowNull: false, defaultValue: 'inbox' },
        from_name: { type: Sequelize.STRING(255), allowNull: true },
        from_email: { type: Sequelize.STRING(320), allowNull: true },
        to_recipients: { type: Sequelize.JSON, allowNull: false },
        cc_recipients: { type: Sequelize.JSON, allowNull: false },
        bcc_recipients: { type: Sequelize.JSON, allowNull: false },
        subject: { type: Sequelize.STRING(512), allowNull: true },
        snippet: { type: Sequelize.TEXT, allowNull: true },
        received_at: { type: Sequelize.DATE(3), allowNull: false },
        has_attachments: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        is_deleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        sys_labels: { type: Sequelize.JSON, allowNull: true },
        has_full_content: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        source: { type: Sequelize.ENUM('webhook', 'send', 'manual'), allowNull: false, defaultValue: 'webhook' },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      // Prefix keys keep composite indexes under InnoDB's 3072-byte limit.
      await queryInterface.sequelize
        .query('ALTER TABLE `aurinko_email_messages` ADD UNIQUE KEY `aurinko_msgs_account_msg_uq` (`account_id`, `aurinko_message_id`(255))')
        .catch(() => {})
      await queryInterface
        .addIndex('aurinko_email_messages', ['account_id', 'folder', 'received_at'], { name: 'aurinko_msgs_account_folder_idx' })
        .catch(() => {})
      await queryInterface.sequelize
        .query('ALTER TABLE `aurinko_email_messages` ADD KEY `aurinko_msgs_thread_idx` (`account_id`, `thread_id`(191))')
        .catch(() => {})
      await queryInterface
        .addIndex('aurinko_email_messages', ['company_id', 'received_at'], { name: 'aurinko_msgs_company_idx' })
        .catch(() => {})
      await queryInterface
        .addIndex('aurinko_email_messages', ['lead_id', 'received_at'], { name: 'aurinko_msgs_lead_idx' })
        .catch(() => {})
      await queryInterface
        .addIndex('aurinko_email_messages', ['workspace_id', 'received_at'], { name: 'aurinko_msgs_workspace_idx' })
        .catch(() => {})
    }

    if (!(await tableExists(queryInterface, 'aurinko_email_bodies'))) {
      await queryInterface.createTable('aurinko_email_bodies', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        message_id: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          references: { model: 'aurinko_email_messages', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        body_html: { type: Sequelize.TEXT('long'), allowNull: true },
        body_text: { type: Sequelize.TEXT('long'), allowNull: true },
        attachments: { type: Sequelize.JSON, allowNull: false },
        raw_size_bytes: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        fetched_at: { type: Sequelize.DATE, allowNull: false },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
    }

    if (!(await tableExists(queryInterface, 'aurinko_calendar_events'))) {
      await queryInterface.createTable('aurinko_calendar_events', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        account_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'aurinko_accounts', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        company_id: { type: Sequelize.UUID, allowNull: false },
        user_id: { type: userFkType, allowNull: false },
        calendar_id: { type: Sequelize.STRING(255), allowNull: false },
        aurinko_event_id: { type: Sequelize.STRING(512), allowNull: false },
        subject: { type: Sequelize.STRING(512), allowNull: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        location: { type: Sequelize.STRING(512), allowNull: true },
        start_at: { type: Sequelize.DATE(3), allowNull: true },
        end_at: { type: Sequelize.DATE(3), allowNull: true },
        all_day: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        status: { type: Sequelize.STRING(40), allowNull: true },
        organizer_email: { type: Sequelize.STRING(320), allowNull: true },
        attendees: { type: Sequelize.JSON, allowNull: true },
        meeting_url: { type: Sequelize.STRING(1024), allowNull: true },
        deleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        raw: { type: Sequelize.JSON, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.sequelize
        .query('ALTER TABLE `aurinko_calendar_events` ADD UNIQUE KEY `aurinko_events_uq` (`account_id`, `calendar_id`(64), `aurinko_event_id`(191))')
        .catch(() => {})
      await queryInterface
        .addIndex('aurinko_calendar_events', ['account_id', 'start_at'], { name: 'aurinko_events_account_start_idx' })
        .catch(() => {})
      await queryInterface
        .addIndex('aurinko_calendar_events', ['company_id', 'start_at'], { name: 'aurinko_events_company_start_idx' })
        .catch(() => {})
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('aurinko_calendar_events').catch(() => {})
    await queryInterface.dropTable('aurinko_email_bodies').catch(() => {})
    await queryInterface.dropTable('aurinko_email_messages').catch(() => {})
    await queryInterface.dropTable('aurinko_accounts').catch(() => {})
  },
}
