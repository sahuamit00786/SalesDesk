'use strict'

/**
 * §3.8 of the bug audit: the (lead_id, template_id, template_version) unique index meant
 * re-sending the same template to the same lead updated the existing row in place,
 * silently destroying sentAt/openCount/clickCount/openedAt from the first send. Sending
 * the same template twice is a legitimate action (re-engagement, correcting a bad first
 * send) — each attempt now gets its own row. Kept as a plain non-unique index since
 * lookups still filter by this triple.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeIndex('lead_email_logs', 'lead_email_logs_lead_template_version_uq').catch(() => {})
    await queryInterface.addIndex('lead_email_logs', ['lead_id', 'template_id', 'template_version'], {
      name: 'lead_email_logs_lead_template_version_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('lead_email_logs', 'lead_email_logs_lead_template_version_idx').catch(() => {})
    // Not safely reversible if duplicate (lead,template,version) rows now exist —
    // re-adding uniqueness would need a dedup pass first. Left as the plain index.
  },
}
