import { ST } from './state.js';
import { BG_TABLES, BOSS_P0, BOSS_P1, BOSS_ROLL_EVERY, EVT, HAZ, OSTYLE, PAL, STAGE_STEP, cur, reduceMotion } from './config.js';
import { heat, lerp, portalStart, warpAmt } from './core.js';
import { TH, activateThunder, spawnThunder } from './render/thunder.js';
import { spawnBg } from './render/cosmic.js';
import { BGK, EC, bgM, ecAim, ecBleed, ecStep, edgeDirector, jackpot, stripW, wHi, wLo, xL, xR } from './edge.js';
import { buzz } from './input.js';
import { addHeat, addScore, applyPower, bloom, burst, floatText, fmtNum, heatName, notice, nova, popSpore, ring, scoreMult, showBanner, spawn, spawnStrike, stage, stageIdx, tierOf, updatePopLayout } from './spawn.js';
import { runEvent } from './events.js';
import { glitchTick, marqRect, sweepBonus, updateDefrag } from './hazards/neon.js';
import { endOverdrive, startOverdrive, startSurge, updateSurge } from './hazards/heat.js';
import { stageSwap, startTransition } from './stages/transition.js';
import { damageBoss, startBoss, updateBoss } from './bosses/boss.js';
import { clampN } from './bosses/sentinel.js';
import { stepBossFx } from './bosses/fx.js';
import { lcWarp, nmSpawnTick } from './stages/neon.js';
import { updateIceSpike } from './hazards/icespike.js';
import { seamStep } from './stages/overflow.js';
import { endGame, unlockFx } from './ui.js';
import { Sound } from './audio.js';

let statT = 2;
let tearT = 2;
let planetT = 4;
let dialBufWas = false;
function narrate() {                        // the one narrator line: heat near 70%
  ST.nar = { text: "Warning! System's breaking.", life: 2.6 };
  Sound.voice('warn', .1);
}
export function checkTier() {
  const t = tierOf(ST.diff);
  if (t > ST.tierShown) {
    if (t > ST.tierMax) {                // announce only new highs (heat can bob up and down in some stages)
      ST.tierMax = t;
      showBanner(heatName(t), heat(Math.min(1, t / 4), 1));
      portalStart(1);
      ring(ST.moth.x, ST.moth.y, heat(t / 4, .9), 700, .7, 5);
      ring(ST.moth.x, ST.moth.y, heat(t / 4, .6), 450, .8, 3);
      burst(ST.moth.x, ST.moth.y, heat(t / 4), 30, 320, 1.2);
      Sound.tier(t); buzz(30);
    }
  }
  ST.tierShown = t;
}

// damage per hit, in % of the health bar (a random whole number inside each range)
const DMG = { comet: [2, 4], shuriken: [4, 6], bullet: [2, 4], shard: [2, 3], spore: [4, 6], hole: [6, 9], strike: [8, 12], gate: [8, 12],
  owl: [4, 7], shear: [6, 10], popup: [5, 8], marq: [10, 14], lbar: [6, 9], xsweep: [15, 20], ispike: [16, 22] };
function rollDmg(k) { const d = DMG[k] || [5, 8]; return Math.round(d[0] + Math.random() * (d[1] - d[0])); }
export function hitHazard(x, y, kind) {
  if (ST.pw.shield) {
    ST.pw.shield = false; ST.inv = 1.1;
    burst(ST.moth.x, ST.moth.y, '#7DB8FF', 34, 380, 1.2);
    ring(ST.moth.x, ST.moth.y, 'rgba(125,184,255,.95)', 700, .6, 6);
    ST.flash = Math.max(ST.flash, .25); ST.shake = Math.max(ST.shake, .4);
    notice('Shield broken', '#7DB8FF'); Sound.shieldBreak(); buzz(40);
    return;
  }
  if (ST.pw.undo) {                                            // Ctrl+Z: the hit never happened
    ST.pw.undo = false; ST.inv = 1.3; ST.undoFx = .6;
    burst(ST.moth.x, ST.moth.y, '#9CF6FF', 30, 360, 1.1); ring(ST.moth.x, ST.moth.y, 'rgba(156,246,255,.95)', 800, .6, 6);
    ST.flash = Math.max(ST.flash, .2); ST.shake = Math.max(ST.shake, .3);
    notice('Ctrl+Z: undone', '#9CF6FF'); Sound.undo(); buzz(30);
    return;
  }
  const mode = stage().heat; let saved = false;
  const dmg = rollDmg(kind), sev = Math.min(1, .45 + dmg / 14);
  ST.hp = Math.max(0, ST.hp - dmg); ST.hpFlash = 1; ST.streak = 0;
  floatText(ST.moth.x, ST.moth.y - 34, '-' + dmg + '%', '#FF4D6D');
  if (mode === 'decay') ST.diff *= .4;                         // Nebula Reef: a hit only cools it
  else if (mode === 'inverse') ST.diff = Math.min(1, ST.diff + .25);  // Crimson Storm: a hit stokes the storm
  else if (mode === 'drift') { /* v52 Overflow Reach: a hit costs health, never heat */ }
  else { saved = ST.pw.saveD > 0; ST.diff = ST.pw.saveD; ST.pw.saveD = 0; }   // reset, unless a Save point locked the tier
  ST.tierShown = tierOf(ST.diff); ST.tierMax = ST.tierShown;
  ST.shake = sev; ST.flash = sev; ST.slow = .45 * (.5 + .5 * sev); ST.inv = 1.5; ST.bossPending = 0;      // small hits shake less than big ones
  burst(x, y, '#FF4D6D', 46, 420, 1.3);
  burst(x, y, '#FFFFFF', 20, 520, .9);
  burst(x, y, '#C7CCDD', 16, 300, 1.1);
  ring(x, y, 'rgba(255,255,255,.9)', 900, .55, 6);
  ring(x, y, 'rgba(255,77,109,.9)', 640, .8, 5);
  ring(x, y, 'rgba(255,77,109,.6)', 380, 1, 3);
  for (let i = 0; i < 40; i++) {                            // the heat meter shatters
    ST.parts.push({ x: 20 + Math.random() * (ST.W - 40) * Math.max(ST.dispD, .05), y: 98, vx: (Math.random() - .5) * 200,
      vy: 80 + Math.random() * 260, life: .8, max: .8, color: heat(Math.random() * Math.max(ST.dispD, .2)), size: 2 + Math.random() * 3 });
  }
  showBanner(saved ? 'Heat saved' : mode === 'decay' ? 'Heat dropped' : mode === 'inverse' ? 'Storm rising' : 'Heat reset', '#FF4D6D');
  portalStart(-1);
  Sound.hit(); buzz([60, 40, 90]);
  if (ST.hp <= 0) endGame();
}

