'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users')

    if (!table.department) {
      await queryInterface.addColumn('users', 'department', {
        type: Sequelize.STRING(120),
        allowNull: true,
      })
    }
    if (!table.job_title) {
      await queryInterface.addColumn('users', 'job_title', {
        type: Sequelize.STRING(160),
        allowNull: true,
      })
    }
    if (!table.business_phone) {
      await queryInterface.addColumn('users', 'business_phone', {
        type: Sequelize.STRING(32),
        allowNull: true,
      })
    }
    if (!table.whatsapp_number) {
      await queryInterface.addColumn('users', 'whatsapp_number', {
        type: Sequelize.STRING(32),
        allowNull: true,
      })
    }
    if (!table.profile_photo_url) {
      await queryInterface.addColumn('users', 'profile_photo_url', {
        type: Sequelize.STRING(1024),
        allowNull: true,
      })
    }
    if (!table.last_login_at) {
      await queryInterface.addColumn('users', 'last_login_at', {
        type: Sequelize.DATE,
        allowNull: true,
      })
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('users')

    if (table.last_login_at) await queryInterface.removeColumn('users', 'last_login_at')
    if (table.profile_photo_url) await queryInterface.removeColumn('users', 'profile_photo_url')
    if (table.whatsapp_number) await queryInterface.removeColumn('users', 'whatsapp_number')
    if (table.business_phone) await queryInterface.removeColumn('users', 'business_phone')
    if (table.job_title) await queryInterface.removeColumn('users', 'job_title')
    if (table.department) await queryInterface.removeColumn('users', 'department')
  },
}
