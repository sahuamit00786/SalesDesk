'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('leads', 'is_pipeline_deal', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    })
    await queryInterface.addIndex('leads', ['workspace_id', 'is_opportunity', 'is_pipeline_deal', 'is_deleted'], {
      name: 'leads_workspace_opp_pipeline_deal_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('leads', 'leads_workspace_opp_pipeline_deal_idx')
    await queryInterface.removeColumn('leads', 'is_pipeline_deal')
  },
}
