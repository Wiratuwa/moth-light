import { ST } from './state.js';
import { ctx, reduceMotion } from './config.js';
import { hexA, k01, kEio, kEo, kSm, lerp } from './core.js';
import { buzz } from './input.js';
import { burst, notice, ring } from './spawn.js';
import { update } from './update.js';
import { glow } from './render/glow.js';
import { drawBoss } from './bosses/fx.js';
import { nmRnd } from './stages/neon.js';
import { Sound } from './audio.js';

const CINE_SUB = { eye: 'The Watcher in the Dark', jelly: 'Queen of the Drifting Bloom', prism: 'Keeper of the Frozen Light', storm: 'Wrath of the Red Sky', sentinel: 'Guardian of the Last Dial-up', colossus: 'Warden of the Far Lands' };
const CINE_COL = { eye: '#C9A8FF', jelly: '#FF8AD8', prism: '#7FE8FF', storm: '#FF6B4A', sentinel: '#FF71CE', colossus: '#CDE26A' };
export function cineStart(k, b, rew) {
  const B = b || ST.boss; if (!B) return;
  ST.CINE = { k, t: 0, dur: k === 'in' ? 2.9 : 2.8, ts: k === 'in' ? .3 : .4, b: B, boomed: false, named: false, rew: rew || [] };
  ST.inv = Math.max(ST.inv, ST.CINE.dur + 1.5); ST.spawnT = Math.max(ST.spawnT, 6); ST.eventT = Math.max(ST.eventT, 7); ST.powerCD = Math.max(ST.powerCD, 6);
}
export function cineAmt() { if (!ST.CINE) return 0; return Math.min(kEo(ST.CINE.t / .45), 1 - kSm(ST.CINE.dur - .45, ST.CINE.dur, ST.CINE.t)); }
export function cineZoom() {
  if (!ST.CINE || reduceMotion) return 1; const c = ST.CINE;
  return c.k === 'in' ? 1 + .1 * kEo(c.t / 1.6) * (1 - kSm(c.dur - .5, c.dur, c.t)) : 1 + .14 * kEo(c.t / .9) * (1 - kSm(1.2, c.dur - .2, c.t));
}
export function cineSkip() { if (!ST.CINE || ST.CINE.t < .3 || ST.CINE.t > ST.CINE.dur - .45) return; ST.CINE.t = ST.CINE.dur - .45; }
export function bossBoom(b) {
  const bx = b.x, by = b.y;
  burst(bx, by, '#FF4D6D', 80, 600, 1.6); burst(bx, by, '#FFFFFF', 50, 700, 1.2); burst(bx, by, '#FFD166', 40, 450, 1.4);
  ring(bx, by, 'rgba(255,255,255,.95)', 1100, .7, 8); ring(bx, by, 'rgba(255,77,109,.9)', 800, .9, 6); ring(bx, by, 'rgba(255,209,102,.8)', 500, 1.1, 4);
  ST.flash = 1; ST.shake = 1; ST.hitStop = .06; ST.warpBoost = Math.max(ST.warpBoost, 1);
  Sound.bossDie(); buzz([40, 30, 120]);
}
export function cineStep(dt) {
  const c = ST.CINE; c.t += dt;
  update(dt * c.ts);
  const b = c.b;
  if (c.k === 'in') {
    if (ST.boss === b) { b.x = ST.W / 2; b.y = lerp(-120, b.ty, kEio(c.t / 1.6)); b.entered = false; }
    if (!c.named && c.t >= 1.15) { c.named = true; ST.shake = Math.max(ST.shake, .5); Sound.bossHit(); buzz([30, 20, 40]); }
  } else {
    if (!c.boomed && c.t >= .9) { c.boomed = true; bossBoom(b); }
    if (!c.boomed && Math.random() < dt * 14) burst(b.x + (Math.random() - .5) * b.r * 1.6, b.y + (Math.random() - .5) * b.r * 1.6, '#FFFFFF', 3, 240, .6);
    if (!c.named && c.t >= 1.25) { c.named = true; Sound.bonus(); }
  }
  if (c.t >= c.dur) cineEnd();
}
function cineEnd() {
  const c = ST.CINE; ST.CINE = null;
  if (c.k === 'in' && ST.boss === c.b) { ST.boss.y = ST.boss.ty; ST.boss.x = ST.W / 2; ST.boss.entered = true; ST.boss.atk = 1.2; notice('Line up under it to strike', '#FFB3C0'); }
}
export function drawDyingBoss(t, pulse) {
  const c = ST.CINE, b = c.b, p = k01(c.t / .9), sv = ST.boss;
  b.flashT = Math.sin(c.t * 60) > 0 ? .08 : 0;
  ST.boss = b; ctx.save(); const j = p * 4; ctx.translate((Math.random() - .5) * j * 2, (Math.random() - .5) * j * 2); drawBoss(t, pulse); ctx.restore(); ST.boss = sv;
  ctx.save(); ctx.translate(b.x, b.y); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,255,255,' + (.35 + .65 * p) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let k = 0; k < 9; k++) {
    const ang = nmRnd(k * 2.7) * 6.283, len = b.r * (.5 + 1.1 * p) * (.6 + nmRnd(k + 4) * .6);
    ctx.beginPath(); ctx.moveTo(0, 0);
    for (let s = 1; s <= 4; s++) { const fr = s / 4; ctx.lineTo(Math.cos(ang + Math.sin(k * 3 + s) * .35) * len * fr, Math.sin(ang + Math.cos(k * 5 + s) * .35) * len * fr); }
    ctx.stroke();
  }
  glow(0, 0, b.r * (1 + 2 * p), 'rgba(255,240,200,1)', .5 * p);
  ctx.restore();
}
export function drawCine(t) {
  const c = ST.CINE, a = cineAmt(); if (a <= .01) return;
  const col = CINE_COL[c.b.kind] || '#FFFFFF', neon = c.b.kind === 'sentinel';
  ctx.save();
  const vg = ctx.createRadialGradient(ST.W / 2, ST.H / 2, Math.min(ST.W, ST.H) * .25, ST.W / 2, ST.H / 2, Math.max(ST.W, ST.H) * .75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,10,' + (.55 * a) + ')'); ctx.fillStyle = vg; ctx.fillRect(0, 0, ST.W, ST.H);
  const bh = Math.max(34, ST.H * .1) * a;
  ctx.fillStyle = '#04030C'; ctx.fillRect(0, 0, ST.W, bh); ctx.fillRect(0, ST.H - bh, ST.W, bh);
  ctx.fillStyle = hexA(col, .7 * a); ctx.fillRect(0, bh - 1.5, ST.W, 1.5); ctx.fillRect(0, ST.H - bh, ST.W, 1.5);
  ctx.textAlign = 'center';
  const fadeOut = 1 - kSm(c.dur - .8, c.dur - .45, c.t);
  const slam = (txt, fs0, y, a0, glowC) => {
    ctx.font = '700 ' + fs0 + 'px MothDisplay, serif'; const fs = Math.min(fs0, fs0 * (ST.W - 48) / ctx.measureText(txt).width);
    ctx.font = '700 ' + fs + 'px MothDisplay, serif';
    ctx.save(); ctx.translate(ST.W / 2, y);
    const sc = 1 + .3 * (1 - kEo(a0)); ctx.scale(sc, sc);
    if (neon && !reduceMotion) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .7 * fadeOut * k01(a0 * 4); ctx.fillStyle = 'rgb(0,255,255)'; ctx.fillText(txt, -3 + Math.sin(t * 40) * 1.5, 0); ctx.fillStyle = 'rgb(255,0,200)'; ctx.fillText(txt, 3, 0); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = fadeOut * k01(a0 * 4); ctx.shadowColor = glowC; ctx.shadowBlur = 28; ctx.fillStyle = '#FFFFFF'; ctx.fillText(txt, 0, 0);
    ctx.restore();
  };
  if (c.k === 'in') {
    const py = Math.min(ST.H * .66, c.b.ty + c.b.r * 2 + 84), sw = kEo((c.t - .35) / .5) * fadeOut;
    ctx.fillStyle = hexA(col, .85 * sw); ctx.fillRect(ST.W / 2 - sw * ST.W * .46, py - 62, sw * ST.W * .92, 2);
    if (c.t > 1.1) slam(c.b.name, 46, py, (c.t - 1.1) / .25, col);
    const sa = kSm(1.25, 1.65, c.t) * fadeOut;
    ctx.globalAlpha = sa; ctx.font = '600 17px MothText, sans-serif'; ctx.fillStyle = 'rgba(240,238,255,.92)'; ctx.fillText(CINE_SUB[c.b.kind] || '', ST.W / 2, py + 32);
  } else if (c.t > 1.05) {
    const py = ST.H * .42;
    slam('Boss down', 44, py, (c.t - 1.05) / .25, '#FFD166');
    const sa = kSm(1.3, 1.7, c.t) * fadeOut; ctx.globalAlpha = sa;
    ctx.font = '600 17px MothText, sans-serif'; ctx.fillStyle = 'rgba(240,238,255,.92)'; ctx.fillText(c.b.name + ' falls', ST.W / 2, py + 32);
    ctx.font = '700 17px MothText, sans-serif'; ctx.fillStyle = '#FFD166'; c.rew.forEach((r, i) => ctx.fillText(r, ST.W / 2, py + 62 + i * 24));
  }
  ctx.globalAlpha = 1;
  if (c.t > .5 && c.t < c.dur - .45) { ctx.font = '600 13px MothText, sans-serif'; ctx.fillStyle = 'rgba(233,230,255,.6)'; ctx.fillText('Tap to skip', ST.W / 2, ST.H - bh / 2 + 4); }
  ctx.restore();
}
