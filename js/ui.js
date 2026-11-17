import { ST } from './state.js';
import { menu, over } from './config.js';
import { SKINS, TRAILS, gearOk, persist } from './save.js';
import { reset } from './core.js';
import { buzz } from './input.js';
import { applyPower, burst, ring } from './spawn.js';
import { spawnLbar, spawnMarq, spawnPopups, startCountdown } from './hazards/neon.js';
import { checkTier } from './update.js';
import { Sound } from './audio.js';

let best = 0;

// ---------- wardrobe: "new" dots and unlock fx
export function hasFresh() { return !!(ST.save.fresh && ST.save.fresh.length); }
export function gearDots() { ['closetBtn', 'closetBtn2'].forEach(id => { const b = document.getElementById(id); if (b) b.classList.toggle('has-new', hasFresh()); }); }
export function markFresh(ids) {
  if (!ST.save.fresh) ST.save.fresh = [];
  ids.forEach(id => { if (ST.save.fresh.indexOf(id) < 0) ST.save.fresh.push(id); });
  persist(); gearDots();
}
export function unlockFx() {
  ring(ST.moth.x, ST.moth.y, 'rgba(255,209,102,.9)', 520, .9, 4); ring(ST.moth.x, ST.moth.y, 'rgba(255,255,255,.7)', 340, .7, 2);
  burst(ST.moth.x, ST.moth.y, '#FFD166', 28, 340, 1); burst(ST.moth.x, ST.moth.y, '#FFFFFF', 12, 220, .7); buzz([20, 30, 20]);
}

// ---------- flow
export function startGame() {
  Sound.start(); Sound.duck(false);
  reset(); ST.state = 'play'; ST.paused = false; pausedEl.classList.add('hide');
  menu.classList.add('hide'); over.classList.add('hide');
  Sound.start();
}
export function endGame() {
  ST.state = 'over'; ST.diff = 0; ST.tierShown = 0; ST.boss = null; ST.bolts = []; ST.bossPending = 0; ST.trans = null; ST.hudA = 1; ST.od = 0; ST.surge = null; ST.card = null; ST.banner = null; ST.nar = null; ST.defrag = null; ST.ctd = null;
  if (ST.score > best) best = ST.score;
  document.getElementById('finalScore').textContent = ST.score;
  document.getElementById('bestOver').textContent = 'Best this session: ' + best;
  Sound.duck(true); Sound.over();
  setTimeout(() => over.classList.remove('hide'), 700);
}
export const closet = document.getElementById('closet'), skinGrid = document.getElementById('skinGrid'), trailGrid = document.getElementById('trailGrid');
function buildCloset() {
  const mk = (list, grid, key, sw) => {
    grid.innerHTML = '';
    list.forEach(n => {
      const ok = gearOk(n), fr = ok && ST.save.fresh && ST.save.fresh.indexOf(n.id) >= 0, b = document.createElement('button');
      b.className = 'gear' + (ST.save[key] === n.id ? ' cur' : '') + (ok ? '' : ' lock') + (fr ? ' fresh' : '') + (ST.lastPick === n.id ? ' pick' : '');
      b.innerHTML = '<span class="sw" style="background:' + sw(n) + '"></span><span>' + n.name + '</span>' + (ok ? '' : '<small>' + n.need.txt + '</small>') + (fr ? '<i class="nw">new</i>' : '');
      b.addEventListener('click', () => {
        if (!ok) return;
        ST.save[key] = n.id; ST.lastPick = n.id; persist();
        if (key === 'skin') ST.skin = n; else { ST.trailId = n.id; ST.trailPts = []; }
        buildCloset();
      });
      grid.appendChild(b);
    });
  };
  mk(SKINS, skinGrid, 'skin', n => 'linear-gradient(135deg,' + n.a + ',' + n.b + ')');
  mk(TRAILS, trailGrid, 'trail', n => n.sw);
}
export const openCloset = () => { buildCloset(); closet.classList.remove('hide'); };
export const sndBtn = document.getElementById('snd');
export const pauseBtn = document.getElementById('pauseBtn'), pausedEl = document.getElementById('paused');
export function setPause(v) {
  if (v && ST.state !== 'play') return;
  if (ST.paused === v) return;
  ST.paused = v; pausedEl.classList.toggle('hide', !v);
  Sound.visible(!v);
}
export const menuBtn = document.getElementById('menuBtn'), menuPanel = document.getElementById('menuPanel'), gfxBtns = [...document.querySelectorAll('#gfxRow button')];
export function gfxUI() { ST.shownQual = ST.qual; gfxBtns.forEach(b => b.classList.toggle('cur', +b.dataset.q === ST.qual)); }
export const testBtn = document.getElementById('testBtn'), testPanel = document.getElementById('testPanel');
export const ulb = document.createElement('button');  export const ntl = document.createElement('div');  export const ntg = document.createElement('div');  export const NTESTS = [['Pop-ups', () => spawnPopups()], ['Marquee', () => spawnMarq()], ['Loading bar', () => spawnLbar()], ['Countdown', () => startCountdown()],
  ['Ctrl+Z', () => applyPower('ctrlz', ST.moth.x, ST.moth.y - 40)], ['Defrag', () => applyPower('defrag', ST.moth.x, ST.moth.y - 40)],
  ['Dial-up', () => applyPower('dialup', ST.moth.x, ST.moth.y - 40)], ['Save point', () => applyPower('save', ST.moth.x, ST.moth.y - 40)],
  ['Heat +25%', () => { ST.diff = Math.min(1, ST.diff + .25); checkTier(); }]];
export const etl = document.createElement('div');  export const etg = document.createElement('div');  export const otl = document.createElement('div');  export const otg = document.createElement('div');