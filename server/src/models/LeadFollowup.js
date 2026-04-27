import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const LeadFollowup = sequelize.define(
  'LeadFollowup',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    leadId: { type: DataTypes.UUID, allowNull: false, field: 'lead_id' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    scheduledAt: { type: DataTypes.DATE, allowNull: false, field: 'scheduled_at' },
    remark: { type: DataTypes.TEXT, allowNull: true },
    quickPickMinutes: { type: DataTypes.SMALLINT, allowNull: true, field: 'quick_pick_minutes' },
    status: { type: DataTypes.ENUM('pending', 'done', 'cancelled'), allowNull: false, defaultValue: 'pending' },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  },
  { tableName: 'lead_followups', timestamps: true },
)
