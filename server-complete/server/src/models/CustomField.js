import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const CustomField = sequelize.define(
  'CustomField',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    label: { type: DataTypes.STRING(120), allowNull: false },
    key: { type: DataTypes.STRING(120), allowNull: false },
    type: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'text' },
    options: { type: DataTypes.JSON, allowNull: true },
    isRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_required' },
    order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
  },
  { tableName: 'custom_fields', timestamps: true },
)
