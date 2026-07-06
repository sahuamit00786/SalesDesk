'use strict'

/**
 * AI Copilot became a full sidebar page (`/copilot`) instead of a drawer —
 * the client's nav-visibility check matches sidebar items against
 * menu_master.route, so the row inserted with route=null by
 * 20260706120001-add-copilot-menu.cjs must be updated.
 */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return
    await queryInterface.sequelize.query(
      "UPDATE menu_master SET route = '/copilot' WHERE `key` = 'main.copilot'",
    )
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return
    await queryInterface.sequelize.query(
      "UPDATE menu_master SET route = NULL WHERE `key` = 'main.copilot'",
    )
  },
}
