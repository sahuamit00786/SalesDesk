'use strict'

export default {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('meetings')
    if (desc.recording_bot_consent) return
    await queryInterface.addColumn('meetings', 'recording_bot_consent', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    })
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('meetings').catch(() => ({}))
    if (desc.recording_bot_consent) {
      await queryInterface.removeColumn('meetings', 'recording_bot_consent')
    }
  },
}
