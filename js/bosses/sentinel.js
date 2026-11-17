import { ST } from '../state.js';
import { ctx, reduceMotion } from '../config.js';
import { lerp } from '../core.js';
import { burst, ring, spawnStrike } from '../spawn.js';
import { glow } from '../render/glow.js';
import { drawBustProp, nmRnd } from '../stages/neon.js';
import { Sound } from '../audio.js';

// ---- Neon Sentinel: glitch attacks (warp volley, staggered pixel lanes, corrupt wall, lag shots)
export const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
export function nmBase(b) { return ST.W / 2 + Math.sin(b.t * (b.spd + (1 - b.hp / b.max) * .5)) * (ST.W * .3); }
function pxBullet(x, y, vx, vy, lagY) {
  if (ST.items.length > 90) return;
  ST.items.push({ type: 'shuriken', bullet: true, px: true, r: 12, x, y, vx, vy, x0: x, spin: 0, amp: 0, ph: 0, passed: true, lagY, lagT: 0, lagDone: false });
}
function pxFan(n, spread, sp, lagY, a0) {
  const base = a0 === undefined ? Math.PI / 2 : a0;
  for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * spread; pxBullet(ST.boss.x, ST.boss.y + ST.boss.r * .6, Math.cos(a) * sp, Math.sin(a) * sp, lagY); }
}
function startWarp() {
  const b = ST.boss; let tx = ST.W / 2;
  for (let k = 0; k < 8; k++) { tx = 50 + Math.random() * (ST.W - 100); if (Math.abs(tx - b.x) > 110) break; }
  b.warp = { t: .8, tx }; Sound.warn();
}
export function warpNow() {
  const b = ST.boss, w = b.warp; b.warp = null;
  burst(b.x, b.y, '#7DF9FF', 16, 260); burst(b.x, b.y, '#FF3CC8', 16, 260);
  b.off = w.tx - nmBase(b); b.x = clampN(w.tx, 36, ST.W - 36); b.glT = .3;
  ST.shake = Math.max(ST.shake, .4); ST.flash = Math.max(ST.flash, .1); Sound.glitchBurst();
  burst(b.x, b.y, '#7DF9FF', 20, 300); ring(b.x, b.y, 'rgba(255,60,200,.9)', 500, .4, 4);
  const ph2 = b.phase >= 1, a0 = Math.atan2(ST.moth.y - b.y, ST.moth.x - b.x);
  pxFan(ph2 ? 7 : 5, .22, 240 + b.lvl * 30 + (ph2 ? 40 : 0), undefined, a0);
}
function sentinelWall() {
  const b = ST.boss, ph2 = b.phase >= 1, gap = lerp(190, 150, Math.min(1, ST.diff));
  const gx = clampN(ST.moth.x + (Math.random() - .5) * 120, gap / 2 + 20, ST.W - gap / 2 - 20);
  ST.items.push({ type: 'gate', x: ST.W / 2, y: -20, r: 0, gx0: gx, gx, gap, vy: 240 + b.lvl * 30, sway: ph2 ? 40 : 0, ph: Math.random() * 6.28, hit: false });
  Sound.warn();
}
export function sentinelAttack() {
  const b = ST.boss, ph2 = b.phase >= 1, sp = 230 + b.lvl * 30 + (ph2 ? 40 : 0), p = b.pat++ % 4;
  const later = (t, fn) => b.q.push({ t, fn });
  if (p === 0) { startWarp(); if (ph2) later(1.7, startWarp); b.nextAtk = ph2 ? 3.2 : 2.3; }                          // glitch warp + volley
  else if (p === 1) {                                                                                              // pixel lanes, one at a time, each aimed at where the moth is NOW
    const n = ph2 ? 4 : 3;
    for (let i = 0; i < n; i++) later(i * .45, () => spawnStrike(ST.moth.x + (i === 0 ? 0 : i % 2 ? 45 : -45), '255,60,200'));
    b.nextAtk = .45 * n + 1.1;
  } else if (p === 2) { sentinelWall(); if (ph2) later(.95, sentinelWall); b.nextAtk = ph2 ? 2.6 : 1.9; }            // corrupt wall with a gap
  else { pxFan(ph2 ? 7 : 5, ph2 ? .27 : .34, sp * .85, b.y + b.r + 200); b.nextAtk = 2.3; }                          // lag shots: freeze, flicker, lunge
}

