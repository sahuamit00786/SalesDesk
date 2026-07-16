'use strict'

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName)
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition)
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lead_sources', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      name: { type: Sequelize.STRING(100), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      workspace_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'workspaces', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      company_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'companies', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    }).catch(() => {})

    await queryInterface.createTable('lead_stages', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      name: { type: Sequelize.STRING(100), allowNull: false },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      workspace_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'workspaces', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      company_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'companies', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    }).catch(() => {})

    await queryInterface.createTable('lead_status_categories', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      name: { type: Sequelize.STRING(100), allowNull: false },
      workspace_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'workspaces', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      company_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'companies', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    }).catch(() => {})

    await queryInterface.createTable('lead_statuses', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      name: { type: Sequelize.STRING(100), allowNull: false },
      category_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'lead_status_categories', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      workspace_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'workspaces', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      company_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'companies', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    }).catch(() => {})

    await queryInterface.createTable('lead_assignments', {
      lead_id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, references: { model: 'leads', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      user_id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    }).catch(() => {})

    await addColumnIfMissing(queryInterface, 'leads', 'source_id', { type: Sequelize.UUID, allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'lead_stage_id', { type: Sequelize.UUID, allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'lead_status_id', { type: Sequelize.UUID, allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'alt_phone', { type: Sequelize.STRING(32), allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'requirement', { type: Sequelize.TEXT, allowNull: true })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lead_assignments').catch(() => {})
    await queryInterface.dropTable('lead_statuses').catch(() => {})
    await queryInterface.dropTable('lead_status_categories').catch(() => {})
    await queryInterface.dropTable('lead_stages').catch(() => {})
    await queryInterface.dropTable('lead_sources').catch(() => {})
  },
}
