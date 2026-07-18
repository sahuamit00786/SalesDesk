'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lead_email_logs', 'source', {
      type: Sequelize.ENUM('direct', 'bulk', 'workflow'),
      allowNull: false,
      defaultValue: 'bulk',
    })
    await queryInterface.addColumn('lead_email_logs', 'open_count', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    })
    await queryInterface.addColumn('lead_email_logs', 'click_count', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    })
    await queryInterface.addIndex('lead_email_logs', ['workspace_id', 'sent_at'], {
      name: 'lead_email_logs_workspace_sent_at',
    })
    await queryInterface.addIndex('lead_email_logs', ['workspace_id', 'source', 'sent_at'], {
      name: 'lead_email_logs_workspace_source_sent_at',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('lead_email_logs', 'lead_email_logs_workspace_source_sent_at').catch(() => {})
    await queryInterface.removeIndex('lead_email_logs', 'lead_email_logs_workspace_sent_at').catch(() => {})
    await queryInterface.removeColumn('lead_email_logs', 'click_count')
    await queryInterface.removeColumn('lead_email_logs', 'open_count')
    await queryInterface.removeColumn('lead_email_logs', 'source')
  },
}
