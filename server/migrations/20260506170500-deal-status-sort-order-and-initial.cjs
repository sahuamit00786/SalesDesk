'use strict'

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName)
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition)
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnIfMissing(queryInterface, 'deal_statuses', 'sort_order', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    })
    await addColumnIfMissing(queryInterface, 'deal_statuses', 'is_initial', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    })

    const [groups] = await queryInterface.sequelize.query(`
      SELECT DISTINCT workspace_id AS workspaceId, company_id AS companyId
      FROM deal_statuses
      WHERE workspace_id IS NOT NULL AND company_id IS NOT NULL
    `)

    for (const group of groups) {
      const workspaceId = group.workspaceId
      const companyId = group.companyId
      const [rows] = await queryInterface.sequelize.query(
        `
        SELECT id
        FROM deal_statuses
        WHERE workspace_id = :workspaceId AND company_id = :companyId
        ORDER BY sort_order ASC, created_at ASC
      `,
        { replacements: { workspaceId, companyId } },
      )

      for (let i = 0; i < rows.length; i += 1) {
        await queryInterface.sequelize.query(
          `
          UPDATE deal_statuses
          SET sort_order = :sortOrder,
              is_initial = :isInitial
          WHERE id = :id
        `,
          {
            replacements: {
              id: rows[i].id,
              sortOrder: i,
              isInitial: i === 0 ? 1 : 0,
            },
          },
        )
      }
    }

    await queryInterface.addIndex('deal_statuses', ['workspace_id', 'company_id', 'sort_order'], {
      name: 'deal_statuses_workspace_company_sort_idx',
    }).catch(() => {})
    await queryInterface.addIndex('deal_statuses', ['workspace_id', 'company_id', 'is_initial'], {
      name: 'deal_statuses_workspace_company_initial_idx',
    }).catch(() => {})
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('deal_statuses', 'deal_statuses_workspace_company_initial_idx').catch(() => {})
    await queryInterface.removeIndex('deal_statuses', 'deal_statuses_workspace_company_sort_idx').catch(() => {})
    await queryInterface.removeColumn('deal_statuses', 'is_initial').catch(() => {})
    await queryInterface.removeColumn('deal_statuses', 'sort_order').catch(() => {})
  },
}
