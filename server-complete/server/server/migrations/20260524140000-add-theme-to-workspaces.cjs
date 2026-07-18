'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('workspaces')
    if (!desc.theme_color) {
      await queryInterface.addColumn('workspaces', 'theme_color', {
        type: Sequelize.STRING(7),
        allowNull: true,
        defaultValue: null,
      })
    }
    if (!desc.sidebar_text_color) {
      await queryInterface.addColumn('workspaces', 'sidebar_text_color', {
        type: Sequelize.STRING(7),
        allowNull: true,
        defaultValue: null,
      })
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('workspaces').catch(() => ({}))
    if (desc.sidebar_text_color) await queryInterface.removeColumn('workspaces', 'sidebar_text_color')
    if (desc.theme_color) await queryInterface.removeColumn('workspaces', 'theme_color')
  },
}
