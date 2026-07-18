import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const Activity = sequelize.define(
  'Activity',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('note', 'call', 'email', 'meeting', 'task', 'status_change', 'assignment', 'system'),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    leadId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'lead_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id',
    },
  },
  {
    tableName: 'activities',
    timestamps: true,
    updatedAt: false,
  },
)
