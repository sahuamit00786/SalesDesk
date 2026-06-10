'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface
      .createTable('call_logs', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        lead_id: { type: Sequelize.UUID, allowNull: false },
        owner_user_id: { type: Sequelize.UUID, allowNull: true },
        call_type: { type: Sequelize.ENUM('inbound', 'outbound'), allowNull: true },
        duration: { type: Sequelize.INTEGER, allowNull: true },
        outcome: { type: Sequelize.ENUM('connected', 'no_answer', 'voicemail', 'followup_needed'), allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        recording_url: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
      })
      .catch(() => {})
    await queryInterface.addIndex('call_logs', ['lead_id'], { name: 'call_logs_lead_idx' }).catch(() => {})
    await queryInterface.addIndex('call_logs', ['owner_user_id'], { name: 'call_logs_owner_idx' }).catch(() => {})
  },

  async down(queryInterface) {
    await queryInterface.dropTable('call_logs').catch(() => {})
  },
}
