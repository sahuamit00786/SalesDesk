'use strict'

/**
 * `last_inbound_message_at` was added after some companies already had real inbound
 * WhatsApp message history — those existing conversations were left with it `null`
 * despite having genuine inbound messages, which made the 24h-window banner wrongly
 * claim "this contact has never messaged you". Backfill from actual message history.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE whatsapp_conversations c
      JOIN (
        SELECT conversation_id, MAX(wa_timestamp) AS last_inbound
        FROM whatsapp_messages
        WHERE direction = 'inbound'
        GROUP BY conversation_id
      ) m ON m.conversation_id = c.id
      SET c.last_inbound_message_at = m.last_inbound
      WHERE c.last_inbound_message_at IS NULL
    `)
  },

  async down() {
    // Not meaningfully reversible — backfilled data, not a schema change.
  },
}
