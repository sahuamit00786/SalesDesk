'use strict'

const { randomUUID } = require('node:crypto')

/**
 * Sidebar changes for the sales-docs overhaul:
 * - Quotation + invoice template pages merged into /sales-docs/templates
 *   (quotation_templates row is repointed in place to preserve role-matrix grants;
 *    invoice_templates row is deactivated, not deleted).
 * - New Settings entry: Document settings (/document-settings).
 */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return

    const now = new Date()

    // 1. Repoint quotation templates row → unified templates page
    await queryInterface.sequelize.query(
      `UPDATE menu_master
       SET \`key\` = 'manage.sales_doc_templates', label = 'Doc templates',
           route = '/sales-docs/templates', is_active = 1, updated_at = :now
       WHERE \`key\` = 'manage.quotation_templates' OR route = '/quotations/templates'`,
      { replacements: { now } },
    )

    // 2. Deactivate the invoice templates row (role-matrix rows may reference it)
    await queryInterface.sequelize.query(
      `UPDATE menu_master
       SET is_active = 0, updated_at = :now
       WHERE \`key\` = 'manage.invoice_templates' OR route = '/invoices/templates'`,
      { replacements: { now } },
    )

    // 3. Insert Document settings under the settings section (if missing)
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM menu_master WHERE \`key\` = 'settings.document_settings' OR route = '/document-settings' LIMIT 1`,
    )
    if (!existing?.length) {
      const [sectionRows] = await queryInterface.sequelize.query(
        `SELECT id FROM menu_master WHERE \`key\` = 'settings' LIMIT 1`,
      )
      const parentId = sectionRows?.[0]?.id || null
      const [maxSortRows] = await queryInterface.sequelize.query(
        'SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM menu_master',
      )
      const sortOrder = Number(maxSortRows[0]?.maxSort || 0) + 1
      await queryInterface.bulkInsert('menu_master', [
        {
          id: randomUUID(),
          key: 'settings.document_settings',
          label: 'Document settings',
          route: '/document-settings',
          parent_id: parentId,
          sort_order: sortOrder,
          is_active: true,
          resource: 'reports',
          action: 'view',
          created_at: now,
          updated_at: now,
        },
      ])
    }
  },

  async down() {
    // Non-destructive: keep synced menus in place on rollback.
  },
}
