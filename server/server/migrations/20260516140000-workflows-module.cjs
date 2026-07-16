'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables()
  const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t))
  return names.includes(tableName)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'workflows'))) {
      await queryInterface.createTable('workflows', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        workspace_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: { type: Sequelize.STRING(255), allowNull: false },
        status: {
          type: Sequelize.ENUM('draft', 'active', 'paused'),
          allowNull: false,
          defaultValue: 'draft',
        },
        definition_json: { type: Sequelize.JSON, allowNull: false },
        published_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
        created_by: { type: Sequelize.CHAR(36), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      })
      await queryInterface.addIndex('workflows', ['workspace_id', 'company_id', 'status'], { name: 'workflows_ws_company_status_idx' })
    }

    if (!(await tableExists(queryInterface, 'workflow_versions'))) {
      await queryInterface.createTable('workflow_versions', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        workflow_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workflows', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        definition_json: { type: Sequelize.JSON, allowNull: false },
        created_by: { type: Sequelize.CHAR(36), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      })
      await queryInterface.addConstraint('workflow_versions', {
        fields: ['workflow_id', 'version'],
        type: 'unique',
        name: 'workflow_versions_workflow_version_unique',
      })
    }

    if (!(await tableExists(queryInterface, 'workflow_runs'))) {
      await queryInterface.createTable('workflow_runs', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        workflow_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workflows', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
        trigger_type: { type: Sequelize.STRING(64), allowNull: false },
        trigger_payload_json: { type: Sequelize.JSON, allowNull: true },
        status: {
          type: Sequelize.ENUM('pending', 'running', 'waiting', 'completed', 'failed'),
          allowNull: false,
          defaultValue: 'pending',
        },
        wait_until: { type: Sequelize.DATE, allowNull: true },
        resume_node_id: { type: Sequelize.STRING(64), allowNull: true },
        context_json: { type: Sequelize.JSON, allowNull: true },
        error_message: { type: Sequelize.TEXT, allowNull: true },
        started_at: { type: Sequelize.DATE, allowNull: true },
        finished_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      })
      await queryInterface.addIndex('workflow_runs', ['workflow_id', 'status'], { name: 'workflow_runs_workflow_status_idx' })
      await queryInterface.addIndex('workflow_runs', ['status', 'wait_until'], { name: 'workflow_runs_status_wait_idx' })
    }

    if (!(await tableExists(queryInterface, 'workflow_run_steps'))) {
      await queryInterface.createTable('workflow_run_steps', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        run_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workflow_runs', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        node_id: { type: Sequelize.STRING(64), allowNull: false },
        status: {
          type: Sequelize.ENUM('pending', 'running', 'completed', 'failed', 'skipped', 'waiting'),
          allowNull: false,
          defaultValue: 'pending',
        },
        input_json: { type: Sequelize.JSON, allowNull: true },
        output_json: { type: Sequelize.JSON, allowNull: true },
        error_message: { type: Sequelize.TEXT, allowNull: true },
        started_at: { type: Sequelize.DATE, allowNull: true },
        finished_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      })
      await queryInterface.addIndex('workflow_run_steps', ['run_id'], { name: 'workflow_run_steps_run_idx' })
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('workflow_run_steps').catch(() => {})
    await queryInterface.dropTable('workflow_runs').catch(() => {})
    await queryInterface.dropTable('workflow_versions').catch(() => {})
    await queryInterface.dropTable('workflows').catch(() => {})
  },
}
