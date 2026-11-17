import { ST } from './state.js';
import { CLR, HEAT_MULT, HEAT_NAMES, ORB_MAX, POWER_COL, STAGES, reduceMotion } from './config.js';
import { wHi, wLo } from './edge.js';
import { buzz } from './input.js';
import { bullet, damageBoss } from './bosses/boss.js';
import { Sound } from './audio.js';


// ---------- effects
export function burst(x, y, color, n, speed, size = 1) {
  if (reduceMotion) n = Math.ceil(n / 3);
  if (ST.parts.length > ST.pcap) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = speed * (.25 + Math.random());
    ST.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .5 + Math.random() * .6, max: 1.1,
      color, size: (1.4 + Math.random() * 2.6) * size });
  }
}
export function ring(x, y, color, vr, life, w = 3) { ST.rings.push({ x, y, r: 6, vr, life, max: life, color, w }); }
export function nmc(c) {                           // Neon Mirage: remap text colours to ones that read on violet/pink (warm -> yellow, cool -> aqua, purple -> white)
  if (ST.uw[4] < .5 || !c) return c;
  let r, g, b, m;
  if (c[0] === '#') { const h = c.length === 4 ? c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c.slice(1); r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16); }
  else if ((m = c.match(/[\d.]+/g))) { r = +m[0]; g = +m[1]; b = +m[2]; } else return c;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 30) return '#FFFFFF';
  let hue = mx === r ? ((g - b) / (mx - mn) + 6) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4; hue *= 60;
  return hue < 70 || hue > 325 ? '#FFF27A' : hue < 255 ? '#8CFFF2' : '#FFFFFF';
}
export function floatText(x, y, text, color) {
  for (let tries = 0; tries < 6; tries++) {                      // push up until it clears every other +N nearby
    if (!ST.floats.some(f => Math.abs(f.x - x) < 46 && Math.abs(f.y - y) < 22)) break;
    y -= 22;
  }
  ST.floats.push({ x, y, text, color, life: 1 });
}
export function showBanner(text, color) { ST.banner = { text, color, life: 1.3 }; }

// ---------- spawning
export const stage = () => STAGES[ST.curStage];
export const stageIdx = () => ST.curStage;
export const heatName = t => stage().heatNames[t] || HEAT_NAMES[t];
export const tierOf = d => d >= 1 ? 4 : Math.floor(d / .25);

// score multiplier: heat is the base, a long orb streak adds a small bonus on top
export function scoreMult() {
  if (ST.od > 0) return 4;
  return (stage().mult || HEAT_MULT)[tierOf(ST.diff)] + Math.min(.5, .1 * Math.floor(ST.streak / 5));
}
export function addScore(x) { ST.scoreF += x; const w = Math.floor(ST.scoreF); ST.score += w; ST.scoreF -= w; }   // keeps fractions like x1.3 exact
export const fmtNum = x => String(Math.round(x * 10) / 10);

// heat gain depends on the stage's heat mechanic
export function addHeat(n) {
  const S = stage();
  if (S.heat === 'inverse') ST.diff = Math.max(0, ST.diff - n / ORB_MAX * 1.5);
  else if (ST.od <= 0) ST.diff = Math.min(1, ST.diff + n / ORB_MAX * S.gain);
}

export function spawnSpore(x, popY, vy, y) { ST.items.push({ type: 'spore', r: 20, x, y: y === undefined ? -40 : y, vy: vy || 90 + ST.diff * 60, spin: 0, popY }); }
export function spawnShard(x, y) { ST.items.push({ type: 'shard', r: 11, x, y, vy: 420 + ST.diff * 220, spin: 0 }); }
export function spawnStrike(x, col) { ST.items.push({ type: 'strike', x: Math.max(wLo(), Math.min(wHi(), x)), y: 0, r: 0, warn: 1.05, act: 0, col, hit: false, w: 42 }); }
export function popSpore(it) {
  burst(it.x, it.y, '#FF8AD8', 16, 260); ring(it.x, it.y, 'rgba(255,138,216,.8)', 300, .4, 3);
  const off = Math.random() * 6.283;
  for (let k = 0; k < 4; k++) { const a = off + k * 6.283 / 4; bullet(it.x, it.y, Math.cos(a) * 190, Math.sin(a) * 190); }
  Sound.whoosh();
}

