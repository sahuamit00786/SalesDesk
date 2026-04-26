'use strict'

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName)
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition)
  }
}

async function addIndexIfMissing(queryInterface, tableName, fields, name) {
  const indexes = await queryInterface.showIndex(tableName)
  if (!indexes.some((idx) => idx.name === name)) {
    await queryInterface.addIndex(tableName, fields, { name })
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const usersDesc = await queryInterface.describeTable('users')
    const usersIdType = String(usersDesc?.id?.type || '').toLowerCase()
    const userFkType = usersIdType.includes('int') ? Sequelize.INTEGER.UNSIGNED : Sequelize.UUID

    await addColumnIfMissing(queryInterface, 'leads', 'contact_name', { type: Sequelize.STRING(255), allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'company', { type: Sequelize.STRING(255), allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'email', { type: Sequelize.STRING(255), allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'phone', { type: Sequelize.STRING(32), allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'value', { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
    await addColumnIfMissing(queryInterface, 'leads', 'status', {
      type: Sequelize.ENUM('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'junk'),
      allowNull: false,
      defaultValue: 'new',
    })
    await addColumnIfMissing(queryInterface, 'leads', 'source', {
      type: Sequelize.ENUM('web_form', 'manual', 'csv_import', 'api', 'referral', 'campaign', 'linkedin', 'cold_email', 'other'),
      allowNull: false,
      defaultValue: 'manual',
    })
    await addColumnIfMissing(queryInterface, 'leads', 'score', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 })
    await addColumnIfMissing(queryInterface, 'leads', 'assigned_to', {
      type: userFkType,
      allowNull: true,
    })
    await addColumnIfMissing(queryInterface, 'leads', 'closing_date', { type: Sequelize.DATEONLY, allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'notes', { type: Sequelize.TEXT, allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'lost_reason', { type: Sequelize.STRING(255), allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'is_deleted', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false })
    await addColumnIfMissing(queryInterface, 'leads', 'deleted_at', { type: Sequelize.DATE, allowNull: true })

    await addIndexIfMissing(queryInterface, 'leads', ['workspace_id', 'status'], 'leads_workspace_status_idx')
    await addIndexIfMissing(queryInterface, 'leads', ['workspace_id', 'source'], 'leads_workspace_source_idx')
    await addIndexIfMissing(queryInterface, 'leads', ['workspace_id', 'assigned_to'], 'leads_workspace_assigned_idx')
    await addIndexIfMissing(queryInterface, 'leads', ['workspace_id', 'score'], 'leads_workspace_score_idx')
    await addIndexIfMissing(queryInterface, 'leads', ['workspace_id', 'value'], 'leads_workspace_value_idx')

    await queryInterface.createTable('activities', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      type: { type: Sequelize.ENUM('note', 'call', 'email', 'meeting', 'task', 'status_change', 'assignment', 'system'), allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      lead_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'leads', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      user_id: { type: userFkType, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
    }).catch(() => {})

    await queryInterface.createTable('tags', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      name: { type: Sequelize.STRING(80), allowNull: false },
      color: { type: Sequelize.STRING(16), allowNull: false, defaultValue: '#3b73f5' },
      workspace_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'workspaces', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      company_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'companies', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE },
    }).catch(() => {})

    await queryInterface.createTable('lead_tags', {
      lead_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'leads', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE', primaryKey: true },
      tag_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tags', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE', primaryKey: true },
    }).catch(() => {})

    await queryInterface.createTable('saved_views', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      name: { type: Sequelize.STRING(120), allowNull: false },
      filters: { type: Sequelize.JSON, allowNull: false },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      user_id: { type: userFkType, allowNull: false },
      workspace_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'workspaces', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      company_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'companies', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE },
    }).catch(() => {})

    await queryInterface.createTable('assignment_rules', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      name: { type: Sequelize.STRING(120), allowNull: false },
      type: { type: Sequelize.ENUM('round_robin', 'territory', 'tag', 'capacity'), allowNull: false },
      conditions: { type: Sequelize.JSON, allowNull: false },
      assignees: { type: Sequelize.JSON, allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      workspace_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'workspaces', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      company_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'companies', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      priority: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 100 },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE },
    }).catch(() => {})

    await queryInterface.createTable('custom_fields', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      label: { type: Sequelize.STRING(120), allowNull: false },
      key: { type: Sequelize.STRING(120), allowNull: false },
      type: { type: Sequelize.ENUM('text', 'number', 'date', 'dropdown', 'checkbox'), allowNull: false },
      options: { type: Sequelize.JSON, allowNull: true },
      is_required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      workspace_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'workspaces', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      company_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'companies', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE },
    }).catch(() => {})

    await queryInterface.createTable('custom_field_values', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      custom_field_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'custom_fields', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      lead_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'leads', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      value: { type: Sequelize.TEXT, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
    }).catch(() => {})

    await queryInterface.createTable('lead_files', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      lead_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'leads', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      user_id: { type: userFkType, allowNull: false },
      file_name: { type: Sequelize.STRING(255), allowNull: false },
      file_url: { type: Sequelize.STRING(512), allowNull: false },
      mime_type: { type: Sequelize.STRING(120), allowNull: true },
      size_bytes: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
    }).catch(() => {})
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lead_files').catch(() => {})
    await queryInterface.dropTable('custom_field_values').catch(() => {})
    await queryInterface.dropTable('custom_fields').catch(() => {})
    await queryInterface.dropTable('assignment_rules').catch(() => {})
    await queryInterface.dropTable('saved_views').catch(() => {})
    await queryInterface.dropTable('lead_tags').catch(() => {})
    await queryInterface.dropTable('tags').catch(() => {})
    await queryInterface.dropTable('activities').catch(() => {})
  },
}
