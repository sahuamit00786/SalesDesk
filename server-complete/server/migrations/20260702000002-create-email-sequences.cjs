'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    // email_sequences table
    await queryInterface.createTable('email_sequences', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      company_id: { type: Sequelize.UUID, allowNull: false },
      workspace_id: { type: Sequelize.UUID, allowNull: false },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      trigger_type: {
        type: Sequelize.ENUM('lead_created', 'status_changed', 'manual'),
        allowNull: false,
        defaultValue: 'manual'
      },
      trigger_value: { type: Sequelize.STRING(100), allowNull: true },
      exit_on_reply: { type: Sequelize.BOOLEAN, defaultValue: true },
      exit_on_status: { type: Sequelize.STRING(50), allowNull: true },
      status: { type: Sequelize.ENUM('draft', 'active', 'paused'), defaultValue: 'draft' },
      created_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    })

    // email_sequence_steps table
    await queryInterface.createTable('email_sequence_steps', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      sequence_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'email_sequences', key: 'id' }, onDelete: 'CASCADE'
      },
      step_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      delay_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      delay_hours: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      template_id: { type: Sequelize.UUID, allowNull: true },
      subject: { type: Sequelize.STRING(300), allowNull: true },
      body_html: { type: Sequelize.TEXT('long'), allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    })

    // email_sequence_enrollments table
    await queryInterface.createTable('email_sequence_enrollments', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      sequence_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'email_sequences', key: 'id' }, onDelete: 'CASCADE'
      },
      lead_id: { type: Sequelize.UUID, allowNull: false },
      company_id: { type: Sequelize.UUID, allowNull: false },
      current_step: { type: Sequelize.INTEGER, defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('active', 'completed', 'exited', 'failed'),
        defaultValue: 'active'
      },
      enrolled_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      next_send_at: { type: Sequelize.DATE, allowNull: true },
      exited_at: { type: Sequelize.DATE, allowNull: true },
      exit_reason: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    })

    await queryInterface.addIndex('email_sequence_enrollments', ['lead_id', 'sequence_id'], { name: 'idx_enrollments_lead_seq', unique: true })
    await queryInterface.addIndex('email_sequence_enrollments', ['next_send_at', 'status'], { name: 'idx_enrollments_next_send' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('email_sequence_enrollments')
    await queryInterface.dropTable('email_sequence_steps')
    await queryInterface.dropTable('email_sequences')
  }
}
