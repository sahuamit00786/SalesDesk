import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const Campaign = sequelize.define(
  'Campaign',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    /** Optional monetary goal for this campaign (KPI). */
    leadTarget: { type: DataTypes.DECIMAL(14, 2), allowNull: true, field: 'lead_target' },
    stages: { type: DataTypes.JSON, allowNull: false },
    status: { type: DataTypes.ENUM('active', 'inactive', 'draft'), allowNull: false, defaultValue: 'active' },
    createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
  },
  // Rely on sequelize `define.underscored` (db.js) for created_at / updated_at — explicit
  // createdAt: 'created_at' here breaks MySQL ORDER BY (`Campaign.createdAt` vs column).
  { tableName: 'campaigns', timestamps: true },
)
