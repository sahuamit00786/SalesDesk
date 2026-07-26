import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const WhatsAppTemplate = sequelize.define(
  'WhatsAppTemplate',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    /** Meta naming rule: lowercase letters, numbers, underscores only. */
    name: { type: DataTypes.STRING(512), allowNull: false },
    category: { type: DataTypes.ENUM('MARKETING', 'UTILITY', 'AUTHENTICATION'), allowNull: false },
    language: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'en_US' },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected', 'disabled'),
      allowNull: false,
      defaultValue: 'draft',
    },
    metaTemplateId: { type: DataTypes.STRING(128), allowNull: true, field: 'meta_template_id' },
    headerType: {
      type: DataTypes.ENUM('none', 'text', 'image', 'video', 'document'),
      allowNull: false,
      defaultValue: 'none',
      field: 'header_type',
    },
    headerText: { type: DataTypes.STRING(60), allowNull: true, field: 'header_text' },
    /** Body copy with {{1}}, {{2}}… placeholders. */
    bodyText: { type: DataTypes.TEXT, allowNull: false, field: 'body_text' },
    footerText: { type: DataTypes.STRING(60), allowNull: true, field: 'footer_text' },
    buttons: { type: DataTypes.JSON, allowNull: true },
    /** Example values Meta requires per variable when submitting for review. */
    variableSamples: { type: DataTypes.JSON, allowNull: true, field: 'variable_samples' },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true, field: 'rejection_reason' },
    lastSyncedAt: { type: DataTypes.DATE, allowNull: true, field: 'last_synced_at' },
    createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
  },
  {
    tableName: 'whatsapp_templates',
    timestamps: true,
  },
)
