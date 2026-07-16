'use strict'

async function addColumnIfMissing(queryInterface, table, column, definition) {
  const desc = await queryInterface.describeTable(table)
  if (!desc[column]) await queryInterface.addColumn(table, column, definition)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnIfMissing(queryInterface, 'web_forms', 'notify_on_submission', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false })
    await addColumnIfMissing(queryInterface, 'web_forms', 'notification_recipients', { type: Sequelize.JSON, allowNull: false, defaultValue: [] })
    await addColumnIfMissing(queryInterface, 'web_forms', 'notification_subject', { type: Sequelize.STRING(255), allowNull: true })
    await addColumnIfMissing(queryInterface, 'web_forms', 'send_confirmation_email', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false })
    await addColumnIfMissing(queryInterface, 'web_forms', 'confirmation_subject', { type: Sequelize.STRING(255), allowNull: true })
    await addColumnIfMissing(queryInterface, 'web_forms', 'confirmation_body', { type: Sequelize.TEXT, allowNull: true })
    await addColumnIfMissing(queryInterface, 'web_form_submissions', 'utm_source', { type: Sequelize.STRING(120), allowNull: true })
    await addColumnIfMissing(queryInterface, 'web_form_submissions', 'utm_medium', { type: Sequelize.STRING(120), allowNull: true })
    await addColumnIfMissing(queryInterface, 'web_form_submissions', 'utm_campaign', { type: Sequelize.STRING(160), allowNull: true })
    await addColumnIfMissing(queryInterface, 'web_form_submissions', 'landing_url', { type: Sequelize.STRING(1024), allowNull: true })
    await addColumnIfMissing(queryInterface, 'web_form_submissions', 'files', { type: Sequelize.JSON, allowNull: false, defaultValue: [] })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('web_form_submissions', 'files').catch(() => {})
    await queryInterface.removeColumn('web_form_submissions', 'landing_url').catch(() => {})
    await queryInterface.removeColumn('web_form_submissions', 'utm_campaign').catch(() => {})
    await queryInterface.removeColumn('web_form_submissions', 'utm_medium').catch(() => {})
    await queryInterface.removeColumn('web_form_submissions', 'utm_source').catch(() => {})
    await queryInterface.removeColumn('web_forms', 'confirmation_body').catch(() => {})
    await queryInterface.removeColumn('web_forms', 'confirmation_subject').catch(() => {})
    await queryInterface.removeColumn('web_forms', 'send_confirmation_email').catch(() => {})
    await queryInterface.removeColumn('web_forms', 'notification_subject').catch(() => {})
    await queryInterface.removeColumn('web_forms', 'notification_recipients').catch(() => {})
    await queryInterface.removeColumn('web_forms', 'notify_on_submission').catch(() => {})
  },
}
