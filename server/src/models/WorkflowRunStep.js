import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const WorkflowRunStep = sequelize.define(
  'WorkflowRunStep',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    runId: { type: DataTypes.UUID, allowNull: false, field: 'run_id' },
    nodeId: { type: DataTypes.STRING(64), allowNull: false, field: 'node_id' },
    status: {
      type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'skipped', 'waiting'),
      allowNull: false,
      defaultValue: 'pending',
    },
    inputJson: { type: DataTypes.JSON, allowNull: true, field: 'input_json' },
    outputJson: { type: DataTypes.JSON, allowNull: true, field: 'output_json' },
    errorMessage: { type: DataTypes.TEXT, allowNull: true, field: 'error_message' },
    startedAt: { type: DataTypes.DATE, allowNull: true, field: 'started_at' },
    finishedAt: { type: DataTypes.DATE, allowNull: true, field: 'finished_at' },
  },
  { tableName: 'workflow_run_steps', timestamps: true },
)
