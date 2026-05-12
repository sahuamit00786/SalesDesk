import { chromium } from 'playwright'
import { spawn, execSync } from 'child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Server root (…/SalesDesk/server) */
const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Optional Linux-only stack: virtual framebuffer + PulseAudio null sink so Chromium + ffmpeg share audio.
 */
function setupLinuxVirtualDisplayAndPulse() {
  const display = ':99'
  process.env.DISPLAY = display

  const xvfb = spawn('Xvfb', [display, '-screen', '0', '1280x720x24'])
  try {
    execSync('pulseaudio --start', { stdio: 'pipe' })
  } catch {
    /* may already run */
  }
  try {
    execSync('pactl load-module module-null-sink sink_name=VirtualSink', {
      stdio: 'pipe',
    })
  } catch {
    /* module may exist */
  }
  return { xvfb, display }
}

/**
 * Start ffmpeg to capture meeting audio. Platform-specific input:
 *
 * - Windows (dshow): set MEETING_BOT_WIN_DSHOW to full device string, e.g.
 *   audio="Stereo Mix (Realtek(R) Audio)" — enable Stereo Mix in Sound settings or use VB-Audio Cable.
 * - macOS (avfoundation): set MEETING_BOT_MAC_AVFOUNDATION e.g. ":BlackHole 2ch" (install BlackHole).
 * - Linux (pulse): VirtualSink.monitor after setupLinuxVirtualDisplayAndPulse().
 */
function startFfmpegRecording(audioPath) {
  if (process.env.MEETING_BOT_SKIP_RECORDING === 'true') {
    console.warn('[Meeting bot] MEETING_BOT_SKIP_RECORDING=true — no ffmpeg capture')
    return null
  }

  const plat = process.platform
  let args

  if (plat === 'win32') {
    const input =
      process.env.MEETING_BOT_WIN_DSHOW || 'audio=Stereo Mix'
    args = [
      '-y',
      '-f',
      'dshow',
      '-i',
      input,
      '-ac',
      '1',
      '-ar',
      '16000',
      audioPath,
    ]
  } else if (plat === 'darwin') {
    const input =
      process.env.MEETING_BOT_MAC_AVFOUNDATION || ':BlackHole 2ch'
    args = [
      '-y',
      '-f',
      'avfoundation',
      '-i',
      input,
      '-ac',
      '1',
      '-ar',
      '16000',
      audioPath,
    ]
  } else {
    args = [
      '-y',
      '-f',
      'pulse',
      '-i',
      'VirtualSink.monitor',
      '-ac',
      '1',
      '-ar',
      '16000',
      audioPath,
    ]
  }

  const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
  ffmpeg.stderr?.on('data', (chunk) => {
    if (process.env.MEETING_BOT_FFMPEG_DEBUG === 'true') {
      process.stderr.write(chunk)
    }
  })
  return ffmpeg
}

function killFfmpegGracefully(ffmpeg) {
  if (!ffmpeg || ffmpeg.killed) return
  try {
    if (process.platform === 'win32') {
      ffmpeg.kill()
    } else {
      ffmpeg.kill('SIGINT')
    }
  } catch {
    /* ignore */
  }
}

/**
 * Join Google Meet via Playwright and record audio until scheduled end (capped).
 * Works on Windows / macOS / Linux with different audio backends — see .env.example.
 *
 * `meeting` plain object: id, googleMeetLink, scheduledEnd
 */
