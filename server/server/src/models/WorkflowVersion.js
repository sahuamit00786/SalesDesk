import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const WorkflowVersion = sequelize.define(
  'WorkflowVersion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workflowId: { type: DataTypes.UUID, allowNull: false, field: 'workflow_id' },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    definitionJson: { type: DataTypes.JSON, allowNull: false, field: 'definition_json' },
    createdBy: { type: DataTypes.STRING(36), allowNull: true, field: 'created_by' },
  },
  { tableName: 'workflow_versions', timestamps: true, updatedAt: false },
)
