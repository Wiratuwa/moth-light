let warpMaxR = 600;
let notice_;

export const cv = document.getElementById('c');
export const ctx = cv.getContext('2d');
export const menu = document.getElementById('menu');
export const over = document.getElementById('over');
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const ORB_MAX = 50;                       // orbs needed to hit max difficulty
export const HEAT_NAMES = ['Calm', 'Warm', 'Hot', 'Blazing', 'Max heat'];
export const HEAT_MULT = [1, 1.3, 1.6, 2, 2.5];   // score multiplier per heat level (a stage can override with its own table)
// Boss chance: rolled every BOSS_ROLL_EVERY seconds, never guaranteed. Chance = P0 + P1 x current heat (0..1).
export const BOSS_ROLL_EVERY = 5, BOSS_P0 = .04, BOSS_P1 = .36;
// per-stage hazard looks: shuriken body colours and comet/meteor styles
export const SH_STYLE = [
  { kind: 'ninja', fill: '#D9DEF0', stroke: '#FF4D6D', glow: 'rgba(255,60,90,1)',  hub: '#14132B' },
  { kind: 'thorn', fill: '#F6C9EF', stroke: '#FF3FA8', glow: 'rgba(255,60,170,1)', hub: '#4A0F45' },
  { kind: 'ice',   fill: '#E4F8FF', stroke: '#FF6B8A', glow: 'rgba(255,90,130,1)', hub: '#0B3550' },
  { kind: 'blade', fill: '#2B1519', stroke: '#FF7A2E', glow: 'rgba(255,100,40,1)', hub: '#FFB36B' },
  { kind: 'cd',    fill: '#FFFFFF', stroke: '#FF3C8E', glow: 'rgba(255,60,140,1)', hub: '#FF71CE' },
  { kind: 'slab',  fill: '#1B1A22', stroke: '#8A2A10', glow: 'rgba(255,98,40,1)', hub: '#FF8A3A' }
];
export const CM_STYLE = [
  { kind: 'fire',    lane: '255,150,70',  laneHi: '#FF6B4A', laneLo: '#FFB36B', glow: 'rgba(255,140,60,1)', t0: 'rgba(255,200,120,.9)', t1: 'rgba(255,80,40,0)' },
  { kind: 'crystal', lane: '255,120,230', laneHi: '#FF4FC8', laneLo: '#FFA6EA', glow: 'rgba(255,100,225,1)', t0: 'rgba(255,190,245,.9)', t1: 'rgba(170,80,255,0)' },
  { kind: 'ice',     lane: '120,215,255', laneHi: '#46C8FF', laneLo: '#A8E8FF', glow: 'rgba(120,220,255,1)', t0: 'rgba(225,250,255,.9)', t1: 'rgba(60,170,255,0)' },
  { kind: 'lava',    lane: '255,70,50',   laneHi: '#FF3B2A', laneLo: '#FF8A5C', glow: 'rgba(255,60,30,1)',  t0: 'rgba(255,170,70,.9)',  t1: 'rgba(160,10,10,0)' },
  { kind: 'crystal', lane: '5,217,232',  laneHi: '#05D9E8', laneLo: '#9CF6FF', glow: 'rgba(5,217,232,1)', t0: 'rgba(190,250,255,.9)', t1: 'rgba(255,80,220,0)' },
  { kind: 'slab',    lane: '255,98,40', laneHi: '#FF5A28', laneLo: '#FFB070', glow: 'rgba(255,98,40,1)', t0: 'rgba(255,220,180,.9)', t1: 'rgba(170,40,20,0)' }
];
// per-stage orb palettes: [blue orb, gold orb]; Moonlit Garden keeps the originals
export const OSTYLE = [
  { b: '#5EEAD4', br: '94,234,212',  g: '#FFD166', gr: '255,209,102' },
  { b: '#8FF0FF', br: '143,240,255', g: '#FFC46B', gr: '255,196,107' },
  { b: '#BFEFFF', br: '191,239,255', g: '#FFE08A', gr: '255,224,138' },
  { b: '#6FB6FF', br: '111,182,255', g: '#FFC83D', gr: '255,200,61' },
  { b: '#05D9E8', br: '5,217,232',   g: '#FFEE7A', gr: '255,238,122' },
  { b: '#9CFFF0', br: '156,255,240', g: '#FFE27A', gr: '255,226,122' }
];
export const STAGE_STEP = 250;                  // score needed per stage; stages loop after the last one
export const HAZ = { shuriken: 1, comet: 1, hole: 1, spore: 1, shard: 1 };
export const EVT = { popup: 1, marq: 1, lbar: 1 };   // Neon Mirage screen events
export const CLR = { shuriken: 1, comet: 1, hole: 1, spore: 1, shard: 1, gate: 1, strike: 1, popup: 1, marq: 1, lbar: 1, xsweep: 1, ispike: 1, owl: 1, cloud: 1, shear: 1 };
export const STAGES = [
  { name: 'Moonlit Garden', heatNames: ['Dusk', 'Glimmer', 'Firefly', 'Moonblaze', 'Full Moon'], tip: 'Classic heat. Every orb turns it up, and a hit resets it.',
    heat: 'reset', gain: 1, shMul: 1, extra: null,
    events: ['comet', 'shower', 'gate', 'hole', 'owl'], powers: ['shield', 'magnet', 'slow', 'nova', 'heal', 'double'],
    boss: { kind: 'eye', name: 'Void Eye', hp: 36 } },
  { name: 'Nebula Reef', heatNames: ['Still Water', 'Ripple', 'Bloom', 'Riptide', 'Maelstrom'], tip: 'Heat cools by itself. Keep it hot for bigger scores. Spore pods burst into shurikens.',
    heat: 'decay', gain: 1.6, shMul: .65, extra: 'spore', mult: [1, 1.5, 2, 2.6, 3.2],
    events: ['spore', 'spore', 'comet', 'shower', 'hole', 'current'], powers: ['shield', 'magnet', 'bloom', 'slow', 'warm', 'freeze'],
    boss: { kind: 'jelly', name: 'Spore Mother', hp: 40 } },
  { name: 'Aurora Sea', heatNames: ['Frost', 'Shimmer', 'Aurora', 'Solar Wind', 'Polar Surge'], tip: 'Max heat triggers Overdrive: invincible, with quadruple orb points. Watch for ice shards.',
    heat: 'overdrive', gain: 1.2, shMul: .6, extra: 'shard',
    events: ['shard', 'shard', 'gate', 'comet', 'shower', 'ice', 'icespike'], powers: ['shield', 'prism', 'nova', 'magnet', 'boost', 'phase'],
    boss: { kind: 'prism', name: 'Prism Sentinel', hp: 40 } },
  { name: 'Crimson Storm', heatNames: ['Overcast', 'Rumble', 'Squall', 'Tempest', 'Cataclysm'], tip: 'Heat builds by itself and orbs cool the storm. At max heat, lightning surges.',
    heat: 'inverse', gain: 1, shMul: 1, extra: null,
    events: ['strike', 'strike', 'comet', 'hole', 'gate', 'shower', 'cloud'], powers: ['shield', 'chill', 'prism', 'nova', 'rod', 'eye'],
    boss: { kind: 'storm', name: 'Storm Titan', hp: 42 } },
  { name: 'Neon Mirage', heatNames: ['Sunset', 'Neon Haze', 'Static', 'Glitch', 'System Crash'], tip: 'Ride the sunset. Heat builds with every orb. Hot hazards flicker and teleport, but always show where they land.',
    heat: 'glitch', gain: 1, shMul: .9, extra: null,
    events: ['comet', 'shower', 'gate', 'hole', 'popup', 'marq', 'lbar', 'countdown'], powers: ['shield', 'magnet', 'phase', 'ctrlz', 'defrag', 'dialup', 'save'],
    boss: { kind: 'sentinel', name: 'Neon Sentinel', hp: 40 } },
  // v52 Stage 6: terrain maths breaking down. Heat is distance: it only climbs, orbs push it faster, a hit never cools it.
  // Heat also decays precision (coarser snap grid, longer stretch). The Seam Colossus boss and the Reseed power-up arrived in v54.
  { name: 'Overflow Reach', heatNames: ['Origin', 'Drift', 'Stretch', 'Shear', 'Overflow'], tip: 'Heat is distance and only climbs. The further you fly, the more the land stretches and tears. Seams and shears sweep the whole map.',
    heat: 'drift', gain: .6, shMul: 1, extra: null, mult: [1, 1.4, 1.9, 2.5, 3.2],
    events: ['seam', 'seam', 'shear', 'shear', 'comet', 'shower', 'hole'], powers: ['shield', 'magnet', 'slow', 'nova', 'phase', 'reseed'],
    boss: { kind: 'colossus', name: 'Seam Colossus', hp: 40 } }
];
// universe palettes: sky top, sky bottom, accent glow
export const PAL = [
  { top: [12, 11, 32], bot: [36, 31, 78],  glow: [157, 140, 255] },
  { top: [26, 8, 46],  bot: [76, 20, 98],  glow: [255, 90, 200] },
  { top: [4, 26, 38],  bot: [8, 66, 74],   glow: [80, 255, 190] },
  { top: [32, 6, 12],  bot: [98, 16, 28],  glow: [255, 90, 60] },
  { top: [26, 8, 62],  bot: [70, 16, 96],  glow: [255, 110, 220] },
  { top: [8, 20, 16],  bot: [40, 64, 36],  glow: [206, 226, 96] }
];
export const AUR = ['94,255,190', '80,200,255', '190,120,255'];
export const WARP_COL = ['190,225,255', '255,210,255', '180,255,245'];
export const POWER_COL = { shield: '#7DB8FF', magnet: '#FF9ED8', slow: '#A5F3FC', nova: '#FFFFFF', bloom: '#B6F36B', prism: '#C4A8FF', chill: '#8FD8FF', reseed: '#CDE26A',
  heal: '#FF7A93', double: '#FFD166', warm: '#FF9F43', freeze: '#B8F1FF', boost: '#FFC857', phase: '#D6C6FF', rod: '#FFF27A', eye: '#A8E6CF',
  ctrlz: '#9CF6FF', defrag: '#FF71CE', dialup: '#FFFB96', save: '#B967FF' };
