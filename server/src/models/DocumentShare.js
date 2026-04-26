import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const DocumentShare = sequelize.define(
  'DocumentShare',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    documentId: { type: DataTypes.UUID, allowNull: false, field: 'document_id' },
    recipientEmail: { type: DataTypes.STRING(255), allowNull: false, field: 'recipient_email' },
    token: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    sentAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'sent_at' },
    firstOpenedAt: { type: DataTypes.DATE, allowNull: true, field: 'first_opened_at' },
    lastOpenedAt: { type: DataTypes.DATE, allowNull: true, field: 'last_opened_at' },
    totalOpenCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'total_open_count' },
    totalTimeSpentSeconds: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'total_time_spent_seconds' },
  },
  { tableName: 'document_shares', timestamps: true },
)
