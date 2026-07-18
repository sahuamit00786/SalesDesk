import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const WorkflowRun = sequelize.define(
  'WorkflowRun',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workflowId: { type: DataTypes.UUID, allowNull: false, field: 'workflow_id' },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    triggerType: { type: DataTypes.STRING(64), allowNull: false, field: 'trigger_type' },
    triggerPayloadJson: { type: DataTypes.JSON, allowNull: true, field: 'trigger_payload_json' },
    status: {
      type: DataTypes.ENUM('pending', 'running', 'waiting', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    waitUntil: { type: DataTypes.DATE, allowNull: true, field: 'wait_until' },
    resumeNodeId: { type: DataTypes.STRING(64), allowNull: true, field: 'resume_node_id' },
    contextJson: { type: DataTypes.JSON, allowNull: true, field: 'context_json' },
    errorMessage: { type: DataTypes.TEXT, allowNull: true, field: 'error_message' },
    startedAt: { type: DataTypes.DATE, allowNull: true, field: 'started_at' },
    finishedAt: { type: DataTypes.DATE, allowNull: true, field: 'finished_at' },
  },
  { tableName: 'workflow_runs', timestamps: true },
)
