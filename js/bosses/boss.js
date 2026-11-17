import { ST } from '../state.js';
import { CLR, reduceMotion } from '../config.js';
import { unlockBoss } from '../save.js';
import { buzz } from '../input.js';
import { addHeat, burst, notice, ring, showBanner, spawnSpore, spawnStrike, stage } from '../spawn.js';
import { clampN, nmBase, sentinelAttack, warpNow } from './sentinel.js';
import { colossusAttack } from './colossus.js';
import { BFP, armorWatch, bfxExtra, bfxPiece, bossHitFx } from './fx.js';
import { checkTier } from '../update.js';
import { cineStart } from '../cine.js';
import { Sound } from '../audio.js';


// ---------- mini bosses (one per stage)
export const BOSS = { eye: { r: 46, spd: .8 }, jelly: { r: 44, spd: .55 }, prism: { r: 40, spd: 1.0 }, storm: { r: 50, spd: .7 }, sentinel: { r: 40, spd: .9 }, colossus: { r: 46, spd: .6 } };
export function startBoss(level) {
  if (ST.boss) return;
  const def = stage().boss, B = BOSS[def.kind], hp = Math.round((def.hp + level * 14) * 4);      // long fights: a big health pool, plus armor in every phase
  ST.bossSeen = true;
  ST.boss = { kind: def.kind, name: def.name, lvl: level, hp, max: hp, x: ST.W / 2, y: -90,
    ty: Math.min(ST.H * .4, Math.max(ST.H * .2, 250)), t: 0, r: Math.min(B.r, ST.W * .12), spd: B.spd,
    entered: false, atk: 1.6, pat: 0, aimLeft: 0, aimT: 0, flashT: 0, life: 0, off: 0, warp: null, glT: 0, q: [], nextAtk: 0, phase: 0, stagger: 0, core: 0, coreWarn: 0, coreCD: 3, armor: 0, armorMax: 0, aFlash: 0 };
  ST.boss.armorMax = ST.boss.armor = armorFor(0); ST.boss.aN = 6;
  if (def.kind === 'colossus') ST.boss.hw = Math.min(ST.boss.r * 2.1, ST.W * .26);      // v54: the Seam Colossus is a wide slab: its hit box is wider than it is tall
  for (let i = ST.items.length - 1; i >= 0; i--) {
    if (CLR[ST.items[i].type]) { burst(ST.items[i].x, ST.items[i].y || 100, '#FFFFFF', 6, 160, .7); ST.items.splice(i, 1); }
  }
  Sound.roar(true); ST.shake = 1; ST.rumble = 1; ST.flash = .35; buzz([80, 40, 80]);
  cineStart('in');
}
const armorFor = ph => Math.round(ST.boss.max / 3 * .6 * (1 + ph * .15));      // armor to chew through before each phase's health
export function bullet(x, y, vx, vy) {
  if (ST.items.length > 90) return;
  ST.items.push({ type: 'shuriken', bullet: true, r: 12, x, y, vx, vy, x0: x, spin: 0, amp: 0, ph: 0, passed: true });
}
function aimShot() {
  const dx = ST.moth.x - ST.boss.x, dy = ST.moth.y - ST.boss.y, d = Math.hypot(dx, dy) || 1, sp = 360;
  bullet(ST.boss.x, ST.boss.y + ST.boss.r * .6, dx / d * sp, dy / d * sp);
}
export function fan(n, spread, sp) {
  for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (i - (n - 1) / 2) * spread; bullet(ST.boss.x, ST.boss.y + ST.boss.r * .6, Math.cos(a) * sp, Math.sin(a) * sp); }
}
export function ringShot(n, sp) {
  const off = Math.random() * 6.283;
  for (let i = 0; i < n; i++) { const a = off + i * 6.283 / n; bullet(ST.boss.x, ST.boss.y, Math.cos(a) * sp, Math.sin(a) * sp); }
}
function bossAttack() {
  if (ST.boss.kind === 'colossus') { colossusAttack(); return; }
  if (ST.boss.kind === 'sentinel') { sentinelAttack(); return; }
  const p = ST.boss.pat++ % 3, ph2 = ST.boss.phase >= 1, sp = 230 + ST.boss.lvl * 30 + (ph2 ? 40 : 0), k = ST.boss.kind;
  const aim = () => { ST.boss.aimLeft = ph2 ? 4 : 3; ST.boss.aimT = 0; };
  if (k === 'jelly') {
    if (p === 0) { for (let i = -1; i <= 1; i++) spawnSpore(ST.boss.x + i * 70, ST.H * .62, 150, ST.boss.y + ST.boss.r * .8); }
    else if (p === 1) ringShot(ph2 ? 12 : 9, sp * .8);
    else aim();
  } else if (k === 'prism') {
    if (p === 0) [0, -90, 90].forEach(o => spawnStrike(ST.moth.x + o, '120,220,255'));
    else if (p === 1) fan(ph2 ? 7 : 5, .30, sp);
    else aim();
  } else if (k === 'storm') {
    if (p === 0) { ST.stormT = 4; spawnStrike(ST.moth.x, '255,107,138'); spawnStrike(40 + Math.random() * (ST.W - 80), '255,107,138'); if (ph2) spawnStrike(40 + Math.random() * (ST.W - 80), '255,107,138'); }
    else if (p === 1) fan(ST.stormT > 0 ? (ph2 ? 5 : 3) : ph2 ? 7 : 5, .30, sp);
    else ringShot(ST.stormT > 0 ? (ph2 ? 8 : 6) : ph2 ? 12 : 9, sp * .8);
  } else {
    if (p === 0) fan(ph2 ? 7 : 5, .30, sp);
    else if (p === 1) aim();
    else ringShot(ph2 ? 12 : 9, sp * .8);
  }
}
export function updateBoss(g, dt) {
  const b = ST.boss;
  b.life += g; b.t += g; b.flashT = Math.max(0, b.flashT - dt); b.aFlash = Math.max(0, b.aFlash - dt);
  if (!b.entered) {
    b.y += (b.ty - b.y) * Math.min(1, g * 2.4);
    if (Math.abs(b.ty - b.y) < 5) b.entered = true;
    return;
  }
  const frac = b.hp / b.max;
  if (b.kind === 'sentinel') {
    b.off *= Math.exp(-g * .9); b.x = clampN(nmBase(b) + b.off, 36, ST.W - 36); b.glT = Math.max(0, b.glT - g);
    if (b.warp) { b.warp.t -= g; if (b.warp.t <= 0) warpNow(); }
    for (let i = b.q.length - 1; i >= 0; i--) { const q = b.q[i]; q.t -= g; if (q.t <= 0) { b.q.splice(i, 1); q.fn(); } }
  } else {
    b.x = ST.W / 2 + Math.sin(b.t * (b.spd + (1 - frac) * .5)) * (ST.W * (b.hw ? .2 : .3));
    for (let i = b.q.length - 1; i >= 0; i--) { const q = b.q[i]; q.t -= g; if (q.t <= 0) { b.q.splice(i, 1); q.fn(); } }      // v54: queued attacks (the Colossus' second wall / shear)
  }
  b.y = b.ty + Math.sin(b.t * 1.7) * 10;
  ST.fireT -= g;
  if (ST.fireT <= 0) { ST.fireT = .12; ST.fireSide = -ST.fireSide; ST.bolts.push({ x: ST.moth.x + ST.fireSide * 7, y: ST.moth.y - 22, pierce: true }); }
  if (b.stagger > 0) {                      // phase change: the boss is dazed, its core is exposed (x3 damage)
    b.stagger -= g;
    if (b.stagger <= 0) { b.coreCD = 3; b.atk = .9; }
  } else {
    if (b.core > 0) { b.core -= g; if (b.core <= 0) b.coreCD = 4.2 - b.phase * .6; }          // weak-point window (x2 damage)
    else if (b.coreWarn > 0) { b.coreWarn -= g; if (b.coreWarn <= 0) { b.core = 2; Sound.coreOpen(); } }
    else { b.coreCD -= g; if (b.coreCD <= 0) { b.coreWarn = .7; Sound.warn(); } }
    b.atk -= g;
    if (b.atk <= 0) { bossAttack(); b.atk = (b.nextAtk || [1.25, 1.05, .85][b.phase]) * (b.nextAtk && b.phase >= 2 ? .85 : 1); b.nextAtk = 0; if (b.phase >= 2 && b.kind !== 'sentinel') b.aimLeft += 2; }
  }
  if (b.aimLeft > 0 && b.stagger <= 0) { b.aimT -= g; if (b.aimT <= 0) { aimShot(); b.aimLeft--; b.aimT = .22; } }
  if (b.life > 140) bossLeave();
}
export function clearBullets(spark) {
  ST.items = ST.items.filter(it => {
    if (it.type === 'shuriken' && it.bullet) { if (spark) { burst(it.x, it.y, '#FFFFFF', 4, 160, .7); ST.score += 1; } return false; }
    return true;
  });
}
export function damageBoss(n, hx, hy) {
  if (!ST.boss) return;
  const m = ST.boss.stagger > 0 ? 3 : ST.boss.core > 0 ? 2 : 1, armored = ST.boss.armor > 0;
  let d = n * m; ST.boss.flashT = .08;
  bossHitFx(hx == null ? ST.boss.x + (Math.random() - .5) * ST.boss.r * 1.2 : hx, hy == null ? ST.boss.y + (Math.random() - .5) * ST.boss.r * .8 : hy, armored, m > 1 || n > 1);      // v56: each boss throws its own kind of fragments
  if (ST.boss.armor > 0) {                     // armor soaks the damage first; the overflow carries into health
    ST.boss.armor -= d; ST.boss.aFlash = .12;
    if ((++ST.bossHits) % 3 === 0) Sound.bossHit();
    if (ST.boss.armor > 0) { armorWatch(ST.boss); return; }
    d = -ST.boss.armor; ST.boss.armor = 0; ST.boss.aN = 0; armorBreak();
    if (d <= 0) return;
  } else if ((++ST.bossHits) % 3 === 0) Sound.bossHit();
  ST.boss.hp -= d;
  if (m > 1 && ST.bossHits % 2 === 0) burst(ST.boss.x + (Math.random() - .5) * ST.boss.r, ST.boss.y, '#FFD166', 3, 170, .6);
  if (ST.boss.hp <= 0) { bossDefeat(); return; }
  const ph = ST.boss.hp / ST.boss.max <= 1 / 3 ? 2 : ST.boss.hp / ST.boss.max <= 2 / 3 ? 1 : 0;
  if (ph > ST.boss.phase) bossPhase(ph);
}
function armorBreak() {
  const b = ST.boss, K = b.kind, P = BFP[K], rm = reduceMotion;
  burst(b.x, b.y, P.a[1], 24, 360, 1); burst(b.x, b.y, '#FFFFFF', 8, 300, .8); ring(b.x, b.y, P.ring, 700, .5, 5);
  const n = rm ? 6 : 20, sx = b.hw ? b.hw / b.r : 1;      // v56: the whole armor shatters into the boss' own material
  for (let i = 0; i < n; i++) { const a = i / n * 6.283 + Math.random() * .3, R = b.r * (1.1 + Math.random() * .5); bfxPiece(K, true, b.x + Math.cos(a) * R * sx, b.y + Math.sin(a) * R, a, 160 + Math.random() * 220); }
  bfxExtra(K, b.x, b.y, 2);
  ST.shake = Math.max(ST.shake, .5); ST.flash = Math.max(ST.flash, .15); notice('Armor broken!', P.a[1]); Sound.bossHit(); buzz([30, 20, 50]);
  if (b.stagger <= 0) { b.core = Math.max(b.core, 2); b.coreWarn = 0; Sound.coreOpen(); }       // breaking the armor exposes the core for a moment
}
function bossPhase(ph) {                    // at 66% and 33% health
  const b = ST.boss; b.phase = ph; b.stagger = 3; b.core = 0; b.coreWarn = 0; b.armorMax = b.armor = armorFor(ph); b.aN = 6; b.warp = null; b.q = []; b.aimLeft = 0; b.nextAtk = 0;
  clearBullets(true);
  for (let i = ST.items.length - 1; i >= 0; i--) if (CLR[ST.items[i].type]) { burst(ST.items[i].x, ST.items[i].y || 100, '#FFFFFF', 5, 160, .7); ST.items.splice(i, 1); }
  burst(b.x, b.y, '#FFD166', 40, 420, 1.1); ring(b.x, b.y, 'rgba(255,209,102,.9)', 900, .7, 6); ring(b.x, b.y, 'rgba(255,255,255,.8)', 600, .5, 3);
  ST.shake = Math.max(ST.shake, .8); ST.flash = Math.max(ST.flash, .25); ST.rumble = Math.max(ST.rumble, .6);
  showBanner('Phase ' + (ph + 1), '#FFD166'); notice('Staggered! x3 damage, fresh armor', '#FFD166');
  Sound.roar(true); buzz([40, 30, 60]);
}
function bossDefeat() {
  const b = ST.boss, rew = ['+50 points'];
  unlockBoss(); clearBullets(true);
  ST.score += 50; ST.scorePop = 1;
  if (stage().heat === 'inverse') ST.diff = Math.max(0, ST.diff - .3); else if (stage().heat === 'drift') ST.diff = Math.max(0, ST.diff - .15); else addHeat(10);
  if (ST.hp < 100) { ST.hp = Math.min(100, ST.hp + 20); rew.push('Health +20%'); }
  ST.boss = null; ST.bolts = []; ST.bossCD = 40;
  checkTier();
  cineStart('out', b, rew);                   // the explosion, the title and the rewards play as a short skippable scene
}
function bossLeave() {
  clearBullets(false); ST.boss = null; ST.bolts = []; ST.bossCD = 30;
  notice(stage().boss.name + ' retreats', '#FFB3C0');
}
