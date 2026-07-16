import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const CompanyGoogleToken = sequelize.define(
  'CompanyGoogleToken',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    email: { type: DataTypes.STRING(255), allowNull: true },
    accessToken: { type: DataTypes.TEXT('long'), allowNull: true, field: 'access_token' },
    refreshToken: { type: DataTypes.TEXT('long'), allowNull: true, field: 'refresh_token' },
    scope: { type: DataTypes.TEXT, allowNull: true },
    tokenType: { type: DataTypes.STRING(80), allowNull: true, field: 'token_type' },
    expiryDate: { type: DataTypes.BIGINT, allowNull: true, field: 'expiry_date' },
    gmailHistoryId: { type: DataTypes.STRING(32), allowNull: true, field: 'gmail_history_id' },
    gmailWatchExpiresAt: { type: DataTypes.BIGINT, allowNull: true, field: 'gmail_watch_expires_at' },
    gmailPubsubTopic: { type: DataTypes.STRING(512), allowNull: true, field: 'gmail_pubsub_topic' },
  },
  { tableName: 'company_google_tokens', timestamps: true },
)
