'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('opportunity_stages')
    if (!table.is_deal_status) {
      await queryInterface.addColumn('opportunity_stages', 'is_deal_status', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      })
    }

    // Backfill one default deal-conversion stage if possible.
    const [rows] = await queryInterface.sequelize.query(`
      SELECT id
      FROM opportunity_stages
      WHERE LOWER(name) IN ('won', 'closed_won', 'closed won')
      ORDER BY sort_order ASC, created_at ASC
      LIMIT 1
    `)
    const preferred = Array.isArray(rows) ? rows[0] : null
    if (preferred?.id) {
      await queryInterface.sequelize.query(
        'UPDATE opportunity_stages SET is_deal_status = TRUE WHERE id = :id',
        { replacements: { id: preferred.id } },
      )
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('opportunity_stages')
    if (table.is_deal_status) {
      await queryInterface.removeColumn('opportunity_stages', 'is_deal_status')
    }
  },
}
