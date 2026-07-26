'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('whatsapp_conversations')
    if (!table.pin_order) {
      await queryInterface.addColumn('whatsapp_conversations', 'pin_order', {
        type: Sequelize.INTEGER,
        allowNull: true,
      })
    }
  },
  async down(queryInterface) {
    const table = await queryInterface.describeTable('whatsapp_conversations')
    if (table.pin_order) await queryInterface.removeColumn('whatsapp_conversations', 'pin_order')
  },
}
