'use strict'

const LEAD_STATUSES = [
  'new',
  'attempting_contact',
  'contacted',
  'qualified',
  'nurturing',
  'unresponsive',
  'disqualified',
]

const OPPORTUNITY_STAGES = [
  'open',
  'discovery',
  'demo_scheduled',
  'demo_completed',
  'solution_fit_confirmed',
  'proposal_in_progress',
  'proposal_sent',
  'on_hold',
]

const DEAL_STAGES = [
  'qualification',
  'proposal',
  'negotiation',
  'contract_sent',
  'won',
  'lost',
]

module.exports = {
  async up(queryInterface) {
    const now = new Date()
    const [workspaces] = await queryInterface.sequelize.query(`
      SELECT id, company_id AS companyId
      FROM workspaces
      WHERE id IS NOT NULL AND company_id IS NOT NULL
    `)

    for (const ws of workspaces) {
      const workspaceId = ws.id
      const companyId = ws.companyId

      const [categories] = await queryInterface.sequelize.query(
        `
        SELECT id
        FROM lead_status_categories
        WHERE workspace_id = :workspaceId AND company_id = :companyId
        ORDER BY created_at ASC
        LIMIT 1
      `,
        { replacements: { workspaceId, companyId } },
      )

      let categoryId = categories[0]?.id
      if (!categoryId) {
        const [idRows] = await queryInterface.sequelize.query(`SELECT UUID() AS id`)
        const id = idRows[0].id
        await queryInterface.sequelize.query(
          `
          INSERT INTO lead_status_categories (id, name, workspace_id, company_id, created_at, updated_at)
          VALUES (:id, 'Default', :workspaceId, :companyId, :now, :now)
        `,
          { replacements: { id, workspaceId, companyId, now } },
        )
        categoryId = id
      }

      for (let i = 0; i < LEAD_STATUSES.length; i += 1) {
        const name = LEAD_STATUSES[i]
        const [rows] = await queryInterface.sequelize.query(
          `
          SELECT id
          FROM lead_statuses
          WHERE workspace_id = :workspaceId AND company_id = :companyId AND name = :name
          LIMIT 1
        `,
          { replacements: { workspaceId, companyId, name } },
        )
        if (!rows.length) {
          await queryInterface.sequelize.query(
            `
            INSERT INTO lead_statuses (id, name, category_id, is_default, workspace_id, company_id, created_at, updated_at)
            VALUES (UUID(), :name, :categoryId, :isDefault, :workspaceId, :companyId, :now, :now)
          `,
            {
              replacements: {
                name,
                categoryId,
                isDefault: i === 0 ? 1 : 0,
                workspaceId,
                companyId,
                now,
              },
            },
          )
        }
      }

      const [leadDefaultRows] = await queryInterface.sequelize.query(
        `
        SELECT id FROM lead_statuses
        WHERE workspace_id = :workspaceId AND company_id = :companyId AND is_default = 1
        ORDER BY created_at ASC
      `,
        { replacements: { workspaceId, companyId } },
      )
      if (!leadDefaultRows.length) {
        await queryInterface.sequelize.query(
          `
          UPDATE lead_statuses
          SET is_default = CASE WHEN name = 'new' THEN 1 ELSE 0 END
          WHERE workspace_id = :workspaceId AND company_id = :companyId
        `,
          { replacements: { workspaceId, companyId } },
        )
      } else if (leadDefaultRows.length > 1) {
        const keepId = leadDefaultRows[0].id
        await queryInterface.sequelize.query(
          `
          UPDATE lead_statuses
          SET is_default = CASE WHEN id = :keepId THEN 1 ELSE 0 END
          WHERE workspace_id = :workspaceId AND company_id = :companyId
        `,
          { replacements: { workspaceId, companyId, keepId } },
        )
      }

      for (let i = 0; i < OPPORTUNITY_STAGES.length; i += 1) {
        const name = OPPORTUNITY_STAGES[i]
        await queryInterface.sequelize.query(
          `
          INSERT INTO opportunity_stages (id, name, is_default, sort_order, workspace_id, company_id, created_at, updated_at)
          SELECT UUID(), :name, :isDefault, :sortOrder, :workspaceId, :companyId, :now, :now
          WHERE NOT EXISTS (
            SELECT 1 FROM opportunity_stages
            WHERE workspace_id = :workspaceId AND company_id = :companyId AND name = :name
          )
        `,
          {
            replacements: {
              name,
              isDefault: i === 0 ? 1 : 0,
              sortOrder: i,
              workspaceId,
              companyId,
              now,
            },
          },
        )
      }

      await queryInterface.sequelize.query(
        `
        UPDATE opportunity_stages
        SET sort_order = CASE name
          WHEN 'open' THEN 0
          WHEN 'discovery' THEN 1
          WHEN 'demo_scheduled' THEN 2
          WHEN 'demo_completed' THEN 3
          WHEN 'solution_fit_confirmed' THEN 4
          WHEN 'proposal_in_progress' THEN 5
          WHEN 'proposal_sent' THEN 6
          WHEN 'on_hold' THEN 7
          ELSE sort_order
        END
        WHERE workspace_id = :workspaceId AND company_id = :companyId
      `,
        { replacements: { workspaceId, companyId } },
      )

      const [oppDefaultRows] = await queryInterface.sequelize.query(
        `
        SELECT id FROM opportunity_stages
        WHERE workspace_id = :workspaceId AND company_id = :companyId AND is_default = 1
      `,
        { replacements: { workspaceId, companyId } },
      )
      if (!oppDefaultRows.length) {
        await queryInterface.sequelize.query(
          `
          UPDATE opportunity_stages
          SET is_default = CASE WHEN name = 'open' THEN 1 ELSE 0 END
          WHERE workspace_id = :workspaceId AND company_id = :companyId
        `,
          { replacements: { workspaceId, companyId } },
        )
      }

      for (let i = 0; i < DEAL_STAGES.length; i += 1) {
        const name = DEAL_STAGES[i]
        await queryInterface.sequelize.query(
          `
          INSERT INTO deal_statuses (id, name, is_deal_complete_status, is_initial, sort_order, workspace_id, company_id, created_at, updated_at)
          SELECT UUID(), :name, :isComplete, :isInitial, :sortOrder, :workspaceId, :companyId, :now, :now
          WHERE NOT EXISTS (
            SELECT 1 FROM deal_statuses
            WHERE workspace_id = :workspaceId AND company_id = :companyId AND name = :name
          )
        `,
          {
            replacements: {
              name,
              isComplete: name === 'won' ? 1 : 0,
              isInitial: i === 0 ? 1 : 0,
              sortOrder: i,
              workspaceId,
              companyId,
              now,
            },
          },
        )
      }

      await queryInterface.sequelize.query(
        `
        UPDATE deal_statuses
        SET sort_order = CASE name
          WHEN 'qualification' THEN 0
          WHEN 'proposal' THEN 1
          WHEN 'negotiation' THEN 2
          WHEN 'contract_sent' THEN 3
          WHEN 'won' THEN 4
          WHEN 'lost' THEN 5
          ELSE sort_order
        END
        WHERE workspace_id = :workspaceId AND company_id = :companyId
      `,
        { replacements: { workspaceId, companyId } },
      )

      await queryInterface.sequelize.query(
        `
        UPDATE deal_statuses
        SET is_initial = CASE WHEN name = 'qualification' THEN 1 ELSE 0 END
        WHERE workspace_id = :workspaceId AND company_id = :companyId
      `,
        { replacements: { workspaceId, companyId } },
      )

      await queryInterface.sequelize.query(
        `
        UPDATE deal_statuses
        SET is_deal_complete_status = CASE WHEN name = 'won' THEN 1 ELSE 0 END
        WHERE workspace_id = :workspaceId AND company_id = :companyId
      `,
        { replacements: { workspaceId, companyId } },
      )
    }
  },

  async down() {},
}
