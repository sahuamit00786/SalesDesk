'use strict'

const { randomUUID } = require('node:crypto')

/**
 * Ensures menu_master contains every sidebar route from the app nav (NAV_SECTIONS).
 * Missing entries are inserted; existing rows are updated by route.
 */
const SIDEBAR_MENUS = [
  { sectionKey: 'main', key: 'main.dashboard', label: 'Dashboard', route: '/dashboard' },
  { sectionKey: 'main', key: 'main.leads', label: 'Leads', route: '/leads' },
  { sectionKey: 'main', key: 'main.lead_distribution', label: 'Lead distribution', route: '/lead-distribution' },
  { sectionKey: 'main', key: 'main.opportunities', label: 'Opportunities', route: '/opportunities' },
  { sectionKey: 'main', key: 'main.pipeline', label: 'Pipeline', route: '/pipeline' },
  { sectionKey: 'main', key: 'main.deals', label: 'Deals', route: '/deals' },
  { sectionKey: 'main', key: 'main.deal_payments', label: 'Deal Payments', route: '/deal-payments' },
  { sectionKey: 'hr', key: 'hr.overview', label: 'HR Overview', route: '/hr' },
  { sectionKey: 'hr', key: 'hr.attendance', label: 'Attendance', route: '/attendance' },
  { sectionKey: 'hr', key: 'hr.leave', label: 'Leave', route: '/leave' },
  { sectionKey: 'hr', key: 'hr.leave_requests', label: 'My requests', route: '/leave/requests' },
  { sectionKey: 'hr', key: 'hr.leave_approval', label: 'Approval queue', route: '/leave/approval' },
  { sectionKey: 'hr', key: 'hr.leave_config', label: 'Leave settings', route: '/leave/config' },
  { sectionKey: 'engage', key: 'engage.activities', label: 'Activities', route: '/activities' },
  { sectionKey: 'engage', key: 'engage.tasks', label: 'Tasks', route: '/tasks' },
  { sectionKey: 'engage', key: 'engage.calendar', label: 'Calendar & Reminders', route: '/calendar' },
  { sectionKey: 'engage', key: 'engage.meetings', label: 'Calls & meetings', route: '/meetings' },
  { sectionKey: 'engage', key: 'engage.email', label: 'Email', route: '/email' },
  { sectionKey: 'engage', key: 'engage.templates', label: 'Templates', route: '/templates' },
  { sectionKey: 'manage', key: 'manage.documents', label: 'Documents', route: '/documents' },
  { sectionKey: 'manage', key: 'manage.quotations', label: 'Quotations', route: '/quotations' },
  { sectionKey: 'manage', key: 'manage.quotation_templates', label: 'Quotation templates', route: '/quotations/templates' },
  { sectionKey: 'manage', key: 'manage.invoices', label: 'Invoices', route: '/invoices' },
  { sectionKey: 'manage', key: 'manage.invoice_templates', label: 'Invoice templates', route: '/invoices/templates' },
  { sectionKey: 'automate', key: 'automate.automation', label: 'Automation', route: '/automation' },
  { sectionKey: 'automate', key: 'automate.campaigns', label: 'Campaigns', route: '/campaigns' },
  { sectionKey: 'automate', key: 'automate.forms', label: 'Web forms / lead capture', route: '/forms' },
  { sectionKey: 'insights', key: 'insights.reports', label: 'Reports', route: '/reports' },
  { sectionKey: 'settings', key: 'settings.workspace', label: 'Workspace settings', route: '/workspace' },
  { sectionKey: 'settings', key: 'settings.lead_configuration', label: 'Lead configuration', route: '/lead-configuration' },
  { sectionKey: 'settings', key: 'settings.team', label: 'Team & roles', route: '/team' },
  { sectionKey: 'settings', key: 'settings.integrations', label: 'Integrations & API', route: '/integrations' },
]

const SECTION_LABELS = {
  main: 'Main',
  hr: 'HR',
  engage: 'Engage',
  manage: 'Manage',
  automate: 'Automate',
  insights: 'Insights',
  settings: 'Settings',
}

const LEGACY_ROUTE_ALIASES = {
  '/': '/dashboard',
  '/calls': '/meetings',
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return

    const now = new Date()
    const sectionIds = new Map()

    async function ensureSection(sectionKey) {
      if (sectionIds.has(sectionKey)) return sectionIds.get(sectionKey)
      const [rows] = await queryInterface.sequelize.query(
        'SELECT id FROM menu_master WHERE `key` = :key LIMIT 1',
        { replacements: { key: sectionKey } },
      )
      if (rows?.length) {
        sectionIds.set(sectionKey, rows[0].id)
        return rows[0].id
      }
      const id = randomUUID()
      const label = SECTION_LABELS[sectionKey] || sectionKey
      const [maxSortRows] = await queryInterface.sequelize.query(
        'SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM menu_master',
      )
      const sortOrder = Number(maxSortRows[0]?.maxSort || 0) + 1
      await queryInterface.bulkInsert('menu_master', [
        {
          id,
          key: sectionKey,
          label,
          route: null,
          parent_id: null,
          sort_order: sortOrder,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ])
      sectionIds.set(sectionKey, id)
      return id
    }

    let sortOrder = 0
    for (const entry of SIDEBAR_MENUS) {
      sortOrder += 1
      const parentId = await ensureSection(entry.sectionKey)
      const routesToMatch = [entry.route]
      const legacy = Object.entries(LEGACY_ROUTE_ALIASES).find(([, next]) => next === entry.route)
      if (legacy) routesToMatch.push(legacy[0])

      const [existing] = await queryInterface.sequelize.query(
        `SELECT id, \`key\`, route FROM menu_master
         WHERE route IN (:routes) OR \`key\` = :key
         LIMIT 1`,
        { replacements: { routes: routesToMatch, key: entry.key } },
      )

      if (existing?.length) {
        await queryInterface.sequelize.query(
          `UPDATE menu_master
           SET \`key\` = :key, label = :label, route = :route, parent_id = :parentId,
               sort_order = :sortOrder, is_active = 1, updated_at = :now
           WHERE id = :id`,
          {
            replacements: {
              id: existing[0].id,
              key: entry.key,
              label: entry.label,
              route: entry.route,
              parentId,
              sortOrder,
              now,
            },
          },
        )
        continue
      }

      await queryInterface.bulkInsert('menu_master', [
        {
          id: randomUUID(),
          key: entry.key,
          label: entry.label,
          route: entry.route,
          parent_id: parentId,
          sort_order: sortOrder,
          is_active: true,
          resource: 'reports',
          action: 'view',
          created_at: now,
          updated_at: now,
        },
      ])
    }

    // Re-home legacy HR keys that lived under main.*
    await queryInterface.sequelize.query(`
      UPDATE menu_master child
      JOIN menu_master parent ON parent.\`key\` = 'hr'
      SET child.parent_id = parent.id, child.updated_at = NOW()
      WHERE child.route IN ('/attendance','/leave','/leave/requests','/leave/approval','/leave/config','/hr')
        AND (child.parent_id IS NULL OR child.parent_id != parent.id)
    `)

    // Align sales doc keys under manage section when they were seeded under main
    await queryInterface.sequelize.query(`
      UPDATE menu_master child
      JOIN menu_master parent ON parent.\`key\` = 'manage'
      SET child.parent_id = parent.id, child.updated_at = NOW()
      WHERE child.route IN ('/quotations','/quotations/templates','/invoices','/invoices/templates')
        AND (child.parent_id IS NULL OR child.parent_id != parent.id)
    `)
  },

  async down() {
    // Non-destructive: keep synced menus in place on rollback.
  },
}
