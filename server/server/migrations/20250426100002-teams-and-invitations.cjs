'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()

    if (!tables.includes('teams')) {
      await queryInterface.createTable('teams', {
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
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        description: {
          type: Sequelize.STRING(500),
          allowNull: true,
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
      await queryInterface.addIndex('teams', ['company_id'], { name: 'teams_company_id_idx' })
    }

    if (!tables.includes('team_members')) {
      await queryInterface.createTable('team_members', {
        team_id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: { model: 'teams', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        user_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          primaryKey: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
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
      await queryInterface.addIndex('team_members', ['user_id'], { name: 'team_members_user_idx' })
    }

    if (!tables.includes('invitations')) {
      await queryInterface.createTable('invitations', {
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
        email: {
          type: Sequelize.STRING(190),
          allowNull: false,
        },
        role_master_id: {
          type: Sequelize.TINYINT.UNSIGNED,
          allowNull: false,
          references: { model: 'role_master', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        token_hash: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        invited_by: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        accepted_at: {
          type: Sequelize.DATE,
          allowNull: true,
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
      await queryInterface.addIndex('invitations', ['company_id'], { name: 'inv_company_idx' })
      await queryInterface.addIndex('invitations', ['email'], { name: 'inv_email_idx' })
      await queryInterface.addIndex('invitations', ['token_hash'], {
        unique: true,
        name: 'inv_token_hash_uq',
      })
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('invitations')) await queryInterface.dropTable('invitations')
    if (tables.includes('team_members')) await queryInterface.dropTable('team_members')
    if (tables.includes('teams')) await queryInterface.dropTable('teams')
  },
}
