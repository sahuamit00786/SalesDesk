import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const LeaveBalance = sequelize.define(
  'LeaveBalance',
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
    leaveTypeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'leave_type_id',
      references: { model: 'leave_types', key: 'id' },
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
      references: { model: 'companies', key: 'id' },
    },
    year: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
    },
    allocated: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      defaultValue: 0,
    },
    used: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      defaultValue: 0,
    },
    pending: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      defaultValue: 0,
    },
    available: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'leave_balances',
    timestamps: true,
    indexes: [{ unique: true, fields: ['user_id', 'leave_type_id', 'year'] }],
  },
)
