'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('scoring_rules', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      company_id: { type: Sequelize.UUID, allowNull: false },
      workspace_id: { type: Sequelize.UUID, allowNull: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      rule_type: {
        type: Sequelize.ENUM('field', 'activity', 'email', 'meeting'),
        allowNull: false
      },
      field_name: { type: Sequelize.STRING(100), allowNull: true },
      operator: {
        type: Sequelize.ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'exists'),
        allowNull: false
      },
      value: { type: Sequelize.STRING(255), allowNull: true },
      points: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    })
    await queryInterface.addIndex('scoring_rules', ['company_id', 'is_active'], { name: 'idx_scoring_rules_company' })
  },
  async down(queryInterface) { await queryInterface.dropTable('scoring_rules') }
}
