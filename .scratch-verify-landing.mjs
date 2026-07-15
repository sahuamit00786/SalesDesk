import { chromium } from 'playwright'

const BASE = 'http://localhost:5174'
const PAGES = ['/', '/about', '/contact', '/privacy']

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

let allErrors = {}

for (const path of PAGES) {
  const errors = []
  const handler = (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  }
  page.on('console', handler)
  const pageErrHandler = (err) => errors.push('pageerror: ' + err.message)
  page.on('pageerror', pageErrHandler)

  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(800)

  const shot = path === '/' ? 'home' : path.slice(1)
  await page.screenshot({ path: `.scratch-${shot}.png`, fullPage: true })

  allErrors[path] = errors
  page.off('console', handler)
  page.off('pageerror', pageErrHandler)
}

console.log(JSON.stringify(allErrors, null, 2))
await browser.close()
