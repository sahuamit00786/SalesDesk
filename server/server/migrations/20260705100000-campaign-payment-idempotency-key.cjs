'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('campaign_payments')
    if (!table.idempotency_key) {
      await queryInterface.addColumn('campaign_payments', 'idempotency_key', {
        type: Sequelize.STRING(120),
        allowNull: true,
      })
    }
    try {
      await queryInterface.addIndex('campaign_payments', ['campaign_id', 'idempotency_key'], {
        name: 'uq_camp_payments_campaign_idempotency',
        unique: true,
      })
    } catch (e) {
      const msg = String(e?.parent?.sqlMessage || e?.message || '')
      if (!/duplicate key name|already exists/i.test(msg)) throw e
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('campaign_payments', 'uq_camp_payments_campaign_idempotency').catch(() => {})
    await queryInterface.removeColumn('campaign_payments', 'idempotency_key').catch(() => {})
  },
}
