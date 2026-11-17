import { ST } from '../state.js';
import { AUR, WARP_COL, ctx, cur, reduceMotion } from '../config.js';
import { heat, rgb, warpAmt, SIDES } from '../core.js';
import { drawThunders } from './thunder.js';
import { drawCosmic, drawPlanet } from './cosmic.js';
import { calcStormFlash } from './planets.js';
import { glow } from './glow.js';
import { drawAuroraBands, drawAuroraCurtains, drawIceShards, drawRift, drawStormClouds } from './sprites-b.js';
import { popSpark } from './popups.js';
import { bgCullSet, bgOn, drawNeon, drawNeonFx, nmRnd } from '../stages/neon.js';
import { drawOverflow, drawStageDetail, ovGroundStep } from '../stages/overflow.js';

// ====== ambience for Moonlit Garden and Nebula Reef (drawn in the world-wide background, so it spans the strips) ======
// gradients that only change with the screen height or the stage weight are built once and reused (same pixels, fewer allocations per frame)
let mgBeam = null, mgBeamH = -1, mgBeamA = -1;
const mgMist = [null, null], mgMistW = [-1, -1], mgMistA = [-1, -1];
const mgPetal = [], mgPetalS = [], mgPetalA = [];
export function drawMoonGarden(t, a, n) {
  const WW = ST.W;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {                                          // moonbeams
    const x0 = WW * (.18 + .3 * i) + Math.sin(t * .09 + i * 2) * WW * .035, wt = 34 + i * 12, dr = -150 - i * 40;
    if (mgBeamH !== ST.H || mgBeamA !== a) {
      mgBeam = ctx.createLinearGradient(0, 0, 0, ST.H * .95); mgBeam.addColorStop(0, 'rgba(190,205,255,' + (.085 * a) + ')'); mgBeam.addColorStop(1, 'rgba(190,205,255,0)'); mgBeamH = ST.H; mgBeamA = a;
    }
    ctx.fillStyle = mgBeam; ctx.beginPath(); ctx.moveTo(x0, -10); ctx.lineTo(x0 + wt, -10); ctx.lineTo(x0 + wt * 2.6 + dr, ST.H * .95); ctx.lineTo(x0 + dr, ST.H * .95); ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 4; i++) {                                          // mist banks
    const x = ((t * (5 + i * 2.5) + i * WW * .33) % (WW * 1.5)) - WW * .25, y = ST.H * (.66 + .07 * (i % 3)), rw = WW * (.3 + .06 * (i % 2));
    ctx.save(); ctx.translate(x, y); ctx.scale(1, .22);
    const mi = i % 2;
    if (mgMistW[mi] !== rw || mgMistA[mi] !== a) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rw); g.addColorStop(0, 'rgba(165,175,235,' + (.1 * a) + ')'); g.addColorStop(1, 'rgba(165,175,235,0)'); mgMist[mi] = g; mgMistW[mi] = rw; mgMistA[mi] = a;
    }
    ctx.fillStyle = mgMist[mi]; ctx.beginPath(); ctx.arc(0, 0, rw, 0, 6.283); ctx.fill(); ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0, NP = n(14); i < NP; i++) {                             // drifting blossom petals
    const r1 = nmRnd(i * 3.1 + 1), r2 = nmRnd(i * 5.7 + 2), r3 = nmRnd(i * 7.3 + 3);
    const x = r2 * WW + Math.sin(t * .7 + i) * 18, y = ((t * (16 + r1 * 20) + r3 * (ST.H + 60)) % (ST.H + 60)) - 30, sz = 3.4 + r1 * 3;
    if (!bgOn(x, sz * 1.5 + 2)) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * (.6 + r2) + i); ctx.scale(1, .55 + .45 * Math.sin(t * 1.3 + i * 1.9));
    if (mgPetalS[i] !== sz || mgPetalA[i] !== a) {
      const g = ctx.createLinearGradient(-sz, 0, sz, 0); g.addColorStop(0, 'rgba(255,225,240,' + (.55 * a) + ')'); g.addColorStop(1, 'rgba(255,170,205,' + (.5 * a) + ')'); mgPetal[i] = g; mgPetalS[i] = sz; mgPetalA[i] = a;
    }
    ctx.fillStyle = mgPetal[i]; ctx.beginPath(); ctx.moveTo(0, -sz); ctx.bezierCurveTo(sz * 1.1, -sz * .5, sz * .9, sz * .8, 0, sz); ctx.bezierCurveTo(-sz * .9, sz * .8, -sz * 1.1, -sz * .5, 0, -sz); ctx.fill(); ctx.restore();
  }
  for (let i = 0, NF = n(9); i < NF; i++) {                              // fireflies
    const r1 = nmRnd(i * 2.3 + 40), r2 = nmRnd(i * 4.1 + 41);
    const x = r1 * WW + Math.sin(t * (.25 + r2 * .3) + i * 3) * 40, y = ST.H * (.2 + r2 * .7) + Math.cos(t * (.3 + r1 * .3) + i) * 30;
    if (!bgOn(x, 20)) continue;
    const al = (.35 + .5 * Math.max(0, Math.sin(t * (1.1 + r1) + i * 2.2))) * a;
    glow(x, y, 12 + r2 * 6, 'rgba(215,255,150,1)', al);
    ctx.fillStyle = 'rgba(255,255,220,' + (al * .9) + ')'; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, 6.283); ctx.fill();
  }
}
function drawCosmicJelly(x, y, R, ph, t, a) {                          // an intergalactic jellyfish: a galaxy inside the bell, tentacles of star dust, a tiny ring and moon
  const sq = .07 * Math.sin(t * 1.5 + ph);
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a;
  glow(0, -R * .1, R * 2.1, 'rgba(150,110,255,1)', .3);
  ctx.lineCap = 'round';
  for (const sd of SIDES) {                                          // long oral arms
    const g = ctx.createLinearGradient(0, R * .1, 0, R * 3); g.addColorStop(0, 'rgba(190,150,255,.42)'); g.addColorStop(1, 'rgba(190,150,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(sd * R * .18, R * .1);
    for (let q = 1; q <= 8; q++) ctx.lineTo(sd * R * .18 + Math.sin(t * 1.1 + q * .6 + sd) * (4 + q * 1.8), R * .1 + q * R * .36);
    ctx.stroke();
  }
  for (let k = 0; k < 7; k++) {                                        // tentacles of star dust: beads that shrink and fade along the length
    const tx = (k - 3) * R * .24, len = 7 + (k % 3);
    ctx.fillStyle = k % 2 ? 'rgba(150,235,255,.75)' : 'rgba(255,170,235,.75)'; ctx.beginPath();
    for (let q = 0; q < len; q++) { const u = q / len, px = tx + Math.sin(t * 1.3 + k * 1.1 + q * .75) * (3 + u * 9), py = R * .12 + q * R * .3 + (k % 2) * R * .15 + Math.sin(k * 2.3) * R * .06, rr = 2.1 * (1 - u) + .7; ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, 6.283); }
    ctx.fill();
  }
  ctx.save(); ctx.scale(1 + sq, 1 - sq);
  const bg = ctx.createRadialGradient(0, -R * .25, R * .05, 0, 0, R * 1.1);
  bg.addColorStop(0, 'rgba(255,225,255,.5)'); bg.addColorStop(.35, 'rgba(200,120,255,.32)'); bg.addColorStop(.75, 'rgba(90,120,255,.2)'); bg.addColorStop(1, 'rgba(60,200,255,.12)');
  ctx.beginPath(); ctx.arc(0, 0, R, Math.PI, 0); ctx.bezierCurveTo(R * .75, R * .3, -R * .75, R * .3, -R, 0); ctx.closePath(); ctx.fillStyle = bg; ctx.fill();
  ctx.save(); ctx.clip();                                              // the galaxy inside the bell
  ctx.save(); ctx.rotate(t * .15 + ph); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath();
  for (let arm = 0; arm < 2; arm++) for (let q = 0; q < 9; q++) { const u = q / 9, an = arm * Math.PI + u * 3.4, rr = R * (.1 + u * .7), sx = Math.cos(an) * rr, sy = Math.sin(an) * rr * .55 - R * .2, sr = .6 + (1 - u) * 1.1; ctx.moveTo(sx + sr, sy); ctx.arc(sx, sy, sr, 0, 6.283); }
  ctx.fill(); ctx.restore();
  for (let grp = 0; grp < 2; grp++) {
    ctx.fillStyle = 'rgba(255,255,255,' + (.45 + .4 * Math.sin(t * 1.7 + grp * Math.PI)) + ')'; ctx.beginPath();
    for (let i = grp; i < 12; i += 2) { const sx = (nmRnd(i * 3.1 + ph) - .5) * R * 1.8, sy = -nmRnd(i * 5.3 + ph) * R * .9; ctx.moveTo(sx + .8, sy); ctx.arc(sx, sy, .8, 0, 6.283); }
    ctx.fill();
  }
  ctx.restore();
  const rg = ctx.createLinearGradient(-R, 0, R, 0); rg.addColorStop(0, 'rgba(120,235,255,.7)'); rg.addColorStop(.5, 'rgba(255,230,255,.8)'); rg.addColorStop(1, 'rgba(255,150,225,.7)');
  ctx.strokeStyle = rg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, R, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = 'rgba(255,240,255,' + (.55 + .3 * Math.sin(t * 2 + ph)) + ')'; ctx.beginPath();
  for (let k = 0; k < 11; k++) { const an = Math.PI + (k + .5) * Math.PI / 11; ctx.moveTo(Math.cos(an) * R + 1.5, Math.sin(an) * R); ctx.arc(Math.cos(an) * R, Math.sin(an) * R, 1.5, 0, 6.283); }
  ctx.fill();
  ctx.restore();
  ctx.save(); ctx.rotate(-.25); ctx.strokeStyle = 'rgba(170,200,255,.26)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -R * .05, R * 1.45, R * .4, 0, 0, 6.283); ctx.stroke();
  const oa = t * .7 + ph, ox = Math.cos(oa) * R * 1.45, oy = Math.sin(oa) * R * .4 - R * .05;
  glow(ox, oy, 9, 'rgba(255,240,200,1)', .7); ctx.fillStyle = 'rgba(255,250,235,.95)'; ctx.beginPath(); ctx.arc(ox, oy, 1.7, 0, 6.283); ctx.fill(); ctx.restore();
  ctx.restore();
}
export function drawReefLife(t, a, n) {
  const WW = ST.W;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {                                          // sun shafts through the water
    const x0 = WW * (.1 + .24 * i) + Math.sin(t * .11 + i * 1.7) * WW * .04, wt = 26 + 10 * Math.sin(t * .3 + i) + i * 6;
    const g = ctx.createLinearGradient(0, 0, 0, ST.H * .85); g.addColorStop(0, 'rgba(120,235,255,' + (.09 * a) + ')'); g.addColorStop(1, 'rgba(120,235,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, -10); ctx.lineTo(x0 + wt, -10); ctx.lineTo(x0 + wt * 2.2 - 110, ST.H * .85); ctx.lineTo(x0 - 110, ST.H * .85); ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0, NJ = ST.lowFx ? 2 : 3; i < NJ; i++) {                     // slow intergalactic jellyfish drifting up
    const ph = i * 2.1, y = ST.H * 1.15 - ((t * (12 + i * 3) + i * ST.H * .55) % (ST.H * 1.5)), x = WW * (.18 + .32 * i) + Math.sin(t * .22 + ph) * WW * .05;
    if (bgOn(x, (40 + i * 9) * 2.3 + 12)) drawCosmicJelly(x, y, 40 + i * 9, ph, t, a);
  }
  for (let i = 0, NB = n(26); i < NB; i++) {                             // drifting star dust and twinkles
    const r1 = nmRnd(i * 2.9 + 60), r2 = nmRnd(i * 4.3 + 61), r3 = nmRnd(i * 6.1 + 62);
    const x = r1 * WW + Math.sin(t * .5 + i) * 10, y = ((t * (10 + r2 * 20) + r3 * (ST.H + 30)) % (ST.H + 30)) - 10;
    if (!bgOn(x, 12)) continue;
    if (i % 4 === 0) {
      const sz = 2.5 + r1 * 2.5; ctx.fillStyle = 'rgba(210,235,255,' + (.5 * a * (.4 + .6 * Math.abs(Math.sin(t * 1.8 + i)))) + ')'; popSpark(x, y, sz);
    } else { ctx.fillStyle = 'rgba(170,240,255,' + (.35 * a * (.5 + .5 * Math.sin(t * 2 + i))) + ')'; ctx.beginPath(); ctx.arc(x, y, .9 + r2 * 1.8, 0, 6.283); ctx.fill(); }
  }
}

export function drawBackground(t, pulse) {
  const warp = warpAmt();
  bgCullSet();
  const gr = ctx.createLinearGradient(0, 0, 0, ST.H);
  gr.addColorStop(0, rgb(cur.top)); gr.addColorStop(1, rgb(cur.bot));
  ctx.fillStyle = gr; ctx.fillRect(-ST.W * .6, -ST.H * .15, ST.W * 2.2, ST.H * 1.3);   // oversized so a banked or slid camera never shows an empty corner
  glow(ST.W / 2, ST.H * .9, ST.H * .7, rgb(cur.glow), .12 + ST.dispD * .1 + pulse * ST.dispD * .05);

  // universe 1: drifting nebula clouds
  if (ST.uw[1] > .01) {
    for (const b of ST.blobs) {
      if (ST.lowFx && b.i > 2) continue;
      const x = b.x * ST.W + Math.sin(t * .12 + b.ph) * 50, span = ST.H + b.r * 2;
      if (!bgOn(x, b.r + 2)) continue;
      const y = ((b.y * ST.H + ST.nebScroll * (.5 + b.r / 250)) % span) - b.r;
      glow(x, y, b.r, 'rgba(' + b.c + ',1)', .3 * ST.uw[1]);
    }
  }
  // universe 2: aurora ribbons
  if (ST.uw[2] > .01) {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let j = 0; j < 3; j++) {
      for (const [w, al] of (ST.lowFx ? [[12, .14]] : [[54, .05], [28, .08], [12, .14]])) {
        ctx.strokeStyle = 'rgba(' + AUR[j] + ',' + (al * ST.uw[2] * (1 + pulse * .5)) + ')'; ctx.lineWidth = w; ctx.beginPath();
        for (let x = -10; x <= ST.W + 10; x += 14) {
          const y = ST.H * (.16 + .13 * j) + Math.sin(x * .011 + t * (.5 + .2 * j) + j * 2) * (30 + j * 12) + Math.sin(x * .027 - t * .7) * (14 + j * 5);
          x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  }

  calcStormFlash(); drawAuroraBands(t); drawAuroraCurtains(t, pulse); drawIceShards(t); drawRift(t); drawStormClouds(t, pulse); ovGroundStep(); drawOverflow(t, pulse);

  // stars: dots when calm, stretching into streaks as heat rises, fading out under warp
  const sa = (1 - warp * .85) * (1 - ST.uw[4]) * (1 - ST.uw[5]);
  if (sa > .02) {
    ctx.strokeStyle = '#E9E6FF'; ctx.fillStyle = '#E9E6FF';
    for (const s of ST.stars) {
      if (s.x + 6 < ST.bgLo || s.x - 6 > ST.bgHi) continue;
      ctx.globalAlpha = Math.min(1, .35 + .4 * Math.abs(Math.sin(t * 1.5 + s.tw)) + pulse * ST.dispD * .3) * sa;
      const len = ST.dispD * ST.dispD * 70 * (s.layer + 1) / 3;
      if (len > 3) { ctx.lineWidth = s.r * 1.5; ctx.beginPath(); ctx.moveTo(s.x, s.y - len); ctx.lineTo(s.x, s.y); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  drawNeon(t, pulse);
  // exoplanets drifting past (they rush by faster as heat rises)
  for (const o of ST.cosmos) drawCosmic(o, t);
  ST.sprBudget = 1;
  for (const p of ST.planets) drawPlanet(p, t);
  drawThunders();
  drawStageDetail(t);

  // universe 3: ash storm + lightning
  if (ST.uw[3] > .01) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,130,60,' + (.5 * ST.uw[3]) + ')'; ctx.lineWidth = 2; ctx.beginPath();
    for (const a of ST.ash) { ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - a.vx * .06, a.y - a.vy * .06); }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  // vertical speed lines (hand over to the warp tunnel at the top end)
  if (ST.dispD > .2 && !reduceMotion) {
    ctx.strokeStyle = heat(ST.dispD, Math.min(.28, (ST.dispD - .2) * .4) * (1 - warp * .6)); ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const l of ST.lines) { ctx.moveTo(l.x, l.y); ctx.lineTo(l.x, l.y - l.len * (.5 + ST.dispD)); }
    ctx.stroke();
  }

  // light speed: parallel streaks racing down the screen, because the moth is flying up
  if (warp > .02) {
    ctx.globalCompositeOperation = 'lighter';
    const lean = ST.moth ? Math.max(-.5, Math.min(.5, ST.moth.tilt * 2)) : 0;
    ctx.lineCap = 'round';
    for (let ci = 0; ci < 3; ci++) {
      const al = .08 + warp * .2 + (1 - ST.hudA) * .12, lw = 1 + warp * .7 - ci * .15;
      for (const [frac, wmul, amul] of [[1, 3, .28], [.68, 1.1, .55], [.3, .8, .95]]) {   // directional blur: wide faint halo over the full length, brighter and thinner toward the head
        ctx.strokeStyle = 'rgba(' + WARP_COL[ci] + ',' + Math.min(1, al * amul) + ')'; ctx.lineWidth = lw * wmul; ctx.beginPath();
        for (let i = ci; i < ST.warpStars.length; i += 3) {
          const w = ST.warpStars[i], L = w.len * (.4 + warp * 1.4) * frac;
          ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + lean * L * .5, w.y - L);
        }
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
    ctx.globalCompositeOperation = 'source-over';
  }

  drawNeonFx(t);
  // portal when crossing into a new universe (rings rush out) or back to the start (rings collapse)
  if (ST.portal && !reduceMotion) {
    const p = ST.portal.t / ST.portal.dur, cx = ST.moth ? ST.moth.x + ST.bgS : ST.W / 2, cy = ST.moth ? ST.moth.y : ST.H * .8, maxR = Math.hypot(ST.W, ST.H) * .6;
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 7; k++) {
      const q = p * 1.35 - k * .07;
      if (q <= 0 || q >= 1) continue;
      const r = (ST.portal.dir > 0 ? q : 1 - q) * maxR;
      ctx.strokeStyle = ST.portal.dir > 0 ? 'rgba(200,230,255,' + ((1 - q) * .8) + ')' : 'rgba(255,90,110,' + ((1 - q) * .7) + ')';
      ctx.lineWidth = 2 + (1 - q) * 7; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, r), 0, 6.283); ctx.stroke();
    }
    glow(cx, cy, maxR * .5, ST.portal.dir > 0 ? 'rgba(220,235,255,1)' : 'rgba(255,80,100,1)', (1 - p) * (1 - p) * .5);
    ctx.globalCompositeOperation = 'source-over';
  }
}
