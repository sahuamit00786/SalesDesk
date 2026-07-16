'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
  async up(queryInterface, Sequelize) {
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
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('leads', 'leads_parent_opportunity_lead_id_idx')
    await queryInterface.removeColumn('leads', 'parent_opportunity_lead_id')
  },
}
