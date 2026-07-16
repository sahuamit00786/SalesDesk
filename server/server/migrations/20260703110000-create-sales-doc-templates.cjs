'use strict'

/**
 * Merges quotation_templates + invoice_templates into one sales_doc_templates
 * table with a doc_type discriminator, preserving row ids so the existing
 * quotations.quotation_template_id / invoices.invoice_template_id FK values
 * keep resolving. Legacy tables are left in place here; a follow-up migration
 * renames them out of the way once the app has cut over.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('sales_doc_templates')) return

    await queryInterface.createTable('sales_doc_templates', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      workspace_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'workspaces', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      doc_type: { type: Sequelize.STRING(16), allowNull: false },
      name: { type: Sequelize.STRING(200), allowNull: false },
      code: { type: Sequelize.STRING(64), allowNull: false },
      status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'active' },
      default_currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' },
      layout_preset: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
      default_payment_terms: { type: Sequelize.TEXT, allowNull: true },
      section_settings: { type: Sequelize.JSON, allowNull: true },
      // quotation-only
      category: { type: Sequelize.STRING(64), allowNull: true },
      language: { type: Sequelize.STRING(16), allowNull: true },
      default_tax_type: { type: Sequelize.STRING(16), allowNull: true },
      default_validity_days: { type: Sequelize.SMALLINT, allowNull: true },
      watermark: { type: Sequelize.STRING(16), allowNull: true },
      theme_color: { type: Sequelize.STRING(16), allowNull: true },
      font_family: { type: Sequelize.STRING(120), allowNull: true },
      logo_override_url: { type: Sequelize.STRING(512), allowNull: true },
      accent_override: { type: Sequelize.STRING(16), allowNull: true },
      default_terms_blocks: { type: Sequelize.JSON, allowNull: true },
      default_notes: { type: Sequelize.TEXT, allowNull: true },
      show_sku: { type: Sequelize.BOOLEAN, allowNull: true },
      show_hsn: { type: Sequelize.BOOLEAN, allowNull: true },
      show_discount: { type: Sequelize.BOOLEAN, allowNull: true },
      show_tax_per_line: { type: Sequelize.BOOLEAN, allowNull: true },
      approval_rules: { type: Sequelize.JSON, allowNull: true },
      // invoice-only
      template_type: { type: Sequelize.STRING(24), allowNull: true },
      number_prefix: { type: Sequelize.STRING(32), allowNull: true },
      next_number: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      theme_style: { type: Sequelize.STRING(32), allowNull: true },
      auto_numbering: { type: Sequelize.BOOLEAN, allowNull: true },
      tax_profile: { type: Sequelize.JSON, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE },
    })

    await queryInterface.addIndex('sales_doc_templates', ['workspace_id', 'doc_type', 'code'], {
      name: 'sales_doc_templates_workspace_doctype_code_uq',
      unique: true,
    })

    await queryInterface.sequelize.query(`
      INSERT INTO sales_doc_templates (
        id, workspace_id, company_id, doc_type, name, code, status, default_currency, layout_preset,
        default_payment_terms, section_settings,
        category, language, default_tax_type, default_validity_days, watermark, theme_color, font_family,
        logo_override_url, accent_override, default_terms_blocks, default_notes,
        show_sku, show_hsn, show_discount, show_tax_per_line, approval_rules,
        template_type, number_prefix, next_number, theme_style, auto_numbering, tax_profile,
        created_at, updated_at
      )
      SELECT
        id, workspace_id, company_id, 'quotation', name, code, status, default_currency, layout_preset,
        default_payment_terms, section_settings,
        category, language, default_tax_type, default_validity_days, watermark, theme_color, font_family,
        logo_override_url, accent_override, default_terms_blocks, default_notes,
        show_sku, show_hsn, show_discount, show_tax_per_line, approval_rules,
        NULL, NULL, NULL, NULL, NULL, NULL,
        created_at, updated_at
      FROM quotation_templates
    `)

    await queryInterface.sequelize.query(`
      INSERT INTO sales_doc_templates (
        id, workspace_id, company_id, doc_type, name, code, status, default_currency, layout_preset,
        default_payment_terms, section_settings,
        category, language, default_tax_type, default_validity_days, watermark, theme_color, font_family,
        logo_override_url, accent_override, default_terms_blocks, default_notes,
        show_sku, show_hsn, show_discount, show_tax_per_line, approval_rules,
        template_type, number_prefix, next_number, theme_style, auto_numbering, tax_profile,
        created_at, updated_at
      )
      SELECT
        id, workspace_id, company_id, 'invoice', name, code, status, default_currency, layout_preset,
        default_payment_terms, section_settings,
        NULL, NULL, NULL, NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL, NULL,
        template_type, number_prefix, next_number, theme_style, auto_numbering, tax_profile,
        created_at, updated_at
      FROM invoice_templates
    `)

    const [refs] = await queryInterface.sequelize.query(`
      SELECT rc.CONSTRAINT_NAME AS name, rc.TABLE_NAME AS tableName
      FROM information_schema.REFERENTIAL_CONSTRAINTS rc
      WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
        AND rc.REFERENCED_TABLE_NAME IN ('quotation_templates', 'invoice_templates')
    `)
    for (const { name, tableName } of refs) {
      await queryInterface.sequelize.query(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${name}\``)
    }

    await queryInterface.addConstraint('quotations', {
      fields: ['quotation_template_id'],
      type: 'foreign key',
      name: 'quotations_quotation_template_id_sales_doc_templates_fk',
      references: { table: 'sales_doc_templates', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    })
    await queryInterface.addConstraint('invoices', {
      fields: ['invoice_template_id'],
      type: 'foreign key',
      name: 'invoices_invoice_template_id_sales_doc_templates_fk',
      references: { table: 'sales_doc_templates', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    })
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('sales_doc_templates')) return

    await queryInterface.removeConstraint(
      'quotations',
      'quotations_quotation_template_id_sales_doc_templates_fk',
    ).catch(() => {})
    await queryInterface.removeConstraint(
      'invoices',
      'invoices_invoice_template_id_sales_doc_templates_fk',
    ).catch(() => {})

    if (tables.includes('quotation_templates')) {
      await queryInterface.addConstraint('quotations', {
        fields: ['quotation_template_id'],
        type: 'foreign key',
        name: 'quotations_quotation_template_id_fk',
        references: { table: 'quotation_templates', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })
    }
    if (tables.includes('invoice_templates')) {
      await queryInterface.addConstraint('invoices', {
        fields: ['invoice_template_id'],
        type: 'foreign key',
        name: 'invoices_invoice_template_id_fk',
        references: { table: 'invoice_templates', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })
    }

    await queryInterface.dropTable('sales_doc_templates')
  },
}
