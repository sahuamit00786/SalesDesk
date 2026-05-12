import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const QuotationItem = sequelize.define(
  'QuotationItem',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    quotationId: { type: DataTypes.UUID, allowNull: false, field: 'quotation_id' },
    sortOrder: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0, field: 'sort_order' },
    name: { type: DataTypes.STRING(255), allowNull: false },
    sku: { type: DataTypes.STRING(120), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    hsnSac: { type: DataTypes.STRING(32), allowNull: true, field: 'hsn_sac' },
    quantity: { type: DataTypes.DECIMAL(14, 4), allowNull: false, defaultValue: 1 },
    unitPrice: { type: DataTypes.DECIMAL(14, 4), allowNull: false, defaultValue: 0, field: 'unit_price' },
    discountPct: { type: DataTypes.DECIMAL(8, 4), allowNull: true, field: 'discount_pct' },
    discountAmount: { type: DataTypes.DECIMAL(14, 4), allowNull: true, field: 'discount_amount' },
    taxPct: { type: DataTypes.DECIMAL(8, 4), allowNull: true, field: 'tax_pct' },
    taxType: { type: DataTypes.STRING(16), allowNull: true, field: 'tax_type' },
    lineTotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'line_total' },
    billingPeriod: { type: DataTypes.STRING(64), allowNull: true, field: 'billing_period' },
    duration: { type: DataTypes.STRING(64), allowNull: true },
  },
  { tableName: 'quotation_items' },
)
