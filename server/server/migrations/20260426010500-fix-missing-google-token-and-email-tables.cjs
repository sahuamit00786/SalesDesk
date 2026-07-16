'use strict'

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

    const hasGoogleTokens = await tableExists(queryInterface, 'company_google_tokens')
    if (!hasGoogleTokens) {
      await queryInterface.createTable('company_google_tokens', {
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
        email: { type: Sequelize.STRING(255), allowNull: true },
        access_token: { type: Sequelize.TEXT('long'), allowNull: true },
        refresh_token: { type: Sequelize.TEXT('long'), allowNull: true },
        scope: { type: Sequelize.TEXT, allowNull: true },
        token_type: { type: Sequelize.STRING(80), allowNull: true },
        expiry_date: { type: Sequelize.BIGINT, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('company_google_tokens', ['company_id'], { name: 'company_google_tokens_company_idx' }).catch(() => {})
      await queryInterface.addIndex('company_google_tokens', ['user_id'], { name: 'company_google_tokens_user_idx' }).catch(() => {})
    }

    const hasLeadEmails = await tableExists(queryInterface, 'lead_emails')
    if (!hasLeadEmails) {
      await queryInterface.createTable('lead_emails', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        lead_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'leads', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        workspace_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        created_by: {
          type: userFkType,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        direction: { type: Sequelize.ENUM('outbound', 'inbound'), allowNull: false, defaultValue: 'outbound' },
        status: { type: Sequelize.ENUM('draft', 'queued', 'sent', 'failed'), allowNull: false, defaultValue: 'queued' },
        subject: { type: Sequelize.STRING(255), allowNull: true },
        body_html: { type: Sequelize.TEXT('long'), allowNull: true },
        body_text: { type: Sequelize.TEXT('long'), allowNull: true },
        to_recipients: { type: Sequelize.JSON, allowNull: false },
        cc_recipients: { type: Sequelize.JSON, allowNull: false },
        bcc_recipients: { type: Sequelize.JSON, allowNull: false },
        attachments: { type: Sequelize.JSON, allowNull: false, defaultValue: [] },
        provider: { type: Sequelize.STRING(40), allowNull: true },
        provider_message_id: { type: Sequelize.STRING(255), allowNull: true },
        thread_id: { type: Sequelize.STRING(255), allowNull: true },
        error_message: { type: Sequelize.TEXT, allowNull: true },
        sent_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('lead_emails', ['lead_id', 'created_at'], { name: 'lead_emails_lead_created_idx' }).catch(() => {})
      await queryInterface.addIndex('lead_emails', ['company_id', 'workspace_id'], { name: 'lead_emails_company_workspace_idx' }).catch(() => {})
      await queryInterface.addIndex('lead_emails', ['provider_message_id'], { name: 'lead_emails_provider_message_idx' }).catch(() => {})
    }
  },

  async down() {},
}
