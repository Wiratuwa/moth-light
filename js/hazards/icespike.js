import { ST } from '../state.js';
import { ctx, reduceMotion } from '../config.js';
import { lerp } from '../core.js';
import { exL, exR, stripW } from '../edge.js';
import { burst, floatText, notice, ring } from '../spawn.js';
import { clampN } from '../bosses/sentinel.js';
import { hitHazard } from '../update.js';
import { glow } from '../render/glow.js';
import { clamp01, fxRnd, polyPath } from '../render/sprites-b.js';
import { Sound } from '../audio.js';


// ---- Aurora ice spike: frost spreads across the top, a giant crystal spike grows, trembles, then is thrown straight down ----
const ISP = { T2: .55, T3: .3, T4: .95 };
export function startIceSpike() {
  const S = stripW(), bw = Math.max(46, Math.min(58, ST.W * .14)), n = ST.diff > .6 ? 2 : 1, lo = -S + bw + 14, hi = ST.W + S - bw - 14;
  const c1 = clampN(ST.moth.x + (Math.random() - .5) * 90, lo, hi), cols = [c1];
  if (n === 2) { let c2 = c1 + (Math.random() < .5 ? -1 : 1) * (bw * 2 + 90 + Math.random() * 60); if (c2 < lo || c2 > hi) c2 = c1 - (c2 - c1); c2 = clampN(c2, lo, hi); if (Math.abs(c2 - c1) > bw * 2 + 40) cols.push(c2); }
  ST.items.push({ type: 'ispike', x: ST.W / 2, y: 0, r: 0, cols, bw, L: ST.H * .6, t: 0, T1: lerp(3.4, 2.6, ST.diff), dy: 0, hit: false, impact: false, impT: 0, frag: null, dropSnd: false, seed: Math.random() * 100 });
  ST.spkCool = 70; notice('Ice spike', '#9FF2FF'); Sound.warn();
}
export function updateIceSpike(it, g, i) {
  it.t += g; const T1 = it.T1, ud = it.t - T1 - ISP.T2;
  if (ud > 0 && !it.dropSnd) { it.dropSnd = true; Sound.sweep(); }
  it.dy = ud <= 0 ? 0 : Math.pow(Math.min(1, ud / ISP.T3), 2) * (ST.H + it.L + 90);
  if (!it.hit && ud > 0 && ud < ISP.T3 + .05 && ST.inv <= 0) {
    const ly = ST.moth.y - it.dy;
    if (ly > -80 && ly < it.L) {
      const hw = ly < 0 ? it.bw * 1.15 : it.bw * (1 - ly / it.L);
      for (const cx of it.cols) if (Math.abs(ST.moth.x - cx) < hw * .9 + 4) { it.hit = true; hitHazard(ST.moth.x, ST.moth.y, 'ispike'); if (ST.state !== 'play') return true; break; }
    }
  }
  if (!it.impact && ud > 0 && it.dy + it.L >= ST.H - 4) {
    it.impact = true; it.impT = it.t; it.frag = [];
    for (const cx of it.cols) {
      burst(cx, ST.H - 6, '#BDEBFF', 24, 540, 1.1); ring(cx, ST.H - 6, 'rgba(190,235,255,.9)', 480, .5, 5);
      for (let k = 0; k < 14; k++) it.frag.push({ x: cx + (Math.random() - .5) * it.bw, y: ST.H - 8, vx: (Math.random() - .5) * 560, vy: -(160 + Math.random() * 560), rot: Math.random() * 6.28, vr: (Math.random() - .5) * 12, sz: 6 + Math.random() * 11 });
    }
    ST.shake = Math.max(ST.shake, .6); ST.flash = Math.max(ST.flash, .22); Sound.thunder(0, true);
  }
  if (it.t > T1 + ISP.T2 + ISP.T3 + ISP.T4) {
    if (!it.hit) { ST.score += 40; ST.scorePop = 1; notice('Spike dodged +40', '#9FF2FF'); floatText(ST.moth.x, ST.moth.y - 40, '+40', '#9FF2FF'); Sound.bonus(); }
    ST.items.splice(i, 1);
  }
  return false;
}
function spikeCrystal(w, l, tilt) {                              // one hexagonal crystal column pointing down
  ctx.save(); ctx.rotate(tilt);
  const gl = ctx.createLinearGradient(-w, 0, 0, l); gl.addColorStop(0, '#FFFFFF'); gl.addColorStop(1, '#A8E4FF');
  const gd = ctx.createLinearGradient(0, 0, w, l); gd.addColorStop(0, '#7FCFF5'); gd.addColorStop(1, '#2F86C8');
  polyPath([[-w, -4], [0, -4], [0, l], [-w * .9, l * .72]]); ctx.fillStyle = gl; ctx.fill();
  polyPath([[0, -4], [w, -4], [w * .9, l * .72], [0, l]]); ctx.fillStyle = gd; ctx.fill();
  polyPath([[-w, -4], [w, -4], [w * .9, l * .72], [0, l], [-w * .9, l * .72]]); ctx.strokeStyle = 'rgba(230,250,255,.85)'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}
