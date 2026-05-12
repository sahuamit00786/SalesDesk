import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const EmailTemplate = sequelize.define(
  'EmailTemplate',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
    name: { type: DataTypes.STRING(255), allowNull: false },
    subject: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
    bodyHtml: { type: DataTypes.TEXT('long'), allowNull: false, defaultValue: '', field: 'body_html' },
    category: {
      type: DataTypes.ENUM('cold_outreach', 'follow_up', 'proposal', 're_engagement'),
      allowNull: false,
      defaultValue: 'cold_outreach',
    },
    tags: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    attachments: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    throttlePerHour: { type: DataTypes.INTEGER, allowNull: true, field: 'throttle_per_hour' },
    scheduleAt: { type: DataTypes.DATE, allowNull: true, field: 'schedule_at' },
    autoUnsubscribeLink: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'auto_unsubscribe_link' },
    skipIfAlreadySent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'skip_if_already_sent' },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    isArchived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_archived' },
    archivedAt: { type: DataTypes.DATE, allowNull: true, field: 'archived_at' },
  },
  {
    tableName: 'email_templates',
    timestamps: true,
    indexes: [
      { fields: ['company_id', 'workspace_id'] },
      { fields: ['category'] },
      { fields: ['is_archived'] },
    ],
  },
)
