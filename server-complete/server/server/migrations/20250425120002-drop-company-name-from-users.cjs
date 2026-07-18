'use strict'

const { randomUUID } = require('node:crypto')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const desc = await queryInterface.describeTable('users').catch(() => null)
    if (!desc || !desc.company_name) return

    const [rows] = await queryInterface.sequelize.query(
      `SELECT id, company_name FROM users WHERE company_id IS NULL AND company_name IS NOT NULL AND TRIM(company_name) <> ''`,
    )

    for (const row of rows) {
      const cid = randomUUID()
      await queryInterface.bulkInsert('companies', [
        {
          id: cid,
          name: row.company_name,
          domain: null,
          industry: null,
          address_line1: null,
          city: null,
          country: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
      await queryInterface.sequelize.query(`UPDATE users SET company_id = ? WHERE id = ?`, {
        replacements: [cid, row.id],
      })
    }

    await queryInterface.removeColumn('users', 'company_name')
  },

  async down(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('users').catch(() => null)
    if (!desc || desc.company_name) return

    await queryInterface.addColumn('users', 'company_name', {
      type: Sequelize.STRING(200),
      allowNull: true,
    })
  },
}
