'use strict'

import { indexExists } from '../migration-helpers.cjs'

export default {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('meeting_participants')) {
      await queryInterface.createTable('meeting_participants', {
        id: {
          type: Sequelize.CHAR(36),
          primaryKey: true,
          allowNull: false,
        },

        meeting_id: {
          type: Sequelize.CHAR(36),
          allowNull: false,
          references: {
            model: 'meetings',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },

        user_id: {
          type: Sequelize.CHAR(36),
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },

        role: {
          type: Sequelize.ENUM('host', 'attendee'),
          defaultValue: 'attendee',
        },

        created_at: Sequelize.DATE,
        updated_at: Sequelize.DATE,
      })
    }

    if (!(await indexExists(queryInterface, 'meeting_participants', 'unique_meeting_user'))) {
      await queryInterface.addConstraint('meeting_participants', {
        fields: ['meeting_id', 'user_id'],
        type: 'unique',
        name: 'unique_meeting_user',
      })
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('meeting_participants').catch(() => {})
  },
}
