import { ST } from '../state.js';
import { ctx, reduceMotion } from '../config.js';
import { BGK, exL, exR } from '../edge.js';
import { clampN } from '../bosses/sentinel.js';
import { glow } from '../render/glow.js';
import { drawAuroraSky, drawStormSky } from '../render/sprites-b.js';
import { bgOn, nmRnd } from './neon.js';
import { drawMoonGarden, drawReefLife } from '../render/background.js';
import { artMoth } from '../render/stageart.js';
import { Sound } from '../audio.js';

let ovBud = 1;
let ovCloudC = null;
// ====== v53: Overflow Reach (Stage 6) is LAND seen from above. A tiled terrain texture scrolls under the moth, mesas and ridge walls cast drop shadows, clouds throw soft shadows. Precision decays with heat (coarser snap grid, longer stretch, torn columns) ======
export const OV_COL = ['#2F6F3D', '#78923A', '#C8A03C', '#3B8D88', '#1F4D58'];
const ovHash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const ovH2 = (a, b) => ovHash(a * 57.3 + b * 131.7 + 1.9);
function ovVn(x, y) {                                                  // smooth value noise
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return ovH2(xi, yi) * (1 - u) * (1 - v) + ovH2(xi + 1, yi) * u * (1 - v) + ovH2(xi, yi + 1) * (1 - u) * v + ovH2(xi + 1, yi + 1) * u * v;
}
function ovVnP(x, y, px, py) {                                         // the same noise, periodic in both axes: the ground tiles without a seam
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px, y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
  return ovH2(x0, y0) * (1 - u) * (1 - v) + ovH2(x1, y0) * u * (1 - v) + ovH2(x0, y1) * (1 - u) * v + ovH2(x1, y1) * u * v;
}
export const ovQ = () => (ST.pw && ST.pw.seedT > 0) ? 1 : 1 + Math.floor(ST.dispD * ST.dispD * 10);                  // snap grid in px: 1 when calm, 11 at full heat
// the ground texture: 224 x 224 texels, shown at 448 x 448 px; built a few rows per frame so nothing hitches
const OVG = { W: 224, H: 224, TW: 448, TH: 448, E: null, R: null, row: 0, ph: 0, c: null, g: null, img: null, ready: false };
const ovRamp = [[0, [34, 74, 42]], [.4, [44, 98, 54]], [.55, [96, 122, 52]], [.7, [158, 134, 60]], [1, [178, 156, 92]]];
function ovRampC(e) {
  for (let i = 1; i < ovRamp.length; i++) if (e <= ovRamp[i][0] || i === ovRamp.length - 1) {
    const A = ovRamp[i - 1], B = ovRamp[i], k = clampN((e - A[0]) / (B[0] - A[0]), 0, 1);
    return [A[1][0] + (B[1][0] - A[1][0]) * k, A[1][1] + (B[1][1] - A[1][1]) * k, A[1][2] + (B[1][2] - A[1][2]) * k];
  }
}
export function ovGroundStep() {
  const G = OVG; if (G.ready) return;
  if (!G.E) { G.E = new Float32Array(G.W * G.H); G.R = new Float32Array(G.W * G.H); G.row = 0; G.ph = 0; }
  const rows = 32, W0 = G.W, H0 = G.H;
  if (G.ph === 0) {                                                    // phase 0: elevation (four octaves plus a ridge layer)
    for (let n = 0; n < rows && G.row < H0; n++, G.row++) {
      const y = G.row, v = y / H0;
      for (let x = 0; x < W0; x++) {
        const u = x / W0; let e = 0, am = .5, tot = 0;
        for (let o = 0; o < 3; o++) { const px = 3 << o, py = 3 << o; e += am * ovVnP(u * px, v * py, px, py); tot += am; am *= .42; }
        e /= tot;
        const rg = ovVnP(u * 5 + .37, v * 5 + .81, 5, 5);   // a smooth mask for patches of teal stone
        G.E[y * W0 + x] = clampN((e - .47) * 2.4 + .5, 0, 1); G.R[y * W0 + x] = rg;
      }
    }
    if (G.row >= H0) { G.ph = 1; G.row = 0; G.c = document.createElement('canvas'); G.c.width = W0; G.c.height = H0; G.g = G.c.getContext('2d'); G.img = G.g.createImageData(W0, H0); }
    return;
  }
  const E = G.E, R = G.R, d = G.img.data;                              // phase 1: hill-shading (light from the upper left), outcrops of teal stone
  for (let n = 0; n < rows && G.row < H0; n++, G.row++) {
    const y = G.row, ym = ((y - 1 + H0) % H0) * W0, yp = ((y + 1) % H0) * W0, y0 = y * W0;
    for (let x = 0; x < W0; x++) {
      const xm = (x - 1 + W0) % W0, xp = (x + 1) % W0;
      const sh = ((E[y0 + xm] - E[y0 + xp]) + (E[ym + x] - E[yp + x])) * 5, lum = clampN(.8 + sh, .62, 1.1) * .7;
      let c = ovRampC(E[y0 + x]); const rg = R[y0 + x];
      if (rg > .6) { const k = Math.min(1, (rg - .6) / .2) * .55, tc = [52, 118, 114]; c = [c[0] + (tc[0] - c[0]) * k, c[1] + (tc[1] - c[1]) * k, c[2] + (tc[2] - c[2]) * k]; }
      const i = (y0 + x) * 4; d[i] = Math.min(255, c[0] * lum); d[i + 1] = Math.min(255, c[1] * lum); d[i + 2] = Math.min(255, c[2] * lum); d[i + 3] = 255;
    }
  }
  if (G.row >= H0) { G.g.putImageData(G.img, 0, 0); G.ready = true; G.E = G.R = G.img = null; }
}
// mesas (short, wide) and ridge walls (long, thin) with a cliff face and a drop shadow, each painted once
const ovSlabs = Array.from({ length: 7 }, (_, i) => { const mesa = i % 3 === 0; return { seed: i * 7.3 + 1, fx: .08 + nmRnd(i * 2.1 + 5) * .84, fy: nmRnd(i * 3.7 + 9), w: mesa ? 108 + nmRnd(i + 20) * 60 : 40 + nmRnd(i + 20) * 30, h: mesa ? 120 + nmRnd(i + 40) * 70 : 220 + nmRnd(i + 40) * 160, sc: .8 + nmRnd(i + 60) * .35, sp: .5 + nmRnd(i + 80) * .6, cl: 11 + Math.floor(nmRnd(i + 5) * 6), col: [1, 2, 1, 3, 2, 1, 0][i], spr: null, sprD: 0 }; });
const ovStreaks = Array.from({ length: 30 }, (_, i) => ({ fx: nmRnd(i * 1.3 + 100), fy: nmRnd(i * 2.9 + 130), len: 70 + nmRnd(i + 160) * 200, z: .4 + nmRnd(i + 190) * .6 }));
const ovClouds = [{ fx: .2, fy: .1, r: 150, v: 5 }, { fx: .7, fy: .55, r: 190, v: 3.4 }, { fx: .45, fy: .9, r: 130, v: 6.5 }];
const ovPad = 30;                                                      // sprite margin on the right and bottom for the shadow
function ovBuild(sl) {
  const w = sl.w, h = sl.h, cl = sl.cl, P = ovPad, c = document.createElement('canvas'); c.width = Math.ceil((w + P) * ST.DPR); c.height = Math.ceil((h + P) * ST.DPR);
  const g = c.getContext('2d'); g.scale(ST.DPR, ST.DPR);
  const N = 36, pts = [], cx = w / 2, cy = (h - cl) / 2, hw = w / 2 - 3, hh = (h - cl) / 2 - 3;
  for (let i = 0; i < N; i++) {                                        // a rounded, lumpy outline
    const an = i / N * 6.283, ca = Math.cos(an), sa = Math.sin(an), j1 = 1 + .16 * (ovVn(i * .55 + sl.seed, 1.3) - .5), j2 = 1 + .16 * (ovVn(i * .55 + sl.seed, 4.1) - .5);
    pts.push([cx + hw * Math.sign(ca) * Math.pow(Math.abs(ca), .4) * j1, cy + hh * Math.sign(sa) * Math.pow(Math.abs(sa), .4) * j2]);
  }
  const poly = (ox, oy) => { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0] + ox, q[1] + oy) : g.moveTo(q[0] + ox, q[1] + oy)); g.closePath(); };
  g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 9 * ST.DPR; g.shadowOffsetX = cl * .9 * ST.DPR; g.shadowOffsetY = cl * 1.1 * ST.DPR;   // the drop shadow, cast down and right
  poly(cl * .3, cl); g.fillStyle = '#1c2418'; g.fill(); g.restore();
  for (let k = cl; k >= 1; k--) {                                      // the cliff face: the outline pushed down in dark strata
    const t = k / cl, lift = Math.floor(k / 3.5) % 2 ? 9 : 0;
    g.fillStyle = 'rgb(' + Math.round(70 - 46 * t + lift) + ',' + Math.round(64 - 34 * t + lift) + ',' + Math.round(40 - 16 * t + lift) + ')'; poly(k * .3, k); g.fill();
  }
  g.save(); poly(0, 0); g.clip();                                      // the top face
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, OV_COL[sl.col]); gr.addColorStop(1, OV_COL[(sl.col + 1) % 3]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 7; k++) {                                        // soft mottling
    const bx = nmRnd(sl.seed + k * 1.7) * w, by = nmRnd(sl.seed * 2 + k * 2.3) * h, br = 18 + nmRnd(k + sl.seed) * 30, bc = OV_COL[Math.floor(nmRnd(sl.seed + k * 5.1) * 4)];
    const rg = g.createRadialGradient(bx, by, 0, bx, by, br); rg.addColorStop(0, bc); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = .45; g.fillStyle = rg; g.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.12)'; for (let yy = 12; yy < h; yy += 18) g.fillRect(0, yy, w, 1.2);
  const sg = g.createLinearGradient(0, 0, w, h); sg.addColorStop(0, 'rgba(255,255,210,.12)'); sg.addColorStop(.55, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = sg; g.fillRect(0, 0, w, h);
  poly(0, 0); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,215,.34)'; g.stroke();   // lit rim (the clip keeps the inner half)
  g.restore();
  sl.spr = c; sl.sprD = ST.DPR;
}
function ovDrawSlab(sl, x, yc, a, S, tear, t) {                        // x = left edge, yc = vertical centre of the body, S = stretch along y, tear = px of column offset
  if (!sl.spr || sl.sprD !== ST.DPR) { if (ovBud <= 0) return; ovBud--; ovBuild(sl); }
  const dw = (sl.w + ovPad) * sl.sc, dh = (sl.h + ovPad) * sl.sc * S, y = yc - sl.h * sl.sc * S / 2, spr = sl.spr;
  ctx.globalAlpha = a;
  if (tear < .5) { ctx.drawImage(spr, x, y, dw, dh); return; }
  const sw = 8, sws = sw / sl.sc * ST.DPR, n = Math.ceil(dw / sw);
  for (let k = 0; k < n; k++) {
    const sx = k * sws, sWid = Math.min(sws, spr.width - sx); if (sWid <= 0) break;
    ctx.drawImage(spr, sx, 0, sWid, spr.height, x + k * sw, y + Math.sin(k * .9 + sl.seed + t * 1.6) * tear, sWid / sws * sw + .5, dh);
  }
}
function ovGround(a, t, q, tear) {                                     // the terrain: tiles scrolled under the moth, stretched with heat, torn into columns, coarse above heat .6
  const G = OVG, S = 1 + ST.dispD * 2, hS = G.TH * S;
  if (!G.ready) { ctx.globalAlpha = a; ctx.fillStyle = '#2d5a30'; ctx.fillRect(-60, -ST.H * .35, ST.W + 120, ST.H * 1.7); ctx.globalAlpha = 1; return; }
  const y0 = ((ST.nebScroll * .5 / G.TH) % 1) * hS, yS = y0 - hS * Math.ceil((y0 + ST.H * .35) / hS);
  ctx.globalAlpha = a; ctx.imageSmoothingEnabled = ST.dispD < .6;
  const cw = 32, nc = G.TW / cw, sw = G.W / nc;
  for (let ty = yS; ty < ST.H * 1.35; ty += hS) {
    const yy = Math.round(ty / q) * q;
    for (let tx = -40, ti = 0; tx < ST.W + 40; tx += G.TW, ti++) {
      if (tear < .5) { ctx.drawImage(G.c, tx, yy, G.TW + 2, hS + 2); continue; }
      for (let k = 0; k < nc; k++) ctx.drawImage(G.c, k * sw, 0, sw, G.H, tx + k * cw, yy + Math.sin((ti * nc + k) * .9 + t * 1.6) * tear, cw + 2, hS + 2);
    }
  }
  ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1;
}
export function drawOverflow(t, pulse) {
  const a = ST.uw[5]; if (a < .02) return;
  const tm = reduceMotion ? 0 : t, q = ovQ(), S = 1 + ST.dispD * 2, WW = ST.W, lim = ST.lowFx ? 4 : ovSlabs.length;
  ovBud = 1;
  ctx.save();
  const tear = reduceMotion || ST.lowFx || ST.pw.seedT > 0 ? 0 : Math.max(0, ST.dispD - .3) * 26;
  ovGround(a, tm, q, tear);
  ctx.strokeStyle = 'rgba(236,228,160,' + (.06 * a) + ')'; ctx.lineWidth = 1.2; ctx.beginPath();     // wind-blown dust streaks, one path
  const SP = ST.H + 320, ns = ST.lowFx ? 14 : ovStreaks.length;
  for (let i = 0; i < ns; i++) {
    const s = ovStreaks[i], x = Math.round(s.fx * WW / q) * q, y = ((s.fy * SP + ST.nebScroll * .6 * s.z) % SP) - 300;
    if (!bgOn(x, 4)) continue;
    ctx.moveTo(x, y); ctx.lineTo(x, y + s.len * (1 + ST.dispD * 1.6));
  }
  ctx.stroke();
  for (let i = 0; i < lim; i++) {                                      // mesas and ridge walls sit on the ground: they scroll with it, a touch faster for the height
    const sl = ovSlabs[i], w = sl.w * sl.sc, span = ST.H + sl.h * sl.sc * 3.4 + 40;
    const x = Math.round((sl.fx * WW - w / 2) / q) * q;
    if (!bgOn(x + w / 2, w / 2 + 24)) continue;
    const yc = ((sl.fy * span + ST.nebScroll * (.5 + .14 * sl.sp)) % span) - sl.h * sl.sc * 1.2;
    ovDrawSlab(sl, x, yc, a, S, tear, tm);
  }
  if (!ovCloudC) { ovCloudC = document.createElement('canvas'); ovCloudC.width = ovCloudC.height = 128; const cg = ovCloudC.getContext('2d'), rg = cg.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, 'rgba(0,12,8,1)'); rg.addColorStop(1, 'rgba(0,12,8,0)'); cg.fillStyle = rg; cg.fillRect(0, 0, 128, 128); }
  for (let i = 0, nc = ST.lowFx ? 2 : ovClouds.length; i < nc; i++) {     // slow cloud shadows drifting over the land
    const c = ovClouds[i], cw = c.r * 2.6, x = ((c.fx * WW + tm * c.v * 3) % (WW + cw)) - cw / 2, y = ((c.fy * SP + ST.nebScroll * .62) % SP) - 300;
    if (!bgOn(x, cw / 2)) continue;
    ctx.globalAlpha = .2 * a; ctx.drawImage(ovCloudC, x - cw / 2, y - c.r * (1 + ST.dispD), cw, c.r * 2 * (1 + ST.dispD * 1.5));
  }
  const hz = ctx.createLinearGradient(0, -ST.H * .35, 0, ST.H * .3); hz.addColorStop(0, 'rgba(214,230,150,' + (.16 * a) + ')'); hz.addColorStop(1, 'rgba(214,230,150,0)');   // sunlit haze at the top edge
  ctx.globalAlpha = 1; ctx.fillStyle = hz; ctx.fillRect(-60, -ST.H * .35, ST.W + 120, ST.H * .65);
  ctx.globalAlpha = 1; ctx.restore();
}
export function seamStep(it, gi) {                                            // the gap re-rolls while the wall is far above the moth; the next gap blinks for .55 s first
  if ((ST.diff < .35 && !it.forceShift) || it.y > ST.moth.y - 240) return;
  it.shiftT -= gi;
  if (it.shiftT <= 0 && !it.nextGx) {
    const lo = it.gap / 2 + 20, hi = ST.W - it.gap / 2 - 20, d = (Math.random() < .5 ? -1 : 1) * it.cell * (ST.diff > .7 ? 2 : 1);
    it.nextGx = Math.round(clampN(it.gx + d, lo, hi) / it.cell) * it.cell; it.warnT = .55;
    if (it.nextGx === it.gx) it.nextGx = 0; else Sound.seamTick();
  }
  if (it.nextGx) { it.warnT -= gi; if (it.warnT <= 0) { it.gx = it.nextGx; it.nextGx = 0; it.shiftT = 1.1 + Math.random() * .6; if (!reduceMotion) ST.shake = Math.max(ST.shake, .12); } }
}
export function drawSeam(it, t) {                                             // Overflow Reach laser gate: a wall of terrain columns, same hit row as the gate
  const y = it.y, L = it.gx - it.gap / 2, R = it.gx + it.gap / 2, cs = 6, hh = 20 * (1 + ST.dispD * .9), tm = reduceMotion ? 0 : t, sd = it.sd || 0;
  ctx.save();
  for (let side = 0; side < 2; side++) {
    const x0 = side ? R : exL(), x1 = side ? exR() : L;
    if (x1 - x0 < 2) continue;
    for (let x = x0; x < x1; x += cs) {
      const n = ovVn(x * .035 + sd, 7), hc = hh * (.7 + .6 * ovVn(x * .07 + sd, 3));
      const cwid = Math.min(cs + .5, x1 - x);
      ctx.fillStyle = OV_COL[Math.min(4, Math.floor(n * 5))]; ctx.fillRect(x, y - hc / 2, cwid, hc);
      ctx.fillStyle = 'rgba(6,10,6,.42)'; ctx.fillRect(x, y - hc / 2 + hc * .58, cwid, hc * .42);          // the cliff face under the lit top
    }
    ctx.fillStyle = 'rgba(0,0,0,.26)'; ctx.fillRect(x0, y + hh * .5, x1 - x0, 10);                          // the wall's shadow on the ground
    ctx.fillStyle = 'rgba(255,140,70,.95)'; ctx.fillRect(x0, y - hh * .62, x1 - x0, 2);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x0, y - hh * .62, x1 - x0, .8);
  }
  ctx.restore();
  glow(L, y, 40, 'rgba(255,98,40,1)', .7); glow(R, y, 40, 'rgba(255,98,40,1)', .7);
  ctx.fillStyle = '#E8CCFF'; ctx.fillRect(L - 3, y - 22, 6, 44); ctx.fillRect(R - 3, y - 22, 6, 44);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(L - 1, y - 22, 2, 44); ctx.fillRect(R - 1, y - 22, 2, 44);
  if (it.nextGx) {                                                     // the gap is about to move: ghost posts at the new spot
    const nl = it.nextGx - it.gap / 2, nr = it.nextGx + it.gap / 2, al = .45 + .4 * Math.abs(Math.sin(it.warnT * 22));
    ctx.save(); ctx.strokeStyle = 'rgba(255,190,130,' + al + ')'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(nl, y - 26); ctx.lineTo(nl, y + 26); ctx.moveTo(nr, y - 26); ctx.lineTo(nr, y + 26); ctx.stroke(); ctx.restore();
  }
}
export function drawShear(it, t) {                                            // a slab of strata that slides sideways as it falls
  const w = it.w, h = it.h, sd = it.sd || 0;
  if (it.warn > 0) {                                                   // the swath it will sweep, down to the moth's row
    const al = .4 + .35 * Math.abs(Math.sin(it.warn * 14)), by = ST.moth.y + 20;
    ctx.save(); ctx.fillStyle = 'rgba(255,98,40,' + (.06 + .06 * (1 - it.warn / 1.1)) + ')';
    ctx.beginPath(); ctx.moveTo(it.x0 - w / 2, -40); ctx.lineTo(it.x0 + w / 2, -40); ctx.lineTo(it.xc + w / 2, by); ctx.lineTo(it.xc - w / 2, by); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,110,' + al + ')'; ctx.lineWidth = 2; ctx.setLineDash([9, 8]);
    ctx.beginPath(); ctx.moveTo(it.x0 - w / 2, -40); ctx.lineTo(it.xc - w / 2, by); ctx.moveTo(it.x0 + w / 2, -40); ctx.lineTo(it.xc + w / 2, by); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,170,110,' + al + ')'; ctx.fillRect(it.xc - w / 2, by - 2, w, 3);
    ctx.restore(); return;
  }
  ctx.save(); ctx.translate(it.x, it.y);
  glow(0, 0, w * .75, 'rgba(255,98,40,1)', .12);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-w / 2 + 14, -h / 2 + 18, w, h);                          // drop shadow: the slab is above the ground
  const sx = -it.vx / it.vy;                                           // smear trails back along the motion
  for (let k = 5; k >= 1; k--) {
    ctx.globalAlpha = .3 - k * .045; ctx.fillStyle = OV_COL[(k + Math.floor(sd)) % 5]; ctx.fillRect(-w / 2 + sx * k * 16, -h / 2 - k * 16, w, h);
  }
  ctx.globalAlpha = 1;
  ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip();
  for (let c = 0; c < Math.ceil(w / 10); c++) {
    const off = Math.floor(nmRnd(c * 3.7 + sd) * 3) * 5 - 5;
    for (let b = 0; b < 4; b++) { ctx.fillStyle = OV_COL[(b + (c % 2) + Math.floor(sd)) % 5]; ctx.fillRect(-w / 2 + c * 10, -h / 2 + b * h / 4 + off, 10.5, h / 4 + 1); }
  }
  ctx.fillStyle = 'rgba(6,10,6,.4)'; ctx.fillRect(-w / 2, h / 2 - h * .26, w, h * .26);                    // the broken face of the slab
  ctx.fillStyle = 'rgba(141,146,155,.92)'; ctx.fillRect(-w / 2, -h / 2, w, h * .62);                    // v55: Farlands stone over the strata: stepped top, dark vertical streaks, snow, then dirt and grass at the foot
  ctx.fillStyle = 'rgba(185,190,198,.9)'; for (let c = 0; c < Math.ceil(w / 22); c++) if (c % 3 === 0) ctx.fillRect(-w / 2 + c * 22, -h / 2, 11, h * .2);
  ctx.fillStyle = '#4A4F58'; for (let c = 0; c < Math.ceil(w / 14); c++) ctx.fillRect(-w / 2 + c * 14 + nmRnd(c * 2.1 + sd) * 6, -h / 2, 2.5, h * (.4 + nmRnd(c * 5.3 + sd) * .22));
  ctx.fillStyle = '#F2F6FA'; for (let c = 0; c < Math.ceil(w / 44); c++) ctx.fillRect(-w / 2 + c * 44 + 4, -h / 2, 16, 3);
  ctx.fillStyle = '#7A5230'; ctx.fillRect(-w / 2, -h / 2 + h * .62, w, h * .16); ctx.fillStyle = '#4FA044'; ctx.fillRect(-w / 2, -h / 2 + h * .78, w, h * .22); ctx.fillStyle = '#8CC05A'; ctx.fillRect(-w / 2, -h / 2 + h * .78, w, 3);
  ctx.restore();
  ctx.strokeStyle = '#2A1710'; ctx.lineWidth = 2; ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(-w / 2, -h / 2, w, 2);
  ctx.restore();
}
export function drawSlabStar(R, SS, t) {                                      // v55 Overflow Reach shuriken: an obsidian crystal star. Eight sharp glassy spikes, lit and shadow faces, lava in the ridges. No outline glow; stretches with heat (visual only)
  const k = 1 + ST.dispD * .45;
  ctx.save(); ctx.scale(1, k);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, lg = i % 2 === 0, L = R * (lg ? 1.22 : .74), bw = lg ? 1.15 : 1.3, cx = Math.cos(a) * L, cy = Math.sin(a) * L;
    const p1x = Math.cos(a + bw) * R * .3, p1y = Math.sin(a + bw) * R * .3, p2x = Math.cos(a - bw) * R * .3, p2y = Math.sin(a - bw) * R * .3;
    ctx.fillStyle = '#4C4A5A'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p1x, p1y); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#121118'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p2x, p2y); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    if (lg) { ctx.strokeStyle = 'rgba(255,120,50,.95)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx * .94, cy * .94); ctx.lineTo(cx * .22, cy * .22); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(cx * .97 - 1, cy * .97 - 1, 2, 2); }
  }
  ctx.fillStyle = '#0E0D12'; ctx.beginPath(); ctx.arc(0, 0, R * .3, 0, 6.283); ctx.fill();
  ctx.restore();
}
export function drawStrataOrb(it, t, gold, r, pu, ph, col) {                  // v55 Overflow Reach orbs: a cut diamond (blue) and a raw gold nugget (gold). Always bright: they outshine the terrain
  const sp = (x, y, s) => { ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * .22, y - s * .22); ctx.lineTo(x + s, y); ctx.lineTo(x + s * .22, y + s * .22); ctx.lineTo(x, y + s); ctx.lineTo(x - s * .22, y + s * .22); ctx.lineTo(x - s, y); ctx.lineTo(x - s * .22, y - s * .22); ctx.closePath(); ctx.fill(); };
  const tw = reduceMotion ? 1 : .55 + .45 * Math.sin(t * 5 + ph);
  if (!gold) {
    const R = r * 1.25 * pu, P = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0] * R, p[1] * R) : ctx.moveTo(p[0] * R, p[1] * R)); ctx.closePath(); ctx.fill(); };
    const TL = [-.5, -.62], TR = [.5, -.62], L = [-1, -.12], Rr = [1, -.12], g1 = [-.3, -.12], g2 = [.3, -.12], B = [0, 1];
    P([TL, TR, g2, g1], '#FFFFFF'); P([L, TL, g1], '#D6F8FF'); P([TR, Rr, g2], '#9DE6F5');
    P([L, g1, B], '#59C9E8'); P([g1, g2, B], '#B2F0FF'); P([g2, Rr, B], '#2FA3CB');
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(TL[0] * R, TL[1] * R); ctx.lineTo(TR[0] * R, TR[1] * R); ctx.lineTo(Rr[0] * R, Rr[1] * R); ctx.lineTo(0, R); ctx.lineTo(L[0] * R, L[1] * R); ctx.closePath(); ctx.moveTo(L[0] * R, L[1] * R); ctx.lineTo(Rr[0] * R, Rr[1] * R); ctx.stroke();
    ctx.save(); ctx.translate(-R * .42, -R * .42); ctx.scale(tw, tw); sp(0, 0, R * .5); ctx.restore();
  } else {
    const R = r * 1.2 * pu, N = [[-.9, .12], [-.58, -.72], [.08, -.96], [.82, -.5], [1, .26], [.5, .86], [-.3, .92]], P = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0] * R, p[1] * R) : ctx.moveTo(p[0] * R, p[1] * R)); ctx.closePath(); ctx.fill(); };
    ctx.rotate(Math.sin(t * 2 + ph) * .15);
    P(N, '#FFC93A'); P([N[1], N[2], [.05, -.1], N[0]], '#FFE79A'); P([N[3], N[4], N[5], [.05, -.1]], '#E0A016'); P([N[6], N[5], [.05, -.1], N[0]], '#C98710');
    ctx.strokeStyle = '#8F5E08'; ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.beginPath(); N.forEach((p, i) => i ? ctx.lineTo(p[0] * R, p[1] * R) : ctx.moveTo(p[0] * R, p[1] * R)); ctx.closePath(); ctx.stroke();
    ctx.save(); ctx.translate(-R * .3, -R * .4); ctx.scale(tw, tw); sp(0, 0, R * .42); ctx.restore();
  }
}
export function drawSlabComet(it, t, CS) {                                    // v55 Overflow Reach comet: a falling obsidian spire trailing embers and ash
  const L = 190 * (1 + ST.dispD * 1.2);
  for (let k = 0; k < 4; k++) {
    const w = 10 - k * 2, g = ctx.createLinearGradient(0, 0, 0, -L * (1 - k * .14)); g.addColorStop(0, 'rgba(255,150,70,' + (.5 - k * .08) + ')'); g.addColorStop(1, 'rgba(120,30,10,0)');
    ctx.fillStyle = g; ctx.fillRect(-w + (k % 2 ? 2 : -2), -L * (1 - k * .14), w * 2, L * (1 - k * .14));
  }
  const sp = ['#FFB070', '#FF5A28', '#4C4A5A', '#FFD9A0'];
  for (let k = 0; k < 9; k++) { const f = (k + 1) / 10, yy = -30 - f * L * .9, xx = Math.sin(k * 2.3 + (reduceMotion ? 0 : t * 3)) * (8 + f * 15), s = 6 - f * 3; ctx.fillStyle = sp[k % 4]; ctx.fillRect(xx - s / 2, yy, s, s); }
  const S = 1 + ST.dispD * .6;
  ctx.save(); ctx.scale(1, S);
  ctx.fillStyle = '#4C4A5A'; ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(-14, -6); ctx.lineTo(0, -22); ctx.closePath(); ctx.fill();   // lit side
  ctx.fillStyle = '#121118'; ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(14, -6); ctx.lineTo(0, -22); ctx.closePath(); ctx.fill();    // shadow side
  ctx.fillStyle = '#2A2833'; ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(0, -22); ctx.lineTo(14, -6); ctx.lineTo(0, -34); ctx.closePath(); ctx.fill();   // flat top
  ctx.strokeStyle = 'rgba(255,120,50,.95)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 28); ctx.lineTo(0, -22); ctx.stroke();
  ctx.restore();
}
const ovArt = [{ seed: 3.1, fx: .1, fy: .62, w: 52, h: 230, sc: .5, cl: 12, col: 1 }, { seed: 9.7, fx: .3, fy: .45, w: 130, h: 140, sc: .5, cl: 14, col: 2 }, { seed: 14.2, fx: .56, fy: .6, w: 56, h: 250, sc: .46, cl: 12, col: 1 },
  { seed: 21.5, fx: .8, fy: .42, w: 120, h: 130, sc: .5, cl: 13, col: 3 }, { seed: 27.9, fx: .94, fy: .66, w: 46, h: 210, sc: .46, cl: 11, col: 2 }].map(o => Object.assign(o, { spr: null, sprD: 0 }));
