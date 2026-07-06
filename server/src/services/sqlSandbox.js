import pkg from 'node-sql-parser'
import { QueryTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

const { Parser } = pkg
const parser = new Parser()
const QUERY_TIMEOUT_MS = 5000

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const FORBIDDEN_KEYWORDS =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|call|merge|replace|exec|execute|load_file)\b/i
const FORBIDDEN_SUBSTRINGS = /into\s+outfile|into\s+dumpfile/i

const TENANT_COLUMNS = new Set(['company_id', 'workspace_id'])

// Tier-A tables only: every entry here (except `users`) carries native
// company_id + workspace_id columns, which is what makes per-alias tenant
// injection tractable without transitive-join ambiguity. Tables lacking a
// direct tenant column (activities, custom_field_values, campaign_leads) are
// deliberately excluded — those questions must go through structured tools.
const ALLOWED_COLUMNS = {
  leads: new Set([
    'id', 'company_id', 'workspace_id', 'owner_user_id', 'assigned_to', 'title', 'contact_name',
    'company', 'designation', 'email', 'phone', 'value', 'value_currency', 'status', 'source',
    'score', 'closing_date', 'is_deleted', 'is_opportunity', 'opportunity_stage',
    'opportunity_status_id', 'street', 'city', 'state', 'country', 'postal_code',
    'created_at', 'updated_at',
  ]),
  deals: new Set([
    'id', 'company_id', 'workspace_id', 'opportunity_lead_id', 'value', 'stage', 'assigned_to',
    'owner_user_id', 'forecast_category', 'is_deleted', 'created_at', 'updated_at',
  ]),
  campaigns: new Set([
    'id', 'company_id', 'workspace_id', 'name', 'lead_target', 'currency', 'end_date', 'status',
    'created_by', 'created_at', 'updated_at',
  ]),
  campaign_payments: new Set([
    'id', 'campaign_id', 'campaign_lead_id', 'lead_id', 'workspace_id', 'company_id', 'amount',
    'currency', 'payment_date', 'mode', 'status', 'created_at', 'updated_at',
  ]),
  custom_fields: new Set([
    'id', 'workspace_id', 'company_id', 'label', 'key', 'type', 'options', 'is_required', 'order',
    'created_at', 'updated_at',
  ]),
  // No direct workspace_id — scoped via a forced user_workspaces membership subquery below.
  // Deliberately excludes email/phone/password/OTP/reset-token columns.
  users: new Set([
    'id', 'name', 'department', 'job_title', 'is_active', 'is_company_admin', 'manager_id',
    'company_role_id', 'company_id',
  ]),
}

const ALLOWED_TABLES = new Set(Object.keys(ALLOWED_COLUMNS))
const MAX_LIMIT = 500
const DEFAULT_LIMIT = 500

export class SqlSandboxError extends Error {}

function assertUuid(value, label) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new SqlSandboxError(`Internal error: ${label} is not a valid UUID`)
  }
}

/** Depth-first walk that mutates nothing; used for table/column allowlist validation. */
function walkValidate(node, aliasToTable, selectAliases, { allowSelect } = {}) {
  if (node == null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((child) => walkValidate(child, aliasToTable, selectAliases, { allowSelect }))
    return
  }
  if (node.type === 'select' && !allowSelect) {
    throw new SqlSandboxError('Subqueries are not allowed in copilot SQL queries')
  }
  if (node.type === 'column_ref') {
    validateColumnRef(node, aliasToTable, selectAliases)
    return
  }
  if (node.type === 'star') {
    throw new SqlSandboxError('SELECT * is not allowed — list explicit columns')
  }
  for (const key of Object.keys(node)) {
    walkValidate(node[key], aliasToTable, selectAliases, { allowSelect })
  }
}

// Unqualified refs to a SELECT-list alias (e.g. `ORDER BY cnt` for `COUNT(id) AS cnt`)
// are safe to allow as-is — they name a computed output column, not a table column,
// so permitting them widens acceptance without widening actual data access.
function validateColumnRef(node, aliasToTable, selectAliases) {
  if (node.column === '*') {
    throw new SqlSandboxError('SELECT * is not allowed — list explicit columns')
  }
  if (!node.table && selectAliases.has(node.column)) {
    return
  }
  let table
  if (node.table) {
    table = aliasToTable.get(node.table)
    if (!table) {
      throw new SqlSandboxError(`Unknown table alias "${node.table}"`)
    }
  } else {
    if (aliasToTable.size !== 1) {
      throw new SqlSandboxError(
        `Column "${node.column}" must be qualified with a table alias (multiple tables in query)`,
      )
    }
    table = [...aliasToTable.values()][0]
  }
  if (!ALLOWED_COLUMNS[table]?.has(node.column)) {
    throw new SqlSandboxError(`Column "${node.column}" is not allowed on table "${table}"`)
  }
}

