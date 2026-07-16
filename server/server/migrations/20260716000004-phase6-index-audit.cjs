'use strict'

/**
 * Phase 6 — indexes surfaced by scripts/qa/indexAudit.js as missing for hot
 * query paths (role-scoped lead/task lists, reminder sweeps). Additive only.
 *
 * Note: the audit tool's own suggestion list included
 * `lead_followups(assigned_to, scheduled_at)`, but LeadFollowup has no
 * assigned_to column in this schema (the assignee is reached via its lead
 * association) — substituted with `(status, scheduled_at)`, which is what
 * reminderJob.js / dailyDigestJob.js actually filter on.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('leads', ['assigned_to'], {
      name: 'idx_leads_assigned_to',
    })
    await queryInterface.addIndex('lead_tasks', ['assigned_to'], {
      name: 'idx_tasks_assigned',
    })
    await queryInterface.addIndex('lead_followups', ['status', 'scheduled_at'], {
      name: 'idx_followups_status_sched',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('leads', 'idx_leads_assigned_to')
    await queryInterface.removeIndex('lead_tasks', 'idx_tasks_assigned')
    await queryInterface.removeIndex('lead_followups', 'idx_followups_status_sched')
  },
}
