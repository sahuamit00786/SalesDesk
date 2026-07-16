import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const Reminder = sequelize.define(
  'Reminder',
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
      references: {
        model: 'companies',
        key: 'id',
      },
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'workspace_id',
    },
    ownerUserId: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      field: 'owner_user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    createdBy: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    remindAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'remind_at',
    },
    status: {
      type: DataTypes.ENUM('pending', 'done', 'dismissed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
    targetType: {
      type: DataTypes.ENUM('general', 'lead', 'opportunity', 'meeting', 'task', 'followup'),
      allowNull: false,
      defaultValue: 'general',
      field: 'target_type',
    },
    targetId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'target_id',
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#f43f5e',
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
  },
  {
    tableName: 'reminders',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['company_id'] },
      { fields: ['workspace_id'] },
      { fields: ['owner_user_id'] },
      { fields: ['remind_at'] },
      { fields: ['status'] },
      { fields: ['target_type', 'target_id'] },
    ],
  },
)
