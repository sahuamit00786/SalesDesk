'use strict'

const { randomUUID } = require('node:crypto')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date()
    const [companies] = await queryInterface.sequelize.query(
      `SELECT DISTINCT company_id AS companyId FROM users WHERE company_id IS NOT NULL`,
    )
    const [leafMenus] = await queryInterface.sequelize.query(
      `SELECT id FROM menu_master WHERE route IS NOT NULL AND is_active = 1`,
    )

    for (const c of companies) {
      const companyId = c.companyId
      let [defaultRoles] = await queryInterface.sequelize.query(
        `SELECT id FROM company_roles WHERE company_id = :companyId AND is_default = 1 ORDER BY created_at ASC LIMIT 1`,
        { replacements: { companyId } },
      )
      let defaultRoleId = defaultRoles[0]?.id
      if (!defaultRoleId) {
        defaultRoleId = randomUUID()
        await queryInterface.bulkInsert('company_roles', [
          {
            id: defaultRoleId,
            company_id: companyId,
            name: 'Member',
            description: 'Default member role',
            is_default: true,
            created_by: null,
            created_at: now,
            updated_at: now,
          },
        ])
      }

      const [roleMenus] = await queryInterface.sequelize.query(
        `SELECT id FROM company_role_menus WHERE company_role_id = :roleId LIMIT 1`,
        { replacements: { roleId: defaultRoleId } },
      )
      if (!roleMenus.length && leafMenus.length) {
        await queryInterface.bulkInsert(
          'company_role_menus',
          leafMenus.map((m) => ({
            id: randomUUID(),
            company_role_id: defaultRoleId,
            menu_id: m.id,
            created_at: now,
            updated_at: now,
          })),
        )
      }

      await queryInterface.sequelize.query(
        `UPDATE users
         SET company_role_id = :roleId
         WHERE company_id = :companyId
           AND is_company_admin = 0
           AND company_role_id IS NULL`,
        { replacements: { companyId, roleId: defaultRoleId } },
      )

      await queryInterface.sequelize.query(
        `UPDATE invitations
         SET company_role_id = :roleId
         WHERE company_id = :companyId
           AND accepted_at IS NULL
           AND company_role_id IS NULL`,
        { replacements: { companyId, roleId: defaultRoleId } },
      )
    }
  },

  async down() {},
}
