import { ST } from './state.js';
import { EC, wHi, wLo } from './edge.js';
import { clampN } from './bosses/sentinel.js';


export function point(e) {
  if (!ST.moth || ST.paused) return;
  if (e.target && e.target.closest && e.target.closest('button')) return;   // taps on Pause / Sound don't steer
  const x = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
  if (typeof x === 'number' && !isNaN(x)) { ST.fingerSX = Math.max(24, Math.min(ST.W - 24, x)); ST.moth.tx = clampN(ST.fingerSX + EC.x, wLo(), wHi()); }
}
export const buzz = p => navigator.vibrate && navigator.vibrate(p);
