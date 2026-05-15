'use strict'

const { addIndexIfMissing, indexExists } = require('../migration-helpers.cjs')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('leads')

    if (!desc.is_opportunity) {
      await queryInterface.addColumn('leads', 'is_opportunity', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      })
    }
    if (!desc.opportunity_stage) {
      await queryInterface.addColumn('leads', 'opportunity_stage', {
        type: Sequelize.STRING(80),
        allowNull: true,
      })
    }

    await addIndexIfMissing(queryInterface, 'leads', ['company_id', 'is_opportunity'], {
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
    const desc = await queryInterface.describeTable('leads').catch(() => ({}))
    if (await indexExists(queryInterface, 'leads', 'leads_company_is_opportunity_idx')) {
      await queryInterface.removeIndex('leads', 'leads_company_is_opportunity_idx')
    }
    if (desc.opportunity_stage) await queryInterface.removeColumn('leads', 'opportunity_stage')
    if (desc.is_opportunity) await queryInterface.removeColumn('leads', 'is_opportunity')
  },
}
