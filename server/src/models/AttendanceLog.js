import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const AttendanceLog = sequelize.define(
  'AttendanceLog',
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
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
      references: { model: 'companies', key: 'id' },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'check_in_time',
    },
    checkOutTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'check_out_time',
    },
    totalHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'total_hours',
    },
    status: {
      type: DataTypes.ENUM('present', 'half_day', 'absent', 'late'),
      allowNull: false,
      defaultValue: 'present',
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    editedByUserId: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      field: 'edited_by_user_id',
      references: { model: 'users', key: 'id' },
    },
    editedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'edited_at',
    },
  },
  {
    tableName: 'attendance_logs',
    timestamps: true,
    indexes: [{ unique: true, fields: ['user_id', 'date'] }],
  },
)
