import { ST } from './state.js';
import { BOSS_ROLL_EVERY, ctx, cv, reduceMotion } from './config.js';
import { BGK, EC } from './edge.js';
import { Sound } from './audio.js';

let bgGrad;
let orbs;

export const lerp = (a, b, t) => a + (b - a) * t;
export function heat(d, a = 1) {
  // teal -> gold -> red
  let r, g, b;
  if (d < .5) { const k = d / .5; r = lerp(94, 255, k); g = lerp(234, 209, k); b = lerp(212, 102, k); }
  else { const k = (d - .5) / .5; r = 255; g = lerp(209, 77, k); b = lerp(102, 109, k); }
  return 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + a + ')';
}

export function resize() {
  ST.DPR = Math.min(window.devicePixelRatio || 1, ST.qual === 0 ? 3 : ST.qual === 1 ? 2 : 1);   // quality 0: up to 3x, 1: 2x, 2: 1x + light effects
  ST.W = window.innerWidth; ST.H = window.innerHeight;
  cv.width = ST.W * ST.DPR; cv.height = ST.H * ST.DPR;
  ctx.setTransform(ST.DPR, 0, 0, ST.DPR, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  bgGrad = ctx.createLinearGradient(0, 0, 0, ST.H);
  bgGrad.addColorStop(0, '#0C0B20'); bgGrad.addColorStop(1, '#241F4E');
  try { const sc = document.createElement('canvas'); sc.width = sc.height = 4; const sx = sc.getContext('2d'); sx.fillStyle = '#000'; sx.fillRect(0, 0, 4, 1); ST.scanPat = ctx.createPattern(sc, 'repeat'); } catch (e) { ST.scanPat = null; }
  const BK = BGK, BWd = ST.W * BK;       // background world: screen + both strips + margin
  ST.stars = [];
  for (let i = 0, ns = Math.round(70 * BK); i < ns; i++) {
    const layer = Math.random() < .5 ? 0 : Math.random() < .6 ? 1 : 2;
    ST.stars.push({ x: Math.random() * BWd, y: Math.random() * ST.H, layer, r: .6 + layer * .6, tw: Math.random() * 6.28 });
  }
  ST.lines = [];
  for (let i = 0, nl = Math.round(38 * BK); i < nl; i++) ST.lines.push({ x: Math.random() * BWd, y: Math.random() * ST.H, len: 40 + Math.random() * 120, spd: 500 + Math.random() * 600 });
  ST.warpStars = [];
  for (let i = 0, nw = Math.round(80 * BK); i < nw; i++) ST.warpStars.push({ x: Math.random() * BWd, y: Math.random() * ST.H, len: 30 + Math.random() * 130, sp: 500 + Math.random() * 900 });
  ST.ash = [];
  for (let i = 0, na = Math.round(46 * BK); i < na; i++) ST.ash.push({ x: Math.random() * (BWd + 120), y: Math.random() * ST.H, vx: -(30 + Math.random() * 50), vy: 120 + Math.random() * 140 });
  const BC = ['255,90,200', '140,90,255', '80,160,255'];
  ST.blobs = [];
  for (let i = 0, nb = Math.round(6 * BK); i < nb; i++) ST.blobs.push({ x: Math.random(), y: Math.random(), r: 110 + Math.random() * 140, ph: Math.random() * 6.28, c: BC[i % 3], i });
  for (const p of ST.planets) p.spr = null;     // v48: cached planet art follows DPR and low-effects changes
  if (ST.moth) ST.moth.y = ST.H * 0.82;
}

export const rgb = (a, al = 1) => 'rgba(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ',' + al + ')';
export function warpAmt() {
  if (reduceMotion) return 0;
  const hw = Math.max(0, Math.min(1, (ST.dispD - .6) / .4)) * (1 - ST.uw[4] * .9);
  return Math.max(hw, ST.warpBoost);
}
export function portalStart(dir, big) {
  ST.portal = { t: 0, dur: dir > 0 ? .9 : .7, dir };
  ST.warpBoost = Math.max(ST.warpBoost, big ? 1 : dir > 0 ? .3 : .45);
}

export function reset() {
  ST.moth = { x: ST.W / 2, tx: ST.W / 2, y: ST.H * 0.82, tilt: 0 };
  ST.items = []; ST.parts = []; ST.floats = []; ST.rings = []; ST.bfx = [];
  ST.score = 0; ST.hp = 100; ST.hpTrail = 100; ST.hpFlash = 0; ST.streak = 0; orbs = 0; ST.diff = 0; ST.dispD = 0;
  ST.spawnT = .4; ST.elapsed = 0; ST.shake = 0; ST.scorePop = 0; ST.flash = 0; ST.slow = 0; ST.inv = 0;
  ST.tierShown = 0; ST.banner = null;
  ST.pw = { shield: false, magnet: 0, slowT: 0, prismT: 0, doubleT: 0, freezeT: 0, phaseT: 0, rodT: 0, calmT: 0, undo: false, dialT: 0, saveD: 0, seedT: 0, seedFx: 0 };
  ST.scoreF = 0; ST.stageNo = 0; ST.curStage = 0; ST.stormT = 0; ST.trans = null; ST.hudA = 1; ST.od = 0; ST.surge = null; ST.pFireT = 0; ST.tierMax = 0; ST.stageTime = 0; ST.bossSeen = false; ST.queuedPower = null; ST.bossRollT = BOSS_ROLL_EVERY;
  Sound.setStage(0); ST.card = null; ST.defrag = null; ST.ctd = null; ST.cdCool = 25; ST.spkCool = 25; ST.nar = null; ST.testQ = null; ST.dialClock = 0; ST.undoFx = 0; ST.warnDone = false; ST.flow = null; ST.ice = null; ST.trailPts = []; ST.moth.iv = 0;
  ST.powerCD = 8; ST.eventT = 10; ST.roarT = 9 + Math.random() * 5; ST.bossCD = 0; ST.bossPending = 0; ST.bossLvl = 0;
  ST.boss = null; ST.bolts = []; ST.fireT = 0; ST.notices = []; ST.rumble = 0; ST.thunders = []; ST.thunderT = 3; ST.bigCD = 10; ST.impact = null; ST.hitStop = 0;
  ST.props = []; ST.gridScroll = 0; ST.statLife = 0; ST.tearLife = 0; ST.CINE = null;
  EC.x = EC.xv = EC.roll = EC.rv = EC.gl = EC.gr = EC.hl = EC.hr = 0; ST.fingerSX = null; ST.edgeT = 5; ST.edgeSide = Math.random() < .5 ? -1 : 1; ST.jackCD = 24; ST.stripT = [4, 6]; ST.lingerT = 0;
}

function wrapText(text, maxW, lh, x, y) {
  const words = text.split(' '); let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = test;
  }
  ctx.fillText(line, x, y);
}

// =====================================================================
// v36 DESIGN UPDATE: title screen, trailer, stage art cards, boss cutscenes, wardrobe polish
// =====================================================================
export const k01 = x => Math.max(0, Math.min(1, x));
export const kEo = x => 1 - Math.pow(1 - k01(x), 3);
export const kEio = x => { x = k01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const kSm = (a, b, x) => k01((x - a) / (b - a));
export const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
