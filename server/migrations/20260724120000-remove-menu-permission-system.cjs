'use strict'

/**
 * Removes the per-user menu-CRUD permission system (user_menu_permissions, menu_master,
 * and the legacy role-scoped company_role_menus that predates it). Menu visibility is now
 * hardcoded client-side by role (see client/src/utils/menuAccess.js): company admins,
 * workspace_admin, and manager see every menu; every other role sees a fixed subset.
 * Backend route-level permission checks (requirePermission/loadPermissions) were removed
 * in the same change — every authenticated user now has full CRUD via the API.
 *
 * company_roles (role labels / userRoleKind) is untouched — that table still backs
 * row-level record visibility (leadAccessWhere) and the hardcoded elevated-role check.
 */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    // FK-safe order: user_menu_permissions references menu_master + users + workspaces;
    // company_role_menus references company_roles + menu_master; menu_master is
    // self-referencing (parent_id) so it must go last.
    if (tables.includes('user_menu_permissions')) await queryInterface.dropTable('user_menu_permissions')
    if (tables.includes('company_role_menus')) await queryInterface.dropTable('company_role_menus')
    if (tables.includes('menu_master')) await queryInterface.dropTable('menu_master')
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()

    if (!tables.includes('menu_master')) {
      await queryInterface.createTable('menu_master', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        key: { type: Sequelize.STRING(120), allowNull: false, unique: true },
        label: { type: Sequelize.STRING(160), allowNull: false },
        route: { type: Sequelize.STRING(240), allowNull: true },
        parent_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'menu_master', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        sort_order: { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 0 },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        resource: { type: Sequelize.STRING(64), allowNull: true },
        action: { type: Sequelize.STRING(32), allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
    }

    if (!tables.includes('company_role_menus')) {
      await queryInterface.createTable('company_role_menus', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        company_role_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'company_roles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        menu_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'menu_master', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        can_view: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        can_edit: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        can_update: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        can_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('company_role_menus', ['company_role_id', 'menu_id'], {
        name: 'company_role_menus_role_menu_uq',
        unique: true,
      })
    }

    if (!tables.includes('user_menu_permissions')) {
      // Raw SQL (not queryInterface.createTable): the FK columns must match their
      // referenced table's exact collation — users.id is utf8mb4_0900_ai_ci while
      // menu_master.id/workspaces.id are utf8mb4_bin — see the original
      // 20260706000002/20260722130000 migrations this mirrors.
      await queryInterface.sequelize.query(`
        CREATE TABLE user_menu_permissions (
          id CHAR(36) NOT NULL PRIMARY KEY,
          user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
          menu_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
          workspace_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
          can_view TINYINT(1) NOT NULL DEFAULT 0,
          can_edit TINYINT(1) NOT NULL DEFAULT 0,
          can_update TINYINT(1) NOT NULL DEFAULT 0,
          can_delete TINYINT(1) NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          UNIQUE KEY user_menu_permissions_user_menu_workspace_uq (user_id, menu_id, workspace_id),
          CONSTRAINT user_menu_permissions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
          CONSTRAINT user_menu_permissions_menu_fk FOREIGN KEY (menu_id) REFERENCES menu_master(id) ON UPDATE CASCADE ON DELETE CASCADE,
          CONSTRAINT user_menu_permissions_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE
        )
      `)
    }
    // Note: this recreates empty tables only — the menu catalog seed data and any
    // per-user grants are not restored, since they're not derivable after the drop.
  },
}
