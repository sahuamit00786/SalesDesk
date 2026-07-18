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
    if (await tableExists(queryInterface, 'campaign_lead_stage_history')) return
    await queryInterface.createTable('campaign_lead_stage_history', {
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
      campaign_lead_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'campaign_leads', key: 'id' },
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
      from_stage_key: { type: Sequelize.STRING(64), allowNull: true },
      to_stage_key: { type: Sequelize.STRING(64), allowNull: false },
      changed_by_user_id: {
        // users.id is CHAR(36) utf8mb4_0900_ai_ci (not the utf8mb4_bin Sequelize.UUID produces) —
        // match it exactly or MySQL rejects the FK as a collation mismatch (errno 3780).
        type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    })
    await queryInterface.addIndex('campaign_lead_stage_history', ['campaign_lead_id'], {
      name: 'idx_cl_stage_history_campaign_lead',
    })
    await queryInterface.addIndex('campaign_lead_stage_history', ['campaign_id', 'created_at'], {
      name: 'idx_cl_stage_history_campaign_created',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('campaign_lead_stage_history').catch(() => {})
  },
}
