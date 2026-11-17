import { ST } from '../state.js';
import { buzz } from '../input.js';
import { burst, notice, ring, showBanner, spawnStrike } from '../spawn.js';
import { Sound } from '../audio.js';


// ---------- heat mechanics: overdrive (Aurora Sea) and storm surge (Crimson Storm)
export function startOverdrive() {
  ST.od = 9; ST.inv = Math.max(ST.inv, 9);
  showBanner('Overdrive', '#FFD166'); notice('Invincible. Orbs worth x4', '#FFD166');
  ST.flash = Math.max(ST.flash, .4); ring(ST.moth.x, ST.moth.y, 'rgba(255,209,102,.95)', 1200, .8, 7); burst(ST.moth.x, ST.moth.y, '#FFD166', 40, 420, 1.2);
  Sound.tier(4); buzz([40, 30, 80]);
}
export function endOverdrive() {
  ST.od = 0; ST.inv = .8; ST.diff = .25; ST.tierMax = 1;
  notice('Cooldown', '#9AE6FF'); ring(ST.moth.x, ST.moth.y, 'rgba(154,230,255,.8)', 700, .6, 4);
}
export function startSurge() {
  ST.surge = { t: 0, n: 0 };
  showBanner('Storm surge', '#FF6B8A'); notice('Lightning! Keep moving', '#FF6B8A');
  Sound.roar(true); ST.rumble = 1; ST.shake = Math.max(ST.shake, .4);
}
export function updateSurge(g) {
  ST.surge.t += g; ST.stormT = Math.max(ST.stormT, 1);
  if (ST.surge.n < 7 && ST.surge.t >= ST.surge.n * .55) {
    spawnStrike(Math.random() < .65 ? ST.moth.x + (Math.random() - .5) * 60 : 40 + Math.random() * (ST.W - 80), '255,230,120');
    ST.surge.n++;
  }
  if (ST.surge.n >= 7 && ST.surge.t > 7 * .55 + 1.3) { ST.surge = null; ST.diff = .35; ST.tierMax = 1; notice('The storm calms', '#9AE6FF'); }
}
