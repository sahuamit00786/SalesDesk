import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

/**
 * Per-user, per-menu CRUD grants. Replaces the old role-scoped CompanyRoleMenu as the
 * source of truth for menu access — role (CompanyRole/userRoleKind) is now just a label,
 * not a permission carrier. Every flag defaults false: new users start with zero menu
 * access until an admin explicitly grants it on their permissions page.
 */
export const UserMenuPermission = sequelize.define(
  'UserMenuPermission',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    menuId: { type: DataTypes.UUID, allowNull: false, field: 'menu_id' },
    canView: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'can_view' },
    canEdit: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'can_edit' },
    canUpdate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'can_update' },
    canDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'can_delete' },
  },
  {
    tableName: 'user_menu_permissions',
    indexes: [{ name: 'user_menu_permissions_user_menu_uq', unique: true, fields: ['user_id', 'menu_id'] }],
  },
)