/** Validates FROM/JOIN table references for one SELECT node; returns alias -> real table map. */
function validateFromClause(fromList) {
  if (!Array.isArray(fromList) || fromList.length === 0) {
    throw new SqlSandboxError('Query must reference at least one table')
  }
  const aliasToTable = new Map()
  for (const item of fromList) {
    if (!item.table) {
      throw new SqlSandboxError('Derived tables / subqueries in FROM are not allowed')
    }
    const table = String(item.table).toLowerCase()
    if (!ALLOWED_TABLES.has(table)) {
      throw new SqlSandboxError(`Table "${item.table}" is not allowed in copilot SQL queries`)
    }
    if (item.join) {
      const joinType = String(item.join).toUpperCase()
      if (joinType !== 'INNER JOIN') {
        throw new SqlSandboxError(
          `Join type "${item.join}" is not allowed — only INNER JOIN or comma-join permitted`,
        )
      }
    }
    aliasToTable.set(item.as || item.table, table)
  }
  return aliasToTable
}

/** Replaces any binary_expr comparing a tenant column (on an allowlisted alias) with a tautology. */
function neutralizeTenantPredicates(node, aliasToTable) {
  if (node == null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((child) => neutralizeTenantPredicates(child, aliasToTable))
    return
  }
  if (node.type === 'binary_expr') {
    if (isTenantColumnSide(node.left, aliasToTable) || isTenantColumnSide(node.right, aliasToTable)) {
      for (const key of Object.keys(node)) delete node[key]
      node.type = 'number'
      node.value = 1
      return
    }
    neutralizeTenantPredicates(node.left, aliasToTable)
    neutralizeTenantPredicates(node.right, aliasToTable)
    return
  }
  for (const key of Object.keys(node)) {
    neutralizeTenantPredicates(node[key], aliasToTable)
  }
}

function isTenantColumnSide(side, aliasToTable) {
  if (!side || side.type !== 'column_ref') return false
  if (!TENANT_COLUMNS.has(side.column)) return false
  if (side.table && !aliasToTable.has(side.table)) return false
  return true
}

function buildTenantPredicateAst(aliasToTable, ctx) {
  const clauses = []
  for (const [alias, table] of aliasToTable.entries()) {
    if (table === 'users') {
      clauses.push({
        type: 'binary_expr',
        operator: 'IN',
        left: { type: 'column_ref', table: alias, column: 'id' },
        right: {
          type: 'expr_list',
          value: [
            {
              type: 'select',
              with: null,
              options: null,
              distinct: null,
              columns: [{ expr: { type: 'column_ref', table: null, column: 'user_id' }, as: null }],
              into: { position: null },
              from: [{ db: null, table: 'user_workspaces', as: null }],
              where: {
                type: 'binary_expr',
                operator: '=',
                left: { type: 'column_ref', table: null, column: 'workspace_id' },
                right: { type: 'single_quote_string', value: ctx.workspaceId },
              },
              groupby: null,
              having: null,
              orderby: null,
              limit: null,
            },
          ],
        },
      })
      clauses.push({
        type: 'binary_expr',
        operator: '=',
        left: { type: 'column_ref', table: alias, column: 'company_id' },
        right: { type: 'single_quote_string', value: ctx.companyId },
      })
    } else {
      clauses.push({
        type: 'binary_expr',
        operator: '=',
        left: { type: 'column_ref', table: alias, column: 'company_id' },
        right: { type: 'single_quote_string', value: ctx.companyId },
      })
      clauses.push({
        type: 'binary_expr',
        operator: '=',
        left: { type: 'column_ref', table: alias, column: 'workspace_id' },
        right: { type: 'single_quote_string', value: ctx.workspaceId },
      })
    }
  }
  return clauses.reduce((acc, clause) => (acc ? { type: 'binary_expr', operator: 'AND', left: acc, right: clause } : clause), null)
}

