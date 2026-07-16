import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const UserNotificationPreference = sequelize.define(
  'UserNotificationPreference',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    userId: { type: DataTypes.CHAR(36), allowNull: false, field: 'user_id' },
    eventType: { type: DataTypes.STRING(80), allowNull: false, field: 'event_type' },
    /** Tri-state: null = inherit role default, true/false = explicit override. */
    email: { type: DataTypes.BOOLEAN, allowNull: true },
    inApp: { type: DataTypes.BOOLEAN, allowNull: true, field: 'in_app' },
    /** Hard mute regardless of role setting — ignored for mandatory events. */
    muted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: 'user_notification_preferences',
    timestamps: true,
    indexes: [{ unique: true, fields: ['company_id', 'user_id', 'event_type'] }],
  },
)
