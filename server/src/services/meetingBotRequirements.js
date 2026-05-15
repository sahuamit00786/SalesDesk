/**
 * Setup hints for the machine that runs the Node API (not the browser).
 * `clientOs` is the organizer's desktop OS for tailored FFmpeg install notes.
 */
export function buildMeetingBotRequirements(clientOs, serverPlatform) {
  const os = normalizeClientOs(clientOs)
  const server = serverPlatform || process.platform

  return {
    serverRunsBotOn: server,
    organizerDeviceOs: os,
    masterEnvEnable:
      'Set ENABLE_MEETING_BOT=true on the server and restart the API so the bot can start during the meeting window.',
    masterEnvDisable:
      'When the meeting ends, the bot stops automatically; set ENABLE_MEETING_BOT=false only if you want to disable the feature for all meetings.',
    groqEnv: 'GROQ_API_KEY is required for transcription and AI summary after recording.',
    stepsByOs: {
      windows: [
        'Install FFmpeg and add it to PATH (https://ffmpeg.org). Verify: ffmpeg -version',
        'Browser: install Chromium or Chrome, set MEETING_BOT_BROWSER_EXECUTABLE to chrome.exe (Windows), or run: cd server && npx playwright install chromium',
        'List DirectShow devices: ffmpeg -hide_banner -f dshow -list_devices true -i dummy (harmless "dummy" error after the list is normal)',
        'Enable Stereo Mix in Windows Sound settings or install VB-Audio Virtual Cable, then set MEETING_BOT_WIN_DSHOW in server .env to your device string.',
        'Optional: MEETING_BOT_HEADLESS=false so Chromium can join Meet reliably on first try.',
      ],
      darwin: [
        'Install FFmpeg (brew install ffmpeg) and Playwright (cd server && npx playwright install chromium).',
        'Install BlackHole (or similar) to route Meet audio; set MEETING_BOT_MAC_AVFOUNDATION=:BlackHole 2ch (or your device) in server .env.',
      ],
      linux: [
        'Install ffmpeg, Xvfb, PulseAudio; cd server && npx playwright install chromium && npx playwright install-deps (as needed).',
        'Headless servers use Pulse null sink + VirtualSink (see meetingBot.js).',
      ],
    },
    note:
      'The recording bot runs on the server process, not inside each user\'s browser. Organizers only approve consent in the app; IT installs FFmpeg/Playwright once per deployment.',
  }
}

function normalizeClientOs(raw) {
  if (!raw || typeof raw !== 'string') return 'unknown'
  const s = raw.toLowerCase()
  if (s.includes('win')) return 'windows'
  if (s.includes('mac') || s.includes('darwin')) return 'darwin'
  if (s.includes('linux')) return 'linux'
  return 'unknown'
}
