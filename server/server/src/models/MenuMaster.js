import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const MenuMaster = sequelize.define(
  'MenuMaster',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    key: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    label: { type: DataTypes.STRING(160), allowNull: false },
    route: { type: DataTypes.STRING(240), allowNull: true },
    parentId: { type: DataTypes.UUID, allowNull: true, field: 'parent_id' },
    sortOrder: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0, field: 'sort_order' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    resource: { type: DataTypes.STRING(64), allowNull: true },
    action: { type: DataTypes.STRING(32), allowNull: true },
  },
  { tableName: 'menu_master' },
)
