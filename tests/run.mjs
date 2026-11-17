// Deterministic regression test: runs a game build in headless Chromium with a seeded
// Math.random and a fake clock, then records a canvas hash every few frames.
//   node tests/run.mjs                run baseline (moth-light-56.html) and dist/, compare
//   node tests/run.mjs --only dist    run one target (baseline | dist | src | audio) and print its trace summary
//   src = native ES modules from the repo root; audio = dist with real WebAudio (compare is not meaningful, check errors only)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png' };

function serve(dir) {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = path.join(dir, p);
      if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(r);
    }).listen(0, '127.0.0.1', () => res({ srv, port: srv.address().port }));
  });
}

function findChrome() {
  const base = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (!fs.existsSync(base)) return undefined;
  const d = fs.readdirSync(base).filter(n => n.startsWith('chromium_headless_shell')).sort().pop();
  if (!d) return undefined;
  const g = path.join(base, d);
  for (const sub of fs.readdirSync(g)) {
    const exe = path.join(g, sub, 'chrome-headless-shell.exe');
    if (fs.existsSync(exe)) return exe;
  }
}

// runs before any page script: seeded random, fake clock, no audio
const INIT = `(() => {
  let s = 123456789;
  Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let now = 1000;
  performance.now = () => now;
  Date.now = () => 1700000000000 + now;
  let raf = [], tm = [], tid = 1;
  window.requestAnimationFrame = f => { raf.push(f); return raf.length; };
  window.setTimeout = (f, ms) => { tm.push({ f, at: now + (ms || 0), id: tid }); return tid++; };
  window.clearTimeout = id => { tm = tm.filter(t => t.id !== id); };
  window.AudioContext = window.webkitAudioContext = undefined;
  window.__step = n => { for (let i = 0; i < n; i++) {
    now += 1000 / 60;
    const due = tm.filter(t => t.at <= now); tm = tm.filter(t => t.at > now); due.forEach(t => t.f());
    const q = raf; raf = []; q.forEach(f => f(now)); } };
  window.__hash = () => { const c = document.getElementById('c'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 2166136261; for (let i = 0; i < d.length; i += 4) { h ^= d[i] | d[i + 1] << 8 | d[i + 2] << 16; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16) + ':' + c.width + 'x' + c.height; };
})();`;

async function run(label, dir, url, audio = false) {
  const { srv, port } = await serve(dir);
  const browser = await chromium.launch({ executablePath: findChrome(), args: ['--disable-gpu', '--force-color-profile=srgb'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(audio ? INIT.replace('window.AudioContext = window.webkitAudioContext = undefined;', '') : INIT);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(`http://127.0.0.1:${port}${url}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  const trace = [];
  let frames = 0;
  const rec = async tag => trace.push([tag, frames, await page.evaluate(() => __hash())]);
  const step = async n => { await page.evaluate(n => __step(n), n); frames += n; };
  const click = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (e) e.click(); return !!e; }, sel);
  // steer along a fixed path; revive when dead so every stage gets exercised
  let k = 0;
  const play = async (tag, chunks) => {
    for (let i = 0; i < chunks; i++, k++) {
      const x = 195 + 150 * Math.sin(k * .37), y = 560 + 120 * Math.sin(k * .21);
      await page.mouse.move(x, y);
      await step(5);
      if (await page.evaluate(() => !document.getElementById('over').classList.contains('hide'))) { await click('#againBtn'); await step(2); }
      if (i % 4 === 3) await rec(`${tag}#${i}`);
    }
  };

  await step(60); await rec('menu');
  await click('#startBtn'); await step(5);                       // first Play shows the trailer
  for (let i = 0; i < 24; i++) { await step(20); await rec('trailer#' + i); }
  await click('#skipBtn'); await step(30); await rec('after-skip');
  if (await page.evaluate(() => !document.getElementById('menu').classList.contains('hide'))) { await click('#startBtn'); await step(10); }
  await page.mouse.move(195, 600); await page.mouse.down(); await page.mouse.up();
  await play('intro', 40);
  // every Test-panel button, in order (stage jumps first)
  const n = await page.evaluate(() => { document.getElementById('testBtn').click(); return document.querySelectorAll('#testPanel button').length; });
  for (let i = 0; i < n; i++) {
    const name = await page.evaluate(i => { const b = document.querySelectorAll('#testPanel button')[i]; b.click(); return b.textContent; }, i);
    await step(2); await rec('test:' + name);
    await play('t' + i, 24);
    await page.evaluate(() => document.getElementById('testBtn').click());   // reopen panel
  }
  await click('#pauseBtn'); await step(5); await rec('paused'); await click('#resumeBtn'); await step(5);
  await play('final', 40);

  await browser.close(); srv.close();
  return { label, frames, errors, trace };
}

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const targets = {
  baseline: () => run('baseline', root, '/moth-light-56.html'),
  dist: () => run('dist', path.join(root, 'dist'), '/index.html'),
  src: () => run('src', root, '/index.html'),           // native ES modules, no bundler
  audio: () => run('audio', path.join(root, 'dist'), '/index.html', true),   // real WebAudio, smoke only
};
const results = [];
for (const t of Object.keys(targets)) if (only ? only === t : (t === 'baseline' || t === 'dist')) results.push(await targets[t]());

for (const r of results) {
  console.log(`${r.label}: ${r.frames} frames, ${r.trace.length} samples, ${r.errors.length} console errors`);
  r.errors.slice(0, 5).forEach(e => console.log('   ! ' + e.slice(0, 200)));
}
if (results.length === 2) {
  const [a, b] = results;
  let bad = 0;
  for (let i = 0; i < Math.max(a.trace.length, b.trace.length); i++) {
    const x = a.trace[i], y = b.trace[i];
    if (!x || !y || x[0] !== y[0] || x[2] !== y[2]) { if (bad++ < 5) console.log('MISMATCH', i, JSON.stringify(x), JSON.stringify(y)); }
  }
  console.log(bad ? `FAIL: ${bad} of ${a.trace.length} samples differ` : `PASS: ${a.trace.length} samples identical`);
  process.exitCode = bad || a.errors.length || b.errors.length ? 1 : 0;
} else if (results[0]) {
  fs.writeFileSync(path.join(root, `tests/trace-${results[0].label}.json`), JSON.stringify(results[0].trace));
}
