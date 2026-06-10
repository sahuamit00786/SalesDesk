import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const AttendanceSession = sequelize.define(
  'AttendanceSession',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
      references: { model: 'companies', key: 'id' },
    },
    logId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'log_id',
      references: { model: 'attendance_logs', key: 'id' },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'check_in_time',
    },
    checkOutTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'check_out_time',
    },
    durationHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'duration_hours',
    },
  },
  {
    tableName: 'attendance_sessions',
    timestamps: true,
    indexes: [{ fields: ['user_id', 'date'], name: 'attendance_sessions_user_date' }],
  },
)
