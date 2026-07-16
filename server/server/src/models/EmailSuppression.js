import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const EmailSuppression = sequelize.define(
  'EmailSuppression',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    workspaceId: { type: DataTypes.UUID, allowNull: true, field: 'workspace_id' },
    leadId: { type: DataTypes.UUID, allowNull: true, field: 'lead_id' },
    email: { type: DataTypes.STRING(255), allowNull: false },
    reason: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'unsubscribe' },
    source: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'tracking_link' },
  },
  {
    tableName: 'email_suppressions',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['company_id', 'email'] },
      { fields: ['lead_id'] },
    ],
  },
)
