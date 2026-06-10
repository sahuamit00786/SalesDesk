'use strict'

// users.id is CHAR(36); companies.id and attendance_logs.id are UUID (see hr-attendance-leave migration)
const userIdType = (Sequelize) => Sequelize.CHAR(36)
const uuidType = (Sequelize) => Sequelize.UUID

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('attendance_sessions')) return

    await queryInterface.createTable('attendance_sessions', {
      id: {
        type: uuidType(Sequelize),
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: userIdType(Sequelize),
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      company_id: {
        type: uuidType(Sequelize),
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      log_id: {
        type: uuidType(Sequelize),
        allowNull: true,
        references: { model: 'attendance_logs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      check_in_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      check_out_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      duration_hours: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    await queryInterface.addIndex('attendance_sessions', ['user_id', 'date'], {
      name: 'attendance_sessions_user_date',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('attendance_sessions')
  },
}
