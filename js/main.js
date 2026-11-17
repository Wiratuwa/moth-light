import { ST } from './state.js';
import { STAGES, ctx } from './config.js';
import { reset, resize } from './core.js';
import { SKINS, TRAILS, gearOk, persist } from './save.js';
import { spawnEdgeItem, spawnStripHazard } from './edge.js';
import { point } from './input.js';
import { applyPower, notice } from './spawn.js';
import { testJump } from './stages/transition.js';
import { startBoss } from './bosses/boss.js';
import { checkTier, update } from './update.js';
import { MX_CH } from './stages/neon.js';
import { draw } from './render/draw.js';
import { NTESTS, closet, etg, etl, gearDots, gfxBtns, gfxUI, hasFresh, markFresh, menuBtn, menuPanel, ntg, ntl, openCloset, otg, otl, pauseBtn, setPause, sndBtn, startGame, testBtn, testPanel, ulb } from './ui.js';
import { ttlPoint } from './title.js';
import { cineSkip, cineStep } from './cine.js';
import { PV_KEYS, PV_SLOW, pvEnd, pvStep, startPV } from './trailer.js';
import { Sound } from './audio.js';
import './render/thunder.js';
import './render/cosmic.js';
import './render/planets.js';
import './events.js';
import './hazards/signature.js';
import './render/moth.js';
import './hazards/neon.js';
import './hazards/heat.js';
import './bosses/sentinel.js';
import './bosses/colossus.js';
import './bosses/fx.js';
import './render/glow.js';
import './render/items.js';
import './render/sprites-a.js';
import './render/sprites-b.js';
import './hazards/icespike.js';
import './render/popups.js';
import './render/hud.js';
import './render/background.js';
import './stages/overflow.js';
import './render/stageart.js';

let pausedTotal = 0;
let pauseShown = false;
let gfxManual = false;
let last = performance.now();
let avgMs = 16;
let slowFor = 0;
window.addEventListener('resize', resize);
try { const sv = JSON.parse(localStorage.getItem('mothlight.gear') || 'null'); if (sv) ST.save = Object.assign(ST.save, sv); } catch (e) {}
ST.skin = SKINS.find(k => k.id === ST.save.skin && gearOk(k)) || SKINS[0];
ST.trailId = TRAILS.find(k => k.id === ST.save.trail && gearOk(k)) ? ST.save.trail : 'dust';
window.addEventListener('pointerdown', point);
window.addEventListener('pointermove', point);
window.addEventListener('touchstart', point, { passive: true });                        // fallback for webviews with flaky pointer events
window.addEventListener('touchmove', e => { e.preventDefault(); point(e); }, { passive: false });   // stop the page/app from scrolling or swiping instead
 for (let i = 0; i < 56; i++) MX_CH.push(String.fromCharCode(0xFF66 + i)); '0123456789'.split('').forEach(c => MX_CH.push(c));
window.addEventListener('pointerdown', e => ttlPoint(e, true));
window.addEventListener('pointermove', e => ttlPoint(e, false));
 for (let k = 0; k < 30; k++) PV_KEYS.push([k * 1.05, .5 + .24 * Math.sin(k * 2.3 + .4) + .09 * Math.sin(k * 5.1)]);

