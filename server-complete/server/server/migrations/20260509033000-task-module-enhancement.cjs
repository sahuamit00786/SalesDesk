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

/**
 * Task module enhancement:
 *  - lead_tasks.priority: ENUM('low','medium','high') -> ENUM('low','medium','high','urgent').
 *  - lead_tasks.status:   ENUM('open','completed','cancelled') -> ENUM('pending','in_progress','completed','cancelled').
 *      'open' rows are backfilled to 'pending'. We widen the ENUM to a temporary superset first so the
 *      UPDATE doesn't violate the destination enum, then narrow to the final set.
 *  - lead_tasks.start_at, recurrence_rule (JSON), recurrence_parent_id (CHAR(36)), attachments (JSON).
 *  - lead_task_comments.is_internal BOOLEAN.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sql = queryInterface.sequelize

    // ---- lead_tasks.priority: widen to include 'urgent' ----
    await sql.query(
      "ALTER TABLE lead_tasks MODIFY COLUMN priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium'",
    )

    // ---- lead_tasks.status: widen, backfill, narrow ----
    // Step 1: widen to a superset that contains both old and new values.
    await sql.query(
      "ALTER TABLE lead_tasks MODIFY COLUMN status ENUM('open','pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending'",
    )
    // Step 2: backfill legacy 'open' -> 'pending'.
    await sql.query("UPDATE lead_tasks SET status = 'pending' WHERE status = 'open'")
    // Step 3: narrow to the final set.
    await sql.query(
      "ALTER TABLE lead_tasks MODIFY COLUMN status ENUM('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending'",
    )

    // ---- lead_tasks new columns ----
    if (!(await columnExists(queryInterface, 'lead_tasks', 'start_at'))) {
      await queryInterface.addColumn('lead_tasks', 'start_at', { type: Sequelize.DATE, allowNull: true })
    }
    if (!(await columnExists(queryInterface, 'lead_tasks', 'recurrence_rule'))) {
      await queryInterface.addColumn('lead_tasks', 'recurrence_rule', { type: Sequelize.JSON, allowNull: true })
    }
    if (!(await columnExists(queryInterface, 'lead_tasks', 'recurrence_parent_id'))) {
      await queryInterface.addColumn('lead_tasks', 'recurrence_parent_id', {
        type: Sequelize.CHAR(36),
        allowNull: true,
      })
    }
    if (!(await columnExists(queryInterface, 'lead_tasks', 'attachments'))) {
      await queryInterface.addColumn('lead_tasks', 'attachments', { type: Sequelize.JSON, allowNull: true })
    }

    if (!(await indexExists(queryInterface, 'lead_tasks', 'lead_tasks_recurrence_parent_idx'))) {
      await queryInterface
        .addIndex('lead_tasks', ['recurrence_parent_id'], { name: 'lead_tasks_recurrence_parent_idx' })
        .catch(() => {})
    }

    // ---- lead_task_comments.is_internal ----
    if (!(await columnExists(queryInterface, 'lead_task_comments', 'is_internal'))) {
      await queryInterface.addColumn('lead_task_comments', 'is_internal', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      })
    }
    if (!(await indexExists(queryInterface, 'lead_task_comments', 'lead_task_comments_is_internal_idx'))) {
      await queryInterface
        .addIndex('lead_task_comments', ['is_internal'], { name: 'lead_task_comments_is_internal_idx' })
        .catch(() => {})
    }
  },

  async down(queryInterface, Sequelize) {
    const sql = queryInterface.sequelize

    if (await columnExists(queryInterface, 'lead_task_comments', 'is_internal')) {
      await queryInterface.removeIndex('lead_task_comments', 'lead_task_comments_is_internal_idx').catch(() => {})
      await queryInterface.removeColumn('lead_task_comments', 'is_internal').catch(() => {})
    }

    if (await columnExists(queryInterface, 'lead_tasks', 'recurrence_parent_id')) {
      await queryInterface.removeIndex('lead_tasks', 'lead_tasks_recurrence_parent_idx').catch(() => {})
    }

    for (const col of ['attachments', 'recurrence_parent_id', 'recurrence_rule', 'start_at']) {
      if (await columnExists(queryInterface, 'lead_tasks', col)) {
        await queryInterface.removeColumn('lead_tasks', col).catch(() => {})
      }
    }

    // Reverse status: widen back to superset, map non-legacy statuses to 'open' for in_progress, then narrow.
    await sql.query(
      "ALTER TABLE lead_tasks MODIFY COLUMN status ENUM('open','pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'open'",
    )
    await sql.query("UPDATE lead_tasks SET status = 'open' WHERE status IN ('pending','in_progress')")
    await sql.query(
      "ALTER TABLE lead_tasks MODIFY COLUMN status ENUM('open','completed','cancelled') NOT NULL DEFAULT 'open'",
    )

    // Reverse priority: drop 'urgent' (downgrade urgent rows to 'high').
    await sql.query("UPDATE lead_tasks SET priority = 'high' WHERE priority = 'urgent'")
    await sql.query(
      "ALTER TABLE lead_tasks MODIFY COLUMN priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium'",
    )
  },
}
