import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const WebFormSubmission = sequelize.define(
  'WebFormSubmission',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    formId: { type: DataTypes.UUID, allowNull: false, field: 'form_id' },
    data: { type: DataTypes.JSON, allowNull: false },
    leadId: { type: DataTypes.UUID, allowNull: true, field: 'lead_id' },
    isDuplicate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_duplicate' },
    duplicateLeadId: { type: DataTypes.UUID, allowNull: true, field: 'duplicate_lead_id' },
    spamScore: { type: DataTypes.FLOAT, allowNull: true, field: 'spam_score' },
    isSpam: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_spam' },
    ipAddress: { type: DataTypes.STRING(80), allowNull: true, field: 'ip_address' },
    userAgent: { type: DataTypes.STRING(512), allowNull: true, field: 'user_agent' },
    referrerUrl: { type: DataTypes.STRING(1024), allowNull: true, field: 'referrer_url' },
    utmSource: { type: DataTypes.STRING(120), allowNull: true, field: 'utm_source' },
    utmMedium: { type: DataTypes.STRING(120), allowNull: true, field: 'utm_medium' },
    utmCampaign: { type: DataTypes.STRING(160), allowNull: true, field: 'utm_campaign' },
    landingUrl: { type: DataTypes.STRING(1024), allowNull: true, field: 'landing_url' },
    files: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'submitted_at' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
  },
  { tableName: 'web_form_submissions', timestamps: true, updatedAt: false },
)
