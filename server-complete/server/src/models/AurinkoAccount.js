import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

/**
 * One row per (company, user) Google account connected through Aurinko.
 * `accessToken` is the Aurinko ACCOUNT token (Aurinko keeps the underlying
 * Google refresh token alive, so this does not rotate like raw Google tokens).
 * `connectedFrom` anchors the event-first sync: no history before this moment
 * is ever pulled or stored.
 */
export const AurinkoAccount = sequelize.define(
  'AurinkoAccount',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    aurinkoAccountId: { type: DataTypes.STRING(64), allowNull: false, field: 'aurinko_account_id' },
    accessToken: { type: DataTypes.TEXT, allowNull: false, field: 'access_token' },
    serviceType: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'Google', field: 'service_type' },
    email: { type: DataTypes.STRING(320), allowNull: true },
    name: { type: DataTypes.STRING(255), allowNull: true },
    scopes: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('active', 'reauth_required', 'disconnected'),
      allowNull: false,
      defaultValue: 'active',
    },
    connectedFrom: { type: DataTypes.DATE, allowNull: false, field: 'connected_from' },
    emailSubscriptionId: { type: DataTypes.STRING(64), allowNull: true, field: 'email_subscription_id' },
    emailSubscriptionAt: { type: DataTypes.DATE, allowNull: true, field: 'email_subscription_at' },
    calendarSubscriptionId: { type: DataTypes.STRING(64), allowNull: true, field: 'calendar_subscription_id' },
    calendarSubscriptionAt: { type: DataTypes.DATE, allowNull: true, field: 'calendar_subscription_at' },
    calendarId: { type: DataTypes.STRING(255), allowNull: true, field: 'calendar_id' },
    lastWebhookAt: { type: DataTypes.DATE, allowNull: true, field: 'last_webhook_at' },
    lastError: { type: DataTypes.TEXT, allowNull: true, field: 'last_error' },
  },
  { tableName: 'aurinko_accounts', timestamps: true },
)
