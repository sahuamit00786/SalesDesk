import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const CompanyRole = sequelize.define(
  'CompanyRole',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    name: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_default' },
    createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
  },
  {
    tableName: 'company_roles',
    indexes: [{ name: 'company_roles_company_name_uq', unique: true, fields: ['company_id', 'name'] }],
  },
)
