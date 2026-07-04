'use strict'

/**
 * The wakeup poller selects runs by (status, wait_until) every 30s; without an
 * index this is a full scan of workflow_runs.
 */
const INDEX_NAME = 'workflow_runs_status_wait_until'

module.exports = {
  async up(queryInterface) {
    const indexes = await queryInterface.showIndex('workflow_runs')
    if (indexes.some((i) => i.name === INDEX_NAME)) return
    await queryInterface.addIndex('workflow_runs', ['status', 'wait_until'], { name: INDEX_NAME })
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('workflow_runs')
    if (!indexes.some((i) => i.name === INDEX_NAME)) return
    await queryInterface.removeIndex('workflow_runs', INDEX_NAME)
  },
}
