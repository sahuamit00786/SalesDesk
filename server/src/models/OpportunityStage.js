import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const OpportunityStage = sequelize.define(
  'OpportunityStage',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(80), allowNull: false },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_default' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
  },
  { tableName: 'opportunity_stages', timestamps: true },
)
