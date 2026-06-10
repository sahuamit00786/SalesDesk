/**
 * Setup hints for the machine that runs the Node API (not the browser).
 * `clientOs` is the organizer's desktop OS for tailored browser install notes.
 */
export function buildMeetingBotRequirements(clientOs, serverPlatform) {
  const os = normalizeClientOs(clientOs)
  const server = serverPlatform || process.platform

  return {
    serverRunsBotOn: server,
    organizerDeviceOs: os,
    masterEnvEnable:
      'Set ENABLE_MEETING_BOT=true on the server and restart the API so the bot can join during the meeting window.',
    masterEnvDisable:
      'Set ENABLE_MEETING_BOT=false to disable the bot for all meetings.',
    openaiEnv:
      'OPENAI_API_KEY is required for AI summary (gpt-4o-mini) after the meeting ends.',
    stepsByOs: {
      windows: [
        'Install Playwright Chromium: cd server && npx playwright install chromium',
        'Optional: install Google Chrome and set MEETING_BOT_BROWSER_EXECUTABLE to chrome.exe for better Meet compatibility.',
        'Ensure the Google Workspace account used has Live Captions enabled (Meet → Settings → Captions).',
        'Optional: MEETING_BOT_HEADLESS=false to watch the bot join in a visible window for debugging.',
      ],
      darwin: [
        'Install Playwright Chromium: cd server && npx playwright install chromium',
        'Optional: set MEETING_BOT_BROWSER_EXECUTABLE to Google Chrome path for better Meet compatibility.',
        'Ensure the Google Workspace account has Live Captions enabled.',
      ],
      linux: [
        'Install Playwright Chromium: cd server && npx playwright install chromium && npx playwright install-deps',
        'Headless Chromium works on Linux without Xvfb when using MEETING_BOT_HEADLESS=true (default).',
        'Ensure the Google Workspace account has Live Captions enabled.',
      ],
    },
    note:
      'The bot runs on the server, joins the Google Meet link, enables live captions, and scrapes the transcript from the DOM. ' +
      'No audio recording or FFmpeg required. Google Workspace with Live Captions is needed for transcription.',
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
