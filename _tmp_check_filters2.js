const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleMsgs = [];
  page.on('console', (msg) => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => consoleMsgs.push(`[pageerror] ${err.message}`));

  await page.goto('http://localhost:5173/calls', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const btn = page.locator('button:has-text("Filters")');
  console.log('Filters button count:', await btn.count());

  await btn.click();
  await page.waitForTimeout(500);

  // Check if the dropdown panel appeared in DOM
  const panel = page.locator('text=Date range');
  console.log('Panel "Date range" visible count:', await panel.count());

  const html = await page.locator('body').innerHTML();
  const hasDateRangeText = html.includes('Date range');
  console.log('HTML contains "Date range":', hasDateRangeText);

  await page.screenshot({ path: 'C:\\Users\\sahua\\AppData\\Local\\Temp\\claude\\d--Connexify\\e3594e7f-6bd4-4f84-a73d-a3443f529508\\scratchpad\\filters_click.png' });

  console.log('--- Console messages ---');
  consoleMsgs.forEach((m) => console.log(m));

  await browser.close();
})();
