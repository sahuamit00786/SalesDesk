import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const InvoiceTemplate = sequelize.define(
  'InvoiceTemplate',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    code: { type: DataTypes.STRING(64), allowNull: false },
    templateType: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'general', field: 'template_type' },
    numberPrefix: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'INV', field: 'number_prefix' },
    nextNumber: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1001, field: 'next_number' },
    defaultCurrency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD', field: 'default_currency' },
    layoutPreset: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1, field: 'layout_preset' },
    themeStyle: { type: DataTypes.STRING(32), allowNull: true, field: 'theme_style' },
    autoNumbering: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'auto_numbering' },
    defaultPaymentTerms: { type: DataTypes.TEXT, allowNull: true, field: 'default_payment_terms' },
    sectionSettings: { type: DataTypes.JSON, allowNull: true, field: 'section_settings' },
    taxProfile: { type: DataTypes.JSON, allowNull: true, field: 'tax_profile' },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'active' },
  },
  { tableName: 'invoice_templates' },
)
