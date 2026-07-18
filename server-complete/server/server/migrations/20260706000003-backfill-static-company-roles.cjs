'use strict'

const { randomUUID } = require('crypto')

const ROLE_LABELS = {
  workspace_admin: 'Workspace admin',
  manager: 'Manager',
  sales: 'Sales',
  telecaller: 'Telecaller',
  campaign_manager: 'Campaign manager',
  marketing: 'Marketing',
  finance: 'Finance',
  hr: 'HR',
  auditor: 'Auditor',
  support: 'Support',
}

const ROLE_NO = { workspace_admin: 1, manager: 2, sales: 3 }

/** @param {import('sequelize').QueryInterface} queryInterface */
module.exports = {
  async up(queryInterface) {
    const [companies] = await queryInterface.sequelize.query('SELECT id FROM companies')
    if (!companies.length) return

    const [existingRoles] = await queryInterface.sequelize.query(
      'SELECT company_id, user_role_kind FROM company_roles',
    )
    const existingByCompany = new Map()
    for (const row of existingRoles) {
      if (!existingByCompany.has(row.company_id)) existingByCompany.set(row.company_id, new Set())
      existingByCompany.get(row.company_id).add(row.user_role_kind)
    }

    const now = new Date()
    const rowsToInsert = []
    for (const company of companies) {
      const existingKinds = existingByCompany.get(company.id) || new Set()
      for (const [kind, label] of Object.entries(ROLE_LABELS)) {
        if (existingKinds.has(kind)) continue
        rowsToInsert.push({
          id: randomUUID(),
          company_id: company.id,
          name: label,
          description: null,
          is_default: true,
          user_role_kind: kind,
          role_no: ROLE_NO[kind] ?? null,
          created_by: null,
          created_at: now,
          updated_at: now,
        })
      }
    }

    if (!rowsToInsert.length) return
    await queryInterface.bulkInsert('company_roles', rowsToInsert)
  },

  async down() {
    // Irreversible on purpose: cannot distinguish backfilled rows from pre-existing ones.
  },
}
