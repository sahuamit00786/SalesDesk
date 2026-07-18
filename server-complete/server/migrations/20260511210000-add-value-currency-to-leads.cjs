'use strict'

function tableHasColumn(desc, columnName) {
  const lower = columnName.toLowerCase()
  return Object.keys(desc).some((k) => k.toLowerCase() === lower)
}

function isDuplicateColumnError(err) {
  const msg = String(err?.message || err)
  if (/duplicate column/i.test(msg)) return true
  const errno = err?.original?.errno ?? err?.parent?.errno
  return errno === 1060 // MySQL ER_DUP_FIELDNAME
}

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('leads')
    if (tableHasColumn(desc, 'value_currency')) return
    try {
      await queryInterface.addColumn('leads', 'value_currency', {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      })
    } catch (e) {
      if (isDuplicateColumnError(e)) return
      throw e
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('leads').catch(() => ({}))
    if (tableHasColumn(desc, 'value_currency')) {
      await queryInterface.removeColumn('leads', 'value_currency').catch(() => {})
    }
  },
}
