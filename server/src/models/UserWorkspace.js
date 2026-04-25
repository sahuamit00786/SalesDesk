import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const UserWorkspace = sequelize.define(
  'UserWorkspace',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    workspaceId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'workspace_id',
      references: {
        model: 'workspaces',
        key: 'id',
      },
    },
  },
  {
    tableName: 'user_workspaces',
    indexes: [
      {
        name: 'user_workspaces_user_workspace_uq',
        unique: true,
        fields: ['user_id', 'workspace_id'],
      },
    ],
  },
)
