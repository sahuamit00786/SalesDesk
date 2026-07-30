'use strict'

/**
 * Email sequences (§3.5 of the bug audit) had zero LeadEmailLog rows, zero unsubscribe
 * link, zero suppression check, and zero tracking — bringing them in line with template
 * sends needs: (1) template_id nullable, since a sequence step can be ad-hoc content with
 * no EmailTemplate row, and (2) a 'sequence' source value.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Verified against a live MySQL 8 instance: queryInterface.changeColumn() with a
    // `references` clause on a column that already has a named FK constraint reports
    // "migrated" with no error but silently leaves the column NOT NULL — a Sequelize
    // MySQL-dialect quirk, not a MySQL limitation (the equivalent raw ALTER works fine).
    // Caught by actually running this migration end-to-end, not by reading the code.
    await queryInterface.sequelize.query('ALTER TABLE lead_email_logs MODIFY COLUMN template_id CHAR(36) NULL')
    await queryInterface.changeColumn('lead_email_logs', 'source', {
      type: Sequelize.ENUM('direct', 'bulk', 'workflow', 'sequence'),
      allowNull: false,
      defaultValue: 'bulk',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`DELETE FROM lead_email_logs WHERE template_id IS NULL OR source = 'sequence'`)
    await queryInterface.changeColumn('lead_email_logs', 'source', {
      type: Sequelize.ENUM('direct', 'bulk', 'workflow'),
      allowNull: false,
      defaultValue: 'bulk',
    })
    await queryInterface.sequelize.query('ALTER TABLE lead_email_logs MODIFY COLUMN template_id CHAR(36) NOT NULL')
  },
}
