'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lead_emails', 'from_email', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'created_by',
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('lead_emails', 'from_email');
  },
};
