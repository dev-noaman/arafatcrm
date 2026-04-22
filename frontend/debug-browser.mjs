import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    console.log(`[PAGE CONSOLE ${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  page.on('requestfailed', request => {
    console.log(`[REQUEST FAILED] ${request.url()}`);
  });

  console.log('=== Opening http://localhost:5173/ ===');
  await page.goto('http://localhost:5173/', {
    waitUntil: 'networkidle',
    timeout: 15000
  });

  console.log('Page loaded. Inspect the browser window manually.');
  console.log('Press Ctrl+C to close the browser and exit.');

  // Keep script running
  await new Promise(() => {});
})();
