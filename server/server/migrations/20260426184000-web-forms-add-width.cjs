'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('web_forms')
    if (!table.form_width) {
      await queryInterface.addColumn('web_forms', 'form_width', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 760,
      })
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('web_forms', 'form_width').catch(() => {})
  },
}
