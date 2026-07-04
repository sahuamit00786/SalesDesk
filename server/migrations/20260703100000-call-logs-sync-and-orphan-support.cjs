'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('call_logs', 'company_id', { type: Sequelize.UUID, allowNull: true }).catch(() => {})
    await queryInterface.addColumn('call_logs', 'workspace_id', { type: Sequelize.UUID, allowNull: true }).catch(() => {})
    await queryInterface.addColumn('call_logs', 'caller_name', { type: Sequelize.STRING(255), allowNull: true }).catch(() => {})
    await queryInterface.addColumn('call_logs', 'phone_number', { type: Sequelize.STRING(32), allowNull: true }).catch(() => {})
    await queryInterface
      .addColumn('call_logs', 'source', { type: Sequelize.ENUM('manual', 'device_sync'), allowNull: false, defaultValue: 'manual' })
      .catch(() => {})

    // Backfill company/workspace from the (currently always-present) linked lead.
    await queryInterface.sequelize
      .query(
        `UPDATE call_logs
         JOIN leads ON leads.id = call_logs.lead_id
         SET call_logs.company_id = leads.company_id, call_logs.workspace_id = leads.workspace_id
         WHERE call_logs.company_id IS NULL`,
      )
      .catch(() => {})

    await queryInterface.sequelize.query('ALTER TABLE call_logs MODIFY COLUMN company_id CHAR(36) NOT NULL').catch(() => {})
    await queryInterface.changeColumn('call_logs', 'lead_id', { type: Sequelize.UUID, allowNull: true }).catch(() => {})

    await queryInterface.addIndex('call_logs', ['company_id'], { name: 'call_logs_company_idx' }).catch(() => {})
    await queryInterface.addIndex('call_logs', ['phone_number'], { name: 'call_logs_phone_idx' }).catch(() => {})

    await queryInterface.sequelize
      .query(
        "ALTER TABLE leads MODIFY COLUMN source ENUM('web_form','manual','csv_import','api','referral','campaign','linkedin','cold_email','other','call_log') NOT NULL",
      )
      .catch(() => {})
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize
      .query(
        "ALTER TABLE leads MODIFY COLUMN source ENUM('web_form','manual','csv_import','api','referral','campaign','linkedin','cold_email','other') NOT NULL",
      )
      .catch(() => {})
    await queryInterface.removeIndex('call_logs', 'call_logs_phone_idx').catch(() => {})
    await queryInterface.removeIndex('call_logs', 'call_logs_company_idx').catch(() => {})
    await queryInterface.changeColumn('call_logs', 'lead_id', { type: Sequelize.UUID, allowNull: false }).catch(() => {})
    await queryInterface.removeColumn('call_logs', 'source').catch(() => {})
    await queryInterface.removeColumn('call_logs', 'phone_number').catch(() => {})
    await queryInterface.removeColumn('call_logs', 'caller_name').catch(() => {})
    await queryInterface.removeColumn('call_logs', 'workspace_id').catch(() => {})
    await queryInterface.removeColumn('call_logs', 'company_id').catch(() => {})
  },
}
