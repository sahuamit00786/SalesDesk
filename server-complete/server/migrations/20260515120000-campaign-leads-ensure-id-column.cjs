'use strict'

/**
 * Some environments had `campaign_leads` created without `id` (e.g. partial / skipped migration).
 * Sequelize expects a surrogate `id` PK. Add and backfill when missing.
 */
/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize
    const tables = await queryInterface.showAllTables()
    const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t))
    if (!names.map((n) => String(n).toLowerCase()).includes('campaign_leads')) return

    const desc = await queryInterface.describeTable('campaign_leads')
    if (desc.id) return

    try {
      await sequelize.query(`ALTER TABLE campaign_leads ADD COLUMN id CHAR(36) NULL`)
    } catch (e) {
      const msg = String(e?.parent?.sqlMessage || e?.message || '')
      if (!/duplicate column name/i.test(msg)) throw e
    }
    const descAfterAdd = await queryInterface.describeTable('campaign_leads')
    if (!descAfterAdd.id) {
      throw new Error('campaign_leads.id could not be added')
    }

    await sequelize.query(`UPDATE campaign_leads SET id = UUID() WHERE id IS NULL OR id = ''`)

    let pkName = null
    try {
      const [pkRows] = await sequelize.query(
        `SELECT CONSTRAINT_NAME AS name
         FROM information_schema.table_constraints
         WHERE table_schema = DATABASE()
           AND table_name = 'campaign_leads'
           AND constraint_type = 'PRIMARY KEY'
         LIMIT 1`,
      )
      pkName = pkRows?.[0]?.name || null
    } catch {
      pkName = null
    }
    if (pkName) {
      await sequelize.query(`ALTER TABLE campaign_leads DROP PRIMARY KEY`)
    }

    await sequelize.query(`ALTER TABLE campaign_leads MODIFY COLUMN id CHAR(36) NOT NULL`)
    await sequelize.query(`ALTER TABLE campaign_leads ADD PRIMARY KEY (id)`)

    const [[{ c }]] = await sequelize.query(
      `SELECT COUNT(*) AS c FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = 'campaign_leads'
         AND index_name = 'campaign_leads_campaign_lead_unique'`,
    )
    if (!Number(c)) {
      await queryInterface.addConstraint('campaign_leads', {
        fields: ['campaign_id', 'lead_id'],
        type: 'unique',
        name: 'campaign_leads_campaign_lead_unique',
      }).catch(() => {})
    }
  },

  async down(queryInterface) {
    // Non-reversible repair; leave table as-is.
    await Promise.resolve()
  },
}
