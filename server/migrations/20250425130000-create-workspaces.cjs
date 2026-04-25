'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('workspaces')) return

    await queryInterface.createTable('workspaces', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(240),
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })

    await queryInterface.addIndex('workspaces', ['company_id'], { name: 'workspaces_company_id_idx' })

    await queryInterface.sequelize.query(`
      INSERT INTO workspaces (id, company_id, name, created_at, updated_at)
      SELECT UUID(), c.id, LEFT(CONCAT(TRIM(c.name), ' workspace'), 240), NOW(3), NOW(3)
      FROM companies c
      WHERE NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.company_id = c.id)
    `)
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('workspaces')) return
    await queryInterface.dropTable('workspaces')
  },
}
