import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

/** Minimal lead row for ownership / reassignment (CRM core grows here). */
export const Lead = sequelize.define(
  'Lead',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
    },
    ownerUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'owner_user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'workspace_id',
      references: {
        model: 'workspaces',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Untitled lead',
    },
  },
  {
    tableName: 'leads',
    timestamps: true,
  },
)
