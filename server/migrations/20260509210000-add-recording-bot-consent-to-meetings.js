'use strict'

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('meetings', 'recording_bot_consent', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('meetings', 'recording_bot_consent')
  },
}
