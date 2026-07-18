'use strict'

module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('opportunity_statuses') && !tables.includes('pipeline_statuses')) {
      await queryInterface.renameTable('opportunity_statuses', 'pipeline_statuses')
    }

    const leadColumns = await queryInterface.describeTable('leads')
    if (leadColumns.opportunity_status_id && !leadColumns.pipeline_status_id) {
      // queryInterface.renameColumn drops collation info, which MySQL 8 then
      // rejects as an "incompatible" FK type vs pipeline_statuses.id
      // (utf8mb4_bin). Drop the FK, rename with collation preserved, re-add it.
      await queryInterface.sequelize.query(
        'ALTER TABLE leads DROP FOREIGN KEY leads_opportunity_status_id_foreign_idx',
      ).catch(() => {})
      await queryInterface.sequelize.query(
        'ALTER TABLE leads CHANGE COLUMN opportunity_status_id pipeline_status_id CHAR(36) COLLATE utf8mb4_bin NULL DEFAULT NULL',
      )
      await queryInterface.sequelize.query(
        'ALTER TABLE leads ADD CONSTRAINT leads_pipeline_status_id_foreign_idx FOREIGN KEY (pipeline_status_id) REFERENCES pipeline_statuses(id) ON UPDATE CASCADE ON DELETE SET NULL',
      )
    }

    await queryInterface.sequelize.query(
      'ALTER TABLE pipeline_statuses RENAME INDEX opportunity_statuses_workspace_id TO pipeline_statuses_workspace_id',
    ).catch(() => {})
    await queryInterface.sequelize.query(
      'ALTER TABLE pipeline_statuses RENAME INDEX opportunity_statuses_company_id TO pipeline_statuses_company_id',
    ).catch(() => {})
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE pipeline_statuses RENAME INDEX pipeline_statuses_workspace_id TO opportunity_statuses_workspace_id',
    ).catch(() => {})
    await queryInterface.sequelize.query(
      'ALTER TABLE pipeline_statuses RENAME INDEX pipeline_statuses_company_id TO opportunity_statuses_company_id',
    ).catch(() => {})

    const leadColumns = await queryInterface.describeTable('leads')
    if (leadColumns.pipeline_status_id) {
      await queryInterface.sequelize.query(
        'ALTER TABLE leads DROP FOREIGN KEY leads_pipeline_status_id_foreign_idx',
      ).catch(() => {})
      await queryInterface.sequelize.query(
        'ALTER TABLE leads CHANGE COLUMN pipeline_status_id opportunity_status_id CHAR(36) COLLATE utf8mb4_bin NULL DEFAULT NULL',
      )
      await queryInterface.sequelize.query(
        'ALTER TABLE leads ADD CONSTRAINT leads_opportunity_status_id_foreign_idx FOREIGN KEY (opportunity_status_id) REFERENCES pipeline_statuses(id) ON UPDATE CASCADE ON DELETE SET NULL',
      )
    }

    const tables = await queryInterface.showAllTables()
    if (tables.includes('pipeline_statuses')) {
      await queryInterface.renameTable('pipeline_statuses', 'opportunity_statuses')
    }
  },
}
