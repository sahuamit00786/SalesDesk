'use strict'

/**
 * Lets a user have a different role and different menu permissions per workspace,
 * instead of one global role/permission-set for the whole company. Both new columns
 * are nullable overrides — NULL keeps today's behavior (fall back to the user's
 * global company_role_id / global user_menu_permissions rows), so existing data
 * needs zero backfill.
 *
 * Collations verified directly against the DB (not assumed): workspaces.id and
 * company_roles.id are both utf8mb4_bin, same as the existing users.company_role_id /
 * invitations.company_role_id columns — so the same explicit COLLATE override those
 * use is required here too, or MySQL rejects the FK across mismatched collations.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const uwCols = await queryInterface.describeTable('user_workspaces')
    if (!uwCols.company_role_id) {
      await queryInterface.addColumn('user_workspaces', 'company_role_id', {
        type: 'CHAR(36) COLLATE utf8mb4_bin',
        allowNull: true,
        references: { model: 'company_roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })
    }

    const umpCols = await queryInterface.describeTable('user_menu_permissions')
    if (!umpCols.workspace_id) {
      await queryInterface.addColumn('user_menu_permissions', 'workspace_id', {
        type: 'CHAR(36) COLLATE utf8mb4_bin',
        allowNull: true,
        references: { model: 'workspaces', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      })
    }

    // The old unique index is what satisfies InnoDB's "leftmost column must be indexed"
    // requirement for the user_id FK — create the new index BEFORE dropping the old one,
    // or MySQL refuses the drop ("needed in a foreign key constraint").
    try {
      await queryInterface.addIndex('user_menu_permissions', ['user_id', 'menu_id', 'workspace_id'], {
        name: 'user_menu_permissions_user_menu_workspace_uq',
        unique: true,
      })
    } catch (e) {
      if (!e.message?.includes('Duplicate') && !e.message?.includes('already exists')) throw e
    }
    try {
      await queryInterface.removeIndex('user_menu_permissions', 'user_menu_permissions_user_menu_uq')
    } catch (e) {
      if (!e.message?.includes("doesn't exist") && !e.message?.includes('check that column/key exists')) throw e
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.addIndex('user_menu_permissions', ['user_id', 'menu_id'], {
        name: 'user_menu_permissions_user_menu_uq',
        unique: true,
      })
    } catch {}
    try {
      await queryInterface.removeIndex('user_menu_permissions', 'user_menu_permissions_user_menu_workspace_uq')
    } catch {}
    try {
      await queryInterface.removeColumn('user_menu_permissions', 'workspace_id')
    } catch {}
    try {
      await queryInterface.removeColumn('user_workspaces', 'company_role_id')
    } catch {}
  },
}
