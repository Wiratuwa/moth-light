import { ST } from '../state.js';
import { ctx, cv, reduceMotion } from '../config.js';
import { lerp, SIDES } from '../core.js';
import { BGK, EC, bgM, ecApply, exL, exR, stripW } from '../edge.js';
import { marqRect } from '../hazards/neon.js';
import { glow } from '../render/glow.js';
import { drawBackground } from '../render/background.js';

let kanaCols = [];
let crtA = null;
let crtB = null;
let crtAx = null;
let crtBx = null;
// v55 Overflow Reach transitions. s runs space -> land: entering the stage plays it forwards (descent), leaving plays it backwards (ascent).
// 0-2.4 we look straight down at the Earth: it swells out of the ground below (ascent: shrinks back into it), 1.0-2.4 re-entry glow and sky haze close over the screen (the stage swaps here),
// 1.3-3.6 cloud banks rush past, 2.4-4.3 the haze lifts and the land is revealed.
let lcSpr = null;
let bgSlide = false;

// ---------- Neon Mirage drawing: events, power-up effects, CRT
export function drawGlitchGhost(it, t) {           // dashed link + a flickering target box where the hazard will land
  if (!it.gl) return;
  const k = 1 - it.gl.t / it.gl.max, fl = Math.sin(t * (18 + k * 30)) > 0, nx = it.gl.nx, r = it.r * 1.55 * 1.15;
  ctx.save();
  ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(125,249,255,' + (.35 + .4 * k) + ')';
  ctx.beginPath(); ctx.moveTo(it.x, it.y); ctx.lineTo(nx, it.y); ctx.stroke(); ctx.setLineDash([]);
  ctx.globalAlpha = fl ? .95 : .5; ctx.fillStyle = 'rgba(255,113,206,.16)'; ctx.fillRect(nx - r, it.y - r, r * 2, r * 2);
  ctx.strokeStyle = '#FF71CE'; ctx.lineWidth = 2; const c = r * .5;
  ctx.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(nx + sx * r, it.y + sy * (r - c)); ctx.lineTo(nx + sx * r, it.y + sy * r); ctx.lineTo(nx + sx * (r - c), it.y + sy * r); }
  ctx.stroke();
  ctx.restore();
}
export function drawPopup(it, t) {
  for (const p of it.ps) {
    if (p.done) continue;
    const x0 = p.x - p.w / 2, y0 = it.y - p.h / 2;
    if (!p.on) {                              // numbered ghost: shows where and in which order the windows open
      const soon = p.at - it.t < .3, fl = soon && Math.sin(t * 40) > 0;
      ctx.save(); ctx.globalAlpha = soon ? (fl ? .95 : .4) : .75;
      ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = '#7DF9FF'; ctx.strokeRect(x0, y0, p.w, p.h);
      ctx.fillStyle = 'rgba(125,249,255,.10)'; ctx.fillRect(x0, y0, p.w, p.h); ctx.setLineDash([]);
      ctx.font = '700 30px MothDisplay, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#7DF9FF'; ctx.fillText(p.n, p.x, it.y + 10);
      ctx.restore(); continue;
    }
    const age = it.t - p.t0, sc = .6 + .4 * Math.min(1, age / .12), closing = p.life - age < .15;
    ctx.save(); ctx.translate(p.x, it.y); ctx.scale(sc, sc); ctx.globalAlpha = closing ? .6 : 1; ctx.translate(-p.w / 2, -p.h / 2);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(4, 4, p.w, p.h);
    ctx.fillStyle = '#C0C0C0'; ctx.fillRect(0, 0, p.w, p.h);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, p.w, 1.5); ctx.fillRect(0, 0, 1.5, p.h);
    ctx.fillStyle = '#404040'; ctx.fillRect(0, p.h - 1.5, p.w, 1.5); ctx.fillRect(p.w - 1.5, 0, 1.5, p.h);
    const tg = ctx.createLinearGradient(0, 0, p.w, 0); tg.addColorStop(0, '#000080'); tg.addColorStop(1, '#1084D0');
    ctx.fillStyle = tg; ctx.fillRect(3, 3, p.w - 6, 15);
    ctx.fillStyle = '#FFFFFF'; ctx.font = '700 10px MothText, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(p.title, 7, 14.5);
    ctx.fillStyle = '#C0C0C0'; ctx.fillRect(p.w - 17, 5, 12, 11); ctx.fillStyle = '#000'; ctx.fillText('x', p.w - 14, 14);
    ctx.fillStyle = '#E01010'; ctx.beginPath(); ctx.arc(18, 40, 9, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(14, 36); ctx.lineTo(22, 44); ctx.moveTo(22, 36); ctx.lineTo(14, 44); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.font = '500 9.5px MothText, sans-serif';
    const words = p.msg.split(' '), maxw = p.w - 44; let line = '', ly = 36;
    for (const w of words) { const tst = line ? line + ' ' + w : w; if (ctx.measureText(tst).width > maxw && line) { ctx.fillText(line, 33, ly); ly += 11; line = w; } else line = tst; }
    ctx.fillText(line, 33, ly);
    ctx.fillStyle = '#C0C0C0'; ctx.fillRect(p.w / 2 - 20, p.h - 24, 40, 16);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(p.w / 2 - 20, p.h - 24, 40, 1.5); ctx.fillRect(p.w / 2 - 20, p.h - 24, 1.5, 16);
    ctx.fillStyle = '#404040'; ctx.fillRect(p.w / 2 - 20, p.h - 9.5, 40, 1.5); ctx.fillRect(p.w / 2 + 18.5, p.h - 24, 1.5, 16);
    ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.fillText('OK', p.w / 2, p.h - 12.5);
    ctx.strokeStyle = 'rgba(255,113,206,.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(-1.5, -1.5, p.w + 3, p.h + 3);   // neon edge
    ctx.restore();
  }
}
function drawBigCursor(x, y, s) {
  const P = [[0, 0], [0, 1.55], [.4, 1.2], [.72, 1.9], [.98, 1.78], [.68, 1.1], [1.1, 1.1]];
  const path = d => { ctx.beginPath(); P.forEach((q, i) => { const px = x + q[0] * s + d, py = y + q[1] * s + d; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); };
  ctx.fillStyle = 'rgba(0,0,0,.35)'; path(s * .1); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; path(0); ctx.fill(); ctx.strokeStyle = '#14082e'; ctx.lineWidth = Math.max(2, s * .07); ctx.lineJoin = 'round'; ctx.stroke();
}
export function drawMarq(it, t) {
  if (it.wait > 0) return;
  const rel = it.t >= 2.5 ? Math.max(0, (2.8 - it.t) / .3) : 1;
  ctx.save(); ctx.globalAlpha = rel;
  if (it.t < 1.1) {                           // telegraph: ghost of the final box, cursor waiting at the anchor corner
    const fl = 1.1 - it.t < .35 && Math.sin(t * 40) > 0, ax = it.dir > 0 ? it.x0 : it.x1;
    ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.strokeStyle = fl ? '#FFFFFF' : '#7DB8FF';
    ctx.strokeRect(it.x0, it.y0, it.x1 - it.x0, it.y1 - it.y0);
    ctx.fillStyle = 'rgba(70,130,255,' + (fl ? .22 : .1) + ')'; ctx.fillRect(it.x0, it.y0, it.x1 - it.x0, it.y1 - it.y0); ctx.setLineDash([]);
    ctx.font = '700 12px MothText, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#BFD8FF'; ctx.fillText('STAY OUTSIDE', (it.x0 + it.x1) / 2, it.y0 - 8);
    drawBigCursor(ax, it.y0 + Math.sin(t * 6) * 3, 54);
  } else {
    const R = marqRect(it), w = R.r - R.l, h = R.b - R.tp;
    ctx.fillStyle = 'rgba(70,130,255,.30)'; ctx.fillRect(R.l, R.tp, w, h);
    ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineDashOffset = -t * 50; ctx.strokeRect(R.l, R.tp, w, h);
    ctx.strokeStyle = '#2040C0'; ctx.lineDashOffset = -t * 50 + 7; ctx.strokeRect(R.l, R.tp, w, h);
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
    drawBigCursor(R.cx, R.cy, 54);
  }
  ctx.restore();
}
export function drawLbar(it, t) {
  const y = it.y, h = 26, xl = exL(), w = exR() - xl, gl = it.gx - it.gap / 2, gr = it.gx + it.gap / 2, buf = it.mode === 1;
  ctx.save();
  const pct = Math.max(0, Math.min(99, Math.floor(y / ST.moth.y * 100)));
  ctx.font = '700 13px MothText, sans-serif'; ctx.textAlign = 'left'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillStyle = '#FFFFFF';
  ctx.fillText(buf ? 'buffering...' : 'Loading... ' + pct + '%', 8, y - h / 2 - 6); ctx.shadowBlur = 0;
  ctx.fillStyle = '#C0C0C0'; ctx.fillRect(xl, y - h / 2, w, h);
  ctx.fillStyle = '#404040'; ctx.fillRect(xl, y - h / 2, w, 2); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(xl, y + h / 2 - 2, w, 2);
  for (let bx = xl + 4; bx + 12 < xl + w - 3; bx += 15) {
    if (bx + 12 > gl && bx < gr) continue;
    ctx.fillStyle = buf && Math.floor(t * 14 + bx * .3) % 3 === 0 ? '#6A86FF' : '#1E3CFF'; ctx.fillRect(bx, y - h / 2 + 4, 12, h - 8);
  }
  ctx.fillStyle = '#EDEDED'; ctx.fillRect(gl, y - h / 2, gr - gl, h);               // the safe gap
  ctx.fillStyle = '#7DF9FF'; ctx.fillRect(gl - 2, y - h / 2 - 3, 2, h + 6); ctx.fillRect(gr, y - h / 2 - 3, 2, h + 6);
  if (buf) { ctx.strokeStyle = '#1E3CFF'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(it.gx, y, 7, t * 9, t * 9 + 4.4); ctx.stroke(); }
  ctx.restore();
}
export function drawXSweep(it, t) {
  const cs = 14, y0 = it.y - it.bh / 2, rows = Math.ceil(it.bh / cs);
  ctx.save();
  for (let r = 0; r < rows; r++) {
    const ry = y0 + r * cs, lead = r / (rows - 1);
    for (let x = Math.floor(exL() / cs) * cs; x < exR(); x += cs) {
      const cx = x + cs / 2;
      if (it.lanes.some(l => Math.abs(cx - l) < it.gw / 2 - 6)) continue;
      const rn = nmRnd(x * .37 + r * 11.3 + Math.floor(t * 18));
      if (rn < .12 + (1 - lead) * .35) continue;
      ctx.fillStyle = lead > .8 ? '#FFFFFF' : rn > .75 ? '#FF71CE' : rn > .45 ? '#B967FF' : '#05D9E8';
      ctx.globalAlpha = .55 + lead * .45; ctx.fillRect(x, ry, cs - 1, cs - 1);
    }
  }
  ctx.restore();
}
export function drawCdLanes(t) {                   // last 4 seconds: the two safe lanes light up
  const left = ST.ctd.dur - ST.ctd.t; if (left > 4) return;
  const a = Math.min(1, (4 - left) / .6), fl = left < 1.2 && Math.sin(t * 36) > 0;
  ctx.save();
  ctx.fillStyle = 'rgba(255,60,120,' + (.07 * a + (fl ? .05 : 0)) + ')'; ctx.fillRect(exL(), -ST.H * .35, exR() - exL(), ST.H * 1.7);
  for (const l of ST.ctd.lanes) {
    const x0 = l - ST.ctd.gw / 2;
    ctx.fillStyle = 'rgba(125,249,255,' + (.10 * a) + ')'; ctx.fillRect(x0, -ST.H * .35, ST.ctd.gw, ST.H * 1.7);
    ctx.setLineDash([8, 7]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(125,249,255,' + (.75 * a) + ')';
    ctx.beginPath(); ctx.moveTo(x0, -ST.H * .35); ctx.lineTo(x0, ST.H * 1.35); ctx.moveTo(x0 + ST.ctd.gw, -ST.H * .35); ctx.lineTo(x0 + ST.ctd.gw, ST.H * 1.35); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '700 13px MothText, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(190,250,255,' + a + ')'; ctx.fillText('SAFE', l, ST.H * .5);
    ctx.beginPath(); ctx.moveTo(l - 7, ST.H * .5 + 8); ctx.lineTo(l + 7, ST.H * .5 + 8); ctx.lineTo(l, ST.H * .5 + 18); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
export function drawCdHud(t) {                     // 23:59:50 ticking toward 00:00:00
  const left = Math.max(0, ST.ctd.dur - ST.ctd.t), s = 60 - Math.ceil(left), txt = left <= 0 ? '00:00:00' : '23:59:' + String(s).padStart(2, '0');
  const urgent = left < 3, sh = urgent && !reduceMotion ? (Math.random() - .5) * 3 : 0, bw = 138, bh = 30;
  ctx.save(); ctx.translate(ST.W / 2 + sh, 140);
  ctx.fillStyle = 'rgba(8,4,28,.78)'; nmRR(-bw / 2, -bh / 2, bw, bh, 8); ctx.fill();
  ctx.strokeStyle = urgent ? '#FF4D6D' : '#7DF9FF'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = '700 22px ui-monospace, Menlo, Consolas, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = urgent ? '#FF8FA3' : '#BFF8FF'; ctx.shadowColor = urgent ? '#FF4D6D' : '#7DF9FF'; ctx.shadowBlur = 10;
  ctx.fillText(txt, 0, 1); ctx.restore();
}
export function drawDefrag(t) {                    // scanline sweeping down, wiping hazards
  const y = ST.defrag.y; if (y < -40 || y > ST.H + 40) return;
  ctx.save();
  const g = ctx.createLinearGradient(0, y - 120, 0, y); g.addColorStop(0, 'rgba(125,249,255,0)'); g.addColorStop(1, 'rgba(125,249,255,.32)');
  ctx.fillStyle = g; ctx.fillRect(exL(), y - 120, exR() - exL(), 120);
  ctx.fillStyle = 'rgba(255,113,206,.9)'; ctx.fillRect(exL(), y - 3, exR() - exL(), 2); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(exL(), y - 1, exR() - exL(), 3);
  for (let x = Math.floor(exL() / 16) * 16; x < exR(); x += 16) {
    const r = nmRnd(x * 1.3 + Math.floor(t * 20));
    if (r > .55) { ctx.fillStyle = r > .8 ? 'rgba(255,113,206,.8)' : 'rgba(125,249,255,.75)'; ctx.fillRect(x, y - 6 - r * 28, 12, 4 + r * 6); }
  }
  ctx.font = '700 11px ui-monospace, Menlo, Consolas, monospace'; ctx.textAlign = 'right'; ctx.fillStyle = '#FFFFFF'; ctx.fillText('DEFRAG ' + Math.min(100, Math.floor(ST.defrag.t / 1.1 * 100)) + '%', ST.W - 8, y - 8);
  ctx.restore();
}
function lcSprite() {
  if (lcSpr) return lcSpr;
  const c = document.createElement('canvas'); c.width = 160; c.height = 100; const g = c.getContext('2d');
  [[50, 58, 34], [80, 48, 40], [112, 60, 32], [70, 68, 30], [98, 70, 28], [132, 68, 22], [32, 68, 22]].forEach(b => {
    const r = g.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]); r.addColorStop(0, 'rgba(255,255,255,.95)'); r.addColorStop(.6, 'rgba(244,250,255,.6)'); r.addColorStop(1, 'rgba(235,245,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 160, 100);
  });
  return (lcSpr = c);
}
export function lcWarp(s, dir) { return dir > 0 ? (s < .5 ? s * 2.4 : s + .7) : (s < .7 ? s * 3 : s + 1.4); }                // v55: the Earth-spawn start runs 2.4x faster; from the first haze on the atmosphere keeps its original pace
function lcEase(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
export function drawLandTrans(t) {
  const D = ST.trans.dur, s = lcWarp(ST.trans.dir > 0 ? ST.trans.t : D - ST.trans.t, ST.trans.dir), rm = reduceMotion;
  ctx.save();
  if (s < 2.5) {                                                       // we look straight down at the Earth: a small disc far below the middle of the screen that swells until it is the ground
    const R = ST.W * .08 * Math.exp(1.3 * s), cx = ST.W / 2, cy = ST.H * .5, sa = s * .16;
    const a = Math.min(1, s / .4) * (s < 2.2 ? 1 : Math.max(0, 1 - (s - 2.2) / .3));
    ctx.globalAlpha = a;
    const rim = ctx.createRadialGradient(cx, cy, R * .96, cx, cy, R * 1.12); rim.addColorStop(0, 'rgba(150,215,255,.9)'); rim.addColorStop(1, 'rgba(110,180,255,0)');
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, 6.283); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.clip();
    ctx.translate(cx, cy);
    const og = ctx.createRadialGradient(-R * .3, -R * .3, R * .05, 0, 0, R); og.addColorStop(0, '#5BA9E6'); og.addColorStop(1, '#14385E'); ctx.fillStyle = og; ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.save(); ctx.rotate(rm ? 0 : sa);                                // continents and cloud swirls turn slowly with the planet
    ctx.fillStyle = 'rgba(88,152,66,.95)'; [[-.35, -.15, .42, .22, -.4], [.3, .3, .36, .2, .5], [.05, -.55, .2, .12, .1], [-.1, .62, .3, .1, -.2]].forEach(L => { ctx.beginPath(); ctx.ellipse(L[0] * R, L[1] * R, L[2] * R, L[3] * R, L[4], 0, 6.283); ctx.fill(); });
    ctx.fillStyle = 'rgba(196,166,96,.9)'; [[-.28, -.12, .16, .08, -.4], [.34, .32, .12, .07, .5]].forEach(L => { ctx.beginPath(); ctx.ellipse(L[0] * R, L[1] * R, L[2] * R, L[3] * R, L[4], 0, 6.283); ctx.fill(); });
    ctx.fillStyle = 'rgba(255,255,255,.6)'; [[.1, -.3, .5, .07, .3], [-.4, .35, .45, .06, -.2], [.45, -.5, .3, .05, .6], [-.1, .1, .6, .05, .1]].forEach(L => { ctx.beginPath(); ctx.ellipse(L[0] * R, L[1] * R, L[2] * R, L[3] * R, L[4], 0, 6.283); ctx.fill(); });
    ctx.restore();
    const sh = ctx.createRadialGradient(-R * .35, -R * .35, R * .35, 0, 0, R * 1.05); sh.addColorStop(0, 'rgba(0,10,30,0)'); sh.addColorStop(1, 'rgba(0,10,30,.6)'); ctx.fillStyle = sh; ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  const ak = s < 2.4 ? lcEase((s - 1.0) / 1.4) : 1 - lcEase((s - 2.4) / 1.9);        // sky haze: closes over the screen at the swap, then lifts
  if (ak > .005) {
    if (s > .9 && s < 2.2 && !rm) {                                    // re-entry: a hot glow licking in from the screen edges
      const hk = Math.sin((s - .9) / 1.3 * Math.PI) * .5, rg = ctx.createRadialGradient(ST.W / 2, ST.H * .6, ST.H * .25, ST.W / 2, ST.H * .6, ST.H * .85);
      rg.addColorStop(0, 'rgba(255,150,70,0)'); rg.addColorStop(1, 'rgba(255,120,50,' + hk + ')'); ctx.fillStyle = rg; ctx.fillRect(-20, -20, ST.W + 40, ST.H + 40);
    }
    const sg = ctx.createLinearGradient(0, 0, 0, ST.H); sg.addColorStop(0, 'rgba(70,140,215,' + (ak * .92) + ')'); sg.addColorStop(.6, 'rgba(150,200,240,' + (ak * .95) + ')'); sg.addColorStop(1, 'rgba(225,238,248,' + (ak * .98) + ')');
    ctx.fillStyle = sg; ctx.fillRect(-20, -20, ST.W + 40, ST.H + 40);
  }
  const ck = lcEase((s - 1.3) / .8) * (s < 3.6 ? 1 : 1 - lcEase((s - 3.6) / 1.2));
  if (ck > .01) {                                                      // cloud banks rushing past: each puff grows and drifts outward from the middle as we drop through
    const sp = lcSprite(), N = ST.lowFx ? 10 : 20, cx = ST.W / 2, cy = ST.H * .42;
    for (let i = 0; i < N; i++) {
      const sd = nmRnd(i * 7.3 + 2), rx = nmRnd(i * 3.1 + 5) - .5, ry = nmRnd(i * 5.9 + 1) - .5;
      const z = ((rm ? 0 : s * (.28 + sd * .3)) + sd * 3.7) % 1, sc = .35 + z * 3.4;
      ctx.globalAlpha = ck * Math.sin(z * Math.PI) * .9;
      ctx.drawImage(sp, cx + rx * ST.W * 2.2 * z - 80 * sc, cy + ry * ST.H * 1.6 * z - 50 * sc, 160 * sc, 100 * sc);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
export function drawBufSpin(x, y, t) {
  ctx.save(); ctx.strokeStyle = 'rgba(255,251,150,.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 19, t * 8, t * 8 + 4.2); ctx.stroke(); ctx.restore();
}
// CRT at high heat: barrel-curved rows, red/cyan colour fringing, rounded dark corners, a vignette that pulses with the beat
// Matrix rain over every stage jump: fades in, full over the swap, fades out
export const MX_CH = [];  export function drawMatrix(t) {
  const p = ST.trans.t, a = p < .5 ? p / .5 : p > 3.0 ? Math.max(0, (3.6 - p) / .6) : 1;
  if (a <= 0.01) return;
  const cw = ST.lowFx ? 24 : 16, cols = Math.ceil(ST.W / cw), tl = ST.lowFx ? 9 : 16, sp = reduceMotion ? 0 : 1;
  ctx.save();
  ctx.fillStyle = 'rgba(0,14,5,' + (.5 * a) + ')'; ctx.fillRect(0, 0, ST.W, ST.H);
  ctx.font = '700 ' + (cw - 2) + 'px ui-monospace, Menlo, Consolas, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let c = 0; c < cols; c++) {
    const sd = nmRnd(c * 3.7 + 1), spd = 160 + sd * 260, off = nmRnd(c * 9.1) * (ST.H + tl * cw);
    const head = (off + t * spd * sp) % (ST.H + tl * cw);
    for (let r = 0; r < tl; r++) {
      const y = head - r * cw; if (y < -cw || y > ST.H) continue;
      const ch = MX_CH[(nmRnd(c * 13.1 + r * 5.3 + Math.floor(t * 9 + (r === 0 ? 0 : c))) * MX_CH.length) | 0];
      ctx.globalAlpha = a * (r === 0 ? 1 : Math.max(.08, 1 - r / tl) * .85);
      ctx.fillStyle = r === 0 ? '#D8FFE2' : r < 3 ? '#4DFF8A' : '#00B84A';
      ctx.fillText(ch, c * cw + cw / 2, y);
    }
  }
  ctx.restore();
}
function crtAmount() { return reduceMotion || ST.lowFx ? 0 : ST.uw[4] * Math.max(0, Math.min(1, (ST.dispD - .5) / .5)); }
export function drawCRT(t, pulse) {
  const a = crtAmount(); if (a < .04) return;
  if (!crtA || crtA.width !== cv.width || crtA.height !== cv.height) {
    crtA = document.createElement('canvas'); crtB = document.createElement('canvas');
    crtA.width = crtB.width = cv.width; crtA.height = crtB.height = cv.height;
    crtAx = crtA.getContext('2d'); crtBx = crtB.getContext('2d');
  }
  const w = cv.width, h = cv.height;
  crtAx.globalCompositeOperation = 'copy'; crtAx.drawImage(cv, 0, 0); crtAx.globalCompositeOperation = 'multiply'; crtAx.fillStyle = '#ff0000'; crtAx.fillRect(0, 0, w, h);
  crtBx.globalCompositeOperation = 'copy'; crtBx.drawImage(cv, 0, 0); crtBx.globalCompositeOperation = 'multiply'; crtBx.fillStyle = '#00ffff'; crtBx.fillRect(0, 0, w, h);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#06020f'; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  const N = 30, k = .045 * a, fr = (.4 + 1.3 * a) * (1 + .5 * pulse) * ST.DPR;
  for (let i = 0; i < N; i++) {
    const y0 = Math.floor(i * h / N), hh = Math.floor((i + 1) * h / N) - y0, dd = ((i + .5) / N) * 2 - 1, sc = 1 - k * dd * dd, dw = w * sc, dx = (w - dw) / 2;
    ctx.drawImage(crtA, 0, y0, w, hh, dx - fr, y0, dw, hh);
    ctx.drawImage(crtB, 0, y0, w, hh, dx + fr, y0, dw, hh);
  }
  ctx.restore();
  ctx.save();
  const r = 26 + 14 * a;
  ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = '#06020f'; ctx.beginPath(); ctx.rect(-2, -2, ST.W + 4, ST.H + 4);
  ctx.moveTo(r, 0); ctx.arcTo(ST.W, 0, ST.W, ST.H, r); ctx.arcTo(ST.W, ST.H, 0, ST.H, r); ctx.arcTo(0, ST.H, 0, 0, r); ctx.arcTo(0, 0, ST.W, 0, r); ctx.closePath(); ctx.fill('evenodd');
  ctx.globalAlpha = 1;
  const v = a * (.28 + .22 * pulse + .06 * Math.sin(t * 1.7)), vg = ctx.createRadialGradient(ST.W / 2, ST.H / 2, Math.min(ST.W, ST.H) * .3, ST.W / 2, ST.H / 2, Math.max(ST.W, ST.H) * .72);
  vg.addColorStop(0, 'rgba(8,0,24,0)'); vg.addColorStop(1, 'rgba(8,0,24,' + v + ')'); ctx.fillStyle = vg; ctx.fillRect(0, 0, ST.W, ST.H);
  ctx.restore();
}


// ---------- Neon Mirage (stage 5): flat 2D vaporwave sky. Everything drifts down because the moth flies up
const NM_COLS = 9;                          // vertical grid lines across the screen
// spawn table, same idea as the space one: [kind, chance %]; common first, rare last; rare kinds roll first and get 2 extra slots
const NM_TABLE = [['window', 30], ['orb', 25], ['bust', 20], ['palm', 20], ['pyramid', 10], ['floppy', 10], ['cassette', 8], ['cursor', 7], ['sparkle', 7],
  ['cube', 5], ['kana', 5], ['heart', 4], ['smiley', 3], ['dolphin', 3], ['cd', 3], ['tv', 2], ['errwin', 2], ['glitchblock', 1]];
const NM_SZ = { window: [24, 40], orb: [24, 40], bust: [24, 38], palm: [22, 36], pyramid: [24, 38], floppy: [22, 34], cassette: [22, 34], cursor: [22, 34], sparkle: [14, 26],
  cube: [22, 34], kana: [16, 26], heart: [18, 28], smiley: [20, 32], dolphin: [30, 46], cd: [22, 34], tv: [22, 34], errwin: [24, 36], glitchblock: [22, 36] };
const NM_KANA = ['ネオン', 'ドリーム', '夢', '愛', '未来', '電脳', '幻想', '永遠', 'ヴェイパー'];
const KANA_RAIN = 'ネオンドリームヴェイパーウェーブ夢愛未来電脳サイバー幻想永遠';
function nmPick() { let sum = 0; for (const e of NM_TABLE) sum += e[1]; let r = Math.random() * sum; for (const e of NM_TABLE) { r -= e[1]; if (r <= 0) return e[0]; } return 'window'; }
export function spawnProp(init, kind) {
  const R = (a, b) => a + Math.random() * (b - a);
  kind = kind || nmPick();
  const sz = NM_SZ[kind];
  ST.props.push({ kind, x: R(.12, .88) * ST.W, y: init ? R(.04, .6) * ST.H : -110, r: R(sz[0], sz[1]), vy: R(7, 20), vx: R(-3, 3), tilt: kind === 'palm' ? R(-.15, .15) : R(-.3, .3),
    ph: Math.random() * 6.28, gt: -1, txt: NM_KANA[(Math.random() * NM_KANA.length) | 0] });
}
export function nmSpawnTick() {
  let n = ST.props.length; const cap = Math.round((3 + ST.tierShown) * BGK);
  for (let k = NM_TABLE.length - 1; k >= 0; k--) {
    const kind = NM_TABLE[k][0], pct = NM_TABLE[k][1];
    if (Math.random() * 100 >= pct) continue;
    if (n >= cap + (pct <= 5 ? 2 : 0)) continue;
    spawnProp(false, kind); n++;
  }
}
function drawPalm(s, t, gl) {
  const sway = Math.sin(t * .9) * s * .04, tx = s * .04 + sway * 2, ty = -s;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12052b'; ctx.lineWidth = Math.max(2, s * .06);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * .1 + sway, -s * .5, tx, ty); ctx.stroke();
  ctx.fillStyle = '#12052b';
  const leaves = () => {
    ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const d = (k - 3) / 3, ad = Math.abs(d), len = s * (.62 - ad * .1), dr = Math.sin(t * 1.3 + k) * s * .012;
      const ex = tx + d * len + (d === 0 ? s * .04 : 0), ey = ty + s * (.1 + ad * .28) + dr, cx1 = tx + d * len * .45, cy1 = ty - s * (.3 - ad * .1);
      ctx.moveTo(tx, ty); ctx.quadraticCurveTo(cx1, cy1, ex, ey); ctx.quadraticCurveTo(cx1 + d * s * .02, cy1 + s * .1, tx, ty);
    }
  };
  leaves(); ctx.fill();
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = gl ? '#05d9e8' : '#ff71ce'; ctx.lineWidth = Math.max(.8, s * .014);
  leaves(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * .1 + sway, -s * .5, tx, ty); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
}
function drawPyramid(s, gl) {
  const hw = s * .55, h = s * .75;
  const g = ctx.createLinearGradient(0, -h, 0, 0);
  g.addColorStop(0, 'rgba(125,249,255,.55)'); g.addColorStop(1, 'rgba(120,50,220,.35)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(0, -h); ctx.lineTo(hw, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(20,5,50,.35)'; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(hw, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = gl ? '#ff71ce' : '#7df9ff'; ctx.lineWidth = Math.max(1, s * .02);
  ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(0, -h); ctx.lineTo(hw, 0); ctx.closePath(); ctx.stroke();
}
export function drawBustProp(r, gl) {                // marble bust
  glow(0, 0, r * 2, 'rgba(125,249,255,1)', .22);
  const mb = ctx.createLinearGradient(-r, -r, r, r); mb.addColorStop(0, '#f6eeff'); mb.addColorStop(1, '#a995d6');
  ctx.fillStyle = mb;
  ctx.beginPath(); ctx.moveTo(-r * 1.15, r * 1.1); ctx.quadraticCurveTo(-r * 1.1, r * .45, -r * .35, r * .4); ctx.lineTo(r * .35, r * .4); ctx.quadraticCurveTo(r * 1.1, r * .45, r * 1.15, r * 1.1); ctx.closePath(); ctx.fill();
  ctx.fillRect(-r * .2, r * .1, r * .4, r * .45);
  ctx.beginPath(); ctx.ellipse(0, -r * .35, r * .5, r * .65, 0, 0, 6.283); ctx.fill();
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * r * .2, -r * .95 + Math.abs(i) * r * .1, r * .17, 0, 6.283); ctx.fill(); }
  ctx.strokeStyle = 'rgba(70,40,120,.55)'; ctx.lineWidth = Math.max(1, r * .05); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-r * .2, -r * .42, r * .09, .15, Math.PI - .15); ctx.stroke();
  ctx.beginPath(); ctx.arc(r * .2, -r * .42, r * .09, .15, Math.PI - .15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -r * .45); ctx.lineTo(-r * .05, -r * .22); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = gl ? 'rgba(255,113,206,.85)' : 'rgba(125,249,255,.55)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(0, -r * .35, r * .5, r * .65, 0, 0, 6.283); ctx.stroke();
}
function drawWinProp(r, gl) {                 // retro desktop window
  const w = r * 2.3, h = r * 1.7, x = -w / 2, y = -h / 2, tb = r * .38;
  const bg = ctx.createLinearGradient(0, y, 0, y + h); bg.addColorStop(0, 'rgba(255,232,250,.88)'); bg.addColorStop(1, 'rgba(160,200,255,.82)');
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  const tg = ctx.createLinearGradient(x, 0, x + w, 0); tg.addColorStop(0, '#ff4fb8'); tg.addColorStop(1, '#5d4bff');
  ctx.fillStyle = tg; ctx.fillRect(x, y, w, tb);
  ctx.fillStyle = '#fffb96'; for (let i = 0; i < 3; i++) ctx.fillRect(x + w - (i + 1) * tb * .7 - 3, y + tb * .2, tb * .55, tb * .6);
  const by = y + tb, bh = h - tb;
  ctx.fillStyle = '#ff71ce'; ctx.beginPath(); ctx.arc(0, by + bh * .55, r * .32, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#05d9e8'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i < 4; i++) { const yy = by + bh * (.6 + i * .11); ctx.moveTo(x + 5, yy); ctx.lineTo(x + w - 5, yy); }
  ctx.stroke();
  ctx.strokeStyle = gl ? '#ff71ce' : '#05ffa1'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
}
function drawCheckerOrb(r, t) {
  glow(0, 0, r * 1.8, 'rgba(255,113,206,1)', .2);
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.clip();
  ctx.fillStyle = '#ff71ce'; ctx.fillRect(-r, -r, r * 2, r * 2);
  const c = r / 1.6, off = (t * 10) % (c * 2);
  ctx.fillStyle = '#7df9ff';
  for (let iy = -3; iy <= 3; iy++) for (let ix = -4; ix <= 3; ix++) if (((ix + iy) & 1) === 0) ctx.fillRect(ix * c - off + c, iy * c, c, c);
  const sh = ctx.createRadialGradient(-r * .35, -r * .35, r * .1, 0, 0, r);
  sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(40,0,90,.6)');
  ctx.fillStyle = sh; ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}
export function nmRR(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawFloppy(r, gl) {
  const s = r * 1.8, x = -s / 2, y = -s / 2;
  ctx.fillStyle = gl ? '#ff71ce' : '#4d6bff'; nmRR(x, y, s, s, s * .08); ctx.fill();
  ctx.fillStyle = '#d8d8ee'; ctx.fillRect(x + s * .22, y, s * .52, s * .32); ctx.fillStyle = '#2a2a5a'; ctx.fillRect(x + s * .56, y + s * .05, s * .1, s * .2);
  ctx.fillStyle = '#fff6fb'; ctx.fillRect(x + s * .14, y + s * .52, s * .72, s * .4);
  ctx.fillStyle = '#ff71ce'; ctx.fillRect(x + s * .2, y + s * .6, s * .6, s * .04); ctx.fillRect(x + s * .2, y + s * .72, s * .4, s * .04);
  ctx.strokeStyle = gl ? '#05d9e8' : '#7df9ff'; ctx.lineWidth = 1.5; nmRR(x, y, s, s, s * .08); ctx.stroke();
}
function drawCassette(r, gl) {
  const w = r * 2.5, h = r * 1.6, x = -w / 2, y = -h / 2;
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#ff9bd8'); g.addColorStop(1, '#b967ff');
  ctx.fillStyle = g; nmRR(x, y, w, h, r * .12); ctx.fill();
  ctx.fillStyle = '#fff6fb'; ctx.fillRect(x + w * .1, y + h * .12, w * .8, h * .36);
  ctx.fillStyle = '#ff3fa4'; ctx.fillRect(x + w * .14, y + h * .2, w * .4, h * .05);
  ctx.fillStyle = '#2a1a5a'; nmRR(x + w * .28, y + h * .56, w * .44, h * .3, h * .15); ctx.fill();
  ctx.fillStyle = '#fff'; for (const sx of SIDES) { ctx.beginPath(); ctx.arc(sx * w * .13, y + h * .71, h * .09, 0, 6.283); ctx.fill(); }
  ctx.strokeStyle = gl ? '#ff71ce' : '#7df9ff'; ctx.lineWidth = 1.5; nmRR(x, y, w, h, r * .12); ctx.stroke();
}
function drawCursor(r, gl) {
  const P = [[0, 0], [0, 1.55], [.4, 1.2], [.72, 1.9], [.98, 1.78], [.68, 1.1], [1.1, 1.1]], k = r * .9, ox = -.5 * k, oy = -.95 * k;
  const path = d => { ctx.beginPath(); P.forEach((q, i) => i ? ctx.lineTo(ox + q[0] * k + d, oy + q[1] * k + d) : ctx.moveTo(ox + q[0] * k + d, oy + q[1] * k + d)); ctx.closePath(); };
  ctx.fillStyle = gl ? '#ff71ce' : '#05d9e8'; path(r * .12); ctx.fill();
  ctx.fillStyle = '#fff'; path(0); ctx.fill(); ctx.strokeStyle = '#14082e'; ctx.lineWidth = Math.max(1.5, r * .08); ctx.lineJoin = 'round'; ctx.stroke();
}
function drawSparkle(r, t, ph) {
  const k = r * (.85 + .15 * Math.sin(t * 3 + ph));
  glow(0, 0, r * 2.2, 'rgba(255,200,240,1)', .35);
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#fff'; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, d = i % 2 ? k * .2 : k; ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d); }
  ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
}
function drawCube(r, t, ph, gl) {
  const V = [], ay = t * .6 + ph, ax = .55 + .2 * Math.sin(t * .3 + ph), ca = Math.cos(ay), sa = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax), k = r * .62;
  for (let i = 0; i < 8; i++) { const x = (i & 1 ? 1 : -1), y = (i & 2 ? 1 : -1), z = (i & 4 ? 1 : -1); const x1 = x * ca + z * sa, z1 = -x * sa + z * ca; V.push([x1 * k, (y * cx - z1 * sx) * k]); }
  ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1.6; ctx.strokeStyle = gl ? 'rgba(255,113,206,.95)' : 'rgba(125,249,255,.9)'; ctx.beginPath();
  for (let i = 0; i < 8; i++) for (const b of [1, 2, 4]) if (!(i & b)) { ctx.moveTo(V[i][0], V[i][1]); ctx.lineTo(V[i | b][0], V[i | b][1]); }
  ctx.stroke(); ctx.strokeStyle = 'rgba(255,113,206,.35)'; ctx.lineWidth = 3.5; ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
}
function drawKanaProp(r, txt, gl) {
  ctx.font = '700 ' + (r * 1.3) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(5,217,232,.8)'; ctx.fillText(txt, r * .08 + (gl ? 4 : 0), 0);
  ctx.fillStyle = 'rgba(255,60,200,.8)'; ctx.fillText(txt, -r * .08 - (gl ? 4 : 0), 0); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillText(txt, 0, 0); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}
function drawPixHeart(r, gl) {
  const rows = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'], c = r * .3, x0 = -3.5 * c, y0 = -3 * c;
  for (const [col, d] of [[gl ? '#ff71ce' : '#05d9e8', c * .25], ['#ff3fa4', 0]]) {
    ctx.fillStyle = col; rows.forEach((row, j) => { for (let i = 0; i < 7; i++) if (row[i] === '1') ctx.fillRect(x0 + i * c + d, y0 + j * c + d, c, c); });
  }
  ctx.fillStyle = '#fff'; ctx.fillRect(x0 + c, y0 + c * .5, c, c);
}
function drawSmiley(r, gl) {
  const g = ctx.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r); g.addColorStop(0, '#fffbc2'); g.addColorStop(1, '#ffc94d');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#5a2a8a'; ctx.beginPath(); ctx.ellipse(-r * .33, -r * .2, r * .1, r * .17, 0, 0, 6.283); ctx.ellipse(r * .33, -r * .2, r * .1, r * .17, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = '#5a2a8a'; ctx.lineWidth = Math.max(1.5, r * .1); ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, r * .05, r * .5, .25, Math.PI - .25); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.strokeStyle = gl ? '#ff71ce' : '#ff9bd8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke();
}
function drawDolphin(r, gl) {
  const g = ctx.createLinearGradient(0, -r * .8, 0, r * .5); g.addColorStop(0, '#9ff3ff'); g.addColorStop(1, '#ff9bd8');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-1.25 * r, -.05 * r);
  ctx.quadraticCurveTo(-.8 * r, -.5 * r, -.25 * r, -.62 * r); ctx.quadraticCurveTo(.5 * r, -.8 * r, .95 * r, -.2 * r);
  ctx.lineTo(1.3 * r, -.62 * r); ctx.quadraticCurveTo(1.18 * r, -.1 * r, 1.32 * r, .3 * r); ctx.lineTo(.92 * r, .08 * r);
  ctx.quadraticCurveTo(.25 * r, .55 * r, -.5 * r, .32 * r); ctx.quadraticCurveTo(-.95 * r, .2 * r, -1.25 * r, -.05 * r); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-.05 * r, -.7 * r); ctx.lineTo(.2 * r, -1.1 * r); ctx.lineTo(.4 * r, -.68 * r); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-.3 * r, .25 * r); ctx.lineTo(-.1 * r, .65 * r); ctx.lineTo(.1 * r, .35 * r); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a1a6a'; ctx.beginPath(); ctx.arc(-.7 * r, -.14 * r, r * .06, 0, 6.283); ctx.fill();
  ctx.strokeStyle = gl ? '#ff71ce' : 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-1.25 * r, -.05 * r);
  ctx.quadraticCurveTo(-.8 * r, -.5 * r, -.25 * r, -.62 * r); ctx.quadraticCurveTo(.5 * r, -.8 * r, .95 * r, -.2 * r); ctx.stroke();
}
function drawCDProp(r, t, ph, gl) {
  glow(0, 0, r * 1.8, 'rgba(125,249,255,1)', .22);
  const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#9ff3ff'); g.addColorStop(.3, '#ff9bd8'); g.addColorStop(.55, '#fff6a8'); g.addColorStop(.8, '#b967ff'); g.addColorStop(1, '#7df9ff');
  ctx.save(); ctx.rotate(t * .5 + ph);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(0, 0, r * .36, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#2a1a5a'; ctx.beginPath(); ctx.arc(0, 0, r * .14, 0, 6.283); ctx.fill();
  ctx.strokeStyle = gl ? '#ff71ce' : 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke(); ctx.restore();
}
function drawTVProp(r, t, gl) {
  const w = r * 2.2, h = r * 1.8, x = -w / 2, y = -h / 2;
  ctx.strokeStyle = '#d9d2ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * .3, y); ctx.lineTo(-r * .7, y - r * .55); ctx.moveTo(r * .3, y); ctx.lineTo(r * .7, y - r * .55); ctx.stroke();
  ctx.fillStyle = '#b9aee8'; nmRR(x, y, w, h, r * .2); ctx.fill();
  const sx = x + w * .08, sy = y + h * .12, sw = w * .84, sh = h * .76, B = ['#fff', '#ffe36b', '#7df9ff', '#7dff9b', '#ff71ce', '#ff4d6d', '#6a5bff'];
  ctx.save(); nmRR(sx, sy, sw, sh, r * .12); ctx.clip();
  B.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(sx + sw / 7 * i + (gl ? (i % 2 ? 4 : -4) : 0), sy, sw / 7 + 1, sh); });
  ctx.fillStyle = 'rgba(20,5,50,.28)'; for (let yy = sy; yy < sy + sh; yy += 3) ctx.fillRect(sx, yy, sw, 1.2); ctx.restore();
  ctx.strokeStyle = gl ? '#ff71ce' : '#7df9ff'; ctx.lineWidth = 1.5; nmRR(x, y, w, h, r * .2); ctx.stroke();
}
function drawErrWin(r, gl) {
  const w = r * 2.5, h = r * 1.7, x = -w / 2, y = -h / 2, tb = h * .22;
  ctx.fillStyle = '#c9c6dd'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, 1.5); ctx.fillRect(x, y, 1.5, h);
  const tg = ctx.createLinearGradient(x, 0, x + w, 0); tg.addColorStop(0, '#2b1b8f'); tg.addColorStop(1, '#ff4fb8'); ctx.fillStyle = tg; ctx.fillRect(x + 3, y + 3, w - 6, tb);
  ctx.fillStyle = '#c9c6dd'; ctx.fillRect(x + w - tb - 3, y + 5, tb * .8, tb * .8);
  ctx.fillStyle = '#e0245e'; ctx.beginPath(); ctx.arc(x + w * .2, y + h * .6, h * .17, 0, 6.283); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); const q = h * .08, cx = x + w * .2, cy = y + h * .6; ctx.moveTo(cx - q, cy - q); ctx.lineTo(cx + q, cy + q); ctx.moveTo(cx + q, cy - q); ctx.lineTo(cx - q, cy + q); ctx.stroke();
  ctx.fillStyle = '#4a4670'; ctx.fillRect(x + w * .38, y + h * .46, w * .5, 2.5); ctx.fillRect(x + w * .38, y + h * .62, w * .36, 2.5);
  ctx.fillStyle = '#c9c6dd'; ctx.fillRect(x + w * .38, y + h * .76, w * .24, h * .14); ctx.strokeStyle = '#6a6890'; ctx.lineWidth = 1; ctx.strokeRect(x + w * .38, y + h * .76, w * .24, h * .14);
  ctx.strokeStyle = gl ? '#ff71ce' : '#05ffa1'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
}
function drawGlitchBlock(r, t, ph, gl) {
  const C = ['5,217,232', '255,60,200', '185,103,255', '255,240,140'];
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const w = r * (.8 + Math.abs(Math.sin(ph * (i + 1))) * 1.4), h = r * (.14 + Math.abs(Math.cos(ph * (i + 2))) * .4), jx = Math.sin(t * 7 + i * 2 + ph) > .75 || gl ? (i % 2 ? 7 : -7) : 0;
    ctx.fillStyle = 'rgba(' + C[i % 4] + ',.6)'; ctx.fillRect(-w / 2 + Math.sin(ph + i) * r * .3 + jx, -r + i * r * .42, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';
}
function nmKana(t) {
  if (ST.lowFx) return;
  if (!kanaCols.length) for (let i = 0, nk = Math.round(6 * BGK); i < nk; i++) kanaCols.push({ fx: (i + .5) / nk + (Math.random() - .5) * .05, off: Math.random() * 2000, spd: .5 + Math.random() * .9, len: 6 + ((Math.random() * 6) | 0), seed: Math.random() * 100 });
  ctx.font = '700 17px sans-serif'; ctx.textAlign = 'center'; const step = 21;
  for (let ci = 0; ci < kanaCols.length; ci++) {
    const c = kanaCols[ci], span = ST.H + c.len * step, y0 = ((ST.nebScroll * c.spd * .6 + c.off) % span) - c.len * step, x = c.fx * ST.W, pink = ci % 2;
    for (let k = 0; k < c.len; k++) {
      const y = y0 + k * step; if (y < -step || y > ST.H + step) continue;
      const head = k === c.len - 1, idx = Math.floor(c.seed + k * 3.7 + Math.floor(t * (head ? 6 : .6)));
      ctx.fillStyle = head ? 'rgba(255,255,255,.5)' : 'rgba(' + (pink ? '255,113,206' : '125,249,255') + ',' + (.05 + k / c.len * .2) + ')';
      ctx.fillText(KANA_RAIN[((idx % KANA_RAIN.length) + KANA_RAIN.length) % KANA_RAIN.length], x, y);
    }
  }
  ctx.textAlign = 'left';
}
export function drawNeon(t, pulse) {
  const w4 = ST.uw[4]; if (w4 < .01) return;
  const cx = ST.W / 2, hd = Math.min(1, ST.dispD);
  ctx.save(); ctx.globalAlpha = w4;
  // flat sky: deep violet at the top, dusky magenta at the bottom (kept a bit dark so text and orbs read)
  const sk = ctx.createLinearGradient(0, 0, 0, ST.H);
  sk.addColorStop(0, '#0e0433'); sk.addColorStop(.4, '#33126f'); sk.addColorStop(.78, '#5d2292'); sk.addColorStop(1, '#7c2f86');
  ctx.fillStyle = sk; ctx.fillRect(-ST.W * .6, -ST.H * .35, ST.W * 2.2, ST.H * 1.7);
  // dreamwave: wide pastel bands drifting down
  const BC = ['125,249,255', '255,113,206', '185,103,255'];
  for (let i = 0; i < 3; i++) {
    const sp = ST.H + 360, y = ((ST.nebScroll * .28 * (1 + i * .35) + i * sp / 3) % sp) - 180;
    const bg = ctx.createLinearGradient(0, y - 120, 0, y + 120); bg.addColorStop(0, 'rgba(' + BC[i] + ',0)'); bg.addColorStop(.5, 'rgba(' + BC[i] + ',' + (.1 + hd * .05) + ')'); bg.addColorStop(1, 'rgba(' + BC[i] + ',0)');
    ctx.fillStyle = bg; ctx.fillRect(0, y - 120, ST.W, 240);
  }
  // pastel clouds
  const CC = ['255,150,225', '130,240,255', '200,160,255'];
  for (const b of ST.blobs) {
    if (ST.lowFx && b.i > 2) continue;
    const x = b.x * ST.W + Math.sin(t * .1 + b.ph) * 40, span = ST.H + b.r * 2, y = ((b.y * ST.H + ST.nebScroll * .35 * (.5 + b.r / 250)) % span) - b.r;
    glow(x, y, b.r * .9, 'rgba(' + CC[b.i % 3] + ',1)', .15);
  }
  // sparkles: the bigger stars become Y2K four-point twinkles
  ctx.fillStyle = '#fff';
  for (const s of ST.stars) {
    if (ST.lowFx && s.layer === 0) continue;
    const tw = .3 + .45 * Math.abs(Math.sin(t * 1.4 + s.tw));
    ctx.globalAlpha = w4 * tw * (1 - s.y / ST.H * .5);
    if (s.layer === 2) { const k = 3 + 2 * tw; ctx.beginPath(); ctx.moveTo(s.x, s.y - k * 2); ctx.lineTo(s.x + k * .3, s.y - k * .3); ctx.lineTo(s.x + k * 2, s.y); ctx.lineTo(s.x + k * .3, s.y + k * .3); ctx.lineTo(s.x, s.y + k * 2); ctx.lineTo(s.x - k * .3, s.y + k * .3); ctx.lineTo(s.x - k * 2, s.y); ctx.lineTo(s.x - k * .3, s.y - k * .3); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
  }
  ctx.globalAlpha = w4;
  nmKana(t);
  glow(cx, ST.H, ST.W * .9, 'rgba(255,113,206,1)', .2);
  // flat grid scrolling down (cyan turns hot pink with heat)
  const gc = (lerp(40, 255, hd) | 0) + ',' + (lerp(225, 70, hd) | 0) + ',' + (lerp(245, 215, hd) | 0), cell = (ST.W - 2 * ST.bgS) / NM_COLS, off = (ST.gridScroll * cell) % cell;   // cells stay square: sized by the stage, not the whole world
  ctx.strokeStyle = 'rgba(' + gc + ',.2)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = -Math.ceil(ST.bgS / cell); i <= NM_COLS + Math.ceil(ST.bgS / cell); i++) { const gx = ST.bgS + i * cell; ctx.moveTo(gx, -ST.H * .35); ctx.lineTo(gx, ST.H * 1.35); }
  for (let y = off - cell * Math.ceil(ST.H * .35 / cell); y < ST.H * 1.35; y += cell) { ctx.moveTo(0, y); ctx.lineTo(ST.W, y); }
  ctx.stroke();
  // floating props, all drifting down
  for (const p of ST.props) {
    const gl = p.gt > 0, k = p.kind;
    ctx.save(); ctx.translate(p.x + (gl ? (Math.random() - .5) * 18 : 0), p.y + Math.sin(t * .8 + p.ph) * 4);
    ctx.rotate(p.tilt + Math.sin(t * .5 + p.ph) * .08);
    ctx.globalAlpha = w4 * (gl ? .55 : .9);
    if (k === 'bust') drawBustProp(p.r, gl); else if (k === 'window') drawWinProp(p.r, gl); else if (k === 'orb') drawCheckerOrb(p.r, t + p.ph);
    else if (k === 'pyramid') { ctx.translate(0, p.r * .4); drawPyramid(p.r * 2.2, gl); }
    else if (k === 'palm') { ctx.translate(0, p.r * 1.1); drawPalm(p.r * 2.4, t + p.ph, gl); }
    else if (k === 'floppy') drawFloppy(p.r, gl); else if (k === 'cassette') drawCassette(p.r, gl); else if (k === 'cursor') drawCursor(p.r, gl);
    else if (k === 'sparkle') drawSparkle(p.r, t, p.ph); else if (k === 'cube') drawCube(p.r, t, p.ph, gl); else if (k === 'kana') drawKanaProp(p.r, p.txt, gl);
    else if (k === 'heart') drawPixHeart(p.r, gl); else if (k === 'smiley') drawSmiley(p.r, gl); else if (k === 'dolphin') drawDolphin(p.r, gl);
    else if (k === 'cd') drawCDProp(p.r, t, p.ph, gl); else if (k === 'tv') drawTVProp(p.r, t, gl); else if (k === 'errwin') drawErrWin(p.r, gl);
    else drawGlitchBlock(p.r, t, p.ph, gl);
    ctx.restore();
  }
  ctx.restore();
}
export function drawNeonFx(t) {                      // glitch tears, scanlines and static bars, drawn over the background only
  const w4 = ST.uw[4]; if (w4 < .01) return;
  if (ST.tearLife > 0 && !ST.lowFx && !reduceMotion) {
    const y = Math.max(0, Math.min(ST.H - ST.tearH, ST.tearY));
    ctx.save(); ctx.setTransform(ST.DPR, 0, 0, ST.DPR, 0, 0); ctx.globalAlpha = w4; ctx.drawImage(cv, 0, Math.round(y * ST.DPR), cv.width, Math.max(1, Math.round(ST.tearH * ST.DPR)), ST.tearDX, y, ST.W - 2 * ST.bgS, ST.tearH); ctx.restore();
  }
  if (ST.scanPat && !ST.lowFx) {
    ctx.save(); ctx.globalAlpha = w4 * (.12 + ST.dispD * .1); ctx.translate(0, reduceMotion ? 0 : (t * 18) % 4); ctx.fillStyle = ST.scanPat; ctx.fillRect(-ST.W, -ST.H * .35, ST.W * 3, ST.H * 1.7); ctx.restore();
  }
  if (ST.statLife > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const a = w4 * Math.min(1, ST.statLife * 8);
    ctx.globalAlpha = a * .1; ctx.fillStyle = '#d9f6ff'; ctx.fillRect(-ST.W, ST.statY, ST.W * 3, ST.statH);
    ctx.globalAlpha = a * .22; ctx.fillStyle = '#05d9e8'; ctx.fillRect(-ST.W, ST.statY - 3, ST.W * 3, 2); ctx.fillStyle = '#ff3cc8'; ctx.fillRect(-ST.W, ST.statY + ST.statH + 1, ST.W * 3, 2);
    ctx.restore();
  }
}
export const bgOn = (x, pad) => x + pad >= ST.bgLo && x - pad <= ST.bgHi;
export function bgCullSet() {
  if (ST.PVX || ST.CINE || ST.state === 'pv' || !ST.bgS || !ST.wBase) { ST.bgLo = -1e9; ST.bgHi = 1e9; return; }
  const ex = bgSlide ? EC.x : 0, M = 90 + (bgSlide ? Math.abs(EC.roll) * ST.H * 1.2 : 0);
  ST.bgLo = ST.bgS + ex - M; ST.bgHi = ST.bgS + ex + ST.wBase + M;
}
export function drawBG(t, pulse, slide) {
  const S = stripW() + bgM();
  ctx.save();
  if (slide) ecApply(1);
  ctx.translate(-S, 0);
  ST.wBase = ST.W; ST.W = ST.wBase + 2 * S; ST.bgS = S; bgSlide = !!slide;
  try { drawBackground(t, pulse); } finally { ST.W = ST.wBase; ST.wBase = 0; ST.bgS = 0; ST.bgLo = -1e9; ST.bgHi = 1e9; ctx.restore(); }
}

// ---------- Y2K glitch transition: only when entering or leaving Neon Mirage
export function nmRnd(seed) { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
export function drawY2K() {
  if (!ST.trans || !ST.trans.neon) return;
  const p = ST.trans.t, enter = ST.trans.enter, calm = reduceMotion;
  const g = p < 1.4 ? Math.pow(p / 1.4, 1.4) : Math.max(0, 1 - (p - 1.4) / 1.5), slot = Math.floor(p * 15);
  ctx.save();
  if (!calm && g > .02) {
    // slices of the finished frame shoved sideways
    const n = ST.lowFx ? 3 : 4 + Math.round(g * 9);
    for (let i = 0; i < n; i++) {
      const r1 = nmRnd(slot * 7 + i * 3.1), r2 = nmRnd(slot * 13 + i * 5.7), r3 = nmRnd(slot * 3 + i * 9.3);
      const h = 8 + r2 * 60 * g, y = r1 * (ST.H - h), dx = (r3 - .5) * 2 * (20 + g * 160);
      ctx.drawImage(cv, 0, Math.round(y * ST.DPR), cv.width, Math.max(1, Math.round(h * ST.DPR)), dx, y, ST.W, h);
    }
    // colour ghosts and neon bars
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(.3, g * .35); const off = 4 + g * 22;
    ctx.drawImage(cv, 0, 0, cv.width, cv.height, off, 0, ST.W, ST.H); ctx.drawImage(cv, 0, 0, cv.width, cv.height, -off, 0, ST.W, ST.H);
    ctx.globalAlpha = 1;
    const C = ['5,217,232', '255,60,200', '255,240,120', '185,103,255'], nb = 3 + Math.round(g * 8);
    for (let i = 0; i < nb; i++) {
      const r1 = nmRnd(slot * 5 + i * 2.3), r2 = nmRnd(slot * 11 + i * 4.1), r3 = nmRnd(slot * 17 + i * 6.7);
      ctx.fillStyle = 'rgba(' + C[i % 4] + ',' + (.14 + .3 * g) + ')'; ctx.fillRect(r1 * ST.W - 20, r3 * ST.H, 30 + r2 * 240 * g, 2 + r1 * 14);
    }
    ctx.globalCompositeOperation = 'source-over';
    if (slot % 3 === 0) { ctx.fillStyle = 'rgba(8,2,30,' + (.18 * g) + ')'; ctx.fillRect(0, 0, ST.W, ST.H); }
  }
  // retro error dialog while the jump winds up
  if (p > .28 && p < 1.46) {
    const da = Math.min(1, (p - .28) / .08) * Math.min(1, (1.46 - p) / .06), dw = Math.min(ST.W - 40, 300), dh = 150;
    const dx0 = (ST.W - dw) / 2 + (calm ? 0 : (nmRnd(slot * 5) - .5) * g * 16), dy0 = ST.H * .36 - dh / 2 + (calm ? 0 : (nmRnd(slot * 9) - .5) * g * 10);
    ctx.globalAlpha = da;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(dx0 + 5, dy0 + 5, dw, dh);
    ctx.fillStyle = '#c9c6dd'; ctx.fillRect(dx0, dy0, dw, dh);
    ctx.fillStyle = '#fff'; ctx.fillRect(dx0, dy0, dw, 2); ctx.fillRect(dx0, dy0, 2, dh);
    ctx.fillStyle = '#6a6890'; ctx.fillRect(dx0, dy0 + dh - 2, dw, 2); ctx.fillRect(dx0 + dw - 2, dy0, 2, dh);
    const tg = ctx.createLinearGradient(dx0, 0, dx0 + dw, 0); tg.addColorStop(0, '#2b1b8f'); tg.addColorStop(1, '#ff4fb8');
    ctx.fillStyle = tg; ctx.fillRect(dx0 + 4, dy0 + 4, dw - 8, 21);
    ctx.font = '700 13px MothText, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(enter ? 'MOTH.EXE' : 'NEON.SYS', dx0 + 10, dy0 + 19);
    ctx.fillStyle = '#c9c6dd'; ctx.fillRect(dx0 + dw - 24, dy0 + 7, 15, 15); ctx.fillStyle = '#14132B'; ctx.fillText('x', dx0 + dw - 20, dy0 + 19);
    ctx.fillStyle = '#e0245e'; ctx.beginPath(); ctx.arc(dx0 + 34, dy0 + 70, 17, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(dx0 + 27, dy0 + 63); ctx.lineTo(dx0 + 41, dy0 + 77); ctx.moveTo(dx0 + 41, dy0 + 63); ctx.lineTo(dx0 + 27, dy0 + 77); ctx.stroke();
    ctx.fillStyle = '#14132B'; ctx.font = '700 14px MothText, sans-serif';
    ctx.fillText(enter ? 'Y2K BUG DETECTED' : 'SYSTEM CLOCK ROLLOVER', dx0 + 62, dy0 + 64);
    ctx.font = '500 13px MothText, sans-serif'; ctx.fillStyle = '#2a2750';
    ctx.fillText(enter ? 'Date overflow at 12/31/1999' : 'Leaving 1999...', dx0 + 62, dy0 + 84);
    ctx.fillStyle = '#c9c6dd'; ctx.fillRect(dx0 + dw / 2 - 34, dy0 + dh - 42, 68, 26); ctx.fillStyle = '#fff'; ctx.fillRect(dx0 + dw / 2 - 34, dy0 + dh - 42, 68, 2);
    ctx.fillStyle = '#6a6890'; ctx.fillRect(dx0 + dw / 2 - 34, dy0 + dh - 18, 68, 2);
    ctx.fillStyle = '#14132B'; ctx.font = '700 13px MothText, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('OK', dx0 + dw / 2, dy0 + dh - 24); ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
  // colour bars and a blue-screen frame right at the swap
  if (!calm && p > 1.28 && p < 1.52) {
    const ph2 = Math.floor((p - 1.28) / .06);
    if (ph2 === 1 || ph2 === 3) {
      const B = ['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000', '#0000ff']; ctx.globalAlpha = .9;
      B.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(ST.W / 7 * i, 0, ST.W / 7 + 1, ST.H); }); ctx.globalAlpha = 1;
    } else if (ph2 === 2) {
      ctx.fillStyle = '#0000a8'; ctx.fillRect(0, 0, ST.W, ST.H); ctx.textAlign = 'center'; ctx.fillStyle = '#c8c8c8'; ctx.fillRect(ST.W / 2 - 34, ST.H * .3, 68, 20);
      ctx.fillStyle = '#0000a8'; ctx.font = '700 14px monospace'; ctx.fillText('MOTH', ST.W / 2, ST.H * .3 + 15);
      ctx.fillStyle = '#fff'; ctx.font = '700 13px monospace'; ctx.fillText('A fatal exception has occurred at 19:99:99', ST.W / 2, ST.H * .3 + 54); ctx.fillText('Press any key to rewind the year _', ST.W / 2, ST.H * .3 + 78); ctx.textAlign = 'left';
    }
  }
  // clock: scrambles during the jump, then lands on 1999 (entering) or rolls over to 2000 (leaving)
  if (p > .55 && p < 3.0) {
    const ca = Math.min(1, (p - .55) / .2) * Math.min(1, (3.0 - p) / .4);
    let txt, cap;
    if (enter) { txt = p < 1.4 ? (nmRnd(slot) < .5 ? '01/01/19100  00:00:0' + (slot % 10) : '01/01/1900  00:00:00') : '12/31/1999  23:59:59'; cap = p < 1.4 ? 'DATE OVERFLOW...' : 'WELCOME TO 1999'; }
    else { txt = p < 1.4 ? '12/31/1999  23:59:' + (50 + Math.min(9, Math.floor((p - .55) / .85 * 10))) : '01/01/2000  00:00:0' + Math.min(9, Math.floor((p - 1.4) * 3)); cap = p < 1.4 ? 'ROLLING OVER...' : '1999 SURVIVED'; }
    const jx = calm || p > 1.5 ? 0 : (nmRnd(slot * 3) - .5) * 14 * g, y = ST.H * .17;
    ctx.globalAlpha = ca; ctx.textAlign = 'center'; ctx.font = '700 22px monospace';
    const w1 = ctx.measureText(txt).width; if (w1 > ST.W - 30) ctx.font = '700 ' + (22 * (ST.W - 30) / w1) + 'px monospace';
    { const bg = ctx.createLinearGradient(0, y - 34, 0, y + 46); bg.addColorStop(0, 'rgba(8,2,30,0)'); bg.addColorStop(.25, 'rgba(8,2,30,.6)'); bg.addColorStop(.8, 'rgba(8,2,30,.6)'); bg.addColorStop(1, 'rgba(8,2,30,0)'); ctx.save(); ctx.fillStyle = bg; ctx.fillRect(0, y - 34, ST.W, 80); ctx.restore(); }
    if (!calm && p < 1.5) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(5,217,232,.7)'; ctx.fillText(txt, ST.W / 2 + jx - 3, y); ctx.fillStyle = 'rgba(255,60,200,.7)'; ctx.fillText(txt, ST.W / 2 + jx + 3, y); ctx.globalCompositeOperation = 'source-over'; }
    ctx.fillStyle = p < 1.4 ? '#9ff6ff' : '#ffc2ea'; ctx.fillText(txt, ST.W / 2 + jx, y);
    ctx.font = '700 14px MothText, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(cap, ST.W / 2, y + 26);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  ctx.restore();
}
