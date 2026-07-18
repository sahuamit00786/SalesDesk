'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('duplicate_leads')) return

    await queryInterface.createTable('duplicate_leads', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      lead_data: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      matched_lead_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'leads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      matched_lead_title: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      match_field: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      source: {
        type: Sequelize.ENUM('manual', 'csv_import', 'opportunity'),
        allowNull: false,
        defaultValue: 'manual',
      },
      status: {
        type: Sequelize.ENUM('pending', 'merged', 'created', 'deleted'),
        allowNull: false,
        defaultValue: 'pending',
      },
      workspace_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'workspaces', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_by_user_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    await queryInterface.addIndex('duplicate_leads', ['workspace_id', 'status', 'is_deleted'])
    await queryInterface.addIndex('duplicate_leads', ['matched_lead_id'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('duplicate_leads')
  },
}