document.getElementById('startBtn').addEventListener('click', () => { if (!ST.pvSeen && !ST.save.pv) startPV('play'); else startGame(); });
document.getElementById('pvBtn').addEventListener('click', () => startPV('menu'));
document.getElementById('skipBtn').addEventListener('click', () => pvEnd());
window.addEventListener('pointerdown', e => { if (ST.CINE && !(e.target.closest && e.target.closest('button'))) cineSkip(); });
window.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { if (ST.CINE) cineSkip(); } else if (e.key === 'Escape' && ST.PVX) pvEnd(); });
gearDots();
document.getElementById('closetBtn').addEventListener('click', openCloset);
document.getElementById('closetBtn2').addEventListener('click', openCloset);
document.getElementById('closetDone').addEventListener('click', () => { closet.classList.add('hide'); ST.lastPick = ''; if (hasFresh()) { ST.save.fresh = []; persist(); gearDots(); } });
document.getElementById('againBtn').addEventListener('click', () => { startGame(); });
sndBtn.addEventListener('click', () => {
  const m = Sound.toggle();
  sndBtn.textContent = m ? 'Sound off' : 'Sound on';
  sndBtn.classList.toggle('off', m);
});
pauseBtn.addEventListener('click', () => { menuPanel.classList.remove('open'); setPause(true); });
menuBtn.addEventListener('click', () => menuPanel.classList.toggle('open'));
document.addEventListener('pointerdown', e => { if (!menuPanel.contains(e.target) && !menuBtn.contains(e.target)) menuPanel.classList.remove('open'); });
gfxBtns.forEach(b => b.addEventListener('click', () => {      // Low = 1x + lighter effects, Medium = up to 2x, High = up to 3x
  ST.qual = +b.dataset.q; ST.lowFx = ST.qual >= 2; ST.pcap = ST.qual >= 2 ? 220 : 650; gfxManual = true; slowFor = 0; avgMs = 16; resize(); gfxUI();
}));
gfxUI();
STAGES.forEach((st, i) => {
  const b = document.createElement('button'); b.textContent = (i + 1) + '. ' + st.name; b.dataset.i = i;
  b.addEventListener('click', () => { testPanel.classList.remove('open'); testJump(i); });
  testPanel.appendChild(b);
});
 ulb.textContent = 'Unlock all moth gear';
ulb.addEventListener('click', () => { const was = SKINS.concat(TRAILS).filter(n => !gearOk(n)).map(n => n.id); ST.save.seen = [1, 1, 1, 1, 1, 1]; ST.save.boss = 1; markFresh(was); testPanel.classList.remove('open'); notice('All moth gear unlocked', '#FFD166'); });
testPanel.appendChild(ulb);
 ntl.textContent = 'Neon Mirage tests'; ntl.style.cssText = 'display:none;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#FF9ED8;margin-top:4px;text-align:center';
testPanel.appendChild(ntl);
 ntg.style.cssText = 'display:none;grid-template-columns:1fr 1fr;gap:6px'; testPanel.appendChild(ntg);
NTESTS.forEach(([name, fn]) => {
  const b = document.createElement('button'); b.textContent = name;
  b.addEventListener('click', () => {
    testPanel.classList.remove('open');
    if (ST.state !== 'play' || ST.paused || !ST.moth) return;
    if (ST.curStage === 4) fn();
  });
  ntg.appendChild(b);
});
 etl.textContent = 'Edge strip tests'; etl.style.cssText = 'font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9AE6FF;margin-top:4px;text-align:center';
testPanel.appendChild(etl);
 etg.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px'; testPanel.appendChild(etg);
[['Loot left', () => spawnEdgeItem(-1)], ['Loot right', () => spawnEdgeItem(1)], ['Jackpot', () => spawnEdgeItem(Math.random() < .5 ? -1 : 1, true)], ['Strip hazards', () => { spawnStripHazard(-1); spawnStripHazard(1); }]].forEach(([name, fn]) => {
  const b = document.createElement('button'); b.textContent = name;
  b.addEventListener('click', () => { testPanel.classList.remove('open'); if (ST.state !== 'play' || ST.paused || !ST.moth) return; fn(); });
  etg.appendChild(b);
});
 otl.textContent = 'Overflow Reach tests'; otl.style.cssText = 'display:none;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#CDE26A;margin-top:4px;text-align:center';
testPanel.appendChild(otl);
 otg.style.cssText = 'display:none;grid-template-columns:1fr 1fr;gap:6px'; testPanel.appendChild(otg);