export function spawn() {
  if (!ST.boss && ST.powerCD <= 0 && Math.random() < .08) { spawnPower(); ST.powerCD = 10 + Math.random() * 6; return; }
  const S = stage(), L = 1 + .08 * Math.floor(ST.stageNo / STAGES.length);
  if (!ST.boss && S.extra && Math.random() < .05 + ST.diff * .07) {
    const x = 30 + Math.random() * (ST.W - 60);
    S.extra === 'spore' ? spawnSpore(x, ST.H * .42) : spawnShard(x, -30);
    return;
  }
  const roll = Math.random();
  const sc = ST.boss ? 0 : (.18 + ST.diff * .30) * S.shMul * (ST.stormT > 0 ? (ST.curStage === 3 ? .18 : .3) : 1);   // lightning is the main threat: far fewer shurikens (fewest of all in Crimson Storm)
  const type = roll < sc ? 'shuriken' : roll < sc + .09 ? 'gold' : 'orb';
  const r = type === 'shuriken' ? 16 : type === 'gold' ? 12 : 13;
  const x0 = r + 10 + Math.random() * (ST.W - 2 * r - 20);
  ST.items.push({ type, r, x: x0, x0, y: -30, vy: (140 + ST.diff * 300 + Math.random() * 60) * L,
    ph: Math.random() * 6.28, spin: 0, amp: type === 'shuriken' ? ST.diff * 55 * Math.random() : 0, passed: false });
}

export function notice(text, color) {
  const ex = ST.notices.find(n => n.text === text);
  if (ex) { ex.life = 1.7; ex.color = color; return; }          // same message again: refresh it instead of stacking a duplicate
  ST.notices.unshift({ text, color, life: 1.7, y: 196 });          // newest on top, older ones slide down
  if (ST.notices.length > 3) ST.notices.length = 3;
}
// vertical flow below the HUD: notices -> banner -> stage card, so none of them can sit on top of another
export function updatePopLayout(dt) {
  const nl = ST.notices.length, nb = nl ? 214 + (nl - 1) * 30 + 10 : 196;
  const bt = nb + 58, bb = ST.banner ? bt + 18 : nb, ct = Math.max(ST.H * .42, bb + 90), k = Math.min(1, dt * 10);
  ST.pop.b += (bt - ST.pop.b) * k; ST.pop.c += (ct - ST.pop.c) * k;
  for (let i = 0; i < nl; i++) ST.notices[i].y += (214 + i * 30 - ST.notices[i].y) * k;
}

function spawnPower() {
  const kinds = stage().powers.filter(k => !(k === 'shield' && ST.pw.shield) && !(k === 'ctrlz' && ST.pw.undo) && !(k === 'save' && (ST.pw.saveD > 0 || tierOf(ST.diff) < 1)));
  const kind = kinds[(Math.random() * kinds.length) | 0];
  const x0 = 30 + Math.random() * (ST.W - 60);
  ST.items.push({ type: 'power', kind, r: 15, x: x0, x0, y: -30, vy: 120 + ST.diff * 120, ph: Math.random() * 6.28, spin: 0 });
}

