'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const defs = [
      ['website_url', { type: Sequelize.STRING(255), allowNull: true }],
      ['employee_range', { type: Sequelize.STRING(32), allowNull: true }],
      ['monthly_leads_band', { type: Sequelize.STRING(32), allowNull: true }],
      ['lead_pain_notes', { type: Sequelize.TEXT, allowNull: true }],
      ['lead_pain_tags', { type: Sequelize.JSON, allowNull: true }],
      ['current_tools_notes', { type: Sequelize.TEXT, allowNull: true }],
      ['onboarding_completed_at', { type: Sequelize.DATE, allowNull: true }],
    ]

    for (const [column, spec] of defs) {
      const desc = await queryInterface.describeTable('companies').catch(() => null)
      if (!desc || desc[column]) continue
      await queryInterface.addColumn('companies', column, spec)
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('companies').catch(() => null)
    if (!desc) return
    const cols = [
      'website_url',
      'employee_range',
      'monthly_leads_band',
      'lead_pain_notes',
      'lead_pain_tags',
      'current_tools_notes',
      'onboarding_completed_at',
    ]
    for (const c of cols) {
      if (!desc[c]) continue
      await queryInterface.removeColumn('companies', c)
    }
  },
}
