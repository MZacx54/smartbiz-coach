/**
 * Phase 4 Automated E2E, Offline PWA & Mobile QA Suite (375x812 viewport)
 * Runs real Edge/Chromium against live Django SQLite backend + Vite production bundle + Service Worker.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const FRONTEND_URL = process.env.E2E_FRONTEND_URL || 'http://127.0.0.1:5179';
const API_URL = process.env.E2E_API_URL || 'http://127.0.0.1:8009';
const EDGE_PATH = process.env.E2E_BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SHOT_DIR = process.env.E2E_SHOT_DIR || path.resolve('tests/e2e_screenshots');

fs.mkdirSync(SHOT_DIR, { recursive: true });

function attachErrorGuards(page, bucket) {
  page.on('pageerror', (err) => {
    bucket.pageErrors.push(`${page.url()}: ${err.message}`);
  });
  page.on('requestfailed', (req) => {
    const errText = req.failure()?.errorText || 'unknown';
    console.log(`[E2E REQ_FAILED] ${req.url()} -> ${errText}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Ignore expected network-offline errors triggered intentionally during offline test window
      if (!bucket.ignoreNetworkErrors || (!txt.includes('ERR_FAILED') && !txt.includes('ERR_INTERNET_DISCONNECTED') && !txt.includes('Network Error') && !txt.includes('Failed to fetch'))) {
        bucket.consoleErrors.push(`${page.url()}: ${txt}`);
      }
    }
  });
  page.on('response', (res) => {
    if (res.url().startsWith(FRONTEND_URL) && res.status() >= 404) {
      bucket.httpFailures.push(`${res.status()} ${res.url()}`);
    }
  });
}

async function run() {
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const results = [];
  const logResult = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`[E2E] ${ok ? 'PASS' : 'FAIL'} | ${name} | ${detail}`);
  };

  try {
    // ─── TEST 1: Public Storefront, Order Tracking & All Navigation / Legal Links (No Auth, 375x812) ───
    {
      const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
      const page = await context.newPage();
      const errs = { pageErrors: [], consoleErrors: [], httpFailures: [], ignoreNetworkErrors: false };
      attachErrorGuards(page, errs);

      const publicRoutes = [
        { path: '/', expectText: 'SmartBiz Coach' },
        { path: '/pricing', expectText: 'Start Free Forever' },
        { path: '/about', expectText: 'About SmartBiz Coach' },
        { path: '/contact', expectText: 'Get in Touch' },
        { path: '/help', expectText: 'Help Center' },
        { path: '/privacy', expectText: 'NDPA 2023' },
        { path: '/terms', expectText: 'Terms' },
        { path: '/refund-policy', expectText: 'Refund' },
        { path: '/u/e2e-store', expectText: 'Gold Shea Butter 250g' },
        { path: '/track/SB-E2E1234', expectText: 'SB-E2E1234' },
        { path: '/login', expectText: 'Sign In' },
        { path: '/register', expectText: 'Create Account' },
        { path: '/signup', expectText: 'Create Account' },
      ];

      for (const r of publicRoutes) {
        const res = await page.goto(`${FRONTEND_URL}${r.path}`, { waitUntil: 'networkidle', timeout: 30000 });
        assert.ok(res && res.status() === 200, `${r.path} returned HTTP ${res?.status()}`);
        await page.waitForSelector(`text=${r.expectText}`, { timeout: 15000 });
        const bodyText = await page.locator('body').innerText();
        assert.ok(!/404\s+not found|something went wrong/i.test(bodyText), `Error state rendered on ${r.path}`);
      }

      // Check footer links on Landing Page for broken hrefs
      await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' });
      const hrefs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('footer a[href^="/"], nav a[href^="/"]')).map((a) => a.getAttribute('href'))
      );
      const uniquePaths = [...new Set(hrefs.filter(Boolean))];
      for (const p of uniquePaths) {
        const resp = await page.request.get(`${FRONTEND_URL}${p}`);
        assert.equal(resp.status(), 200, `Footer/nav link ${p} returned ${resp.status()}`);
      }

      assert.equal(errs.pageErrors.length, 0, `Uncaught pageErrors: ${errs.pageErrors.join(' | ')}`);
      assert.equal(errs.consoleErrors.length, 0, `Console errors: ${errs.consoleErrors.join(' | ')}`);
      assert.equal(errs.httpFailures.length, 0, `HTTP >=404 failures: ${errs.httpFailures.join(' | ')}`);
      logResult('Public Routes, Storefront (/u/e2e-store), Order Tracking (/track/SB-E2E1234) & Nav/Footer Links', true, `${publicRoutes.length} routes + ${uniquePaths.length} links HTTP 200, 0 console/page errors`);
      await context.close();
    }

    // ─── TEST 2 & 3 & 4: Signup -> Onboarding -> First Sale -> Offline 3 Sales (IndexedDB + Reload) -> Online Sync (Zero Dupes) -> Debt Ledger WhatsApp ───
    {
      const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
      const page = await context.newPage();
      const errs = { pageErrors: [], consoleErrors: [], httpFailures: [], ignoreNetworkErrors: false };
      attachErrorGuards(page, errs);

      const uniqueEmail = `e2e.merchant.${Date.now()}@shop.ng`;
      const password = 'StrongE2EPassword123!';

      // 2a. Signup via UI
      await page.goto(`${FRONTEND_URL}/register`, { waitUntil: 'networkidle', timeout: 30000 });
      const cookieAccept = page.getByRole('button', { name: 'Accept All' });
      if (await cookieAccept.isVisible().catch(() => false)) {
        await cookieAccept.click();
      }
      await page.getByPlaceholder('e.g. Chinedu Obi').fill('Amina Yusuf');
      await page.getByPlaceholder('e.g. Lagos Ventures').fill('Yusuf Provisions');
      await page.getByPlaceholder('080... or +234...').fill('08031234567');
      await page.getByPlaceholder('name@company.com').fill(uniqueEmail);
      const pwdInputs = page.getByPlaceholder('••••••••');
      await pwdInputs.nth(0).fill(password);
      await pwdInputs.nth(1).fill(password);
      await page.locator('#ndpr_consent').check();
      await page.getByRole('button', { name: 'Create Account' }).click();

      // 2b. Onboarding Wizard
      await page.waitForSelector('text=Welcome', { timeout: 20000 });
      await page.getByRole('button', { name: /Express Onboarding/i }).click();

      // Wait for dashboard shell & navigate directly to Cashbook
      await page.waitForFunction(() => Boolean(localStorage.getItem('sb_auth_token')), { timeout: 15000 });

      // Wait for Service Worker registration so offline reload works cleanly
      await page.goto(`${FRONTEND_URL}/dashboard/cashbook`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('text=Daily Day-Book & Cash Register', { timeout: 20000 });
      await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          try { await navigator.serviceWorker.ready; } catch {}
        }
      });

      // 2c. Record First Sale (online) & verify DB persistence after reload
      await page.getByRole('button', { name: /Record Sale \/ Service/i }).click();
      await page.getByPlaceholder('e.g. Ankara Fabric 6 Yards or Haircut').fill('Peak Milk Tin');
      await page.getByPlaceholder('0.00').first().fill('1500');
      await page.getByRole('button', { name: /Save Sale Record & Sync/i }).click();
      await page.waitForSelector('text=Peak Milk Tin', { timeout: 15000 });

      // Verify persistence in Django backend directly
      const token = await page.evaluate(() => localStorage.getItem('sb_auth_token'));
      const firstSalesResp = await page.request.get(`${API_URL}/api/marketplace/daily-sales/`, {
        headers: { Authorization: `Token ${token}` },
      });
      assert.equal(firstSalesResp.status(), 200);
      const firstSalesJson = await firstSalesResp.json();
      const firstRows = Array.isArray(firstSalesJson) ? firstSalesJson : (firstSalesJson.results || []);
      assert.ok(firstRows.some((s) => s.item_name === 'Peak Milk Tin'), 'First sale did not persist in backend DB');

      await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('text=Peak Milk Tin', { timeout: 15000 });
      logResult('Signup -> Onboarding -> First Sale -> DB Persistence', true, `User ${uniqueEmail} created, onboarded, Peak Milk Tin persisted across reload`);

      // 3. Offline POS Resilience Test (Cash, Transfer, Credit -> Reload -> IndexedDB survival -> Online Sync ZERO duplicates)
      errs.ignoreNetworkErrors = true;
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event('offline')));

      // Offline Sale 1: CASH
      await page.getByRole('button', { name: /Record Sale \/ Service/i }).click();
      await page.getByPlaceholder('e.g. Ankara Fabric 6 Yards or Haircut').fill('Offline Cash Sugar');
      await page.getByPlaceholder('0.00').first().fill('2000');
      await page.getByRole('button', { name: /Cash in Till/i }).click();
      await page.getByRole('button', { name: /Save Sale Record & Sync/i }).click();
      await page.waitForSelector('text=Offline Cash Sugar', { timeout: 10000 });

      // Offline Sale 2: TRANSFER
      await page.getByRole('button', { name: /Record Sale \/ Service/i }).click();
      await page.getByPlaceholder('e.g. Ankara Fabric 6 Yards or Haircut').fill('Offline Transfer Oil');
      await page.getByPlaceholder('0.00').first().fill('4500');
      await page.getByRole('button', { name: /Transfer \/ POS/i }).click();
      await page.locator('label', { hasText: /verified credit alert/i }).locator('input[type="checkbox"]').check();
      await page.getByRole('button', { name: /Save Sale Record & Sync/i }).click();
      await page.waitForSelector('text=Offline Transfer Oil', { timeout: 10000 });

      // Offline Sale 3: CREDIT (Debtor)
      await page.getByRole('button', { name: /Record Sale \/ Service/i }).click();
      await page.getByPlaceholder('e.g. Ankara Fabric 6 Yards or Haircut').fill('Offline Credit Rice');
      await page.getByPlaceholder('0.00').first().fill('12000');
      await page.getByRole('button', { name: /Debt \(Owe Me\)/i }).click();
      await page.getByPlaceholder(/Customer Name \(e\.g\. Alhaji Musa\)/i).fill('Musa Danjuma');
      await page.getByPlaceholder('Phone / WhatsApp').fill('08035556666');
      await page.locator('form input[type="date"]').last().fill('2026-12-15');
      await page.getByRole('button', { name: /Save Sale Record & Sync/i }).click();
      await page.waitForSelector('text=Offline Credit Rice', { timeout: 10000 });

      // Check IndexedDB contains all 3 offline sales BEFORE reload
      const idbCountBefore = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const req = window.indexedDB.open('SmartBizOfflineDB');
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('offline_sales', 'readonly');
            const getAll = tx.objectStore('offline_sales').getAll();
            getAll.onsuccess = () => resolve((getAll.result || []).length);
            getAll.onerror = () => resolve(-1);
          };
          req.onerror = () => resolve(-1);
        });
      });
      assert.equal(idbCountBefore, 3, `Expected 3 records in IndexedDB offline_sales, got ${idbCountBefore}`);

      // Simulate page reload AFTER clearing sb_offline_sales in localStorage? Wait — test REAL reload offline via SW!
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('text=Daily Day-Book & Cash Register', { timeout: 20000 });
      await page.waitForSelector('text=Offline Cash Sugar', { timeout: 10000 });
      await page.waitForSelector('text=Offline Transfer Oil', { timeout: 10000 });
      await page.waitForSelector('text=Offline Credit Rice', { timeout: 10000 });

      const idbCountAfterReload = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const req = window.indexedDB.open('SmartBizOfflineDB');
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('offline_sales', 'readonly');
            const getAll = tx.objectStore('offline_sales').getAll();
            getAll.onsuccess = () => resolve((getAll.result || []).length);
            getAll.onerror = () => resolve(-1);
          };
          req.onerror = () => resolve(-1);
        });
      });
      assert.equal(idbCountAfterReload, 3, `Expected 3 records surviving in IndexedDB after offline reload, got ${idbCountAfterReload}`);

      // Switch online & trigger sync
      await context.setOffline(false);
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      errs.ignoreNetworkErrors = false;

      // Wait until both IndexedDB and localStorage offline queues empty cleanly
      await page.waitForFunction(async () => {
        const ls = JSON.parse(localStorage.getItem('sb_offline_sales') || '[]');
        if (ls.length > 0) return false;
        return new Promise((resolve) => {
          const req = window.indexedDB.open('SmartBizOfflineDB');
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('offline_sales', 'readonly');
            const getAll = tx.objectStore('offline_sales').getAll();
            getAll.onsuccess = () => resolve((getAll.result || []).length === 0);
            getAll.onerror = () => resolve(false);
          };
          req.onerror = () => resolve(false);
        });
      }, { timeout: 20000 });

      // Wait briefly for any final parallel DB transaction to commit & poll backend API (zero duplicates)
      let postSyncRows = [];
      for (let attempt = 0; attempt < 15; attempt++) {
        const postSyncResp = await page.request.get(`${API_URL}/api/marketplace/daily-sales/`, {
          headers: { Authorization: `Token ${token}` },
        });
        const postSyncJson = await postSyncResp.json();
        postSyncRows = Array.isArray(postSyncJson) ? postSyncJson : (postSyncJson.results || []);
        if (postSyncRows.length >= 4) break;
        await page.waitForTimeout(400);
      }

      // Reload online and re-verify zero duplicate sync retries occurred
      await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
      const afterReloadResp = await page.request.get(`${API_URL}/api/marketplace/daily-sales/`, {
        headers: { Authorization: `Token ${token}` },
      });
      const afterReloadJson = await afterReloadResp.json();
      postSyncRows = Array.isArray(afterReloadJson) ? afterReloadJson : (afterReloadJson.results || []);
      const itemNames = postSyncRows.map((s) => s.item_name);
      assert.equal(postSyncRows.length, 4, `Expected 4 total sales (0 duplicates), got ${postSyncRows.length}: ${JSON.stringify(itemNames)}`);
      for (const expected of ['Peak Milk Tin', 'Offline Cash Sugar', 'Offline Transfer Oil', 'Offline Credit Rice']) {
        assert.ok(itemNames.includes(expected), `Missing synced item: ${expected}`);
      }
      logResult('Offline POS Resilience (3 Payment Modes, IndexedDB Reload, Zero-Duplicate Sync)', true, '3 offline sales survived reload in IndexedDB & synced cleanly with 0 duplicates');

      // 4. Debt Ledger & WhatsApp Receipt generation test
      await page.goto(`${FRONTEND_URL}/dashboard/debtor`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('text=Musa Danjuma', { timeout: 15000 });
      await page.evaluate(() => {
        window.__capturedWaUrls = [];
        window.open = (url) => {
          window.__capturedWaUrls.push(String(url || ''));
          return null;
        };
      });
      await page.getByRole('button', { name: /1-TAP WHATSAPP/i }).first().click();
      const waHref = await page.evaluate(() => (window.__capturedWaUrls || [])[0] || '');
      assert.ok(waHref.startsWith('https://wa.me/2348035556666?text='), `Invalid WhatsApp click-to-chat URL: ${waHref}`);
      assert.ok(decodeURIComponent(waHref).includes('12,000'), `WhatsApp message missing amount: ${waHref}`);
      logResult('Debt Ledger & WhatsApp Click-to-Chat Receipt/Reminder', true, `Synced credit debtor Musa Danjuma rendered & 1-Tap WhatsApp generated ${waHref.slice(0, 48)}...`);

      // 5. Mobile "More" Drawer (Money / Stock / Grow) does NOT bounce to Home + Mobile Logo -> '/'
      await page.getByRole('button', { name: /More/i }).click();
      await page.getByRole('button', { name: /Find Grants & Low-Interest Loans/i }).click();
      await page.waitForURL(/\/dashboard\/grants/, { timeout: 10000 });

      await page.getByRole('button', { name: /More/i }).click();
      await page.getByRole('button', { name: /AI Creative Studio/i }).click();
      await page.waitForURL(/\/dashboard\/brand/, { timeout: 10000 });

      await page.locator('header').getByTitle('Go to SmartBiz Coach Home Page').click();
      await page.waitForURL((u) => new URL(u).pathname === '/', { timeout: 10000 });
      await page.waitForSelector('text=Go to Dashboard', { timeout: 10000 });
      logResult('Mobile Money/Stock/Grow Tools & Clickable Logo -> Home', true, 'Mobile tools open /dashboard/grants & /dashboard/brand without redirecting Home; mobile logo returns to /');

      // 6. Desktop Viewport (1280x800): Verify Sidebar Money, Stock, Grow sub-options + Desktop Sidebar Logo -> '/'
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });

      await page.locator('aside').getByRole('button', { name: /Money/i }).click();
      await page.locator('aside').getByRole('button', { name: /Find Funding/i }).waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('aside').getByRole('button', { name: /Pricing Helper/i }).waitFor({ state: 'visible', timeout: 10000 });

      await page.locator('aside').getByRole('button', { name: /Stock/i }).click();
      await page.locator('aside').getByRole('button', { name: /Market Square/i }).waitFor({ state: 'visible', timeout: 10000 });

      await page.locator('aside').getByRole('button', { name: /Grow/i }).click();
      await page.locator('aside').getByRole('button', { name: /AI Studio/i }).waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('aside').getByRole('button', { name: /Compliance/i }).waitFor({ state: 'visible', timeout: 10000 });

      await page.locator('aside').getByTitle('Go to SmartBiz Coach Home Page').click();
      await page.waitForURL((u) => new URL(u).pathname === '/', { timeout: 10000 });
      logResult('Desktop Sidebar Money/Stock/Grow Sub-Menus & Logo -> Home', true, 'All Money, Stock, and Grow options visible on desktop sidebar; desktop logo navigates to /');

      assert.equal(errs.pageErrors.length, 0, `Uncaught pageErrors: ${errs.pageErrors.join(' | ')}`);
      await context.close();
    }

    await browser.close();
    console.log('\n[E2E SUMMARY] ALL CHECKS PASSED:', JSON.stringify(results));
  } catch (err) {
    console.error('[E2E FAILURE]', err);
    try {
      const pages = browser.contexts().flatMap((c) => c.pages());
      if (pages.length > 0) {
        await pages[0].screenshot({ path: path.join(SHOT_DIR, 'e2e_failure.png'), fullPage: true });
      }
    } catch {}
    await browser.close();
    process.exit(1);
  }
}

run();
