import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const PublicHoliday = sequelize.define(
  'PublicHoliday',
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
      references: { model: 'companies', key: 'id' },
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { tableName: 'public_holidays', timestamps: true },
)