export async function runMeetingBot(meeting) {
  const meetUrl = meeting.googleMeetLink?.trim()
  if (!meetUrl) {
    throw new Error('Meeting has no googleMeetLink')
  }

  const audioPath = path.join(
    serverRoot,
    'recordings',
    'meetings',
    `${meeting.id}.wav`,
  )
  fs.mkdirSync(path.dirname(audioPath), { recursive: true })

  let xvfb = null
  let ffmpeg = null

  try {
    if (process.platform === 'linux') {
      const needVirtualDisplay = !process.env.DISPLAY
      if (needVirtualDisplay) {
        const stack = setupLinuxVirtualDisplayAndPulse()
        xvfb = stack.xvfb
        await sleep(800)
      } else {
        try {
          execSync('pulseaudio --start', { stdio: 'pipe' })
        } catch {
          /* */
        }
        try {
          execSync(
            'pactl load-module module-null-sink sink_name=VirtualSink',
            { stdio: 'pipe' },
          )
        } catch {
          /* */
        }
      }
    }

    ffmpeg = startFfmpegRecording(audioPath)
    if (ffmpeg) {
      ffmpeg.on('error', (err) => {
        console.error('[Meeting bot] ffmpeg spawn error:', err.message)
      })
    }

    const headless = process.env.MEETING_BOT_HEADLESS === 'true'
    const channel = process.env.MEETING_BOT_CHROME_CHANNEL || undefined

    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--disable-blink-features=AutomationControlled',
      '--autoplay-policy=no-user-gesture-required',
    ]
    if (process.platform === 'win32') {
      launchArgs.push('--disable-gpu')
    }

    const browser = await chromium.launch({
      channel,
      headless,
      args: launchArgs,
    })

    browser.on('disconnected', () => {
      console.error(
        '[Meeting bot] Browser disconnected before finish — if MEETING_BOT_HEADLESS=false, do not close the window; try removing MEETING_BOT_CHROME_CHANNEL to use bundled Chromium.',
      )
    })

    const context = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 720 },
    })
    const page = await context.newPage()
    page.on('crash', () => {
      console.error('[Meeting bot] Page crashed (Meet tab died)')
    })

    await page.goto(meetUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})

    try {
      await page.click('[aria-label="Turn off microphone"]', { timeout: 5000 })
    } catch {
      /* */
    }
    try {
      await page.click('[aria-label="Turn off camera"]', { timeout: 5000 })
    } catch {
      /* */
    }

    await sleep(3000)

    const joinBtn = page
      .getByRole('button', { name: /join now/i })
      .or(page.getByRole('button', { name: /ask to join/i }))
    try {
      await joinBtn.first().click({ timeout: 60_000 })
    } catch (e) {
      if (page.isClosed()) {
        throw new Error(
          'Meet page closed before Join — browser may have crashed, been closed manually, or Chrome channel failed. Try MEETING_BOT_HEADLESS=true, unset MEETING_BOT_CHROME_CHANNEL, or watch the headed window.',
        )
      }
      try {
        await page.click('button:has-text("Join now")', { timeout: 15_000 })
      } catch {
        await page.click('button:has-text("Ask to join")', { timeout: 15_000 })
      }
    }

    console.log(`[Meeting bot] Joined (${process.platform})`)

    if (process.env.MEETING_BOT_SKIP_RECORDING === 'true') {
      await browser.close()
      throw new Error(
        'MEETING_BOT_SKIP_RECORDING=true — join succeeded but no FFmpeg capture. Set MEETING_BOT_SKIP_RECORDING=false and configure MEETING_BOT_WIN_DSHOW (Windows) for a real recording.',
      )
    }

    const endMs = new Date(meeting.scheduledEnd).getTime()
    const waitMs = Math.min(
      Math.max(endMs - Date.now(), 15_000),
      4 * 60 * 60 * 1000,
    )

    await sleep(waitMs)

    killFfmpegGracefully(ffmpeg)
    ffmpeg = null

    await browser.close()
  } finally {
    killFfmpegGracefully(ffmpeg)
    try {
      xvfb?.kill()
    } catch {
      /* */
    }
  }

  if (!fs.existsSync(audioPath) || fs.statSync(audioPath).size < 64) {
    throw new Error(
      'Recording file missing or empty. Configure audio capture for your OS (see MEETING_BOT_* in .env.example).',
    )
  }

  return audioPath
}
