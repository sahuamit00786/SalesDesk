'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables()
  const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t))
  return names.includes(tableName)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'documents'))) return
    const desc = await queryInterface.describeTable('documents')
    if (desc.description) return
    await queryInterface.addColumn('documents', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, 'documents'))) return
    const desc = await queryInterface.describeTable('documents')
    if (!desc.description) return
    await queryInterface.removeColumn('documents', 'description')
  },
}
