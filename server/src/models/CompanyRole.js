import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'
import { roleNoForUserRoleKind } from '../constants/companyUserRoleKind.js'

export const CompanyRole = sequelize.define(
  'CompanyRole',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    name: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_default' },
    userRoleKind: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'custom',
      field: 'user_role_kind',
    },
    /** 1 = workspace_admin, 2 = manager, 3 = sales; null for custom */
    roleNo: { type: DataTypes.TINYINT, allowNull: true, field: 'role_no' },
    createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
  },
  {
    tableName: 'company_roles',
    indexes: [{ name: 'company_roles_company_name_uq', unique: true, fields: ['company_id', 'name'] }],
  },
)

CompanyRole.beforeSave((instance) => {
  const kind = instance.getDataValue('userRoleKind')
  instance.setDataValue('roleNo', roleNoForUserRoleKind(kind))
})
