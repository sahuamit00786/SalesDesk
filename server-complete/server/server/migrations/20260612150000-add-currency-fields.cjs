'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const companyDesc = await queryInterface.describeTable('companies').catch(() => null)
    if (companyDesc && !companyDesc.base_currency) {
      await queryInterface.addColumn('companies', 'base_currency', {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      })
    }

    const wsDesc = await queryInterface.describeTable('workspaces').catch(() => null)
    if (wsDesc && !wsDesc.default_currency) {
      await queryInterface.addColumn('workspaces', 'default_currency', {
        type: Sequelize.STRING(3),
        allowNull: true,
      })
    }

    const campDesc = await queryInterface.describeTable('campaigns').catch(() => null)
    if (campDesc && !campDesc.currency) {
      await queryInterface.addColumn('campaigns', 'currency', {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      })
    }

    const clDesc = await queryInterface.describeTable('campaign_leads').catch(() => null)
    if (clDesc && !clDesc.amount_received) {
      await queryInterface.addColumn('campaign_leads', 'amount_received', {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
      })
    }
  },

  async down(queryInterface) {
    const companyDesc = await queryInterface.describeTable('companies').catch(() => null)
    if (companyDesc?.base_currency) await queryInterface.removeColumn('companies', 'base_currency')

    const wsDesc = await queryInterface.describeTable('workspaces').catch(() => null)
    if (wsDesc?.default_currency) await queryInterface.removeColumn('workspaces', 'default_currency')

    const campDesc = await queryInterface.describeTable('campaigns').catch(() => null)
    if (campDesc?.currency) await queryInterface.removeColumn('campaigns', 'currency')

    const clDesc = await queryInterface.describeTable('campaign_leads').catch(() => null)
    if (clDesc?.amount_received) await queryInterface.removeColumn('campaign_leads', 'amount_received')
  },
}
