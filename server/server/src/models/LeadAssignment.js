import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const LeadAssignment = sequelize.define(
  'LeadAssignment',
  {
    leadId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: 'lead_id' },
    userId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: 'user_id' },
  },
  { tableName: 'lead_assignments', timestamps: false },
)
