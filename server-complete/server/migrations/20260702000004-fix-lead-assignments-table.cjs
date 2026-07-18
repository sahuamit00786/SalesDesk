'use strict'

/**
 * The original lead_assignments createTable (20260425201000) silently swallowed its error
 * via `.catch(() => {})`. It failed because leads.id (utf8mb4_bin) and users.id
 * (utf8mb4_0900_ai_ci) have mismatched collations, which MySQL rejects for FK columns.
 * That migration is already recorded in SequelizeMeta, so it will never re-run — this
 * migration creates the table for real, with explicit per-column collations matching
 * each referenced table (same pattern as user_workspaces).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('lead_assignments')) return

    await queryInterface.createTable('lead_assignments', {
      lead_id: {
        type: 'CHAR(36) COLLATE utf8mb4_bin',
        allowNull: false,
        primaryKey: true,
        references: { model: 'leads', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      user_id: {
        type: 'CHAR(36) COLLATE utf8mb4_0900_ai_ci',
        allowNull: false,
        primaryKey: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
    })
    await queryInterface.addIndex('lead_assignments', ['user_id'], { name: 'lead_assignments_user_idx' })
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('lead_assignments')) {
      await queryInterface.dropTable('lead_assignments')
    }
  },
}
