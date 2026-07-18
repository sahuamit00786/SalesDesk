'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('deal_statuses', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      name: { type: Sequelize.STRING(100), allowNull: false },
      is_deal_complete_status: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      workspace_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'workspaces', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      company_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'companies', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    }).catch(() => {})

    await queryInterface.addIndex('deal_statuses', ['workspace_id', 'company_id'], {
      name: 'deal_statuses_workspace_company_idx',
    }).catch(() => {})

    await queryInterface.addIndex('deal_statuses', ['workspace_id', 'company_id', 'is_deal_complete_status'], {
      name: 'deal_statuses_complete_lookup_idx',
    }).catch(() => {})
  },

  async down(queryInterface) {
    await queryInterface.dropTable('deal_statuses').catch(() => {})
  },
}
