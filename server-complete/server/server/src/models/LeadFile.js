import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const LeadFile = sequelize.define(
  'LeadFile',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    leadId: { type: DataTypes.UUID, allowNull: false, field: 'lead_id' },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    fileName: { type: DataTypes.STRING(255), allowNull: false, field: 'file_name' },
    fileUrl: { type: DataTypes.STRING(512), allowNull: false, field: 'file_url' },
    mimeType: { type: DataTypes.STRING(120), allowNull: true, field: 'mime_type' },
    sizeBytes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'size_bytes' },
  },
  { tableName: 'lead_files', timestamps: true, updatedAt: false },
)
