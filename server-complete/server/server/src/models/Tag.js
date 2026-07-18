import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const Tag = sequelize.define(
  'Tag',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(80), allowNull: false },
    color: { type: DataTypes.STRING(16), allowNull: false, defaultValue: '#3b73f5' },
    workspaceId: { type: DataTypes.UUID, allowNull: true, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
  },
  { tableName: 'tags', timestamps: true },
)
