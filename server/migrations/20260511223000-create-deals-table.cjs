'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('deals', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      workspace_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'workspaces', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      /** Funnel opportunity (`leads` row: is_opportunity, not a pipeline-only deal row). */
      opportunity_lead_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'leads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      value: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      value_currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' },
      stage: { type: Sequelize.STRING(80), allowNull: true },
      // Must match `users.id` (CHAR(36) after identifiers migration). Sequelize.UUID
      // can produce a different MySQL column type and breaks FK compatibility (deals_ibfk_4).
      assigned_to: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
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
      is_deleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    })
    await queryInterface.addIndex('deals', ['workspace_id'], { name: 'deals_workspace_id_idx' })
    await queryInterface.addIndex('deals', ['company_id'], { name: 'deals_company_id_idx' })
    await queryInterface.addIndex('deals', ['opportunity_lead_id'], { name: 'deals_opportunity_lead_id_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('deals')
  },
}
