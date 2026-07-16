import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const FilterPreset = sequelize.define(
  'FilterPreset',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'workspace_id',
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    module: {
      type: DataTypes.ENUM('leads', 'deals', 'opportunities', 'tasks'),
      allowNull: false,
    },
    filterJson: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'filter_json',
    },
  },
  {
    tableName: 'filter_presets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
)
