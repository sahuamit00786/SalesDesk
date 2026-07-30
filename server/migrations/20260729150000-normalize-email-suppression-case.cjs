'use strict'

/**
 * §3.6 of the bug audit: suppression checks compared email case-sensitively, so
 * "John.Smith@Corp.com" unsubscribing didn't stop sends to "john.smith@corp.com".
 * The app-layer fix normalizes to lowercase on read/write going forward; this backfills
 * existing rows. De-duplicates first in case the same address exists under two casings
 * (possible if the DB's collation happens to be case-sensitive), keeping the earliest row.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE s1 FROM email_suppressions s1
      JOIN email_suppressions s2
        ON s1.company_id = s2.company_id
        AND LOWER(s1.email) = LOWER(s2.email)
        AND (s1.created_at > s2.created_at OR (s1.created_at = s2.created_at AND s1.id > s2.id))
    `)
    await queryInterface.sequelize.query(`
      UPDATE email_suppressions SET email = LOWER(TRIM(email))
    `)
  },

  async down() {
    // Case normalization isn't reversible (original casing wasn't preserved).
  },
}
