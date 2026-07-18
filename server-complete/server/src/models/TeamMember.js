import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const TeamMember = sequelize.define(
  'TeamMember',
  {
    teamId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'team_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    tableName: 'team_members',
    timestamps: true,
  },
)
