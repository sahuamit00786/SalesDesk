'use strict'

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName)
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition)
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const usersDesc = await queryInterface.describeTable('users')
    const usersIdType = String(usersDesc?.id?.type || '').toLowerCase()
    const userFkType = usersIdType.includes('int') ? Sequelize.INTEGER.UNSIGNED : Sequelize.UUID

    await addColumnIfMissing(queryInterface, 'leads', 'designation', { type: Sequelize.STRING(160), allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'street', { type: Sequelize.STRING(255), allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'city', { type: Sequelize.STRING(120), allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'state', { type: Sequelize.STRING(120), allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'country', { type: Sequelize.STRING(120), allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'postal_code', { type: Sequelize.STRING(32), allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'profile_meta', { type: Sequelize.JSON, allowNull: true })

    await queryInterface
      .createTable('lead_tasks', {
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
        title: { type: Sequelize.STRING(255), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        due_at: { type: Sequelize.DATE, allowNull: true },
        priority: { type: Sequelize.ENUM('low', 'medium', 'high'), allowNull: false, defaultValue: 'medium' },
        status: { type: Sequelize.ENUM('open', 'completed', 'cancelled'), allowNull: false, defaultValue: 'open' },
        completed_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: userFkType, allowNull: false },
        assigned_to: { type: userFkType, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      .catch(() => {})

    await queryInterface.addIndex('lead_tasks', ['lead_id', 'status'], { name: 'lead_tasks_lead_status_idx' }).catch(() => {})
    await queryInterface.addIndex('lead_tasks', ['workspace_id', 'company_id'], { name: 'lead_tasks_workspace_company_idx' }).catch(() => {})
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lead_tasks').catch(() => {})
  },
}
