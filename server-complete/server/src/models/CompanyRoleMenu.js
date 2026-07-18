import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const CompanyRoleMenu = sequelize.define(
  'CompanyRoleMenu',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyRoleId: { type: DataTypes.UUID, allowNull: false, field: 'company_role_id' },
    menuId: { type: DataTypes.UUID, allowNull: false, field: 'menu_id' },
    canView: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'can_view' },
    canEdit: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'can_edit' },
    canUpdate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'can_update' },
    canDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'can_delete' },
  },
  {
    tableName: 'company_role_menus',
    indexes: [{ name: 'company_role_menus_role_menu_uq', unique: true, fields: ['company_role_id', 'menu_id'] }],
  },
)
