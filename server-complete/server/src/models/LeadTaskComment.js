import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const LeadTaskComment = sequelize.define(
  'LeadTaskComment',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    leadTaskId: { type: DataTypes.UUID, allowNull: false, field: 'lead_task_id' },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    body: { type: DataTypes.TEXT, allowNull: false },
    isInternal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_internal',
    },
  },
  { tableName: 'lead_task_comments' },
)
