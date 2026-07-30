'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('lead_email_logs', 'status', {
      type: Sequelize.ENUM('drafted', 'sent', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed', 'failed'),
      allowNull: false,
      defaultValue: 'drafted',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`UPDATE lead_email_logs SET status = 'bounced' WHERE status = 'failed'`)
    await queryInterface.changeColumn('lead_email_logs', 'status', {
      type: Sequelize.ENUM('drafted', 'sent', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed'),
      allowNull: false,
      defaultValue: 'drafted',
    })
  },
}
