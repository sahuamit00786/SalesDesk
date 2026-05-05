'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('opportunities', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('(UUID())') },
      company_id: {
        type: Sequelize.UUID,
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
      lead_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'leads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      owner_user_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_by: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      updated_by: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      full_name: { type: Sequelize.STRING(255), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: true },
      phone_number: { type: Sequelize.STRING(64), allowNull: true },
      direct_phone: { type: Sequelize.STRING(64), allowNull: true },
      job_title: { type: Sequelize.STRING(160), allowNull: true },

      company_name: { type: Sequelize.STRING(255), allowNull: false },
      industry: { type: Sequelize.STRING(160), allowNull: true },
      company_size: { type: Sequelize.STRING(80), allowNull: true },
      employee_range: { type: Sequelize.STRING(80), allowNull: true },
      website: { type: Sequelize.STRING(255), allowNull: true },
      linkedin: { type: Sequelize.STRING(255), allowNull: true },
      location: { type: Sequelize.STRING(160), allowNull: true },
      timezone: { type: Sequelize.STRING(80), allowNull: true },

      deal_value: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      current_stage: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'Lead Inbound' },
      lead_score: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      tags: { type: Sequelize.JSON, allowNull: true },

      last_activity_type: { type: Sequelize.STRING(80), allowNull: true },
      last_activity_text: { type: Sequelize.TEXT, allowNull: true },
      last_activity_at: { type: Sequelize.DATE, allowNull: true },

      is_deleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    })

    await queryInterface.addIndex('opportunities', ['company_id', 'workspace_id'], { name: 'opportunities_company_workspace_idx' })
    await queryInterface.addIndex('opportunities', ['company_id', 'current_stage'], { name: 'opportunities_company_stage_idx' })
    await queryInterface.addIndex('opportunities', ['owner_user_id'], { name: 'opportunities_owner_idx' })
    await queryInterface.addIndex('opportunities', ['lead_id'], { name: 'opportunities_lead_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('opportunities')
  },
}

