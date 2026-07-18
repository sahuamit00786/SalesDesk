'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('lead_tasks').catch(() => null)
    if (!desc || desc.skip_time_auto_in_progress) return
    await queryInterface.addColumn('lead_tasks', 'skip_time_auto_in_progress', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    })
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('lead_tasks').catch(() => null)
    if (!desc || !desc.skip_time_auto_in_progress) return
    await queryInterface.removeColumn('lead_tasks', 'skip_time_auto_in_progress')
  },
}
