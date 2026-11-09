// Generates docs/media/* (screenshots, MP4, GIF) from the preview harness. Maintainer tool; see tools/media/README.md.
//   node tools/media/build.mjs && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/media/capture.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = join(root, 'docs/media'); const shots = join(out, 'screenshots');
mkdirSync(shots, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer(port, seeded) {
  const child = spawn('tsx', ['tools/media/server.ts'], { cwd: root, env: { ...process.env, PORT: String(port), SEED: seeded ? '1' : '0' }, stdio: 'inherit' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/api/dashboard/me`)).ok) return child; } catch { /* starting */ } await sleep(500); }
  child.kill(); throw new Error('preview server did not start');
}
const api = async (base, path, init) => (await fetch(`${base}/api/dashboard/${path}`, { headers: { 'content-type': 'application/json' }, ...init })).json();

// ───────────────────────── Phase A: screenshots (seeded demo project) ─────────────────────────
async function screenshots() {
  const PORT = 5173, BASE = `http://127.0.0.1:${PORT}`;
  const srv = await startServer(PORT, true);
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const go = async (path, ready) => { await page.goto(BASE + path); if (ready) await page.waitForSelector(ready, { timeout: 8000 }); await page.waitForTimeout(700); };
  const shot = (name) => page.screenshot({ path: join(shots, `${name}.png`) });

  const projects = (await api(BASE, 'projects')).data;
  const shop = projects.find((p) => p.name === 'Campus Merch Store');
  const orders = (await api(BASE, `projects/${shop.id}/orders`)).data;
  const byMid = Object.fromEntries(orders.map((o) => [o.merchant_order_id, o]));

  await go('/', 'text=Why we built it'); await page.waitForTimeout(2200); await shot('01-home');
  await go('/features', 'text=Scenarios you can test'); await shot('02-features');
  await go('/docs#webhooks', '#webhooks'); await page.evaluate(() => document.getElementById('orders')?.scrollIntoView()); await page.waitForTimeout(500); await shot('03-docs');
  await go('/register', 'text=Create your account'); await shot('04-register');

  await go('/dashboard', 'text=Recent activity'); await shot('05-dashboard-overview');
  await go('/dashboard/projects', 'main >> text=Campus Merch Store'); await shot('06-projects');
  await go('/dashboard/keys', 'text=API keys'); await page.waitForSelector('table'); await shot('07-api-keys');
  await go('/dashboard/orders', 'table'); await shot('08-payment-orders');

  await go('/dashboard/transactions', 'table');
  const txn = byMid['CM-1004'].transaction_id;
  await page.locator('tr', { hasText: txn }).getByRole('button', { name: 'Timeline' }).click(); await page.waitForSelector('ol'); await page.waitForTimeout(600);
  await page.locator('tr', { hasText: txn }).scrollIntoViewIfNeeded(); await shot('09-transactions-timeline');

  await go('/dashboard/webhooks', 'text=Delivery log'); await page.waitForSelector('text=HTTP 502'); await page.locator('tr', { hasText: 'HTTP 502' }).first().scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, 200)); await page.waitForTimeout(400); await shot('10-webhooks');
  await go('/dashboard/logs', 'table'); await shot('11-api-logs');

  // hosted checkout — desktop + mobile
  const open = byMid['CM-1012']; const url = new URL(open.checkout_url);
  await go(url.pathname + url.search, 'text=Choose a simulated outcome'); await shot('12-checkout');
  await page.getByText('Success after 5 seconds').click(); await page.getByRole('button', { name: /^Pay/ }).click();
  await page.waitForSelector('text=Processing payment'); await page.waitForTimeout(500); await shot('13-checkout-processing');
  await page.waitForSelector('text=Payment successful', { timeout: 15000 }); await page.waitForTimeout(400); await shot('14-checkout-success');
  const fresh = await api(BASE, `projects/${shop.id}/orders`, { method: 'POST', body: JSON.stringify({ amount: 129900, currency: 'INR', description: 'Fest hoodie (black)', merchant_order_id: 'CM-MOBILE' }) });
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mp = await m.newPage(); const mu = new URL(fresh.checkout_url);
  await mp.goto(BASE + mu.pathname + mu.search); await mp.waitForSelector('text=Choose a simulated outcome'); await mp.waitForTimeout(600);
  await mp.screenshot({ path: join(shots, '15-checkout-mobile.png') }); await m.close();

  // refunds (mutates: creates a refund) and project creation (mutates: new project + key reveal)
  await go('/dashboard/refunds', 'text=Request refund');
  const opt = await page.getByLabel('Successful order').locator('option', { hasText: 'CM-1010' }).getAttribute('value');
  await page.getByLabel('Successful order').selectOption(opt);
  await page.getByLabel('Amount (₹)').fill('300'); await page.getByLabel('Reason').fill('Customer changed size');
  await page.getByRole('button', { name: 'Request refund' }).click(); await page.waitForSelector('text=Simulated — no money was returned'); await page.waitForTimeout(600); await shot('16-refunds');

  await go('/dashboard/projects', 'text=New project');
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Project name').fill('Demo Day Checkout'); await page.getByLabel('Website URL').fill('https://demo-day.example.com');
  await page.getByRole('button', { name: 'Create project' }).click(); await page.waitForSelector('text=Your test keys'); await page.waitForTimeout(500); await shot('17-new-project-keys');

  await go('/login', 'text=Welcome back'); await shot('18-login');
  await browser.close(); srv.kill();
  return errors;
}

// ───────────────────────── Phase B: guided video (fresh, empty account) ─────────────────────────
async function video() {
  const PORT = 5174, BASE = `http://127.0.0.1:${PORT}`;
  const srv = await startServer(PORT, false);
  const tmp = join(out, '_rec'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } });
  await ctx.addInitScript(() => {
    const boot = () => {
      if (document.getElementById('__cap')) return;
      const cap = document.createElement('div'); cap.id = '__cap';
      cap.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);max-width:86%;background:#B28558;color:#2C0E11;font:600 19px Inter,sans-serif;padding:12px 24px;border-radius:999px;z-index:99999;box-shadow:0 10px 30px rgba(0,0,0,.45);text-align:center;opacity:0;transition:opacity .25s;pointer-events:none';
      const cur = document.createElement('div'); cur.id = '__cur';
      cur.style.cssText = 'position:fixed;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid #F1E6D6;background:rgba(178,133,88,.55);z-index:100000;pointer-events:none;left:-50px;top:-50px;transition:transform .12s';
      document.body.append(cap, cur);
      addEventListener('mousemove', (e) => { cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px'; }, true);
      addEventListener('mousedown', () => { cur.style.transform = 'scale(.7)'; }, true); addEventListener('mouseup', () => { cur.style.transform = 'scale(1)'; }, true);
      window.__cap = (t) => { cap.textContent = t || ''; cap.style.opacity = t ? '1' : '0'; };
      if (window.__lastCap) window.__cap(window.__lastCap);
    };
    document.addEventListener('DOMContentLoaded', boot); if (document.body) boot();
    const mo = new MutationObserver(boot); mo.observe(document.documentElement, { childList: true });
  });
  const page = await ctx.newPage();
  let last = ''; let mx = 640, my = 360;
  const cap = async (t) => { last = t; await page.evaluate((x) => { window.__lastCap = x; window.__cap?.(x); }, t); };
  const go = async (path, ready) => { await page.goto(BASE + path); if (ready) await page.waitForSelector(ready); await cap(last); await page.waitForTimeout(500); };
  const hover = async (loc) => { await loc.scrollIntoViewIfNeeded(); const b = await loc.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y, { steps: 28 }); mx = x; my = y; await page.waitForTimeout(250); };
  const click = async (loc) => { await hover(loc); await loc.click(); await page.waitForTimeout(350); };
  const type = async (loc, text) => { await click(loc); await loc.pressSequentially(text, { delay: 55 }); };
  const hold = (s) => page.waitForTimeout(s * 1000);

  await page.goto(BASE + '/'); await page.waitForSelector('text=Why we built it');
  await page.mouse.move(mx, my); await cap('MONEY — a free payment sandbox for developers. Every payment is simulated.'); await hold(4);
  await click(page.getByRole('link', { name: 'Create a free account' }).first());
  await page.waitForSelector('text=Create your account');
  await cap('Step 1 · Sign up with your email (the real app emails a verification link)');
  await type(page.getByLabel('Email'), 'maya.rao@example.com'); await type(page.locator('input[name=password]'), 'correct-horse-9'); await type(page.getByLabel('Confirm password'), 'correct-horse-9');
  await click(page.getByRole('checkbox')); await hold(0.6); await click(page.getByRole('button', { name: 'Create account' }));
  await page.waitForSelector('text=Welcome to MONEY');
  await cap('Step 2 · Your dashboard starts empty — create your first project'); await hold(3.2);
  await click(page.getByRole('link', { name: 'Create a project' }));
  await page.waitForSelector('text=New project'); await click(page.getByRole('button', { name: 'New project' }));
  await type(page.getByLabel('Project name'), 'Campus Merch Store'); await type(page.getByLabel('Website URL'), 'https://campus-merch.example.com');
  await page.getByLabel('Category').selectOption('ecommerce'); await hold(0.5);
  await click(page.getByRole('button', { name: 'Create project' })); await page.waitForSelector('text=Your test keys');
  await cap('Step 3 · Copy your secret key now — it is shown only once and stored only as a hash'); await hold(5);
  await click(page.getByRole('button', { name: 'I’ve saved it' })); await hold(0.6);
  await click(page.getByRole('link', { name: 'API Keys' })); await page.waitForSelector('table');
  await cap('Rotate or revoke keys any time — secret keys belong on your backend only'); await hold(3.5);
  await click(page.getByRole('link', { name: 'Webhooks' })); await page.waitForSelector('text=Add endpoint');
  await cap('Step 4 · Add a webhook endpoint — events are signed with HMAC-SHA256');
  await type(page.getByLabel('Endpoint URL'), 'https://hooks.campus-merch.example.com/money'); await click(page.getByRole('button', { name: 'Add endpoint' }));
  await page.waitForSelector('text=Webhook signing secret'); await hold(3.5); await click(page.getByRole('button', { name: 'I’ve saved it' }));
  await click(page.getByRole('link', { name: 'Payment Orders' })); await page.waitForSelector('text=New test order');
  await cap('Step 5 · Create a payment order — here from the dashboard, normally from your backend API');
  await click(page.getByRole('button', { name: 'New test order' })); await hold(0.6); await click(page.getByRole('button', { name: 'Create order' }));
  await page.waitForSelector('text=Open checkout'); await hold(3);
  const href = await page.getByRole('link', { name: 'Open checkout' }).first().getAttribute('href');
  await cap('Step 6 · Send your customer to the hosted checkout'); await hover(page.getByRole('link', { name: 'Open checkout' }).first()); await hold(1.2);
  await go(new URL(href).pathname + new URL(href).search, 'text=Choose a simulated outcome'); await hold(3.5);
  await cap('Step 7 · Pick the outcome to test — the backend owns the timing, not the browser');
  await click(page.getByText('Success after 5 seconds')); await click(page.getByRole('button', { name: /^Pay/ }));
  await page.waitForSelector('text=Processing payment'); await hold(1);
  await page.waitForSelector('text=Payment successful', { timeout: 20000 }); await hold(3.5);
  await go('/dashboard/orders', 'table'); await cap('Step 8 · The dashboard reflects the result straight away'); await hold(3.5);
  await go('/dashboard/webhooks', 'text=Delivery log'); await page.waitForSelector('text=payment.succeeded');
  await cap('Step 9 · Signed webhooks arrive with a full delivery log — retry any failure'); await hold(4.5);
  await go('/dashboard/refunds', 'text=Request refund'); await cap('Step 10 · Simulate full or partial refunds — no real money moves');
  const optv = await page.getByLabel('Successful order').locator('option', { hasText: 'TEST-' }).first().getAttribute('value').catch(() => null);
  const selOpt = optv ?? (await page.getByLabel('Successful order').locator('option').nth(1).getAttribute('value'));
  await hover(page.getByLabel('Successful order')); await page.getByLabel('Successful order').selectOption(selOpt); await hold(0.4);
  await type(page.getByLabel('Amount (₹)'), '200'); await type(page.getByLabel('Reason'), 'Customer request');
  await click(page.getByRole('button', { name: 'Request refund' })); await page.waitForSelector('text=Simulated — no money was returned'); await hold(3.8);
  await go('/dashboard/transactions', 'table'); await cap('Step 11 · Every state change is an immutable event you can inspect');
  await click(page.getByRole('button', { name: 'Timeline' }).first()); await page.waitForSelector('ol'); await hold(4.5);
  await go('/docs', 'text=Quick start'); await cap('Docs include JavaScript, TypeScript, Node.js, Python, cURL and HTML examples');
  await page.evaluate(() => document.getElementById('orders')?.scrollIntoView({ behavior: 'smooth' })); await hold(4);
  await page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;background:#2C0E11;z-index:100001;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#F1E6D6;opacity:0;transition:opacity .7s'; d.innerHTML = '<div style="font:italic 500 76px Lora,Georgia,serif">Your money. Your move.</div><div style="margin-top:18px;font:500 22px Inter,sans-serif;color:#D2B48C">Free payment infrastructure for every developer — test mode, simulated payments only.</div>'; document.body.append(d); requestAnimationFrame(() => (d.style.opacity = '1')); });
  await cap(''); await hold(3.5);
  await ctx.close(); await browser.close(); srv.kill();

  const webm = join(tmp, readdirSync(tmp).find((f) => f.endsWith('.webm')));
  const mp4 = join(out, 'money-walkthrough.mp4'); const gif = join(out, 'money-walkthrough.gif'); const pal = join(tmp, 'pal.png');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-vf', 'fps=6,scale=720:-1:flags=lanczos,palettegen=max_colors=80:stats_mode=diff', pal]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-i', pal, '-lavfi', 'fps=6,scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4', gif]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '26', '-i', mp4, '-frames:v', '1', join(out, 'walkthrough-poster.png')]);
  rmSync(tmp, { recursive: true, force: true });
  return { mp4, gif };
}

if (!process.env.SKIP_SHOTS) { const errs = await screenshots(); console.log('screenshots done; browser errors:', errs.length ? errs : 'none'); }
const v = await video();
for (const f of [v.mp4, v.gif]) console.log(f.split('/').pop(), (statSync(f).size / 1048576).toFixed(2) + ' MB');
