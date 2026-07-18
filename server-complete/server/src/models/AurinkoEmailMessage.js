import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

/**
 * METADATA table — one row per email that arrives after the account was
 * connected (event-first). Populated from the webhook path using Aurinko's
 * list endpoint (no bodies). Cheap and always written. The full body lives in
 * aurinko_email_bodies and is only fetched when a user opens the message.
 */
export const AurinkoEmailMessage = sequelize.define(
  'AurinkoEmailMessage',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    accountId: { type: DataTypes.UUID, allowNull: false, field: 'account_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    /**
     * CRM linkage — REQUIRED by the ingest filter: metadata is stored ONLY
     * when the counterparty (sender for inbox, a recipient for sent) matches
     * a Lead in the CRM. Everything else is skipped entirely. workspaceId is
     * copied from the lead so mailbox queries can scope by workspace access.
     */
    leadId: { type: DataTypes.UUID, allowNull: true, field: 'lead_id' },
    workspaceId: { type: DataTypes.UUID, allowNull: true, field: 'workspace_id' },
    aurinkoMessageId: { type: DataTypes.STRING(512), allowNull: false, field: 'aurinko_message_id' },
    threadId: { type: DataTypes.STRING(512), allowNull: true, field: 'thread_id' },
    internetMessageId: { type: DataTypes.STRING(512), allowNull: true, field: 'internet_message_id' },
    folder: { type: DataTypes.ENUM('inbox', 'sent', 'other'), allowNull: false, defaultValue: 'inbox' },
    fromName: { type: DataTypes.STRING(255), allowNull: true, field: 'from_name' },
    fromEmail: { type: DataTypes.STRING(320), allowNull: true, field: 'from_email' },
    toRecipients: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'to_recipients' },
    ccRecipients: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'cc_recipients' },
    bccRecipients: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'bcc_recipients' },
    subject: { type: DataTypes.STRING(512), allowNull: true },
    snippet: { type: DataTypes.TEXT, allowNull: true },
    receivedAt: { type: DataTypes.DATE(3), allowNull: false, field: 'received_at' },
    hasAttachments: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'has_attachments' },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_read' },
    isDeleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_deleted' },
    sysLabels: { type: DataTypes.JSON, allowNull: true, field: 'sys_labels' },
    hasFullContent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'has_full_content' },
    source: {
      type: DataTypes.ENUM('webhook', 'send', 'manual'),
      allowNull: false,
      defaultValue: 'webhook',
    },
  },
  { tableName: 'aurinko_email_messages', timestamps: true },
)
