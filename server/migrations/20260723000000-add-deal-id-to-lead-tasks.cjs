'use strict'

const { addIndexIfMissing } = require('../migration-helpers.cjs')

/**
 * Deal detail panels were showing the parent lead's tasks (Tasks tab queried
 * `/leads/:id/tasks` using the deal's `parentOpportunityLeadId`), so any task
 * created from the Lead page leaked into every Deal built on that lead. This
 * nullable `deal_id` tags tasks created from a Deal's own Tasks tab so they can
 * be queried separately — `lead_id` stays required (deals always have a parent
 * lead) but is no longer the only scoping key.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('lead_tasks')
    if (!table.deal_id) {
      await queryInterface.addColumn('lead_tasks', 'deal_id', {
        // Must match deals.id collation (utf8mb4_bin) or the FK add fails on MySQL.
        type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin',
        allowNull: true,
        references: { model: 'deals', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })
    }

    await addIndexIfMissing(queryInterface, 'lead_tasks', ['deal_id', 'status'], {
      name: 'lead_tasks_deal_status_idx',
    })
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex('lead_tasks', 'lead_tasks_deal_status_idx')
    } catch {}
    try {
      await queryInterface.removeColumn('lead_tasks', 'deal_id')
    } catch {}
  },
}
