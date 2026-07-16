import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const NotificationDeliveryLog = sequelize.define(
  'NotificationDeliveryLog',
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
      references: { model: 'companies', key: 'id' },
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'workspace_id',
      references: { model: 'workspaces', key: 'id' },
    },
    recipientUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'recipient_user_id',
      references: { model: 'users', key: 'id' },
    },
    actorUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'actor_user_id',
      references: { model: 'users', key: 'id' },
    },
    eventType: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: 'event_type',
    },
    channel: {
      type: DataTypes.ENUM('email', 'in_app'),
      allowNull: false,
      defaultValue: 'email',
    },
    status: {
      type: DataTypes.ENUM('queued', 'sent', 'failed', 'skipped'),
      allowNull: false,
      defaultValue: 'queued',
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    recipientEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'recipient_email',
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message',
    },
    jobId: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'job_id',
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sent_at',
    },
  },
  {
    tableName: 'notification_delivery_logs',
    indexes: [
      { fields: ['company_id', 'created_at'] },
      { fields: ['recipient_user_id', 'created_at'] },
      { fields: ['event_type'] },
    ],
  },
)
