'use strict'

const { DataTypes } = require('sequelize')

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn('leads', 'opportunity_status_id', {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: { model: 'opportunity_statuses', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('leads', 'opportunity_status_id')
  },
}
