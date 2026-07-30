'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('meetings', 'reminder_sent_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('meetings', 'reminder_sent_at')
  },
}
