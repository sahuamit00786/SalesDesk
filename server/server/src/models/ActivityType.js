import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const ActivityType = sequelize.define(
  'ActivityType',
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
    },
    key: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'Sparkles',
    },
    color: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: '#64748b',
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_default',
    },
  },
  {
    tableName: 'activity_types',
    timestamps: true,
    underscored: true,
  },
)
