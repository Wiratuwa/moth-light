import { ST } from './state.js';
import { OSTYLE, POWER_COL, STAGES, ctx, cv, menu, over, reduceMotion } from './config.js';
import { heat, hexA, kEio, kEo, kSm, lerp, portalStart, reset } from './core.js';
import { makePlanet } from './render/cosmic.js';
import { auroraPlanet, crimsonPlanet } from './render/planets.js';
import { persist } from './save.js';
import { burst, ring } from './spawn.js';
import { POP_MSG } from './events.js';
import { BOSS } from './bosses/boss.js';
import { clampN } from './bosses/sentinel.js';
import { armorWatch, bossHitFx, drawBossBar } from './bosses/fx.js';
import { spawnProp } from './stages/neon.js';
import { TTL } from './title.js';
import { bossBoom } from './cine.js';
import { menuPanel, pausedEl, startGame } from './ui.js';
import { Sound } from './audio.js';

let pvBl = null;
let pvSm = null;

// ---------- trailer: a ~27 second cinematic that shows steering, heat, hazards, power-ups and bosses across three worlds
// ---------- trailer camera: slow push-ins, dutch angles, pans that follow the subject, parallax, and a focal blur that racks focus
const PV_CAM = [  // t, roll (deg, kept tiny), zoom, pan toward the subject (0..1)
  [0, 0, 1.35, .7], [3.0, 0, 1, .3], [4.6, 0, 1, .2], [5.0, 0, 1, .3],
  [5.4, 0, 1.3, .9], [6.7, 0, 1.3, .9], [7.0, 0, 1.12, .5], [7.6, 0, 1.1, .4],                                 // owl: close and following, then back to the player
  [8.0, -1.5, 1.35, .95], [9.0, -1.5, 1.35, .9], [9.8, 0, 1.05, .25], [10.4, 0, 1.05, .25], [10.9, 0, 1, .2],     // boss: pan to it, then pull back to show player vs boss
  [11.0, 0, 1, .2], [11.8, 0, 1.1, .4], [14.0, 0, 1.1, .4],
  [14.5, 1.5, 1.35, .95], [15.6, 1.5, 1.35, .9], [16.3, 0, 1.05, .25], [16.8, 0, 1, .2], [17.0, 0, 1, .2],
  [18.8, 0, 1.08, .4], [21.0, 0, 1.08, .4],
  [21.5, -1.5, 1.35, .95], [22.6, -1.5, 1.35, .9], [23.3, 0, 1.05, .25], [23.8, 0, 1.05, .25], [24.4, 0, 1, 0], [27.6, 0, 1, 0]];
