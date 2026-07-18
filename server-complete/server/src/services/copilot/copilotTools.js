import { Op } from 'sequelize'
import { User, UserWorkspace, CompanyRole, Lead } from '../../models/index.js'
import { leadAccessWhere } from '../leadVisibility.js'
import { executeSandboxedSql, SqlSandboxError } from '../sqlSandbox.js'
import * as leadsController from '../../controllers/leadsController.js'
import * as dealsController from '../../controllers/dealsController.js'
import * as analyticsController from '../../controllers/analyticsController.js'
import * as analyticsReportsExtended from '../../controllers/analyticsReportsExtended.js'

/**
 * Builds a synthetic Express-shaped req for calling existing (req,res,next)
 * controller handlers in-process — reuses their scoping/business logic
 * (getContext/leadScope/leadAccessWhere are not exported standalone) without
 * touching the HTTP layer or duplicating that logic here.
 */
function buildSyntheticReq(ctx, query = {}) {
  return {
    user: ctx.rawUser,
    headers: { 'x-workspace-id': ctx.workspaceId },
    workspaceId: ctx.workspaceId,
    query,
    params: {},
  }
}

function callControllerAsTool(controllerFn, req) {
  return new Promise((resolve, reject) => {
    let statusCode = 200
    const res = {
      status(code) {
        statusCode = code
        return res
      },
      json(payload) {
        resolve({ statusCode, payload })
      },
    }
    Promise.resolve(controllerFn(req, res, reject)).catch(reject)
  })
}

async function unwrap(promise) {
  const { statusCode, payload } = await promise
  if (statusCode >= 400) {
    throw new Error(payload?.error?.message || `Tool call failed with status ${statusCode}`)
  }
  return payload
}

export async function getLeads(args, ctx) {
  const query = {
    page: args.page || 1,
    limit: Math.min(args.limit || 20, 50),
    status: args.status,
    source: args.source,
    stage: args.stage,
    sort: args.sort || 'createdAt',
    order: args.order || 'desc',
    userId: args.assignedToUserId,
  }
  return unwrap(callControllerAsTool(leadsController.list, buildSyntheticReq(ctx, query)))
}

/** Full profile for one lead/opportunity (activities, tasks, custom fields) — used after resolveAmbiguousEntity picks a lead. */
export async function getLeadDetail(args, ctx) {
  const req = buildSyntheticReq(ctx, {})
  req.params = { id: args.leadId }
  return unwrap(callControllerAsTool(leadsController.getOne, req))
}

export async function getDeals(args, ctx) {
  const query = {
    page: args.page || 1,
    limit: Math.min(args.limit || 20, 50),
    stage: args.stage,
    sort: args.sort || 'createdAt',
    order: args.order || 'desc',
  }
  return unwrap(callControllerAsTool(dealsController.list, buildSyntheticReq(ctx, query)))
}

export async function getCampaignPerformance(args, ctx) {
  const query = { from: args.from, to: args.to }
  return unwrap(callControllerAsTool(analyticsReportsExtended.campaignsReport, buildSyntheticReq(ctx, query)))
}

export async function getUserPerformance(args, ctx) {
  const query = { from: args.from, to: args.to }
  return unwrap(callControllerAsTool(analyticsController.teamReport, buildSyntheticReq(ctx, query)))
}

/**
 * One team member's profile + performance metrics — used after
 * resolveAmbiguousEntity picks a user (kind "user"). Reuses the same
 * workspace-scoped teamReport and returns just this user's row, so the
 * frontend can render a single profile card instead of the whole team.
 */
export async function getUserDetail(args, ctx) {
  const report = await unwrap(
    callControllerAsTool(analyticsController.teamReport, buildSyntheticReq(ctx, { from: args.from, to: args.to })),
  )
  const rows = report?.data?.tables?.team || []
  const user = rows.find((r) => r.id === args.userId)
  if (!user) throw new Error('That user is not a member of the current workspace')
  return { user }
}

export async function getFollowups(args, ctx) {
  const query = { from: args.from, to: args.to, view: args.view || 'all', userId: args.userId }
  return unwrap(callControllerAsTool(analyticsReportsExtended.followupsReport, buildSyntheticReq(ctx, query)))
}

