'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    const qi = queryInterface

    if (tables.includes('invoices')) {
      const desc = await qi.describeTable('invoices').catch(() => ({}))
      if (!desc.document_theme) {
        await qi.addColumn('invoices', 'document_theme', {
          type: Sequelize.JSON,
          allowNull: true,
        })
      }
    }

    if (tables.includes('quotations')) {
      const desc = await qi.describeTable('quotations').catch(() => ({}))
      if (!desc.document_theme) {
        await qi.addColumn('quotations', 'document_theme', {
          type: Sequelize.JSON,
          allowNull: true,
        })
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('invoices')) {
      const desc = await queryInterface.describeTable('invoices').catch(() => ({}))
      if (desc.document_theme) await queryInterface.removeColumn('invoices', 'document_theme')
    }
    if (tables.includes('quotations')) {
      const desc = await queryInterface.describeTable('quotations').catch(() => ({}))
      if (desc.document_theme) await queryInterface.removeColumn('quotations', 'document_theme')
    }
  },
}
