'use strict'

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName)
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition)
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('country_phone_codes', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      country_name: { type: Sequelize.STRING(120), allowNull: false },
      iso2: { type: Sequelize.STRING(2), allowNull: false },
      dial_code: { type: Sequelize.STRING(8), allowNull: false },
      leading_digits: { type: Sequelize.STRING(12), allowNull: true },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    }).catch(() => {})

    await addColumnIfMissing(queryInterface, 'leads', 'phone_country_code', { type: Sequelize.STRING(8), allowNull: true })
    await addColumnIfMissing(queryInterface, 'leads', 'alt_phone_country_code', { type: Sequelize.STRING(8), allowNull: true })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('country_phone_codes').catch(() => {})
  },
}
