import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const CompanyEmailSettings = sequelize.define(
  'CompanyEmailSettings',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'company_id' },
    smtpHost: { type: DataTypes.STRING(255), allowNull: true, field: 'smtp_host' },
    smtpPort: { type: DataTypes.INTEGER, allowNull: true, field: 'smtp_port' },
    smtpSecure: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'smtp_secure' },
    smtpUser: { type: DataTypes.STRING(255), allowNull: true, field: 'smtp_user' },
    /** AES-256-GCM ciphertext (base64) — never returned by default scope. */
    smtpPassEncrypted: { type: DataTypes.TEXT, allowNull: true, field: 'smtp_pass_encrypted' },
    fromName: { type: DataTypes.STRING(160), allowNull: true, field: 'from_name' },
    fromAddress: { type: DataTypes.STRING(255), allowNull: true, field: 'from_address' },
    replyTo: { type: DataTypes.STRING(255), allowNull: true, field: 'reply_to' },
    isVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_verified' },
    lastVerifiedAt: { type: DataTypes.DATE, allowNull: true, field: 'last_verified_at' },
    lastError: { type: DataTypes.TEXT, allowNull: true, field: 'last_error' },
  },
  {
    tableName: 'company_email_settings',
    timestamps: true,
    defaultScope: {
      attributes: { exclude: ['smtpPassEncrypted'] },
    },
    scopes: {
      withSecret: {},
    },
  },
)
