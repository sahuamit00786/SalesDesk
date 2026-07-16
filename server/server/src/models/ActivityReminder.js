import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const ActivityReminder = sequelize.define(
  'ActivityReminder',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
    },
    activityId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'activity_id',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
    },
    remindAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'remind_at',
    },
    channelPush: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'channel_push',
    },
    channelEmail: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'channel_email',
    },
    status: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'pending',
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sent_at',
    },
  },
  {
    tableName: 'activity_reminders',
    timestamps: true,
    underscored: true,
  },
)
