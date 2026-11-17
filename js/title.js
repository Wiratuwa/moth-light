import { ST } from './state.js';
import { ctx, reduceMotion } from './config.js';
import { buzz } from './input.js';
import { burst, ring } from './spawn.js';
import { clampN } from './bosses/sentinel.js';
import { drawMoth } from './render/moth.js';
import { hexA, kSm } from './core.js';


// ---------- title screen: the moth is the light; the logo glows where it passes and jolts when you tap
export const TTL = { lt: 0, hold: 0, px: 0, py: 0, x: 0, y: 0, tilt: 0, ms: 1.9, age: 0, init: false, shocks: [], L: null, key: '', st: [], s1: 80 };
function ttlBuild() {
  const key = ST.W + 'x' + ST.H; if (TTL.key === key && TTL.L) return; TTL.key = key;
  const lines = ['MOTH', 'LIGHT'], L = [];
  const meas = (txt, s, ls) => { ctx.font = '700 ' + s + 'px MothDisplay, serif'; const ws = [...txt].map(c => ctx.measureText(c).width); return { ws, tw: ws.reduce((a, b) => a + b, 0) + ls * (txt.length - 1) }; };
  let s1 = Math.min(96, ST.W * .26), ls1 = s1 * .1, s2 = s1 * .74, ls2 = s2 * .16, m1 = meas(lines[0], s1, ls1), m2 = meas(lines[1], s2, ls2);
  const fit = Math.min(1, (ST.W - 40) / Math.max(m1.tw, m2.tw));
  if (fit < 1) { s1 *= fit; s2 *= fit; ls1 *= fit; ls2 *= fit; m1 = meas(lines[0], s1, ls1); m2 = meas(lines[1], s2, ls2); }
  const y1 = ST.H * .17 + s1 * .8, y2 = y1 + s2 * 1.12;
  [[lines[0], s1, ls1, m1, y1, 0], [lines[1], s2, ls2, m2, y2, 1]].forEach(r => {
    let cx = ST.W / 2 - r[3].tw / 2;
    [...r[0]].forEach((ch, i) => { L.push({ ch, s: r[1], row: r[5], rx: cx, ry: r[4], w: r[3].ws[i], ox: 0, oy: 0, vx: 0, vy: 0, lit: 0, i, idx: L.length }); cx += r[3].ws[i] + r[2]; });
  });
  TTL.L = L; TTL.s1 = s1;
  TTL.st = []; for (let k = 0; k < 26; k++) TTL.st.push({ x: Math.random() * ST.W, y: Math.random() * ST.H, v: 6 + Math.random() * 16, s: 1 + Math.random() * 2.4, ph: Math.random() * 6.28 });
}
export function ttlFrame(t, pulse) {
  ttlBuild();
  const dt = Math.min(.05, Math.max(0, t - TTL.lt)); TTL.lt = t; TTL.age += dt;
  if (!TTL.init) { TTL.x = ST.W / 2; TTL.y = ST.H * .5; TTL.init = true; }
  let tx, ty;
  if (TTL.hold > 0) { TTL.hold -= dt; tx = TTL.px; ty = TTL.py; }
  else { tx = ST.W / 2 + (reduceMotion ? 0 : Math.sin(t * .55) * ST.W * .27); ty = ST.H * .5 + (reduceMotion ? 0 : Math.sin(t * 1.1) * ST.H * .045); }
  tx = clampN(tx, ST.W * .12, ST.W * .88); ty = clampN(ty, ST.H * .34, ST.H * .66);
  const ox0 = TTL.x, f = 1 - Math.exp(-dt * (TTL.hold > 0 ? 6 : 2.4));
  TTL.x += (tx - TTL.x) * f; TTL.y += (ty - TTL.y) * f;
  TTL.tilt += (((TTL.x - ox0) / Math.max(dt, .001)) / 900 - TTL.tilt) * Math.min(1, dt * 8);
  TTL.ms += (1.9 - TTL.ms) * Math.min(1, dt * 2.5);
  for (const g of TTL.L) {
    const cx = g.rx + g.ox + g.w / 2, cy = g.ry + g.oy - g.s * .35, dx = cx - TTL.x, dy = cy - TTL.y, d = Math.hypot(dx, dy) || 1, R = 120;
    let ax = -g.ox * 60 - g.vx * 6, ay = -g.oy * 60 - g.vy * 6;
    if (!reduceMotion) {
      if (d < R) { const k = (1 - d / R) * 900; ax += dx / d * k; ay += dy / d * k * .6; }
      for (const s of TTL.shocks) { const ds = Math.hypot(cx - s.x, cy - s.y) || 1, band = Math.abs(ds - s.r); if (band < 46) { const kk = (1 - band / 46) * 5200 * s.life; ax += (cx - s.x) / ds * kk; ay += (cy - s.y) / ds * kk; } }
    }
    g.vx += ax * dt; g.vy += ay * dt; g.ox += g.vx * dt; g.oy += g.vy * dt;
    g.lit += (Math.max(0, 1 - d / 170) - g.lit) * Math.min(1, dt * 10);
  }
  for (const s of TTL.shocks) { s.r += 560 * dt; s.life -= dt * 1.3; }
  TTL.shocks = TTL.shocks.filter(s => s.life > 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of TTL.st) {
    if (!reduceMotion) { s.y -= s.v * dt; s.x += s.v * .3 * dt; if (s.y < -8) { s.y = ST.H + 8; s.x = Math.random() * ST.W; } if (s.x > ST.W + 8) s.x = -8; }
    const a = .25 + .5 * Math.abs(Math.sin(t * 1.4 + s.ph));
    ctx.globalAlpha = a; ctx.fillStyle = ST.skin.a; ctx.fillRect(s.x - s.s * 2.2, s.y - .5, s.s * 4.4, 1); ctx.fillRect(s.x - .5, s.y - s.s * 2.2, 1, s.s * 4.4);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(s.x - .8, s.y - .8, 1.6, 1.6);
  }
  ctx.restore();
  ctx.save(); ctx.textBaseline = 'alphabetic';
  for (const g of TTL.L) {
    const a = kSm(g.idx * .07, g.idx * .07 + .6, TTL.age); if (a <= 0) continue;
    const bob = reduceMotion ? 0 : Math.sin(t * 1.3 + g.i * .8 + g.row * 1.4) * 2.2, lit = g.lit;
    const base = g.row ? [190, 255, 244] : [214, 206, 255], c = base.map(v => Math.round(v + (255 - v) * lit));
    ctx.globalAlpha = a; ctx.font = '700 ' + g.s + 'px MothDisplay, serif';
    ctx.shadowColor = g.row ? 'rgba(94,234,212,.9)' : 'rgba(157,140,255,.9)'; ctx.shadowBlur = (g.row ? 18 : 12) + 34 * lit;
    ctx.fillStyle = 'rgb(' + c.join(',') + ')'; ctx.fillText(g.ch, g.rx + g.ox, g.ry + g.oy + bob + (1 - a) * 14);
  }
  ctx.restore();
  if (!reduceMotion && ST.parts.length < 160 && Math.random() < dt * 40) ST.parts.push({ x: TTL.x + (Math.random() - .5) * 10, y: TTL.y + 12 * TTL.ms * .5, vx: (Math.random() - .5) * 24, vy: 22 + Math.random() * 30, life: 1, max: 1, color: ST.skin.b, size: .8 + Math.random() * 2 });
  const sv = ST.moth; ST.moth = { x: 0, y: 0, tilt: TTL.tilt, iv: 0 };
  ctx.save(); ctx.translate(TTL.x, TTL.y + (reduceMotion ? 0 : Math.sin(t * 2.2) * 3)); ctx.scale(TTL.ms, TTL.ms); drawMoth(t * .5, pulse); ctx.restore();
  ST.moth = sv;
}
export function ttlPoint(e, down) {
  if (ST.state !== 'menu') return;
  if (e.target && e.target.closest && e.target.closest('button')) return;
  const src = e.touches && e.touches[0] ? e.touches[0] : e, x = src.clientX, y = src.clientY;
  if (typeof x !== 'number' || isNaN(x)) return;
  TTL.px = x; TTL.py = y; TTL.hold = 1.6;
  if (down) { TTL.shocks.push({ x, y, r: 0, life: 1 }); burst(x, y, ST.skin.b, 16, 260, .9); ring(x, y, hexA(ST.skin.a, .9), 380, .7, 3); buzz(8); }
}
