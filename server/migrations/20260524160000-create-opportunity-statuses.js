export default {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('opportunity_statuses')) return
    await queryInterface.createTable('opportunity_statuses', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(80), allowNull: false },
      is_initial: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      workspace_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'workspaces', key: 'id' }, onDelete: 'CASCADE' },
      company_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'companies', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    })
    await queryInterface.addIndex('opportunity_statuses', ['workspace_id'], { name: 'opportunity_statuses_workspace_id' })
    await queryInterface.addIndex('opportunity_statuses', ['company_id'], { name: 'opportunity_statuses_company_id' })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('opportunity_statuses')
  },
}
