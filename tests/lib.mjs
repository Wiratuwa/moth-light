import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png' };

export function serve(dir) {
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

export function findChrome() {
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
export const INIT = `(() => {
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

