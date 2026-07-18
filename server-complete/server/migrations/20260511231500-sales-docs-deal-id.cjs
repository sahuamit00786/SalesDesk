'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('deals')) return

    const qDesc = await queryInterface.describeTable('quotations').catch(() => null)
    if (qDesc && !qDesc.deal_id) {
      await queryInterface.addColumn('quotations', 'deal_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'deals', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })
      await queryInterface.addIndex('quotations', ['deal_id'], { name: 'quotations_deal_id_idx' })
    }

    const invDesc = await queryInterface.describeTable('invoices').catch(() => null)
    if (invDesc && !invDesc.deal_id) {
      await queryInterface.addColumn('invoices', 'deal_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'deals', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })
      await queryInterface.addIndex('invoices', ['deal_id'], { name: 'invoices_deal_id_idx' })
    }
  },

  async down(queryInterface) {
    const qDesc = await queryInterface.describeTable('quotations').catch(() => null)
    if (qDesc?.deal_id) {
      await queryInterface.removeIndex('quotations', 'quotations_deal_id_idx').catch(() => {})
      await queryInterface.removeColumn('quotations', 'deal_id')
    }
    const invDesc = await queryInterface.describeTable('invoices').catch(() => null)
    if (invDesc?.deal_id) {
      await queryInterface.removeIndex('invoices', 'invoices_deal_id_idx').catch(() => {})
      await queryInterface.removeColumn('invoices', 'deal_id')
    }
  },
}
