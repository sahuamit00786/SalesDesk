'use strict';

export default {

  async up(queryInterface, Sequelize) {

    // =========================================
    // BOT STATUS
    // =========================================

    await queryInterface.addColumn(
      'meetings',
      'bot_status',
      {
        type: Sequelize.ENUM(
          'scheduled',
          'joining',
          'recording',
          'processing',
          'completed',
          'failed'
        ),
        defaultValue: 'scheduled',
      }
    );

    // =========================================
    // AUDIO FILE
    // =========================================

    await queryInterface.addColumn(
      'meetings',
      'audio_file_path',
      {
        type: Sequelize.TEXT,
        allowNull: true,
      }
    );

    // =========================================
    // TRANSCRIPT
    // =========================================

    await queryInterface.addColumn(
      'meetings',
      'transcript_text',
      {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      }
    );

    // =========================================
    // AI SUMMARY
    // =========================================

    await queryInterface.addColumn(
      'meetings',
      'summary_text',
      {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      }
    );

    // =========================================
    // PDF URLS
    // =========================================

    await queryInterface.addColumn(
      'meetings',
      'transcript_pdf_url',
      {
        type: Sequelize.TEXT,
        allowNull: true,
      }
    );

    await queryInterface.addColumn(
      'meetings',
      'summary_pdf_url',
      {
        type: Sequelize.TEXT,
        allowNull: true,
      }
    );

  },

  async down(queryInterface) {

    await queryInterface.removeColumn(
      'meetings',
      'bot_status'
    );

    await queryInterface.removeColumn(
      'meetings',
      'audio_file_path'
    );

    await queryInterface.removeColumn(
      'meetings',
      'transcript_text'
    );

    await queryInterface.removeColumn(
      'meetings',
      'summary_text'
    );

    await queryInterface.removeColumn(
      'meetings',
      'transcript_pdf_url'
    );

    await queryInterface.removeColumn(
      'meetings',
      'summary_pdf_url'
    );

  },

};