// Planned for later, NOT built: the visible stage is ~70% of the scene with a hidden ~15% each side; dragging the moth too far left/right reveals it and tilts the camera that way.
function pvScr(x, y) {                       // where a world point lands on screen under the current camera
  const C = ST.PVX && ST.PVX.cam; if (!C) return { x, y };
  const c = Math.cos(C.roll), s = Math.sin(C.roll), dx = x - (ST.W / 2 + C.sx), dy = y - (ST.H / 2 + C.sy);
  return { x: ST.W / 2 + C.z * (dx * c - dy * s), y: ST.H / 2 + C.z * (dx * s + dy * c) };
}
function pvFocusTarget(t) {
  const find = ty => ST.items.find(i => i.type === ty);
  if (ST.boss) return ST.boss.life < 2.0 ? { x: ST.boss.x, y: ST.boss.y, r: 120, a: 0 } : { x: (ST.boss.x + ST.moth.x) / 2, y: (ST.boss.y + ST.moth.y) / 2, r: 200, a: 0 };
  const o = find('owl'), st = find('strike'), pp = find('popup'), pu = find('power');
  if (o) {                                   // hyperfocus: only the owl charging in is sharp; once it is near the player, focus returns to the moth
    if (Math.hypot(o.x - ST.moth.x, o.y - ST.moth.y) > 190) return { x: o.x, y: o.y, r: 100, a: .85 };
    return { x: ST.moth.x, y: ST.moth.y, r: 120, a: 0 };
  }
  if (st) return { x: st.x, y: ST.H * .5, r: 150, a: 0 };
  if (pp) { const w = pp.ps.find(p => p.on); if (w) return { x: w.x, y: ST.moth.y - 60, r: 110, a: 0 }; }
  if (pu && pu.y > ST.H * .3) return { x: pu.x, y: pu.y, r: 90, a: 0 };
  return { x: ST.moth.x, y: ST.moth.y, r: Math.max(110, ST.W * .3), a: 0 };
}
function pvCamUpdate(dt) {
  const P = ST.PVX, t = P.t; let roll = 0, z = 1, pan = 0;
  for (let i = 1; i < PV_CAM.length; i++) if (t <= PV_CAM[i][0]) {
    const A = PV_CAM[i - 1], B = PV_CAM[i], u = kEio((t - A[0]) / (B[0] - A[0]));
    roll = lerp(A[1], B[1], u) * Math.PI / 180; z = lerp(A[2], B[2], u); pan = lerp(A[3], B[3], u); break;
  }
  const tg = pvFocusTarget(t), f = P.f || (P.f = { x: tg.x, y: tg.y, r: tg.r, a: tg.a }), e = 1 - Math.exp(-dt * 3.2);     // the focus eases onto the next subject: a rack focus
  f.x += (tg.x - f.x) * e; f.y += (tg.y - f.y) * e; f.r += (tg.r - f.r) * e; f.a += (tg.a - f.a) * e;
  if (reduceMotion) { z = 1; roll = 0; }
  roll += Math.sin(t * 1.3) * .006; const swx = Math.sin(t * .9) * 3, swy = Math.cos(t * 1.1) * 3;   // a little handheld drift
  const c = Math.cos(roll), s = Math.sin(roll), needX = Math.abs(c) + Math.abs(s) * (ST.H / ST.W), needY = Math.abs(c) + Math.abs(s) * (ST.W / ST.H);
  const mx = Math.max(0, z - needX) * ST.W / 2 / z * .9, my = Math.max(0, z - needY) * ST.H / 2 / z * .9;
  const sx = clampN((f.x - ST.W / 2) * pan, -mx, mx) + swx, sy = clampN((f.y - ST.H / 2) * pan, -my, my) + swy;
  const dx = f.x - (ST.W / 2 + sx), dy = f.y - (ST.H / 2 + sy);
  P.cam = { sx, sy, z, roll, fx: ST.W / 2 + z * (dx * c - dy * s), fy: ST.H / 2 + z * (dx * s + dy * c), r: f.r * z, a: reduceMotion ? 0 : f.a };
}
export function pvFocal() {                         // depth of field: a soft copy of the frame everywhere, the sharp frame only around the subject
  const C = ST.PVX && ST.PVX.cam; if (!C || C.a < .02) return;
  const w = cv.width, h = cv.height, sw = Math.max(64, w >> 2), sh = Math.max(64, h >> 2);
  if (!pvBl || pvBl.width !== w || pvBl.height !== h) { pvBl = document.createElement('canvas'); pvBl.width = w; pvBl.height = h; pvSm = document.createElement('canvas'); pvSm.width = sw; pvSm.height = sh; }
  const sc = pvSm.getContext('2d'), mc = pvBl.getContext('2d');
  sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, sw, sh);
  if ('filter' in sc) sc.filter = 'blur(' + (C.a * 2.2) + 'px)'; sc.drawImage(cv, 0, 0, sw, sh); if ('filter' in sc) sc.filter = 'none';
  mc.setTransform(1, 0, 0, 1, 0, 0); mc.globalCompositeOperation = 'source-over'; mc.clearRect(0, 0, w, h); mc.drawImage(cv, 0, 0);
  const px = C.fx * ST.DPR, py = C.fy * ST.DPR, pr = C.r * ST.DPR, g = mc.createRadialGradient(px, py, pr * .5, px, py, pr * 1.6);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  mc.globalCompositeOperation = 'destination-in'; mc.fillStyle = g; mc.fillRect(0, 0, w, h); mc.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(pvSm, 0, 0, sw, sh, 0, 0, w, h); ctx.drawImage(pvBl, 0, 0);
  ctx.restore();
}
function draw3DGem(cx, cy, r, col, a) {      // a lit, spinning octahedron: tiny real 3D with back-face culling and a light
  const V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], F = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(.55), sb = Math.sin(.55);
  const P = V.map(v => { const x = v[0] * ca + v[2] * sa, z0 = -v[0] * sa + v[2] * ca, y = v[1] * cb - z0 * sb, z = v[1] * sb + z0 * cb, s = 1 / (1 - z * .18); return [cx + x * r * s, cy + y * r * s, z]; });
  const L = [-.4, -.6, -.7], faces = F.map(f => {
    const A = P[f[0]], B = P[f[1]], C = P[f[2]], ux = B[0] - A[0], uy = B[1] - A[1], vx = C[0] - A[0], vy = C[1] - A[1], nz = ux * vy - uy * vx;
    const wv = f.map(i => { const q = V[i]; const x = q[0] * ca + q[2] * sa, z0 = -q[0] * sa + q[2] * ca; return [x, q[1] * cb - z0 * sb, q[1] * sb + z0 * cb]; });
    const e1 = wv[1].map((x, i) => x - wv[0][i]), e2 = wv[2].map((x, i) => x - wv[0][i]), n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], nl = Math.hypot(n[0], n[1], n[2]) || 1;
    return { f, nz, z: (A[2] + B[2] + C[2]) / 3, lit: Math.max(0, -(n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / nl) };
  }).filter(q => q.nz < 0 || q.nz > 0 && false).sort((p, q) => q.z - p.z);
  const vis = F.map((f, i) => i).length; void vis;
  ctx.save(); ctx.lineJoin = 'round';
  for (const q of faces) {
    ctx.fillStyle = hexA(col, 1); ctx.beginPath(); q.f.forEach((i, k) => k ? ctx.lineTo(P[i][0], P[i][1]) : ctx.moveTo(P[i][0], P[i][1])); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(8,6,26,' + (.62 * (1 - q.lit)) + ')'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,' + (.35 * q.lit * q.lit) + ')'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
}
export const PV_DUR = 27.6, PV_SLOW = .6;   // script seconds run at 60% speed so every caption can be read calmly
const PV_ACTS = [
  { t0: 4.4, stage: 0, pw: 'shield', pwT: 7.0, bossIn: 7.8, fightEnd: 10.4, hz: 5.2 },
  { t0: 11.0, stage: 3, pw: 'rod', pwT: 13.7, bossIn: 14.4, fightEnd: 16.6, hz: 12.0 },
  { t0: 18.3, stage: 4, pw: 'ctrlz', pwT: 20.6, bossIn: 21.4, fightEnd: 23.8, hz: 18.9 }
];
const PV_PW = { shield: ['Shield', 'Blocks one hit'], rod: ['Lightning rod', 'Absorbs lightning'], ctrlz: ['Ctrl+Z', 'Undoes one hit'] };
const PV_ORBS = [[1.0], [1.45], [1.9, 1], [2.35], [2.8], [3.25, 1], [3.7], [4.15], [5.0], [5.5], [6.0, 1], [11.7], [12.2], [12.7, 1], [13.4], [13.9], [18.8], [19.3], [19.8, 1], [20.3], [20.8]];
const PV_CAPS = [[.6, 2.4, 'Drag to steer'], [2.5, 4.4, 'Orbs build heat. Heat builds score.'], [5.0, 6.9, 'Every hazard warns you first'], [7.0, 8.7, 'Grab power-ups'], [8.8, 10.4, 'Line up under bosses to strike'], [10.45, 12.0, 'Every 250 points, jump to a new world'], [12.0, 13.4, 'Lightning shows its lane first'], [13.5, 15.4, 'Each world has its own power-ups'], [16.7, 18.6, 'Some worlds bend the rules'], [18.8, 20.9, 'Pop-ups open in numbered order']];
const PV_HEAT = [[0, 0], [4.2, .5], [4.4, .2], [10.4, .85], [11, .2], [16.6, .85], [18.3, .2], [23.8, .9], [24.2, .3], [27.6, 0]];
export const PV_KEYS = [];  function pvMx(t) {
  const k = Math.max(0, Math.min(PV_KEYS.length - 2, Math.floor(t / 1.05))), a = PV_KEYS[k], b = PV_KEYS[k + 1], u = kEio((t - a[0]) / 1.05);
  return ST.W * clampN(a[1] + (b[1] - a[1]) * u, .16, .84) + Math.sin(t * 3.1) * 5;
}
const pvMy = t => ST.H * .74 + Math.sin(t * 2.1) * 4;
const pvAway = (t, dist) => { const m = pvMx(t); return clampN(m + (m < ST.W / 2 ? dist : -dist), 34, ST.W - 34); };
function pvDiff(t) { for (let i = 1; i < PV_HEAT.length; i++) if (t <= PV_HEAT[i][0]) { const a = PV_HEAT[i - 1], b = PV_HEAT[i]; return lerp(a[1], b[1], kSm(a[0], b[0], t)); } return 0; }
function pvSwapVis(i) {
  ST.curStage = i; ST.planets = []; ST.cosmos = []; ST.props = [];
  if (i === 4) { for (let k = 0; k < 3; k++) spawnProp(true); } else { for (let k = 0; k < 2; k++) ST.planets.push(i === 3 ? crimsonPlanet(-60 - k * 160) : i === 2 ? auroraPlanet(-60 - k * 160) : makePlanet(i, -60 - k * 160)); }
  Sound.setStage(i);
}
function pvCreateBoss(A) {
  const def = STAGES[A.stage].boss, B = BOSS[def.kind];
  ST.boss = { kind: def.kind, name: def.name, lvl: 0, hp: 100, max: 100, x: ST.W / 2, y: -110, ty: Math.min(ST.H * .4, Math.max(ST.H * .2, 250)), t: 0, r: Math.min(B.r, ST.W * .12), spd: B.spd,
    entered: true, atk: 99, pat: 0, aimLeft: 0, aimT: 0, flashT: 0, life: 0, off: 0, warp: null, glT: 0, q: [], nextAtk: 0, phase: 0, stagger: 0, core: 0, coreWarn: 0, coreCD: 99, armor: 40, armorMax: 40, aFlash: 0 };
}
function pvPhaseFx(n) {
  if (!ST.boss) return;
  ST.boss.phase = n; ST.boss.armor = ST.boss.armorMax = 40;
  burst(ST.boss.x, ST.boss.y, '#FFD166', 40, 420, 1.1); ring(ST.boss.x, ST.boss.y, 'rgba(255,209,102,.9)', 900, .7, 6); ring(ST.boss.x, ST.boss.y, 'rgba(255,255,255,.8)', 600, .5, 3);
  ST.shake = Math.max(ST.shake, .6); ST.flash = Math.max(ST.flash, .2); Sound.roar(true);
}
export function startPV(then) {
  Sound.start(); Sound.duck(false); Sound.setStage(0); Sound.setD(0);
  reset(); ST.state = 'pv'; ST.paused = false;
  menu.classList.add('hide'); over.classList.add('hide'); pausedEl.classList.add('hide'); menuPanel.classList.remove('open');
  document.body.classList.add('pv');
  pvSwapVis(0); ST.stageNo = 0; ST.card = null; ST.diff = 0; ST.dispD = 0; ST.warpBoost = 0; ST.trans = null;
  const P = ST.PVX = { t: 0, then, ev: [], got: {}, streak: 0, call: null, fireT: 0, side: 1, epi: false, pop: null, strikes: null, owl: null };
  const ev = (t, fn) => P.ev.push([t, fn]);
  PV_ACTS.forEach((A, i) => {
    const L = A.fightEnd - A.bossIn - 1.2;
    if (i === 0) ev(A.t0, () => { ST.stageNo = 0; ST.card = { t: 0 }; });
    ev(A.hz, () => Sound.warn());
    ev(A.bossIn, () => { pvCreateBoss(A); Sound.roar(true); ST.shake = .6; ST.rumble = .7; });
    ev(A.bossIn + 1.2 + L * .33, () => pvPhaseFx(1));
    ev(A.bossIn + 1.2 + L * .66, () => pvPhaseFx(2));
    ev(A.fightEnd, () => { if (ST.boss) { bossBoom(ST.boss); ST.boss = null; ST.bolts = []; } });
    ev(A.pwT, () => {
      const m = ST.moth; ring(m.x, m.y, 'rgba(255,255,255,.9)', 420, .6, 4); burst(m.x, m.y, POWER_COL[A.pw], 22, 300, .9); Sound.power(A.pw);
      P.call = { t0: P.t, kind: A.pw, x: m.x }; if (A.pw === 'shield') ST.pw.shield = true; else if (A.pw === 'rod') ST.pw.rodT = 8; else ST.pw.undo = true;
    });
  });
  ev(5.9, () => Sound.whoosh());
  ev(10.4, () => Sound.jump());
  ev(11.0, () => { pvSwapVis(3); ST.stageNo = 1; ST.card = { t: 0 }; ST.pw.shield = false; ST.flash = .9; ST.shake = .6; portalStart(1, true); Sound.arrive(); });
  ev(13.05, () => { Sound.thunder(0, false); ST.flash = Math.max(ST.flash, .4); ST.shake = Math.max(ST.shake, .5); });
  ev(12.9, () => Sound.warn());
  ev(13.95, () => { Sound.thunder(0, false); ST.flash = Math.max(ST.flash, .3); ST.shake = Math.max(ST.shake, .4); });
  ev(16.9, () => { ST.trans = { t: 0, dur: 3.6, swapAt: 1.4, swapped: false, to: 4, neon: true, enter: true }; ST.pw.rodT = 0; Sound.glitchJump(true); Sound.voice('welcome', .9); });
  ev(18.9, () => {
    const dw = Math.max(104, Math.min(150, ST.W * .34)), ps = [];
    for (let i = 0; i < 3; i++) { const at = 1.0 + i * .62, m = POP_MSG[i % POP_MSG.length]; ps.push({ x: pvAway(PV_ACTS[2].hz + at, ST.W * .3), w: dw, h: 78, n: i + 1, at, life: 1.15, title: m[0], msg: m[1], on: false, done: false, t0: at, sfx: 0 }); }
    P.pop = { ps, t0: P.t };
  });
  ev(24.2, () => { P.epi = true; ST.boss = null; ST.bolts = []; ST.items = []; ST.pw.undo = false; TTL.x = ST.moth.x; TTL.y = ST.moth.y; TTL.init = true; TTL.ms = 1; TTL.age = 0; TTL.hold = 0; skipHint(false); });
  P.ev.sort((a, b) => a[0] - b[0]);
  skipHint(true);
}
function skipHint(on) { document.getElementById('skipBtn').classList.toggle('show', on); }
export function pvEnd() {
  if (!ST.PVX) return;
  const then = ST.PVX.then, mx = ST.moth ? ST.moth.x : ST.W / 2, my = ST.moth ? ST.moth.y : ST.H * .8;
  ST.PVX = null; ST.pvSeen = true; ST.save.pv = 1; persist();
  document.body.classList.remove('pv'); skipHint(false);
  ST.boss = null; ST.bolts = []; ST.trans = null; ST.card = null; ST.warpBoost = 0;
  if (then === 'play') { startGame(); return; }
  reset(); ST.state = 'menu'; pvSwapVis(0);
  TTL.x = mx; TTL.y = my; TTL.init = true; TTL.hold = 0; TTL.ms = Math.min(TTL.ms, 1.9);
  menu.classList.remove('hide'); Sound.setD(0); Sound.setStage(0); Sound.duck(true);
}
function pvItems(t) {
  const P = ST.PVX, out = [], my = pvMy(t), OS = OSTYLE[ST.curStage];
  PV_ORBS.forEach((o, i) => {
    const arr = o[0], y = pvMy(arr) - (arr - t) * 240;
    if (y < -30 || t > arr + .02) { if (t >= arr && !P.got['o' + i] && t < arr + .3) { P.got['o' + i] = 1; burst(pvMx(arr), pvMy(arr), o[1] ? OS.g : OS.b, 8, 200, .7); Sound.collect(P.streak++ % 10); } return; }
    if (ST.curStage === 3 && arr < 11 || ST.curStage !== 3 && arr > 11 && arr < 18 || ST.curStage !== 4 && arr > 18) return;
    out.push({ type: o[1] ? 'gold' : 'orb', r: o[1] ? 12 : 13, x: pvMx(arr), y, ph: i * 1.7, spin: 0 });
  });
  PV_ACTS.forEach(A => {
    const y = pvMy(A.pwT) - (A.pwT - t) * 200;
    if (t < A.pwT && y > -30 && t > A.pwT - 3) out.push({ type: 'power', kind: A.pw, r: 15, x: pvMx(A.pwT), y, ph: 1.3, spin: 0 });
  });
  const hz1 = PV_ACTS[0].hz;                                           // Moonlit: a night owl dives along a warned line
  if (t >= hz1 && t < hz1 + 2.3) {
    const wl = 1.1 - (t - hz1), tx = pvAway(hz1 + 1.4, ST.W * .3), sx = clampN(tx + (tx < ST.W / 2 ? 130 : -130), 30, ST.W - 30), sy = 135, ty = pvMy(hz1 + 1.5);
    const d = Math.hypot(tx - sx, ty - sy), dir = [(tx - sx) / d, (ty - sy) / d], tr = Math.max(0, -wl) * 760;
    if (tr < d + 140) out.push({ type: 'owl', x: sx + dir[0] * tr, y: sy + dir[1] * tr, r: 17, sx, sy, tx, ty, warn: Math.max(0, wl), spd: 760, hit: false });
  }
  const hz2 = PV_ACTS[1].hz;                                           // Crimson: two lightning lanes, each shown before it strikes
  [[hz2, 1.3], [hz2 + .9, 1.3]].forEach((s, k) => {
    const lt = t - s[0]; if (lt < 0 || lt > 1.05 + .25) return;
    const x = pvAway(s[0] + 1.05 + .1, ST.W * (k ? .22 : .32));
    out.push({ type: 'strike', x, y: 0, r: 0, warn: Math.max(0, 1.05 - lt), act: lt > 1.05 ? Math.max(0, .25 - (lt - 1.05)) : 0, col: '255,230,120', hit: false, w: 42, t: lt });
  });
  if (P.pop) {                                                       // Neon: numbered pop-up windows
    const tl = t - P.pop.t0; P.pop.ps.forEach(p => {
      p.on = tl >= p.at && tl < p.at + p.life; p.done = tl >= p.at + p.life;
      if (p.on && !p.sfx) { p.sfx = 1; Sound.popOpen(); }
    });
    if (tl < 1 + 3 * .62 + 1.3) out.push({ type: 'popup', x: ST.W / 2, y: my - 6, r: 0, ps: P.pop.ps, t: tl });
  }
  return out;
}
function pvBossStep(t, dt) {
  if (!ST.boss) { ST.bolts = []; return; }
  const A = PV_ACTS.filter(a => t >= a.bossIn - .01).pop(), u = t - A.bossIn, en = kEio(u / 1.1), L = A.fightEnd - A.bossIn - 1.2;
  ST.boss.t += dt; ST.boss.life += dt; ST.boss.flashT = Math.max(0, ST.boss.flashT - dt); ST.boss.aFlash = Math.max(0, ST.boss.aFlash - dt);
  ST.boss.y = lerp(-110, ST.boss.ty, en) + (u > 1.1 ? Math.sin(u * 1.7) * 8 : 0); ST.boss.spin = u < 1.1 ? (1 - en) * 6.283 : 0;
  ST.boss.x = en < 1 ? ST.W / 2 : lerp(ST.W / 2, ST.moth.x, .85) + Math.sin(u * 2.2) * ST.boss.r * .35;
  const f = kSm(1.2, 1.2 + L, u), seg = f * 3 - Math.floor(Math.min(2.999, f * 3)), ph = Math.min(2, Math.floor(f * 3));
  ST.boss.entered = u > 1.1; ST.boss.hp = ST.boss.max * (1 - f) + 1; ST.boss.armor = ST.boss.armorMax * (1 - kSm(0, .6, seg)); if (ST.boss.entered) armorWatch(ST.boss);
  if (u > 1.0) {
    ST.PVX.fireT -= dt; if (ST.PVX.fireT <= 0) { ST.PVX.fireT = .12; ST.PVX.side = -ST.PVX.side; ST.bolts.push({ x: ST.moth.x + ST.PVX.side * 7, y: ST.moth.y - 22, pierce: true }); }
    for (let i = ST.bolts.length - 1; i >= 0; i--) {
      const bl = ST.bolts[i]; bl.y -= 1000 * dt;
      if (bl.y < ST.boss.y + ST.boss.r * .5 && Math.abs(bl.x - ST.boss.x) < ST.boss.r + 8 && u > 1.1) { ST.boss.flashT = .06; ST.boss.aFlash = .1; if (Math.random() < .6) bossHitFx(bl.x, bl.y, ST.boss.armor > 0, false); if ((ST.PVX.hits = (ST.PVX.hits || 0) + 1) % 3 === 0) Sound.bossHit(); ST.bolts.splice(i, 1); }
      else if (bl.y < -20) ST.bolts.splice(i, 1);
    }
  }
}
export function pvStep(dt) {
  const P = ST.PVX; if (!P) return;
  P.t += dt; const t = P.t;
  while (P.ev.length && P.ev[0][0] <= t) P.ev.shift()[1]();
  const mx = pvMx(t), mp = pvMx(t - .03);
  ST.moth.x = ST.moth.tx = mx; ST.moth.y = pvMy(t); ST.moth.tilt = clampN((mx - mp) / .03 / 900, -.35, .35);
  ST.diff = pvDiff(t);
  if (t > 10.4 && t < 11.1) ST.warpBoost = Math.max(ST.warpBoost, 1.3 * kSm(10.4, 11.0, t));
  if (ST.card) { ST.card.t += dt / PV_SLOW; if (ST.card.t > 3.6) ST.card = null; }
  if (ST.trans) {
    ST.trans.t += dt;
    if (!ST.trans.swapped && ST.trans.t >= ST.trans.swapAt) { ST.trans.swapped = true; pvSwapVis(4); ST.stageNo = 2; ST.card = { t: 0 }; ST.pw.shield = false; ST.flash = .35; ST.shake = .6; Sound.glitchArrive(true); }
    if (ST.trans.t >= ST.trans.dur) ST.trans = null;
  }
  if (P.epi) { ST.items = []; ST.boss = null; ST.bolts = []; }
  else { ST.items = pvItems(t); pvBossStep(t, dt); pvCamUpdate(dt); }
  if (t >= PV_DUR) pvEnd();
}
export function drawPVOverlay(t) {
  const P = ST.PVX; if (!P) return; const pt = P.t;
  ctx.save(); ctx.textAlign = 'center';
  if (!P.epi) { const vg = ctx.createRadialGradient(ST.W / 2, ST.H / 2, Math.min(ST.W, ST.H) * .3, ST.W / 2, ST.H / 2, Math.max(ST.W, ST.H) * .72); vg.addColorStop(0, 'rgba(0,0,10,0)'); vg.addColorStop(1, 'rgba(0,0,10,.42)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, ST.W, ST.H); }
  const bh = Math.max(30, ST.H * .07) * kEo(pt / .8) * (1 - kSm(26.4, 27.2, pt));
  if (pt < .9) { ctx.fillStyle = 'rgba(4,3,12,' + (1 - kSm(0, .9, pt)) + ')'; ctx.fillRect(0, 0, ST.W, ST.H); }
  ctx.fillStyle = '#04030C'; ctx.fillRect(0, 0, ST.W, bh); ctx.fillRect(0, ST.H - bh, ST.W, bh);
  if (!P.epi) {
    if (pt > .7 && pt < 4.6) {                                       // a ghost finger drags the moth around
      const fa = kSm(.7, 1.0, pt) * (1 - kSm(4.1, 4.6, pt)), fp = pvScr(ST.moth.x, ST.moth.y + 66), fx = fp.x, fy = fp.y;
      for (let k = 1; k <= 9; k++) { const tp = pvScr(pvMx(pt - k * .05), ST.moth.y + 66 + k * .5); ctx.fillStyle = 'rgba(255,255,255,' + (fa * .22 * (1 - k / 10)) + ')'; ctx.beginPath(); ctx.arc(tp.x, tp.y, 12 * (1 - k / 14), 0, 6.283); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,' + (fa * .3) + ')'; ctx.beginPath(); ctx.arc(fx, fy, 17, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (fa * .8) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(fx, fy, 17 + (pt * 2 % 1) * 8, 0, 6.283); ctx.stroke();
    }
    if (pt > 2.2 && pt < 24.2) {                                     // heat meter
      const f = kSm(2.2, 2.7, pt) * (1 - kSm(23.8, 24.2, pt)), bw = Math.min(260, ST.W * .56), bx = ST.W / 2 - bw / 2, by = bh + 18;
      ctx.globalAlpha = f; ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(bx, by, bw, 7);
      ctx.fillStyle = heat(ST.dispD); ctx.shadowColor = heat(ST.dispD); ctx.shadowBlur = 10; ctx.fillRect(bx, by, Math.max(2, bw * ST.dispD), 7); ctx.shadowBlur = 0;
      ctx.font = '700 12px MothText, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(233,230,255,.8)'; ctx.fillText('Heat', bx, by - 5); ctx.textAlign = 'center';
      if (ST.boss && ST.boss.entered) {                                     // boss name and health
        drawBossBar(ST.boss, bx, by + 46, bw, ST.boss.t, true);
      }
      ctx.globalAlpha = 1;
    }
    if (P.call && pt - P.call.t0 < 2.4) {                            // power-up callout above the moth
      const u = pt - P.call.t0, a = kSm(0, .25, u) * (1 - kSm(1.9, 2.4, u)), pc = POWER_COL[P.call.kind], nm = PV_PW[P.call.kind];
      const cp = pvScr(P.call.x, ST.moth.y), cxp = clampN(cp.x, 90, ST.W - 90), cyp = Math.min(cp.y, ST.H * .78);
      ctx.globalAlpha = a; ctx.font = '700 22px MothDisplay, serif'; ctx.shadowColor = pc; ctx.shadowBlur = 16; ctx.fillStyle = '#FFFFFF';
      ctx.fillText(nm[0], cxp, cyp - 76 - u * 14); ctx.shadowBlur = 0;
      draw3DGem(cxp, cyp - 128 - u * 14, 20, pc, pt * 2.4);
      ctx.font = '600 14px MothText, sans-serif'; ctx.fillStyle = pc; ctx.fillText(nm[1], cxp, cyp - 54 - u * 14); ctx.globalAlpha = 1;
    }
    for (const c of PV_CAPS) if (pt >= c[0] && pt <= c[1]) {          // captions
      const a = Math.min(kSm(c[0], c[0] + .3, pt), 1 - kSm(c[1] - .3, c[1], pt));
      ctx.font = '700 16px MothText, sans-serif'; const fs = Math.min(16, 16 * (ST.W - 70) / ctx.measureText(c[2]).width), tw = Math.min(ST.W - 40, ctx.measureText(c[2]).width * fs / 16 + 34), cy = ST.H - bh - 34;
      ctx.font = '700 ' + fs + 'px MothText, sans-serif'; ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(10,8,30,.7)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(ST.W / 2 - tw / 2, cy - 18, tw, 36, 18) : ctx.rect(ST.W / 2 - tw / 2, cy - 18, tw, 36); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.fillText(c[2], ST.W / 2, cy + 5); ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
