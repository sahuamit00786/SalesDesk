/**
 * Phase 6 — permission snapshot test. Guards against the web menu permission map
 * and the mobile ROUTE_PERMISSIONS map drifting apart (which is how a role ends
 * up seeing a screen on one platform but not the other).
 *
 *   node scripts/qa/permissionSnapshot.js            # print current matrix
 *   node scripts/qa/permissionSnapshot.js --check     # fail if it changed vs snapshot
 *
 * How it works: it reads the mobile ROUTE_PERMISSIONS (screen → web menu route)
 * and asserts every referenced web route exists in the web navConfig menu map.
 * A missing route means a mobile screen is gated on a permission the web doesn't
 * define — the drift we want to catch. Run in CI on both repos' shared contract.
 *
 * Paths assume a monorepo-ish layout; adjust the two require paths to where your
 * client + mobile live relative to the server, or copy this into a repo that can
 * see both.
 */
import fs from 'node:fs'
import path from 'node:path'

// --- adjust these to your layout ---
const MOBILE_ROUTES_FILE = process.env.MOBILE_ROUTES || '../ConnexifyNative/src/navigation/routes.js'
const WEB_NAVCONFIG_FILE = process.env.WEB_NAVCONFIG || '../client/src/components/layout/navConfig.js'
const SNAPSHOT_FILE = path.join(process.cwd(), 'scripts/qa/.permission-snapshot.json')

function readFileSafe(p) {
  try {
    return fs.readFileSync(path.resolve(process.cwd(), p), 'utf8')
  } catch {
    return ''
  }
}

/** Extract the string route values from a `ROUTE_PERMISSIONS = { ... }` block. */
function extractMobilePermissionRoutes(src) {
  const routes = new Set()
  // matches: [ROUTES.X]: '/something',  OR  [ROUTES.X]: null,
  const re = /\[ROUTES\.[A-Z_]+\]:\s*(null|'([^']*)'|"([^"]*)")/g
  let m
  while ((m = re.exec(src))) {
    const val = m[2] ?? m[3] ?? (m[1] === 'null' ? null : null)
    if (val) routes.add(val)
  }
  return routes
}

/** Extract the web menu route keys from navConfig (top-level '/x' string keys). */
function extractWebRoutes(src) {
  const routes = new Set()
  const re = /'(\/[a-z0-9\-/:]+)'\s*:/gi
  let m
  while ((m = re.exec(src))) routes.add(m[1])
  return routes
}

function main() {
  const mobileSrc = readFileSafe(MOBILE_ROUTES_FILE)
  const webSrc = readFileSafe(WEB_NAVCONFIG_FILE)

  if (!mobileSrc || !webSrc) {
    console.warn('permissionSnapshot: could not read one of the source files — set MOBILE_ROUTES / WEB_NAVCONFIG env vars to their paths.')
    console.warn(`  mobile: ${MOBILE_ROUTES_FILE} (${mobileSrc ? 'ok' : 'missing'})`)
    console.warn(`  web:    ${WEB_NAVCONFIG_FILE} (${webSrc ? 'ok' : 'missing'})`)
    process.exit(process.argv.includes('--check') ? 1 : 0)
  }

  const mobileRoutes = [...extractMobilePermissionRoutes(mobileSrc)].sort()
  const webRoutes = extractWebRoutes(webSrc)

  const orphans = mobileRoutes.filter((r) => !webRoutes.has(r))

  const matrix = { mobileGatedRoutes: mobileRoutes, orphans }

  if (process.argv.includes('--check')) {
    let prev = null
    try {
      prev = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'))
    } catch {
      /* no snapshot yet */
    }
    if (orphans.length) {
      console.error('✗ Mobile screens gated on web routes that do not exist in navConfig:')
      for (const o of orphans) console.error(`    ${o}`)
      console.error('  → a mobile screen references a permission the web menu does not define. Fix the drift.')
      process.exit(1)
    }
    if (prev && JSON.stringify(prev.mobileGatedRoutes) !== JSON.stringify(matrix.mobileGatedRoutes)) {
      console.error('✗ Permission matrix changed vs snapshot. Review, then update the snapshot:')
      console.error('    node scripts/qa/permissionSnapshot.js > /dev/null && (re-run without --check to rewrite)')
      process.exit(1)
    }
    console.log('✓ Permission matrix matches snapshot; no web/mobile drift.')
    return
  }

  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(matrix, null, 2))
  console.log('Permission matrix written to', SNAPSHOT_FILE)
  console.log(`  ${mobileRoutes.length} mobile-gated routes; ${orphans.length} orphan(s).`)
  if (orphans.length) {
    console.log('  Orphans (mobile gates without a web menu route):')
    for (const o of orphans) console.log(`    ${o}`)
  }
}

main()
