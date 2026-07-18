'use strict'

/** Restore team_id → teams FK after UUID migration dropped all FKs on team_members. */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize
    const [[ex]] = await sequelize.query(
      `SELECT COUNT(*) AS c FROM information_schema.table_constraints
       WHERE table_schema = DATABASE() AND table_name = 'team_members'
         AND constraint_name = 'team_members_team_fk'`,
    )
    if (Number(ex.c) > 0) return

    const tables = await sequelize
      .query('SHOW TABLES')
      .then(([rows]) => rows.map((r) => String(Object.values(r)[0])))
    if (!tables.includes('team_members') || !tables.includes('teams')) return

    await sequelize.query(`
      ALTER TABLE team_members
      ADD CONSTRAINT team_members_team_fk
      FOREIGN KEY (team_id) REFERENCES teams(id)
      ON UPDATE CASCADE ON DELETE CASCADE
    `)
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize
    try {
      await sequelize.query('ALTER TABLE team_members DROP FOREIGN KEY team_members_team_fk')
    } catch {
      // ignore
    }
  },
}
