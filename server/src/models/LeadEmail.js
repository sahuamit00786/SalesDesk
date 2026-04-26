import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const LeadEmail = sequelize.define(
  'LeadEmail',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    leadId: { type: DataTypes.UUID, allowNull: false, field: 'lead_id' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
    direction: { type: DataTypes.ENUM('outbound', 'inbound'), allowNull: false, defaultValue: 'outbound' },
    status: { type: DataTypes.ENUM('draft', 'queued', 'sent', 'failed'), allowNull: false, defaultValue: 'queued' },
    subject: { type: DataTypes.STRING(255), allowNull: true },
    bodyHtml: { type: DataTypes.TEXT('long'), allowNull: true, field: 'body_html' },
    bodyText: { type: DataTypes.TEXT('long'), allowNull: true, field: 'body_text' },
    toRecipients: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'to_recipients' },
    ccRecipients: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'cc_recipients' },
    bccRecipients: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'bcc_recipients' },
    attachments: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    provider: { type: DataTypes.STRING(40), allowNull: true },
    providerMessageId: { type: DataTypes.STRING(255), allowNull: true, field: 'provider_message_id' },
    threadId: { type: DataTypes.STRING(255), allowNull: true, field: 'thread_id' },
    errorMessage: { type: DataTypes.TEXT, allowNull: true, field: 'error_message' },
    sentAt: { type: DataTypes.DATE, allowNull: true, field: 'sent_at' },
  },
  { tableName: 'lead_emails', timestamps: true },
)
