'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('leads', 'is_opportunity', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    })
    await queryInterface.addColumn('leads', 'opportunity_stage', {
      type: Sequelize.STRING(80),
      allowNull: true,
    })
    await queryInterface.addIndex('leads', ['company_id', 'is_opportunity'], {
      name: 'leads_company_is_opportunity_idx',
    })

    // Backfill from legacy opportunities linked to leads (latest row wins if duplicates)
    await queryInterface.sequelize.query(`
      UPDATE leads l
      INNER JOIN opportunities o ON o.lead_id = l.id AND o.deleted_at IS NULL
      SET l.is_opportunity = 1,
          l.opportunity_stage = o.current_stage
      WHERE l.deleted_at IS NULL
    `)
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('leads', 'leads_company_is_opportunity_idx')
    await queryInterface.removeColumn('leads', 'opportunity_stage')
    await queryInterface.removeColumn('leads', 'is_opportunity')
  },
}
