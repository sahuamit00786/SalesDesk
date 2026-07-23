'use strict'

async function columnExists(queryInterface, table, column) {
  const desc = await queryInterface.describeTable(table).catch(() => null)
  return Boolean(desc?.[column])
}

async function indexExists(queryInterface, table, name) {
  try {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND INDEX_NAME = :name LIMIT 1",
      { replacements: { table, name } },
    )
    return Array.isArray(rows) && rows.length > 0
  } catch {
    return false
  }
}

/** Recurring-task feature removed — drop lead_tasks.recurrence_rule / recurrence_parent_id. */
module.exports = {
  async up(queryInterface) {
    if (await indexExists(queryInterface, 'lead_tasks', 'lead_tasks_recurrence_parent_idx')) {
      await queryInterface.removeIndex('lead_tasks', 'lead_tasks_recurrence_parent_idx').catch(() => {})
    }
    for (const col of ['recurrence_parent_id', 'recurrence_rule']) {
      if (await columnExists(queryInterface, 'lead_tasks', col)) {
        await queryInterface.removeColumn('lead_tasks', col).catch(() => {})
      }
    }
  },

  async down(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'lead_tasks', 'recurrence_rule'))) {
      await queryInterface.addColumn('lead_tasks', 'recurrence_rule', { type: Sequelize.JSON, allowNull: true })
    }
    if (!(await columnExists(queryInterface, 'lead_tasks', 'recurrence_parent_id'))) {
      await queryInterface.addColumn('lead_tasks', 'recurrence_parent_id', { type: Sequelize.CHAR(36), allowNull: true })
    }
    if (!(await indexExists(queryInterface, 'lead_tasks', 'lead_tasks_recurrence_parent_idx'))) {
      await queryInterface
        .addIndex('lead_tasks', ['recurrence_parent_id'], { name: 'lead_tasks_recurrence_parent_idx' })
        .catch(() => {})
    }
  },
}
