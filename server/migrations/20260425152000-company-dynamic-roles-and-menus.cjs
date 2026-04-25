'use strict'

const { randomUUID } = require('node:crypto')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
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

    if (!tables.includes('company_roles')) {
      await queryInterface.createTable('company_roles', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: { type: Sequelize.STRING(120), allowNull: false },
        description: { type: Sequelize.STRING(255), allowNull: true },
        is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_by: { type: Sequelize.UUID, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('company_roles', ['company_id', 'name'], {
        name: 'company_roles_company_name_uq',
        unique: true,
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
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('company_role_menus', ['company_role_id', 'menu_id'], {
        name: 'company_role_menus_role_menu_uq',
        unique: true,
      })
    }

    const usersDesc = await queryInterface.describeTable('users')
    if (!usersDesc.is_company_admin) {
      await queryInterface.addColumn('users', 'is_company_admin', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      })
    }
    if (!usersDesc.company_role_id) {
      await queryInterface.addColumn('users', 'company_role_id', {
        type: 'CHAR(36) COLLATE utf8mb4_bin',
        allowNull: true,
        references: { model: 'company_roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })
    }

    const invDesc = await queryInterface.describeTable('invitations').catch(() => null)
    if (invDesc && !invDesc.company_role_id) {
      await queryInterface.addColumn('invitations', 'company_role_id', {
        type: 'CHAR(36) COLLATE utf8mb4_bin',
        allowNull: true,
        references: { model: 'company_roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })
    }

    const now = new Date()
    const [existingMenus] = await queryInterface.sequelize.query('SELECT id FROM menu_master LIMIT 1')
    if (!existingMenus.length) {
      const sections = [
        ['main', 'Main', null, null, null],
        ['main.dashboard', 'Dashboard', '/', 'dashboard', 'view'],
        ['main.leads', 'Leads', '/leads', 'leads', 'view'],
        ['main.contacts', 'Contacts', '/contacts', 'contacts', 'view'],
        ['main.companies', 'Companies', '/companies', 'contacts', 'view'],
        ['main.pipeline', 'Pipeline', '/pipeline', 'reports', 'view'],
        ['main.deals', 'Deals', '/deals', 'reports', 'view'],
        ['engage', 'Engage', null, null, null],
        ['engage.activities', 'Activities', '/activities', 'reports', 'view'],
        ['engage.tasks', 'Tasks', '/tasks', 'reports', 'view'],
        ['engage.calls', 'Calls & meetings', '/calls', 'reports', 'view'],
        ['engage.email', 'Email', '/email', 'campaigns', 'view'],
        ['engage.whatsapp', 'WhatsApp / SMS', '/whatsapp', 'campaigns', 'view'],
        ['manage', 'Manage', null, null, null],
        ['manage.products', 'Products / services', '/products', 'reports', 'view'],
        ['manage.quotes', 'Quotes / proposals', '/quotes', 'reports', 'view'],
        ['manage.invoices', 'Invoices', '/invoices', 'reports', 'view'],
        ['manage.documents', 'Documents', '/documents', 'reports', 'view'],
        ['automate', 'Automate', null, null, null],
        ['automate.automation', 'Automation', '/automation', 'campaigns', 'edit'],
        ['automate.campaigns', 'Campaigns', '/campaigns', 'campaigns', 'view'],
        ['automate.forms', 'Web forms / lead capture', '/forms', 'campaigns', 'view'],
        ['insights', 'Insights', null, null, null],
        ['insights.reports', 'Reports', '/reports', 'reports', 'view'],
        ['insights.forecasting', 'Forecasting', '/forecasting', 'reports', 'view'],
        ['settings', 'Settings', null, null, null],
        ['settings.workspace', 'Workspace settings', '/workspace', 'settings', 'view'],
        ['settings.team', 'Team & roles', '/team', 'team', 'view'],
        ['settings.integrations', 'Integrations & API', '/integrations', 'settings', 'view'],
      ]

      const keyToId = new Map()
      let i = 0
      for (const [key, label, route, resource, action] of sections) {
        const id = randomUUID()
        const parentKey = key.includes('.') ? key.split('.').slice(0, -1).join('.') : null
        keyToId.set(key, id)
        await queryInterface.bulkInsert('menu_master', [
          {
            id,
            key,
            label,
            route,
            parent_id: parentKey ? keyToId.get(parentKey) : null,
            sort_order: i++,
            is_active: true,
            resource,
            action,
            created_at: now,
            updated_at: now,
          },
        ])
      }
    }

    await queryInterface.sequelize.query(`
      UPDATE users
      SET is_company_admin = CASE WHEN role_master_id IN (0,1) THEN 1 ELSE is_company_admin END
    `)

    const [companies] = await queryInterface.sequelize.query(
      `SELECT DISTINCT company_id AS companyId FROM users WHERE company_id IS NOT NULL`,
    )
    const [leafMenus] = await queryInterface.sequelize.query(
      `SELECT id FROM menu_master WHERE route IS NOT NULL AND is_active = 1`,
    )

    for (const c of companies) {
      const companyId = c.companyId
      const roleId = randomUUID()
      await queryInterface.bulkInsert('company_roles', [
        {
          id: roleId,
          company_id: companyId,
          name: 'Member',
          description: 'Default member role',
          is_default: true,
          created_by: null,
          created_at: now,
          updated_at: now,
        },
      ])
      if (leafMenus.length) {
        await queryInterface.bulkInsert(
          'company_role_menus',
          leafMenus.map((m) => ({
            id: randomUUID(),
            company_role_id: roleId,
            menu_id: m.id,
            created_at: now,
            updated_at: now,
          })),
        )
      }
      await queryInterface.sequelize.query(
        `UPDATE users
         SET company_role_id = :roleId
         WHERE company_id = :companyId
           AND is_company_admin = 0
           AND company_role_id IS NULL`,
        { replacements: { roleId, companyId } },
      )
    }
  },

  async down(queryInterface) {
    const usersDesc = await queryInterface.describeTable('users').catch(() => null)
    if (usersDesc?.company_role_id) await queryInterface.removeColumn('users', 'company_role_id')
    if (usersDesc?.is_company_admin) await queryInterface.removeColumn('users', 'is_company_admin')
    const invDesc = await queryInterface.describeTable('invitations').catch(() => null)
    if (invDesc?.company_role_id) await queryInterface.removeColumn('invitations', 'company_role_id')
    const tables = await queryInterface.showAllTables()
    if (tables.includes('company_role_menus')) await queryInterface.dropTable('company_role_menus')
    if (tables.includes('company_roles')) await queryInterface.dropTable('company_roles')
    if (tables.includes('menu_master')) await queryInterface.dropTable('menu_master')
  },
}
