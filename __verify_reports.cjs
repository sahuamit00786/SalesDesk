const { chromium } = require('playwright');

const SHOT_DIR = 'C:/Users/sahua/AppData/Local/Temp/claude/c--Users-sahua-Downloads-Connexify/0e9b773a-cca7-462c-9af7-76b780cd3a03/scratchpad';
const base = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
  const failedResponses = [];
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('mailbox-badge')) failedResponses.push(res.status() + ' ' + res.url());
  });

  await page.goto(base + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="Enter your work email"]', 'sahuamit00786@gmail.com');
  await page.fill('input[placeholder="Enter your password"]', '@Mitsahu1509');
  await page.click('button:has-text("Continue")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  await page.goto(base + '/reports', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: SHOT_DIR + '/10_landing.png', fullPage: true });

  await page.goto(base + '/reports/leads', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SHOT_DIR + '/11_leads_top.png' });
  await page.evaluate(() => {
    const main = document.getElementById('main-content');
    if (main) main.scrollTo(0, main.scrollHeight);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT_DIR + '/12_leads_bottom.png' });

  await browser.close();
  console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors, null, 2));
  console.log('FAILED RESPONSES:', JSON.stringify([...new Set(failedResponses)], null, 2));
})().catch((e) => { console.error('SCRIPT FAILED:', e); process.exit(1); });
