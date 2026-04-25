'use strict'

const { randomUUID } = require('node:crypto')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface
    const sequelize = qi.sequelize
    const [tableRows] = await sequelize.query('SHOW TABLES')
    const tables = tableRows.map((r) => String(Object.values(r)[0]))

    const usersDesc = await qi.describeTable('users').catch(() => null)
    if (!usersDesc?.id) return

    const idType = String(usersDesc.id.type || '')
    if (idType.toLowerCase().includes('char') || idType.toLowerCase().includes('uuid')) {
      const leadsDesc = await qi.describeTable('leads').catch(() => null)
      if (leadsDesc && !leadsDesc.workspace_id && tables.includes('leads')) {
        await qi.addColumn('leads', 'workspace_id', {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'workspaces', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        })
        await qi.addIndex('leads', ['workspace_id'], { name: 'leads_workspace_id_idx' })
      }
      return
    }

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0')

    try {
      const [refs] = await sequelize.query(
        `
        SELECT DISTINCT rc.CONSTRAINT_NAME AS CONSTRAINT_NAME, rc.TABLE_NAME AS TABLE_NAME
        FROM information_schema.REFERENTIAL_CONSTRAINTS rc
        WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
          AND rc.REFERENCED_TABLE_NAME = 'users'
      `,
      )

      for (const row of refs) {
        const { CONSTRAINT_NAME, TABLE_NAME } = row
        try {
          await sequelize.query(`ALTER TABLE \`${TABLE_NAME}\` DROP FOREIGN KEY \`${CONSTRAINT_NAME}\``)
        } catch {
          // ignore if already dropped
        }
      }

      const usersMid = await qi.describeTable('users')
      if (!usersMid.id_uuid) {
        await qi.addColumn('users', 'id_uuid', {
          type: Sequelize.CHAR(36),
          allowNull: true,
        })
      }

      const [userRows] = await sequelize.query(
        'SELECT id FROM users WHERE id_uuid IS NULL OR id_uuid = ""',
      )
      for (const u of userRows) {
        const nu = randomUUID()
        await sequelize.query('UPDATE users SET id_uuid = ? WHERE id = ?', {
          replacements: [nu, u.id],
        })
      }

      await sequelize.query('ALTER TABLE users MODIFY id_uuid CHAR(36) NOT NULL')

      const tmDesc = tables.includes('team_members') ? await qi.describeTable('team_members') : null
      if (tmDesc?.user_id) {
        const ut = String(tmDesc.user_id.type || '')
        if (!ut.toLowerCase().includes('char')) {
          if (!tmDesc.user_uuid) {
            await qi.addColumn('team_members', 'user_uuid', {
              type: Sequelize.CHAR(36),
              allowNull: true,
            })
          }
          await sequelize.query(`
            UPDATE team_members tm
            INNER JOIN users u ON tm.user_id = u.id
            SET tm.user_uuid = u.id_uuid
            WHERE tm.user_uuid IS NULL OR tm.user_uuid = ''
          `)
          const [[tmIdx]] = await sequelize.query(
            `SELECT COUNT(*) AS c FROM information_schema.statistics
             WHERE table_schema = DATABASE() AND table_name = 'team_members'
               AND index_name = 'team_members_team_id_fk_idx'`,
          )
          if (Number(tmIdx.c) === 0) {
            await sequelize.query('CREATE INDEX team_members_team_id_fk_idx ON team_members (team_id)')
          }
          const [[pkRow]] = await sequelize.query(
            `SELECT COUNT(*) AS c FROM information_schema.table_constraints
             WHERE table_schema = DATABASE() AND table_name = 'team_members' AND constraint_type = 'PRIMARY KEY'`,
          )
          if (Number(pkRow.c) > 0) {
            await sequelize.query('ALTER TABLE team_members DROP PRIMARY KEY')
          }
          await qi.removeColumn('team_members', 'user_id')
          await sequelize.query('ALTER TABLE team_members CHANGE user_uuid user_id CHAR(36) NOT NULL')
          await sequelize.query('ALTER TABLE team_members ADD PRIMARY KEY (team_id, user_id)')
          try {
            await sequelize.query('DROP INDEX team_members_team_id_fk_idx ON team_members')
          } catch {
            // redundant with composite PK (team_id, user_id); ignore if already dropped
          }
        }
      }

      const invDesc = tables.includes('invitations') ? await qi.describeTable('invitations') : null
      if (invDesc?.invited_by) {
        const it = String(invDesc.invited_by.type || '')
        if (!it.toLowerCase().includes('char')) {
          if (!invDesc.invited_by_uuid) {
            await qi.addColumn('invitations', 'invited_by_uuid', {
              type: Sequelize.CHAR(36),
              allowNull: true,
            })
          }
          await sequelize.query(`
            UPDATE invitations i
            INNER JOIN users u ON i.invited_by = u.id
            SET i.invited_by_uuid = u.id_uuid
            WHERE i.invited_by_uuid IS NULL OR i.invited_by_uuid = ''
          `)
          await qi.removeColumn('invitations', 'invited_by')
          await sequelize.query(
            'ALTER TABLE invitations CHANGE invited_by_uuid invited_by CHAR(36) NOT NULL',
          )
        }
      } else if (invDesc?.invited_by_uuid && !invDesc.invited_by) {
        await sequelize.query(
          'ALTER TABLE invitations CHANGE invited_by_uuid invited_by CHAR(36) NOT NULL',
        )
      }

      if (tables.includes('leads')) {
        let leadsDesc = await qi.describeTable('leads')
        if (leadsDesc.owner_user_id) {
          const ouType = String(leadsDesc.owner_user_id.type || '')
          if (!ouType.toLowerCase().includes('char')) {
            if (!leadsDesc.owner_user_uuid) {
              await qi.addColumn('leads', 'owner_user_uuid', {
                type: Sequelize.CHAR(36),
                allowNull: true,
              })
            }
            await sequelize.query(`
              UPDATE leads l
              INNER JOIN users u ON l.owner_user_id = u.id
              SET l.owner_user_uuid = u.id_uuid
              WHERE l.owner_user_id IS NOT NULL
                AND (l.owner_user_uuid IS NULL OR l.owner_user_uuid = '')
            `)
            await qi.removeColumn('leads', 'owner_user_id')
            await sequelize.query('ALTER TABLE leads CHANGE owner_user_uuid owner_user_id CHAR(36) NULL')
          }
        } else if (leadsDesc.owner_user_uuid && !leadsDesc.owner_user_id) {
          await sequelize.query('ALTER TABLE leads CHANGE owner_user_uuid owner_user_id CHAR(36) NULL')
        }
        leadsDesc = await qi.describeTable('leads')
        if (!leadsDesc.workspace_id) {
          await qi.addColumn('leads', 'workspace_id', {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'workspaces', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          })
          await qi.addIndex('leads', ['workspace_id'], { name: 'leads_workspace_id_idx' })
        }
      }

      const uFinal = await qi.describeTable('users')
      const idCol = uFinal.id
      const idIsUuid =
        idCol && (String(idCol.type).toLowerCase().includes('char') || String(idCol.type).toLowerCase().includes('uuid'))

      async function dropAllForeignKeysOnTable(tableName) {
        const [cs] = await sequelize.query(
          `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
          { replacements: [tableName] },
        )
        for (const row of cs) {
          try {
            await sequelize.query(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``)
          } catch {
            // ignore
          }
        }
      }

      if (!idIsUuid) {
        await sequelize.query('SET SESSION foreign_key_checks = 0')

        const [refs2] = await sequelize.query(`
          SELECT DISTINCT rc.CONSTRAINT_NAME AS CONSTRAINT_NAME, rc.TABLE_NAME AS TABLE_NAME
          FROM information_schema.REFERENTIAL_CONSTRAINTS rc
          WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
            AND rc.REFERENCED_TABLE_NAME = 'users'
        `)
        for (const row of refs2) {
          try {
            await sequelize.query(`ALTER TABLE \`${row.TABLE_NAME}\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``)
          } catch {
            // ignore
          }
        }

        for (const tbl of ['leads', 'team_members', 'invitations']) {
          if (tables.includes(tbl)) await dropAllForeignKeysOnTable(tbl)
        }

        const [[pkUsers]] = await sequelize.query(
          `SELECT COUNT(*) AS c FROM information_schema.table_constraints
           WHERE table_schema = DATABASE() AND table_name = 'users' AND constraint_type = 'PRIMARY KEY'`,
        )
        if (Number(pkUsers.c) > 0) {
          const [[idColRow]] = await sequelize.query(`SHOW COLUMNS FROM users WHERE Field = 'id'`)
          const idMysqlType = idColRow?.Type ? String(idColRow.Type) : 'int unsigned'
          await sequelize.query(
            `ALTER TABLE users MODIFY \`id\` ${idMysqlType} NOT NULL`,
          )
          await sequelize.query('ALTER TABLE users DROP PRIMARY KEY')
        }
        if (uFinal.id && !String(uFinal.id.type).toLowerCase().includes('char')) {
          await qi.removeColumn('users', 'id')
        }
        if (uFinal.id_uuid) {
          await sequelize.query('ALTER TABLE users CHANGE id_uuid id CHAR(36) NOT NULL')
        }
        await sequelize.query('ALTER TABLE users ADD PRIMARY KEY (id)')

        await sequelize.query('SET SESSION foreign_key_checks = 1')
      }

      async function addFkIfMissing(sql, name) {
        const [[ex]] = await sequelize.query(
          `SELECT COUNT(*) AS c FROM information_schema.table_constraints
           WHERE table_schema = DATABASE() AND constraint_name = ?`,
          { replacements: [name] },
        )
        if (Number(ex.c) === 0) {
          await sequelize.query(sql)
        }
      }

      if (tables.includes('team_members')) {
        await addFkIfMissing(
          `
          ALTER TABLE team_members
          ADD CONSTRAINT team_members_user_fk
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON UPDATE CASCADE ON DELETE CASCADE
        `,
          'team_members_user_fk',
        )
      }

      if (tables.includes('team_members') && tables.includes('teams')) {
        await addFkIfMissing(
          `
          ALTER TABLE team_members
          ADD CONSTRAINT team_members_team_fk
          FOREIGN KEY (team_id) REFERENCES teams(id)
          ON UPDATE CASCADE ON DELETE CASCADE
        `,
          'team_members_team_fk',
        )
      }

      if (tables.includes('invitations')) {
        await addFkIfMissing(
          `
          ALTER TABLE invitations
          ADD CONSTRAINT invitations_invited_by_fk
          FOREIGN KEY (invited_by) REFERENCES users(id)
          ON UPDATE CASCADE ON DELETE CASCADE
        `,
          'invitations_invited_by_fk',
        )
      }

      if (tables.includes('leads')) {
        const ld = await qi.describeTable('leads')
        if (ld?.owner_user_id) {
          await addFkIfMissing(
            `
            ALTER TABLE leads
            ADD CONSTRAINT leads_owner_user_fk
            FOREIGN KEY (owner_user_id) REFERENCES users(id)
            ON UPDATE CASCADE ON DELETE SET NULL
          `,
            'leads_owner_user_fk',
          )
        }
      }
    } finally {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
    }
  },

  async down() {
    // Irreversible; restore from backup if needed.
  },
}