export function applyPower(kind, x, y) {
  const col = POWER_COL[kind];
  burst(x, y, col, 24, 260, 1.1); ring(x, y, col, 500, .6, 4);
  Sound.power(kind); buzz(20);
  if (kind === 'shield') { ST.pw.shield = true; notice('Shield ready', col); }
  else if (kind === 'magnet') { ST.pw.magnet = 8; notice('Magnet', col); }
  else if (kind === 'slow') { ST.pw.slowT = 6; notice('Time slow', col); }
  else if (kind === 'prism') { ST.pw.prismT = 6; notice('Prism beam', col); }
  else if (kind === 'chill') { ST.diff = Math.max(0, ST.diff - .4); notice('Cooled down', col); ring(ST.moth.x, ST.moth.y, col, 700, .6, 5); }
  else if (kind === 'heal') {
    if (ST.hp < 100) { ST.hp = Math.min(100, ST.hp + 25); notice('Health +25%', col); }
    else { ST.score += 15; ST.scorePop = 1; addHeat(5); notice('Moonbeam +15', col); }
  }
  else if (kind === 'double') { ST.pw.doubleT = 10; notice('Double score', col); }
  else if (kind === 'warm') { ST.diff = Math.min(1, ST.diff + .4); ST.flash = Math.max(ST.flash, .15); notice('Heat surge', col); }
  else if (kind === 'freeze') { ST.pw.freezeT = 4; notice('Hazards frozen', col); }
  else if (kind === 'boost') { if (ST.od > 0) ST.od = Math.min(12, ST.od + 4); else ST.diff = 1; notice('Overdrive boost', col); }
  else if (kind === 'phase') { ST.pw.phaseT = 4; notice('Phase shift', col); }
  else if (kind === 'rod') { ST.pw.rodT = 8; notice('Lightning rod', col); }
  else if (kind === 'eye') { ST.pw.calmT = 6; notice('Eye of the storm', col); }
  else if (kind === 'ctrlz') { ST.pw.undo = true; notice('Ctrl+Z ready', col); }
  else if (kind === 'defrag') { ST.defrag = { t: 0, y: -30 }; notice('Defrag', col); ST.flash = Math.max(ST.flash, .12); }
  else if (kind === 'dialup') { ST.pw.dialT = 6; ST.dialClock = 0; notice('Dial-up: hazards buffering', col); }
  else if (kind === 'save') { ST.pw.saveD = tierOf(ST.diff) * .25; notice('Saved at ' + heatName(tierOf(ST.diff)), col); }
  else if (kind === 'reseed') reseed();
  else ST.queuedPower = kind;            // nova / bloom run after the item loop so we don't edit the array mid-iteration
}

function reseed() {                   // v54 Overflow Reach: pulls heat back, snaps nearby hazards onto the 36 px grid, and holds the land still for 5 s
  const col = POWER_COL.reseed, cs = 36;
  ST.diff = Math.max(0, ST.diff - .3); ST.pw.seedT = 5; ST.pw.seedFx = 1.1;
  for (const it of ST.items) {
    const T = it.type; if (T !== 'shuriken' && T !== 'comet' && T !== 'shard') continue;
    if (Math.hypot(it.x - ST.moth.x, it.y - ST.moth.y) > 260) continue;
    const sx = Math.round(it.x / cs) * cs;
    if (T === 'shuriken' && !it.bullet) { it.x0 = sx; it.x = sx; it.amp = 0; it.snap = true; it.vy *= .8; } else it.x = sx;
    burst(it.x, it.y, col, 4, 140, .5);
  }
  notice('Reseeded', col); ring(ST.moth.x, ST.moth.y, col, 900, .7, 4); ST.flash = Math.max(ST.flash, .08);
}

export function nova() {
  ST.flash = Math.max(ST.flash, .7); ST.shake = Math.max(ST.shake, .5);
  ring(ST.moth.x, ST.moth.y, 'rgba(255,255,255,.95)', 1400, .7, 8);
  ring(ST.moth.x, ST.moth.y, 'rgba(160,200,255,.8)', 900, .9, 5);
  let n = 0;
  for (let i = ST.items.length - 1; i >= 0; i--) {
    const it = ST.items[i];
    if (CLR[it.type]) { burst(it.x, it.y, '#FFFFFF', 14, 260); ST.items.splice(i, 1); n++; }
  }
  ST.score += n * 2; if (n) floatText(ST.moth.x, ST.moth.y - 40, '+' + n * 2, '#FFFFFF');
  if (ST.boss && ST.boss.entered) damageBoss(8);
  notice('Nova', '#FFFFFF');
}

export function bloom() {                    // every hazard turns into a catchable orb
  ring(ST.moth.x, ST.moth.y, 'rgba(182,243,107,.9)', 1200, .8, 6); ST.flash = Math.max(ST.flash, .25);
  for (let i = ST.items.length - 1; i >= 0; i--) {
    const it = ST.items[i], T = it.type;
    if (T === 'shuriken' || T === 'comet' || T === 'spore' || T === 'shard') {
      burst(it.x, it.y, '#B6F36B', 10, 220);
      ST.items[i] = { type: 'orb', r: 13, x: it.x, x0: it.x, y: Math.max(it.y, -20), vy: 150, ph: 0, spin: 0, amp: 0, passed: false };
    } else if (CLR[T]) { burst(it.x, it.y || 100, '#B6F36B', 10, 220); ST.items.splice(i, 1); }
  }
  notice('Bloom', '#B6F36B');
}
