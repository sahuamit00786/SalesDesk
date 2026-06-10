import { DataTypes } from 'sequelize'

export async function up(queryInterface) {
  await queryInterface.addColumn('leads', 'opportunity_status_id', {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
    references: { model: 'opportunity_statuses', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  })
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('leads', 'opportunity_status_id')
}