function capLimit(node) {
  if (!node.limit || !Array.isArray(node.limit.value) || node.limit.value.length === 0) {
    node.limit = { seperator: '', value: [{ type: 'number', value: DEFAULT_LIMIT }] }
    return
  }
  const requested = Number(node.limit.value[0]?.value)
  if (!Number.isFinite(requested) || requested > MAX_LIMIT || requested <= 0) {
    node.limit.value[0].value = MAX_LIMIT
  }
}

/** Processes one SELECT node (validate, neutralize, inject tenant predicate, cap limit). */
function processSelectNode(node, ctx) {
  if (node.type !== 'select') {
    throw new SqlSandboxError('Only SELECT statements are allowed')
  }
  if (node.into && node.into.keyword) {
    throw new SqlSandboxError('INTO OUTFILE/DUMPFILE is not allowed')
  }

  const aliasToTable = validateFromClause(node.from)
  const selectAliases = new Set((node.columns || []).map((c) => c.as).filter(Boolean))

  walkValidate(node.columns, aliasToTable, selectAliases)
  walkValidate(node.where, aliasToTable, selectAliases)
  walkValidate(node.groupby, aliasToTable, selectAliases)
  walkValidate(node.having, aliasToTable, selectAliases)
  walkValidate(node.orderby, aliasToTable, selectAliases)
  for (const item of node.from) {
    if (item.on) walkValidate(item.on, aliasToTable, selectAliases)
  }

  neutralizeTenantPredicates(node.where, aliasToTable)

  const tenantPredicate = buildTenantPredicateAst(aliasToTable, ctx)
  node.where = node.where
    ? { type: 'binary_expr', operator: 'AND', left: node.where, right: tenantPredicate }
    : tenantPredicate

  capLimit(node)
}

/**
 * Validates a model-authored read-only SQL string and rewrites it so every
 * allowlisted table reference is forcibly scoped to ctx.companyId/ctx.workspaceId,
 * discarding whatever tenant predicate (if any) the model itself wrote.
 *
 * ctx: { companyId, workspaceId } — must come from server-side auth/workspace
 * context (req.user.companyId / req.workspaceId), never from user/model input.
 */
export function validateAndScopeSql(sql, ctx) {
  if (typeof sql !== 'string' || !sql.trim()) {
    throw new SqlSandboxError('Empty query')
  }
  assertUuid(ctx?.companyId, 'companyId')
  assertUuid(ctx?.workspaceId, 'workspaceId')

  if (/--|\/\*/.test(sql)) {
    throw new SqlSandboxError('SQL comments are not allowed')
  }
  if (FORBIDDEN_KEYWORDS.test(sql) || FORBIDDEN_SUBSTRINGS.test(sql)) {
    throw new SqlSandboxError('Only read-only SELECT queries are allowed')
  }

  let ast
  try {
    ast = parser.astify(sql, { database: 'MySQL' })
  } catch (err) {
    throw new SqlSandboxError(`Could not parse SQL: ${err.message}`)
  }

  if (Array.isArray(ast)) {
    throw new SqlSandboxError('Multiple statements are not allowed')
  }

  let node = ast
  const chain = []
  while (node) {
    chain.push(node)
    node = node._next || null
  }
  for (const selectNode of chain) {
    processSelectNode(selectNode, ctx)
  }

  const scopedSql = parser.sqlify(ast, { database: 'MySQL' })
  return { sql: scopedSql }
}

/**
 * Validates + scopes then executes the query.
 *
 * NOTE: sequelize/mysql2 do not expose a real server-side query-cancellation
 * timeout through sequelize.query() options, so this is a client-side race —
 * it stops us waiting on a hung query but does not kill it on the MySQL side.
 * Given every allowlisted table is indexed on (workspace_id, ...) and LIMIT is
 * capped at 500, actual execution time should be trivial; this is a safety net,
 * not a substitute for a real statement timeout (flagged as a follow-up).
 */
export async function executeSandboxedSql(sql, ctx) {
  const { sql: scopedSql } = validateAndScopeSql(sql, ctx)
  const queryPromise = sequelize.query(scopedSql, { type: QueryTypes.SELECT, raw: true })
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new SqlSandboxError('Query timed out')), QUERY_TIMEOUT_MS)
  })
  const rows = await Promise.race([queryPromise, timeoutPromise])
  return { sql: scopedSql, rows }
}
