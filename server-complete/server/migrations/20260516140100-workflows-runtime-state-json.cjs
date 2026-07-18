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
    if (!(await tableExists(queryInterface, 'workflows'))) return
    const desc = await queryInterface.describeTable('workflows')
    if (desc.runtime_state_json) return
    await queryInterface.addColumn('workflows', 'runtime_state_json', {
      type: Sequelize.JSON,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, 'workflows'))) return
    const desc = await queryInterface.describeTable('workflows')
    if (!desc.runtime_state_json) return
    await queryInterface.removeColumn('workflows', 'runtime_state_json')
  },
}
