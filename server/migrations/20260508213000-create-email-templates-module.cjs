'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface
      .createTable('email_templates', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
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
        created_by: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        name: { type: Sequelize.STRING(255), allowNull: false },
        subject: { type: Sequelize.STRING(500), allowNull: false, defaultValue: '' },
        body_html: { type: Sequelize.TEXT('long'), allowNull: false },
        category: {
          type: Sequelize.ENUM('cold_outreach', 'follow_up', 'proposal', 're_engagement'),
          allowNull: false,
          defaultValue: 'cold_outreach',
        },
        tags: { type: Sequelize.JSON, allowNull: false, defaultValue: [] },
        attachments: { type: Sequelize.JSON, allowNull: false, defaultValue: [] },
        throttle_per_hour: { type: Sequelize.INTEGER, allowNull: true },
        schedule_at: { type: Sequelize.DATE, allowNull: true },
        auto_unsubscribe_link: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        skip_if_already_sent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
        is_archived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        archived_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      .catch(() => {})

    await queryInterface
      .addIndex('email_templates', ['company_id', 'workspace_id'], { name: 'email_templates_company_workspace_idx' })
      .catch(() => {})
    await queryInterface.addIndex('email_templates', ['category'], { name: 'email_templates_category_idx' }).catch(() => {})
    await queryInterface.addIndex('email_templates', ['is_archived'], { name: 'email_templates_is_archived_idx' }).catch(() => {})

    await queryInterface
      .createTable('lead_email_logs', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
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
        lead_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'leads', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        template_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'email_templates', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        template_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
        subject: { type: Sequelize.STRING(500), allowNull: true },
        body_html: { type: Sequelize.TEXT('long'), allowNull: true },
        to_email: { type: Sequelize.STRING(255), allowNull: true },
        send_error: { type: Sequelize.TEXT, allowNull: true },
        sent_at: { type: Sequelize.DATE, allowNull: true },
        opened_at: { type: Sequelize.DATE, allowNull: true },
        clicked_at: { type: Sequelize.DATE, allowNull: true },
        replied_at: { type: Sequelize.DATE, allowNull: true },
        bounced: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        unsubscribed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        status: {
          type: Sequelize.ENUM('drafted', 'sent', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed'),
          allowNull: false,
          defaultValue: 'drafted',
        },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      .catch(() => {})

    await queryInterface
      .addIndex('lead_email_logs', ['lead_id', 'template_id', 'template_version'], {
        unique: true,
        name: 'lead_email_logs_lead_template_version_uq',
      })
      .catch(() => {})
    await queryInterface
      .addIndex('lead_email_logs', ['template_id', 'sent_at'], { name: 'lead_email_logs_template_sent_idx' })
      .catch(() => {})
    await queryInterface.addIndex('lead_email_logs', ['status'], { name: 'lead_email_logs_status_idx' }).catch(() => {})

    await queryInterface
      .createTable('email_suppressions', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        workspace_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'workspaces', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        lead_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'leads', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        email: { type: Sequelize.STRING(255), allowNull: false },
        reason: { type: Sequelize.STRING(120), allowNull: false, defaultValue: 'unsubscribe' },
        source: { type: Sequelize.STRING(120), allowNull: false, defaultValue: 'tracking_link' },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      .catch(() => {})

    await queryInterface
      .addIndex('email_suppressions', ['company_id', 'email'], {
        unique: true,
        name: 'email_suppressions_company_email_uq',
      })
      .catch(() => {})
    await queryInterface.addIndex('email_suppressions', ['lead_id'], { name: 'email_suppressions_lead_idx' }).catch(() => {})
  },

  async down(queryInterface) {
    await queryInterface.dropTable('email_suppressions').catch(() => {})
    await queryInterface.dropTable('lead_email_logs').catch(() => {})
    await queryInterface.dropTable('email_templates').catch(() => {})
  },
}
