import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const InvoicePayment = sequelize.define(
  'InvoicePayment',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    invoiceId: { type: DataTypes.UUID, allowNull: false, field: 'invoice_id' },
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    paidAt: { type: DataTypes.DATE, allowNull: false, field: 'paid_at' },
    mode: { type: DataTypes.STRING(32), allowNull: true },
    reference: { type: DataTypes.STRING(120), allowNull: true },
    recordedByUserId: { type: DataTypes.UUID, allowNull: true, field: 'recorded_by_user_id' },
  },
  { tableName: 'invoice_payments' },
)
