'use strict';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meeting_participants', {
      id: {
        type: Sequelize.CHAR(36), // ✅ FIXED
        primaryKey: true,
        allowNull: false,
      },

      meeting_id: {
        type: Sequelize.CHAR(36), // ✅ FIXED
        allowNull: false,
        references: {
          model: 'meetings',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },

      user_id: {
        type: Sequelize.CHAR(36), // ✅ FIXED (must match users.id)
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
    });

    await queryInterface.addConstraint('meeting_participants', {
      fields: ['meeting_id', 'user_id'],
      type: 'unique',
      name: 'unique_meeting_user',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('meeting_participants');
  },
};