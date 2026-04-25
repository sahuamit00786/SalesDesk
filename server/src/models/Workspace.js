import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const Workspace = sequelize.define(
  'Workspace',
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
      references: {
        model: 'companies',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(240),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(199),
      allowNull: true,
    },
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'archived_at',
    },
  },
  {
    tableName: 'workspaces',
  },
)