function sentinelSil(R, col, outline) {
  ctx.beginPath(); ctx.moveTo(-R * 1.15, R * 1.1); ctx.quadraticCurveTo(-R * 1.1, R * .45, -R * .35, R * .4); ctx.lineTo(R * .35, R * .4); ctx.quadraticCurveTo(R * 1.1, R * .45, R * 1.15, R * 1.1); ctx.closePath();
  ctx.moveTo(R * .5, -R * .35); ctx.ellipse(0, -R * .35, R * .5, R * .65, 0, 0, 6.283);
  if (outline) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]); } else { ctx.fillStyle = col; ctx.fill(); }
}
export function drawSentinel(b, t, pulse, f) {   // Neon Sentinel: a marble bust that glitches, with a scanning visor
  const r = b.r, R = r * 1.1, rm = reduceMotion, warp = b.warp, tg = b.glT > 0;
  glow(0, 0, r * 3, 'rgba(255,60,200,1)', .3 + .12 * pulse); glow(0, 0, r * 2.2, 'rgba(5,217,232,1)', .18);
  if (warp) {                                                                    // where it will reappear
    ctx.save(); ctx.translate(warp.tx - b.x, 0); ctx.globalAlpha = .35 + .3 * Math.abs(Math.sin(warp.t * 22));
    sentinelSil(R, 'rgba(125,249,255,1)', true); ctx.restore();
  }
  ctx.save(); ctx.rotate(t * .6); ctx.strokeStyle = 'rgba(255,200,240,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -r * .2, r * 1.55, r * .5, 0, 0, 6.283); ctx.stroke(); ctx.restore();
  const NQ = [6, 9, 12][b.phase];
  for (let k = 0; k < NQ; k++) { const a = t * 1.4 + k * 6.283 / NQ; ctx.fillStyle = k % 2 ? '#7DF9FF' : '#FF71CE'; ctx.fillRect(Math.cos(a) * r * 1.55 - 3, -r * .2 + Math.sin(a) * r * .5 - 3, 6, 6); }
  const jx = rm ? 0 : ((warp ? 4 : 0) + (tg ? 12 : 0) + (f ? 5 : 0)) * (Math.random() - .5) * 2;
  ctx.translate(jx, 0);
  const o = 3 + (tg ? 9 : 0) + (warp ? 3 : 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.save(); ctx.translate(-o, 0); sentinelSil(R, 'rgba(5,217,232,.55)'); ctx.restore();
  ctx.save(); ctx.translate(o, 0); sentinelSil(R, 'rgba(255,60,200,.55)'); ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha = warp ? (Math.sin(t * 50) > 0 ? 1 : .4) : 1;
  drawBustProp(R, false);
  const vx = -R * .6, vy = -R * .58, vw = R * 1.2, vh = R * .3;                  // visor
  ctx.fillStyle = f ? '#FFFFFF' : 'rgba(22,8,52,.94)'; ctx.fillRect(vx, vy, vw, vh);
  ctx.strokeStyle = ['#7DF9FF', '#FFD166', '#FF4D6D'][b.phase]; ctx.lineWidth = 2 + b.phase * .5; ctx.strokeRect(vx, vy, vw, vh);
  if (!f) {
    ctx.fillStyle = 'rgba(255,60,200,.9)'; ctx.fillRect(vx + 2, vy + ((t * 34) % (vh - 3)), vw - 4, 2);
    ctx.fillStyle = 'rgba(125,249,255,.85)';
    for (let i = 0; i < 6; i++) { const k = nmRnd(i * 3.7 + Math.floor(t * 8)); ctx.fillRect(vx + 5 + i * (vw - 10) / 6, vy + 4 + k * (vh - 11), 3 + k * 6, 3); }
  }
  ctx.restore();
  if (!rm && (tg || warp || Math.sin(t * 3.1) * Math.sin(t * 5.3) > .8)) {       // horizontal slice tears
    for (let k = 0; k < 2; k++) {
      const by = -R + Math.random() * R * 2.1, bh = 5 + Math.random() * 10, bx = (Math.random() - .5) * 28;
      ctx.save(); ctx.beginPath(); ctx.rect(-r * 2, by, r * 4, bh); ctx.clip(); ctx.translate(bx, 0); drawBustProp(R, false); ctx.restore();
    }
  }
  if (f) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .55; drawBustProp(R, false); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
}
