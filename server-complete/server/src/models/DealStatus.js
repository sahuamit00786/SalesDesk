import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const DealStatus = sequelize.define(
  'DealStatus',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    isDealCompleteStatus: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_deal_complete_status' },
    isInitial: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_initial' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
  },
  { tableName: 'deal_statuses', timestamps: true },
)
