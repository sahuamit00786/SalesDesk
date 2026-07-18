'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addIndexSafe = async (table, fields, options) => {
      try {
        await queryInterface.addIndex(table, fields, options)
      } catch (e) {
        const msg = e.message || ''
        if (
          msg.includes('Duplicate key') ||
          msg.includes('already exists') ||
          msg.includes('Duplicate entry') ||
          msg.includes("doesn't exist") ||
          msg.includes('does not exist')
        ) return
        throw e
      }
    }

    await addIndexSafe('leads', ['company_id', 'workspace_id'], { name: 'idx_leads_company_workspace' })
    await addIndexSafe('deals', ['company_id', 'workspace_id'], { name: 'idx_deals_company_workspace' })
    await addIndexSafe('opportunities', ['company_id', 'workspace_id'], { name: 'idx_opportunities_company_workspace' })
    await addIndexSafe('meetings', ['company_id', 'workspace_id'], { name: 'idx_meetings_company_workspace' })
    await addIndexSafe('tasks', ['assigned_to', 'status'], { name: 'idx_tasks_assignee_status' })
    await addIndexSafe('leave_requests', ['company_id', 'status'], { name: 'idx_leave_requests_company_status' })
  },

  async down(queryInterface, Sequelize) {
    const removeIndexSafe = async (table, name) => {
      try {
        await queryInterface.removeIndex(table, name)
      } catch {
        // ignore if index does not exist
      }
    }

    await removeIndexSafe('leads', 'idx_leads_company_workspace')
    await removeIndexSafe('deals', 'idx_deals_company_workspace')
    await removeIndexSafe('opportunities', 'idx_opportunities_company_workspace')
    await removeIndexSafe('meetings', 'idx_meetings_company_workspace')
    await removeIndexSafe('tasks', 'idx_tasks_assignee_status')
    await removeIndexSafe('leave_requests', 'idx_leave_requests_company_status')
  },
}
