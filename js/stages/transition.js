import { ST } from '../state.js';
import { BOSS_ROLL_EVERY, STAGES } from '../config.js';
import { portalStart } from '../core.js';
import { makePlanet } from '../render/cosmic.js';
import { auroraPlanet, crimsonPlanet } from '../render/planets.js';
import { unlockStage } from '../save.js';
import { buzz } from '../input.js';
import { burst, ring, stageIdx } from '../spawn.js';
import { clearBullets } from '../bosses/boss.js';
import { spawnProp } from './neon.js';
import { Sound } from '../audio.js';


// ---------- stage transition: a hyperspeed jump into the next universe
let forceStage = -1;
export function testJump(i) {
  if (ST.state !== 'play' || ST.paused || ST.trans) return;
  clearBullets(false); ST.boss = null; ST.bolts = []; ST.bossPending = 0;
  forceStage = i; startTransition();
}
export function startTransition() {
  if (ST.trans) return;
  let to = forceStage >= 0 ? forceStage : -1; forceStage = -1;
  if (to < 0) do { to = (Math.random() * STAGES.length) | 0; } while (to === ST.curStage);
  const land = (to === 5 || ST.curStage === 5) && !(ST.curStage === 5 && to === 4), nm = (to === 4 || ST.curStage === 4) && !land;          // v55: every jump into or out of Overflow Reach is a descent / ascent through the atmosphere
  ST.trans = { t: 0, dur: land ? (to === 5 ? 4.7 : 4.0) : nm ? 3.6 : 4.6, swapAt: land ? (to === 5 ? 1.7 : 3.0) : nm ? 1.4 : 1.8, swapped: false, to, neon: nm, enter: to === 4, land, dir: to === 5 ? 1 : -1 };
  ST.inv = Math.max(ST.inv, ST.trans.dur + .3); ST.od = 0; ST.surge = null; ST.bolts = []; ST.pw.prismT = 0; ST.bossPending = 0; ST.defrag = null; ST.ctd = null; ST.flow = null; ST.ice = null; ST.moth.iv = 0;
  for (const it of ST.items) burst(it.x, it.y || 100, '#FFFFFF', 4, 200, .8);
  ST.items = [];
  ring(ST.moth.x, ST.moth.y, ST.trans.neon ? 'rgba(255,113,206,.9)' : 'rgba(190,225,255,.9)', 900, .8, 5);
  if (ST.trans.neon) { Sound.glitchJump(ST.trans.enter); Sound.voice(ST.trans.enter ? 'welcome' : 'survived', 1.4 - .5); } else Sound.jump();   // voice starts .5 s before the stage swap at t = 1.4
  buzz([30, 40, 30]);
}
export function stageSwap() {
  ST.stageNo++;
  var nextStage = ST.trans ? ST.trans.to : (ST.curStage + 1) % STAGES.length;           // the target was already picked in startTransition (random, or from the Test button)   // random next universe, never the same twice in a row
  ST.curStage = nextStage; unlockStage(nextStage); ST.diff = 0; ST.tierShown = 0; ST.tierMax = 0; ST.streak = 0; ST.stageTime = 0; ST.bossSeen = false; ST.bossRollT = BOSS_ROLL_EVERY;
  ST.pw.magnet = ST.pw.slowT = ST.pw.prismT = ST.pw.doubleT = ST.pw.freezeT = ST.pw.phaseT = ST.pw.rodT = ST.pw.calmT = 0; ST.pw.dialT = 0; ST.pw.saveD = 0; ST.pw.seedT = 0; ST.pw.seedFx = 0; ST.defrag = null; ST.ctd = null; ST.nar = null; ST.cdCool = 25; ST.spkCool = 25; ST.warnDone = false;   // only the shield and a held Ctrl+Z survive the jump
  ST.bossCD = 0; ST.bossPending = 0; ST.eventT = 8; ST.powerCD = 4; ST.roarT = 6; ST.spawnT = .8;
  ST.planets = []; ST.cosmos = [];
  ST.props = [];
  if (ST.curStage === 4) { for (let i = 0; i < 3; i++) spawnProp(true); }
  else if (ST.curStage !== 5) for (let i = 0; i < 2; i++) ST.planets.push(stageIdx() === 3 ? crimsonPlanet(-60 - i * 160) : stageIdx() === 2 ? auroraPlanet(-60 - i * 160) : makePlanet(stageIdx(), -60 - i * 160));
  const nm = ST.trans && ST.trans.neon;
  const lnd = !!(ST.trans && ST.trans.land);
  ST.flash = nm ? .35 : lnd ? .3 : 1; ST.shake = lnd ? .25 : .6; ST.slow = 0;
  if (!nm && !lnd) portalStart(1, true);
  ring(ST.moth.x, ST.moth.y, 'rgba(255,255,255,.95)', 1300, .9, 8);
  burst(ST.moth.x, ST.moth.y, '#FFFFFF', 50, 600, 1.2);
  if (nm) Sound.glitchArrive(ST.trans.enter); else Sound.arrive();
  Sound.setStage(stageIdx());
  ST.card = { t: 0 };                    // stage name + rule card stays up well after the jump
}
