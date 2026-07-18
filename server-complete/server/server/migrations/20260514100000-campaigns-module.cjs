'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables()
  const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t))
  return names.includes(tableName)
}

async function safeAddIndex(queryInterface, table, columns, options) {
  try {
    await queryInterface.addIndex(table, columns, options)
  } catch (e) {
    const msg = String(e?.parent?.sqlMessage || e?.message || '')
    if (!/duplicate key name|already exists/i.test(msg)) throw e
  }
}

async function safeAddConstraint(queryInterface, table, options) {
  try {
    await queryInterface.addConstraint(table, options)
  } catch (e) {
    const msg = String(e?.parent?.sqlMessage || e?.message || '')
    if (!/duplicate key name|already exists|duplicate entry/i.test(msg)) throw e
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'campaigns'))) {
      await queryInterface.createTable('campaigns', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
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
      description: { type: Sequelize.TEXT, allowNull: true },
      /** JSON array: [{ key, label, sortOrder }, ...] */
      stages: { type: Sequelize.JSON, allowNull: false },
      status: {
        type: Sequelize.ENUM('active', 'archived'),
        allowNull: false,
        defaultValue: 'active',
      },
      created_by: {
        // Match `users.id` (CHAR(36) in MySQL); Sequelize.UUID breaks FK compatibility.
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    })
    }
    await safeAddIndex(queryInterface, 'campaigns', ['workspace_id', 'company_id'], { name: 'campaigns_workspace_company_idx' })

    if (!(await tableExists(queryInterface, 'campaign_team_members'))) {
      await queryInterface.createTable('campaign_team_members', {
      campaign_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'campaigns', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        primaryKey: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    })
    }

    if (!(await tableExists(queryInterface, 'campaign_leads'))) {
      await queryInterface.createTable('campaign_leads', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      campaign_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'campaigns', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      lead_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'leads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      stage_key: { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'new' },
      assigned_user_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    })
    }
    await safeAddConstraint(queryInterface, 'campaign_leads', {
      fields: ['campaign_id', 'lead_id'],
      type: 'unique',
      name: 'campaign_leads_campaign_lead_unique',
    })
    await safeAddIndex(queryInterface, 'campaign_leads', ['campaign_id', 'stage_key'], { name: 'campaign_leads_campaign_stage_idx' })
    await safeAddIndex(queryInterface, 'campaign_leads', ['assigned_user_id'], { name: 'campaign_leads_assigned_user_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('campaign_leads').catch(() => {})
    await queryInterface.dropTable('campaign_team_members').catch(() => {})
    await queryInterface.dropTable('campaigns').catch(() => {})
  },
}
