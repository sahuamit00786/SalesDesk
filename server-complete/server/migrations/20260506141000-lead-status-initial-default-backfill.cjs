'use strict'

async function addIndexIfMissing(queryInterface, tableName, fields, name) {
  const indexes = await queryInterface.showIndex(tableName)
  if (!indexes.some((idx) => idx.name === name)) {
    await queryInterface.addIndex(tableName, fields, { name })
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await addIndexIfMissing(
      queryInterface,
      'lead_statuses',
      ['workspace_id', 'company_id', 'is_default'],
      'lead_statuses_workspace_company_default_idx',
    )

    const [groups] = await queryInterface.sequelize.query(`
      SELECT DISTINCT workspace_id AS workspaceId, company_id AS companyId
      FROM lead_statuses
      WHERE workspace_id IS NOT NULL AND company_id IS NOT NULL
    `)

    for (const group of groups) {
      const workspaceId = group.workspaceId
      const companyId = group.companyId

      const [statuses] = await queryInterface.sequelize.query(
        `
        SELECT id, is_default AS isDefault, created_at AS createdAt
        FROM lead_statuses
        WHERE workspace_id = :workspaceId AND company_id = :companyId
        ORDER BY is_default DESC, created_at ASC
      `,
        { replacements: { workspaceId, companyId } },
      )

      if (!statuses.length) continue

      const initialStatusId = statuses[0].id
      await queryInterface.sequelize.query(
        `
        UPDATE lead_statuses
        SET is_default = CASE WHEN id = :initialStatusId THEN 1 ELSE 0 END
        WHERE workspace_id = :workspaceId AND company_id = :companyId
      `,
        { replacements: { workspaceId, companyId, initialStatusId } },
      )

      await queryInterface.sequelize.query(
        `
        UPDATE leads
        SET lead_status_id = :initialStatusId
        WHERE workspace_id = :workspaceId
          AND company_id = :companyId
          AND (lead_status_id IS NULL OR lead_status_id = '')
      `,
        { replacements: { workspaceId, companyId, initialStatusId } },
      )
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('lead_statuses', 'lead_statuses_workspace_company_default_idx').catch(() => {})
  },
}
