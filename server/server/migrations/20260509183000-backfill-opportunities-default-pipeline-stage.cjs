'use strict'

/**
 * Set opportunity_stage on all is_opportunity leads to the workspace default
 * opportunity stage (is_default, then sort_order, then created_at), matching
 * server resolveInitialOpportunityStage ordering. Falls back to name "open",
 * then first stage row, then "Lead Inbound".
 */

module.exports = {
  async up(queryInterface) {
    const [groups] = await queryInterface.sequelize.query(`
      SELECT DISTINCT l.workspace_id AS workspaceId, l.company_id AS companyId
      FROM leads l
      WHERE l.is_opportunity = 1
        AND l.deleted_at IS NULL
        AND l.workspace_id IS NOT NULL
        AND l.company_id IS NOT NULL
    `)

    for (const group of groups) {
      const { workspaceId, companyId } = group

      const [stages] = await queryInterface.sequelize.query(
        `
        SELECT name
        FROM opportunity_stages
        WHERE workspace_id = :workspaceId AND company_id = :companyId
        ORDER BY is_default DESC, sort_order ASC, created_at ASC
        LIMIT 1
      `,
        { replacements: { workspaceId, companyId } },
      )

      const stageName = stages[0]?.name || 'Lead Inbound'

      await queryInterface.sequelize.query(
        `
        UPDATE leads
        SET opportunity_stage = :stageName
        WHERE is_opportunity = 1
          AND deleted_at IS NULL
          AND workspace_id = :workspaceId
          AND company_id = :companyId
      `,
        { replacements: { stageName, workspaceId, companyId } },
      )
    }

    // Opportunities missing workspace_id: use company-wide first stage if unambiguous
    const [orphans] = await queryInterface.sequelize.query(`
      SELECT DISTINCT l.company_id AS companyId
      FROM leads l
      WHERE l.is_opportunity = 1
        AND l.deleted_at IS NULL
        AND l.workspace_id IS NULL
        AND l.company_id IS NOT NULL
    `)

    for (const row of orphans) {
      const { companyId } = row
      const [stages] = await queryInterface.sequelize.query(
        `
        SELECT name, workspace_id AS workspaceId
        FROM opportunity_stages
        WHERE company_id = :companyId
        ORDER BY is_default DESC, sort_order ASC, created_at ASC
      `,
        { replacements: { companyId } },
      )
      if (!stages.length) continue
      const byWs = new Map()
      for (const s of stages) {
        const k = String(s.workspaceId || '')
        if (!byWs.has(k)) byWs.set(k, s.name)
      }
      if (byWs.size !== 1) continue
      const stageName = [...byWs.values()][0]
      await queryInterface.sequelize.query(
        `
        UPDATE leads
        SET opportunity_stage = :stageName
        WHERE is_opportunity = 1
          AND deleted_at IS NULL
          AND workspace_id IS NULL
          AND company_id = :companyId
      `,
        { replacements: { stageName, companyId } },
      )
    }
  },

  async down() {
    // Data migration; previous stage values are not stored.
  },
}
