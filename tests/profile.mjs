// CPU + allocation profile of the unbundled game (named functions). Software canvas, so only relative numbers matter.
//   node tests/profile.mjs [src|dist]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { serve, findChrome, INIT } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] || 'src';
const { port } = await serve(target === 'dist' ? path.join(root, 'dist') : root);
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--disable-gpu'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
if (process.env.NORASTER) await ctx.addInitScript(`(() => { const P = CanvasRenderingContext2D.prototype, keep = /^(create|measureText|getImageData|getTransform|isPoint|getLineDash|constructor)/; for (const k of Object.getOwnPropertyNames(P)) { const d = Object.getOwnPropertyDescriptor(P, k); if (typeof d.value === 'function' && !keep.test(k)) P[k] = function () {}; } })();`);   // NORASTER=1: draw calls do nothing, so the numbers are JS cost only
await ctx.addInitScript('window.__real = performance.now.bind(performance);' + INIT);
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${port}/index.html`);
await page.evaluate(() => document.fonts.ready);
const cdp = await ctx.newCDPSession(page);
const click = sel => page.evaluate(sel => document.querySelector(sel)?.click(), sel);
const step = n => page.evaluate(n => __step(n), n);

await step(30); await click('#startBtn'); await step(5); await click('#skipBtn'); await step(30);
await page.mouse.move(195, 600); await page.mouse.down(); await page.mouse.up();

await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.startSampling', { samplingInterval: 4096, includeObjectsCollectedByMinorGC: true, includeObjectsCollectedByMajorGC: true });

const per = [];
let k = 0;
for (let st = 0; st < 6; st++) {
  await page.evaluate(() => document.getElementById('testBtn').click());
  await page.evaluate(i => document.querySelector(`#testPanel button[data-i="${i}"]`).click(), st);
  const ms = await page.evaluate(async () => {
    const t0 = __real(); let n = 0;
    for (let c = 0; c < 60; c++) {
      __step(5); n += 5;
      if (!document.getElementById('over').classList.contains('hide')) document.getElementById('againBtn').click();
    }
    return (__real() - t0) / n;
  });
  per.push(ms.toFixed(2));
  for (let c = 0; c < 4; c++) { k++; await page.mouse.move(195 + 150 * Math.sin(k * .37), 560 + 120 * Math.sin(k * .21)); }
}
console.log('ms/frame per stage (software raster):', per.join('  '));

const { profile } = await cdp.send('Profiler.stop');
const { profile: heap } = await cdp.send('HeapProfiler.stopSampling');

// CPU self time per function
const byId = new Map(profile.nodes.map(n => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas; let total = 0;
profile.samples.forEach((id, i) => { const n = byId.get(id); const key = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').slice(-2).join('/')}:${n.callFrame.lineNumber + 1}`; self.set(key, (self.get(key) || 0) + dt[i]); total += dt[i]; });
console.log('\nCPU self time, top 25 (% of sampled):');
[...self].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k2, v]) => console.log((100 * v / total).toFixed(1).padStart(5) + '%  ' + k2));

// inclusive time of game functions (a function's time includes the canvas calls it makes)
const parent = new Map(); profile.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)));
const incl = new Map();
profile.samples.forEach((id, i) => { const seen = new Set(); for (let cur = id; cur; cur = parent.get(cur)) { const n = byId.get(cur); if (!n.callFrame.url.includes('/js/')) continue; const key = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').slice(-2).join('/')}:${n.callFrame.lineNumber + 1}`; if (!seen.has(key)) { seen.add(key); incl.set(key, (incl.get(key) || 0) + dt[i]); } } });
console.log('\nInclusive time, top 40 game functions (% of sampled):');
[...incl].sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([k2, v]) => console.log((100 * v / total).toFixed(1).padStart(5) + '%  ' + k2));

// allocation by function (bytes sampled)
const alloc = new Map(); let at = 0;
(function walk(n) { const key = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').slice(-2).join('/')}:${n.callFrame.lineNumber + 1}`; const self2 = n.selfSize; if (self2) { alloc.set(key, (alloc.get(key) || 0) + self2); at += self2; } n.children.forEach(walk); })(heap.head);
console.log('\nAllocation self bytes, top 20 (% of sampled):');
[...alloc].sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k2, v]) => console.log((100 * v / at).toFixed(1).padStart(5) + '%  ' + k2));
await browser.close(); process.exit(0);
