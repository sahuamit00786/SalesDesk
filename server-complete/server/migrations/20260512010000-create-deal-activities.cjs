'use strict'

const { addIndexIfMissing } = require('../migration-helpers.cjs')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t))
    const has = names.includes('deal_activities')

    if (!has) {
      await queryInterface.createTable('deal_activities', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      deal_id: {
        // Must match deals.id collation (utf8mb4_bin set by the identifiers migration).
        type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin',
        allowNull: false,
        references: { model: 'deals', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('note', 'call', 'email', 'meeting', 'task', 'status_change', 'assignment', 'system'),
        allowNull: false,
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })
    }

    await addIndexIfMissing(queryInterface, 'deal_activities', ['deal_id'], {
      name: 'deal_activities_deal_id_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('deal_activities')
  },
}