// ---------- update
export function update(dt) {
  ST.wBase = ST.W; ST.W = ST.wBase + 2 * (stripW() + bgM());
  ST.dispD += (ST.diff - ST.dispD) * Math.min(1, dt * (ST.diff > ST.dispD ? 3 : 8));
  Sound.setD(ST.dispD);

  for (const s of ST.stars) {
    s.y += (8 + s.layer * 14) * (1 + ST.dispD * 6) * dt;
    if (s.y > ST.H) { s.y = -2; s.x = Math.random() * ST.W; }
  }
  for (const l of ST.lines) {
    l.y += l.spd * (1 + ST.dispD * 2.5) * dt;
    if (l.y - l.len > ST.H) { l.y = -l.len; l.x = Math.random() * ST.W; }
  }
  // universes: crossfade palette + layer weights toward the current tier
  const sIdx = stageIdx();
  for (let k = 0; k < ST.uw.length; k++) { const tg = k === sIdx ? 1 : 0; ST.uw[k] += (tg - ST.uw[k]) * Math.min(1, dt * (tg ? 2.2 : 3)); }
  const tp = PAL[sIdx], cr = Math.min(1, dt * 2.5);
  for (const key of ['top', 'bot', 'glow']) for (let c = 0; c < 3; c++) cur[key][c] += (tp[key][c] - cur[key][c]) * cr;
  ST.warpBoost = Math.max(0, ST.warpBoost - dt * 1.1);
  if (ST.portal) { ST.portal.t += dt; if (ST.portal.t >= ST.portal.dur) ST.portal = null; }
  const wn = warpAmt();
  ST.nebScroll += (14 + ST.dispD * 160 + wn * 500) * dt;   // speed = heat + light speed only; integrated so changes never make the clouds jump
  if (wn > .02) for (const w of ST.warpStars) {
    w.y += w.sp * (.3 + wn * 4.5) * dt;               // streaks rush past, the moth flies "up"
    if (w.y - w.len * (.4 + wn * 2.4) > ST.H) { w.y = -10 - Math.random() * 60; w.x = Math.random() * ST.W; }
  }
  // exoplanets: more of them the further you get
  planetT -= dt;
  if (planetT <= 0 && sIdx === 4) {
    planetT = lerp(8, 2.8, Math.min(1, ST.dispD)) * (.7 + Math.random() * .6) / BGK;   // same rhythm and cap (3 + tier) as the space stages
    nmSpawnTick();
  } else if (planetT <= 0 && sIdx === 5) {
    planetT = 6;                                         // v52 Overflow Reach: no planets, the slabs are the scenery
  } else if (planetT <= 0) {
    planetT = lerp(8, 2.8, Math.min(1, ST.dispD)) * (.7 + Math.random() * .6) / BGK;
    let n = ST.planets.length + ST.cosmos.length;
    const cap = Math.round((3 + ST.tierShown) * BGK);
    const tbl = BG_TABLES[sIdx] || BG_TABLES[0];
    for (let k = tbl.length - 1; k >= 0; k--) {          // rare kinds roll first so they never starve behind the common ones
      const kind = tbl[k][0], pct = tbl[k][1];
      if (Math.random() * 100 >= pct) continue;
      if (n >= cap + (pct <= 5 ? 2 : 0)) continue;
      spawnBg(kind, sIdx); n++;
    }
  }
  for (let i = ST.cosmos.length - 1; i >= 0; i--) {
    const o = ST.cosmos[i];
    o.y += o.vy * (1 + ST.dispD * 5 + wn * 16) * dt; o.x += o.vx * dt;
    if (o.y - o.r * 3 > ST.H || o.x < -o.r * 4 || o.x > ST.W + o.r * 4) ST.cosmos.splice(i, 1);
  }
  for (let i = ST.planets.length - 1; i >= 0; i--) {
    const p = ST.planets[i];
    p.y += p.vy * (1 + ST.dispD * 5 + wn * 16) * dt; p.x += p.vx * dt;   // planets rush past with the streaks
    if (p.y - p.r * 2.2 > ST.H) ST.planets.splice(i, 1);
  }
  // Neon Mirage: the grid floor rushes toward you faster with heat, props ride along with it
  const gRate = .55 + ST.dispD * 3.2 + wn * 5;
  ST.gridScroll += gRate * dt;
  for (let i = ST.props.length - 1; i >= 0; i--) {
    const p = ST.props[i];
    p.y += p.vy * (1 + ST.dispD * 3 + wn * 8) * dt; p.x += p.vx * dt; if (p.y - p.r * 3.5 > ST.H) { ST.props.splice(i, 1); continue; }
    if (ST.dispD > .45 && !reduceMotion) { p.gt -= dt; if (p.gt <= -(.7 + Math.random() * 2.2) * (1.3 - ST.dispD)) p.gt = .08 + Math.random() * .12; } else p.gt = -1;
  }
  if (ST.uw[4] > .3 && ST.dispD > .5 && !reduceMotion) {
    statT -= dt;
    if (statT <= 0) { statT = (.6 + Math.random() * 2) * (1.5 - ST.dispD); ST.statLife = .14; ST.statY = Math.random() * ST.H; ST.statH = 8 + Math.random() * 30; }
  }
  if (ST.uw[4] > .3 && !reduceMotion) {
    tearT -= dt;
    if (tearT <= 0) { tearT = (1.2 + Math.random() * 3.5) * (1.6 - Math.min(1, ST.dispD)); ST.tearLife = .12; ST.tearY = Math.random() * ST.H * .9; ST.tearH = 6 + Math.random() * 40; ST.tearDX = (Math.random() - .5) * 60 * (.4 + ST.dispD); }
  }
  if (ST.tearLife > 0) ST.tearLife -= dt;
  ST.statLife = Math.max(0, ST.statLife - dt);
  ST.rumble = Math.max(0, ST.rumble - dt * .8);
  if (ST.uw[3] > .05) {
    for (const a of ST.ash) {
      a.x += a.vx * (1 + ST.dispD * 2) * dt; a.y += a.vy * (1 + ST.dispD * 2) * dt;
      if (a.y > ST.H + 20 || a.x < -20) { a.x = Math.random() * (ST.W + 120); a.y = -20; }
    }
  }
  // background thunder in every universe
  ST.thunderT -= dt; ST.bigCD -= dt;
  if (ST.thunderT <= 0 && ST.thunders.length < 6 && !ST.trans && sIdx !== 5) { spawnThunder(sIdx); ST.thunderT = (1 / (TH[sIdx].rate * (1 + ST.dispD * 1.2))) * (.5 + Math.random()); } else if (ST.thunderT <= 0 && sIdx === 5) ST.thunderT = 3;
  for (let i = ST.thunders.length - 1; i >= 0; i--) {
    const T = ST.thunders[i];
    if (T.delay > 0) { T.delay -= dt; if (T.delay <= 0) activateThunder(T); continue; }
    T.life -= dt; if (T.life <= 0) ST.thunders.splice(i, 1);
  }
  ST.W = ST.wBase; ST.wBase = 0;
  if (ST.state !== 'play') {
    ST.shake = Math.max(0, ST.shake - dt * 1.8); ST.flash = Math.max(0, ST.flash - dt * 2.2);
    stepBossFx(dt);
    { let w = 0; for (let i = 0, n = ST.parts.length; i < n; i++) { const p = ST.parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (!(p.life <= 0)) ST.parts[w++] = p; } ST.parts.length = w; }
    { let w = 0; for (let i = 0, n = ST.rings.length; i < n; i++) { const r = ST.rings[i]; r.life -= dt; r.r += r.vr * dt; r.vr *= .93; if (!(r.life <= 0)) ST.rings[w++] = r; } ST.rings.length = w; }
    if (ST.state === 'menu' || ST.state === 'pv') { EC.x *= Math.exp(-dt * 8); EC.roll *= Math.exp(-dt * 8); EC.rv = 0; EC.xv = 0; }
    return;
  }

  // slow-mo after a hit
  let ts = 1;
  if (ST.slow > 0 && !reduceMotion) { ST.slow -= dt; ts = .25 + .75 * (1 - Math.max(0, Math.min(1, ST.slow / .45))); }
  const g = dt * ts;

  ST.elapsed += g; ST.inv = Math.max(0, ST.inv - dt);
  const prev = ST.moth.x, camPrev = EC.x;
  ecAim();
  const rub = 1 - .45 * Math.abs(EC.x) / stripW();   // rubber band: the deeper into a strip, the heavier the moth follows
  if (ST.ice && ST.ice.t >= ST.ice.wait) { ST.moth.iv = (ST.moth.iv || 0) + (ST.moth.tx - ST.moth.x) * 60 * dt; ST.moth.iv *= Math.exp(-5 * dt); ST.moth.x = clampN(ST.moth.x + ST.moth.iv * dt, wLo(), wHi()); }   // black ice: the moth overshoots and slides
  else { ST.moth.iv = 0; ST.moth.x += (ST.moth.tx - ST.moth.x) * Math.min(1, dt * (ST.flow && ST.flow.t >= ST.flow.wait ? 7 : 12) * rub); }
  if (ST.flow && ST.flow.t >= ST.flow.wait) ST.moth.x = clampN(ST.moth.x + ST.flow.dir * 560 * dt, wLo(), wHi());                                                                                           // current: a steady sideways push
  if (ST.flow) { ST.flow.t += dt; if (ST.flow.t >= ST.flow.wait + ST.flow.dur) ST.flow = null; }
  if (ST.ice) { ST.ice.t += dt; if (ST.ice.t >= ST.ice.wait + ST.ice.dur) { ST.ice = null; ST.moth.iv = 0; } }
  if (ST.trailId !== 'dust') { ST.trailPts.push({ x: ST.moth.x, a: 0, sd: Math.random() }); for (const p of ST.trailPts) p.a += dt; while (ST.trailPts.length && ST.trailPts[0].a > .7) ST.trailPts.shift(); if (ST.trailPts.length > 70) ST.trailPts.shift(); } else if (ST.trailPts.length) ST.trailPts = [];
  if (ST.pendNote && !ST.trans && !ST.CINE && ST.state === 'play') { notice(ST.pendNote, '#FFD166'); ST.pendNote = null; Sound.bonus(); unlockFx(); }
  ecStep(dt); ecBleed(dt);
  ST.moth.tilt += ((((ST.moth.x - EC.x) - (prev - camPrev)) / Math.max(dt, .001)) / 900 - ST.moth.tilt) * Math.min(1, dt * 10);

  // embers rising off the moth when it's hot
  if (ST.dispD > .12 && Math.random() < ST.dispD * dt * 70 && ST.parts.length < ST.pcap) {
    ST.parts.push({ x: ST.moth.x + (Math.random() - .5) * 26, y: ST.moth.y + 6, vx: (Math.random() - .5) * 40,
      vy: -(70 + Math.random() * 120 * (.5 + ST.dispD)), life: .6, max: .6, color: heat(ST.dispD), size: 1.5 + Math.random() * 2.5 });
  }

  // ---- per-stage heat mechanics + stage transitions
  const S = stage();
  if (!ST.trans) {
    ST.stageTime += g;
    if (S.heat === 'decay') ST.diff = Math.max(0, ST.diff - .022 * g);
    else if (S.heat === 'inverse' && !ST.surge && ST.pw.calmT <= 0) ST.diff = Math.min(1, ST.diff + (.02 + .22 * ST.diff) * g);   // exponential: slow start, then it snowballs
    else if (S.heat === 'drift' && ST.pw.calmT <= 0 && !(ST.pw.seedT > 0) && !ST.boss) ST.diff = Math.min(1, ST.diff + (.008 + .010 * ST.diff) * g);   // v54: heat holds still during a Reseed and during the boss fight          // v52 Overflow Reach: heat is distance, it only climbs
    if (S.heat === 'overdrive') {
      if (ST.od > 0) { ST.od -= g; ST.diff = 1; ST.inv = Math.max(ST.inv, .3); if (ST.od <= 0) endOverdrive(); }
      else if (ST.diff >= 1) startOverdrive();
    } else if (S.heat === 'inverse') {
      if (ST.surge) updateSurge(g); else if (ST.diff >= 1) startSurge();
    }
    checkTier();
    if (ST.curStage === 4) { if (ST.diff >= .7 && !ST.warnDone) { ST.warnDone = true; narrate(); } else if (ST.diff < .6) ST.warnDone = false; }
    if (!ST.boss && !ST.CINE && ST.bossPending <= 0 && ST.score >= (ST.stageNo + 1) * STAGE_STEP) startTransition();
  } else {
    const p = (ST.trans.t += dt);
    const TD = ST.trans.dur;
    ST.hudA = p < .7 ? 1 - p / .7 : p > TD - .9 ? Math.min(1, (p - (TD - .9)) / .7) : 0;
    if (ST.trans.land) { const ls = lcWarp(ST.trans.dir > 0 ? p : TD - p, ST.trans.dir); ST.warpBoost = Math.max(ST.warpBoost, 1.2 * Math.max(0, 1 - Math.abs(ls - 1.0) / 1.0)); }   // v55: the stars streak while we plunge out of / climb into space, then let go
    else if (!ST.trans.neon) ST.warpBoost = Math.max(ST.warpBoost, p < .9 ? 1.3 * p / .9 : p < TD - 1.4 ? 1.3 : Math.max(0, 1.3 * (1 - (p - (TD - 1.4)) / 1.4)));   // peak 1.3: streaks a little longer and faster than before   // Neon Mirage jumps use the Y2K glitch instead of the hyperspeed streaks
    ST.inv = Math.max(ST.inv, .5);
    if (!ST.trans.swapped && p >= ST.trans.swapAt) { ST.trans.swapped = true; stageSwap(); }
    if (p >= ST.trans.dur) ST.trans = null;
  }
  if (!ST.trans) ST.hudA += (1 - ST.hudA) * Math.min(1, dt * 8);
  if (ST.card) { ST.card.t += dt; if (ST.card.t > 3.6) ST.card = null; }

  // ---- timers: powerups, events, boss, distant roars
  ST.pw.magnet = Math.max(0, ST.pw.magnet - g); ST.pw.slowT = Math.max(0, ST.pw.slowT - dt); ST.pw.prismT = Math.max(0, ST.pw.prismT - dt);
  ST.pw.doubleT = Math.max(0, ST.pw.doubleT - dt); ST.pw.freezeT = Math.max(0, ST.pw.freezeT - dt); ST.pw.phaseT = Math.max(0, ST.pw.phaseT - dt);
  ST.pw.rodT = Math.max(0, ST.pw.rodT - dt); ST.pw.calmT = Math.max(0, ST.pw.calmT - dt);
  ST.pw.seedT = Math.max(0, (ST.pw.seedT || 0) - dt); ST.pw.seedFx = Math.max(0, (ST.pw.seedFx || 0) - dt);
  if (ST.pw.phaseT > 0) ST.inv = Math.max(ST.inv, .3);
  ST.pw.dialT = Math.max(0, ST.pw.dialT - dt);
  if (ST.testQ && !ST.trans && ST.curStage === 4) { const f = ST.testQ; ST.testQ = null; f(); }
  ST.cdCool -= g; ST.spkCool -= g;
  if (ST.ctd) {
    if (ST.trans || ST.boss) ST.ctd = null;
    else {
      ST.ctd.t += g; const left = ST.ctd.dur - ST.ctd.t, k = Math.ceil(left);
      if (k !== ST.ctd.k) { ST.ctd.k = k; if (k >= 1 && k <= 10) Sound.cdTick(k <= 3); }
      if (left <= 0) {
        ST.items.push({ type: 'xsweep', x: ST.W / 2, y: -70, r: 0, lanes: ST.ctd.lanes, gw: ST.ctd.gw, hit: false, bh: 120 });
        Sound.sweep(); ST.shake = Math.max(ST.shake, .5); ST.flash = Math.max(ST.flash, .3); showBanner('00:00:00', '#FF4D6D'); ST.ctd = null;
      }
    }
  }
  ST.powerCD -= g; ST.bossCD -= g; ST.stormT = Math.max(0, ST.stormT - g);
  if (!ST.trans && !ST.boss && ST.pw.calmT <= 0) {
    ST.eventT -= g;
    if (ST.eventT <= 0 && ST.elapsed > 6) { runEvent(); ST.eventT = (7 + Math.random() * 7) * (1 - ST.diff * .35); }
    ST.bossRollT -= g;
    if (ST.bossRollT <= 0) {
      ST.bossRollT = BOSS_ROLL_EVERY;
      if (stage().boss && ST.bossCD <= 0 && ST.bossPending <= 0 && ST.od <= 0 && !ST.surge && ST.elapsed > 10 && ST.stageTime > 8 && Math.random() < BOSS_P0 + BOSS_P1 * ST.diff) {
        ST.bossPending = 1.8; ST.bossLvl = ST.diff >= .75 ? 1 : 0;   // hot runs get the tougher version
      }
    }
    if (ST.bossPending > 0) { ST.bossPending -= g; if (ST.bossPending <= 0) startBoss(ST.bossLvl); }
  }
  ST.roarT -= dt;
  if (ST.roarT <= 0) {
    ST.roarT = (8 + Math.random() * 9) / (1 + ST.diff * .8);
    if (!ST.trans && (ST.tierShown >= 1 || ST.elapsed > 25)) { if (ST.curStage === 4) Sound.glimmer(); else { Sound.roar(ST.tierShown >= 3); ST.rumble = 1; ST.shake = Math.max(ST.shake, .3); } }
  }
  if (ST.boss) updateBoss(g, dt);
  if (ST.pw.prismT > 0 && !ST.trans) {
    ST.pFireT -= g;
    if (ST.pFireT <= 0) { ST.pFireT = .14; ST.fireSide = -ST.fireSide; ST.bolts.push({ x: ST.moth.x + ST.fireSide * 7, y: ST.moth.y - 22 }); }
  }
  for (let i = ST.bolts.length - 1; i >= 0; i--) {
    const bl = ST.bolts[i];
    if (!bl) continue;
    bl.y -= 780 * g;
    if (!bl.pierce) {                 // prism bolts shoot hazards down
      let used = false;
      for (let j = ST.items.length - 1; j >= 0; j--) {
        const it = ST.items[j], T = it.type;
        if (!(T === 'shuriken' || T === 'comet' || T === 'spore' || T === 'shard') || (T === 'comet' && it.warn > 0)) continue;
        if (Math.abs(bl.x - it.x) < it.r + 8 && Math.abs(bl.y - it.y) < it.r + 12) {
          burst(it.x, it.y, '#FFFFFF', 8, 220, .8); ST.score += 2; ST.items.splice(j, 1); used = true; break;
        }
      }
      if (used) { ST.bolts.splice(i, 1); continue; }
    }
    if (ST.boss && ST.boss.entered && Math.abs(bl.x - ST.boss.x) < (ST.boss.hw || ST.boss.r) + 4 && Math.abs(bl.y - ST.boss.y) < ST.boss.r) {
      ST.bolts.splice(i, 1); damageBoss(1, bl.x, bl.y);
      if (!ST.boss) break;               // boss died: bolts was replaced, stop iterating the old list
      continue;
    }
    if (bl.y < -30) ST.bolts.splice(i, 1);
  }

  ST.spawnT -= g;
  if (ST.spawnT <= 0 && !ST.trans) {
    spawn();
    if (ST.diff > .8 && Math.random() < .35) spawn();
    ST.spawnT = lerp(.85, .26, ST.diff) * (.7 + Math.random() * .6) * (ST.pw.calmT > 0 ? 2 : 1);
  }
  edgeDirector(g);

  const im = ST.pw.slowT > 0 ? .55 : 1;      // time-slow powerup
  const dialOn = ST.pw.dialT > 0;            // dial-up: hazards crawl and keep buffering
  if (dialOn) ST.dialClock += g;
  ST.dialBufNow = dialOn && (ST.dialClock % 1.4) > .95;
  if (ST.dialBufNow && !dialBufWas) Sound.buffer();
  dialBufWas = ST.dialBufNow;
  ST.undoFx = Math.max(0, ST.undoFx - dt);
  ST.hpFlash = Math.max(0, ST.hpFlash - dt * 3); ST.hpTrail = ST.hpTrail < ST.hp ? ST.hp : Math.max(ST.hp, ST.hpTrail - Math.max(8, (ST.hpTrail - ST.hp) * 1.2) * dt);
  if (ST.defrag) updateDefrag(g);
  for (let i = ST.items.length - 1; i >= 0; i--) {
    const it = ST.items[i], T = it.type, hzt = HAZ[T] || T === 'gate' || T === 'shear' || EVT[T];
    let gi = (ST.pw.freezeT > 0 && hzt) ? 0 : g * im;   // freeze powerup stops hazards
    if (gi > 0 && dialOn && hzt) gi = ST.dialBufNow ? 0 : gi * .5;
    if (T === 'shear') {                  // v52: a slab slides sideways while it falls; the swath it will sweep is shown first
      if (it.warn > 0) { it.warn -= g; continue; }
      it.x += it.vx * gi; it.y += it.vy * gi;
      if (!reduceMotion && gi > 0 && ST.parts.length < ST.pcap && Math.random() < .5) ST.parts.push({ x: it.x + (Math.random() - .5) * it.w, y: it.y - it.h / 2, vx: -it.vx * .15, vy: -30, life: .3, max: .3, color: 'rgba(255,190,130,1)', size: 2.2 });
      if (!it.hit && ST.inv <= 0 && Math.abs(it.x - ST.moth.x) < it.w / 2 + 8 && Math.abs(it.y - ST.moth.y) < it.h / 2 + 11) { it.hit = true; hitHazard(ST.moth.x, it.y, 'shear'); if (ST.state !== 'play') return; }
      if (it.y - it.h > ST.H + 40) ST.items.splice(i, 1);
      continue;
    }
    if (T === 'comet' && it.warn > 0) {   // lane tracks the moth, then locks for the last .35s
      it.warn -= g; if (it.warn > .35) it.x += (ST.moth.x - it.x) * Math.min(1, g * 9);
      continue;
    }
    if (T === 'strike') {                 // lightning: warning lane, then a brief damaging column
      if (it.warn > 0) {
        it.warn -= g;
        if (it.warn <= 0) { it.act = .25; if (ST.curStage === 4) Sound.glitchBurst(); else Sound.thunder(0); ST.shake = Math.max(ST.shake, .35); ST.flash = Math.max(ST.flash, ST.curStage === 4 ? .08 : .15); }
        continue;
      }
      it.act -= g;
      if (!it.hit && ST.inv <= 0 && Math.abs(ST.moth.x - it.x) < it.w / 2 + 10) {
        it.hit = true;
        if (ST.pw.rodT > 0) {            // lightning rod: absorb the strike, cool the storm
          ST.diff = Math.max(0, ST.diff - .08); ST.score += 5; ST.scorePop = 1;
          burst(ST.moth.x, ST.moth.y, '#FFF27A', 24, 320, 1.1); ring(ST.moth.x, ST.moth.y, 'rgba(255,242,122,.9)', 600, .5, 5);
          floatText(ST.moth.x, ST.moth.y - 30, '+5', '#FFF27A');
        } else { hitHazard(ST.moth.x, ST.moth.y, 'strike'); if (ST.state !== 'play') return; }
      }
      if (it.act <= 0) ST.items.splice(i, 1);
      continue;
    }

    if (T === 'owl') {                    // Moonlit: telegraphed dive along a line
      if (it.warn > 0) it.warn -= gi;
      else {
        const dx = it.tx - it.sx, dy = it.ty - it.sy, d = Math.hypot(dx, dy) || 1;
        it.x += dx / d * it.spd * gi; it.y += dy / d * it.spd * gi;
        if (!it.hit && ST.inv <= 0 && Math.hypot(ST.moth.x - it.x, ST.moth.y - it.y) < it.r + 12) { it.hit = true; hitHazard(it.x, it.y, 'owl'); if (ST.state !== 'play') return; }
        if (it.y > ST.H + 80 || it.x < wLo() - 80 || it.x > wHi() + 80) ST.items.splice(i, 1);
      }
      continue;
    }
    if (T === 'cloud') {                  // Crimson Storm: a cloud drifts overhead and drops telegraphed lightning
      it.t += gi; it.x += it.dir * it.vx * gi;
      if (it.x < xL() + 40) { it.x = xL() + 40; it.dir = 1; } else if (it.x > xR() - 40) { it.x = xR() - 40; it.dir = -1; }
      it.fire -= gi;
      if (it.fire <= 0 && it.n > 0) { it.n--; spawnStrike(it.x, '255,107,138'); it.fire = lerp(1.35, .95, ST.diff); if (it.n === 0) it.gone = 1.4; }
      if (it.gone > 0) { it.gone -= gi; if (it.gone <= 0) ST.items.splice(i, 1); }
      continue;
    }
    if (T === 'popup') {                  // Win98 error chain
      it.t += gi; let alive = false;
      for (const p of it.ps) {
        if (p.done) continue;
        alive = true;
        if (!p.on && it.t >= p.at) { p.on = true; p.t0 = it.t; Sound.popOpen(); burst(p.x, it.y, '#FFFFFF', 6, 160, .7); }
        if (!p.on) continue;
        if (it.t - p.t0 >= p.life) { p.done = true; Sound.popClose(); burst(p.x, it.y, '#C0C0C0', 6, 140, .6); continue; }
        if (!p.hit && ST.inv <= 0 && Math.abs(ST.moth.x - p.x) < p.w / 2 + 6 && Math.abs(ST.moth.y - it.y) < p.h / 2 + 4) {
          p.hit = true; hitHazard(ST.moth.x, ST.moth.y, 'popup'); if (ST.state !== 'play') return;
        }
      }
      if (!alive) ST.items.splice(i, 1);
      continue;
    }
    if (T === 'marq') {                   // selection box: ghost, drag, hold, release
      if (it.wait > 0) { it.wait -= gi; continue; }
      const pt = it.t; it.t += gi;
      if (pt < 1.1 && it.t >= 1.1) Sound.marq(true);
      if (pt < 2.5 && it.t >= 2.5) Sound.marq(false);
      if (it.t >= 1.1 && it.t < 2.5 && !it.hit && ST.inv <= 0) {
        const R = marqRect(it);
        if (ST.moth.x > R.l - 4 && ST.moth.x < R.r + 4 && ST.moth.y > R.tp && ST.moth.y < R.b) { it.hit = true; hitHazard(ST.moth.x, ST.moth.y, 'marq'); if (ST.state !== 'play') return; }
      }
      if (it.t >= 2.8) ST.items.splice(i, 1);
      continue;
    }
    if (T === 'lbar') {                   // loading bar: the gap slides, freezes with a spinner, then moves on
      it.y += it.vy * gi; it.mt -= gi;
      if (it.mode === 0) {
        it.v += (it.dir * 105 - it.v) * Math.min(1, gi * 6); it.gx += it.v * gi;
        const lo = it.gap / 2 + 12, hi = ST.W - it.gap / 2 - 12;
        if (it.gx < lo) { it.gx = lo; it.dir = 1; it.v = 0; } else if (it.gx > hi) { it.gx = hi; it.dir = -1; it.v = 0; }
        if (it.mt <= 0) { it.mode = 1; it.mt = .55 + Math.random() * .3; it.v = 0; Sound.buffer(); }
      } else if (it.mt <= 0) { it.mode = 0; it.mt = .5 + Math.random() * .5; if (Math.random() < .5) it.dir = -it.dir; }
      if (!it.hit && ST.inv <= 0 && Math.abs(it.y - ST.moth.y) < 13 && Math.abs(ST.moth.x - it.gx) > it.gap / 2 - 14) { it.hit = true; hitHazard(ST.moth.x, it.y, 'lbar'); if (ST.state !== 'play') return; }
      if (it.y > ST.H + 60) ST.items.splice(i, 1);
      continue;
    }
    if (T === 'ispike') { if (updateIceSpike(it, g, i)) return; continue; }
    if (T === 'xsweep') {                 // the 00:00 pixel sweep (not slowed by Dial-up)
      it.y += (ST.H + 190) / 1.15 * g;
      if (!it.hit && ST.inv <= 0 && Math.abs(it.y - ST.moth.y) < it.bh / 2 + 6 && !it.lanes.some(l => Math.abs(ST.moth.x - l) < it.gw / 2 - 12)) {
        it.hit = true; hitHazard(ST.moth.x, ST.moth.y, 'xsweep'); if (ST.state !== 'play') return;
      }
      if (it.y > ST.H + 100) { if (!it.hit) sweepBonus(); ST.items.splice(i, 1); }
      continue;
    }

    if (T === 'shuriken') {
      it.spin += gi * (6 + ST.diff * 14);
      if (it.bullet) {
        if (it.lagY !== undefined && !it.lagDone) {                           // lag shot: hangs, flickers, then lunges
          if (it.lagT > 0) { it.lagT -= g; if (it.lagT <= 0) { it.lagDone = true; it.vx *= 1.8; it.vy *= 1.8; } }
          else if (it.y >= it.lagY) it.lagT = .55;
        }
        if (!(it.lagT > 0)) { it.x += it.vx * gi; it.y += it.vy * gi; }
      }
      else {
        it.y += it.vy * gi;
        if (ST.curStage === 4 && gi > 0 && !it.strip) glitchTick(it, gi);
        if (ST.diff > .6 && !it.snap) it.x0 += Math.sign(ST.moth.x - it.x) * 35 * (ST.diff - .6) * gi;
        it.x = it.amp ? Math.max(wLo() - 12, Math.min(wHi() + 12, it.x0 + Math.sin(ST.elapsed * 3 + it.ph) * it.amp)) : it.x0;
      }
      if ((ST.diff > .15 || it.bullet) && ST.parts.length < ST.pcap && Math.random() < .8)
        ST.parts.push({ x: it.x, y: it.y - 6, vx: (Math.random() - .5) * 30, vy: -20, life: .28, max: .28, color: it.px ? (Math.random() < .5 ? 'rgba(5,217,232,1)' : 'rgba(255,60,200,1)') : 'rgba(255,77,109,1)', size: 2.4 });
      if (!it.passed && it.y > ST.moth.y && Math.abs(it.x - ST.moth.x) < 75) {
        it.passed = true; Sound.whoosh();
        burst(it.x, it.y, '#FFB3C0', 6, 160, .7);
      }
    } else if (T === 'comet') {
      it.y += it.vy * gi;
      if (ST.parts.length < ST.pcap) ST.parts.push({ x: it.x + (Math.random() - .5) * 12, y: it.y - 10, vx: (Math.random() - .5) * 50, vy: -80 - Math.random() * 60,
        life: .35, max: .35, color: 'rgba(255,150,70,1)', size: 3.5 });
    } else if (T === 'gate') {
      it.y += it.vy * gi;
      if (it.seam) seamStep(it, gi);
      if (it.sway) it.gx = Math.max(it.gap / 2 + 10, Math.min(ST.W - it.gap / 2 - 10, it.gx0 + Math.sin(ST.elapsed * 1.6 + it.ph) * it.sway));
    } else if (T === 'hole') {
      it.y += it.vy * gi; it.spin += gi * 3;
      const hx = it.x - ST.moth.x, hy = it.y - ST.moth.y, hd = Math.hypot(hx, hy);
      if (hd < it.pull && hd > 1) {
        const f = 1 - hd / it.pull;
        ST.moth.x = Math.max(wLo(), Math.min(wHi(), ST.moth.x + (hx / hd) * f * f * 900 * g));
      }
    } else if (T === 'spore') {
      it.y += it.vy * gi; it.spin += gi * 3;
      if (it.y > (it.popY || ST.H * .42)) { ST.items.splice(i, 1); popSpore(it); continue; }
    } else if (T === 'shard') {
      it.y += it.vy * gi;
      if (ST.parts.length < ST.pcap && Math.random() < .5) ST.parts.push({ x: it.x, y: it.y - 14, vx: 0, vy: -30, life: .25, max: .25, color: 'rgba(150,220,255,1)', size: 2 });
    } else {
      it.y += it.vy * gi; it.spin += gi * 4;
      if (it.edge) {
        { const q = clampN((it.y + 30) / (it.eyT + 30), 0, 1), f = it.ex0 + (it.ex1 - it.ex0) * q * q * (3 - 2 * q); it.x += f - it.ef; it.ef = f; }   // smoothstep S-curve: straight down, sweeping across, straight down again
        if (!it.cued && (it.x < -6 || it.x > ST.W + 6)) { it.cued = 1; Sound.edge(it.x < 0 ? -1 : 1, it.jack ? 2 : T === 'power' ? 1 : 0); }
        if (it.y < it.eyT && ST.parts.length < ST.pcap && Math.random() < .7) ST.parts.push({ x: it.x, y: it.y - 4, vx: -(it.ex1 - it.ex0) * .04, vy: -10, life: .35, max: .35, color: 'rgba(255,225,140,1)', size: 2.2 });
      }
      if (ST.pw.magnet > 0) {
        const mx = ST.moth.x - it.x, my = ST.moth.y - it.y, md = Math.hypot(mx, my);
        if (md < 280 && md > 1) { const k = Math.min(1, 560 * g / md); it.x += mx * k; it.y += my * k; }
      }
      if (T !== 'power' && ST.diff > .3 && ST.parts.length < ST.pcap && Math.random() < .5)
        ST.parts.push({ x: it.x, y: it.y - 4, vx: (Math.random() - .5) * 20, vy: -15, life: .25, max: .25,
          color: 'rgba(' + (T === 'gold' ? OSTYLE[ST.curStage].gr : OSTYLE[ST.curStage].br) + ',1)', size: 2 });
    }

    // ---- collisions
    if (T === 'gate') {
      if (!it.hit && ST.inv <= 0 && Math.abs(it.y - ST.moth.y) < 14 && Math.abs(ST.moth.x - it.gx) > it.gap / 2 - 16) {
        it.hit = true; hitHazard(ST.moth.x, it.y, 'gate');
        if (ST.state !== 'play') return;
      }
    } else {
      const dx = it.x - ST.moth.x, dy = it.y - ST.moth.y;
      const hazard = !!HAZ[T];
      const rad = T === 'hole' ? it.r + 14 : T === 'shard' ? it.r + 16 : it.r + 20;
      const inside = dx * dx + dy * dy < rad * rad;
      if (inside && hazard && ST.od > 0) {   // overdrive: smash through hazards for points
        ST.items.splice(i, 1); burst(it.x, it.y, '#FFD166', 16, 300); ST.score += 3; ST.scorePop = 1;
        floatText(it.x, it.y - 10, '+3', '#FFD166'); continue;
      }
      if (inside && !(hazard && ST.inv > 0)) {
        ST.items.splice(i, 1);
        if (hazard) { hitHazard(it.x, it.y, it.bullet ? 'bullet' : T); if (ST.state !== 'play') return; continue; }
        if (T === 'power') { applyPower(it.kind, it.x, it.y); continue; }
        ST.streak++;
        const mult = scoreMult();
        addHeat(T === 'gold' ? 3 : 1);
        const raw = (T === 'gold' ? 5 : 1) * mult * (ST.pw.doubleT > 0 ? 2 : 1);
        addScore(raw); ST.scorePop = 1;
        const OS = OSTYLE[ST.curStage], col = T === 'gold' ? OS.g : OS.b;
        burst(it.x, it.y, col, T === 'gold' ? 26 : 14, 200);
        ring(it.x, it.y, 'rgba(' + (T === 'gold' ? OS.gr + ',.9' : OS.br + ',.8') + ')', T === 'gold' ? 420 : 260, .45, 3);
        floatText(it.x, it.y - 10, '+' + fmtNum(raw), col);
        T === 'gold' ? Sound.gold() : Sound.collect(ST.streak);
        if (it.jack) jackpot(it);
        checkTier();
        continue;
      }
    }
    const gone = it.y > ST.H + 60 || ((T === 'comet' || it.bullet) && (it.x < wLo() - 80 || it.x > wHi() + 80 || it.y < -80));
    if (gone) { ST.items.splice(i, 1); if (T === 'orb' || T === 'gold') ST.streak = 0; }
  }
  if (ST.queuedPower) { const k = ST.queuedPower; ST.queuedPower = null; k === 'bloom' ? bloom() : nova(); }
  { let w = 0;
    for (let i = 0, n = ST.parts.length; i < n; i++) {
      const p = ST.parts[i];
      p.life -= g; p.x += p.vx * g; p.y += p.vy * g; p.vx *= .97; p.vy *= .97;
      if (!(p.life <= 0)) ST.parts[w++] = p;
    }
    stepBossFx(g);
    ST.parts.length = w; w = 0;
    for (let i = 0, n = ST.rings.length; i < n; i++) {
      const r = ST.rings[i]; r.life -= g; r.r += r.vr * g; r.vr *= .94;
      if (!(r.life <= 0)) ST.rings[w++] = r;
    }
    ST.rings.length = w; w = 0;
    for (let i = 0, n = ST.floats.length; i < n; i++) {
      const f = ST.floats[i]; f.life -= dt * 1.2; f.y -= 40 * dt;
      if (!(f.life <= 0)) ST.floats[w++] = f;
    }
    ST.floats.length = w;
  }
  if (ST.banner) { ST.banner.life -= dt; if (ST.banner.life <= 0) ST.banner = null; }
  if (ST.nar) { ST.nar.life -= dt; if (ST.nar.life <= 0) ST.nar = null; }
  for (let i = ST.notices.length - 1; i >= 0; i--) { ST.notices[i].life -= dt; if (ST.notices[i].life <= 0) ST.notices.splice(i, 1); }
  updatePopLayout(dt);
  ST.shake = Math.max(0, ST.shake - dt * 1.8); ST.flash = Math.max(0, ST.flash - dt * 2.2);
  ST.scorePop = Math.max(0, ST.scorePop - dt * 5);
}
