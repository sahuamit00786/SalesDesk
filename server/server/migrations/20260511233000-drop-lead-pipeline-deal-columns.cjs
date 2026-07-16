'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('leads').catch(() => null)
    if (!desc) return

    if (desc.is_pipeline_deal) {
      const dialect = queryInterface.sequelize.getDialect()
      if (dialect === 'postgres') {
        await queryInterface.sequelize.query('DELETE FROM leads WHERE is_pipeline_deal IS TRUE')
      } else {
        await queryInterface.sequelize.query('DELETE FROM leads WHERE is_pipeline_deal = 1')
      }
    }

    if (desc.parent_opportunity_lead_id) {
      await queryInterface.removeIndex('leads', 'leads_parent_opportunity_lead_id_idx').catch(() => {})
      await queryInterface.removeColumn('leads', 'parent_opportunity_lead_id')
    }

    const desc2 = await queryInterface.describeTable('leads').catch(() => null)
    if (desc2?.is_pipeline_deal) {
      await queryInterface.removeIndex('leads', 'leads_workspace_opp_pipeline_deal_idx').catch(() => {})
      await queryInterface.removeColumn('leads', 'is_pipeline_deal')
    }
  },

  async down(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('leads').catch(() => null)
    if (!desc) return

    if (!desc.is_pipeline_deal) {
      await queryInterface.addColumn('leads', 'is_pipeline_deal', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      })
      await queryInterface.addIndex('leads', ['workspace_id', 'is_opportunity', 'is_pipeline_deal', 'is_deleted'], {
        name: 'leads_workspace_opp_pipeline_deal_idx',
      })
    }

    const desc2 = await queryInterface.describeTable('leads').catch(() => null)
    if (!desc2?.parent_opportunity_lead_id) {
      await queryInterface.addColumn('leads', 'parent_opportunity_lead_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'leads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })
      await queryInterface.addIndex('leads', ['parent_opportunity_lead_id'], {
        name: 'leads_parent_opportunity_lead_id_idx',
      })
    }
  },
}
