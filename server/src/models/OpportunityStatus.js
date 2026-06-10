import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const OpportunityStatus = sequelize.define(
  'OpportunityStatus',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(80), allowNull: false },
    isInitial: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_initial' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
  },
  { tableName: 'opportunity_statuses', freezeTableName: true, timestamps: true, underscored: true },
)
