import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const DocumentLink = sequelize.define(
  'DocumentLink',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    documentId: { type: DataTypes.UUID, allowNull: false, field: 'document_id' },
    entityType: { type: DataTypes.ENUM('lead', 'contact', 'company', 'deal'), allowNull: false, field: 'entity_type' },
    entityId: { type: DataTypes.STRING(64), allowNull: false, field: 'entity_id' },
  },
  { tableName: 'document_links', timestamps: true },
)
