import puppeteer from 'puppeteer'

let browserPromise = null

function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }
  return browserPromise
}

/**
 * Renders an authenticated SPA route to a PDF buffer via headless Chromium.
 * Chromium's own PDF writer is used directly (page.pdf()) — this never goes through
 * the OS print spooler/driver, so it can't hit the color-profile shift that
 * "Microsoft Print to PDF" (window.print()) applies to saturated hues.
 *
 * Auth is bootstrapped by seeding the SPA's own localStorage/sessionStorage keys
 * before its scripts run, mirroring a real login (see authSlice/workspaceSlice).
 */
export async function renderAuthenticatedPageToPdf({ url, accessToken, workspaceId, readySelector }) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.evaluateOnNewDocument(
      (token, wsId) => {
        localStorage.setItem('leadflow.auth', JSON.stringify({ accessToken: token, refreshToken: null, user: null }))
        if (wsId) localStorage.setItem('leadflow.workspaceId', wsId)
        sessionStorage.setItem('leadflow.workspaceConfirmed', '1')
      },
      accessToken,
      workspaceId || '',
    )
    await page.setViewport({ width: 1240, height: 1754 })
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
    if (readySelector) {
      await page.waitForSelector(readySelector, { timeout: 20000 })
    }
    await page.emulateMediaType('print')
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' },
    })
    return pdf
  } finally {
    await page.close()
  }
}

export async function closePdfBrowser() {
  if (!browserPromise) return
  const browser = await browserPromise
  browserPromise = null
  await browser.close()
}
