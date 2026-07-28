'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('whatsapp_conversations')
    if (!table.last_inbound_message_at) {
      await queryInterface.addColumn('whatsapp_conversations', 'last_inbound_message_at', {
        type: Sequelize.DATE,
        allowNull: true,
      })
    }
  },
  async down(queryInterface) {
    const table = await queryInterface.describeTable('whatsapp_conversations')
    if (table.last_inbound_message_at) await queryInterface.removeColumn('whatsapp_conversations', 'last_inbound_message_at')
  },
}
