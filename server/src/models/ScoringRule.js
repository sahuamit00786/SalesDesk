import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const ScoringRule = sequelize.define(
  'ScoringRule',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    workspaceId: { type: DataTypes.UUID, allowNull: true, field: 'workspace_id' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    ruleType: {
      type: DataTypes.ENUM('field', 'activity', 'email', 'meeting'),
      allowNull: false,
      field: 'rule_type',
    },
    fieldName: { type: DataTypes.STRING(100), allowNull: true, field: 'field_name' },
    operator: {
      type: DataTypes.ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'exists'),
      allowNull: false,
    },
    value: { type: DataTypes.STRING(255), allowNull: true },
    points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  },
  {
    tableName: 'scoring_rules',
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['company_id', 'is_active'], name: 'idx_scoring_rules_company' },
    ],
  },
)
