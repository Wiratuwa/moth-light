import { ST } from './state.js';
import { markFresh } from './ui.js';

// ---------- moth skins and trails: unlocked by reaching stages / beating a boss
export const SKINS = [
  { id: 'classic', name: 'Classic', a: '#C9BFFF', b: '#9D8CFF', body: '#F1ECFF', g: 'rgba(157,140,255,1)', need: null },
  { id: 'pearl', name: 'Reef Pearl', a: '#BFFBFF', b: '#FF9EE6', body: '#FFFFFF', g: 'rgba(255,158,230,1)', need: { stage: 1, txt: 'Reach Nebula Reef' } },
  { id: 'aurora', name: 'Aurora', a: '#C8FFE0', b: '#7FD6FF', body: '#F0FFFA', g: 'rgba(127,214,255,1)', need: { stage: 2, txt: 'Reach Aurora Sea' } },
  { id: 'ember', name: 'Ember', a: '#FFC09A', b: '#FF6B8A', body: '#FFF1E8', g: 'rgba(255,107,138,1)', need: { stage: 3, txt: 'Reach Crimson Storm' } },
  { id: 'neon', name: 'Neon', a: '#7DF9FF', b: '#FF3CC8', body: '#F4FFFF', g: 'rgba(60,240,255,1)', need: { stage: 4, txt: 'Reach Neon Mirage' } },
  { id: 'gold', name: 'Golden', a: '#FFE08A', b: '#FFB347', body: '#FFF8E0', g: 'rgba(255,200,90,1)', need: { boss: 1, txt: 'Defeat any boss' } }
];
export const TRAILS = [
  { id: 'dust', name: 'Stardust', sw: 'linear-gradient(135deg,#C9BFFF,#5EEAD4)', need: null },
  { id: 'bubbles', name: 'Bubbles', sw: 'radial-gradient(circle at 35% 35%,#fff,#8FF0FF)', need: { stage: 1, txt: 'Reach Nebula Reef' } },
  { id: 'ribbon', name: 'Aurora ribbon', sw: 'linear-gradient(135deg,#6BFFB0,#7FD6FF,#C58CFF)', need: { stage: 2, txt: 'Reach Aurora Sea' } },
  { id: 'bolt', name: 'Lightning', sw: 'linear-gradient(135deg,#FFFFFF,#6FB6FF)', need: { stage: 3, txt: 'Reach Crimson Storm' } },
  { id: 'pixels', name: 'Pixels', sw: 'linear-gradient(135deg,#05D9E8,#FF3CC8)', need: { stage: 4, txt: 'Reach Neon Mirage' } }
];
export function persist() { try { localStorage.setItem('mothlight.gear', JSON.stringify(ST.save)); } catch (e) {} }
export const gearOk = n => !n.need || (n.need.boss ? ST.save.boss : ST.save.seen[n.need.stage]);
export function unlockStage(i) {
  if (ST.save.seen[i]) return;
  ST.save.seen[i] = 1; persist();
  const gear = SKINS.concat(TRAILS).filter(n => n.need && n.need.stage === i), names = gear.map(n => n.name);
  if (names.length) { ST.pendNote = 'Unlocked: ' + names.join(' + '); markFresh(gear.map(n => n.id)); }
}
export function unlockBoss() { if (ST.save.boss) return; ST.save.boss = 1; persist(); ST.pendNote = 'Unlocked: Golden skin'; markFresh(['gold']); }
