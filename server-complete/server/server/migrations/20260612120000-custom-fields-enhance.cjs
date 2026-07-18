'use strict'

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName)
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition)
  }
}

async function addIndexIfMissing(queryInterface, tableName, fields, name, options = {}) {
  const indexes = await queryInterface.showIndex(tableName)
  if (!indexes.some((idx) => idx.name === name)) {
    await queryInterface.addIndex(tableName, fields, { name, ...options })
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('custom_fields', 'type', {
      type: Sequelize.STRING(32),
      allowNull: false,
    })

    await addColumnIfMissing(queryInterface, 'custom_field_values', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })

    await queryInterface.sequelize.query(
      'UPDATE custom_field_values SET updated_at = created_at WHERE updated_at IS NULL',
    ).catch(() => {})

    await addIndexIfMissing(
      queryInterface,
      'custom_fields',
      ['workspace_id', 'key'],
      'custom_fields_workspace_key_unique',
      { unique: true },
    )
  },

  async down(queryInterface, Sequelize) {
    const indexes = await queryInterface.showIndex('custom_fields')
    if (indexes.some((idx) => idx.name === 'custom_fields_workspace_key_unique')) {
      await queryInterface.removeIndex('custom_fields', 'custom_fields_workspace_key_unique')
    }

    const valuesTable = await queryInterface.describeTable('custom_field_values')
    if (valuesTable.updated_at) {
      await queryInterface.removeColumn('custom_field_values', 'updated_at')
    }

    await queryInterface.changeColumn('custom_fields', 'type', {
      type: Sequelize.ENUM('text', 'number', 'date', 'dropdown', 'checkbox'),
      allowNull: false,
    })
  },
}