// exoplanet looks per universe: lit colour, shadow colour, atmosphere glow, surface types
export const PLANET_SETS = [
  [{ c1: [236, 234, 252], c2: [120, 116, 156], atm: '200,200,255', types: ['rock', 'rock', 'gas'] },
   { c1: [190, 176, 255], c2: [80, 66, 150],   atm: '157,140,255', types: ['gas', 'ringed'] }],
  [{ c1: [255, 150, 220], c2: [110, 30, 120],  atm: '255,110,210', types: ['gas', 'ringed'] },
   { c1: [170, 140, 255], c2: [60, 40, 140],   atm: '150,120,255', types: ['gas', 'ice', 'rock'] }],
  [{ c1: [150, 255, 225], c2: [10, 90, 100],   atm: '90,255,200',  types: ['ice', 'ringed'] },
   { c1: [120, 220, 150], c2: [20, 80, 70],    atm: '100,255,160', types: ['rock', 'gas'] }],
  [{ c1: [255, 170, 90],  c2: [120, 20, 20],   atm: '255,110,60',  types: ['lava'] },
   { c1: [255, 120, 120], c2: [90, 14, 34],    atm: '255,80,90',   types: ['gas', 'lava', 'ringed'] }],
  [{ c1: [190, 225, 255], c2: [30, 50, 150],   atm: '150,200,255', types: ['gas', 'ringed', 'ice'] },
   { c1: [255, 225, 150], c2: [130, 70, 30],   atm: '255,210,130', types: ['ringed', 'gas', 'rock'] },
   { c1: [255, 160, 255], c2: [70, 30, 130],   atm: '255,150,255', types: ['lava', 'ice'] }]
];

