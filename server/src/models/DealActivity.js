import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const DealActivity = sequelize.define(
  'DealActivity',
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
    dealId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'deal_id',
    },
    userId: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      field: 'user_id',
    },
  },
  {
    tableName: 'deal_activities',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at',
  },
)
