'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('users')) {
      throw new Error('users table must exist before running add-company-id-to-users')
    }

    const desc = await queryInterface.describeTable('users')
    if (desc.company_id) return

    await queryInterface.addColumn('users', 'company_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    })
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('users').catch(() => ({}))
    if (!desc.company_id) return
    await queryInterface.removeColumn('users', 'company_id')
  },
}