export async function getDashboardStats(args, ctx) {
  const query = { from: args.from, to: args.to, scope: args.scope }
  return unwrap(callControllerAsTool(analyticsController.dashboardCharts, buildSyntheticReq(ctx, query)))
}

async function findUserCandidates(nameQuery, ctx) {
  const users = await User.findAll({
    where: { companyId: ctx.companyId, name: { [Op.like]: `%${nameQuery}%` } },
    include: [
      { model: UserWorkspace, as: 'workspaceMemberships', where: { workspaceId: ctx.workspaceId }, required: true, attributes: [] },
      { model: CompanyRole, as: 'companyRole', attributes: ['name'], required: false },
    ],
    attributes: ['id', 'name', 'isActive'],
    limit: 10,
  })

  return Promise.all(
    users.map(async (u) => {
      const leadCount = await Lead.count({
        where: {
          companyId: ctx.companyId,
          workspaceId: ctx.workspaceId,
          isDeleted: false,
          [Op.or]: [{ assignedTo: u.id }, { ownerUserId: u.id }],
        },
      })
      return {
        id: u.id,
        kind: 'user',
        name: u.name,
        subtitle: u.companyRole?.name || 'Team member',
        meta: `${leadCount} lead${leadCount === 1 ? '' : 's'}`,
      }
    }),
  )
}

async function findLeadCandidates(nameQuery, ctx) {
  const leads = await Lead.findAll({
    where: {
      companyId: ctx.companyId,
      workspaceId: ctx.workspaceId,
      isDeleted: false,
      [Op.or]: [
        { contactName: { [Op.like]: `%${nameQuery}%` } },
        { title: { [Op.like]: `%${nameQuery}%` } },
      ],
    },
    attributes: ['id', 'title', 'contactName', 'company', 'status', 'isOpportunity'],
    limit: 10,
  })

  return leads.map((l) => ({
    id: l.id,
    kind: 'lead',
    name: l.contactName || l.title,
    subtitle: l.isOpportunity ? 'Opportunity' : 'Lead',
    meta: [l.company, l.status].filter(Boolean).join(' · ') || l.status,
  }))
}

/**
 * "Tell me about Amit" — a name can refer to either a team member (User) or
 * a lead/contact record, so search both by default (entityType 'auto') and
 * let the caller narrow to just one when it already knows which. Users are
 * scoped via user_workspaces membership (users has no direct workspace_id,
 * same fact the SQL sandbox works around for this table); leads are scoped
 * directly by companyId/workspaceId.
 */
export async function resolveAmbiguousEntity(args, ctx) {
  const nameQuery = args.nameQuery?.trim()
  if (!nameQuery) {
    throw new Error('resolveAmbiguousEntity requires a nameQuery')
  }
  const entityType = args.entityType || 'auto'

  const [userCandidates, leadCandidates] = await Promise.all([
    entityType === 'auto' || entityType === 'user' ? findUserCandidates(nameQuery, ctx) : [],
    entityType === 'auto' || entityType === 'lead' ? findLeadCandidates(nameQuery, ctx) : [],
  ])

  const candidates = [...userCandidates, ...leadCandidates]
  return { matchCount: candidates.length, candidates }
}

export async function runReadOnlySql(args, ctx) {
  const { sql } = args
  try {
    const { rows } = await executeSandboxedSql(sql, { companyId: ctx.companyId, workspaceId: ctx.workspaceId })
    return { rows: rows.slice(0, 500) }
  } catch (err) {
    if (err instanceof SqlSandboxError) {
      return { error: err.message }
    }
    throw err
  }
}

export const COPILOT_TOOL_IMPLEMENTATIONS = {
  getLeads,
  getLeadDetail,
  getDeals,
  getCampaignPerformance,
  getUserPerformance,
  getUserDetail,
  getFollowups,
  getDashboardStats,
  resolveAmbiguousEntity,
  runReadOnlySql,
}

// leadAccessWhere is re-exported for the disambiguation/entity-selection flow
// in copilotOrchestrator.js (post-selection lead-count lookups for a specific
// resolved user id), so it isn't duplicated there.
export { leadAccessWhere }
