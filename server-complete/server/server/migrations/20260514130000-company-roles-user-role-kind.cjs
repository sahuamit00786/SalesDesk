'use strict'

/** @param {import('sequelize').QueryInterface} queryInterface */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('company_roles').catch(() => null)
    if (!desc) return
    if (desc.user_role_kind) return

    await queryInterface.addColumn('company_roles', 'user_role_kind', {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: 'custom',
    })
    await queryInterface.sequelize.query(`
      UPDATE company_roles
      SET user_role_kind = 'sales'
      WHERE is_default = 1 OR LOWER(TRIM(name)) = 'member'
    `)
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('company_roles').catch(() => null)
    if (desc?.user_role_kind) {
      await queryInterface.removeColumn('company_roles', 'user_role_kind')
    }
  },
}
