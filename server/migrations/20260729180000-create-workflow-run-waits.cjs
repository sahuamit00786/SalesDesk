'use strict'

/**
 * §4.2/§4.5 of the bug audit: a WorkflowRun previously stored exactly one
 * waitUntil/resumeNodeId pair, so when a run fanned out into parallel branches and more
 * than one branch hit a delayWait, only ONE wait was representable — a sibling branch
 * with no delay got stuck queued behind an unrelated branch's multi-day wait, a second
 * delayWait's own duration was ignored and it resumed at the first branch's wake time
 * instead, and waking one branch marked EVERY 'waiting' step for the run as completed
 * even though only one branch's delay had actually elapsed. This table lets each branch
 * that hits a delayWait park its own independent wait.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('workflow_run_waits', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      run_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'workflow_runs', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      node_id: { type: Sequelize.STRING(64), allowNull: false },
      resume_node_ids: { type: Sequelize.JSON, allowNull: false },
      wait_until: { type: Sequelize.DATE, allowNull: false },
      status: { type: Sequelize.ENUM('pending', 'resumed'), allowNull: false, defaultValue: 'pending' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
    await queryInterface.addIndex('workflow_run_waits', ['status', 'wait_until'], {
      name: 'workflow_run_waits_status_wait_until_idx',
    })
    await queryInterface.addIndex('workflow_run_waits', ['run_id'], {
      name: 'workflow_run_waits_run_id_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('workflow_run_waits')
  },
}
