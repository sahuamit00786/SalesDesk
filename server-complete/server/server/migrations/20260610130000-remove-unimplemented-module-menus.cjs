'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return

    await queryInterface.sequelize.query(`
      DELETE FROM menu_master
      WHERE \`key\` IN (
          'main.contacts',
          'main.companies',
          'engage.whatsapp'
        )
         OR route IN ('/contacts', '/companies', '/whatsapp')
         OR label IN ('Contacts', 'Companies', 'WhatsApp / SMS')
    `)

    await queryInterface.sequelize.query(`
      UPDATE menu_master
      SET route = '/meetings', label = 'Calls & meetings', updated_at = NOW()
      WHERE \`key\` = 'engage.calls' AND route = '/calls'
    `)
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return

    await queryInterface.sequelize.query(`
      UPDATE menu_master
      SET route = '/calls', updated_at = NOW()
      WHERE \`key\` = 'engage.calls' AND route = '/meetings'
    `)
  },
}
