'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('users')

    if (!desc.role_master_id) {
      await queryInterface.addColumn('users', 'role_master_id', {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: true,
        references: { model: 'role_master', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      })
    }

    await queryInterface.sequelize.query(`
      UPDATE users SET role_master_id = CASE role
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        ELSE 3
      END
      WHERE role_master_id IS NULL
    `)

    await queryInterface.changeColumn('users', 'role_master_id', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 3,
      references: { model: 'role_master', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    })

    if (!desc.is_active) {
      await queryInterface.addColumn('users', 'is_active', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      })
    }
    if (!desc.deactivated_at) {
      await queryInterface.addColumn('users', 'deactivated_at', {
        type: Sequelize.DATE,
        allowNull: true,
      })
    }

    const d2 = await queryInterface.describeTable('users')
    if (d2.role) {
      await queryInterface.removeColumn('users', 'role')
    }
  },

  async down(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('users').catch(() => ({}))
    if (!desc.role) {
      await queryInterface.addColumn('users', 'role', {
        type: Sequelize.ENUM('admin', 'manager', 'rep'),
        allowNull: false,
        defaultValue: 'rep',
      })
      await queryInterface.sequelize.query(`
        UPDATE users SET role = CASE role_master_id
          WHEN 1 THEN 'admin'
          WHEN 2 THEN 'manager'
          ELSE 'rep'
        END
      `)
    }
    if (desc.is_active) await queryInterface.removeColumn('users', 'is_active')
    if (desc.deactivated_at) await queryInterface.removeColumn('users', 'deactivated_at')
    if (desc.role_master_id) await queryInterface.removeColumn('users', 'role_master_id')
  },
}
