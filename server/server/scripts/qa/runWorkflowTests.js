/**
 * Workflow automation — node / condition / branch regression tests.
 * Usage: node scripts/qa/runWorkflowTests.js
 */
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../../.env') })
dotenv.config({ path: path.join(__dirname, '../../.env') })

const API_BASE = process.env.QA_API_BASE || 'http://127.0.0.1:4000/api/v1'
const results = []
let failed = 0

function pass(id, msg) {
  results.push({ id, ok: true, msg })
  console.log(`  PASS  ${id} — ${msg}`)
}

function fail(id, msg, detail) {
  failed += 1
  results.push({ id, ok: false, msg, detail })
  console.error(`  FAIL  ${id} — ${msg}${detail ? `\n         ${detail}` : ''}`)
}

function warn(id, msg) {
  results.push({ id, ok: 'warn', msg })
  console.log(`  WARN  ${id} — ${msg}`)
}

async function api(method, pathSuffix, { token, workspaceId, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (workspaceId) headers['x-workspace-id'] = workspaceId
  const res = await fetch(`${API_BASE}${pathSuffix}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    json = null
  }
  return { status: res.status, json }
}

function edge(id, source, target, sourceHandle) {
  return { id, source, target, ...(sourceHandle ? { sourceHandle } : {}) }
}

function node(id, type, data = {}) {
  return { id, type, position: { x: 0, y: 0 }, data }
}

function linearGraph(triggerType, steps) {
  const nodes = [node('trigger-1', triggerType, triggerType === 'triggerLeadUpdated' ? { watchFields: [] } : {})]
  const edges = []
  let prev = 'trigger-1'
  for (let i = 0; i < steps.length; i += 1) {
    const nid = `step-${i}`
    nodes.push(node(nid, steps[i].type, steps[i].data || {}))
    edges.push(edge(`e-${i}`, prev, nid))
    prev = nid
  }
  return { nodes, edges }
}

function branchGraph(triggerType, condData, trueAction, falseAction) {
  const nodes = [
    node('trigger-1', triggerType),
    node('cond-1', 'conditionField', condData),
    node('act-true', trueAction.type, trueAction.data || {}),
    node('act-false', falseAction.type, falseAction.data || {}),
  ]
  const edges = [
    edge('e0', 'trigger-1', 'cond-1'),
    edge('e1', 'cond-1', 'act-true', 'true'),
    edge('e2', 'cond-1', 'act-false', 'false'),
  ]
  return { nodes, edges }
}

async function bootstrap() {
  const run = Date.now()
  const email = `wf.qa.${run}@example.com`
  const password = 'QaTestPass1!'
  const reg = await api('POST', '/auth/register', {
    body: {
      name: 'WF QA',
      companyName: `WF QA ${run}`,
      email,
      password,
      confirmPassword: password,
    },
  })
  if (!reg.json?.success) throw new Error(`Register failed: ${reg.json?.error?.message || reg.status}`)

  const { User } = await import('../../src/models/index.js')
  await User.unscoped().update({ emailVerified: true }, { where: { email } })

  const login = await api('POST', '/auth/login', { body: { email, password } })
  if (!login.json?.success) throw new Error('Login failed')
  const { accessToken, user } = login.json.data
  const workspaceId = user?.company?.workspaces?.[0]?.id
  if (!workspaceId) throw new Error('No workspace')

  const leadRes = await api('POST', '/leads', {
    token: accessToken,
    workspaceId,
    body: {
      title: 'WF Test Lead',
      contactName: 'Alice Workflow',
      email: `alice.wf.${run}@example.com`,
      company: 'Acme QA',
      status: 'new',
      source: 'manual',
    },
  })
  if (!leadRes.json?.success) throw new Error(`Lead create failed: ${leadRes.json?.error?.message}`)
  const leadId = leadRes.json.data?.id

  return { token: accessToken, workspaceId, userId: user.id, leadId, email }
}

async function patchDef(token, workspaceId, workflowId, definitionJson) {
  return api('PATCH', `/workflows/${workflowId}`, { token, workspaceId, body: { definitionJson } })
}

async function testRun(token, workspaceId, workflowId, leadId) {
  return api('POST', `/workflows/${workflowId}/test`, { token, workspaceId, body: { leadId } })
}

async function getRun(token, workspaceId, runId) {
  return api('GET', `/workflow-runs/${runId}`, { token, workspaceId })
}

function stepMap(steps) {
  const m = new Map()
  for (const s of steps || []) m.set(s.nodeId, s)
  return m
}

async function createWorkflow(token, workspaceId, name = 'QA Flow') {
  const res = await api('POST', '/workflows', { token, workspaceId, body: { name, status: 'draft' } })
  if (!res.json?.success) throw new Error(`Create workflow failed: ${res.json?.error?.message}`)
  return res.json.data.id
}

async function runGraph(ctx, workflowId, definitionJson, leadId) {
  const patch = await patchDef(ctx.token, ctx.workspaceId, workflowId, definitionJson)
  if (!patch.json?.success) throw new Error(`Patch def: ${patch.json?.error?.message}`)
  const tr = await testRun(ctx.token, ctx.workspaceId, workflowId, leadId)
  if (!tr.json?.success) throw new Error(`Test run: ${tr.json?.error?.message}`)
  const runId = tr.json.data?.run?.id
  if (!runId) throw new Error('No run id returned')
  const full = await getRun(ctx.token, ctx.workspaceId, runId)
  if (!full.json?.success) throw new Error('getRun failed')
  return full.json.data
}

async function main() {
  console.log(`Workflow QA — ${API_BASE}`)
  const ctx = await bootstrap()
  const wfId = await createWorkflow(ctx.token, ctx.workspaceId)

  console.log('\n── Validation ──')
  const pubEmpty = await api('POST', `/workflows/${wfId}/publish`, { token: ctx.token, workspaceId: ctx.workspaceId })
  if (pubEmpty.status === 400) pass('WF-V01', 'Publish rejects graph without valid assign/template on action nodes')
  else fail('WF-V01', 'Expected publish validation', `status ${pubEmpty.status}`)

  console.log('\n── Triggers ──')
  const trigCreated = linearGraph('triggerLeadCreated', [{ type: 'actionCreateTask', data: { title: 'Trig OK', assigneeMode: 'trigger_actor' } }])
  const run1 = await runGraph(ctx, wfId, trigCreated, ctx.leadId)
  if (run1.status === 'completed') pass('WF-T01', 'triggerLeadCreated → create task completes')
  else fail('WF-T01', 'triggerLeadCreated run', run1.status)

  const trigUpdated = linearGraph('triggerLeadUpdated', [{ type: 'actionCreateTask', data: { title: 'Updated trig', assigneeMode: 'trigger_actor' } }])
  const run2 = await runGraph(ctx, wfId, trigUpdated, ctx.leadId)
  if (run2.status === 'completed') pass('WF-T02', 'triggerLeadUpdated test run completes')
  else fail('WF-T02', 'triggerLeadUpdated run', run2.status)

  console.log('\n── Conditions (operators) ──')
  const operators = [
    { op: 'equals', field: 'status', value: 'new', expect: true },
    { op: 'equals', field: 'status', value: 'won', expect: false },
    { op: 'not_equals', field: 'company', value: 'Other', expect: true },
    { op: 'contains', field: 'contactName', value: 'Alice', expect: true },
    { op: 'not_contains', field: 'email', value: 'nomatch', expect: true },
    { op: 'starts_with', field: 'contactName', value: 'Ali', expect: true },
    { op: 'ends_with', field: 'company', value: 'QA', expect: true },
    { op: 'is_not_empty', field: 'email', value: '', expect: true },
    { op: 'is_empty', field: 'notes', value: '', expect: true },
  ]

  for (const { op, field, value, expect } of operators) {
    const def = branchGraph(
      'triggerLeadCreated',
      { field, operator: op, value },
      { type: 'actionCreateTask', data: { title: `Branch YES ${op}`, assigneeMode: 'trigger_actor' } },
      { type: 'actionCreateTask', data: { title: `Branch NO ${op}`, assigneeMode: 'trigger_actor' } },
    )
    const run = await runGraph(ctx, wfId, def, ctx.leadId)
    const sm = stepMap(run.steps)
    const cond = sm.get('cond-1')
    const branch = cond?.outputJson?.branch
    const tookTrue = sm.get('act-true')?.status === 'completed'
    const tookFalse = sm.get('act-false')?.status === 'completed'
    const ok = branch === expect && (expect ? tookTrue && !tookFalse : tookFalse && !tookTrue)
    const id = `WF-C-${op}`
    if (ok) pass(id, `${op} on ${field} → branch ${expect}`)
    else fail(id, `${op} on ${field}`, `branch=${branch} expect=${expect} true=${tookTrue} false=${tookFalse}`)
  }

  // changed on lead_created — before is null
  const changedDef = branchGraph(
    'triggerLeadCreated',
    { field: 'status', operator: 'changed', value: '' },
    { type: 'actionCreateTask', data: { title: 'Changed yes', assigneeMode: 'trigger_actor' } },
    { type: 'actionCreateTask', data: { title: 'Changed no', assigneeMode: 'trigger_actor' } },
  )
  const changedRun = await runGraph(ctx, wfId, changedDef, ctx.leadId)
  const changedBranch = stepMap(changedRun.steps).get('cond-1')?.outputJson?.branch
  if (changedBranch === true) warn('WF-C-changed', 'operator "changed" is TRUE on Lead Created test (before=null) — misleading in editor')
  else pass('WF-C-changed', 'operator "changed" false on Lead Created test run')

  console.log('\n── Actions ──')
  const unassignedLead = await api('POST', '/leads', {
    token: ctx.token,
    workspaceId: ctx.workspaceId,
    body: { title: 'Unassigned', contactName: 'Bob', status: 'new', source: 'manual' },
  })
  const bobId = unassignedLead.json.data?.id

  const assignDef = linearGraph('triggerLeadCreated', [
    { type: 'actionAssignOwner', data: { userIds: [ctx.userId] } },
  ])
  const assignRun = await runGraph(ctx, wfId, assignDef, bobId)
  const assignStep = stepMap(assignRun.steps).get('step-0')
  if (assignStep?.outputJson?.assignedTo === ctx.userId) pass('WF-A01', 'actionAssignOwner assigns user')
  else fail('WF-A01', 'assign owner', JSON.stringify(assignStep?.outputJson))

  const assignSkip = await runGraph(ctx, wfId, assignDef, bobId)
  const skipStep = stepMap(assignSkip.steps).get('step-0')
  if (skipStep?.outputJson?.skipped === true) pass('WF-A02', 'actionAssignOwner skips when lead already assigned')
  else fail('WF-A02', 'assign skip', JSON.stringify(skipStep?.outputJson))

  const followDef = linearGraph('triggerLeadCreated', [
    { type: 'actionCreateFollowup', data: { delayPreset: '5m', remark: 'QA' } },
  ])
  const followRun = await runGraph(ctx, wfId, followDef, bobId)
  const followStep = stepMap(followRun.steps).get('step-0')
  if (followStep?.status === 'completed' && followStep?.outputJson?.followupId) pass('WF-A03', 'actionCreateFollowup creates follow-up')
  else fail('WF-A03', 'create followup', JSON.stringify(followStep))

  const delay0 = linearGraph('triggerLeadCreated', [
    { type: 'delayWait', data: { minutes: 0 } },
    { type: 'actionCreateTask', data: { title: 'After zero delay', assigneeMode: 'trigger_actor' } },
  ])
  const delayRun = await runGraph(ctx, wfId, delay0, ctx.leadId)
  if (delayRun.status === 'completed') pass('WF-A04', 'delayWait 0 min passes through immediately')
  else fail('WF-A04', 'delay 0', delayRun.status)

  const delayWait = linearGraph('triggerLeadCreated', [
    { type: 'delayWait', data: { minutes: 1 } },
    { type: 'actionCreateTask', data: { title: 'After 1 min', assigneeMode: 'trigger_actor' } },
  ])
  const waitRun = await runGraph(ctx, wfId, delayWait, ctx.leadId)
  if (waitRun.status === 'waiting' && waitRun.resumeNodeId === 'step-1') pass('WF-A05', 'delayWait 1 min sets run to waiting')
  else fail('WF-A05', 'delay waiting state', `${waitRun.status} resume=${waitRun.resumeNodeId}`)

  const templates = await api('GET', '/templates', { token: ctx.token, workspaceId: ctx.workspaceId })
  const templateId = templates.json?.data?.[0]?.id
  if (templateId) {
    const emailDef = linearGraph('triggerLeadCreated', [
      { type: 'actionSendEmailTemplate', data: { templateId } },
    ])
    const emailRun = await runGraph(ctx, wfId, emailDef, ctx.leadId)
    const emailStep = stepMap(emailRun.steps).get('step-0')
    if (emailStep?.status === 'completed') pass('WF-A06', 'actionSendEmailTemplate completes')
    else fail('WF-A06', 'send email', JSON.stringify(emailStep))
  } else {
    warn('WF-A06', 'No email template in workspace — skipped send-email action test')
  }

  const noEmailLead = await api('POST', '/leads', {
    token: ctx.token,
    workspaceId: ctx.workspaceId,
    body: { title: 'No Email', contactName: 'No Mail', status: 'new', source: 'manual' },
  })
  if (templateId) {
    const skipEmail = await runGraph(ctx, wfId, linearGraph('triggerLeadCreated', [
      { type: 'actionSendEmailTemplate', data: { templateId } },
    ]), noEmailLead.json.data?.id)
    const skip = stepMap(skipEmail.steps).get('step-0')
    if (skip?.status === 'skipped' && skip?.outputJson?.reason === 'lead_has_no_email') pass('WF-A07', 'send email skips when lead has no email')
    else fail('WF-A07', 'email skip', JSON.stringify(skip))
  }

  console.log('\n── Graph safety ──')
  const cycleDef = {
    nodes: [
      node('trigger-1', 'triggerLeadCreated'),
      node('a', 'actionCreateTask', { title: 'A', assigneeMode: 'trigger_actor' }),
      node('b', 'actionCreateTask', { title: 'B', assigneeMode: 'trigger_actor' }),
    ],
    edges: [edge('e0', 'trigger-1', 'a'), edge('e1', 'a', 'b'), edge('e2', 'b', 'a')],
  }
  const cycleRun = await runGraph(ctx, wfId, cycleDef, ctx.leadId)
  if (cycleRun.status === 'failed' && String(cycleRun.errorMessage).includes('Cycle')) pass('WF-G01', 'Cycle detection fails run')
  else fail('WF-G01', 'cycle', cycleRun.status)

  console.log('\n── Live vs draft ──')
  const liveWf = await createWorkflow(ctx.token, ctx.workspaceId, 'Live draft only')
  const liveDef = linearGraph('triggerLeadCreated', [
    { type: 'actionCreateTask', data: { title: 'Should not live fire', assigneeMode: 'trigger_actor' } },
  ])
  await patchDef(ctx.token, ctx.workspaceId, liveWf, liveDef)
  const beforeTasks = await api('GET', `/leads/${ctx.leadId}/tasks`, { token: ctx.token, workspaceId: ctx.workspaceId })
  const countBefore = (beforeTasks.json?.data || []).length
  const newLead = await api('POST', '/leads', {
    token: ctx.token,
    workspaceId: ctx.workspaceId,
    body: { title: 'Draft check', contactName: 'Draft', status: 'new', source: 'manual' },
  })
  await new Promise((r) => setTimeout(r, 800))
  const afterTasks = await api('GET', `/leads/${newLead.json.data?.id}/tasks`, { token: ctx.token, workspaceId: ctx.workspaceId })
  const countAfter = (afterTasks.json?.data || []).length
  if (countAfter === 0) pass('WF-L01', 'Draft workflow does not auto-run on lead create')
  else fail('WF-L01', 'draft fired live', `tasks=${countAfter}`)

  await api('PATCH', `/workflows/${liveWf}`, { token: ctx.token, workspaceId: ctx.workspaceId, body: { status: 'active' } })
  const activeLead = await api('POST', '/leads', {
    token: ctx.token,
    workspaceId: ctx.workspaceId,
    body: { title: 'Active check', contactName: 'Active', status: 'new', source: 'manual' },
  })
  await new Promise((r) => setTimeout(r, 1200))
  const activeTasks = await api('GET', `/leads/${activeLead.json.data?.id}/tasks`, { token: ctx.token, workspaceId: ctx.workspaceId })
  if ((activeTasks.json?.data || []).length >= 1) pass('WF-L02', 'Active workflow auto-runs on lead create')
  else fail('WF-L02', 'active did not fire', JSON.stringify(activeTasks.json))

  console.log('\n══════════════════════════════════════')
  const warns = results.filter((r) => r.ok === 'warn').length
  const passed = results.filter((r) => r.ok === true).length
  console.log(`Results: ${passed} passed, ${failed} failed, ${warns} warnings, ${results.length} total`)
  if (failed) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