// background sky objects: chance (%) that each kind spawns on every background roll; rare kinds may exceed the on-screen cap
// v47: one table per stage (Moonlit, Nebula, Aurora, Crimson; Neon has its own spawner). Kinds not in BG_STAGE keep their old weight.
const BG_BASE = [['exo', 20], ['cluster', 20], ['sat', 10], ['ship', 8], ['rings', 7], ['snr', 5], ['galcl', 4],
  ['whitehole', 3], ['pulsar', 3], ['quasar', 2], ['gw', 1], ['neutron', 1], ['filament', 1], ['wormhole', .5], ['supernova', .5], ['rogue', .5],
  ['wdwarf', .5], ['magnetar', .2], ['exotic', .1], ['dyson', 10], ['dysonring', 5], ['engine', 3], ['matrioshka', 2]];
//                     Moonlit Nebula Aurora Crimson
const BG_STAGE = { exo: [45, 40, 40, 45], cluster: [20, 15, 10, 0], galcl: [5, 2, 3, 0], snr: [3, 10, 0, 0], filament: [1, 5, 2, 0],
  pulsar: [0, 0, 5, 0], gw: [0, 0, 4, 0], magnetar: [0, 0, 0, 6], wormhole: [0, 0, 0, 8], supernova: [.5, 1, 0, 1.5], rogue: [.5, 0, 0, 0] };
export const BG_TABLES = [0, 1, 2, 3].map(si => BG_BASE.map(([k, w]) => [k, BG_STAGE[k] ? BG_STAGE[k][si] : w]).filter(e => e[1] > 0));
export const ROGUE_PAL = { type: 'rock', c1: [76, 88, 130], c2: [8, 10, 26], atm: '90,120,210' };
export const cur = { top: PAL[0].top.slice(), bot: PAL[0].bot.slice(), glow: PAL[0].glow.slice() };
