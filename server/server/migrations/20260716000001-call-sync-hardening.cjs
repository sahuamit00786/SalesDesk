'use strict'

/**
 * Call-sync hardening (fully additive — no existing column or row changes):
 *
 * 1) call_logs.device_call_key  — stable identity of a device call-log row:
 *    "{installId}:{nativeId}:{callDateMs}" hashed client-side. Unique where
 *    non-null, so re-syncing after reinstall / second device / cleared storage
 *    UPSERTS instead of duplicating history. Existing rows keep NULL and are
 *    untouched.
 *
 * 2) leads.phone_digits + leads.alt_phone_digits — last-10-digit normalized
 *    phone keys, indexed, backfilled. Kills the two full-table scans
 *    (server findLeadByPhone; mobile buildLeadPhoneIndex downloading up to
 *    1,000 leads) by making phone→lead an indexed lookup.
 */

const digits10 = `
  UPDATE leads SET
    phone_digits = RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', ''), 10),
    alt_phone_digits = RIGHT(REGEXP_REPLACE(COALESCE(alt_phone, ''), '[^0-9]', ''), 10)
`

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction()
    try {
      await queryInterface.addColumn(
        'call_logs',
        'device_call_key',
        { type: Sequelize.STRING(120), allowNull: true },
        { transaction: t },
      )
      await queryInterface.addIndex('call_logs', ['device_call_key'], {
        name: 'idx_call_logs_device_call_key',
        unique: true,
        transaction: t,
      })

      await queryInterface.addColumn(
        'leads',
        'phone_digits',
        { type: Sequelize.STRING(10), allowNull: true },
        { transaction: t },
      )
      await queryInterface.addColumn(
        'leads',
        'alt_phone_digits',
        { type: Sequelize.STRING(10), allowNull: true },
        { transaction: t },
      )
      await queryInterface.sequelize.query(digits10, { transaction: t })
      await queryInterface.addIndex('leads', ['company_id', 'phone_digits'], {
        name: 'idx_leads_company_phone_digits',
        transaction: t,
      })
      await queryInterface.addIndex('leads', ['company_id', 'alt_phone_digits'], {
        name: 'idx_leads_company_alt_phone_digits',
        transaction: t,
      })
      await t.commit()
    } catch (err) {
      await t.rollback()
      throw err
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('call_logs', 'idx_call_logs_device_call_key')
    await queryInterface.removeColumn('call_logs', 'device_call_key')
    await queryInterface.removeIndex('leads', 'idx_leads_company_phone_digits')
    await queryInterface.removeIndex('leads', 'idx_leads_company_alt_phone_digits')
    await queryInterface.removeColumn('leads', 'phone_digits')
    await queryInterface.removeColumn('leads', 'alt_phone_digits')
  },
}
