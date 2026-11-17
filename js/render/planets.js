import { ST } from '../state.js';
import { ctx, reduceMotion } from '../config.js';
import { rgb, SIDES } from '../core.js';
import { drawRingHalf, makePlanet } from './cosmic.js';
import { fxRnd } from './sprites-b.js';

let lastFl = 0;
let CHUNK = null;
// ---------- planet sprites (v48): each planet's static art is painted once into cached canvases; a frame is a few drawImage calls
export function rng32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const PTAU = 6.283185, PSPIN = { gas: .06, ringed: .06, tempest: .03, frozen: .05, glint: .04 };
const LOOK_PAL = {                                                    // default palettes of the new looks (later steps hand them out per stage)
  tempest: { c1: [255, 150, 96], c2: [84, 14, 22], atm: '255,100,70' },
  magma:   { c1: [255, 140, 70], c2: [30, 8, 10], atm: '255,110,50' },
  crystal: { c1: [196, 250, 255], c2: [44, 74, 150], atm: '150,230,255' },
  coral:   { c1: [255, 134, 176], c2: [90, 20, 110], atm: '255,110,190' },
  glacier: { c1: [228, 248, 255], c2: [40, 92, 152], atm: '140,255,220' },
  frozen:  { c1: [196, 246, 250], c2: [26, 96, 110], atm: '150,240,255' },
  glint:   { c1: [230, 250, 255], c2: [40, 110, 150], atm: '170,240,255' },
  split:   { c1: [190, 70, 56], c2: [36, 7, 12], atm: '255,110,50' },
  storm:   { c1: [168, 48, 84], c2: [40, 6, 22], atm: '255,90,120' }
};
const CRIM_FAM = [['tempest', .34], ['magma', .3], ['split', .18], ['storm', .18]];     // Crimson Storm's exoplanet families (v48-v1)
const CRIM_PAL = { tempest: [LOOK_PAL.tempest, { c1: [255, 112, 112], c2: [70, 10, 28], atm: '255,80,90' }, { c1: [255, 176, 80], c2: [96, 26, 12], atm: '255,130,50' }],
  magma: [LOOK_PAL.magma], split: [LOOK_PAL.split], storm: [LOOK_PAL.storm] };
export function crimsonPlanet(y, x, force, rForce) {
  let k = Math.random(), type = force || 'tempest';
  if (!force) for (const [n, w] of CRIM_FAM) { if ((k -= w) <= 0) { type = n; break; } }
  const rg = { tempest: [46, 86], magma: [30, 62], split: [40, 68], storm: [112, 156] }[type], r = rForce || rg[0] + Math.random() * (rg[1] - rg[0]), pl = CRIM_PAL[type];
  const p = makePlanet(3, y, x, r, Object.assign({ type }, pl[(Math.random() * pl.length) | 0]));
  if (type === 'storm') p.vy = 14;                                       // the biggest body drifts slowest
  if (type === 'split') { p.sa = (Math.random() < .5 ? -1 : 1) * (.25 + Math.random() * .6); p.chunks = []; for (let i = 0; i < 6; i++) p.chunks.push({ u: (Math.random() - .5) * 1.6, n: Math.random(), s: (.05 + Math.random() * .06) * r, rot: Math.random() * 6.28, dir: Math.random() < .5 ? -1 : 1 }); }
  return p;
}
const AURORA_FAM = [['glacier', .3], ['frozen', .26], ['crystal', .24], ['glint', .2]];   // Aurora Sea's exoplanet families (v49)
const AURORA_PAL = { glacier: [LOOK_PAL.glacier, { c1: [210, 240, 255], c2: [30, 70, 140], atm: '120,230,255' }, { c1: [220, 255, 245], c2: [20, 100, 110], atm: '110,255,200' }],
  frozen: [LOOK_PAL.frozen, { c1: [170, 235, 235], c2: [16, 82, 92], atm: '120,235,230' }],
  crystal: [LOOK_PAL.crystal, { c1: [200, 235, 255], c2: [70, 50, 150], atm: '190,160,255' }], glint: [LOOK_PAL.glint] };
