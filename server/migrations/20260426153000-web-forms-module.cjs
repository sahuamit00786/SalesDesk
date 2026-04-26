'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('web_forms', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      name: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.STRING(512), allowNull: true },
      public_token: { type: Sequelize.STRING(128), allowNull: false, unique: true },
      status: { type: Sequelize.ENUM('draft', 'active', 'paused', 'archived'), allowNull: false, defaultValue: 'draft' },
      form_title: { type: Sequelize.STRING(255), allowNull: true },
      form_subtitle: { type: Sequelize.STRING(500), allowNull: true },
      submit_button_text: { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'Submit' },
      primary_color: { type: Sequelize.STRING(16), allowNull: false, defaultValue: '#3b73f5' },
      font_family: { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'Plus Jakarta Sans' },
      border_radius: { type: Sequelize.ENUM('none', 'sm', 'md', 'lg'), allowNull: false, defaultValue: 'md' },
      thankyou_type: { type: Sequelize.ENUM('message', 'redirect'), allowNull: false, defaultValue: 'message' },
      thankyou_message: { type: Sequelize.TEXT, allowNull: false, defaultValue: 'Thank you! We will be in touch soon.' },
      thankyou_redirect_url: { type: Sequelize.STRING(1024), allowNull: true },
      display_type: { type: Sequelize.ENUM('inline', 'popup', 'slidein'), allowNull: false, defaultValue: 'inline' },
      popup_trigger: { type: Sequelize.ENUM('exit_intent', 'time_delay', 'scroll_depth', 'button_click'), allowNull: false, defaultValue: 'time_delay' },
      popup_delay: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
      popup_scroll_pct: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 50 },
      popup_button_selector: { type: Sequelize.STRING(200), allowNull: true },
      popup_overlay: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      popup_position: { type: Sequelize.ENUM('center', 'bottom-right', 'bottom-left', 'bottom-center'), allowNull: false, defaultValue: 'center' },
      default_status: { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'new' },
      default_source: { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'web_form' },
      default_assigned_to: { type: Sequelize.UUID, allowNull: true },
      auto_assign: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      recaptcha_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      recaptcha_site_key: { type: Sequelize.STRING(255), allowNull: true },
      recaptcha_secret_key: { type: Sequelize.STRING(255), allowNull: true },
      honeypot_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      total_submissions: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      total_views: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      allowed_domains: { type: Sequelize.JSON, allowNull: false, defaultValue: [] },
      auto_tags: { type: Sequelize.JSON, allowNull: false, defaultValue: [] },
      workspace_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'workspaces', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      created_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE },
      deleted_at: { allowNull: true, type: Sequelize.DATE },
    })

    await queryInterface.addIndex('web_forms', ['workspace_id', 'status'], { name: 'web_forms_workspace_status_idx' })
    await queryInterface.addIndex('web_forms', ['public_token'], { name: 'web_forms_public_token_idx', unique: true })

    await queryInterface.createTable('web_form_fields', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      form_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'web_forms', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      type: { type: Sequelize.ENUM('text', 'email', 'phone', 'number', 'textarea', 'select', 'multiselect', 'checkbox', 'radio', 'date', 'file', 'heading', 'paragraph', 'divider', 'hidden'), allowNull: false },
      label: { type: Sequelize.STRING(255), allowNull: true },
      placeholder: { type: Sequelize.STRING(255), allowNull: true },
      help_text: { type: Sequelize.STRING(255), allowNull: true },
      default_value: { type: Sequelize.STRING(500), allowNull: true },
      is_required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_hidden: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      order: { type: Sequelize.INTEGER, allowNull: false },
      width: { type: Sequelize.ENUM('full', 'half'), allowNull: false, defaultValue: 'full' },
      options: { type: Sequelize.JSON, allowNull: true },
      show_country_code: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      default_country_code: { type: Sequelize.STRING(8), allowNull: false, defaultValue: '+91' },
      min_length: { type: Sequelize.INTEGER, allowNull: true },
      max_length: { type: Sequelize.INTEGER, allowNull: true },
      min_value: { type: Sequelize.FLOAT, allowNull: true },
      max_value: { type: Sequelize.FLOAT, allowNull: true },
      pattern: { type: Sequelize.STRING(255), allowNull: true },
      pattern_error: { type: Sequelize.STRING(255), allowNull: true },
      crm_field: { type: Sequelize.STRING(120), allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE },
    })

    await queryInterface.addIndex('web_form_fields', ['form_id', 'order'], { name: 'web_form_fields_form_order_idx' })

    await queryInterface.createTable('web_form_submissions', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      form_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'web_forms', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      data: { type: Sequelize.JSON, allowNull: false },
      lead_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'leads', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      is_duplicate: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      duplicate_lead_id: { type: Sequelize.UUID, allowNull: true },
      spam_score: { type: Sequelize.FLOAT, allowNull: true },
      is_spam: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ip_address: { type: Sequelize.STRING(80), allowNull: true },
      user_agent: { type: Sequelize.STRING(512), allowNull: true },
      referrer_url: { type: Sequelize.STRING(1024), allowNull: true },
      submitted_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      workspace_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'workspaces', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      created_at: { allowNull: false, type: Sequelize.DATE },
    })
    await queryInterface.addIndex('web_form_submissions', ['form_id', 'submitted_at'], { name: 'web_form_submissions_form_submitted_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('web_form_submissions').catch(() => {})
    await queryInterface.dropTable('web_form_fields').catch(() => {})
    await queryInterface.dropTable('web_forms').catch(() => {})
  },
}
