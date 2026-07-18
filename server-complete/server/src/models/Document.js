import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const Document = sequelize.define(
  'Document',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    fileType: { type: DataTypes.STRING(120), allowNull: false, field: 'file_type' },
    fileSize: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'file_size' },
    filePath: { type: DataTypes.STRING(1024), allowNull: false, field: 'file_path' },
    uploadedBy: { type: DataTypes.STRING(64), allowNull: false, field: 'uploaded_by' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    isCurrent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_current' },
    folderId: { type: DataTypes.UUID, allowNull: true, field: 'folder_id' },
    source: { type: DataTypes.ENUM('manual', 'gmail'), allowNull: false, defaultValue: 'manual' },
  },
  { tableName: 'documents', timestamps: true },
)
