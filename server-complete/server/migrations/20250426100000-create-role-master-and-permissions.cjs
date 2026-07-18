'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('role_master')) {
      await queryInterface.createTable('role_master', {
        id: {
          type: Sequelize.TINYINT.UNSIGNED,
          allowNull: false,
          primaryKey: true,
        },
        slug: {
          type: Sequelize.STRING(64),
          allowNull: false,
          unique: true,
        },
        name: {
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        sort_order: {
          type: Sequelize.SMALLINT,
          allowNull: false,
          defaultValue: 0,
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      })

      const now = new Date()
      await queryInterface.bulkInsert('role_master', [
        { id: 0, slug: 'superadmin', name: 'Superadmin', sort_order: 0, created_at: now, updated_at: now },
        { id: 1, slug: 'company_admin', name: 'Company Admin', sort_order: 1, created_at: now, updated_at: now },
        { id: 2, slug: 'manager', name: 'Manager', sort_order: 2, created_at: now, updated_at: now },
        { id: 3, slug: 'sales_person', name: 'Sales Person', sort_order: 3, created_at: now, updated_at: now },
        { id: 4, slug: 'marketer', name: 'Marketer', sort_order: 4, created_at: now, updated_at: now },
      ])
    }

    if (!tables.includes('role_permissions')) {
      await queryInterface.createTable('role_permissions', {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        role_master_id: {
          type: Sequelize.TINYINT.UNSIGNED,
          allowNull: false,
          references: { model: 'role_master', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        resource: {
          type: Sequelize.STRING(64),
          allowNull: false,
        },
        action: {
          type: Sequelize.STRING(32),
          allowNull: false,
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      })
      await queryInterface.addIndex('role_permissions', ['role_master_id'], { name: 'rp_role_idx' })
      await queryInterface.addIndex('role_permissions', ['role_master_id', 'resource', 'action'], {
        unique: true,
        name: 'rp_role_res_action_uq',
      })

      const now = new Date()
      const rows = []

      const add = (roleId, resource, action) => {
        rows.push({ role_master_id: roleId, resource, action, created_at: now, updated_at: now })
      }

      // 0 superadmin — full platform (wildcard)
      add(0, '*', 'admin')

      // 1 company_admin — all modules except lockout of superadmin-only paths
      ;['leads', 'contacts', 'team', 'settings', 'reports', 'campaigns'].forEach((r) => {
        add(1, r, 'admin')
      })

      // 2 manager
      add(2, 'leads', 'view')
      add(2, 'leads', 'edit')
      add(2, 'leads', 'export')
      add(2, 'contacts', 'view')
      add(2, 'contacts', 'edit')
      add(2, 'team', 'view')
      add(2, 'team', 'edit')
      add(2, 'reports', 'view')
      add(2, 'reports', 'export')
      add(2, 'campaigns', 'view')
      add(2, 'campaigns', 'edit')

      // 3 sales_person
      add(3, 'leads', 'view')
      add(3, 'leads', 'edit')
      add(3, 'contacts', 'view')
      add(3, 'contacts', 'edit')
      add(3, 'reports', 'view')

      // 4 marketer
      add(4, 'leads', 'view')
      add(4, 'team', 'view')
      add(4, 'campaigns', 'view')
      add(4, 'campaigns', 'edit')
      add(4, 'reports', 'view')
      add(4, 'reports', 'export')

      await queryInterface.bulkInsert('role_permissions', rows)
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('role_permissions')) {
      await queryInterface.dropTable('role_permissions')
    }
    if (tables.includes('role_master')) {
      await queryInterface.dropTable('role_master')
    }
  },
}
