'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('company_google_tokens', 'gmail_history_id', {
      type: Sequelize.STRING(32),
      allowNull: true,
    }).catch(() => {})
    await queryInterface.addColumn('company_google_tokens', 'gmail_watch_expires_at', {
      type: Sequelize.BIGINT,
      allowNull: true,
    }).catch(() => {})
    await queryInterface.addColumn('company_google_tokens', 'gmail_pubsub_topic', {
      type: Sequelize.STRING(512),
      allowNull: true,
    }).catch(() => {})
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('company_google_tokens', 'gmail_history_id').catch(() => {})
    await queryInterface.removeColumn('company_google_tokens', 'gmail_watch_expires_at').catch(() => {})
    await queryInterface.removeColumn('company_google_tokens', 'gmail_pubsub_topic').catch(() => {})
  },
}
