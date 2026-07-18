'use strict'

const { addIndexIfMissing } = require('../migration-helpers.cjs')

// Must match referenced columns: users.id is CHAR(36); companies.id is UUID (see deals migration).
const userIdType = (Sequelize) => Sequelize.CHAR(36)
const companyIdType = (Sequelize) => Sequelize.UUID

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()

    if (!tables.includes('attendance_logs')) {
      await queryInterface.createTable('attendance_logs', {
        id: {
          type: Sequelize.UUID,
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
          type: companyIdType(Sequelize),
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        check_in_time: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        check_out_time: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        total_hours: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM('present', 'half_day', 'absent', 'late'),
          allowNull: false,
          defaultValue: 'present',
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
      await addIndexIfMissing(queryInterface, 'attendance_logs', ['user_id', 'date'], {
        name: 'attendance_logs_user_date_unique',
        unique: true,
      })
      await addIndexIfMissing(queryInterface, 'attendance_logs', ['company_id', 'date'], {
        name: 'attendance_logs_company_date_idx',
      })
    }

    if (!tables.includes('leave_types')) {
      await queryInterface.createTable('leave_types', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        company_id: {
          type: companyIdType(Sequelize),
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: {
          type: Sequelize.STRING(80),
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING(10),
          allowNull: false,
        },
        days_per_year: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
        is_paid: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        carry_forward: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        max_carry_forward_days: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
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
      await addIndexIfMissing(queryInterface, 'leave_types', ['company_id', 'code'], {
        name: 'leave_types_company_code_unique',
        unique: true,
      })
    }

    if (!tables.includes('leave_balances')) {
      await queryInterface.createTable('leave_balances', {
        id: {
          type: Sequelize.UUID,
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
        leave_type_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'leave_types', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        company_id: {
          type: companyIdType(Sequelize),
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        year: {
          type: Sequelize.SMALLINT.UNSIGNED,
          allowNull: false,
        },
        allocated: {
          type: Sequelize.DECIMAL(5, 1),
          allowNull: false,
          defaultValue: 0,
        },
        used: {
          type: Sequelize.DECIMAL(5, 1),
          allowNull: false,
          defaultValue: 0,
        },
        pending: {
          type: Sequelize.DECIMAL(5, 1),
          allowNull: false,
          defaultValue: 0,
        },
        available: {
          type: Sequelize.DECIMAL(5, 1),
          allowNull: false,
          defaultValue: 0,
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
      await addIndexIfMissing(queryInterface, 'leave_balances', ['user_id', 'leave_type_id', 'year'], {
        name: 'leave_balances_user_type_year_unique',
        unique: true,
      })
    }

    if (!tables.includes('leave_requests')) {
      await queryInterface.createTable('leave_requests', {
        id: {
          type: Sequelize.UUID,
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
        leave_type_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'leave_types', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        company_id: {
          type: companyIdType(Sequelize),
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        from_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        to_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        days: {
          type: Sequelize.DECIMAL(5, 1),
          allowNull: false,
        },
        reason: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        document_url: {
          type: Sequelize.STRING(512),
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM('pending', 'approved', 'rejected', 'cancelled'),
          allowNull: false,
          defaultValue: 'pending',
        },
        rejection_reason: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        approved_by: {
          type: userIdType(Sequelize),
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        applied_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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
      await addIndexIfMissing(queryInterface, 'leave_requests', ['company_id', 'status'], {
        name: 'leave_requests_company_status_idx',
      })
      await addIndexIfMissing(queryInterface, 'leave_requests', ['user_id', 'from_date', 'to_date'], {
        name: 'leave_requests_user_dates_idx',
      })
    }

    if (!tables.includes('public_holidays')) {
      await queryInterface.createTable('public_holidays', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        company_id: {
          type: companyIdType(Sequelize),
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: {
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
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
      await addIndexIfMissing(queryInterface, 'public_holidays', ['company_id', 'date'], {
        name: 'public_holidays_company_date_idx',
      })
    }

    if (!tables.includes('notifications')) {
      await queryInterface.createTable('notifications', {
        id: {
          type: Sequelize.UUID,
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
          type: companyIdType(Sequelize),
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        type: {
          type: Sequelize.STRING(60),
          allowNull: false,
          defaultValue: 'info',
        },
        is_read: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        link: {
          type: Sequelize.STRING(512),
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      })
      await addIndexIfMissing(queryInterface, 'notifications', ['user_id', 'is_read'], {
        name: 'notifications_user_read_idx',
      })
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notifications').catch(() => {})
    await queryInterface.dropTable('public_holidays').catch(() => {})
    await queryInterface.dropTable('leave_requests').catch(() => {})
    await queryInterface.dropTable('leave_balances').catch(() => {})
    await queryInterface.dropTable('leave_types').catch(() => {})
    await queryInterface.dropTable('attendance_logs').catch(() => {})
  },
}
