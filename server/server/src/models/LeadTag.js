import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const LeadTag = sequelize.define(
  'LeadTag',
  {
    leadId: { type: DataTypes.UUID, allowNull: false, field: 'lead_id', primaryKey: true },
    tagId: { type: DataTypes.UUID, allowNull: false, field: 'tag_id', primaryKey: true },
  },
  { tableName: 'lead_tags', timestamps: false },
)
