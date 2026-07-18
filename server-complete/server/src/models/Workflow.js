import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const Workflow = sequelize.define(
  'Workflow',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    name: { type: DataTypes.STRING(255), allowNull: false },
    status: { type: DataTypes.ENUM('draft', 'active', 'paused'), allowNull: false, defaultValue: 'draft' },
    definitionJson: { type: DataTypes.JSON, allowNull: false, field: 'definition_json' },
    /** Server-only cursor state (e.g. assign-owner round robin per node id). Not edited by the graph client. */
    runtimeStateJson: { type: DataTypes.JSON, allowNull: true, field: 'runtime_state_json' },
    publishedVersion: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1, field: 'published_version' },
    createdBy: { type: DataTypes.STRING(36), allowNull: true, field: 'created_by' },
  },
  { tableName: 'workflows', timestamps: true },
)
