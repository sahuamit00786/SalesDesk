'use strict'

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName)
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition)
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnIfMissing(queryInterface, 'lead_statuses', 'sort_order', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    })

    const [groups] = await queryInterface.sequelize.query(`
      SELECT DISTINCT workspace_id AS workspaceId, company_id AS companyId
      FROM lead_statuses
      WHERE workspace_id IS NOT NULL AND company_id IS NOT NULL
    `)

    for (const group of groups) {
      const workspaceId = group.workspaceId
      const companyId = group.companyId
      const [rows] = await queryInterface.sequelize.query(
        `
        SELECT id
        FROM lead_statuses
        WHERE workspace_id = :workspaceId AND company_id = :companyId
        ORDER BY is_default DESC, created_at ASC
      `,
        { replacements: { workspaceId, companyId } },
      )
      for (let i = 0; i < rows.length; i += 1) {
        await queryInterface.sequelize.query(
          `
          UPDATE lead_statuses
          SET sort_order = :sortOrder, is_default = :isDefault
          WHERE id = :id
        `,
          { replacements: { id: rows[i].id, sortOrder: i, isDefault: i === 0 ? 1 : 0 } },
        )
      }
    }

    await queryInterface.addIndex('lead_statuses', ['workspace_id', 'company_id', 'sort_order'], {
      name: 'lead_statuses_workspace_company_sort_idx',
    }).catch(() => {})
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('lead_statuses', 'lead_statuses_workspace_company_sort_idx').catch(() => {})
    await queryInterface.removeColumn('lead_statuses', 'sort_order').catch(() => {})
  },
}
