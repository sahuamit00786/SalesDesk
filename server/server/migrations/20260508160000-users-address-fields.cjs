'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users')

    if (!table.street) {
      await queryInterface.addColumn('users', 'street', {
        type: Sequelize.STRING(500),
        allowNull: true,
      })
    }
    if (!table.city) {
      await queryInterface.addColumn('users', 'city', {
        type: Sequelize.STRING(120),
        allowNull: true,
      })
    }
    if (!table.country) {
      await queryInterface.addColumn('users', 'country', {
        type: Sequelize.STRING(120),
        allowNull: true,
      })
    }
    if (!table.postal_code) {
      await queryInterface.addColumn('users', 'postal_code', {
        type: Sequelize.STRING(32),
        allowNull: true,
      })
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('users')
    if (table.postal_code) await queryInterface.removeColumn('users', 'postal_code')
    if (table.country) await queryInterface.removeColumn('users', 'country')
    if (table.city) await queryInterface.removeColumn('users', 'city')
    if (table.street) await queryInterface.removeColumn('users', 'street')
  },
}
