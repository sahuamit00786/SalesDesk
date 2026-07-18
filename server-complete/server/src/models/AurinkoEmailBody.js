import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

/**
 * FULL-CONTENT table — populated only when a user actually opens a specific
 * email (lazy load). Once fetched, reopening never re-calls Aurinko, keeping
 * GB-metered billing low. Attachment binaries are NOT stored here; only their
 * metadata (id, name, mimeType, size) — binaries are proxied on download click.
 */
export const AurinkoEmailBody = sequelize.define(
  'AurinkoEmailBody',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    messageId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'message_id' },
    bodyHtml: { type: DataTypes.TEXT('long'), allowNull: true, field: 'body_html' },
    bodyText: { type: DataTypes.TEXT('long'), allowNull: true, field: 'body_text' },
    attachments: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    rawSizeBytes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'raw_size_bytes' },
    fetchedAt: { type: DataTypes.DATE, allowNull: false, field: 'fetched_at' },
  },
  { tableName: 'aurinko_email_bodies', timestamps: true },
)
