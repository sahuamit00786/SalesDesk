'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const cols = await queryInterface.describeTable('users')
    if (!cols.onboarded_at) {
      await queryInterface.addColumn('users', 'onboarded_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        after: 'last_login_at',
      })
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn('users', 'onboarded_at')
    } catch {}
  },
}
