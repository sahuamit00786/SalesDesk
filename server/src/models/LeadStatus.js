import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const LeadStatus = sequelize.define(
  'LeadStatus',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    categoryId: { type: DataTypes.UUID, allowNull: false, field: 'category_id' },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_default' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
  },
  { tableName: 'lead_statuses', timestamps: true },
)
