/**
 * Bulk-insert synthetic leads, opportunities, and related CRM rows for QA / demos.
 *
 * Requires --execute (otherwise prints plan and exits).
 *
 * Usage (from repo root):
 *   npm run db:seed-test-dump -w server -- --execute
 *   npm run db:seed-test-dump -w server -- --execute --workspace=<uuid>
 *
 * A failed run rolls back (transaction). Orphan rows from older runs can be removed by filtering
 * emails like `seed.<runId>.%@example.test` on `leads`.
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../.env') })
dotenv.config({ path: path.join(__dirname, '../.env') })

const LEAD_ROWS = 120
const OPP_ROWS = 120

const SOURCES = ['manual', 'web_form', 'referral', 'campaign', 'csv_import', 'linkedin', 'cold_email', 'other']
const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'junk']
const ACTIVITY_TYPES = ['note', 'call', 'email', 'meeting', 'task', 'status_change', 'system']
const DEAL_ACTIVITY_TYPES = ['note', 'call', 'email', 'meeting', 'task', 'status_change', 'assignment', 'system']
const MEETING_TYPES = ['demo', 'follow_up', 'closing']
const MEETING_STATUSES = ['scheduled', 'completed', 'missed']

const DEFAULT_STAGES = [
  { name: 'open', isDefault: true, isDealStatus: false, sortOrder: 0 },
  { name: 'discovery', sortOrder: 1 },
  { name: 'demo_scheduled', sortOrder: 2 },
  { name: 'demo_completed', sortOrder: 3 },
  { name: 'solution_fit_confirmed', sortOrder: 4 },
  { name: 'proposal_in_progress', sortOrder: 5 },
  { name: 'proposal_sent', isDealStatus: true, sortOrder: 6 },
  { name: 'on_hold', sortOrder: 7 },
]

const CAMPAIGN_STAGES = [
  { key: 'new', label: 'New', sortOrder: 0 },
  { key: 'contacted', label: 'Contacted', sortOrder: 1 },
  { key: 'qualified', label: 'Qualified', sortOrder: 2 },
  { key: 'converted', label: 'Converted', sortOrder: 3 },
]

function argVal(name) {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p ? p.slice(name.length + 1) : ''
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickMaybe(arr, p) {
  return Math.random() < p ? pick(arr) : null
}

function rndInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

async function tableExists(sequelize, tableName) {
  const schema = process.env.DB_NAME
  if (!schema) return false
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1`,
    { replacements: [schema, tableName] },
  )
  return Array.isArray(rows) && rows.length > 0
}

async function main() {
  const execute = process.argv.includes('--execute')
  const workspaceArg = String(argVal('--workspace') || process.env.SEED_WORKSPACE_ID || '').trim()
  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

  const { sequelize } = await import('../src/config/db.js')
  const { Op } = await import('sequelize')
  const {
    Workspace,
    UserWorkspace,
    User,
    Lead,
    OpportunityStage,
    Tag,
    LeadTag,
    Activity,
    LeadTask,
    LeadFollowup,
    CallLog,
    Reminder,
    Deal,
    DealActivity,
    Meeting,
    Campaign,
    CampaignTeamMember,
    CampaignLead,
  } = await import('../src/models/index.js')

  let workspace = null
  if (workspaceArg) {
    workspace = await Workspace.findByPk(workspaceArg)
  } else {
    workspace = await Workspace.findOne({ order: [['createdAt', 'ASC']] })
  }

  if (!workspace) {
    console.error('No workspace found. Pass --workspace=<uuid> or create a workspace first.')
    process.exit(1)
  }

  const companyId = workspace.companyId
  const workspaceId = workspace.id

  const memberships = await UserWorkspace.findAll({
    where: { workspaceId: String(workspaceId) },
    attributes: ['userId'],
  })
  const userIds = [...new Set(memberships.map((m) => String(m.userId)))]
  const users =
    userIds.length > 0
      ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'email'] })
      : await User.findAll({ where: { companyId }, limit: 5, attributes: ['id', 'email'] })

  if (!users.length) {
    console.error('No users found for this company/workspace. Add a user first.')
    process.exit(1)
  }

  const actorId = users[0].id

  console.log('Workspace:', workspaceId, 'Company:', companyId, 'Users:', users.length, 'Actor:', actorId)
  console.log(
    `Plan: ${LEAD_ROWS} leads + ${OPP_ROWS} opportunities + activities/tasks/followups/calls/reminders/deals/meetings/campaigns (run id: ${runId})`,
  )

  if (!execute) {
    console.log('\nDry run. Re-run with --execute to insert.')
    await sequelize.close()
    return
  }

  const skip = { callLogs: false, reminders: false, deals: false, dealActivities: false, meetings: false, campaigns: false }
  skip.callLogs = !(await tableExists(sequelize, 'call_logs'))
  skip.reminders = !(await tableExists(sequelize, 'reminders'))
  skip.deals = !(await tableExists(sequelize, 'deals'))
  skip.dealActivities = !(await tableExists(sequelize, 'deal_activities'))
  skip.meetings = !(await tableExists(sequelize, 'meetings'))
  skip.campaigns = !(await tableExists(sequelize, 'campaigns'))

  const skippedTables = Object.entries(skip)
    .filter(([, v]) => v)
    .map(([k]) => k)
  if (skippedTables.length) {
    console.log('Skipping missing tables:', skippedTables.join(', '))
  }

  let plainLeads = []
  let oppLeads = []
  let activities = []
  let tasks = []
  let followups = []
  let callLogs = []
  let reminders = []
  let createdDeals = []
  let dealActivities = []
  let meetings = []
  let camp = null
  let campaignLeadRows = []

  await sequelize.transaction(async (t) => {
    let stages = await OpportunityStage.findAll({
      where: { workspaceId, companyId },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
      transaction: t,
    })
    if (!stages.length) {
      await OpportunityStage.bulkCreate(
        DEFAULT_STAGES.map((s) => ({ ...s, workspaceId, companyId })),
        { transaction: t },
      )
      stages = await OpportunityStage.findAll({
        where: { workspaceId, companyId },
        order: [
          ['sortOrder', 'ASC'],
          ['createdAt', 'ASC'],
        ],
        transaction: t,
      })
    }
    const stageNames = stages.map((s) => s.name)

    const tagDefs = [
      { name: 'Hot', color: '#ef4444' },
      { name: 'Nurture', color: '#22c55e' },
      { name: 'Enterprise', color: '#6366f1' },
      { name: 'SMB', color: '#0ea5e9' },
      { name: 'Partner', color: '#a855f7' },
      { name: 'Event 2026', color: '#f97316' },
      { name: 'Needs demo', color: '#eab308' },
      { name: 'Seeded', color: '#64748b' },
    ]
    const tags = await Promise.all(
      tagDefs.map(async (def) => {
        const existing = await Tag.findOne({ where: { companyId, name: def.name }, transaction: t })
        if (existing) return existing
        return Tag.create({ ...def, companyId, workspaceId }, { transaction: t })
      }),
    )

    function userRoundRobin(i) {
      return users[i % users.length].id
    }

    function buildLeadRow(i, isOpportunity) {
      const email = `seed.${runId}.${isOpportunity ? 'opp' : 'lead'}.${i}@example.test`
      const phone = String(2000000000 + (i % 799999999))
      return {
        title: isOpportunity ? `QA Opportunity ${i}` : `QA Lead ${i}`,
        contactName: isOpportunity ? `Opp Contact ${i}` : `Lead Contact ${i}`,
        company: `Seeded Co ${(i % 47) + 1}`,
        designation: pick(['AE', 'VP Sales', 'CTO', 'Founder', 'Procurement', null]),
        email,
        phone,
        phoneCountryCode: '+1',
        value: rndInt(500, 250000),
        valueCurrency: pick(['USD', 'EUR', 'GBP']),
        status: pick(STATUSES),
        source: pick(SOURCES),
        score: rndInt(0, 100),
        assignedTo: userRoundRobin(i + 3),
        ownerUserId: actorId,
        companyId,
        workspaceId,
        isDeleted: false,
        isOpportunity,
        opportunityStage: isOpportunity ? pick(stageNames) : pickMaybe(stageNames, 0.35),
        requirement: isOpportunity
          ? `Synthetic deal scope #${i}: integrations, rollout ${rndInt(1, 6)} phases.`
          : pickMaybe(
              [`Interested in pricing tier ${pick(['A', 'B', 'C'])}`, `RFP timeline Q${rndInt(1, 4)}`],
              0.5,
            ),
        notes: Math.random() < 0.4 ? `Notes seed ${runId} / row ${i}` : null,
        city: pickMaybe(['Austin', 'Toronto', 'Berlin', 'Singapore', 'Mumbai'], 0.7),
        state: pickMaybe(['TX', 'ON', 'BE', null], 0.5),
        country: pickMaybe(['US', 'CA', 'DE', 'SG', 'IN'], 0.7),
        closingDate: Math.random() < 0.25 ? new Date(Date.now() + rndInt(7, 120) * 86400000) : null,
      }
    }

    const leadPayloads = [
      ...Array.from({ length: LEAD_ROWS }, (_, i) => buildLeadRow(i + 1, false)),
      ...Array.from({ length: OPP_ROWS }, (_, i) => buildLeadRow(i + 1, true)),
    ]

    const createdLeads = await Lead.bulkCreate(leadPayloads, { returning: true, transaction: t })
    plainLeads = createdLeads.filter((l) => !l.isOpportunity)
    oppLeads = createdLeads.filter((l) => l.isOpportunity)

    const leadTagsRows = []
    for (const lead of createdLeads) {
      const n = rndInt(0, 3)
      const shuffled = [...tags].sort(() => Math.random() - 0.5)
      for (let j = 0; j < n; j++) {
        leadTagsRows.push({ leadId: lead.id, tagId: shuffled[j].id })
      }
    }
    if (leadTagsRows.length) {
      await LeadTag.bulkCreate(leadTagsRows, { ignoreDuplicates: true, transaction: t })
    }

    activities = []
    for (const lead of createdLeads) {
      const n = rndInt(1, 5)
      for (let k = 0; k < n; k++) {
        activities.push({
          leadId: lead.id,
          type: pick(ACTIVITY_TYPES),
          body: `[seed ${runId}] Activity ${k + 1} on ${lead.title}`,
          userId: pick(users).id,
          metadata: { seed: true, runId },
        })
      }
    }
    await Activity.bulkCreate(activities, { transaction: t })

    tasks = []
    for (const lead of createdLeads) {
      if (Math.random() > 0.55) continue
      tasks.push({
        leadId: lead.id,
        workspaceId,
        companyId,
        title: pick(['Call back', 'Send deck', 'Book demo', 'Pricing follow-up', 'Legal review']),
        taskType: 'follow_up',
        description: `Seeded task for ${lead.title}`,
        startAt: new Date(Date.now() - rndInt(0, 10) * 86400000),
        dueAt: new Date(Date.now() + rndInt(1, 14) * 86400000),
        priority: pick(['low', 'medium', 'high', 'urgent']),
        status: pick(['pending', 'in_progress', 'completed', 'cancelled']),
        completedAt: Math.random() < 0.2 ? new Date() : null,
        createdBy: actorId,
        assignedTo: lead.assignedTo || actorId,
      })
    }
    await LeadTask.bulkCreate(tasks, { transaction: t })

    followups = []
    for (const lead of createdLeads) {
      if (Math.random() > 0.65) continue
      followups.push({
        leadId: lead.id,
        workspaceId,
        companyId,
        scheduledAt: new Date(Date.now() + rndInt(1, 30) * 86400000),
        remark: `Seeded follow-up (${runId})`,
        quickPickMinutes: pick([null, 15, 30, 60]),
        status: pick(['pending', 'done', 'cancelled']),
        createdBy: actorId,
      })
    }
    await LeadFollowup.bulkCreate(followups, { transaction: t })

    if (!skip.callLogs) {
      callLogs = []
      for (const lead of createdLeads) {
        if (Math.random() > 0.72) continue
        callLogs.push({
          leadId: lead.id,
          ownerUserId: actorId,
          callType: pick(['inbound', 'outbound']),
          duration: rndInt(30, 2400),
          outcome: pick(['connected', 'no_answer', 'voicemail', 'followup_needed']),
          notes: `Synthetic call log ${runId}`,
        })
      }
      if (callLogs.length) await CallLog.bulkCreate(callLogs, { transaction: t })
    }

    if (!skip.reminders) {
      reminders = []
      for (const lead of createdLeads) {
        if (Math.random() > 0.82) continue
        reminders.push({
          companyId,
          workspaceId,
          ownerUserId: lead.assignedTo || actorId,
          createdBy: actorId,
          title: pick(['Check in', 'Renewal ping', 'Send contract', 'Stakeholder sync']),
          notes: `Linked to ${lead.title}`,
          remindAt: new Date(Date.now() + rndInt(1, 21) * 86400000),
          status: pick(['pending', 'done', 'dismissed']),
          targetType: lead.isOpportunity ? 'opportunity' : 'lead',
          targetId: lead.id,
        })
      }
      if (reminders.length) await Reminder.bulkCreate(reminders, { transaction: t })
    }

    createdDeals = []
    dealActivities = []
    if (!skip.deals) {
      const deals = []
      for (const lead of oppLeads) {
        if (Math.random() > 0.35) continue
        deals.push({
          workspaceId,
          companyId,
          opportunityLeadId: lead.id,
          name: `Deal: ${lead.title}`,
          description: `Synthetic deal for workspace ${workspaceId}`,
          value: lead.value,
          valueCurrency: lead.valueCurrency,
          stage: lead.opportunityStage,
          assignedTo: lead.assignedTo,
          ownerUserId: actorId,
          isDeleted: false,
        })
      }
      createdDeals = await Deal.bulkCreate(deals, { returning: true, transaction: t })
      if (!skip.dealActivities) {
        for (const d of createdDeals) {
          const m = rndInt(2, 6)
          for (let x = 0; x < m; x++) {
            dealActivities.push({
              dealId: d.id,
              type: pick(DEAL_ACTIVITY_TYPES),
              body: `[seed] Deal touchpoint ${x + 1}`,
              userId: actorId,
              metadata: { seed: true, runId },
            })
          }
        }
        if (dealActivities.length) await DealActivity.bulkCreate(dealActivities, { transaction: t })
      }
    }

    if (!skip.meetings) {
      meetings = []
      for (const lead of oppLeads) {
        if (Math.random() > 0.55) continue
        const start = new Date(Date.now() + rndInt(-30, 20) * 86400000)
        const end = new Date(start.getTime() + rndInt(30, 90) * 60000)
        meetings.push({
          workspaceId,
          leadId: lead.id,
          ownerUserId: actorId,
          googleEventId: `seed-${runId}-${lead.id}`,
          googleMeetLink: null,
          title: pick(['Discovery', 'Demo', 'Technical deep-dive', 'Negotiation']),
          meetingType: pick(MEETING_TYPES),
          agenda: 'Seeded meeting agenda',
          scheduledStart: start,
          scheduledEnd: end,
          timezone: 'UTC',
          status: pick(MEETING_STATUSES),
          recordingStatus: 'pending',
          transcriptionStatus: 'pending',
          aiSummaryStatus: 'pending',
          botStatus: 'scheduled',
          recordingBotConsent: false,
          createdBy: actorId,
        })
      }
      if (meetings.length) await Meeting.bulkCreate(meetings, { transaction: t })
    }

    if (!skip.campaigns) {
      const teamIds = users.slice(0, Math.min(4, users.length)).map((u) => u.id)
      camp = await Campaign.create(
        {
          workspaceId,
          companyId,
          name: `Seeded campaign ${runId}`,
          description: 'Synthetic campaign for list/board testing',
          leadTarget: 500000,
          stages: CAMPAIGN_STAGES,
          status: 'active',
          createdBy: actorId,
        },
        { transaction: t },
      )
      await CampaignTeamMember.bulkCreate(
        teamIds.map((userId) => ({ campaignId: camp.id, userId })),
        { transaction: t },
      )

      campaignLeadRows = []
      const attach = [...plainLeads.slice(0, 55), ...oppLeads.slice(0, 55)]
      for (let i = 0; i < attach.length; i++) {
        const lead = attach[i]
        campaignLeadRows.push({
          campaignId: camp.id,
          leadId: lead.id,
          stageKey: pick(['new', 'contacted', 'qualified', 'converted']),
          assignedUserId: userRoundRobin(i),
        })
      }
      if (campaignLeadRows.length) {
        await CampaignLead.bulkCreate(campaignLeadRows, { ignoreDuplicates: true, transaction: t })
      }
    }
  })

  console.log('\nDone.')
  console.log('  Leads (non-opp):', plainLeads.length)
  console.log('  Opportunities:', oppLeads.length)
  console.log('  Activities:', activities.length)
  console.log('  Tasks:', tasks.length)
  console.log('  Follow-ups:', followups.length)
  console.log('  Call logs:', skip.callLogs ? '(skipped)' : callLogs.length)
  console.log('  Reminders:', skip.reminders ? '(skipped)' : reminders.length)
  console.log('  Deals:', skip.deals ? '(skipped)' : createdDeals.length)
  console.log('  Deal activities:', skip.dealActivities || skip.deals ? '(skipped)' : dealActivities.length)
  console.log('  Meetings:', skip.meetings ? '(skipped)' : meetings.length)
  if (camp) {
    console.log('  Campaign:', camp.id, 'with', campaignLeadRows.length, 'campaign_leads')
  } else {
    console.log('  Campaign: (skipped)')
  }

  await sequelize.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
