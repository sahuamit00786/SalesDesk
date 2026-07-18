import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const EmailSequence = sequelize.define(
  'EmailSequence',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    triggerType: {
      type: DataTypes.ENUM('lead_created', 'status_changed', 'manual'),
      allowNull: false,
      defaultValue: 'manual',
      field: 'trigger_type',
    },
    triggerValue: { type: DataTypes.STRING(100), allowNull: true, field: 'trigger_value' },
    exitOnReply: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'exit_on_reply' },
    exitOnStatus: { type: DataTypes.STRING(50), allowNull: true, field: 'exit_on_status' },
    status: { type: DataTypes.ENUM('draft', 'active', 'paused'), defaultValue: 'draft' },
    createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
  },
  {
    tableName: 'email_sequences',
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['company_id', 'workspace_id'] },
      { fields: ['status'] },
    ],
  },
)
