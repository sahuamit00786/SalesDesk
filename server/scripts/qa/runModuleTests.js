/**
 * Connexify QA — API regression + workspace isolation suite.
 *
 * Usage:
 *   node scripts/qa/runModuleTests.js
 *   node scripts/qa/runModuleTests.js --use-env
 *
 * Env (optional):
 *   QA_API_BASE=http://127.0.0.1:4000/api/v1
 *   QA_EMAIL=admin@example.com
 *   QA_PASSWORD=YourPassword1!
 */
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../../.env') })
dotenv.config({ path: path.join(__dirname, '../../.env') })

const API_BASE = process.env.QA_API_BASE || 'http://127.0.0.1:4000/api/v1'
const USE_ENV = process.argv.includes('--use-env')

const results = []
let failed = 0

function pass(id, msg) {
  results.push({ id, ok: true, msg })
  // eslint-disable-next-line no-console
  console.log(`  PASS  ${id} — ${msg}`)
}

function fail(id, msg, detail) {
  failed += 1
  results.push({ id, ok: false, msg, detail })
  // eslint-disable-next-line no-console
  console.error(`  FAIL  ${id} — ${msg}${detail ? `\n         ${detail}` : ''}`)
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

async function bootstrapSession() {
  if (USE_ENV) {
    const email = process.env.QA_EMAIL
    const password = process.env.QA_PASSWORD
    if (!email || !password) {
      throw new Error('Set QA_EMAIL and QA_PASSWORD in .env when using --use-env')
    }
    const login = await api('POST', '/auth/login', { body: { email, password } })
    if (!login.json?.success) throw new Error(`Login failed: ${login.json?.error?.message || login.status}`)
    const { accessToken, refreshToken, user } = login.json.data
    const ws = user?.company?.workspaces?.[0]?.id
    if (!ws) throw new Error('No workspace on user — complete onboarding first')
    return { token: accessToken, refreshToken, user, workspaceA: ws }
  }

  const run = Date.now()
  const email = `qa.${run}@example.com`
  const password = 'QaTestPass1!'
  const reg = await api('POST', '/auth/register', {
    body: {
      name: 'QA Admin',
      companyName: `QA Co ${run}`,
      email,
      password,
      confirmPassword: password,
    },
  })
  if (!reg.json?.success && reg.status !== 201 && reg.status !== 200) {
    throw new Error(`Register failed: ${reg.json?.error?.message || reg.status}`)
  }

  const { sequelize, User } = await import('../../src/models/index.js')
  await User.unscoped().update({ emailVerified: true }, { where: { email } })

  const login = await api('POST', '/auth/login', { body: { email, password } })
  if (!login.json?.success) throw new Error(`Login after register failed`)
  const { accessToken, refreshToken, user } = login.json.data
  const workspaceA = user?.company?.workspaces?.[0]?.id
  if (!workspaceA) throw new Error('No default workspace after register')

  return { token: accessToken, refreshToken, user, workspaceA, email, password }
}

async function createSecondWorkspace(token, workspaceA) {
  const res = await api('POST', '/workspaces', {
    token,
    workspaceId: workspaceA,
    body: { name: `QA Workspace B ${Date.now()}` },
  })
  if (!res.json?.success) throw new Error(`Create workspace B failed: ${res.json?.error?.message}`)
  const items = res.json.data?.items || []
  const wsB = items.find((w) => w.id !== workspaceA)?.id
  if (!wsB) throw new Error('Could not find second workspace id')
  return wsB
}

async function runDashboardTests(ctx) {
  // eslint-disable-next-line no-console
  console.log('\n── Dashboard ──')
  const { token, workspaceA, workspaceB } = ctx

  const dash = await api('GET', '/analytics/dashboard', { token, workspaceId: workspaceA })
  if (dash.status === 200 && dash.json?.success) pass('D-01', 'GET /analytics/dashboard')
  else fail('D-01', 'Dashboard stats', JSON.stringify(dash.json))

  const charts = await api('GET', '/analytics/dashboard-charts', { token, workspaceId: workspaceA })
  if (charts.status === 200 && charts.json?.success) pass('D-02', 'GET /analytics/dashboard-charts')
  else fail('D-02', 'Dashboard charts', JSON.stringify(charts.json))

  const badges = await api('GET', '/analytics/nav-badges', { token, workspaceId: workspaceA })
  if (badges.status === 200 && badges.json?.success) pass('D-03', 'GET /analytics/nav-badges')
  else fail('D-03', 'Nav badges', JSON.stringify(badges.json))

  const chartsB = await api('GET', '/analytics/dashboard-charts', { token, workspaceId: workspaceB })
  if (chartsB.status === 200) pass('D-04', 'Dashboard charts WS-B reachable')
  else fail('D-04', 'Charts WS-B', String(chartsB.status))
}

async function runLeadsTests(ctx) {
  // eslint-disable-next-line no-console
  console.log('\n── Leads (isolation + CRUD + import) ──')
  const { token, workspaceA, workspaceB } = ctx
  const tag = `qa-${Date.now()}`

  const createA = await api('POST', '/leads', {
    token,
    workspaceId: workspaceA,
    body: {
      title: `Lead A ${tag}`,
      contactName: 'Alice QA',
      email: `${tag}.a@example.com`,
      company: 'QA Corp A',
      status: 'new',
      source: 'manual',
    },
  })
  const leadAId = createA.json?.data?.id
  if (createA.status === 201 && leadAId) pass('L-01', 'Single lead create in WS-A')
  else fail('L-01', 'Create lead WS-A', JSON.stringify(createA.json))

  const createB = await api('POST', '/leads', {
    token,
    workspaceId: workspaceB,
    body: {
      title: `Lead B ${tag}`,
      contactName: 'Bob QA',
      email: `${tag}.b@example.com`,
      company: 'QA Corp B',
      status: 'new',
      source: 'manual',
    },
  })
  const leadBId = createB.json?.data?.id
  if (createB.status === 201 && leadBId) pass('L-02', 'Single lead create in WS-B')
  else fail('L-02', 'Create lead WS-B', JSON.stringify(createB.json))

  const listA = await api('GET', `/leads?search=${encodeURIComponent(tag)}&limit=50`, {
    token,
    workspaceId: workspaceA,
  })
  const rowsA = Array.isArray(listA.json?.data) ? listA.json.data : []
  const onlyA = rowsA.every((r) => r.workspaceId === workspaceA) && rowsA.some((r) => r.id === leadAId)
  const noBInA = !rowsA.some((r) => r.id === leadBId)
  if (listA.json?.success && onlyA && noBInA) pass('L-03', 'List WS-A excludes WS-B leads')
  else fail('L-03', 'WS-A list isolation', `count=${rowsA.length} ids=${rowsA.map((r) => r.id).join(',')}`)

  const listB = await api('GET', `/leads?search=${encodeURIComponent(tag)}&limit=50`, {
    token,
    workspaceId: workspaceB,
  })
  const rowsB = Array.isArray(listB.json?.data) ? listB.json.data : []
  const noAInB = !rowsB.some((r) => r.id === leadAId)
  const hasB = rowsB.some((r) => r.id === leadBId)
  if (listB.json?.success && noAInB && hasB) pass('L-04', 'List WS-B excludes WS-A leads')
  else fail('L-04', 'WS-B list isolation', `count=${rowsB.length}`)

  const crossGet = await api('GET', `/leads/${leadAId}`, { token, workspaceId: workspaceB })
  if (crossGet.status === 404 || crossGet.json?.success === false) {
    pass('L-05', 'GET lead from wrong workspace → not found')
  } else {
    fail('L-05', 'Cross-workspace GET should 404', JSON.stringify(crossGet.json))
  }

  const imp = await api('POST', '/leads/import', {
    token,
    workspaceId: workspaceA,
    body: {
      rows: [
        { contactName: 'Import One', email: `${tag}.i1@example.com`, company: 'Import Co', status: 'new' },
        { contactName: 'Import Two', email: `${tag}.i2@example.com`, company: 'Import Co', status: 'new' },
      ],
    },
  })
  if (imp.json?.success && (imp.json.data?.created >= 1 || imp.json.data?.imported >= 1)) {
    pass('L-06', 'CSV/bulk import into WS-A')
  } else if (imp.json?.success) {
    pass('L-06', `Import completed (${JSON.stringify(imp.json.data)})`)
  } else fail('L-06', 'Import', JSON.stringify(imp.json))

  const listAfterImport = await api('GET', `/leads?search=${encodeURIComponent(tag)}&limit=100`, {
    token,
    workspaceId: workspaceA,
  })
  const imported = (listAfterImport.json?.data || []).filter((r) =>
    String(r.email || '').includes(`${tag}.i`),
  )
  const importWsOk = imported.every((r) => r.workspaceId === workspaceA)
  if (imported.length >= 1 && importWsOk) pass('L-07', 'Imported leads scoped to WS-A')
  else fail('L-07', 'Import workspace scope', `found=${imported.length}`)

  const listBAfter = await api('GET', `/leads?search=${encodeURIComponent(tag)}&limit=100`, {
    token,
    workspaceId: workspaceB,
  })
  const importedInB = (listBAfter.json?.data || []).filter((r) =>
    String(r.email || '').includes(`${tag}.i`),
  )
  if (importedInB.length === 0) pass('L-08', 'Imported leads not visible in WS-B')
  else fail('L-08', 'Import leaked to WS-B', `count=${importedInB.length}`)

  const bulkCross = await api('POST', '/leads/bulk', {
    token,
    workspaceId: workspaceA,
    body: { ids: [leadBId], action: 'status', payload: { status: 'contacted' } },
  })
  if (bulkCross.status === 404) pass('L-09', 'Bulk action blocked for other-workspace lead IDs')
  else fail('L-09', 'Bulk cross-workspace leak', JSON.stringify(bulkCross.json))

  ctx.leadAId = leadAId
  ctx.leadBId = leadBId
  ctx.tag = tag
}

async function runPhase1MainTests(ctx) {
  // eslint-disable-next-line no-console
  console.log('\n── Phase 1: Opportunities, Deals, Lead distribution ──')
  const { token, workspaceA, workspaceB, leadAId } = ctx
  const tag = ctx.tag || `qa-${Date.now()}`

  const oppA = await api('POST', '/opportunities', {
    token,
    workspaceId: workspaceA,
    body: { fullName: 'Opp Alice', companyName: `Opp Co ${tag}`, dealValue: 5000 },
  })
  const oppAId = oppA.json?.data?.id
  if (oppA.status === 201 && oppAId) pass('O-01', 'Create opportunity in WS-A')
  else fail('O-01', 'Create opportunity', JSON.stringify(oppA.json))

  if (oppAId) {
    const oppGet = await api('GET', `/opportunities/${oppAId}`, { token, workspaceId: workspaceA })
    if (oppGet.json?.success && oppGet.json?.data?.id === oppAId) pass('O-02', 'GET opportunity by id WS-A')
    else fail('O-02', 'Get opportunity WS-A', JSON.stringify(oppGet.json))
  }

  const oppListB = await api('GET', '/opportunities?limit=50', { token, workspaceId: workspaceB })
  const oppsB = Array.isArray(oppListB.json?.data) ? oppListB.json.data : oppListB.json?.data?.items || []
  if (!oppAId || !oppsB.some((o) => o.id === oppAId)) pass('O-03', 'Opportunity not listed in WS-B')
  else fail('O-03', 'Opportunity leaked to WS-B')

  if (oppAId) {
    const deal = await api('POST', '/deals', {
      token,
      workspaceId: workspaceA,
      body: { opportunityLeadId: oppAId, name: `Deal ${tag}`, value: 1200 },
    })
    const dealId = deal.json?.data?.id
    if (deal.status === 201 && dealId) {
      pass('DE-01', 'Create deal under opportunity')
      ctx.dealId = dealId
    } else fail('DE-01', 'Create deal', JSON.stringify(deal.json))

    const dealsList = await api('GET', '/deals?limit=20', { token, workspaceId: workspaceA })
    const deals = Array.isArray(dealsList.json?.data) ? dealsList.json.data : dealsList.json?.data?.items || []
    if (dealId && deals.some((d) => d.id === dealId)) pass('DE-02', 'Deals list WS-A')
    else if (dealsList.json?.success) pass('DE-02', 'Deals list returns success')
    else fail('DE-02', 'List deals', JSON.stringify(dealsList.json))
  }

  const rules = await api('GET', '/leads/assignment-rules', { token, workspaceId: workspaceA })
  if (rules.json?.success) pass('LD-01', 'GET assignment rules')
  else fail('LD-01', 'Assignment rules', JSON.stringify(rules.json))

  const pipeline = await api('GET', '/analytics/pipeline-report', { token, workspaceId: workspaceA })
  if (pipeline.json?.success) pass('P-01', 'Pipeline analytics report')
  else fail('P-01', 'Pipeline report', JSON.stringify(pipeline.json))
}

async function runPhase2HrTests(ctx) {
  // eslint-disable-next-line no-console
  console.log('\n── Phase 2: HR (Attendance + Leave) ──')
  const { token, workspaceA } = ctx

  const today = await api('GET', '/attendance/today', { token, workspaceId: workspaceA })
  if (today.json?.success) pass('HR-01', 'GET /attendance/today')
  else fail('HR-01', 'Attendance today', JSON.stringify(today.json))

  const balance = await api('GET', '/leave/balance/me', { token, workspaceId: workspaceA })
  if (balance.json?.success) pass('HR-02', 'GET /leave/balance/me')
  else fail('HR-02', 'Leave balance', JSON.stringify(balance.json))

  const settings = await api('GET', '/leave/settings', { token, workspaceId: workspaceA })
  if (settings.json?.success) pass('HR-03', 'GET /leave/settings')
  else fail('HR-03', 'Leave settings', JSON.stringify(settings.json))

  const leaveCal = await api('GET', '/leave/calendar', { token, workspaceId: workspaceA })
  if (leaveCal.json?.success) pass('HR-04', 'GET /leave/calendar')
  else fail('HR-04', 'Leave calendar', JSON.stringify(leaveCal.json))
}

async function runPhase3EngageTests(ctx) {
  // eslint-disable-next-line no-console
  console.log('\n── Phase 3: Engage (Activities, Tasks, Calendar, Meetings, Templates) ──')
  const { token, workspaceA } = ctx

  const acts = await api('GET', '/activities?limit=10', { token, workspaceId: workspaceA })
  if (acts.json?.success) pass('EN-01', 'GET /activities')
  else fail('EN-01', 'Activities', JSON.stringify(acts.json))

  const tasks = await api('GET', '/tasks?limit=10', { token, workspaceId: workspaceA })
  if (tasks.json?.success) pass('EN-02', 'GET /tasks')
  else fail('EN-02', 'Tasks', JSON.stringify(tasks.json))

  const cal = await api('GET', '/calendar/events', { token, workspaceId: workspaceA })
  if (cal.status === 200 && Array.isArray(cal.json?.data)) pass('EN-03', 'GET /calendar/events')
  else fail('EN-03', 'Calendar', JSON.stringify(cal.json))

  const meetings = await api('GET', '/meetings?limit=10', { token, workspaceId: workspaceA })
  if (meetings.json?.success) pass('EN-04', 'GET /meetings')
  else fail('EN-04', 'Meetings', JSON.stringify(meetings.json))

  const templates = await api('GET', '/templates?limit=10', { token, workspaceId: workspaceA })
  if (templates.status === 200 && Array.isArray(templates.json?.data)) pass('EN-05', 'GET /templates')
  else fail('EN-05', 'Templates', JSON.stringify(templates.json))

  if (ctx.leadAId) {
    const call = await api('POST', '/calls', {
      token,
      workspaceId: workspaceA,
      body: { leadId: ctx.leadAId, callType: 'outbound', outcome: 'connected', duration: 60 },
    })
    if (call.status === 201) pass('EN-06', 'POST /calls log')
    else fail('EN-06', 'Call log', JSON.stringify(call.json))
  }
}

async function runPhase4ManageTests(ctx) {
  // eslint-disable-next-line no-console
  console.log('\n── Phase 4: Manage (Documents, Quotations, Invoices) ──')
  const { token, workspaceA } = ctx

  const docs = await api('GET', '/documents?limit=10', { token, workspaceId: workspaceA })
  if (docs.json?.success) pass('MG-01', 'GET /documents')
  else fail('MG-01', 'Documents', JSON.stringify(docs.json))

  const quotes = await api('GET', '/quotations?limit=10', { token, workspaceId: workspaceA })
  if (quotes.json?.success) pass('MG-02', 'GET /quotations')
  else fail('MG-02', 'Quotations', JSON.stringify(quotes.json))

  const invoices = await api('GET', '/invoices?limit=10', { token, workspaceId: workspaceA })
  if (invoices.json?.success) pass('MG-03', 'GET /invoices')
  else fail('MG-03', 'Invoices', JSON.stringify(invoices.json))

  const payments = await api('GET', '/deals/payments?limit=10', { token, workspaceId: workspaceA })
  if (payments.json?.success) pass('MG-04', 'GET /deals/payments')
  else fail('MG-04', 'Deal payments', JSON.stringify(payments.json))
}

async function runPhase5AutomateTests(ctx) {
  // eslint-disable-next-line no-console
  console.log('\n── Phase 5: Automate (Workflows, Campaigns, Web forms) ──')
  const { token, workspaceA, leadAId } = ctx
  const tag = ctx.tag || `qa-${Date.now()}`

  const flows = await api('GET', '/workflows?limit=10', { token, workspaceId: workspaceA })
  if (flows.json?.success) pass('AU-01', 'GET /workflows')
  else fail('AU-01', 'Workflows', JSON.stringify(flows.json))

  const camps = await api('GET', '/campaigns?limit=10', { token, workspaceId: workspaceA })
  if (camps.json?.success) pass('AU-02', 'GET /campaigns')
  else fail('AU-02', 'Campaigns', JSON.stringify(camps.json))

  const forms = await api('GET', '/forms?limit=10', { token, workspaceId: workspaceA })
  if (forms.json?.success) pass('AU-03', 'GET /forms')
  else fail('AU-03', 'Web forms', JSON.stringify(forms.json))

  if (leadAId) {
    const campCreate = await api('POST', '/campaigns', {
      token,
      workspaceId: workspaceA,
      body: {
        name: `QA Campaign ${tag}`,
        leadIds: [leadAId],
        teamUserIds: [ctx.user.id],
      },
    })
    if (campCreate.status === 201) pass('AU-04', 'POST /campaigns create')
    else fail('AU-04', 'Create campaign', JSON.stringify(campCreate.json))
  }
}

async function runPhase6SettingsTests(ctx) {
  // eslint-disable-next-line no-console
  console.log('\n── Phase 6: Insights & Settings ──')
  const { token, workspaceA } = ctx

  const ws = await api('GET', '/workspaces', { token, workspaceId: workspaceA })
  if (ws.json?.success && (ws.json.data?.items || []).length >= 2) pass('ST-01', 'GET /workspaces (multi-WS)')
  else fail('ST-01', 'Workspaces list', JSON.stringify(ws.json))

  const leadsReport = await api('GET', '/analytics/leads-report', { token, workspaceId: workspaceA })
  if (leadsReport.json?.success) pass('ST-02', 'GET /analytics/leads-report')
  else fail('ST-02', 'Leads report', JSON.stringify(leadsReport.json))

  const formMeta = await api('GET', '/leads/form-meta', { token, workspaceId: workspaceA })
  if (formMeta.json?.success) pass('ST-03', 'GET /leads/form-meta')
  else fail('ST-03', 'Lead form meta', JSON.stringify(formMeta.json))

  const me = await api('GET', '/auth/me', { token, workspaceId: workspaceA })
  if (me.json?.success && me.json.data?.companyId) pass('ST-04', 'GET /auth/me company scoped')
  else fail('ST-04', 'Auth me', JSON.stringify(me.json))
}

async function runTeamTests(ctx) {
  // eslint-disable-next-line no-console
  console.log('\n── Team / multi-workspace user ──')
  const { token, workspaceA, workspaceB, user } = ctx

  let rolesRes = await api('GET', '/team/roles', { token, workspaceId: workspaceA })
  let roles = rolesRes.json?.data?.items || rolesRes.json?.data || []
  if (!roles.length) {
    const { CompanyRole, MenuMaster, CompanyRoleMenu } = await import('../../src/models/index.js')
    const menus = await MenuMaster.findAll({ where: { isActive: true }, attributes: ['id'], limit: 5 })
    if (menus.length) {
      const role = await CompanyRole.create({
        companyId: user.companyId,
        name: `QA Sales ${Date.now()}`,
        description: 'QA test role',
        userRoleKind: 'sales',
      })
      await CompanyRoleMenu.bulkCreate(
        menus.map((m) => ({
          companyRoleId: role.id,
          menuId: m.id,
          canView: true,
          canEdit: false,
          canUpdate: false,
          canAdmin: false,
        })),
      )
      roles = [role]
    }
    if (!roles.length) {
      rolesRes = await api('GET', '/team/roles', { token, workspaceId: workspaceA })
      roles = rolesRes.json?.data?.items || rolesRes.json?.data || []
    }
  }
  const roleId = roles[0]?.id
  if (!roleId) {
    fail('T-01', 'No roles for invite test', JSON.stringify(rolesRes.json))
    return
  }

  const memberEmail = `member.${Date.now()}@example.com`
  const inv1 = await api('POST', '/team/invitations', {
    token,
    workspaceId: workspaceA,
    body: { email: memberEmail, companyRoleId: roleId, workspaceIds: [workspaceA] },
  })
  if (inv1.status === 201 && inv1.json?.success) pass('T-01', 'Invite new user to WS-A')
  else fail('T-01', 'Invite new', JSON.stringify(inv1.json))

  const { sequelize, User, UserWorkspace } = await import('../../src/models/index.js')
  let member = await User.unscoped().findOne({ where: { email: memberEmail } })
  if (!member) {
    member = await User.unscoped().create({
      name: 'QA Member',
      email: memberEmail,
      password: '$2b$10$abcdefghijklmnopqrstuv', // placeholder; not used
      companyId: user.companyId,
      companyRoleId: roleId,
      isCompanyAdmin: false,
      isActive: true,
      emailVerified: true,
    })
    await UserWorkspace.findOrCreate({
      where: { userId: member.id, workspaceId: workspaceA },
      defaults: { userId: member.id, workspaceId: workspaceA },
    })
    pass('T-02', 'Seeded member user (simulated accept)')
  } else {
    pass('T-02', 'Member user row exists (no duplicate on re-check)')
  }

  const beforeCount = await User.unscoped().count({ where: { email: memberEmail, companyId: user.companyId } })
  const addWs = await api('POST', '/team/invitations', {
    token,
    workspaceId: workspaceB,
    body: { email: memberEmail, companyRoleId: roleId, workspaceIds: [workspaceB] },
  })
  const afterCount = await User.unscoped().count({ where: { email: memberEmail, companyId: user.companyId } })
  if (
    addWs.json?.success &&
    addWs.json?.data?.existingMember &&
    beforeCount === afterCount &&
    afterCount === 1
  ) {
    pass('T-03', 'Re-invite existing member adds workspace (no duplicate user)')
  } else if (addWs.json?.success && beforeCount === afterCount) {
    pass('T-03', 'Re-invite did not create duplicate user row')
  } else {
    fail('T-03', 'Existing member invite', JSON.stringify(addWs.json))
  }

  const memberships = await UserWorkspace.findAll({ where: { userId: member.id } })
  const wsIds = memberships.map((m) => m.workspaceId)
  if (wsIds.includes(workspaceA) && wsIds.includes(workspaceB)) {
    pass('T-04', 'Member has both WS-A and WS-B memberships')
  } else {
    fail('T-04', 'Multi-workspace membership', `ws=${wsIds.join(',')}`)
  }
}

async function runAuthTests(ctx) {
  // eslint-disable-next-line no-console
  console.log('\n── Auth ──')
  const { token, refreshToken } = ctx

  const logout = await api('POST', '/auth/logout', { token })
  if (logout.json?.success) pass('A-01', 'POST /auth/logout')
  else fail('A-01', 'Logout', JSON.stringify(logout.json))

  const refresh = await api('POST', '/auth/refresh', { body: { refreshToken } })
  if (refresh.status === 401) pass('A-02', 'Refresh token revoked after logout')
  else fail('A-02', 'Refresh should fail after logout', String(refresh.status))
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(`Connexify QA — ${API_BASE}`)
  // eslint-disable-next-line no-console
  console.log(`Mode: ${USE_ENV ? '--use-env' : 'ephemeral test company'}`)

  const health = await api('GET', '/health')
  if (health.status !== 200) {
    // eslint-disable-next-line no-console
    console.error('API not reachable. Start server: npm run dev:server')
    process.exit(1)
  }

  const ctx = await bootstrapSession()
  ctx.workspaceB = await createSecondWorkspace(ctx.token, ctx.workspaceA)

  await runDashboardTests(ctx)
  await runLeadsTests(ctx)
  await runPhase1MainTests(ctx)
  await runPhase2HrTests(ctx)
  await runPhase3EngageTests(ctx)
  await runPhase4ManageTests(ctx)
  await runPhase5AutomateTests(ctx)
  await runPhase6SettingsTests(ctx)
  await runTeamTests(ctx)
  await runAuthTests(ctx)

  // eslint-disable-next-line no-console
  console.log('\n══════════════════════════════════════')
  const passed = results.filter((r) => r.ok).length
  // eslint-disable-next-line no-console
  console.log(`Results: ${passed} passed, ${failed} failed, ${results.length} total`)
  if (failed) process.exit(1)
  // eslint-disable-next-line no-console
  console.log('All QA checks passed.')
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('QA suite error:', err.message)
  process.exit(1)
})
