import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const AssignmentRule = sequelize.define(
  'AssignmentRule',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    type: { type: DataTypes.ENUM('round_robin', 'territory', 'tag', 'capacity'), allowNull: false },
    conditions: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    assignees: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
  },
  { tableName: 'assignment_rules', timestamps: true },
)