export function auroraPlanet(y, x, force) {
  let k = Math.random(), type = force || 'glacier';
  if (!force) for (const [n, w] of AURORA_FAM) { if ((k -= w) <= 0) { type = n; break; } }
  const rg = { glacier: [36, 70], frozen: [50, 90], crystal: [34, 62], glint: [38, 64] }[type], r = rg[0] + Math.random() * (rg[1] - rg[0]), pl = AURORA_PAL[type];
  const p = makePlanet(2, y, x, r, Object.assign({ type }, pl[(Math.random() * pl.length) | 0]));
  if (type === 'glacier' && r < 52 && !ST.planets.some(q => q.aurStorm) && Math.random() < .6) p.aurStorm = true;     // one far world gets a slow aurora storm wrapped around it
  return p;
}
export function calcStormFlash() {
  let f = 0;
  if (!reduceMotion && ST.uw[3] > .05) for (const T of ST.thunders) {
    if (T.delay > 0 || T.st !== 3) continue;
    if (T.fo === undefined) { const now = performance.now() / 1000; T.fo = now - lastFl >= .9; if (T.fo) lastFl = now; }
    if (T.fo) f = Math.max(f, T.life / T.max * (T.type === 'sheet' ? .8 : T.big ? 1 : .7));
  }
  ST.stormFlash += (f - ST.stormFlash) * .5; if (ST.stormFlash > .7) ST.stormFlash = .7; if (ST.stormFlash < .01) ST.stormFlash = 0;
}
function buildPlanet(p) {
  if (p.type === 'storm') return buildStorm(p);
  const r = p.r, type = p.type === 'split' ? 'magma' : p.type, S = ST.lowFx ? 1 : Math.min(ST.DPR, 2), rnd = rng32(p.seed);
  const Nn = n => ST.lowFx ? Math.max(1, Math.ceil(n / 2)) : n;           // low-effects halves every decorative count
  const R = (a, b) => a + rnd() * (b - a);
  const P = Math.ceil(r * 4), TW = P + Math.ceil(r * 2);                // the surface strip repeats every P px and slides sideways as the "rotation"
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w * S); c.height = Math.ceil(h * S); const g = c.getContext('2d'); g.scale(S, S); return [c, g]; };
  const wrap = f => { f(-P); f(0); f(P); };
  const [tex, g] = mk(TW, r * 2);
  const ice = type === 'frozen' || type === 'glint';
  const hasEmi = type === 'lava' || type === 'magma' || type === 'coral';
  const em = hasEmi ? mk(TW, r * 2) : null, eg = em && em[1];
  g.fillStyle = rgb(mixc(p.c1, p.c2, type === 'crystal' ? .2 : type === 'ice' ? .3 : type === 'glacier' ? .18 : ice ? .3 : .42)); g.fillRect(0, 0, TW, r * 2);
  const hsh = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7 + (p.seed % 1000)) * 43758.5453; return x - Math.floor(x); };
  const sin = Math.sin, cos = Math.cos;
  const bandPath = (gc, yT, yB, a1, k1, f1, a2, k2, f2) => {            // horizontal band with periodic wavy edges
    gc.beginPath();
    for (let x = 0; x <= TW; x += 5) { const y = yT + a1 * sin(PTAU * k1 * x / P + f1) + a2 * sin(PTAU * k2 * x / P + f2); x ? gc.lineTo(x, y) : gc.moveTo(x, y); }
    for (let x = TW; x >= 0; x -= 5) gc.lineTo(x, yB + a1 * sin(PTAU * k1 * x / P + f1 + .8) + a2 * sin(PTAU * k2 * x / P + f2 + 1.3));
    gc.closePath(); gc.fill();
  };
  const walkPolys = (x, y, a, n, len, jit, depth) => {                  // crack / branch generator: returns polylines
    const out = [], rec = (x, y, a, n, d) => {
      const pts = [[x, y]];
      for (let i = 0; i < n; i++) { a += R(-jit, jit); x += cos(a) * len; y += sin(a) * len; pts.push([x, y]); if (d > 0 && rnd() < .28) rec(x, y, a + R(-1.1, 1.1), Math.max(2, n - i - 2), d - 1); }
      out.push(pts);
    };
    rec(x, y, a, n, depth); return out;
  };
  const strokePolys = (gc, polys, style, lw) => {
    gc.strokeStyle = style; gc.lineWidth = lw; gc.lineCap = 'round'; gc.lineJoin = 'round';
    wrap(dx => { gc.beginPath(); for (const pts of polys) { gc.moveTo(pts[0][0] + dx, pts[0][1]); for (let i = 1; i < pts.length; i++) gc.lineTo(pts[i][0] + dx, pts[i][1]); } gc.stroke(); });
  };
  const blotches = (n, a1, a2) => {                                     // big soft light and dark patches so no surface is a flat colour
    for (let i = 0; i < n; i++) wrap(dx => {
      const x = (i * 97 % 100) / 100 * P + dx + R(-r * .3, r * .3), y = R(.1, 1.9) * r, rr = r * R(.25, .6), l = rnd() < .5;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, l ? 'rgba(255,255,255,' + a1 + ')' : 'rgba(10,5,30,' + a2 + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    });
  };
  let plume = null, haze = .2, gloss = false, cap = 0, grade = [.42, .62];
  if (type === 'gas' || type === 'ringed' || ice) {
    const k1 = 1 + (rnd() * 3 | 0), k2 = 3 + (rnd() * 3 | 0);
    for (const b of p.bands) {
      const yT = r + b.y * r * 1.1, h = b.h * r * 1.5, col = b.dark ? (ice ? '16,70,96' : '20,10,40') : '255,255,255', al = Math.min(.6, (b.dark ? b.a : b.a * .8) * (ice ? 1.7 : 1));
      g.fillStyle = 'rgba(' + col + ',' + al * .35 + ')'; bandPath(g, yT - h * .5, yT + h * 1.5, r * .02, k1, rnd() * 6, r * .01, k2, rnd() * 6);   // soft feathered edge
      g.fillStyle = 'rgba(' + col + ',' + al + ')'; bandPath(g, yT, yT + h, r * .022, k1, rnd() * 6, r * .012, k2, rnd() * 6);
    }
    for (let i = 0; i < Nn(14); i++) { g.fillStyle = rnd() < .5 ? 'rgba(255,255,255,' + R(.06, .14) + ')' : 'rgba(20,10,40,' + R(.07, .16) + ')'; const y = R(.05, 1.95) * r; bandPath(g, y, y + r * R(.012, .03), r * .012, 2, rnd() * 6, r * .008, 5, rnd() * 6); }
    for (let i = 0, ns = !ice && rnd() < .6 ? 1 + (rnd() < .4) : 0; i < ns; i++) {          // one or two small storm ovals
      const sx = R(0, P), sy = r + R(-.45, .45) * r, rx = r * R(.16, .26), ry = rx * .55;
      wrap(dx => {
        g.save(); g.translate(sx + dx, sy); g.scale(1, ry / rx);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, 'rgba(255,240,255,.5)'); gr.addColorStop(.55, 'rgba(' + p.atm + ',.22)'); gr.addColorStop(1, 'rgba(40,15,70,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, PTAU); g.fill(); g.strokeStyle = 'rgba(40,15,70,.3)'; g.lineWidth = 1; g.stroke(); g.restore();
      });
    }
    if (ice) {                                                                       // pale ammonia ice: crystalline streaks and a glossy, hazy finish
      g.lineCap = 'round';
      for (let i = 0; i < Nn(20); i++) { const sx = R(0, P), sy = R(.1, 1.9) * r, l = r * R(.08, .22), a = R(-.7, .7) + (rnd() < .5 ? 0 : 1.57); g.strokeStyle = 'rgba(255,255,255,' + R(.14, .3) + ')'; g.lineWidth = Math.max(.7, r * .01); wrap(dx => { g.beginPath(); g.moveTo(sx + dx, sy); g.lineTo(sx + dx + cos(a) * l, sy + sin(a) * l); g.stroke(); }); }
      gloss = true; cap = .25; haze = .32; grade = [.4, .45];
    }
  } else if (type === 'ice') {
    blotches(Nn(6), .09, .1);
    for (let i = 0; i < Nn(5); i++) { const y = R(.15, 1.85) * r; g.fillStyle = 'rgba(255,255,255,.14)'; bandPath(g, y, y + r * R(.04, .09), r * .03, 1 + (rnd() * 2 | 0), rnd() * 6, r * .012, 4, rnd() * 6); }
    for (let i = 0; i < Nn(7); i++) { const c = walkPolys(R(0, P), R(.2, 1.8) * r, R(0, PTAU), 7, r * .16, .55, 2); strokePolys(g, c, 'rgba(25,70,140,.35)', Math.max(.8, r * .018)); strokePolys(g, c, 'rgba(255,255,255,.4)', Math.max(.5, r * .007)); }
    cap = .55; gloss = true;
  } else if (type === 'lava' || type === 'magma') {
    const mg = type === 'magma';
    g.fillStyle = mg ? 'rgba(8,3,5,.72)' : 'rgba(20,5,10,.5)'; g.fillRect(0, 0, TW, r * 2);
    blotches(Nn(8), .05, .22);
    for (let i = 0; i < Nn(mg ? 7 : 5); i++) { const y = R(.2, 1.8) * r; g.fillStyle = 'rgba(0,0,0,.2)'; bandPath(g, y, y + r * R(.05, .12), r * .04, 1 + (rnd() * 2 | 0), rnd() * 6, r * .015, 4, rnd() * 6); }
    let polys;
    if (mg) { polys = []; for (let i = 0, n = Nn(9); i < n; i++) polys.push(...walkPolys(i / n * P + R(-r * .2, r * .2), R(.25, 1.75) * r, R(0, PTAU), 6, r * .15, .6, 2)); }
    else polys = p.cracks.map((pts, i) => pts.map(q => [i / p.cracks.length * P + q[0] * r * .8 + r, r + q[1] * r]));
    if (mg) strokePolys(g, polys, 'rgba(0,0,0,.45)', Math.max(2, r * .07));           // dark crust edge around every fissure
    strokePolys(eg, polys, 'rgba(255,80,20,.3)', Math.max(3, r * .09));
    strokePolys(eg, polys, 'rgba(255,150,60,.75)', Math.max(1.5, r * .04));
    if (mg) strokePolys(eg, polys, 'rgba(255,238,200,.9)', Math.max(.8, r * .014));    // white-hot core
    if (mg && p.type !== 'split') plume = { a: R(-2.6, -.5), n: 5 };
    haze = mg ? .3 : .25; grade = mg ? [.06, .5] : [.16, .55];
  } else if (type === 'tempest') {
    blotches(Nn(7), .06, .14);
    for (let i = 0, n = Nn(11); i < n; i++) {                                         // torn cloud bands
      const dark = i % 2 === 0, yT = (i / n * 2.1 - .05) * r, h = r * R(.08, .2);
      g.fillStyle = dark ? 'rgba(40,5,12,.4)' : 'rgba(255,170,100,.3)'; bandPath(g, yT, yT + h, r * R(.03, .06), 1 + (rnd() * 3 | 0), rnd() * 6, r * R(.015, .03), 3 + (rnd() * 4 | 0), rnd() * 6);
    }
    g.lineCap = 'round';
    for (let i = 0; i < Nn(26); i++) {                                                // shear streaks where the bands are ripped
      const sx = R(0, P), sy = R(.1, 1.9) * r, l = r * R(.2, .6), sl = R(-.12, .12);
      g.strokeStyle = rnd() < .6 ? 'rgba(255,215,160,.26)' : 'rgba(30,3,10,.3)'; g.lineWidth = Math.max(.8, r * R(.008, .02));
      wrap(dx => { g.beginPath(); g.moveTo(sx + dx, sy); g.quadraticCurveTo(sx + dx + l / 2, sy + l * sl - r * .03, sx + dx + l, sy + l * sl); g.stroke(); });
    }
    const cx = R(P * .2, P * .8), cy = r + R(-.3, .1) * r, cr = r * .4; p.o = ((cx - r) / P + 1) % 1;                // the huge cyclone eye
    wrap(dx => {
      g.save(); g.translate(cx + dx, cy); g.scale(1, .86);
      let gr = g.createRadialGradient(0, 0, cr * .5, 0, 0, cr * 2); gr.addColorStop(0, 'rgba(30,2,8,.4)'); gr.addColorStop(1, 'rgba(30,2,8,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, cr * 2, 0, PTAU); g.fill();
      for (let k = 0; k < 4; k++) { g.beginPath(); for (let s = 0; s <= 1; s += .05) { const a = k * PTAU / 4 + s * 3.4, d = cr * (.5 + s * 1.2); s ? g.lineTo(cos(a) * d, sin(a) * d) : g.moveTo(cos(a) * d, sin(a) * d); } g.strokeStyle = 'rgba(255,215,160,.5)'; g.lineWidth = cr * .18; g.stroke(); g.strokeStyle = 'rgba(30,3,10,.5)'; g.lineWidth = cr * .09; g.stroke(); }
      gr = g.createRadialGradient(0, 0, 0, 0, 0, cr * .58); gr.addColorStop(0, 'rgba(18,1,6,.9)'); gr.addColorStop(.7, 'rgba(40,5,12,.7)'); gr.addColorStop(1, 'rgba(255,190,130,.45)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, cr * .58, 0, PTAU); g.fill(); g.restore();
    });
    haze = .3;
  } else if (type === 'crystal') {
    const hs0 = r * (ST.lowFx ? .3 : .2), cols = Math.max(4, Math.round(P / (hs0 * 1.732))), w = P / cols, hs = w / 1.732, rows = Math.ceil(r * 2 / (hs * 1.5)) + 2;
    g.lineJoin = 'round';
    for (let row = -1; row < rows; row++) for (let col = 0; col < cols + Math.ceil(r * 2 / w) + 1; col++) {
      const cx = (col + (row & 1 ? .5 : 0)) * w, cy = row * hs * 1.5, hv = hsh(col % cols, row), hv2 = hsh(row, col % cols + 9);
      g.beginPath(); for (let k = 0; k < 6; k++) { const a = PTAU / 12 + k * PTAU / 6; k ? g.lineTo(cx + hs * cos(a), cy + hs * sin(a)) : g.moveTo(cx + hs * cos(a), cy + hs * sin(a)); } g.closePath();
      g.fillStyle = 'rgba(255,255,255,' + (.05 + .26 * hv) + ')'; g.fill();
      if (hv2 < .35) { g.fillStyle = 'rgba(190,150,255,' + (.1 + .12 * hv) + ')'; g.fill(); } else if (hv2 > .8) { g.fillStyle = 'rgba(120,255,220,' + (.08 + .1 * hv) + ')'; g.fill(); }
      g.strokeStyle = 'rgba(255,255,255,.44)'; g.lineWidth = Math.max(.6, r * .012); g.stroke();
      g.beginPath(); g.moveTo(cx + hs * cos(PTAU / 12), cy + hs * sin(PTAU / 12)); g.lineTo(cx, cy); g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = Math.max(.5, r * .008); g.stroke();
    }
    gloss = true; haze = .18; grade = [.26, .45];
  } else if (type === 'coral') {
    g.fillStyle = 'rgba(30,4,60,.5)'; g.fillRect(0, 0, TW, r * 2);
    blotches(Nn(6), .06, .16);
    const segs = [], grow = (x, y, a, n, lw, d) => { for (let i = 0; i < n; i++) { const a2 = a + R(-.35, .35), x2 = x + cos(a2) * r * .13, y2 = y + sin(a2) * r * .13; segs.push([x, y, x2, y2, lw]); x = x2; y = y2; a = a2; lw *= .93; if (d > 0 && rnd() < .3) grow(x, y, a + R(-1, 1) * .9, Math.max(2, n - i - 1), lw * .75, d - 1); } };
    for (let i = 0, n = Nn(22); i < n; i++) grow(i / n * P + R(-r * .2, r * .2), R(.1, 1.9) * r, R(0, PTAU), 7, r * .085, 2);
    const lay = (gc, style, add, k) => { gc.strokeStyle = style; gc.lineCap = 'round'; for (const s of segs) { gc.lineWidth = Math.max(.8, s[4] * k + add); wrap(dx => { gc.beginPath(); gc.moveTo(s[0] + dx, s[1]); gc.lineTo(s[2] + dx, s[3]); gc.stroke(); }); } };
    lay(g, 'rgba(35,3,60,.65)', r * .035, 1);                                          // dark crevices
    lay(g, rgb(p.c1, .85), 0, 1);                                                      // coral ridges
    lay(g, 'rgba(255,235,245,.3)', -r * .01, .45);                                     // highlights
    lay(eg, 'rgba(255,60,170,.32)', r * .05, 1.1);                                     // glow in the crevices
    lay(eg, 'rgba(255,160,215,.45)', 0, .22);
    haze = .45; grade = [.3, .5];
  } else if (type === 'glacier') {
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, TW, r * 2);
    blotches(Nn(7), .12, .12);
    for (let i = 0; i < Nn(15); i++) { const c = walkPolys(R(0, P), R(.1, 1.9) * r, R(0, PTAU), 9, r * .15, .5, 2); strokePolys(g, c, 'rgba(25,70,145,.55)', Math.max(1.1, r * .03)); strokePolys(g, c, 'rgba(255,255,255,.7)', Math.max(.6, r * .011)); }
    gloss = true; cap = .35; haze = .22; grade = [.4, .42];
  } else {                                                                            // rock (and anything unknown): ridged highlands, fractures, a frost cap
    blotches(Nn(7), .08, .12);
    for (let i = 0; i < Nn(9); i++) {
      const yc = R(.15, 1.85) * r, a1 = r * R(.02, .07), k1 = 1 + (rnd() * 3 | 0), f1 = R(0, 6), a2 = r * .02, k2 = 4 + (rnd() * 3 | 0), f2 = R(0, 6), lw = r * R(.03, .07);
      g.lineCap = 'round';
      for (const [st, dy, w] of [['rgba(20,15,45,.24)', 0, lw], ['rgba(255,255,255,.17)', -lw * .6, Math.max(.7, lw * .35)]]) {
        g.strokeStyle = st; g.lineWidth = w; g.beginPath();
        for (let x = 0; x <= TW; x += 5) { const y = yc + dy + a1 * sin(PTAU * k1 * x / P + f1) + a2 * sin(PTAU * k2 * x / P + f2); x ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
    }
    for (let i = 0; i < Nn(5); i++) strokePolys(g, walkPolys(R(0, P), R(.2, 1.8) * r, R(0, PTAU), 7, r * .17, .45, 1), 'rgba(15,10,40,.4)', Math.max(.8, r * .013));
    for (const c of p.craters.slice(0, 2)) {                                           // a couple of small soft scars, never a cratered disc
      const x = c.a / PTAU * P, y = r + (c.d - .4) * r, cr = c.s * r * .7, gr = g.createRadialGradient(x, y, 0, x, y, cr);
      gr.addColorStop(0, 'rgba(20,15,40,.28)'); gr.addColorStop(1, 'rgba(20,15,40,0)'); g.fillStyle = gr; wrap(dx => { g.save(); g.translate(dx, 0); g.fillRect(x - cr, y - cr, cr * 2, cr * 2); g.restore(); });
    }
    cap = .3;
  }
  // overlay: halo, lighting, rim light, atmosphere edge (static)
  const OS = Math.ceil(r * 3.8), [ov, o] = mk(OS, OS); o.translate(OS / 2, OS / 2);
  let gr = o.createRadialGradient(0, 0, 0, 0, 0, r * 1.9); gr.addColorStop(0, 'rgba(' + p.atm + ',.22)'); gr.addColorStop(1, 'rgba(' + p.atm + ',0)');
  o.fillStyle = gr; o.beginPath(); o.arc(0, 0, r * 1.9, 0, PTAU); o.fill();
  o.globalCompositeOperation = 'destination-out'; o.fillStyle = '#000'; o.beginPath(); o.arc(0, 0, r, 0, PTAU); o.fill(); o.globalCompositeOperation = 'source-over';
  if (ice) {                                                                           // halo of diamond dust
    for (let i = 0, n = Nn(type === 'frozen' ? 40 : 18); i < n; i++) {
      const a = rnd() * PTAU, d = r * R(1.12, 1.8), x = cos(a) * d, y = sin(a) * d, sz = R(.8, 2.2) * (r > 50 ? 1.3 : 1), al = R(.25, .8);
      o.fillStyle = 'rgba(220,250,255,' + al + ')'; o.beginPath(); o.moveTo(x, y - sz * 2); o.lineTo(x + sz * .7, y); o.lineTo(x, y + sz * 2); o.lineTo(x - sz * .7, y); o.closePath(); o.fill();
      if (al > .6) { o.fillStyle = 'rgba(180,240,255,.16)'; o.beginPath(); o.arc(x, y, sz * 3, 0, PTAU); o.fill(); }
    }
  }
  if (plume) {                                                                         // volcanic ash plume rising off the limb
    const bx = cos(plume.a) * r * .98, by = sin(plume.a) * r * .98;
    for (let i = 0; i < plume.n; i++) {
      const d = i * r * .2, x = bx + cos(plume.a) * d + R(-r * .05, r * .05), y = by + sin(plume.a) * d + R(-r * .05, r * .05), rr = r * (.12 + i * .045);
      gr = o.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(26,12,12,' + (.6 - i * .07) + ')'); gr.addColorStop(1, 'rgba(26,12,12,0)');
      o.fillStyle = gr; o.beginPath(); o.arc(x, y, rr, 0, PTAU); o.fill();
    }
    gr = o.createRadialGradient(bx, by, 0, bx, by, r * .35); gr.addColorStop(0, 'rgba(255,120,40,.4)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); o.fillStyle = gr; o.beginPath(); o.arc(bx, by, r * .35, 0, PTAU); o.fill();
  }
  o.save(); o.beginPath(); o.arc(0, 0, r, 0, PTAU); o.clip();
  gr = o.createRadialGradient(-r * .35, -r * .35, r * .1, 0, 0, r * 1.05); gr.addColorStop(0, rgb(p.c1, grade[0])); gr.addColorStop(1, rgb(p.c2, grade[1]));
  o.fillStyle = gr; o.fillRect(-r, -r, r * 2, r * 2);                                  // colour grade: lit tone to shadow tone
  gr = o.createRadialGradient(-r * .45, -r * .45, r * .2, -r * .2, -r * .2, r * 1.7); gr.addColorStop(0, 'rgba(0,0,15,0)'); gr.addColorStop(.55, 'rgba(0,0,15,.15)'); gr.addColorStop(1, 'rgba(0,0,15,.8)');
  o.fillStyle = gr; o.fillRect(-r, -r, r * 2, r * 2);                                  // terminator
  if (cap) { o.save(); o.translate(0, -r * .98); o.scale(1, .38); gr = o.createRadialGradient(0, 0, 0, 0, 0, r * .78); gr.addColorStop(0, 'rgba(255,255,255,' + cap + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); o.fillStyle = gr; o.beginPath(); o.arc(0, 0, r * .78, 0, PTAU); o.fill(); o.restore(); }
  if (gloss) { gr = o.createRadialGradient(-r * .42, -r * .44, 0, -r * .42, -r * .44, r * .38); gr.addColorStop(0, 'rgba(255,255,255,.42)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); o.fillStyle = gr; o.fillRect(-r, -r, r * 2, r * 2); }
  if (type === 'glint') {                                                              // soft shadow of the ring across the planet
    o.save(); o.rotate(p.tilt * .6); o.scale(1, .35);
    for (const [lw, al] of [[r * .5, .12], [r * .3, .2]]) { o.strokeStyle = 'rgba(6,26,56,' + al + ')'; o.lineWidth = lw; o.beginPath(); o.arc(0, r * .3, r, .12, Math.PI - .12); o.stroke(); }
    o.restore();
  }
  if (type === 'glacier') {                                                            // aurora rings around both poles
    for (const sy of SIDES) {
      o.save(); o.translate(0, sy * r * .78); o.scale(1, .25);
      gr = o.createRadialGradient(0, 0, r * .2, 0, 0, r * .75); gr.addColorStop(0, 'rgba(120,255,210,.0)'); gr.addColorStop(.7, 'rgba(120,255,210,.18)'); gr.addColorStop(1, 'rgba(120,255,210,0)'); o.fillStyle = gr; o.beginPath(); o.arc(0, 0, r * .75, 0, PTAU); o.fill();
      o.lineCap = 'round'; o.strokeStyle = 'rgba(120,255,210,.2)'; o.lineWidth = r * .16; o.beginPath(); o.arc(0, 0, r * .6, 0, Math.PI); o.stroke();
      o.strokeStyle = 'rgba(190,255,235,.7)'; o.lineWidth = r * .05; o.beginPath(); o.arc(0, 0, r * .6, 0, Math.PI); o.stroke();
      o.restore();
    }
  }
  gr = o.createRadialGradient(0, 0, r * .72, 0, 0, r); gr.addColorStop(0, 'rgba(' + p.atm + ',0)'); gr.addColorStop(1, 'rgba(' + p.atm + ',' + haze + ')');
  o.fillStyle = gr; o.fillRect(-r, -r, r * 2, r * 2);                                  // soft haze on the edge
  o.fillStyle = 'rgba(5,3,18,' + (1 - (.72 + .16 * Math.max(0, Math.min(1, (r - 26) / 64)))) + ')'; o.fillRect(-r, -r, r * 2, r * 2);   // big bodies sit dimmer than hazards and orbs (baked, so the disc stays solid)
  o.restore();
  if (type === 'crystal') {                                                            // refracted rainbow edge
    gr = o.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, 'rgba(120,255,220,.6)'); gr.addColorStop(.35, 'rgba(120,230,255,.45)'); gr.addColorStop(.65, 'rgba(190,150,255,.55)'); gr.addColorStop(1, 'rgba(120,255,220,.5)');
    o.strokeStyle = gr; o.lineWidth = Math.max(1.5, r * .045); o.beginPath(); o.arc(0, 0, r * .975, 0, PTAU); o.stroke();
  }
  o.strokeStyle = 'rgba(' + p.atm + ',.4)'; o.lineWidth = 1.5; o.beginPath(); o.arc(0, 0, r, 0, PTAU); o.stroke();
  o.strokeStyle = 'rgba(255,255,255,.26)'; o.lineWidth = Math.max(1, r * .025); o.beginPath(); o.arc(0, 0, r * .985, Math.PI * .85, Math.PI * 1.65); o.stroke();   // rim light
  let rb = null, rf = null, RS = 0;
  if (p.ring) { RS = Math.ceil(r * 5.6); const A = mk(RS, RS), B = mk(RS, RS); A[1].translate(RS / 2, RS / 2); B[1].translate(RS / 2, RS / 2); drawRingHalf(p, false, A[1]); drawRingHalf(p, true, B[1]); rb = A[0]; rf = B[0]; }
  let gt = null, GS = 0, aur = null, AS = 0;
  if (type === 'glint') {                                                              // ring of ice crystals: a flat texture that turns, split into back and front halves when drawn
    GS = Math.ceil(r * 5); const [gc, gg] = mk(GS, GS); gg.translate(GS / 2, GS / 2);
    const bands = [[1.5, .12], [1.75, .2], [2.05, .14]];
    for (const [b, w] of bands) { gg.strokeStyle = 'rgba(170,240,255,.22)'; gg.lineWidth = r * w; gg.beginPath(); gg.arc(0, 0, r * b, 0, PTAU); gg.stroke(); }
    for (let i = 0, n = Nn(800); i < n; i++) {
      const b = bands[(rnd() * bands.length) | 0], rad = r * (b[0] + (rnd() - .5) * b[1]), a = rnd() * PTAU, sz = R(.7, 1.8) * (r > 50 ? 1.3 : 1);
      gg.fillStyle = rnd() < .5 ? 'rgba(255,255,255,' + R(.4, .95) + ')' : 'rgba(150,235,255,' + R(.35, .9) + ')';
      gg.save(); gg.translate(cos(a) * rad, sin(a) * rad); gg.rotate(a * 3); gg.fillRect(-sz, -sz * .5, sz * 2, sz); gg.restore();
    }
    for (let i = 0, n = Nn(24); i < n; i++) {                                          // a few larger shards that catch the light
      const b = bands[(rnd() * bands.length) | 0], rad = r * (b[0] + (rnd() - .5) * b[1]), a = rnd() * PTAU, sz = R(1.6, 3) * (r > 50 ? 1.2 : 1);
      gg.fillStyle = 'rgba(240,252,255,.9)'; gg.save(); gg.translate(cos(a) * rad, sin(a) * rad); gg.rotate(R(0, 3));
      gg.beginPath(); gg.moveTo(0, -sz * 1.4); gg.lineTo(sz * .8, 0); gg.lineTo(0, sz * 1.4); gg.lineTo(-sz * .8, 0); gg.closePath(); gg.fill(); gg.restore();
    }
    gt = gc;
  }
  if (p.aurStorm) {                                                                    // slow aurora storm ribbons wrapped around a far world
    AS = Math.ceil(r * 4.6); const [ac, ag] = mk(AS, AS); ag.translate(AS / 2, AS / 2); ag.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      ag.save(); ag.rotate(k * 1.3 + R(0, .5)); ag.scale(1, .55 + k * .05);
      const rad = r * (1.28 + k * .2), a0 = R(0, 6), len = R(2.4, 4.2), gr = ag.createLinearGradient(-rad, 0, rad, 0);
      gr.addColorStop(0, 'rgba(120,255,210,0)'); gr.addColorStop(.3, 'rgba(120,255,210,.7)'); gr.addColorStop(.7, 'rgba(190,150,255,.7)'); gr.addColorStop(1, 'rgba(190,150,255,0)');
      ag.strokeStyle = gr; ag.lineWidth = r * .18; ag.globalAlpha = .18; ag.beginPath(); ag.arc(0, 0, rad, a0, a0 + len); ag.stroke();
      ag.lineWidth = r * .06; ag.globalAlpha = .6; ag.beginPath(); ag.arc(0, 0, rad, a0, a0 + len); ag.stroke(); ag.restore();
    }
    aur = ac;
  }
  let seam = null, SW = 0, SH = 0;
  if (p.type === 'split') {                                                            // the hot break line between the two halves
    SW = Math.ceil(r * 2.3); SH = Math.ceil(r * .5); const [sc, sg] = mk(SW, SH);
    let q = sg.createLinearGradient(0, 0, 0, SH); q.addColorStop(0, 'rgba(255,90,30,0)'); q.addColorStop(.36, 'rgba(255,120,40,.5)'); q.addColorStop(.5, 'rgba(255,238,205,.95)'); q.addColorStop(.64, 'rgba(255,120,40,.5)'); q.addColorStop(1, 'rgba(255,90,30,0)');
    sg.fillStyle = q; sg.fillRect(0, 0, SW, SH); sg.globalCompositeOperation = 'destination-in';
    q = sg.createLinearGradient(0, 0, SW, 0); q.addColorStop(0, 'rgba(0,0,0,0)'); q.addColorStop(.14, 'rgba(0,0,0,1)'); q.addColorStop(.86, 'rgba(0,0,0,1)'); q.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = q; sg.fillRect(0, 0, SW, SH);
    seam = sc;
  }
  return { tex, emi: em && em[0], ov, rb, rf, OS, RS, P, S, spd: (PSPIN[type] || .02) * r, plA: plume ? plume.a : null, seam, SW, SH, gt, GS, aur, AS };
}
function buildStorm(p) {                                               // storm cell: no surface, a huge thundercloud mass lit red from beneath
  const r = p.r, S = ST.lowFx ? 1 : Math.min(ST.DPR, 2), rnd = rng32(p.seed), SZ = Math.ceil(r * 2.7), R = (a, b) => a + rnd() * (b - a);
  const c = document.createElement('canvas'); c.width = c.height = Math.ceil(SZ * S); const g = c.getContext('2d'); g.scale(S, S); g.translate(SZ / 2, SZ / 2);
  const n = ST.lowFx ? 22 : 44, pts = [];
  for (let i = 0; i < n; i++) { const a = rnd() * PTAU, d = Math.sqrt(rnd()); pts.push([Math.cos(a) * d * r * .95, Math.sin(a) * d * r * .5, r * R(.2, .38) * (1 - d * .35)]); }
  pts.sort((u, v) => u[1] - v[1]);                                     // top to bottom, so lower puffs overlap the upper ones
  for (const [x, y, pr] of pts) {
    g.save(); g.translate(x, y); g.scale(1, .8);
    const gr = g.createRadialGradient(-pr * .25, -pr * .3, pr * .1, 0, 0, pr);
    gr.addColorStop(0, rgb(mixc(p.c1, [255, 255, 255], .08), .55)); gr.addColorStop(.5, rgb(mixc(p.c1, p.c2, .55), .6)); gr.addColorStop(1, rgb(p.c2, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, pr, 0, PTAU); g.fill(); g.restore();
  }
  g.save(); g.scale(1, .5); let q = g.createRadialGradient(0, r * .6, r * .1, 0, r * .6, r * 1.1); q.addColorStop(0, 'rgba(20,2,10,.45)'); q.addColorStop(1, 'rgba(20,2,10,0)'); g.fillStyle = q; g.beginPath(); g.arc(0, r * .6, r * 1.1, 0, PTAU); g.fill(); g.restore();   // dark belly
  g.globalCompositeOperation = 'lighter'; g.save(); g.scale(1, .55);
  q = g.createRadialGradient(0, r * .5, 0, 0, r * .5, r * .95); q.addColorStop(0, 'rgba(255,60,70,.3)'); q.addColorStop(1, 'rgba(255,60,70,0)'); g.fillStyle = q; g.beginPath(); g.arc(0, r * .5, r * .95, 0, PTAU); g.fill(); g.restore();   // red underglow
  g.lineCap = 'round'; g.strokeStyle = 'rgba(255,150,175,.2)'; g.lineWidth = Math.max(1, r * .012);
  for (let i = 0; i < Math.min(14, pts.length); i++) { const [x, y, pr] = pts[i]; g.beginPath(); g.arc(x, y, pr * .85, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }   // lit crowns
  const pk = []; for (let i = 0; i < 3; i++) pk.push([R(-.45, .45) * r, R(-.15, .15) * r, r * R(.28, .4)]);
  return { storm: true, img: c, SZ, pk };
}
function drawStormCell(p, s, t, ga) {
  const rm = reduceMotion, sf = ST.stormFlash;
  ctx.globalAlpha = ga * .8; ctx.drawImage(s.img, -s.SZ / 2, -s.SZ / 2, s.SZ, s.SZ);
  if (rm && sf < .03) return;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ga;
  for (let i = 0; i < s.pk.length; i++) {                              // sheet lightning flickering inside the mass
    const q = s.pk[i], rr = q[2], v = Math.max(rm ? 0 : Math.pow(Math.max(0, Math.sin(t * (.55 + .21 * i) + p.ph * (i + 1) + i * 2)), 18) * .85, sf * .75);
    if (v < .04) continue;
    const gr = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], rr);
    gr.addColorStop(0, 'rgba(255,225,240,' + v * .5 + ')'); gr.addColorStop(.35, 'rgba(255,140,190,' + v * .28 + ')'); gr.addColorStop(1, 'rgba(255,90,140,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(q[0], q[1], rr, 0, PTAU); ctx.fill();
    if (v > .35 && !rm) {                                              // a thin pink-white vein
      let x = q[0], y = q[1]; const h = ((t * 12) | 0) * 7 + i;
      ctx.strokeStyle = 'rgba(255,232,246,' + Math.min(.85, v) + ')'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (fxRnd(h + k * 3) - .5) * rr * .8; y += fxRnd(h + k * 5 + 1) * rr * .5; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
function chunkSprite() {                                               // a rock fragment with a glowing hot edge, shared by every splitting world
  if (CHUNK) return CHUNK;
  const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d'); g.translate(24, 24);
  g.beginPath(); [[-16, -4], [-6, -15], [8, -13], [16, -2], [10, 12], [-4, 15], [-14, 8]].forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath();
  const gr = g.createRadialGradient(-5, -5, 2, 0, 0, 18); gr.addColorStop(0, 'rgba(96,30,28,1)'); gr.addColorStop(1, 'rgba(30,6,10,1)'); g.fillStyle = gr; g.fill();
  g.shadowColor = 'rgba(255,120,40,1)'; g.shadowBlur = 8; g.strokeStyle = 'rgba(255,150,70,.9)'; g.lineWidth = 1.6; g.stroke();
  return (CHUNK = c);
}
function drawWeather(p, s, t) {                                        // Crimson only: lightning inside tempest clouds and magma plumes, plus the soft shared flash
  const rm = reduceMotion, sf = ST.stormFlash, r = p.r, ty = p.type, hot = ty === 'tempest';
  if (sf < .03 && (rm || (!hot && !(ty === 'magma' && s.plA !== null)))) return;
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * .98, 0, PTAU); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
  if (sf > .03) { const gr = ctx.createRadialGradient(-r * .3, -r * .3, 0, -r * .3, -r * .3, r * 1.2); gr.addColorStop(0, 'rgba(' + p.atm + ',' + sf * .1 + ')'); gr.addColorStop(1, 'rgba(' + p.atm + ',0)'); ctx.fillStyle = gr; ctx.fillRect(-r, -r, r * 2, r * 2); }
  if (hot) {
    if (!p.pk) { const q = rng32(p.seed ^ 77); p.pk = [[.15 + q() * .4, .1 + q() * .45], [.05 + q() * .3, .35 + q() * .35]]; }   // pockets sit on the dark (lower right) side
    for (let i = 0; i < 2; i++) {
      const v = Math.max(rm ? 0 : Math.pow(Math.max(0, Math.sin(t * (.9 + .37 * i) + p.ph * (i + 2))), 24) * .7, sf * .8);
      if (v < .04) continue;
      const x = p.pk[i][0] * r, y = p.pk[i][1] * r, gr = ctx.createRadialGradient(x, y, 0, x, y, r * .3);
      gr.addColorStop(0, 'rgba(255,214,184,' + v * .5 + ')'); gr.addColorStop(.4, 'rgba(255,130,100,' + v * .22 + ')'); gr.addColorStop(1, 'rgba(255,100,80,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - r * .3, y - r * .3, r * .6, r * .6);
    }
  }
  ctx.restore();
  if (ty === 'magma' && s.plA !== null && !rm) {                       // a bolt running up the ash plume
    const v = Math.max(Math.pow(Math.max(0, Math.sin(t * 1.3 + p.ph * 3)), 30), sf * .8);
    if (v > .05) {
      const a = s.plA, h = ((t * 14) | 0) * 5; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const pts = []; for (let i = 0; i <= 6; i++) { const d = r * (.98 + i * .17), j = i ? (fxRnd(h + i * 3) - .5) * r * .14 : 0; pts.push([Math.cos(a) * d - Math.sin(a) * j, Math.sin(a) * d + Math.cos(a) * j]); }
      for (const [lw, col] of [[4, 'rgba(255,170,100,' + v * .3 + ')'], [1.3, 'rgba(255,246,228,' + Math.min(.9, v) + ')']]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
      ctx.restore();
    }
  }
}
function drawGlintRing(p, s, t, front, ga) {                           // Aurora glint-ring world: the crystal ring turns, sparkles, and is brighter where it crosses in front
  const rm = reduceMotion, r = p.r, GS = s.GS, spin = rm ? 0 : t * .15 + p.ph;
  ctx.save(); ctx.globalAlpha = ga * (front ? 1 : .7); ctx.rotate(p.tilt); ctx.scale(1, .3); ctx.beginPath(); ctx.rect(-GS, front ? 0 : -GS, GS * 2, GS); ctx.clip();
  ctx.rotate(spin); ctx.drawImage(s.gt, -GS / 2, -GS / 2, GS, GS); ctx.restore();
  if (rm) return;
  if (!p.gl) { p.gl = []; for (let i = 0, n = ST.lowFx ? 6 : 12; i < n; i++) p.gl.push({ a: Math.random() * 6.283, d: 1.45 + Math.random() * .7, ph: Math.random() * 6.28 }); }
  ctx.save(); ctx.rotate(p.tilt); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineWidth = 1;
  for (const q of p.gl) {
    const a = q.a + spin, sn = Math.sin(a); if ((sn > 0) !== front) continue;
    const tw = Math.pow(Math.max(0, Math.sin(t * 2.6 + q.ph)), 6); if (tw < .05) continue;
    const x = Math.cos(a) * q.d * r, y = sn * q.d * r * .3, L = 2 + tw * (r > 50 ? 5 : 4);
    ctx.strokeStyle = 'rgba(235,252,255,' + tw * .85 * ga + ')'; ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke();
  }
  ctx.restore();
}
function drawAuroraFx(p, s, t, ga) {                                   // Aurora only: the aurora storm, diamond-dust twinkles and prism flares
  const rm = reduceMotion, r = p.r, ty = p.type;
  if (s.aur) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ga * (rm ? .55 : .45 + .15 * Math.sin(t * .4 + p.ph)); ctx.rotate(rm ? 0 : t * .05 + p.ph); ctx.drawImage(s.aur, -s.AS / 2, -s.AS / 2, s.AS, s.AS); ctx.restore(); }
  if (rm) return;
  if (ty === 'frozen') {
    if (!p.dt) { p.dt = []; for (let i = 0, n = ST.lowFx ? 5 : 10; i < n; i++) { const a = Math.random() * 6.283, d = 1.12 + Math.random() * .6; p.dt.push({ x: Math.cos(a) * d * r, y: Math.sin(a) * d * r, ph: Math.random() * 6.28 }); } }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineWidth = 1;
    for (const q of p.dt) { const tw = Math.pow(Math.max(0, Math.sin(t * 2.2 + q.ph)), 8); if (tw < .05) continue; const L = 2 + tw * 4; ctx.strokeStyle = 'rgba(235,252,255,' + tw * .8 * ga + ')'; ctx.beginPath(); ctx.moveTo(q.x - L, q.y); ctx.lineTo(q.x + L, q.y); ctx.moveTo(q.x, q.y - L); ctx.lineTo(q.x, q.y + L); ctx.stroke(); }
    ctx.restore();
  }
  if (ty === 'crystal' && ST.uw[2] > .3) {                                // rare prism flare: a short rainbow streak as the world turns toward the light
    const f = (t * .07 + p.ph / 6.283) % 1;
    if (f < .06) {
      const k = Math.sin(f / .06 * Math.PI), x0 = -r * .62, y0 = -r * .62, x1 = x0 - r * 1.0, y1 = y0 - r * .8, gr = ctx.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, 'rgba(255,120,140,0)'); gr.addColorStop(.25, 'rgba(255,205,120,' + k * .6 + ')'); gr.addColorStop(.5, 'rgba(150,255,200,' + k * .6 + ')'); gr.addColorStop(.75, 'rgba(120,200,255,' + k * .6 + ')'); gr.addColorStop(1, 'rgba(190,150,255,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = gr; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      const gl = ctx.createRadialGradient(x0, y0, 0, x0, y0, r * .3); gl.addColorStop(0, 'rgba(255,255,255,' + k * .35 + ')'); gl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x0, y0, r * .3, 0, PTAU); ctx.fill(); ctx.restore();
    }
  }
}
export function drawPlanetBody(p, t) {
  if (!p.spr) { if (ST.sprBudget <= 0) return; ST.sprBudget--; p.spr = buildPlanet(p); }
  const s = p.spr, r = p.r, ga = ctx.globalAlpha, dim = ga, rm = reduceMotion;
  ctx.save(); ctx.translate(p.x, p.y);
  if (s.storm) { drawStormCell(p, s, t, ga); ctx.restore(); return; }
  ctx.globalAlpha = dim;
  const off = ((p.o * s.P + (rm ? 0 : t * s.spd)) % s.P) * s.S;
  if (s.rb) ctx.drawImage(s.rb, -s.RS / 2, -s.RS / 2, s.RS, s.RS);
  if (s.gt) drawGlintRing(p, s, t, false, ga);
  const body = () => {
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, PTAU); ctx.clip();
    ctx.drawImage(s.tex, off, 0, r * 2 * s.S, r * 2 * s.S, -r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.drawImage(s.ov, -s.OS / 2, -s.OS / 2, s.OS, s.OS);
    if (s.emi) {                                                       // glowing cracks / crevices: additive, gently pulsing, capped so they never outshine hazards
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * .99, 0, PTAU); ctx.clip();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = dim * (rm || ST.lowFx ? .62 : .52 + .22 * Math.sin(t * 2 + p.ph));
      ctx.drawImage(s.emi, off, 0, r * 2 * s.S, r * 2 * s.S, -r, -r, r * 2, r * 2);
      ctx.restore();
    }
  };
  if (s.seam) {                                                        // splitting world: two halves drift apart along the rift, hot break line between them, chunks escaping
    const gap = r * (.06 + (rm ? 0 : .02 * Math.sin(t * .3 + p.ph)));
    for (const sg of SIDES) { ctx.save(); ctx.rotate(p.sa); ctx.translate(0, sg * gap); ctx.beginPath(); ctx.rect(-r * 3, sg < 0 ? -r * 3 : 0, r * 6, r * 3); ctx.clip(); ctx.rotate(-p.sa); body(); ctx.restore(); }
    ctx.save(); ctx.rotate(p.sa);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ga * (rm ? .8 : .7 + .2 * Math.sin(t * 1.7 + p.ph)); ctx.drawImage(s.seam, -s.SW / 2, -s.SH / 2, s.SW, s.SH);
    ctx.globalCompositeOperation = 'source-over'; const ck = chunkSprite();
    for (const c of p.chunks) {
      const f = rm ? c.n * .6 : (t * .035 + c.n) % 1, cs = c.s;
      ctx.globalAlpha = ga * Math.min(1, f * 6) * (1 - f) * .9; ctx.save(); ctx.translate(c.u * r * (1 + f * .4), c.dir * (gap + f * r * 1.15)); ctx.rotate(c.rot + f * 2 * c.dir); ctx.drawImage(ck, -cs, -cs, cs * 2, cs * 2); ctx.restore();
    }
    ctx.restore();
  } else body();
  ctx.globalAlpha = dim;
  if (s.rf) ctx.drawImage(s.rf, -s.RS / 2, -s.RS / 2, s.RS, s.RS);
  if (s.gt) drawGlintRing(p, s, t, true, ga);
  ctx.globalAlpha = ga; drawAuroraFx(p, s, t, ga); drawWeather(p, s, t);
  ctx.restore();
}
