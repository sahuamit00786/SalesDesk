'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const usersDesc = await queryInterface.describeTable('users')
    const usersIdType = String(usersDesc?.id?.type || '').toLowerCase()
    const userFkType = usersIdType.includes('int') ? Sequelize.INTEGER.UNSIGNED : Sequelize.UUID

    await queryInterface
      .createTable('lead_followups', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        lead_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'leads', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        workspace_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        scheduled_at: { type: Sequelize.DATE, allowNull: false },
        remark: { type: Sequelize.TEXT, allowNull: true },
        quick_pick_minutes: { type: Sequelize.SMALLINT, allowNull: true },
        status: {
          type: Sequelize.ENUM('pending', 'done', 'cancelled'),
          allowNull: false,
          defaultValue: 'pending',
        },
        completed_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: userFkType, allowNull: false },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      .catch(() => {})

    await queryInterface.addIndex('lead_followups', ['lead_id', 'status', 'scheduled_at'], { name: 'lead_followups_lead_status_sched_idx' }).catch(() => {})
    await queryInterface.addIndex('lead_followups', ['company_id', 'scheduled_at'], { name: 'lead_followups_company_sched_idx' }).catch(() => {})
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lead_followups').catch(() => {})
  },
}
