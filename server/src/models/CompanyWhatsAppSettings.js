import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const CompanyWhatsAppSettings = sequelize.define(
  'CompanyWhatsAppSettings',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'company_id' },
    phoneNumberId: { type: DataTypes.STRING(64), allowNull: true, field: 'phone_number_id' },
    wabaId: { type: DataTypes.STRING(64), allowNull: true, field: 'waba_id' },
    displayPhoneNumber: { type: DataTypes.STRING(32), allowNull: true, field: 'display_phone_number' },
    verifiedName: { type: DataTypes.STRING(255), allowNull: true, field: 'verified_name' },
    /** AES-256-GCM ciphertext (base64) — never returned by default scope. */
    accessTokenEncrypted: { type: DataTypes.TEXT, allowNull: true, field: 'access_token_encrypted' },
    /** AES-256-GCM ciphertext (base64), optional — never returned by default scope. */
    appSecretEncrypted: { type: DataTypes.TEXT, allowNull: true, field: 'app_secret_encrypted' },
    webhookVerifyToken: { type: DataTypes.STRING(128), allowNull: true, field: 'webhook_verify_token' },
    status: {
      type: DataTypes.ENUM('not_configured', 'pending_verification', 'verified', 'error'),
      allowNull: false,
      defaultValue: 'not_configured',
    },
    isVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_verified' },
    lastVerifiedAt: { type: DataTypes.DATE, allowNull: true, field: 'last_verified_at' },
    lastError: { type: DataTypes.TEXT, allowNull: true, field: 'last_error' },
  },
  {
    tableName: 'company_whatsapp_settings',
    timestamps: true,
    defaultScope: {
      attributes: { exclude: ['accessTokenEncrypted', 'appSecretEncrypted'] },
    },
    scopes: {
      withSecret: {},
    },
  },
)
