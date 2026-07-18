'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('company_roles').catch(() => null)
    if (!desc) return
    if (desc.role_no) return

    await queryInterface.addColumn('company_roles', 'role_no', {
      type: Sequelize.TINYINT,
      allowNull: true,
    })
    await queryInterface.sequelize.query(`
      UPDATE company_roles SET role_no = 1 WHERE user_role_kind = 'workspace_admin'
    `)
    await queryInterface.sequelize.query(`
      UPDATE company_roles SET role_no = 2 WHERE user_role_kind = 'manager'
    `)
    await queryInterface.sequelize.query(`
      UPDATE company_roles SET role_no = 3 WHERE user_role_kind = 'sales'
    `)
    await queryInterface.sequelize.query(`
      UPDATE company_roles SET role_no = NULL WHERE user_role_kind = 'custom' OR user_role_kind IS NULL
    `)
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('company_roles').catch(() => null)
    if (desc?.role_no) {
      await queryInterface.removeColumn('company_roles', 'role_no')
    }
  },
}
