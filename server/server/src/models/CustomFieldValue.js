import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const CustomFieldValue = sequelize.define(
  'CustomFieldValue',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    customFieldId: { type: DataTypes.UUID, allowNull: false, field: 'custom_field_id' },
    leadId: { type: DataTypes.UUID, allowNull: false, field: 'lead_id' },
    value: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: 'custom_field_values', timestamps: true },
)
