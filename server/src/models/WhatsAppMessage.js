import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const WhatsAppMessage = sequelize.define(
  'WhatsAppMessage',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    conversationId: { type: DataTypes.UUID, allowNull: false, field: 'conversation_id' },
    direction: { type: DataTypes.ENUM('inbound', 'outbound'), allowNull: false },
    /** Meta's message id. Nullable: outbound rows are created 'queued' before Meta ACKs. */
    waMessageId: { type: DataTypes.STRING(128), allowNull: true, field: 'wa_message_id' },
    type: {
      type: DataTypes.ENUM(
        'text',
        'image',
        'video',
        'audio',
        'document',
        'sticker',
        'location',
        'contact',
        'template',
        'interactive',
        'button',
        'reaction',
        'unknown',
      ),
      allowNull: false,
      defaultValue: 'unknown',
    },
    textBody: { type: DataTypes.TEXT, allowNull: true, field: 'text_body' },
    mediaId: { type: DataTypes.STRING(128), allowNull: true, field: 'media_id' },
    /** Our stored ref once downloaded: /uploads/whatsapp/<companyId>/<file>. */
    mediaUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'media_url' },
    mimeType: { type: DataTypes.STRING(100), allowNull: true, field: 'mime_type' },
    fileName: { type: DataTypes.STRING(255), allowNull: true, field: 'file_name' },
    fileSize: { type: DataTypes.INTEGER, allowNull: true, field: 'file_size' },
    caption: { type: DataTypes.TEXT, allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    locationName: { type: DataTypes.STRING(255), allowNull: true, field: 'location_name' },
    status: {
      type: DataTypes.ENUM('queued', 'sent', 'delivered', 'read', 'failed', 'received'),
      allowNull: false,
      defaultValue: 'queued',
    },
    errorMessage: { type: DataTypes.TEXT, allowNull: true, field: 'error_message' },
    /** Original webhook message fragment — audit/debug. */
    rawPayload: { type: DataTypes.JSON, allowNull: true, field: 'raw_payload' },
    sentByUserId: { type: DataTypes.UUID, allowNull: true, field: 'sent_by_user_id' },
    waTimestamp: { type: DataTypes.DATE, allowNull: true, field: 'wa_timestamp' },
    /** Single latest emoji reaction on this message (shared inbox — one active reaction, not per-user). */
    reaction: { type: DataTypes.STRING(16), allowNull: true },
    isStarred: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_starred' },
    /** Meta's wa_message_id of the message this one replies to (their `context.id`). */
    replyToWaMessageId: { type: DataTypes.STRING(128), allowNull: true, field: 'reply_to_wa_message_id' },
    /** Soft-hide from the shared inbox — Meta's Cloud API has no real delete/recall. */
    hiddenAt: { type: DataTypes.DATE, allowNull: true, field: 'hidden_at' },
  },
  {
    tableName: 'whatsapp_messages',
    timestamps: true,
  },
)