[['Seam Colossus', () => { if (!ST.boss && !ST.CINE && !ST.trans) { ST.bossPending = 0; startBoss(0); } }], ['Colossus (hot)', () => { if (!ST.boss && !ST.CINE && !ST.trans) { ST.bossPending = 0; startBoss(1); } }],
  ['Reseed', () => applyPower('reseed', ST.moth.x, ST.moth.y - 40)], ['Heat +25%', () => { ST.diff = Math.min(1, ST.diff + .25); checkTier(); }]].forEach(([name, fn]) => {
  const b = document.createElement('button'); b.textContent = name;
  b.addEventListener('click', () => { testPanel.classList.remove('open'); if (ST.state !== 'play' || ST.paused || !ST.moth || ST.curStage !== 5) return; fn(); });
  otg.appendChild(b);
});
testBtn.addEventListener('click', () => {
  otl.style.display = ST.curStage === 5 ? 'block' : 'none'; otg.style.display = ST.curStage === 5 ? 'grid' : 'none';
  ntl.style.display = ST.curStage === 4 ? 'block' : 'none'; ntg.style.display = ST.curStage === 4 ? 'grid' : 'none';
  [...testPanel.children].forEach(b => b.classList.toggle('cur', +b.dataset.i === ST.curStage));
  testPanel.classList.toggle('open');
});
document.getElementById('resumeBtn').addEventListener('click', () => setPause(false));
document.getElementById('restartBtn').addEventListener('click', () => { setPause(false); startGame(); });
window.addEventListener('keydown', e => { if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') setPause(!ST.paused); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && ST.state === 'play') setPause(true);        // leaving the app pauses the run
  else Sound.visible(!document.hidden && !ST.paused);
});

['700 20px MothDisplay','700 20px MothText','500 16px MothText','700 20px MothReef','600 20px MothIce','400 20px MothStorm','400 20px MothPixel','400 20px MothOverflow'].forEach(f => document.fonts && document.fonts.load(f));
resize(); reset();
function frame(now) {
  const raw = (now - last) / 1000, dt = Math.min(raw, .05); last = now;
  if (ST.paused) pausedTotal += raw;
  const rc = Math.min(raw, .1);        // a long gap (tab switch, pause) must not count as a slow frame
  if (!ST.paused) avgMs += (rc * 1000 - avgMs) * .05;
  if (ST.qual !== ST.shownQual) gfxUI();
  if (!ST.paused && !gfxManual && ST.qual < 2 && avgMs > 30) {          // sustained low frame rate: step the look down (3x -> 2x -> 1x + light effects)
    slowFor += rc;
    if (slowFor > 2) { ST.qual++; slowFor = 0; avgMs = 16; if (ST.qual >= 2) { ST.lowFx = true; ST.pcap = 220; } resize(); }
  } else slowFor = 0;
  const showPause = ST.state === 'play' && !ST.paused;
  if (showPause !== pauseShown) { pauseShown = showPause; pauseBtn.classList.toggle('show', showPause); testBtn.classList.toggle('show', showPause); if (!showPause) testPanel.classList.remove('open'); }
  try {
    if (!ST.paused) {
      if (ST.impact) { ST.impact.t += dt; if (ST.impact.t >= ST.impact.dur) ST.impact = null; }
      if (ST.hitStop > 0) ST.hitStop -= dt; else if (ST.CINE) cineStep(dt); else if (ST.state === 'pv') { update(dt * PV_SLOW); pvStep(dt * PV_SLOW); } else update(dt);                // a few frames of hit-stop on the biggest strikes
    }
    draw(now / 1000 - pausedTotal);
  }
  catch (err) {                        // one bad frame must never freeze the whole game
    console.error(err);
    if (ST.wBase) { ST.W = ST.wBase; ST.wBase = 0; } ST.bgS = 0;
    for (let i = 0; i < 12; i++) ctx.restore();
    ctx.setTransform(ST.DPR, 0, 0, ST.DPR, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
