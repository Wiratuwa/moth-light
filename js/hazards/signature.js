import { ST } from '../state.js';
import { ctx } from '../config.js';
import { exL, exR, wHi, wLo, xL, xR } from '../edge.js';
import { notice, showBanner } from '../spawn.js';
import { clampN } from '../bosses/sentinel.js';
import { glow } from '../render/glow.js';
import { Sound } from '../audio.js';
import { SIDES } from '../core.js';

// ---------- stage signature hazards: Moonlit owl dive, Nebula current, Aurora black ice, Crimson thundercloud
export function spawnOwl() {
  const tx = clampN(ST.moth.x, wLo(), wHi()), sx = clampN(tx + (Math.random() < .5 ? -1 : 1) * (110 + Math.random() * 90), wLo() - 6, wHi() + 6);
  ST.items.push({ type: 'owl', x: sx, y: 40, r: 17, sx, sy: 40, tx, ty: ST.moth.y, warn: 1.1, spd: 760 + ST.diff * 120, hit: false });
  notice('Night owl', '#FFE88A'); Sound.warn();
}
export function startCurrent() { ST.flow = { dir: Math.random() < .5 ? -1 : 1, t: 0, wait: 1.1, dur: 4.5 + ST.diff * 1.5 }; showBanner('Current ' + (ST.flow.dir > 0 ? 'right' : 'left'), '#8FF0FF'); Sound.warn(); }
export function startIce() { ST.ice = { t: 0, wait: 1.1, dur: 4.5 + ST.diff * 1.5 }; showBanner('Black ice', '#BFEFFF'); Sound.warn(); }
export function spawnCloud() {
  const dir = Math.random() < .5 ? -1 : 1;
  ST.items.push({ type: 'cloud', x: dir > 0 ? xL() + 50 : xR() - 50, y: ST.H * .27, r: 0, dir, vx: 85 + ST.diff * 40, t: 0, fire: 1.2, n: 3 + Math.round(ST.diff * 3), gone: 0 });
  notice('Thundercloud', '#FF8FA3'); Sound.warn();
}
export function drawOwl(it, t) {
  const warn = it.warn > 0;
  if (warn) {
    const dx = it.tx - it.sx, dy = it.ty - it.sy, d = Math.hypot(dx, dy) || 1, ex = it.sx + dx / d * (d + 120), ey = it.sy + dy / d * (d + 120);
    ctx.save(); ctx.setLineDash([8, 7]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,232,138,' + (.35 + .35 * Math.sin(t * 16)) + ')';
    ctx.beginPath(); ctx.moveTo(it.sx, it.sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,232,138,.85)'; ctx.beginPath(); ctx.arc(it.tx, it.ty, 22 + (it.warn / 1.1) * 18, 0, 6.283); ctx.stroke(); ctx.restore();
  }
  ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(Math.atan2(it.ty - it.sy, it.tx - it.sx) - Math.PI / 2);
  glow(0, 0, 54, 'rgba(255,232,138,1)', warn ? .18 : .3);
  const flap = warn ? Math.sin(t * 10) * .25 : .1;
  for (const sd of SIDES) {                                          // wings: three layered feathers per side
    ctx.save(); ctx.translate(sd * 12, -7); ctx.rotate(sd * (-.5 + flap));
    const wg = ctx.createLinearGradient(0, 0, sd * 40, 0); wg.addColorStop(0, '#4F3FA4'); wg.addColorStop(1, '#8E7BE0');
    ctx.fillStyle = wg;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(sd * (8 + k * 8), k * 1.6, 12 - k, 6 - k * .6, sd * .12 * k, 0, 6.283); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0; k < 3; k++) { ctx.moveTo(sd * (2 + k * 8), k * 1.6); ctx.lineTo(sd * (18 + k * 8), k * 1.6 + 1); }
    ctx.stroke(); ctx.restore();
  }
  const og = ctx.createRadialGradient(-4, -6, 2, 0, 0, 22); og.addColorStop(0, '#6E5CC4'); og.addColorStop(1, '#2F2368');
  ctx.fillStyle = og; ctx.beginPath(); ctx.ellipse(0, 0, 14, 19, 0, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 15, 10, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(200,185,255,.3)'; ctx.beginPath(); ctx.ellipse(0, 3, 8, 12, 0, 0, 6.283); ctx.fill();        // belly
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let k = 0; k < 4; k++) { ctx.moveTo(-5, -2 + k * 4); ctx.quadraticCurveTo(0, 1 + k * 4, 5, -2 + k * 4); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(235,225,255,.2)'; ctx.beginPath(); ctx.ellipse(0, 15, 8.5, 7.5, 0, 0, 6.283); ctx.fill();   // facial disc
  ctx.fillStyle = '#3E2F86'; ctx.beginPath(); ctx.moveTo(-9, 22); ctx.lineTo(-6, 29); ctx.lineTo(-3, 22); ctx.moveTo(9, 22); ctx.lineTo(6, 29); ctx.lineTo(3, 22); ctx.fill();   // ear tufts (pointing along travel)
  const bl = warn && Math.sin(t * 7) > .85 ? .2 : 1;
  for (const sd of SIDES) {
    glow(sd * 4.5, 15, 9, 'rgba(255,232,138,1)', .55);
    ctx.fillStyle = '#FFE88A'; ctx.beginPath(); ctx.ellipse(sd * 4.5, 15, 3.4, 3.4 * bl, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#2A1B5E'; ctx.beginPath(); ctx.ellipse(sd * 4.5, 15.6, 1.4, 1.6 * bl, 0, 0, 6.283); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(30,20,80,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-8, 11.5); ctx.lineTo(-2, 13); ctx.moveTo(8, 11.5); ctx.lineTo(2, 13); ctx.stroke();
  ctx.fillStyle = '#FFB347'; ctx.beginPath(); ctx.moveTo(-2, 19); ctx.lineTo(0, 24); ctx.lineTo(2, 19); ctx.fill();
  ctx.restore();
}
export function drawCurrent(t) {
  const act = ST.flow.t >= ST.flow.wait, a = act ? Math.min(1, (ST.flow.wait + ST.flow.dur - ST.flow.t) / .6) * .5 : (ST.flow.t / ST.flow.wait) * .35, d = ST.flow.dir;
  ctx.save(); ctx.strokeStyle = 'rgba(143,240,255,' + a + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const SPN = exR() - exL() + 120;
  for (let k = 0; k < 20; k++) {
    const y = ((k * 97.3 + t * 40) % (ST.H + 40)) - 20, sp = 120 + (k % 4) * 70, len = 46 + (k % 3) * 22, x = exL() - 60 + ((((t * sp * d + k * 61.7) % SPN) + SPN) % SPN);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + d * len * .5, y + Math.sin(t * 3 + k) * 8, x + d * len, y);
    if (act) { ctx.moveTo(x + d * (len - 8), y - 5); ctx.lineTo(x + d * len, y); ctx.lineTo(x + d * (len - 8), y + 5); }
    ctx.stroke();
  }
  ctx.restore();
}
export function drawIce(t) {
  const act = ST.ice.t >= ST.ice.wait, k = act ? Math.min(1, (ST.ice.wait + ST.ice.dur - ST.ice.t) / .6) : ST.ice.t / ST.ice.wait;
  ctx.save();
  let g = ctx.createLinearGradient(0, ST.H, 0, ST.H * .55); g.addColorStop(0, 'rgba(200,245,255,' + (.34 * k) + ')'); g.addColorStop(1, 'rgba(200,245,255,0)');
  ctx.fillStyle = g; ctx.fillRect(exL(), ST.H * .55, exR() - exL(), ST.H * .45);
  g = ctx.createLinearGradient(0, 0, ST.W * .18, 0); g.addColorStop(0, 'rgba(220,250,255,' + (.35 * k) + ')'); g.addColorStop(1, 'rgba(220,250,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, ST.W * .18, ST.H);
  g = ctx.createLinearGradient(ST.W, 0, ST.W * .82, 0); g.addColorStop(0, 'rgba(220,250,255,' + (.35 * k) + ')'); g.addColorStop(1, 'rgba(220,250,255,0)'); ctx.fillStyle = g; ctx.fillRect(ST.W * .82, 0, ST.W * .18, ST.H);
  ctx.restore();
}
