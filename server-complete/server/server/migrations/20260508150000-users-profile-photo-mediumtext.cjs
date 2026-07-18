'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users')
    if (!table.profile_photo_url) return

    await queryInterface.changeColumn('users', 'profile_photo_url', {
      type: Sequelize.TEXT('medium'),
      allowNull: true,
    })
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users')
    if (!table.profile_photo_url) return

    await queryInterface.changeColumn('users', 'profile_photo_url', {
      type: Sequelize.STRING(1024),
      allowNull: true,
    })
  },
}
