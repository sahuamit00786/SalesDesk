import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const WhatsAppConversation = sequelize.define(
  'WhatsAppConversation',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    waPhoneNumber: { type: DataTypes.STRING(32), allowNull: false, field: 'wa_phone_number' },
    waPhoneDigits: { type: DataTypes.STRING(10), allowNull: true, field: 'wa_phone_digits' },
    contactName: { type: DataTypes.STRING(255), allowNull: true, field: 'contact_name' },
    leadId: { type: DataTypes.UUID, allowNull: true, field: 'lead_id' },
    /** Inherited from the matched lead — filter convenience only, NOT the tenant boundary. */
    workspaceId: { type: DataTypes.UUID, allowNull: true, field: 'workspace_id' },
    lastMessageAt: { type: DataTypes.DATE, allowNull: true, field: 'last_message_at' },
    /** When the customer last messaged us — the actual anchor for Meta's 24h free-form window. */
    lastInboundMessageAt: { type: DataTypes.DATE, allowNull: true, field: 'last_inbound_message_at' },
    lastMessageDirection: {
      type: DataTypes.ENUM('inbound', 'outbound'),
      allowNull: true,
      field: 'last_message_direction',
    },
    lastMessagePreview: { type: DataTypes.STRING(255), allowNull: true, field: 'last_message_preview' },
    unreadCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'unread_count' },
    isPinned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_pinned' },
    /** Manual sort position among pinned chats (lower first) — set on pin, cleared on unpin. */
    pinOrder: { type: DataTypes.INTEGER, allowNull: true, field: 'pin_order' },
    isArchived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_archived' },
    isMuted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_muted' },
    /** Soft-hide from the inbox list — clears automatically on the next inbound message (see findOrCreateConversation). */
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    tableName: 'whatsapp_conversations',
    timestamps: true,
  },
)
