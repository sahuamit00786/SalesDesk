import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const Folder = sequelize.define(
  'Folder',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(180), allowNull: false },
    parentFolderId: { type: DataTypes.UUID, allowNull: true, field: 'parent_folder_id' },
    entityType: { type: DataTypes.ENUM('lead', 'contact', 'company', 'deal'), allowNull: true, field: 'entity_type' },
    entityId: { type: DataTypes.STRING(64), allowNull: true, field: 'entity_id' },
    createdBy: { type: DataTypes.STRING(64), allowNull: false, field: 'created_by' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
  },
  { tableName: 'folders', timestamps: true },
)
