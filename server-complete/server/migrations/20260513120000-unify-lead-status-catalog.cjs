'use strict'

/**
 * Drops legacy configured statuses (lead_statuses + lead_status_categories + leads.lead_status_id).
 * Renames opportunity_stages → lead_status (single pipeline catalog).
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
    const qi = queryInterface.sequelize
    let leadsCols = {}
    try {
      leadsCols = await queryInterface.describeTable('leads')
    } catch {
      return
    }

    const hasOpp = await tableExists(queryInterface, 'opportunity_stages')
    const hasLeadCatalog = await tableExists(queryInterface, 'lead_status')
    const hasOldStatuses = await tableExists(queryInterface, 'lead_statuses')

    if (hasOldStatuses && hasOpp && leadsCols.lead_status_id) {
      await qi
        .query(
          `
        UPDATE leads l
        INNER JOIN lead_statuses ls ON ls.id = l.lead_status_id
        INNER JOIN opportunity_stages os
          ON os.workspace_id = l.workspace_id
          AND os.company_id = l.company_id
          AND LOWER(TRIM(os.name)) = LOWER(TRIM(ls.name))
        SET l.opportunity_stage = os.name
        WHERE l.deleted_at IS NULL
          AND l.lead_status_id IS NOT NULL
      `,
        )
        .catch(() => {})
    }

    if (hasOpp && leadsCols.lead_status_id) {
      const [groups] = await qi.query(`
        SELECT DISTINCT l.workspace_id AS workspaceId, l.company_id AS companyId
        FROM leads l
        WHERE l.deleted_at IS NULL
          AND l.lead_status_id IS NOT NULL
          AND l.workspace_id IS NOT NULL
          AND l.company_id IS NOT NULL
      `)
      for (const g of groups || []) {
        const [stages] = await qi.query(
          `
          SELECT name FROM opportunity_stages
          WHERE workspace_id = :w AND company_id = :c
          ORDER BY is_default DESC, sort_order ASC, created_at ASC
          LIMIT 1
        `,
          { replacements: { w: g.workspaceId, c: g.companyId } },
        )
        const nm = stages[0]?.name || 'Lead Inbound'
        await qi.query(
          `
          UPDATE leads
          SET opportunity_stage = :nm
          WHERE deleted_at IS NULL
            AND workspace_id = :w
            AND company_id = :c
            AND lead_status_id IS NOT NULL
            AND (opportunity_stage IS NULL OR TRIM(opportunity_stage) = '')
        `,
          { replacements: { nm, w: g.workspaceId, c: g.companyId } },
        )
      }
    }

    if (leadsCols.lead_status_id) {
      await queryInterface.removeColumn('leads', 'lead_status_id').catch(() => {})
    }

    if (hasOldStatuses) {
      await queryInterface.dropTable('lead_statuses').catch(() => {})
    }
    if (await tableExists(queryInterface, 'lead_status_categories')) {
      await queryInterface.dropTable('lead_status_categories').catch(() => {})
    }

    if (hasOpp && !hasLeadCatalog) {
      await qi.query('RENAME TABLE opportunity_stages TO lead_status')
    }
  },

  async down() {
    // Irreversible: old lead_statuses rows are dropped.
  },
}
