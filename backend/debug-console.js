const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const logs = [];

  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    errors.push(err.message);
  });

  page.on('requestfailed', request => {
    errors.push(`Request failed: ${request.url()}`);
  });

  console.log('=== Navigating to http://localhost:5173/ ===');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });

  await page.waitForTimeout(3000);

  console.log('\n=== Console Logs: ===');
  logs.forEach(log => console.log(log));

  console.log('\n=== Errors: ===');
  if (errors.length === 0) {
    console.log('No JavaScript errors');
  } else {
    errors.forEach(err => console.log('ERROR:', err));
  }

  await page.screenshot({ path: 'debug-full.png', fullPage: true });
  console.log('\nScreenshot saved to debug-full.png');

  await browser.close();
})();
