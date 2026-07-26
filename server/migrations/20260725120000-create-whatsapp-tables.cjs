'use strict'

const { addIndexIfMissing } = require('../migration-helpers.cjs')

const userIdType = 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci'

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()

    if (!tables.includes('company_whatsapp_settings')) {
      await queryInterface.createTable(
        'company_whatsapp_settings',
        {
          id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
          company_id: {
            type: Sequelize.UUID,
            allowNull: false,
            unique: true,
            references: { model: 'companies', key: 'id' },
            onDelete: 'CASCADE',
          },
          phone_number_id: { type: Sequelize.STRING(64), allowNull: true },
          waba_id: { type: Sequelize.STRING(64), allowNull: true },
          display_phone_number: { type: Sequelize.STRING(32), allowNull: true },
          verified_name: { type: Sequelize.STRING(255), allowNull: true },
          access_token_encrypted: { type: Sequelize.TEXT, allowNull: true },
          app_secret_encrypted: { type: Sequelize.TEXT, allowNull: true },
          webhook_verify_token: { type: Sequelize.STRING(128), allowNull: true },
          status: {
            type: Sequelize.ENUM('not_configured', 'pending_verification', 'verified', 'error'),
            allowNull: false,
            defaultValue: 'not_configured',
          },
          is_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          last_verified_at: { type: Sequelize.DATE, allowNull: true },
          last_error: { type: Sequelize.TEXT, allowNull: true },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        },
        { charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci' },
      )
    }

    if (!tables.includes('whatsapp_conversations')) {
      await queryInterface.createTable(
        'whatsapp_conversations',
        {
          id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
          company_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'companies', key: 'id' },
            onDelete: 'CASCADE',
          },
          wa_phone_number: { type: Sequelize.STRING(32), allowNull: false },
          wa_phone_digits: { type: Sequelize.STRING(10), allowNull: true },
          contact_name: { type: Sequelize.STRING(255), allowNull: true },
          // Soft reference only (matched by phone digits, not FK-enforced) — a lead
          // may be deleted/reassigned independently of the conversation history.
          lead_id: { type: Sequelize.UUID, allowNull: true },
          workspace_id: { type: Sequelize.UUID, allowNull: true },
          last_message_at: { type: Sequelize.DATE, allowNull: true },
          last_message_direction: { type: Sequelize.ENUM('inbound', 'outbound'), allowNull: true },
          last_message_preview: { type: Sequelize.STRING(255), allowNull: true },
          unread_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        },
        { charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci' },
      )
    }

    if (!tables.includes('whatsapp_messages')) {
      await queryInterface.createTable(
        'whatsapp_messages',
        {
          id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
          company_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'companies', key: 'id' },
            onDelete: 'CASCADE',
          },
          conversation_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'whatsapp_conversations', key: 'id' },
            onDelete: 'CASCADE',
          },
          direction: { type: Sequelize.ENUM('inbound', 'outbound'), allowNull: false },
          wa_message_id: { type: Sequelize.STRING(128), allowNull: true },
          type: {
            type: Sequelize.ENUM(
              'text',
              'image',
              'video',
              'audio',
              'document',
              'sticker',
              'location',
              'contact',
              'template',
              'interactive',
              'button',
              'reaction',
              'unknown',
            ),
            allowNull: false,
            defaultValue: 'unknown',
          },
          text_body: { type: Sequelize.TEXT, allowNull: true },
          media_id: { type: Sequelize.STRING(128), allowNull: true },
          media_url: { type: Sequelize.STRING(500), allowNull: true },
          mime_type: { type: Sequelize.STRING(100), allowNull: true },
          file_name: { type: Sequelize.STRING(255), allowNull: true },
          file_size: { type: Sequelize.INTEGER, allowNull: true },
          caption: { type: Sequelize.TEXT, allowNull: true },
          latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
          longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
          location_name: { type: Sequelize.STRING(255), allowNull: true },
          status: {
            type: Sequelize.ENUM('queued', 'sent', 'delivered', 'read', 'failed', 'received'),
            allowNull: false,
            defaultValue: 'queued',
          },
          error_message: { type: Sequelize.TEXT, allowNull: true },
          raw_payload: { type: Sequelize.JSON, allowNull: true },
          sent_by_user_id: {
            type: userIdType,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL',
          },
          wa_timestamp: { type: Sequelize.DATE, allowNull: true },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        },
        { charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci' },
      )
    }

    await addIndexIfMissing(queryInterface, 'whatsapp_conversations', ['company_id', 'wa_phone_number'], {
      name: 'whatsapp_conversations_company_phone_uq',
      unique: true,
    })
    await addIndexIfMissing(queryInterface, 'whatsapp_conversations', ['company_id', 'wa_phone_digits'], {
      name: 'whatsapp_conversations_company_phone_digits',
    })
    await addIndexIfMissing(queryInterface, 'whatsapp_conversations', ['lead_id'], {
      name: 'whatsapp_conversations_lead_id',
    })
    await addIndexIfMissing(queryInterface, 'whatsapp_conversations', ['company_id', 'last_message_at'], {
      name: 'whatsapp_conversations_company_lastmsg',
    })

    await addIndexIfMissing(queryInterface, 'whatsapp_messages', ['company_id', 'wa_message_id'], {
      name: 'whatsapp_messages_company_wamsgid_uq',
      unique: true,
    })
    await addIndexIfMissing(queryInterface, 'whatsapp_messages', ['conversation_id', 'created_at'], {
      name: 'whatsapp_messages_conversation_created',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('whatsapp_messages').catch(() => {})
    await queryInterface.dropTable('whatsapp_conversations').catch(() => {})
    await queryInterface.dropTable('company_whatsapp_settings').catch(() => {})
  },
}
