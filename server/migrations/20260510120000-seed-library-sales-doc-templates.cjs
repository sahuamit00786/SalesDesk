'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { seedLibraryTemplatesAllWorkspaces } = await import('../src/services/defaultSalesDocTemplates.js')
    await seedLibraryTemplatesAllWorkspaces(queryInterface)
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('quotation_templates') || !tables.includes('invoice_templates')) return

    const { LIB_QUOTATION_CODES, LIB_INVOICE_CODES } = await import(
      '../src/services/defaultSalesDocTemplates.js'
    )

    for (const code of LIB_QUOTATION_CODES) {
      await queryInterface.sequelize.query('DELETE FROM quotation_templates WHERE code = :code', {
        replacements: { code },
      })
    }
    for (const code of LIB_INVOICE_CODES) {
      await queryInterface.sequelize.query('DELETE FROM invoice_templates WHERE code = :code', {
        replacements: { code },
      })
    }
  },
}
