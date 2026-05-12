'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('workspace_billing_profiles').catch(() => null)
    if (!table) return

    if (!table.bank_account_holder_name) {
      await queryInterface.addColumn('workspace_billing_profiles', 'bank_account_holder_name', {
        type: Sequelize.STRING(240),
        allowNull: true,
      })
    }
    if (!table.bank_branch) {
      await queryInterface.addColumn('workspace_billing_profiles', 'bank_branch', {
        type: Sequelize.STRING(255),
        allowNull: true,
      })
    }
    if (!table.micr_code) {
      await queryInterface.addColumn('workspace_billing_profiles', 'micr_code', {
        type: Sequelize.STRING(16),
        allowNull: true,
      })
    }
    if (!table.bank_account_type) {
      await queryInterface.addColumn('workspace_billing_profiles', 'bank_account_type', {
        type: Sequelize.STRING(32),
        allowNull: true,
      })
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('workspace_billing_profiles').catch(() => null)
    if (!table) return
    if (table.bank_account_type) await queryInterface.removeColumn('workspace_billing_profiles', 'bank_account_type')
    if (table.micr_code) await queryInterface.removeColumn('workspace_billing_profiles', 'micr_code')
    if (table.bank_branch) await queryInterface.removeColumn('workspace_billing_profiles', 'bank_branch')
    if (table.bank_account_holder_name) await queryInterface.removeColumn('workspace_billing_profiles', 'bank_account_holder_name')
  },
}
