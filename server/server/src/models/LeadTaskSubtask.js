import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const LeadTaskSubtask = sequelize.define(
  'LeadTaskSubtask',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    leadTaskId: { type: DataTypes.UUID, allowNull: false, field: 'lead_task_id' },
    title: { type: DataTypes.STRING(500), allowNull: false },
    done: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    position: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'lead_task_subtasks' },
)
