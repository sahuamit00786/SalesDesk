import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const Invitation = sequelize.define(
  'Invitation',
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
    email: {
      type: DataTypes.STRING(190),
      allowNull: false,
    },
    companyRoleId: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      field: 'company_role_id',
      references: {
        model: 'company_roles',
        key: 'id',
      },
    },
    tokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'token_hash',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'invited_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'accepted_at',
    },
    invitedWorkspaceIds: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'invited_workspace_ids',
    },
  },
  {
    tableName: 'invitations',
    timestamps: true,
  },
)
