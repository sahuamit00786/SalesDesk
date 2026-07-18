'use strict'

async function columnExists(queryInterface, table, column) {
  const desc = await queryInterface.describeTable(table).catch(() => null)
  return Boolean(desc?.[column])
}

async function tableExists(queryInterface, table) {
  const tables = await queryInterface.showAllTables()
  return tables.includes(table)
}

function userIdColumnType(Sequelize, leadTasksDesc) {
  const col = leadTasksDesc?.created_by || leadTasksDesc?.createdBy
  const t = String(col?.type || '').toLowerCase()
  if (t.includes('int')) return Sequelize.INTEGER.UNSIGNED
  if (t.includes('char') && (col?.length === 36 || String(col?.type).includes('36'))) return Sequelize.CHAR(36)
  return Sequelize.CHAR(36)
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const leadTasksDesc = await queryInterface.describeTable('lead_tasks').catch(() => ({}))
    const userIdType = userIdColumnType(Sequelize, leadTasksDesc)

    if (await columnExists(queryInterface, 'lead_tasks', 'task_type')) {
      // already applied
    } else {
      await queryInterface.addColumn('lead_tasks', 'task_type', {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'follow_up',
      })
    }

    if (!(await tableExists(queryInterface, 'lead_task_subtasks'))) {
      await queryInterface.createTable('lead_task_subtasks', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        lead_task_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'lead_tasks', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        title: { type: Sequelize.STRING(500), allowNull: false },
        done: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        position: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('lead_task_subtasks', ['lead_task_id'], { name: 'lead_task_subtasks_task_idx' })
    }

    if (!(await tableExists(queryInterface, 'lead_task_comments'))) {
      await queryInterface.createTable('lead_task_comments', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        lead_task_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'lead_tasks', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        user_id: {
          type: userIdType,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        body: { type: Sequelize.TEXT, allowNull: false },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('lead_task_comments', ['lead_task_id'], { name: 'lead_task_comments_task_idx' })
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lead_task_comments').catch(() => {})
    await queryInterface.dropTable('lead_task_subtasks').catch(() => {})
    if (await columnExists(queryInterface, 'lead_tasks', 'task_type')) {
      await queryInterface.removeColumn('lead_tasks', 'task_type')
    }
  },
}
