import { chromium } from 'playwright'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Google Meet caption container selectors — Meet updates its DOM periodically.
 * Tried in order; first non-empty result wins.
 */
const CAPTION_SELECTORS = [
  '.a4cQT',
  '[jsname="tgaKEf"]',
  '.CNusmb',
  '[jsname="dsyhDe"]',
  '[data-caption-text]',
]

/**
 * Buttons / keyboard shortcut to enable live captions inside Meet.
 */
const CC_BUTTON_SELECTORS = [
  '[aria-label="Turn on captions"]',
  '[aria-label="Captions (c)"]',
  '[data-tooltip="Turn on captions"]',
  '[jsname="r8qRAd"]',
]

async function getCurrentCaption(page) {
  return page
    .evaluate((selectors) => {
      for (const sel of selectors) {
        const text = document.querySelector(sel)?.innerText?.trim()
        if (text) return text
      }
      return ''
    }, CAPTION_SELECTORS)
    .catch(() => '')
}

async function enableCaptions(page) {
  for (const sel of CC_BUTTON_SELECTORS) {
    try {
      const btn = page.locator(sel).first()
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click()
        console.log('[Meeting bot] Captions enabled via button')
        return true
      }
    } catch {
      /* try next selector */
    }
  }
  // Fallback: keyboard shortcut 'c' toggles captions in Meet
  try {
    await page.keyboard.press('c')
    console.log('[Meeting bot] Captions toggled via keyboard shortcut')
    return true
  } catch {
    console.warn('[Meeting bot] Could not enable captions — transcript may be empty')
    return false
  }
}

/**
 * Accumulates caption lines with a "commit on change" strategy:
 * - While caption text grows → keep updating current buffer
 * - When text shrinks significantly or clears → the previous buffer is final
 */
function makeCaptionAccumulator() {
  const committed = []
  let building = ''

  function push(newText) {
    if (!newText) {
      if (building.trim()) {
        committed.push(building.trim())
        building = ''
      }
      return
    }
    // Significantly shorter → new caption started; commit the old one
    if (building && newText.length < building.length * 0.6) {
      committed.push(building.trim())
      building = newText
    } else {
      building = newText
    }
  }

  function flush() {
    if (building.trim()) {
      committed.push(building.trim())
      building = ''
    }
  }

  function transcript() {
    return committed.join('\n')
  }

  return { push, flush, transcript }
}

/**
 * Join a Google Meet, scrape live captions until scheduled end, return full transcript.
 * No FFmpeg, no audio file — uses Meet's built-in caption DOM.
 *
 * Requires Google Workspace account with Live Captions enabled.
 * `meeting` plain object: { id, googleMeetLink, scheduledEnd, title }
 */
export async function runMeetingBot(meeting) {
  const meetUrl = meeting.googleMeetLink?.trim()
  if (!meetUrl) throw new Error('Meeting has no googleMeetLink')

  const headless = process.env.MEETING_BOT_HEADLESS !== 'false'
  const browserExecutable = process.env.MEETING_BOT_BROWSER_EXECUTABLE?.trim() || undefined
  const channel = process.env.MEETING_BOT_CHROME_CHANNEL?.trim() || undefined

  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-fake-ui-for-media-stream',
    '--disable-blink-features=AutomationControlled',
    '--autoplay-policy=no-user-gesture-required',
  ]

  const launchOpts = { headless, args: launchArgs }
  if (browserExecutable) launchOpts.executablePath = browserExecutable
  else if (channel) launchOpts.channel = channel

  const browser = await chromium.launch(launchOpts)

  browser.on('disconnected', () => {
    console.error('[Meeting bot] Browser disconnected unexpectedly')
  })

  const accumulator = makeCaptionAccumulator()
  let captionTimer = null

  try {
    const context = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 720 },
    })
    const page = await context.newPage()

    page.on('crash', () => console.error('[Meeting bot] Page crashed'))

    await page.goto(meetUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})

    // Disable mic and camera
    for (const label of ['Turn off microphone', 'Turn off camera']) {
      await page.click(`[aria-label="${label}"]`, { timeout: 5000 }).catch(() => {})
    }

    await sleep(3000)

    // Click Join
    const joinBtn = page
      .getByRole('button', { name: /join now/i })
      .or(page.getByRole('button', { name: /ask to join/i }))
    try {
      await joinBtn.first().click({ timeout: 60_000 })
    } catch {
      try {
        await page.click('button:has-text("Join now")', { timeout: 15_000 })
      } catch {
        await page.click('button:has-text("Ask to join")', { timeout: 15_000 })
      }
    }

    console.log('[Meeting bot] Joined meeting')
    await sleep(3000)

    // Enable live captions
    await enableCaptions(page)
    await sleep(2000)

    // Poll captions every 2 seconds until meeting end
    const endMs = new Date(meeting.scheduledEnd).getTime()
    const waitMs = Math.min(Math.max(endMs - Date.now(), 15_000), 4 * 60 * 60 * 1000)

    captionTimer = setInterval(async () => {
      const text = await getCurrentCaption(page)
      accumulator.push(text)
    }, 2000)

    await sleep(waitMs)

    clearInterval(captionTimer)
    captionTimer = null

    // Flush any in-progress caption
    accumulator.flush()

    await browser.close()
  } catch (err) {
    if (captionTimer) clearInterval(captionTimer)
    accumulator.flush()
    await browser.close().catch(() => {})
    throw err
  }

  const transcript = accumulator.transcript()

  if (!transcript.trim()) {
    console.warn(
      '[Meeting bot] No captions captured. Ensure Google Workspace Live Captions are enabled ' +
      'and the CC button is accessible in the meeting.',
    )
  }

  console.log(`[Meeting bot] Transcript captured: ${transcript.split('\n').length} lines`)
  return transcript
}
