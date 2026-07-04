'use strict'

/**
 * quotation_templates / invoice_templates are fully superseded by
 * sales_doc_templates (see prior migration). Rename rather than drop so the
 * legacy rows stay physically recoverable during the merge's shakeout period.
 */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('quotation_templates') && !tables.includes('_deprecated_quotation_templates')) {
      await queryInterface.renameTable('quotation_templates', '_deprecated_quotation_templates')
    }
    if (tables.includes('invoice_templates') && !tables.includes('_deprecated_invoice_templates')) {
      await queryInterface.renameTable('invoice_templates', '_deprecated_invoice_templates')
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('_deprecated_quotation_templates')) {
      await queryInterface.renameTable('_deprecated_quotation_templates', 'quotation_templates')
    }
    if (tables.includes('_deprecated_invoice_templates')) {
      await queryInterface.renameTable('_deprecated_invoice_templates', 'invoice_templates')
    }
  },
}
