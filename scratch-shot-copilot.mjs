import { chromium } from 'playwright'

const BASE = 'http://localhost:5174'
const AUTH = process.argv[2]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(BASE)
await page.evaluate((auth) => {
  localStorage.setItem('leadflow.auth', auth)
}, AUTH)

await page.goto(`${BASE}/copilot`)
await page.waitForTimeout(2500)
await page.screenshot({ path: 'C:/Users/sahua/AppData/Local/Temp/claude/d--Connexify/9dc7c29c-980f-47d6-b0d1-c68ff81fe436/scratchpad/copilot-1.png', fullPage: false })

const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})

try {
  const newChatBtn = page.getByRole('button', { name: /new chat/i }).first()
  if (await newChatBtn.isVisible({ timeout: 3000 })) {
    await newChatBtn.click()
    await page.waitForTimeout(1000)
  }
} catch (e) {
  console.log('new chat click skipped:', e.message)
}

await page.screenshot({ path: 'C:/Users/sahua/AppData/Local/Temp/claude/d--Connexify/9dc7c29c-980f-47d6-b0d1-c68ff81fe436/scratchpad/copilot-2-newchat.png', fullPage: false })

try {
  const textarea = page.locator('textarea')
  await textarea.fill('Show active campaigns')
  await textarea.press('Enter')
  await page.waitForTimeout(3000)
} catch (e) {
  console.log('send message skipped:', e.message)
}

await page.screenshot({ path: 'C:/Users/sahua/AppData/Local/Temp/claude/d--Connexify/9dc7c29c-980f-47d6-b0d1-c68ff81fe436/scratchpad/copilot-3-conversation.png', fullPage: false })

console.log('CONSOLE_ERRORS:', JSON.stringify(errors))

await browser.close()
