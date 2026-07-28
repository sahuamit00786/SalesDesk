'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('whatsapp_messages')
    if (!table.template_name) {
      await queryInterface.addColumn('whatsapp_messages', 'template_name', {
        type: Sequelize.STRING(255),
        allowNull: true,
      })
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('whatsapp_messages')
    if (table.template_name) await queryInterface.removeColumn('whatsapp_messages', 'template_name')
  },
}
