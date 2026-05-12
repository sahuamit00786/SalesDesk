import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const Deal = sequelize.define(
  'Deal',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    opportunityLeadId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'opportunity_lead_id',
    },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    value: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    valueCurrency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD', field: 'value_currency' },
    stage: { type: DataTypes.STRING(80), allowNull: true },
    assignedTo: { type: DataTypes.UUID, allowNull: true, field: 'assigned_to' },
    ownerUserId: { type: DataTypes.UUID, allowNull: true, field: 'owner_user_id' },
    isDeleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_deleted' },
  },
  {
    tableName: 'deals',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
)
