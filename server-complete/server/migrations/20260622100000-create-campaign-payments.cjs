'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('campaign_payments', {
      id: {
        type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin',
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
      },
      campaign_id: {
        type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin',
        allowNull: false,
        references: { model: 'campaigns', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      campaign_lead_id: {
        type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin',
        allowNull: false,
        references: { model: 'campaign_leads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      lead_id: {
        type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin',
        allowNull: false,
        references: { model: 'leads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      workspace_id: {
        type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin',
        allowNull: false,
      },
      company_id: {
        type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin',
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      payment_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      mode: {
        type: Sequelize.ENUM('bank_transfer', 'cash', 'cheque', 'upi', 'card', 'crypto', 'other'),
        allowNull: false,
        defaultValue: 'bank_transfer',
      },
      reference: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'received', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'received',
      },
      created_by_user_id: {
        type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin',
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    await queryInterface.addIndex('campaign_payments', ['campaign_id'], { name: 'idx_camp_payments_campaign' })
    await queryInterface.addIndex('campaign_payments', ['campaign_lead_id'], { name: 'idx_camp_payments_camp_lead' })
    await queryInterface.addIndex('campaign_payments', ['lead_id'], { name: 'idx_camp_payments_lead' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('campaign_payments')
  },
}
