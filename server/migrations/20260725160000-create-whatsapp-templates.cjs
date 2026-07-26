'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('whatsapp_templates')) return

    await queryInterface.createTable(
      'whatsapp_templates',
      {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onDelete: 'CASCADE',
        },
        name: { type: Sequelize.STRING(512), allowNull: false },
        category: { type: Sequelize.ENUM('MARKETING', 'UTILITY', 'AUTHENTICATION'), allowNull: false },
        language: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'en_US' },
        status: {
          type: Sequelize.ENUM('draft', 'pending', 'approved', 'rejected', 'disabled'),
          allowNull: false,
          defaultValue: 'draft',
        },
        meta_template_id: { type: Sequelize.STRING(128), allowNull: true },
        header_type: { type: Sequelize.ENUM('none', 'text', 'image', 'video', 'document'), allowNull: false, defaultValue: 'none' },
        header_text: { type: Sequelize.STRING(60), allowNull: true },
        body_text: { type: Sequelize.TEXT, allowNull: false },
        footer_text: { type: Sequelize.STRING(60), allowNull: true },
        buttons: { type: Sequelize.JSON, allowNull: true },
        variable_samples: { type: Sequelize.JSON, allowNull: true },
        rejection_reason: { type: Sequelize.TEXT, allowNull: true },
        last_synced_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: Sequelize.UUID, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci' },
    )

    await queryInterface.addIndex('whatsapp_templates', ['company_id', 'name', 'language'], {
      name: 'whatsapp_templates_company_name_lang_uq',
      unique: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('whatsapp_templates').catch(() => {})
  },
}
