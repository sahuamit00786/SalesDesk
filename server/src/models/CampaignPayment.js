import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const CampaignPayment = sequelize.define(
  'CampaignPayment',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    campaignId: { type: DataTypes.UUID, allowNull: false, field: 'campaign_id' },
    campaignLeadId: { type: DataTypes.UUID, allowNull: false, field: 'campaign_lead_id' },
    leadId: { type: DataTypes.UUID, allowNull: false, field: 'lead_id' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
    paymentDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'payment_date' },
    mode: {
      type: DataTypes.ENUM('bank_transfer', 'cash', 'cheque', 'upi', 'card', 'crypto', 'other'),
      allowNull: false,
      defaultValue: 'bank_transfer',
    },
    reference: { type: DataTypes.STRING(120), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'received', 'failed', 'refunded'),
      allowNull: false,
      defaultValue: 'received',
    },
    createdByUserId: { type: DataTypes.UUID, allowNull: true, field: 'created_by_user_id' },
    /** Client-supplied dedup key (e.g. double-click / retry guard). Unique per campaign. */
    idempotencyKey: { type: DataTypes.STRING(120), allowNull: true, field: 'idempotency_key' },
  },
  {
    tableName: 'campaign_payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
)