function drawOneSpike(it, k, fp, lock, dropping, ud, tm, u) {
  const bw = it.bw, L = it.L, seed = it.seed + k * 7.7, gp = clamp01((fp - .12) / .88), len = L * (1 - Math.pow(1 - gp, 3));
  const hwB = bw * clamp01(.2 + gp * 1.2), tipX = Math.sin(seed) * 3, pulse = .5 + .5 * Math.sin(u * (lock ? 40 : 10));
  const hwAt = h => hwB * (1 - h * .92);                                      // half width at fraction h of the length
  const crown = (front) => {                                                 // crystal cluster growing out of the top edge
    for (let i = 0; i < 9; i++) {
      if ((i % 2 === 1) !== front) continue;
      const o = (i - 4) / 4, g = clamp01((fp * 1.35 - i * .06) / .55), l = L * (.07 + .2 * fxRnd(seed + i * 1.9)) * (1 - Math.pow(1 - g, 3)) * (1 - Math.abs(o) * .45), w = 4.5 + 6 * fxRnd(seed + i * 3.3);
      if (l < 3) continue;
      ctx.save(); ctx.translate(o * bw * 1.1, -2); spikeCrystal(w, l, o * .42 + (fxRnd(seed + i) - .5) * .12); ctx.restore();
    }
  };
  crown(false);
  if (len > 4) {
    const sil = [[-hwB, -6], [hwB, -6], [hwAt(.22 / 1) * 0 + hwB * .88, len * .22], [hwB * .55, len * .55], [tipX, len], [-hwB * .5, len * .6], [-hwB * .9, len * .25]];
    const gl = ctx.createLinearGradient(-hwB, 0, 0, len); gl.addColorStop(0, '#E8F9FF'); gl.addColorStop(.55, '#B4E6FF'); gl.addColorStop(1, '#6FC4F0');
    const gd = ctx.createLinearGradient(0, 0, hwB, len); gd.addColorStop(0, '#8FD8F8'); gd.addColorStop(.6, '#4FA8DE'); gd.addColorStop(1, '#1F6AA8');
    polyPath([sil[0], [0, -6], [tipX, len], sil[5], sil[6]]); ctx.fillStyle = gl; ctx.fill();
    polyPath([[0, -6], sil[1], sil[2], sil[3], [tipX, len]]); ctx.fillStyle = gd; ctx.fill();
    ctx.save(); polyPath(sil); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const ph = reduceMotion ? 0 : (tm * .35) % 1, ag = ctx.createLinearGradient(0, 0, 0, len);                       // aurora light flowing down inside the ice
    ag.addColorStop(0, 'rgba(125,255,200,.3)'); ag.addColorStop(clamp01(.33 + ph * .3), 'rgba(111,216,255,.3)'); ag.addColorStop(clamp01(.66 + ph * .3), 'rgba(199,155,255,.3)'); ag.addColorStop(1, 'rgba(125,255,200,.1)');
    ctx.fillStyle = ag; ctx.fillRect(-hwB, -6, hwB * 2, len + 6);
    ctx.strokeStyle = 'rgba(255,255,255,' + (.35 + .3 * pulse) + ')'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(tipX, len); ctx.stroke();   // bright ridge
    ctx.strokeStyle = 'rgba(235,252,255,.4)'; ctx.lineWidth = 1;                                                      // growth rings, one per height as the spike passes it
    for (const h of [.2, .4, .6, .8]) { if (len < L * h * .8) continue; const yy = len * h, w = hwAt(h); ctx.beginPath(); ctx.moveTo(-w, yy); ctx.lineTo(tipX * h, yy + 9); ctx.lineTo(w, yy); ctx.stroke(); }
    if (lock || dropping) { ctx.fillStyle = 'rgba(255,255,255,' + (lock ? .18 * pulse : .22) + ')'; ctx.fillRect(-hwB, -6, hwB * 2, len + 6); }
    ctx.restore();
    polyPath(sil); ctx.strokeStyle = 'rgba(230,250,255,.9)'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke();
    for (let j = 0; j < 6; j++) {                                                                                      // little crystals sprout from the sides as the spike grows past them
      const h = .16 + j * .12, side = j % 2 ? 1 : -1, g = clamp01((len / L - h) / .16); if (g <= 0) continue;
      const bx = side * hwAt(h) * .95, by = h * len, lm = (18 + 24 * fxRnd(seed + j)) * g;
      polyPath([[bx, by - 4], [bx + side * lm * .7, by + lm * .75], [bx - side * 2, by + 8]]); ctx.fillStyle = side < 0 ? 'rgba(235,252,255,.9)' : 'rgba(143,216,248,.95)'; ctx.fill();
      ctx.strokeStyle = 'rgba(230,250,255,.85)'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    glow(tipX, len, 16 + 12 * pulse + (gp < 1 ? 8 : 0), 'rgba(220,250,255,1)', .7);                                  // glint at the growing tip
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tipX - 9, len); ctx.lineTo(tipX + 9, len); ctx.moveTo(tipX, len - 9); ctx.lineTo(tipX, len + 9); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  crown(true);
  if (!dropping && fp < 1 && !reduceMotion) {                                                                          // ice dust gathering into the spike
    ctx.fillStyle = 'rgba(235,252,255,.95)'; ctx.strokeStyle = 'rgba(235,252,255,.8)'; ctx.lineWidth = 1; const pa = ctx.globalAlpha;
    for (let j = 0; j < 26; j++) {
      const pp = (tm * .55 + fxRnd(j * 1.3 + seed)) % 1, a = fxRnd(j * 3.1 + seed) * 6.283, r0 = bw * 2.2 + 70 * fxRnd(j * 5.7 + seed), hh = len * fxRnd(j * 2.3 + seed), e = pp * pp;
      const px = Math.cos(a) * r0 * (1 - e), py = hh + Math.sin(a) * r0 * .6 * (1 - e) - 20 * (1 - e);
      ctx.globalAlpha = pa * (1 - pp) * .9; ctx.beginPath(); ctx.arc(px, py, 1 + fxRnd(j) * 1.2, 0, 6.283); ctx.fill();
      if (j % 4 === 0) { ctx.beginPath(); ctx.moveTo(px - 3, py); ctx.lineTo(px + 3, py); ctx.moveTo(px, py - 3); ctx.lineTo(px, py + 3); ctx.stroke(); }
    }
    ctx.globalAlpha = pa;
  }
}
export function drawIceSpike(it, t) {
  const u = it.t, T1 = it.T1, fp = clamp01(u / T1), lock = u >= T1 && u < T1 + ISP.T2, ud = u - T1 - ISP.T2, dropping = ud > 0, tm = reduceMotion ? 0 : t, dy = it.dy || 0;
  const pulse = .5 + .5 * Math.sin(u * (lock ? 40 : 10)), exl = exL(), exr = exR();
  ctx.save();
  if (u < T1 + ISP.T2 + ISP.T3) {                                // cold sweeps in from the top edge: a frost haze and rime crystals along the whole top
    const va = .22 * Math.min(1, fp * 2) * (dropping ? Math.max(0, 1 - ud / ISP.T3) : 1);
    const vg = ctx.createLinearGradient(0, 0, 0, ST.H * .3); vg.addColorStop(0, 'rgba(150,225,255,' + va + ')'); vg.addColorStop(1, 'rgba(150,225,255,0)'); ctx.fillStyle = vg; ctx.fillRect(exl, 0, exr - exl, ST.H * .3);
    const len = 3 + 9 * Math.min(1, fp * 2.2); ctx.fillStyle = 'rgba(225,248,255,' + ((.35 + .4 * Math.min(1, fp * 2)) * (dropping ? Math.max(0, 1 - ud / ISP.T3) : 1)) + ')'; ctx.beginPath();
    for (let x = exl; x < exr; x += 11) { const l = len * (.5 + .5 * fxRnd(x * .31)); ctx.moveTo(x, 0); ctx.lineTo(x + 3.2, l); ctx.lineTo(x + 6.4, 0); }
    ctx.fill();
  }
  for (const cx of it.cols) {                                    // the exact danger lane, getting clearer as the spike nears full size
    const hw = it.bw + 8, la = (dropping ? Math.max(0, 1 - ud / (ISP.T3 * 1.3)) : 1) * (lock ? .85 + .15 * pulse : clamp01(fp - .12) * .9);
    if (la < .01) continue;
    const lg = ctx.createLinearGradient(0, 0, 0, ST.H); lg.addColorStop(0, 'rgba(160,240,255,' + (.2 * la) + ')'); lg.addColorStop(1, 'rgba(160,200,255,' + (.07 * la) + ')');
    ctx.fillStyle = lg; ctx.fillRect(cx - hw, 0, hw * 2, ST.H + 40);
    ctx.strokeStyle = 'rgba(225,248,255,' + (.3 + .55 * la) + ')'; ctx.lineWidth = lock ? 3 : 1.6; if (!lock) ctx.setLineDash([10, 8]); ctx.lineDashOffset = -tm * 60;
    ctx.beginPath(); ctx.moveTo(cx - hw, 0); ctx.lineTo(cx - hw, ST.H + 40); ctx.moveTo(cx + hw, 0); ctx.lineTo(cx + hw, ST.H + 40); ctx.stroke(); ctx.setLineDash([]);
    if (lock) {
      ctx.strokeStyle = 'rgba(235,252,255,' + (.8 * la) + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let k = 0; k < 4; k++) { const y = ((tm * 520 + k * ST.H * .24) % (ST.H + 40)); ctx.beginPath(); ctx.moveTo(cx - 12, y - 8); ctx.lineTo(cx, y + 6); ctx.lineTo(cx + 12, y - 8); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
  }
  for (let k = 0; k < it.cols.length; k++) {
    const cx = it.cols[k];
    if (dy < ST.H + it.L + 80) {
      ctx.save(); ctx.translate(cx + (lock && !reduceMotion ? Math.sin(u * 95 + k) * 1.8 : 0), dy);
      if (dropping && !reduceMotion) {                           // streak of cold light above the falling spike
        ctx.globalCompositeOperation = 'lighter'; const sg = ctx.createLinearGradient(0, -ST.H * .7, 0, 0); sg.addColorStop(0, 'rgba(190,240,255,0)'); sg.addColorStop(1, 'rgba(190,240,255,.34)'); ctx.fillStyle = sg; ctx.fillRect(-it.bw * .85, -ST.H * .7, it.bw * 1.7, ST.H * .7); ctx.globalCompositeOperation = 'source-over';
      }
      drawOneSpike(it, k, fp, lock, dropping, ud, tm, u);
      ctx.restore();
    }
  }
  if (it.frag) {                                                 // after the impact: shards fly, frost mist spreads along the bottom
    const ti = Math.max(0, u - it.impT), fa = clamp01(1 - ti / ISP.T4);
    for (const cx of it.cols) glow(cx, ST.H, 40 + ti * 260, 'rgba(190,235,255,1)', .38 * fa);
    for (const f of it.frag) {
      const x = f.x + f.vx * ti, y = f.y + f.vy * ti + 700 * ti * ti, a = f.rot + f.vr * ti;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = fa;
      polyPath([[0, -f.sz], [f.sz * .55, f.sz * .6], [-f.sz * .55, f.sz * .6]]); ctx.fillStyle = 'rgba(200,238,255,.95)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}
