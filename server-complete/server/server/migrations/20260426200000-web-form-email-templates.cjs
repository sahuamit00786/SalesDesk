'use strict'

const { addIndexIfMissing } = require('../migration-helpers.cjs')

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('web_form_email_templates')) {
      await queryInterface.createTable('web_form_email_templates', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        workspace_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        created_by: { type: Sequelize.UUID, allowNull: true },
        name: { type: Sequelize.STRING(140), allowNull: false },
        subject: { type: Sequelize.STRING(255), allowNull: false },
        body: { type: Sequelize.TEXT('long'), allowNull: false },
        variables: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: ['name', 'email', 'form_name', 'submission_date'],
        },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
    }
    await addIndexIfMissing(queryInterface, 'web_form_email_templates', ['workspace_id', 'created_at'], {
      name: 'web_form_email_templates_workspace_created_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('web_form_email_templates').catch(() => {})
  },
}
