'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meetings', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
      },
      workspace_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
      },
      lead_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
      },
      owner_user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
      },
      google_event_id: Sequelize.STRING,
      google_meet_link: Sequelize.TEXT,
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      meeting_type: Sequelize.ENUM('demo', 'follow_up', 'closing', 'internal'),
      agenda: Sequelize.TEXT,
      scheduled_start: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      scheduled_end: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      timezone: {
        type: Sequelize.STRING,
        defaultValue: 'Asia/Kolkata',
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'live', 'completed', 'cancelled', 'missed'),
        defaultValue: 'scheduled',
      },
      recording_status: {
        type: Sequelize.ENUM('pending', 'recording', 'completed'),
        defaultValue: 'pending',
      },
      transcription_status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed'),
        defaultValue: 'pending',
      },
      ai_summary_status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed'),
        defaultValue: 'pending',
      },
      duration_minutes: Sequelize.INTEGER,
      created_by: Sequelize.CHAR(36),
      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE,
      deleted_at: Sequelize.DATE,
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('meetings')
  },
}
