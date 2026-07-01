'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Unique constraint: one public holiday per company per date
    await queryInterface.addIndex('public_holidays', ['company_id', 'date'], {
      unique: true,
      name: 'public_holidays_company_date_unique',
    })

    // 2. Adjustment note for leave balance auditing
    await queryInterface.addColumn('leave_balances', 'adjustment_note', {
      type: Sequelize.STRING(500),
      allowNull: true,
      defaultValue: null,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('public_holidays', 'public_holidays_company_date_unique')
    await queryInterface.removeColumn('leave_balances', 'adjustment_note')
  },
}
