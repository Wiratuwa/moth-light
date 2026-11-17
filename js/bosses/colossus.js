import { ST } from '../state.js';
import { ctx, reduceMotion } from '../config.js';
import { fan, ringShot } from './boss.js';
import { clampN } from './sentinel.js';
import { glow } from '../render/glow.js';
import { OV_COL } from '../stages/overflow.js';
import { nmRnd } from '../stages/neon.js';
import { Sound } from '../audio.js';
import { SIDES } from '../core.js';

// ---- v54 Seam Colossus (Overflow Reach): a huge slab with a crack down its middle. It lays seam walls, throws shears, fires slab volleys and shockwave rings; the crack widens each phase
function colSeam() {
  const b = ST.boss, cell = 36, gap = cell * (b.phase >= 1 ? 4 : 5);
  const gx = Math.round(clampN(ST.moth.x + (Math.random() - .5) * 140, gap / 2 + 20, ST.W - gap / 2 - 20) / cell) * cell;
  ST.items.push({ type: 'gate', seam: true, x: ST.W / 2, y: -24, r: 0, gx0: gx, gx, gap, cell, vy: 190 + b.lvl * 30 + b.phase * 25, sway: 0, ph: 0, hit: false, sd: Math.random() * 50, shiftT: 1 + Math.random() * .4, nextGx: 0, warnT: 0, forceShift: b.phase >= 2 });
  Sound.seam();
}
function colShear(dir) {
  const b = ST.boss, w = 150 + 40 * b.phase, vy = 300 + b.phase * 30, vx = dir * (150 + b.phase * 25), xc = clampN(ST.moth.x, 60, ST.W - 60), T = (ST.moth.y + 40) / vy;
  ST.items.push({ type: 'shear', x: xc - vx * T, x0: xc - vx * T, xc, y: -40, r: 0, w, h: 44, vx, vy, warn: 1.1, hit: false, sd: Math.random() * 50 });
  Sound.shear();
}
export function colossusAttack() {
  const b = ST.boss, ph = b.phase, p = b.pat++ % 4, sp = 230 + b.lvl * 30 + (ph >= 1 ? 40 : 0);
  const later = (t, fn) => b.q.push({ t, fn });
  if (p === 0) { colSeam(); if (ph >= 2) later(1.5, colSeam); b.nextAtk = ph >= 2 ? 3.2 : 2.5; }                          // seam wall (in the last phase the gap moves)
  else if (p === 1) { fan(ph >= 1 ? 7 : 5, .30, sp); if (ph >= 1) b.aimLeft = 3; b.nextAtk = 1.6; }                      // slab volley
  else if (p === 2) { const d = ST.moth.x < ST.W / 2 ? 1 : -1; colShear(d); if (ph >= 1) later(.9, () => colShear(-d)); b.nextAtk = ph >= 1 ? 2.8 : 2.2; }   // shear (two from phase 2)
  else { ringShot(ph >= 1 ? 12 : 9, sp * .8); ST.shake = Math.max(ST.shake, .35); Sound.slab(); b.nextAtk = 1.8; }            // shockwave of chunks
}
export function drawColossus(b, t, pulse, f) {      // v54 Seam Colossus: a huge stretched slab of strata with a glowing crack down its middle; the crack widens each phase
  const hw = b.hw, hh = b.r * .82, ph = b.phase, rm = reduceMotion;
  const gap = [4, 10, 18][ph] + (rm ? 0 : Math.sin(t * 3.2) * 1.6);
  glow(0, 0, hw * 1.6, 'rgba(255,98,40,1)', .3 + .12 * pulse);
  ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(-hw + 16, -hh + 24, hw * 2, hh * 2);                 // it hangs above the ground
  if (!rm) for (let k = 3; k >= 1; k--) { ctx.globalAlpha = .07 * (4 - k); ctx.fillStyle = OV_COL[(k + ph) % 5]; ctx.fillRect(-hw + Math.sin(t * 1.3 + k) * 5, -hh - k * 15, hw * 2, hh * 2); }   // stretch smear
  ctx.globalAlpha = 1;
  const nc = Math.ceil(hw * 2 / 12);
  for (const side of SIDES) {
    const x0 = side < 0 ? -hw : gap / 2, x1 = side < 0 ? -gap / 2 : hw;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, -hh, x1 - x0, hh * 2); ctx.clip();
    for (let c = 0; c < nc; c++) {
      const off = Math.floor(nmRnd(c * 3.1 + 7) * 3) * 6 - 6;
      for (let k = -1; k < 6; k++) { ctx.fillStyle = f ? '#FFFFFF' : OV_COL[(k + 1 + (c & 1) + ph) % 5]; ctx.fillRect(-hw + c * 12, -hh + k * hh * .4 + off, 12.6, hh * .4 + 1); }
    }
    if (!f) { ctx.fillStyle = 'rgba(6,10,6,.42)'; ctx.fillRect(x0, hh * .42, x1 - x0, hh * .6); }        // the cliff face under the lit top
    ctx.restore();
  }
  ctx.lineWidth = 2.4; ctx.strokeStyle = f ? '#FFFFFF' : 'rgba(255,190,130,.95)';
  ctx.strokeRect(-hw, -hh, hw - gap / 2, hh * 2); ctx.strokeRect(gap / 2, -hh, hw - gap / 2, hh * 2);
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-hw, -hh, hw * 2, 2);
  const open = b.stagger > 0 || b.core > 0, cl = open ? 1 : .6 + .25 * pulse;                         // the crack: light pours out, brighter while the core is open
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,98,40,' + (.75 * cl) + ')'; ctx.fillRect(-gap / 2, -hh, gap, hh * 2);
  glow(0, 0, hh * 1.2, open ? 'rgba(255,240,200,1)' : 'rgba(190,110,255,1)', .5 * cl);
  ctx.globalCompositeOperation = 'source-over';
  const mdx = ST.moth.x - b.x, mdy = ST.moth.y - b.y, md = Math.hypot(mdx, mdy) || 1, pxo = mdx / md * 4, pyo = mdy / md * 2.5;
  for (const sd of SIDES) {                                                                          // two slit eyes that follow the moth
    const ex = sd * (gap / 2 + (hw - gap / 2) * .5), ey = -hh * .25;
    glow(ex, ey, 30, 'rgba(255,226,120,1)', .5);
    ctx.fillStyle = f ? '#FFFFFF' : '#FFE9A0'; ctx.beginPath(); ctx.ellipse(ex, ey, 17, 6, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#2A1030'; ctx.beginPath(); ctx.ellipse(ex + pxo, ey + pyo * .5, 3.2, 5, 0, 0, 6.283); ctx.fill();
  }
  const nch = [2, 4, 6][ph];                                                                           // torn chunks circling the slab
  for (let k = 0; k < nch; k++) {
    const a = (rm ? 0 : t * .8) + k * 6.283 / nch, cx = Math.cos(a) * (hw + 22), cy = Math.sin(a) * hh * .9 + hh * .1, sz = 9 + (k % 3) * 3;
    ctx.fillStyle = f ? '#FFFFFF' : OV_COL[k % 5]; ctx.fillRect(cx - sz / 2, cy - sz / 2, sz, sz * .7);
    ctx.strokeStyle = 'rgba(255,190,130,.8)'; ctx.lineWidth = 1.4; ctx.strokeRect(cx - sz / 2, cy - sz / 2, sz, sz * .7);
  }
}
