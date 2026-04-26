import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const LeadStatusCategory = sequelize.define(
  'LeadStatusCategory',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
  },
  { tableName: 'lead_status_categories', timestamps: true },
)
