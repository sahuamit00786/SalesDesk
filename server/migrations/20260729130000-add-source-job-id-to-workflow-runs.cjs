'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('workflow_runs', 'source_job_id', {
      type: Sequelize.STRING(64),
      allowNull: true,
    })
    await queryInterface.addIndex('workflow_runs', ['workflow_id', 'source_job_id'], {
      name: 'workflow_runs_workflow_source_job_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('workflow_runs', 'workflow_runs_workflow_source_job_idx').catch(() => {})
    await queryInterface.removeColumn('workflow_runs', 'source_job_id')
  },
}
