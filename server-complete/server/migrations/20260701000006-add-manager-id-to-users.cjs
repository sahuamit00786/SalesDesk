'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const cols = await queryInterface.describeTable('users')
    if (!cols.manager_id) {
      await queryInterface.addColumn('users', 'manager_id', {
        type: Sequelize.CHAR(36),
        allowNull: true,
        defaultValue: null,
      })
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn('users', 'manager_id')
    } catch {}
  },
}
