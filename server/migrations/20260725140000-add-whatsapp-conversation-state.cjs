'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('whatsapp_conversations')

    if (!table.is_pinned) {
      await queryInterface.addColumn('whatsapp_conversations', 'is_pinned', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      })
    }
    if (!table.is_archived) {
      await queryInterface.addColumn('whatsapp_conversations', 'is_archived', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      })
    }
    if (!table.is_muted) {
      await queryInterface.addColumn('whatsapp_conversations', 'is_muted', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      })
    }
    if (!table.deleted_at) {
      await queryInterface.addColumn('whatsapp_conversations', 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true,
      })
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('whatsapp_conversations')
    if (table.deleted_at) await queryInterface.removeColumn('whatsapp_conversations', 'deleted_at')
    if (table.is_muted) await queryInterface.removeColumn('whatsapp_conversations', 'is_muted')
    if (table.is_archived) await queryInterface.removeColumn('whatsapp_conversations', 'is_archived')
    if (table.is_pinned) await queryInterface.removeColumn('whatsapp_conversations', 'is_pinned')
  },
}
