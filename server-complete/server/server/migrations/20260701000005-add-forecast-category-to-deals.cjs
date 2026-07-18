'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const cols = await queryInterface.describeTable('deals')
    if (!cols.forecast_category) {
      await queryInterface.addColumn('deals', 'forecast_category', {
        type: Sequelize.ENUM('pipeline', 'best_case', 'committed', 'closed_won', 'omitted'),
        allowNull: true,
        defaultValue: null,
      })
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn('deals', 'forecast_category')
    } catch {}
  },
}
