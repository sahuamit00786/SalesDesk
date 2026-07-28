'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('whatsapp_messages')

    if (!table.reaction) {
      await queryInterface.addColumn('whatsapp_messages', 'reaction', {
        type: Sequelize.STRING(16),
        allowNull: true,
      })
    }
    if (!table.is_starred) {
      await queryInterface.addColumn('whatsapp_messages', 'is_starred', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      })
    }
    if (!table.reply_to_wa_message_id) {
      await queryInterface.addColumn('whatsapp_messages', 'reply_to_wa_message_id', {
        type: Sequelize.STRING(128),
        allowNull: true,
      })
    }
    if (!table.hidden_at) {
      await queryInterface.addColumn('whatsapp_messages', 'hidden_at', {
        type: Sequelize.DATE,
        allowNull: true,
      })
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('whatsapp_messages')
    if (table.hidden_at) await queryInterface.removeColumn('whatsapp_messages', 'hidden_at')
    if (table.reply_to_wa_message_id) await queryInterface.removeColumn('whatsapp_messages', 'reply_to_wa_message_id')
    if (table.is_starred) await queryInterface.removeColumn('whatsapp_messages', 'is_starred')
    if (table.reaction) await queryInterface.removeColumn('whatsapp_messages', 'reaction')
  },
}
