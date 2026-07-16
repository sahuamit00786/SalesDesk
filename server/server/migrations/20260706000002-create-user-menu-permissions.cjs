'use strict'

/**
 * Per-user menu-CRUD permissions, replacing role-scoped company_role_menus as the
 * enforcement source of truth. Intentionally NOT backfilled from existing roles —
 * every user starts with zero menu access; admins grant per-user from their profile page.
 *
 * Raw SQL (not queryInterface.createTable) because the two FK columns must match their
 * referenced table's exact collation and Sequelize's `collate` column option does not
 * reliably emit that DDL: users.id is utf8mb4_0900_ai_ci while menu_master.id is
 * utf8mb4_bin — MySQL rejects an FK across mismatched collations.
 */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('user_menu_permissions')) return

    await queryInterface.sequelize.query(`
      CREATE TABLE user_menu_permissions (
        id CHAR(36) NOT NULL PRIMARY KEY,
        user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        menu_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        can_view TINYINT(1) NOT NULL DEFAULT 0,
        can_edit TINYINT(1) NOT NULL DEFAULT 0,
        can_update TINYINT(1) NOT NULL DEFAULT 0,
        can_delete TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY user_menu_permissions_user_menu_uq (user_id, menu_id),
        CONSTRAINT user_menu_permissions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT user_menu_permissions_menu_fk FOREIGN KEY (menu_id) REFERENCES menu_master(id) ON UPDATE CASCADE ON DELETE CASCADE
      )
    `)
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('user_menu_permissions')) await queryInterface.dropTable('user_menu_permissions')
  },
}
