'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (tables.some((t) => String(t).toLowerCase() === 'filter_presets')) return

    await queryInterface.createTable('filter_presets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
      },
      workspace_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      module: {
        type: Sequelize.ENUM('leads', 'deals', 'opportunities', 'tasks'),
        allowNull: false,
      },
      filter_json: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    })

    await queryInterface.addIndex('filter_presets', ['user_id', 'module'], {
      name: 'idx_filter_presets_user_module',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('filter_presets')
  },
}
