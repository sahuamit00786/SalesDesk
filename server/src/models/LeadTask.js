import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const LeadTask = sequelize.define(
  'LeadTask',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    leadId: { type: DataTypes.UUID, allowNull: false, field: 'lead_id' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    title: { type: DataTypes.STRING(255), allowNull: false },
    taskType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'follow_up',
      field: 'task_type',
    },
    description: { type: DataTypes.TEXT, allowNull: true },
    startAt: { type: DataTypes.DATE, allowNull: true, field: 'start_at' },
    dueAt: { type: DataTypes.DATE, allowNull: true, field: 'due_at' },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
    /** When true, overdue pending tasks are not auto-promoted to in_progress (user chose Pending). */
    skipTimeAutoInProgress: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'skip_time_auto_in_progress',
    },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
    assignedTo: { type: DataTypes.UUID, allowNull: true, field: 'assigned_to' },
    attachments: { type: DataTypes.JSON, allowNull: true },
    overdueNotifiedAt: { type: DataTypes.DATE, allowNull: true, field: 'overdue_notified_at' },
  },
  { tableName: 'lead_tasks', timestamps: true },
)
