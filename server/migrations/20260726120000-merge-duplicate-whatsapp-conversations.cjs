'use strict'

/**
 * Before this fix, starting a chat by typing a bare local number (no country code)
 * created a conversation keyed on that bare number — but Meta's webhook always reports
 * the customer's number as the full MSISDN (country code + number), so the instant that
 * contact actually replied, it landed in a SECOND conversation instead of the same one.
 * `wa_phone_digits` (last 10 digits) is the same for both, so it's the reliable key for
 * finding these split pairs. For each duplicate group: keep the row with a real
 * `contact_name` (only ever set from an actual inbound WhatsApp profile, so it's the one
 * the customer's replies actually land in), reassign every message onto it, recompute its
 * rollup fields from the merged history, and drop the other row(s).
 */
module.exports = {
  async up(queryInterface) {
    const [groups] = await queryInterface.sequelize.query(`
      SELECT company_id, wa_phone_digits
      FROM whatsapp_conversations
      WHERE wa_phone_digits IS NOT NULL AND wa_phone_digits != ''
      GROUP BY company_id, wa_phone_digits
      HAVING COUNT(*) > 1
    `)

    for (const group of groups) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT id, wa_phone_number, contact_name, last_message_at
         FROM whatsapp_conversations
         WHERE company_id = :companyId AND wa_phone_digits = :waPhoneDigits
         ORDER BY (contact_name IS NOT NULL) DESC, LENGTH(wa_phone_number) DESC, last_message_at DESC`,
        { replacements: { companyId: group.company_id, waPhoneDigits: group.wa_phone_digits } },
      )
      const [keeper, ...losers] = rows
      if (!keeper || losers.length === 0) continue
      const loserIds = losers.map((r) => r.id)

      await queryInterface.sequelize.query(
        `UPDATE whatsapp_messages SET conversation_id = :keeperId WHERE conversation_id IN (:loserIds)`,
        { replacements: { keeperId: keeper.id, loserIds } },
      )

      // Recompute only the fields that matter functionally (the 24h-window check reads
      // last_inbound_message_at). last_message_preview/direction are cosmetic and
      // self-correct the next time either side sends a message — not worth the extra
      // correlated-subquery complexity here.
      await queryInterface.sequelize.query(
        `UPDATE whatsapp_conversations c
         JOIN (
           SELECT
             MAX(created_at) AS last_message_at,
             MAX(CASE WHEN direction = 'inbound' THEN wa_timestamp END) AS last_inbound_message_at
           FROM whatsapp_messages
           WHERE conversation_id = :keeperId
         ) m
         SET
           c.last_message_at = COALESCE(m.last_message_at, c.last_message_at),
           c.last_inbound_message_at = COALESCE(m.last_inbound_message_at, c.last_inbound_message_at)
         WHERE c.id = :keeperId`,
        { replacements: { keeperId: keeper.id } },
      )

      await queryInterface.sequelize.query(`DELETE FROM whatsapp_conversations WHERE id IN (:loserIds)`, {
        replacements: { loserIds },
      })
    }
  },

  async down() {
    // Not reversible — merged conversation history, not a schema change.
  },
}
