/**
 * Static scan for patterns that often cause runtime explosions or isolation bugs.
 * No Playwright — reads source only.
 *
 * Usage: node scripts/qa/staticCodeAudit.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SERVER_SRC = path.join(__dirname, '../../src')
const ROUTES_FILE = path.join(SERVER_SRC, 'routes/v1/index.js')

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory() && ent.name !== 'node_modules') walk(p, acc)
    else if (ent.isFile() && ent.name.endsWith('.js')) acc.push(p)
  }
  return acc
}

function rel(p) {
  return path.relative(path.join(__dirname, '../..'), p).replace(/\\/g, '/')
}

const files = walk(SERVER_SRC)
const findings = []

function add(severity, category, file, detail) {
  findings.push({ severity, category, file: rel(file), detail })
}

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split('\n')

  lines.forEach((line, i) => {
    if (/\.catch\(\(\)\s*=>\s*\{\s*\}\)/.test(line) || /\.catch\(\(\)\s*=>\s*\{\}\)/.test(line)) {
      add('warn', 'silent-catch', file, `L${i + 1}: errors swallowed`)
    }
    if (/throw new Error\(/.test(line) && !/err\.status|error\.status|\.status\s*=/.test(line)) {
      if (!file.includes('middleware') && !line.includes('//')) {
        add('info', 'untyped-error', file, `L${i + 1}: throw new Error may become 500`)
      }
    }
  })

  if (file.includes('controllers') && /Lead\.findAll\(\{/.test(text)) {
    if (!/companyId|leadAccessWhere|buildLeadListAccessWhere|leadPipelineBaseWhere/.test(text)) {
      add('high', 'lead-scope', file, 'Lead.findAll without obvious company/workspace scope')
    }
  }

  if (file.includes('controllers') && /Deal\.findOne\(\{/.test(text)) {
    if (!/workspaceId|leadAccessWhere/.test(text)) {
      add('medium', 'deal-scope', file, 'Deal.findOne may lack workspace scope')
    }
  }
}

if (fs.existsSync(ROUTES_FILE)) {
  const routes = fs.readFileSync(ROUTES_FILE, 'utf8')
  const routeLines = routes.split('\n').filter((l) => /router\.(get|post|patch|put|delete)/.test(l))
  for (const line of routeLines) {
    if (/requireAuth/.test(line) && !/requireCompany/.test(line) && !/\/auth\//.test(line) && !/workspaces/.test(line)) {
      add('medium', 'route-tenancy', ROUTES_FILE, `Auth without requireCompany: ${line.trim().slice(0, 100)}`)
    }
  }
}

const openAiConstruct = files.filter((f) => {
  const t = fs.readFileSync(f, 'utf8')
  return /new OpenAI\(/.test(t) && !/process\.env\.OPENAI_API_KEY\s*\?/.test(t)
})
for (const f of openAiConstruct) {
  add('high', 'boot-crash', f, 'OpenAI client at module load — server crashes if OPENAI_API_KEY missing')
}

// eslint-disable-next-line no-console
console.log('Connexify static code audit\n')

const order = { high: 0, medium: 1, warn: 2, info: 3 }
findings.sort((a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file))

const bySeverity = { high: 0, medium: 0, warn: 0, info: 0 }
for (const f of findings) {
  bySeverity[f.severity] += 1
  const tag = f.severity.toUpperCase().padEnd(6)
  // eslint-disable-next-line no-console
  console.log(`[${tag}] ${f.category} — ${f.file}\n         ${f.detail}`)
}

// eslint-disable-next-line no-console
console.log('\n────────────────────────────────────')
// eslint-disable-next-line no-console
console.log(
  `Summary: ${findings.length} findings (${bySeverity.high} high, ${bySeverity.medium} medium, ${bySeverity.warn} warn, ${bySeverity.info} info)`,
)

if (bySeverity.high > 0) process.exit(1)
