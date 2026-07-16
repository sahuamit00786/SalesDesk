'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('company_role_menus').catch(() => null)
    if (!desc) return

    const addBool = async (name, def = false) => {
      if (!desc[name]) {
        await queryInterface.addColumn('company_role_menus', name, {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: def,
        })
      }
    }
    await addBool('can_view', true)
    await addBool('can_edit', false)
    await addBool('can_update', false)
    await addBool('can_delete', false)

    await queryInterface.sequelize.query(`
      UPDATE company_role_menus crm
      JOIN menu_master mm ON mm.id = crm.menu_id
      SET
        crm.can_view = CASE WHEN mm.action IN ('view','edit','update','delete') THEN 1 ELSE crm.can_view END,
        crm.can_edit = CASE WHEN mm.action = 'edit' THEN 1 ELSE crm.can_edit END,
        crm.can_update = CASE WHEN mm.action IN ('edit','update') THEN 1 ELSE crm.can_update END,
        crm.can_delete = CASE WHEN mm.action = 'delete' THEN 1 ELSE crm.can_delete END
    `)
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('company_role_menus').catch(() => null)
    if (!desc) return
    if (desc.can_delete) await queryInterface.removeColumn('company_role_menus', 'can_delete')
    if (desc.can_update) await queryInterface.removeColumn('company_role_menus', 'can_update')
    if (desc.can_edit) await queryInterface.removeColumn('company_role_menus', 'can_edit')
    if (desc.can_view) await queryInterface.removeColumn('company_role_menus', 'can_view')
  },
}
