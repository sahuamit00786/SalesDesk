'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('web_forms')
    if (!table.text_color) {
      await queryInterface.addColumn('web_forms', 'text_color', {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: '#0f1117',
      })
    }
    if (!table.background_color) {
      await queryInterface.addColumn('web_forms', 'background_color', {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: '#ffffff',
      })
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('web_forms', 'text_color').catch(() => {})
    await queryInterface.removeColumn('web_forms', 'background_color').catch(() => {})
  },
}
