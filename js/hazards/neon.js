import { ST } from '../state.js';
import { CLR, EVT } from '../config.js';
import { lerp } from '../core.js';
import { EC, stripW, xL, xR } from '../edge.js';
import { addHeat, burst, floatText, notice, ring, showBanner } from '../spawn.js';
import { POP_MSG } from '../events.js';
import { Sound } from '../audio.js';

export function spawnPopups() {                    // a numbered chain: ghosts first, then each window opens in order and closes again
  const n = ST.diff > .8 ? 4 : ST.diff > .5 ? 3 : 2, dw = Math.max(104, Math.min(150, ST.W * .34)), dh = 78;
  const ps = []; let px = -999;
  const inStrip = Math.abs(EC.x) > stripW() * .25, lo = (inStrip ? xL() : 0) + dw / 2 + 8, hi = (inStrip ? xR() : ST.W) - dw / 2 - 8;   // a player hiding in a strip gets windows there too
  for (let i = 0; i < n; i++) {
    let x = ST.W / 2, bestD = -1;
    for (let k = 0; k < 14; k++) {                                               // consecutive windows sit far apart: readable numbers, and the moth has to move
      const c = lo + Math.random() * (hi - lo), d = Math.abs(c - px);
      if (d > bestD) { bestD = d; x = c; }
      if (d > dw + 60) break;
    }
    px = x;
    const m = POP_MSG[(Math.random() * POP_MSG.length) | 0];
    ps.push({ x, w: dw, h: dh, n: i + 1, at: 1.0 + i * .62, life: 1.15, title: m[0], msg: m[1], on: false, done: false, t0: 0 });
  }
  ST.items.push({ type: 'popup', x: ST.W / 2, y: ST.moth.y - 6, r: 0, ps, t: 0 });
  notice('Pop-up spam', '#FF71CE'); Sound.warn();
}
export function spawnMarq() {                      // ghost box and cursor first, then the cursor drags the selection across
  const n = ST.diff > .75 ? 2 : 1;
  for (let k = 0; k < n; k++) {
    const bw = Math.min(ST.W * .5, 230) * (k ? .8 : 1), bh = 120 + Math.random() * 40;
    const inStrip = Math.abs(EC.x) > stripW() * .25;
    let x0 = inStrip ? xL() + 10 + Math.random() * (xR() - xL() - bw - 20) : 10 + Math.random() * (ST.W - bw - 20);
    const o = ST.items.find(q => q.type === 'marq');
    if (o && Math.abs(x0 - o.x0) < bw * .9) x0 = o.x0 < ST.W / 2 ? ST.W - bw - 10 : 10;
    const y1 = ST.moth.y + 34;
    ST.items.push({ type: 'marq', x: ST.W / 2, y: ST.moth.y, r: 0, x0, x1: x0 + bw, y0: y1 - bh, y1, dir: Math.random() < .5 ? 1 : -1, wait: k * 3.1, t: 0, hit: false });
  }
  notice('Marquee select', '#7DB8FF'); Sound.warn();
}
export function marqRect(it) {
  const p = Math.max(0, Math.min(1, (it.t - 1.1) / .7)), e = p * p * (3 - 2 * p);
  const ax = it.dir > 0 ? it.x0 : it.x1, bx = it.dir > 0 ? it.x1 : it.x0, cx = ax + (bx - ax) * e, cy = it.y0 + (it.y1 - it.y0) * e;
  return { l: Math.min(ax, cx), r: Math.max(ax, cx), tp: it.y0, b: cy, cx, cy };
}
export function spawnLbar() {                      // progress bar with a gap that slides, freezes ("buffering"), then moves on
  const n = ST.diff > .6 ? 2 : 1;
  for (let k = 0; k < n; k++) {
    const gap = lerp(150, 118, ST.diff);
    ST.items.push({ type: 'lbar', x: ST.W / 2, y: -20 - k * 250, r: 0, vy: 105 + ST.diff * 70, gap, gx: gap / 2 + 20 + Math.random() * (ST.W - gap - 40),
      mode: 0, mt: .5 + Math.random() * .4, dir: Math.random() < .5 ? -1 : 1, v: 0, hit: false });
  }
  notice('Loading...', '#7DB8FF'); Sound.warn();
}
export function startCountdown() {                 // 23:59:50 -> 00:00:00, then a pixel sweep with two telegraphed safe lanes
  const gw = Math.max(92, Math.min(120, ST.W * .27));
  const a = gw / 2 + 12 + Math.random() * (ST.W - gw - 24); let b = a;
  for (let k = 0; k < 14; k++) { b = gw / 2 + 12 + Math.random() * (ST.W - gw - 24); if (Math.abs(a - b) > gw + 20) break; }
  ST.ctd = { t: 0, dur: 10, lanes: [a, b], gw, k: 11 }; ST.cdCool = 70;
  notice('Y2K countdown', '#FFD166'); Sound.warn();
}
export function sweepBonus() {
  ST.score += 40; ST.scorePop = 1; addHeat(5);
  notice('Y2K survived +40', '#FFD166'); showBanner('Survived', '#7DF9FF');
  floatText(ST.moth.x, ST.moth.y - 40, '+40', '#FFD166'); burst(ST.moth.x, ST.moth.y, '#FFD166', 34, 380, 1.2); ring(ST.moth.x, ST.moth.y, 'rgba(255,209,102,.9)', 800, .6, 5);
  Sound.bonus();
}
export function updateDefrag(g) {                  // the scanline moves down; everything it has passed is wiped
  ST.defrag.t += g;
  const ly = ST.defrag.t / 1.1 * (ST.H + 60) - 30; ST.defrag.y = ly;
  for (let i = ST.items.length - 1; i >= 0; i--) {
    const it = ST.items[i], T = it.type;
    if (!(CLR[T] || it.bullet)) continue;
    const yy = (it.y || 0) - (T === 'xsweep' ? 40 : 0);
    if (!(EVT[T] || T === 'strike' || yy <= ly)) continue;
    burst(it.x, it.y || ly, '#7DF9FF', 8, 240, .8);
    if (T === 'xsweep' && !it.hit) sweepBonus();
    ST.items.splice(i, 1);
  }
  if (ST.defrag.t > 1.3) ST.defrag = null;
}
// Glitch Heat: from Static up, hazards flicker and jump sideways, but the landing spot is always shown first
export function glitchTick(it, dtt) {
  if (it.gl) {
    it.gl.t -= dtt;
    if (it.gl.t <= 0) {
      burst(it.x, it.y, '#FF71CE', 8, 220, .8); burst(it.gl.nx, it.y, '#7DF9FF', 8, 220, .8);
      it.x0 = it.gl.nx; it.x = it.x0; it.gdone = (it.gdone || 0) + 1; it.gl = null; Sound.glitchTp();
    }
    return;
  }
  if (ST.diff < .5 || (it.gdone || 0) >= (ST.diff > .9 ? 2 : 1) || it.y < 20) return;
  if (it.y > ST.moth.y - it.vy * 1.1 - 50) return;               // never jump when it is already close to the moth
  let n = 0; for (const o of ST.items) if (o.gl) n++;
  if (n >= (ST.diff > .9 ? 4 : 3)) return;
  if (Math.random() < (.3 + (ST.diff - .5) * 1.4) * dtt) {
    const tel = lerp(.85, .6, Math.min(1, (ST.diff - .5) * 2)), sh = ST.W * (.18 + Math.random() * .2) * (Math.random() < .5 ? -1 : 1);
    let nx = it.x0 + sh; if (nx < 24 || nx > ST.W - 24) nx = it.x0 - sh;
    nx = Math.max(24, Math.min(ST.W - 24, nx));
    if (Math.abs(nx - it.x0) < 70) return;
    it.x0 = it.x; it.amp = 0;                                  // stop wobbling so the marked spot is exact
    it.gl = { t: tel, max: tel, nx };
  }
}
