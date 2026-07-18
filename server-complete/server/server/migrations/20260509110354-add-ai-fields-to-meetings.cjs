'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('meetings')

    if (!desc.bot_status) {
      await queryInterface.addColumn('meetings', 'bot_status', {
        type: Sequelize.ENUM(
          'scheduled', 'joining', 'recording', 'processing', 'completed', 'failed',
        ),
        defaultValue: 'scheduled',
      })
    }
    if (!desc.audio_file_path) {
      await queryInterface.addColumn('meetings', 'audio_file_path', {
        type: Sequelize.TEXT,
        allowNull: true,
      })
    }
    if (!desc.transcript_text) {
      await queryInterface.addColumn('meetings', 'transcript_text', {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      })
    }
    if (!desc.summary_text) {
      await queryInterface.addColumn('meetings', 'summary_text', {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      })
    }
    if (!desc.transcript_pdf_url) {
      await queryInterface.addColumn('meetings', 'transcript_pdf_url', {
        type: Sequelize.TEXT,
        allowNull: true,
      })
    }
    if (!desc.summary_pdf_url) {
      await queryInterface.addColumn('meetings', 'summary_pdf_url', {
        type: Sequelize.TEXT,
        allowNull: true,
      })
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('meetings').catch(() => ({}))
    if (desc.summary_pdf_url) await queryInterface.removeColumn('meetings', 'summary_pdf_url')
    if (desc.transcript_pdf_url) await queryInterface.removeColumn('meetings', 'transcript_pdf_url')
    if (desc.summary_text) await queryInterface.removeColumn('meetings', 'summary_text')
    if (desc.transcript_text) await queryInterface.removeColumn('meetings', 'transcript_text')
    if (desc.audio_file_path) await queryInterface.removeColumn('meetings', 'audio_file_path')
    if (desc.bot_status) await queryInterface.removeColumn('meetings', 'bot_status')
  },
}
