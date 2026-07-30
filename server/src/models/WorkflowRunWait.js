import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

/** One row per branch parked at a delayWait node — see the create-workflow-run-waits
 *  migration for why a run needs more than one of these at a time. */
export const WorkflowRunWait = sequelize.define(
  'WorkflowRunWait',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    runId: { type: DataTypes.UUID, allowNull: false, field: 'run_id' },
    nodeId: { type: DataTypes.STRING(64), allowNull: false, field: 'node_id' },
    resumeNodeIds: { type: DataTypes.JSON, allowNull: false, field: 'resume_node_ids' },
    waitUntil: { type: DataTypes.DATE, allowNull: false, field: 'wait_until' },
    status: {
      type: DataTypes.ENUM('pending', 'resumed'),
      allowNull: false,
      defaultValue: 'pending',
    },
  },
  { tableName: 'workflow_run_waits', timestamps: true },
)
