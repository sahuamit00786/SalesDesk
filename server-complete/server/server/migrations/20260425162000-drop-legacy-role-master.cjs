'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    const usersDesc = await queryInterface.describeTable('users').catch(() => null)
    const invDesc = await queryInterface.describeTable('invitations').catch(() => null)

    if (invDesc?.role_master_id) {
      await queryInterface.removeColumn('invitations', 'role_master_id')
    }
    if (usersDesc?.role_master_id) {
      await queryInterface.removeColumn('users', 'role_master_id')
    }
    if (tables.includes('role_permissions')) {
      await queryInterface.dropTable('role_permissions')
    }
    if (tables.includes('role_master')) {
      await queryInterface.dropTable('role_master')
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('role_master')) {
      await queryInterface.createTable('role_master', {
        id: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, primaryKey: true },
        slug: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        name: { type: Sequelize.STRING(120), allowNull: false },
        sort_order: { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 0 },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
    }
    if (!tables.includes('role_permissions')) {
      await queryInterface.createTable('role_permissions', {
        id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
        role_master_id: {
          type: Sequelize.TINYINT.UNSIGNED,
          allowNull: false,
          references: { model: 'role_master', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        resource: { type: Sequelize.STRING(64), allowNull: false },
        action: { type: Sequelize.STRING(32), allowNull: false },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
    }
    const usersDesc = await queryInterface.describeTable('users').catch(() => null)
    if (usersDesc && !usersDesc.role_master_id) {
      await queryInterface.addColumn('users', 'role_master_id', {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: true,
      })
    }
    const invDesc = await queryInterface.describeTable('invitations').catch(() => null)
    if (invDesc && !invDesc.role_master_id) {
      await queryInterface.addColumn('invitations', 'role_master_id', {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: true,
      })
    }
  },
}
