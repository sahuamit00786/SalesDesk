export default {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()

    if (!tables.includes('deal_payments')) {
      await queryInterface.createTable('deal_payments', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        deal_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'deals', key: 'id' },
          onDelete: 'CASCADE',
        },
        workspace_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onDelete: 'CASCADE',
        },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onDelete: 'CASCADE',
        },
        amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' },
        payment_date: { type: Sequelize.DATEONLY, allowNull: false },
        mode: {
          type: Sequelize.ENUM('bank_transfer', 'cash', 'cheque', 'upi', 'card', 'crypto', 'other'),
          allowNull: false,
          defaultValue: 'bank_transfer',
        },
        reference: { type: Sequelize.STRING(120), allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        status: {
          type: Sequelize.ENUM('pending', 'received', 'failed', 'refunded'),
          allowNull: false,
          defaultValue: 'received',
        },
        created_by_user_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      })

      await queryInterface.addIndex('deal_payments', ['deal_id'], { name: 'deal_payments_deal_id' })
      await queryInterface.addIndex('deal_payments', ['workspace_id'], { name: 'deal_payments_workspace_id' })
      await queryInterface.addIndex('deal_payments', ['company_id'], { name: 'deal_payments_company_id' })
      await queryInterface.addIndex('deal_payments', ['status'], { name: 'deal_payments_status' })
      await queryInterface.addIndex('deal_payments', ['created_by_user_id'], { name: 'deal_payments_created_by' })
      await queryInterface.addIndex('deal_payments', ['payment_date'], { name: 'deal_payments_payment_date' })
    }

    // Add 'payment' to deal_activities.type ENUM if not present
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE deal_activities
        MODIFY COLUMN type ENUM(
          'note','call','email','meeting','task',
          'status_change','assignment','system','payment'
        ) NOT NULL
      `)
    } catch {
      // Already has 'payment' value — safe to ignore
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('deal_payments')
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE deal_activities
        MODIFY COLUMN type ENUM(
          'note','call','email','meeting','task',
          'status_change','assignment','system'
        ) NOT NULL
      `)
    } catch { /* ignore */ }
  },
}
