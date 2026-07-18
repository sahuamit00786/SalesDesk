import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const SavedView = sequelize.define(
  'SavedView',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    filters: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_default' },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
  },
  { tableName: 'saved_views', timestamps: true },
)
