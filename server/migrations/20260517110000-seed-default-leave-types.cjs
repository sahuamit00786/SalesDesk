'use strict'

const { randomUUID } = require('node:crypto')

const DEFAULT_LEAVE_TYPES = [
  { code: 'CL', name: 'Casual Leave', daysPerYear: 12, isPaid: true, carryForward: false, maxCarryForwardDays: 0 },
  { code: 'SL', name: 'Sick Leave', daysPerYear: 12, isPaid: true, carryForward: false, maxCarryForwardDays: 0 },
  { code: 'EL', name: 'Earned Leave', daysPerYear: 15, isPaid: true, carryForward: true, maxCarryForwardDays: 10 },
  { code: 'UL', name: 'Unpaid Leave', daysPerYear: 365, isPaid: false, carryForward: false, maxCarryForwardDays: 0 },
]

module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('leave_types') || !tables.includes('companies')) return

    const [companies] = await queryInterface.sequelize.query('SELECT id FROM companies')
    if (!Array.isArray(companies) || !companies.length) return

    const now = new Date()
    const year = now.getFullYear()

    for (const company of companies) {
      const companyId = company.id
      for (const lt of DEFAULT_LEAVE_TYPES) {
        const [existing] = await queryInterface.sequelize.query(
          `SELECT id FROM leave_types WHERE company_id = :companyId AND code = :code LIMIT 1`,
          { replacements: { companyId, code: lt.code } },
        )
        if (existing?.length) continue

        const leaveTypeId = randomUUID()
        await queryInterface.bulkInsert('leave_types', [
          {
            id: leaveTypeId,
            company_id: companyId,
            name: lt.name,
            code: lt.code,
            days_per_year: lt.daysPerYear,
            is_paid: lt.isPaid,
            carry_forward: lt.carryForward,
            max_carry_forward_days: lt.maxCarryForwardDays,
            created_at: now,
            updated_at: now,
          },
        ])

        const [users] = await queryInterface.sequelize.query(
          `SELECT id FROM users WHERE company_id = :companyId AND is_active = 1`,
          { replacements: { companyId } },
        )
        if (!Array.isArray(users) || !users.length) continue

        const balanceRows = users.map((u) => ({
          id: randomUUID(),
          user_id: u.id,
          leave_type_id: leaveTypeId,
          company_id: companyId,
          year,
          allocated: lt.daysPerYear,
          used: 0,
          pending: 0,
          available: lt.daysPerYear,
          created_at: now,
          updated_at: now,
        }))
        if (balanceRows.length) {
          await queryInterface.bulkInsert('leave_balances', balanceRows)
        }
      }
    }
  },

  async down() {
    // Seed data is left in place on rollback to avoid orphaning balances
  },
}
