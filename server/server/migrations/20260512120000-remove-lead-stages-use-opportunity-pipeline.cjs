'use strict'

/**
 * Drops workspace "lead stages" (lead_stages + leads.lead_stage_id).
 * Backfills opportunity_stage from each workspace's default opportunity stage
 * when the lead had a lead_stage_id or empty opportunity_stage.
 */

async function tableExists(queryInterface, tableName) {
  try {
    await queryInterface.describeTable(tableName)
    return true
  } catch {
    return false
  }
}

module.exports = {
  async up(queryInterface) {
    const hasLeads = await tableExists(queryInterface, 'leads')
    const hasLeadStages = await tableExists(queryInterface, 'lead_stages')
    if (!hasLeads) return

    const [groups] = await queryInterface.sequelize.query(`
      SELECT DISTINCT workspace_id AS workspaceId, company_id AS companyId
      FROM leads
      WHERE deleted_at IS NULL
        AND workspace_id IS NOT NULL
        AND company_id IS NOT NULL
    `)

    for (const g of groups || []) {
      const workspaceId = g.workspaceId
      const companyId = g.companyId
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
      const hasLeadStageCol = (await queryInterface.describeTable('leads')).lead_stage_id
      if (hasLeadStageCol) {
        await queryInterface.sequelize.query(
          `
          UPDATE leads
          SET opportunity_stage = :stageName
          WHERE deleted_at IS NULL
            AND workspace_id = :workspaceId
            AND company_id = :companyId
            AND (
              lead_stage_id IS NOT NULL
              OR opportunity_stage IS NULL
              OR TRIM(opportunity_stage) = ''
            )
        `,
          { replacements: { stageName, workspaceId, companyId } },
        )
      } else {
        await queryInterface.sequelize.query(
          `
          UPDATE leads
          SET opportunity_stage = :stageName
          WHERE deleted_at IS NULL
            AND workspace_id = :workspaceId
            AND company_id = :companyId
            AND (opportunity_stage IS NULL OR TRIM(opportunity_stage) = '')
        `,
          { replacements: { stageName, workspaceId, companyId } },
        )
      }
    }

    const [orphans] = await queryInterface.sequelize.query(`
      SELECT DISTINCT company_id AS companyId
      FROM leads
      WHERE deleted_at IS NULL
        AND workspace_id IS NULL
        AND company_id IS NOT NULL
    `)
    for (const row of orphans || []) {
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
      const tbl = await queryInterface.describeTable('leads')
      if (tbl.lead_stage_id) {
        await queryInterface.sequelize.query(
          `
          UPDATE leads
          SET opportunity_stage = :stageName
          WHERE deleted_at IS NULL
            AND workspace_id IS NULL
            AND company_id = :companyId
            AND (
              lead_stage_id IS NOT NULL
              OR opportunity_stage IS NULL
              OR TRIM(opportunity_stage) = ''
            )
        `,
          { replacements: { stageName, companyId } },
        )
      } else {
        await queryInterface.sequelize.query(
          `
          UPDATE leads
          SET opportunity_stage = :stageName
          WHERE deleted_at IS NULL
            AND workspace_id IS NULL
            AND company_id = :companyId
            AND (opportunity_stage IS NULL OR TRIM(opportunity_stage) = '')
        `,
          { replacements: { stageName, companyId } },
        )
      }
    }

    const leadsCols = await queryInterface.describeTable('leads')
    if (leadsCols.lead_stage_id) {
      await queryInterface.removeColumn('leads', 'lead_stage_id').catch(() => {})
    }
    if (hasLeadStages) {
      await queryInterface.dropTable('lead_stages').catch(() => {})
    }
  },

  async down() {
    // Not reversible: lead_stage values were not preserved.
  },
}
