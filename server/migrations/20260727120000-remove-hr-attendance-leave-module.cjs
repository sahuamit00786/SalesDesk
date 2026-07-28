'use strict'

const { addIndexIfMissing } = require('../migration-helpers.cjs')

/**
 * Removes the HR module: attendance (attendance_logs, attendance_sessions — schema
 * only, no app code ever read/wrote them) and leave (leave_types, leave_balances,
 * leave_requests, public_holidays — the previously working Leave feature). Also
 * drops the companies columns that only existed to support these
 * (leave_weekly_off_days, late_threshold_hour, late_threshold_minute).
 *
 * The notifications table created alongside these in 20260517100000-hr-attendance-leave
 * is NOT touched — it backs the general Notification feature, unrelated to HR.
 *
 * down() recreates the final-state schema (i.e. including every later migration's
 * ALTERs — workspace_id, half-day, edit-audit fields, adjustment_note, unique
 * holiday index) as empty tables/columns. Data is not restorable.
 */

const userIdType = (Sequelize) => Sequelize.CHAR(36)
const companyIdType = (Sequelize) => Sequelize.UUID

module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()

    // FK-safe order: sessions reference attendance_logs; balances/requests reference
    // leave_types, so those must go before leave_types itself.
    if (tables.includes('attendance_sessions')) await queryInterface.dropTable('attendance_sessions')
    if (tables.includes('attendance_logs')) await queryInterface.dropTable('attendance_logs')
    if (tables.includes('leave_balances')) await queryInterface.dropTable('leave_balances')
    if (tables.includes('leave_requests')) await queryInterface.dropTable('leave_requests')
    if (tables.includes('leave_types')) await queryInterface.dropTable('leave_types')
    if (tables.includes('public_holidays')) await queryInterface.dropTable('public_holidays')

    const companyCols = await queryInterface.describeTable('companies')
    if (companyCols.leave_weekly_off_days) await queryInterface.removeColumn('companies', 'leave_weekly_off_days')
    if (companyCols.late_threshold_hour) await queryInterface.removeColumn('companies', 'late_threshold_hour')
    if (companyCols.late_threshold_minute) await queryInterface.removeColumn('companies', 'late_threshold_minute')
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()

    if (!tables.includes('leave_types')) {
      await queryInterface.createTable('leave_types', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        company_id: {
          type: companyIdType(Sequelize), allowNull: false,
          references: { model: 'companies', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        name: { type: Sequelize.STRING(80), allowNull: false },
        code: { type: Sequelize.STRING(10), allowNull: false },
        days_per_year: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        is_paid: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        carry_forward: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        max_carry_forward_days: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      })
      await addIndexIfMissing(queryInterface, 'leave_types', ['company_id', 'code'], { name: 'leave_types_company_code_unique', unique: true })
    }

    if (!tables.includes('leave_requests')) {
      await queryInterface.createTable('leave_requests', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        user_id: {
          type: userIdType(Sequelize), allowNull: false,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        leave_type_id: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'leave_types', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
        },
        company_id: {
          type: companyIdType(Sequelize), allowNull: false,
          references: { model: 'companies', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        workspace_id: { type: Sequelize.UUID, allowNull: false },
        from_date: { type: Sequelize.DATEONLY, allowNull: false },
        to_date: { type: Sequelize.DATEONLY, allowNull: false },
        days: { type: Sequelize.DECIMAL(5, 1), allowNull: false },
        is_half_day: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        reason: { type: Sequelize.TEXT, allowNull: true },
        document_url: { type: Sequelize.STRING(512), allowNull: true },
        status: { type: Sequelize.ENUM('pending', 'approved', 'rejected', 'cancelled'), allowNull: false, defaultValue: 'pending' },
        rejection_reason: { type: Sequelize.TEXT, allowNull: true },
        approved_by: {
          type: userIdType(Sequelize), allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        applied_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      })
      await addIndexIfMissing(queryInterface, 'leave_requests', ['company_id', 'status'], { name: 'leave_requests_company_status_idx' })
      await addIndexIfMissing(queryInterface, 'leave_requests', ['user_id', 'from_date', 'to_date'], { name: 'leave_requests_user_dates_idx' })
      await addIndexIfMissing(queryInterface, 'leave_requests', ['workspace_id'], { name: 'leave_requests_workspace_idx' })
    }

    if (!tables.includes('leave_balances')) {
      await queryInterface.createTable('leave_balances', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        user_id: {
          type: userIdType(Sequelize), allowNull: false,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        leave_type_id: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'leave_types', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        company_id: {
          type: companyIdType(Sequelize), allowNull: false,
          references: { model: 'companies', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        workspace_id: { type: Sequelize.UUID, allowNull: false },
        year: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false },
        allocated: { type: Sequelize.DECIMAL(5, 1), allowNull: false, defaultValue: 0 },
        used: { type: Sequelize.DECIMAL(5, 1), allowNull: false, defaultValue: 0 },
        pending: { type: Sequelize.DECIMAL(5, 1), allowNull: false, defaultValue: 0 },
        available: { type: Sequelize.DECIMAL(5, 1), allowNull: false, defaultValue: 0 },
        adjustment_note: { type: Sequelize.STRING(500), allowNull: true, defaultValue: null },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      })
      await addIndexIfMissing(queryInterface, 'leave_balances', ['user_id', 'leave_type_id', 'year'], { name: 'leave_balances_user_type_year_unique', unique: true })
      await addIndexIfMissing(queryInterface, 'leave_balances', ['workspace_id'], { name: 'leave_balances_workspace_idx' })
    }

    if (!tables.includes('attendance_logs')) {
      await queryInterface.createTable('attendance_logs', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        user_id: {
          type: userIdType(Sequelize), allowNull: false,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        company_id: {
          type: companyIdType(Sequelize), allowNull: false,
          references: { model: 'companies', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        workspace_id: { type: Sequelize.UUID, allowNull: false },
        date: { type: Sequelize.DATEONLY, allowNull: false },
        check_in_time: { type: Sequelize.DATE, allowNull: true },
        check_out_time: { type: Sequelize.DATE, allowNull: true },
        total_hours: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
        status: { type: Sequelize.ENUM('present', 'half_day', 'absent', 'late'), allowNull: false, defaultValue: 'present' },
        note: { type: Sequelize.TEXT, allowNull: true },
        edited_by_user_id: {
          type: Sequelize.CHAR(36), allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        edited_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      })
      await addIndexIfMissing(queryInterface, 'attendance_logs', ['user_id', 'date'], { name: 'attendance_logs_user_date_unique', unique: true })
      await addIndexIfMissing(queryInterface, 'attendance_logs', ['company_id', 'date'], { name: 'attendance_logs_company_date_idx' })
      await addIndexIfMissing(queryInterface, 'attendance_logs', ['workspace_id'], { name: 'attendance_logs_workspace_idx' })
    }

    if (!tables.includes('attendance_sessions')) {
      await queryInterface.createTable('attendance_sessions', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        user_id: {
          type: userIdType(Sequelize), allowNull: false,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        company_id: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'companies', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        workspace_id: { type: Sequelize.UUID, allowNull: false },
        log_id: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'attendance_logs', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        date: { type: Sequelize.DATEONLY, allowNull: false },
        check_in_time: { type: Sequelize.DATE, allowNull: false },
        check_out_time: { type: Sequelize.DATE, allowNull: true },
        duration_hours: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      })
      await addIndexIfMissing(queryInterface, 'attendance_sessions', ['user_id', 'date'], { name: 'attendance_sessions_user_date' })
      await addIndexIfMissing(queryInterface, 'attendance_sessions', ['workspace_id'], { name: 'attendance_sessions_workspace_idx' })
    }

    if (!tables.includes('public_holidays')) {
      await queryInterface.createTable('public_holidays', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        company_id: {
          type: companyIdType(Sequelize), allowNull: false,
          references: { model: 'companies', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        name: { type: Sequelize.STRING(120), allowNull: false },
        date: { type: Sequelize.DATEONLY, allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      })
      await addIndexIfMissing(queryInterface, 'public_holidays', ['company_id', 'date'], { name: 'public_holidays_company_date_unique', unique: true })
    }

    const companyCols = await queryInterface.describeTable('companies')
    if (!companyCols.leave_weekly_off_days) {
      await queryInterface.addColumn('companies', 'leave_weekly_off_days', { type: Sequelize.JSON, allowNull: true })
    }
    if (!companyCols.late_threshold_hour) {
      await queryInterface.addColumn('companies', 'late_threshold_hour', { type: Sequelize.INTEGER, allowNull: true, defaultValue: 10 })
    }
    if (!companyCols.late_threshold_minute) {
      await queryInterface.addColumn('companies', 'late_threshold_minute', { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 })
    }
    // Note: recreates empty structure only — leave/attendance/holiday data is not restorable.
  },
}
