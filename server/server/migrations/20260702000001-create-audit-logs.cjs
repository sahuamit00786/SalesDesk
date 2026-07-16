'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      company_id: { type: Sequelize.UUID, allowNull: true },
      user_id: { type: Sequelize.UUID, allowNull: true },
      user_email: { type: Sequelize.STRING(255), allowNull: true },
      action: { type: Sequelize.STRING(100), allowNull: false },
      resource_type: { type: Sequelize.STRING(50), allowNull: true },
      resource_id: { type: Sequelize.STRING(36), allowNull: true },
      old_values: { type: Sequelize.TEXT('long'), allowNull: true },
      new_values: { type: Sequelize.TEXT('long'), allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      status_code: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    })
    await queryInterface.addIndex('audit_logs', ['company_id', 'created_at'], { name: 'idx_audit_company_date' })
    await queryInterface.addIndex('audit_logs', ['user_id', 'created_at'], { name: 'idx_audit_user_date' })
    await queryInterface.addIndex('audit_logs', ['resource_type', 'resource_id'], { name: 'idx_audit_resource' })
  },
  async down(queryInterface) { await queryInterface.dropTable('audit_logs') }
}
