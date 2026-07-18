import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const DocumentFolderLink = sequelize.define(
  'DocumentFolderLink',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    documentId: { type: DataTypes.UUID, allowNull: false, field: 'document_id' },
    folderId: { type: DataTypes.UUID, allowNull: false, field: 'folder_id' },
  },
  { tableName: 'document_folder_links', timestamps: true },
)
