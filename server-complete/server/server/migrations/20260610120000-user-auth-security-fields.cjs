'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'refresh_token_version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    })
    await queryInterface.addColumn('users', 'password_reset_otp_hash', {
      type: Sequelize.STRING(255),
      allowNull: true,
    })
    await queryInterface.addColumn('users', 'password_reset_otp_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'password_reset_otp_expires_at')
    await queryInterface.removeColumn('users', 'password_reset_otp_hash')
    await queryInterface.removeColumn('users', 'refresh_token_version')
  },
}
