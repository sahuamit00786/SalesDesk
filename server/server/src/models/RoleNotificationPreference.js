import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const RoleNotificationPreference = sequelize.define(
  'RoleNotificationPreference',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    /** One of COMPANY_USER_ROLE_KIND values — not a company_role_id FK (roles are per-company rows, this is the fixed taxonomy). */
    roleKind: { type: DataTypes.STRING(40), allowNull: false, field: 'role_kind' },
    eventType: { type: DataTypes.STRING(80), allowNull: false, field: 'event_type' },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    email: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    inApp: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'in_app' },
    digestFrequency: {
      type: DataTypes.ENUM('immediate', 'daily', 'weekly'),
      allowNull: false,
      defaultValue: 'immediate',
      field: 'digest_frequency',
    },
    digestHour: { type: DataTypes.INTEGER, allowNull: true, field: 'digest_hour' },
    digestMinute: { type: DataTypes.INTEGER, allowNull: true, field: 'digest_minute' },
  },
  {
    tableName: 'role_notification_preferences',
    timestamps: true,
    indexes: [{ unique: true, fields: ['company_id', 'role_kind', 'event_type'] }],
  },
)
