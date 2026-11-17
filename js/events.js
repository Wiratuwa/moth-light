import { ST } from './state.js';
import { EVT } from './config.js';
import { lerp } from './core.js';
import { worldX } from './edge.js';
import { notice, spawnShard, spawnSpore, spawnStrike, stage } from './spawn.js';
import { spawnCloud, spawnOwl, startCurrent, startIce } from './hazards/signature.js';
import { spawnLbar, spawnMarq, spawnPopups, startCountdown } from './hazards/neon.js';
import { clampN } from './bosses/sentinel.js';
import { startIceSpike } from './hazards/icespike.js';
import { Sound } from './audio.js';


// ---------- random events (pool depends on the stage)
export function runEvent() {
  const S = stage(), need = { seam: .1, shear: .15, shower: .2, gate: .25, hole: .45, popup: .1, marq: .2, lbar: .15, countdown: .35, icespike: .4, owl: .1, current: .05, ice: .1, cloud: .2 };
  let pool = S.events.filter(e => (need[e] || 0) <= ST.diff && !(e === 'shower' && ST.stormT > 0));
  if (!pool.length) pool = ['comet'];
  let e = pool[(Math.random() * pool.length) | 0];
  if (e === 'countdown' && (ST.cdCool > 0 || ST.ctd)) e = 'popup';
  if (e === 'icespike' && (ST.spkCool > 0 || heavyOn())) e = 'shard';
  if ((e === 'popup' || e === 'marq' || e === 'lbar' || e === 'countdown') && heavyOn()) e = 'comet';   // one big screen event at a time
  if ((e === 'current' || e === 'ice') && (ST.flow || ST.ice)) e = 'comet';                       // one movement zone at a time
  if (e === 'cloud' && ST.items.some(o => o.type === 'cloud')) e = 'comet';
  if ((e === 'seam' || e === 'shear') && ST.items.some(o => o.seam || o.type === 'shear' || o.type === 'gate')) e = 'comet';   // one wall-type event at a time
  if (e === 'comet') {
    ST.items.push({ type: 'comet', r: 14, x: ST.moth.x, y: -40, vx: 0, vy: 900 + ST.diff * 300, warn: 1 });
    notice('Comet incoming', '#FFB36B'); Sound.warn();
  } else if (e === 'gate') {
    const gap = lerp(190, 130, ST.diff), gx = gap / 2 + 20 + Math.random() * (ST.W - gap - 40);
    ST.items.push({ type: 'gate', x: ST.W / 2, y: -20, r: 0, gx0: gx, gx, gap, vy: 130 + ST.diff * 160,
      sway: ST.diff > .5 ? 30 + ST.diff * 30 : 0, ph: Math.random() * 6.28, hit: false });
    notice('Laser gate', '#FF6B8A'); Sound.warn();
  } else if (e === 'hole') {
    ST.items.push({ type: 'hole', r: 16, x: worldX(60, .3), y: -60, vy: 70 + ST.diff * 60, pull: 150, spin: 0 });
    notice('Black hole', '#B28CFF'); Sound.warn();
  } else if (e === 'seam') {                // v52: a full-width wall of terrain with a gap on a 36 px grid; at high heat the gap re-rolls while the wall is still far above the moth
    const cell = 36, gap = cell * (ST.diff > .6 ? 4 : 5), gx = Math.round(clampN(gap / 2 + 20 + Math.random() * (ST.W - gap - 40), gap / 2 + 20, ST.W - gap / 2 - 20) / cell) * cell;
    ST.items.push({ type: 'gate', seam: true, x: ST.W / 2, y: -24, r: 0, gx0: gx, gx, gap, cell, vy: 120 + ST.diff * 150, sway: 0, ph: 0, hit: false, sd: Math.random() * 50, shiftT: 1.2 + Math.random() * .6, nextGx: 0, warnT: 0 });
    notice('Terrain seam', '#CDE26A'); Sound.seam();
  } else if (e === 'shear') {               // v52: a slab slides sideways while it falls; its swath is shown for 1.1 s first
    const dir = Math.random() < .5 ? -1 : 1, w = 150 + ST.diff * 80, vy = 300 + ST.diff * 110, vx = dir * (130 + ST.diff * 110), xc = ST.W * (.18 + Math.random() * .64), T = (ST.moth.y + 40) / vy;
    ST.items.push({ type: 'shear', x: xc - vx * T, x0: xc - vx * T, xc, y: -40, r: 0, w, h: 44, vx, vy, warn: 1.1, hit: false, sd: Math.random() * 50 });
    notice('Shear', '#CDE26A'); Sound.shear();
  } else if (e === 'spore') {
    const n = ST.diff > .5 ? 3 : 2;
    for (let i = 0; i < n; i++) spawnSpore(ST.W * ((i + .5) / n) + (Math.random() - .5) * 40, ST.H * (.38 + Math.random() * .12));
    notice('Spore pods', '#FF8AD8'); Sound.warn();
  } else if (e === 'shard') {
    const slots = 8;
    const wave = yy => { const gap = (Math.random() * (slots - 2)) | 0; for (let i = 0; i < slots; i++) { if (i === gap || i === gap + 1) continue; spawnShard((i + .5) * ST.W / slots, yy); } };
    wave(-30); wave(-210);
    notice('Shard volley', '#9AE6FF'); Sound.warn();
  } else if (e === 'strike') {
    spawnStrike(ST.moth.x + (Math.random() - .5) * 40, '255,230,120');
    if (ST.diff > .5) spawnStrike(40 + Math.random() * (ST.W - 80), '255,230,120');
    notice('Lightning', '#C9B8FF'); Sound.warn(); ST.stormT = 4.5;
  } else if (e === 'owl') spawnOwl();
  else if (e === 'current') startCurrent();
  else if (e === 'ice') startIce();
  else if (e === 'cloud') spawnCloud();
  else if (e === 'popup') spawnPopups();
  else if (e === 'marq') spawnMarq();
  else if (e === 'lbar') spawnLbar();
  else if (e === 'countdown') startCountdown();
  else if (e === 'icespike') startIceSpike();
  else {
    const slots = 7, gapSlot = (Math.random() * (slots - 1)) | 0;
    for (let i = 0; i < slots; i++) {
      if (i === gapSlot || i === gapSlot + 1) continue;
      const x = (i + .5) * ST.W / slots;
      ST.items.push({ type: 'shuriken', r: 16, x, x0: x, y: -30 - Math.random() * 25, vy: 200 + ST.diff * 150, ph: 0, spin: 0, amp: 0, passed: false });
    }
    notice('Shuriken rain', '#FF6B8A'); Sound.warn();
  }
}

// ---------- Neon Mirage events: pop-up spam, marquee select, loading bar, Y2K countdown
export const POP_MSG = [['Error', 'A fatal exception 0E has occurred.'], ['Warning!', 'Too many windows are open.'], ['Not Responding', 'This program has stopped.'],
  ['System', 'Illegal operation.'], ['Mirage.exe', 'Cannot find the horizon.'], ['Alert', 'Your moth is not registered.']];
function heavyOn() { return !!ST.ctd || ST.items.some(o => EVT[o.type] || o.type === 'xsweep' || o.type === 'ispike'); }
