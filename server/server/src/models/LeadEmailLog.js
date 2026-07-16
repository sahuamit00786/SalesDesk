import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const LeadEmailLog = sequelize.define(
  'LeadEmailLog',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    leadId: { type: DataTypes.UUID, allowNull: false, field: 'lead_id' },
    templateId: { type: DataTypes.UUID, allowNull: false, field: 'template_id' },
    templateVersion: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1, field: 'template_version' },
    subject: { type: DataTypes.STRING(500), allowNull: true },
    bodyHtml: { type: DataTypes.TEXT('long'), allowNull: true, field: 'body_html' },
    toEmail: { type: DataTypes.STRING(255), allowNull: true, field: 'to_email' },
    sendError: { type: DataTypes.TEXT, allowNull: true, field: 'send_error' },
    sentAt: { type: DataTypes.DATE, allowNull: true, field: 'sent_at' },
    openedAt: { type: DataTypes.DATE, allowNull: true, field: 'opened_at' },
    clickedAt: { type: DataTypes.DATE, allowNull: true, field: 'clicked_at' },
    repliedAt: { type: DataTypes.DATE, allowNull: true, field: 'replied_at' },
    bounced: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    unsubscribed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: {
      type: DataTypes.ENUM('drafted', 'sent', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed'),
      allowNull: false,
      defaultValue: 'drafted',
    },
    source: {
      type: DataTypes.ENUM('direct', 'bulk', 'workflow'),
      allowNull: false,
      defaultValue: 'bulk',
    },
    openCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'open_count' },
    clickCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'click_count' },
  },
  {
    tableName: 'lead_email_logs',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['lead_id', 'template_id', 'template_version'] },
      { fields: ['template_id', 'sent_at'] },
      { fields: ['status'] },
    ],
  },
)
