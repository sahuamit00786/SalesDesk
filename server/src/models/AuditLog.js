import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: true, field: 'company_id' },
    userId: { type: DataTypes.UUID, allowNull: true, field: 'user_id' },
    userEmail: { type: DataTypes.STRING(255), allowNull: true, field: 'user_email' },
    action: { type: DataTypes.STRING(100), allowNull: false },
    resourceType: { type: DataTypes.STRING(50), allowNull: true, field: 'resource_type' },
    resourceId: { type: DataTypes.STRING(36), allowNull: true, field: 'resource_id' },
    oldValues: { type: DataTypes.TEXT('long'), allowNull: true, field: 'old_values' },
    newValues: { type: DataTypes.TEXT('long'), allowNull: true, field: 'new_values' },
    ipAddress: { type: DataTypes.STRING(45), allowNull: true, field: 'ip_address' },
    userAgent: { type: DataTypes.TEXT, allowNull: true, field: 'user_agent' },
    statusCode: { type: DataTypes.INTEGER, allowNull: true, field: 'status_code' },
  },
  {
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false,
    paranoid: false,
    indexes: [
      { fields: ['company_id', 'created_at'], name: 'idx_audit_company_date' },
      { fields: ['user_id', 'created_at'], name: 'idx_audit_user_date' },
      { fields: ['resource_type', 'resource_id'], name: 'idx_audit_resource' },
    ],
  },
)