export function art5(t, x, y, w, h, X, Y) {                                   // Overflow Reach: land from above, mesas and ridge walls with drop shadows, a seam cliff with a gap, a hazard chunk and the moth
  ovBud = 2;
  const G = OVG;
  if (G.ready) {
    for (let ty = y - G.TH + ((t * 18) % G.TH); ty < y + h; ty += G.TH) for (let tx = x - 30; tx < x + w; tx += G.TW) { ctx.globalAlpha = ST.artGA; ctx.drawImage(G.c, tx, ty, G.TW + 2, G.TH + 2); }
  }
  ctx.globalAlpha = ST.artGA; const hz = ctx.createLinearGradient(0, y, 0, y + h * .5); hz.addColorStop(0, 'rgba(214,230,150,.34)'); hz.addColorStop(1, 'rgba(214,230,150,0)'); ctx.fillStyle = hz; ctx.fillRect(x, y, w, h * .5);
  for (const sl of ovArt) ovDrawSlab(sl, X(sl.fx) - sl.w * sl.sc / 2, Y(sl.fy), ST.artGA, 1, 0, t);
  ctx.globalAlpha = ST.artGA;
  const wy = Y(.84), gx = X(.62), gh = 70;                              // seam cliff with a gap
  for (let xx = x; xx < x + w; xx += 6) {
    if (xx + 6 > gx - gh / 2 && xx < gx + gh / 2) continue;
    const n = ovVn(xx * .035 + 4, 7), hc = 18 * (.7 + .6 * ovVn(xx * .07 + 4, 3));
    ctx.fillStyle = OV_COL[Math.min(4, Math.floor(n * 5))]; ctx.fillRect(xx, wy - hc / 2, 6.5, hc);
    ctx.fillStyle = 'rgba(6,10,6,.42)'; ctx.fillRect(xx, wy - hc / 2 + hc * .58, 6.5, hc * .42);
  }
  ctx.fillStyle = 'rgba(0,0,0,.26)'; ctx.fillRect(x, wy + 9, gx - gh / 2 - x, 8); ctx.fillRect(gx + gh / 2, wy + 9, x + w - gx - gh / 2, 8);
  ctx.fillStyle = 'rgba(255,140,70,.95)'; ctx.fillRect(x, wy - 11, gx - gh / 2 - x, 2); ctx.fillRect(gx + gh / 2, wy - 11, x + w - gx - gh / 2, 2);
  glow(gx - gh / 2, wy, 26, 'rgba(255,98,40,1)', .6); glow(gx + gh / 2, wy, 26, 'rgba(255,98,40,1)', .6);
  ctx.fillStyle = '#E8CCFF'; ctx.fillRect(gx - gh / 2 - 2, wy - 16, 4, 32); ctx.fillRect(gx + gh / 2 - 2, wy - 16, 4, 32);
  ctx.save(); ctx.translate(X(.2), Y(.3)); glow(0, 0, 30, 'rgba(255,98,40,1)', .5);
  ctx.rotate(t * 1.4); ctx.fillStyle = '#1B1A22'; ctx.strokeStyle = '#FF5A28'; ctx.lineWidth = 2; drawSlabStar(16, { }, t); ctx.restore();
  const my = Y(.34 + Math.sin(t * 1.2) * .03);
  ctx.save(); ctx.globalAlpha = .3 * ST.artGA; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(X(.5) + 10, my + 24, 26, 8, 0, 0, 6.283); ctx.fill(); ctx.restore();   // the moth's shadow on the land
  artMoth(X(.5), my, .8, t);
}
export function drawStageDetail(t) {
  const w0 = ST.uw[0], w1 = ST.uw[1], w2 = ST.uw[2], w3 = ST.uw[3];
  if (w0 < .02 && w1 < .02 && w2 < .02 && w3 < .02) return;
  const tt = reduceMotion ? 0 : t, bk = BGK, n = k => Math.max(2, Math.round(k * bk * (ST.lowFx ? .5 : 1)));
  ctx.save();
  if (w0 >= .02) drawMoonGarden(tt, w0, n);
  if (w1 >= .02) drawReefLife(tt, w1, n);
  if (w2 >= .02) drawAuroraSky(tt, w2, n);
  if (w3 >= .02) drawStormSky(tt, w3, n);
  ctx.restore();
}
