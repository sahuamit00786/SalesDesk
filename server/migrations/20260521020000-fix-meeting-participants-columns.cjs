'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('meeting_participants', 'lead_contact_id', { type: Sequelize.UUID, allowNull: true }).catch(() => {})
    await queryInterface.addColumn('meeting_participants', 'joined_at', { type: Sequelize.DATE, allowNull: true }).catch(() => {})
    await queryInterface.addColumn('meeting_participants', 'left_at', { type: Sequelize.DATE, allowNull: true }).catch(() => {})
    await queryInterface.sequelize.query(
      "ALTER TABLE meeting_participants MODIFY COLUMN role ENUM('host','attendee','bot') DEFAULT 'attendee'"
    ).catch(() => {})
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('meeting_participants', 'lead_contact_id').catch(() => {})
    await queryInterface.removeColumn('meeting_participants', 'joined_at').catch(() => {})
    await queryInterface.removeColumn('meeting_participants', 'left_at').catch(() => {})
    await queryInterface.sequelize.query(
      "ALTER TABLE meeting_participants MODIFY COLUMN role ENUM('host','attendee') DEFAULT 'attendee'"
    ).catch(() => {})
  },
}
