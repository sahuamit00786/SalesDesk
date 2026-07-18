'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lead_emails', 'tracking_id', {
      type: Sequelize.UUID,
      allowNull: true,
      unique: true,
    })
    await queryInterface.addColumn('lead_emails', 'opened_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })
    await queryInterface.addColumn('lead_emails', 'clicked_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })
    await queryInterface.addColumn('lead_emails', 'open_count', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    })
    await queryInterface.addColumn('lead_emails', 'click_count', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('lead_emails', 'click_count')
    await queryInterface.removeColumn('lead_emails', 'open_count')
    await queryInterface.removeColumn('lead_emails', 'clicked_at')
    await queryInterface.removeColumn('lead_emails', 'opened_at')
    await queryInterface.removeColumn('lead_emails', 'tracking_id')
  },
}
