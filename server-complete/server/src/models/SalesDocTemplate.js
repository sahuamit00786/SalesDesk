import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const SalesDocTemplate = sequelize.define(
  'SalesDocTemplate',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    docType: { type: DataTypes.STRING(16), allowNull: false, field: 'doc_type' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    code: { type: DataTypes.STRING(64), allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'active' },
    defaultCurrency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD', field: 'default_currency' },
    layoutPreset: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1, field: 'layout_preset' },
    defaultPaymentTerms: { type: DataTypes.TEXT, allowNull: true, field: 'default_payment_terms' },
    sectionSettings: { type: DataTypes.JSON, allowNull: true, field: 'section_settings' },
    // quotation-only
    category: { type: DataTypes.STRING(64), allowNull: true },
    language: { type: DataTypes.STRING(16), allowNull: true },
    defaultTaxType: { type: DataTypes.STRING(16), allowNull: true, field: 'default_tax_type' },
    defaultValidityDays: { type: DataTypes.SMALLINT, allowNull: true, field: 'default_validity_days' },
    watermark: { type: DataTypes.STRING(16), allowNull: true },
    themeColor: { type: DataTypes.STRING(16), allowNull: true, field: 'theme_color' },
    fontFamily: { type: DataTypes.STRING(120), allowNull: true, field: 'font_family' },
    logoOverrideUrl: { type: DataTypes.STRING(512), allowNull: true, field: 'logo_override_url' },
    accentOverride: { type: DataTypes.STRING(16), allowNull: true, field: 'accent_override' },
    defaultTermsBlocks: { type: DataTypes.JSON, allowNull: true, field: 'default_terms_blocks' },
    defaultNotes: { type: DataTypes.TEXT, allowNull: true, field: 'default_notes' },
    showSku: { type: DataTypes.BOOLEAN, allowNull: true, field: 'show_sku' },
    showHsn: { type: DataTypes.BOOLEAN, allowNull: true, field: 'show_hsn' },
    showDiscount: { type: DataTypes.BOOLEAN, allowNull: true, field: 'show_discount' },
    showTaxPerLine: { type: DataTypes.BOOLEAN, allowNull: true, field: 'show_tax_per_line' },
    approvalRules: { type: DataTypes.JSON, allowNull: true, field: 'approval_rules' },
    // invoice-only
    templateType: { type: DataTypes.STRING(24), allowNull: true, field: 'template_type' },
    numberPrefix: { type: DataTypes.STRING(32), allowNull: true, field: 'number_prefix' },
    nextNumber: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'next_number' },
    themeStyle: { type: DataTypes.STRING(32), allowNull: true, field: 'theme_style' },
    autoNumbering: { type: DataTypes.BOOLEAN, allowNull: true, field: 'auto_numbering' },
    taxProfile: { type: DataTypes.JSON, allowNull: true, field: 'tax_profile' },
  },
  { tableName: 'sales_doc_templates' },
)
