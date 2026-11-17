import { ST } from '../state.js';
import { ctx, reduceMotion } from '../config.js';
import { nmc } from '../spawn.js';
import { glow } from '../render/glow.js';
import { drawSentinel } from './sentinel.js';
import { drawColossus } from './colossus.js';
import { OV_COL } from '../stages/overflow.js';
import { nmRnd } from '../stages/neon.js';
import { SIDES } from '../core.js';

// ====== v56: every boss has its own armor plates, health bar and hit effects ======
// Kinds: eye (Void Eye, moon-silver crescents), jelly (Spore Mother, spore pods), prism (Prism Sentinel, ice crystals),
// storm (Storm Titan, riveted iron arcs), sentinel (Neon Sentinel, holo panels), colossus (Seam Colossus, strata slabs)
export const BFP = {
  eye:      { a: ['#F4EEFF', '#C9BCFF', '#A99AE8'], h: ['#FF4D6D', '#C040A0', '#FFD6E0'], ring: 'rgba(201,188,255,.9)', flash: 'rgba(201,168,255,1)' },
  jelly:    { a: ['#D6FF8A', '#B6FF9A', '#FFFFFF'], h: ['#FF8AD8', '#E0509A', '#FFB3EA'], ring: 'rgba(214,255,140,.9)', flash: 'rgba(255,140,220,1)' },
  prism:    { a: ['#E6FBFF', '#9FE6FF', '#FFFFFF'], h: ['#FF9AE8', '#9AFFE0', '#9AD0FF', '#FFF59A'], ring: 'rgba(150,235,255,.9)', flash: 'rgba(150,240,255,1)' },
  storm:    { a: ['#C8D0FF', '#8E86B8', '#FFFFFF'], h: ['#FF6B8A', '#FFD0E6', '#FF4A3D'], ring: 'rgba(200,208,255,.9)', flash: 'rgba(255,90,140,1)' },
  sentinel: { a: ['#7DF9FF', '#FFFFFF', '#B967FF'], h: ['#FF71CE', '#7DF9FF', '#FFFFFF'], ring: 'rgba(125,249,255,.9)', flash: 'rgba(125,249,255,1)' },
  colossus: { a: ['#9AA0A8', '#6E747C', '#C9CED4'], h: ['#C8A03C', '#78923A', '#FF8A3D', '#3B8D88'], ring: 'rgba(205,210,214,.9)', flash: 'rgba(255,150,60,1)' }
};
function bfxAdd(p) { if (ST.bfx.length >= (ST.lowFx ? 40 : 80)) return; p.va = p.va || 0; p.a = p.a || 0; ST.bfx.push(p); }
export function stepBossFx(dt) {
  let w = 0;
  for (let i = 0, n = ST.bfx.length; i < n; i++) {
    const p = ST.bfx[i]; p.life -= dt; if (p.life <= 0) continue;
    p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += p.g * dt; p.a += p.va * dt;
    ST.bfx[w++] = p;
  }
  ST.bfx.length = w;
}
function boltArc(x, y, armored) {
  const ang = -Math.PI / 2 + (Math.random() - .5) * 2.2, pts = []; let px = 0, py = 0;
  for (let i = 0; i < 5; i++) { const l = 8 + Math.random() * 7, aa = ang + (Math.random() - .5) * .9; px += Math.cos(aa) * l; py += Math.sin(aa) * l; pts.push(px, py); }
  return { k: 'arc', x, y, vx: 0, vy: 0, life: .17, max: .17, pts, c: armored ? '#C8D0FF' : '#FF9FC0' };
}
function crackPts() {
  const pts = []; let px = 0, py = 0;
  for (let i = 0; i < 5; i++) { px += (Math.random() - .5) * 10; py += 6 + Math.random() * 5; pts.push(px, py); }
  return pts;
}
export function bfxPiece(K, armored, x, y, ang, sp) {        // one fragment of the boss' own material
  const rnd = (a, b) => a + Math.random() * (b - a), P = BFP[K], pal = armored ? P.a : P.h, c = pal[(Math.random() * pal.length) | 0];
  const base = { x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, a: rnd(0, 6.283), va: rnd(-8, 8), c };
  switch (K) {
    case 'eye': bfxAdd(Object.assign(base, { k: 'crs', life: .55, max: .55, s: rnd(4, 7), g: 60 })); break;
    case 'jelly': bfxAdd(armored ? Object.assign(base, { k: 'drop', ring: true, g: -40, life: .7, max: .7, s: rnd(3, 6) }) : Object.assign(base, { k: 'drop', g: 300, life: .6, max: .6, s: rnd(2.2, 4.2) })); break;
    case 'prism': bfxAdd(Object.assign(base, { k: 'tri', life: .55, max: .55, s: rnd(3.5, 7), g: 220 })); break;
    case 'storm': bfxAdd(Object.assign(base, { k: 'spark', life: .22, max: .22 })); break;
    case 'sentinel': bfxAdd(Object.assign(base, { k: 'pix', life: .45, max: .45, s: [3, 4, 5, 6][(Math.random() * 4) | 0] })); break;
    default: bfxAdd(Object.assign(base, { k: 'chip', life: .7, max: .7, s: rnd(3.5, 7), g: 760 }));
  }
}
export function bfxExtra(K, x, y, z) {                       // the signature flourish of each boss
  const P = BFP[K], ex = o => bfxAdd(Object.assign({ x, y, vx: 0, vy: 0, a: 0, va: 0 }, o));
  switch (K) {
    case 'eye': ex({ k: 'star', life: .3, max: .3, s: 16 * z, c: '#F4EEFF' }); ex({ k: 'rip', life: .45, max: .45, s: 6, v: 150 * z, ry: .55, c: P.a[1], w: 2.5 }); break;
    case 'jelly': ex({ k: 'rip', life: .5, max: .5, s: 6, v: 120 * z, ry: .5, c: '#FF8AD8', w: 3 }); ex({ k: 'rip', life: .4, max: .4, s: 4, v: 80 * z, ry: .5, c: '#D6FF8A', w: 1.5 }); break;
    case 'prism': ex({ k: 'star', life: .35, max: .35, s: 20 * z, c: '#FFFFFF' }); ex({ k: 'star', life: .28, max: .28, s: 12 * z, c: '#9AE8FF' }); break;
    case 'storm': for (let i = 0; i < 2 * z; i++) bfxAdd(boltArc(x, y, true)); break;
    case 'sentinel': for (let i = 0; i < z + 1; i++) ex({ k: 'slice', x: x + (Math.random() - .5) * 20, y: y + (Math.random() - .5) * 30, life: .16, max: .16, w: 50 + Math.random() * 60, h: 3 + Math.random() * 5, c: i % 2 ? 'rgba(255,60,200,.8)' : 'rgba(5,217,232,.8)', c2: i % 2 ? 'rgba(5,217,232,.6)' : 'rgba(255,60,200,.6)' }); break;
    default: ex({ k: 'dust', life: .6, max: .6, s: 8, v: 50 * z, vy: -20 }); ex({ k: 'dust', life: .5, max: .5, s: 6, v: 40 * z, vx: 28, vy: -14 });
  }
}
export function bossHitFx(x, y, armored, big) {              // per-hit impact: armor and flesh throw different fragments
  const b = ST.boss; if (!b) return;
  const K = b.kind, rm = reduceMotion, h = ST.bossHits, P = BFP[K], pc = armored ? P.a : P.h, n = rm ? 1 : big ? 4 : 2;
  for (let i = 0; i < n; i++) bfxPiece(K, armored, x, y, -Math.PI / 2 + (Math.random() - .5) * 2.6, 80 + Math.random() * 150);
  const ex = o => bfxAdd(Object.assign({ x, y, vx: 0, vy: 0, a: 0, va: 0 }, o));
  switch (K) {
    case 'eye': ex({ k: 'star', life: .2, max: .2, s: big ? 16 : 10, c: pc[0] }); if (!rm && h % 2 === 0) ex({ k: 'rip', life: .32, max: .32, s: 4, v: 120, ry: .55, c: pc[1], w: 2 }); break;
    case 'jelly': if (!rm && h % 2 === 0) ex({ k: 'rip', life: .36, max: .36, s: 4, v: 100, ry: .5, c: pc[0], w: 2.5 }); break;
    case 'prism': ex({ k: 'star', life: .18, max: .18, s: big ? 18 : 12, c: armored ? '#FFFFFF' : pc[h % pc.length] }); break;
    case 'storm': bfxAdd(boltArc(x, y, armored)); if (!rm && (big || h % 3 === 0)) bfxAdd(boltArc(x, y, armored)); break;
    case 'sentinel': if (!rm && h % 2 === 0) ex({ k: 'slice', y: y + (Math.random() - .5) * 16, life: .14, max: .14, w: 40 + Math.random() * 60, h: 3 + Math.random() * 4, c: 'rgba(5,217,232,.8)', c2: 'rgba(255,60,200,.65)' }); break;
    default: if (!rm && h % 2 === 0) ex({ k: 'dust', life: .45, max: .45, s: 5, v: 45, vy: -22 }); if (!rm && h % 3 === 0) ex({ k: 'crack', life: .35, max: .35, pts: crackPts() });
  }
}
export function armorWatch(b) {                              // a plate falls off each time the armor passes a sixth
  const n = Math.ceil(Math.max(0, b.armor) / b.armorMax * 6);
  if (b.aN == null || n > b.aN) { b.aN = n; return; }
  while (b.aN > n) { b.aN--; plateFx(b, b.aN); }
}
function plateFx(b, k) {
  const P = plateT(b, k, b.lt || 0), wx = b.x + P.x, wy = b.y + P.y, out = Math.atan2(P.y, P.x), n = reduceMotion ? 2 : 6;
  for (let i = 0; i < n; i++) bfxPiece(b.kind, true, wx, wy, out + (Math.random() - .5) * 1.6, 120 + Math.random() * 160);
  bfxExtra(b.kind, wx, wy, 1);
}
const BFX_ADD = { crs: 1, star: 1, rip: 1, drop: 1, tri: 1, arc: 1, spark: 1, pix: 1, slice: 1, crack: 1 };
function star4(x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.closePath(); ctx.fill();
}
export function drawBossFx(t) {
  if (!ST.bfx.length) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'source-over'; let add = false;
  for (const p of ST.bfx) {
    const u = p.life / p.max, ad = !!BFX_ADD[p.k];
    if (ad !== add) { add = ad; ctx.globalCompositeOperation = add ? 'lighter' : 'source-over'; }
    ctx.globalAlpha = Math.min(1, u * 1.6);
    switch (p.k) {
      case 'crs': {                                   // Void Eye: drifting moon crescents
        const s = p.s; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(0, 0, s, -1.2, 1.2); ctx.arc(-s * .7, 0, s * 1.41, .72, -.72, true); ctx.closePath(); ctx.fill(); ctx.restore(); break;
      }
      case 'star': ctx.fillStyle = p.c; star4(p.x, p.y, p.s * (.4 + .6 * u)); break;
      case 'rip': ctx.strokeStyle = p.c; ctx.lineWidth = p.w || 2; ctx.beginPath(); { const r = p.s + (p.max - p.life) * p.v; ctx.ellipse(p.x, p.y, r, r * (p.ry || 1), 0, 0, 6.283); } ctx.stroke(); break;
      case 'drop':                                    // Spore Mother: bubbles rise, goo falls
        if (p.ring) { ctx.strokeStyle = p.c; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.283); ctx.stroke(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(p.x - p.s * .35, p.y - p.s * .35, p.s * .22, 0, 6.283); ctx.fill(); }
        else { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (.6 + .4 * u), 0, 6.283); ctx.fill(); }
        break;
      case 'tri': {                                   // Prism Sentinel: ice and refracted colour
        const s = p.s; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * .7, s * .6); ctx.lineTo(-s * .7, s * .6); ctx.closePath(); ctx.fill(); ctx.restore(); break;
      }
      case 'arc':                                     // Storm Titan: a short jagged bolt
        ctx.strokeStyle = p.c; ctx.globalAlpha = Math.min(1, u * 1.6) * .45; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(p.x, p.y);
        for (let j = 0; j < p.pts.length; j += 2) ctx.lineTo(p.x + p.pts[j], p.y + p.pts[j + 1]);
        ctx.stroke(); ctx.globalAlpha = Math.min(1, u * 1.6); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.stroke(); break;
      case 'spark': ctx.strokeStyle = p.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .05, p.y - p.vy * .05); ctx.stroke(); break;
      case 'pix':                                     // Neon Sentinel: square pixels that blink out
        if (u < .35 && Math.sin(t * 80 + p.x) > .4) break;
        ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); break;
      case 'slice': ctx.fillStyle = p.c; ctx.fillRect(p.x - p.w / 2, p.y, p.w, p.h); ctx.fillStyle = p.c2; ctx.fillRect(p.x - p.w / 2 + 4, p.y + 1, p.w, p.h); break;
      case 'chip':                                    // Seam Colossus: rock chips
        ctx.globalAlpha = u > .3 ? 1 : u / .3; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s * .35, p.s, p.s * .7); ctx.restore(); break;
      case 'dust': ctx.globalAlpha = u * .5; ctx.fillStyle = 'rgba(196,186,140,.5)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s + (p.max - p.life) * p.v, 0, 6.283); ctx.fill(); break;
      case 'crack':
        ctx.strokeStyle = 'rgba(255,98,40,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y);
        for (let j = 0; j < p.pts.length; j += 2) ctx.lineTo(p.x + p.pts[j], p.y + p.pts[j + 1]);
        ctx.stroke(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.stroke(); break;
    }
  }
  ctx.restore();
}

// ---- armor plates: six per phase, each boss wears its own
function plateT(b, k, t) {                            // plate k's position (relative to the boss) and facing
  const r = b.r, K = b.kind, rm = reduceMotion;
  if (K === 'colossus') {
    const hw = b.hw || r * 2, hh = r * .82, row = k < 3 ? -1 : 1, i = k % 3;
    return { x: (i - 1) * hw * .62, y: row * (hh + 21) + (rm ? 0 : Math.sin(t * 1.5 + k * 1.3) * 2.5), a: (i - 1) * .06 * row };
  }
  const R = r * (K === 'eye' ? 1.6 : K === 'jelly' ? 1.5 : K === 'prism' ? 1.5 : K === 'storm' ? 1.65 : 1.72);
  let rot = 0;
  if (!rm) {
    if (K === 'eye') rot = -t * .25; else if (K === 'jelly') rot = t * .22; else if (K === 'prism') rot = t * .35; else if (K === 'storm') rot = t * .3;
    else { const s = t * 1.1, st = Math.floor(s), e = Math.min(1, (s - st) * 4); rot = (st + e * e * (3 - 2 * e)) * Math.PI / 3; }      // the holo panels turn in snapping steps
  }
  const a = k * Math.PI / 3 + rot;
  return { x: Math.cos(a) * R, y: Math.sin(a) * R * (K === 'jelly' ? .9 : 1), a };
}
function drawPlate(b, k, t, fl) {
  const P = plateT(b, k, t), r = b.r, K = b.kind, ph = b.phase, rm = reduceMotion;
  ctx.save(); ctx.translate(P.x, P.y);
  if (fl) glow(0, 0, r * .55, BFP[K].flash, .7);
  if (K === 'eye') {                                  // moon-silver crescent shell with a glint on its tip
    ctx.rotate(P.a); const L = r * .55, th = r * .32;
    ctx.beginPath(); ctx.moveTo(-th * .25, -L); ctx.quadraticCurveTo(th * 1.9, 0, -th * .25, L); ctx.quadraticCurveTo(th * .3, 0, -th * .25, -L); ctx.closePath();
    ctx.fillStyle = fl ? '#FFFFFF' : ['#B9ABE8', '#E4A8E0', '#F2D88A'][ph]; ctx.fill();
    ctx.strokeStyle = 'rgba(244,238,255,.9)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; star4(th * .8, 0, 3 + (rm ? 0 : Math.sin(t * 5 + k) * 1.2));
  } else if (K === 'jelly') {                         // translucent spore pod with a glowing nucleus
    const pr = r * .2 * (1 + (rm ? 0 : Math.sin(t * 3 + k * 1.1) * .08));
    glow(0, 0, pr * 2.3, 'rgba(214,255,140,1)', .28);
    ctx.fillStyle = fl ? 'rgba(255,255,255,.9)' : 'rgba(255,170,230,.3)'; ctx.beginPath(); ctx.arc(0, 0, pr, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(255,205,242,.92)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(214,255,140,.95)'; ctx.beginPath(); ctx.arc(0, 0, pr * .42, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(-pr * .38, -pr * .4, pr * .2, 0, 6.283); ctx.fill();
  } else if (K === 'prism') {                         // faceted ice crystal pointing outward
    ctx.rotate(P.a); const L = r * .52, w = r * .17;
    ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(L * .2, -w); ctx.lineTo(-L * .45, -w * .6); ctx.lineTo(-L * .45, w * .6); ctx.lineTo(L * .2, w); ctx.closePath();
    ctx.fillStyle = fl ? '#FFFFFF' : ['#7FD6F2', '#6EE0C8', '#B79CFF'][ph]; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(L * .2, -w); ctx.lineTo(-L * .45, -w * .6); ctx.lineTo(-L * .45, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(235,252,255,.92)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(L * .2, -w); ctx.lineTo(-L * .45, -w * .6); ctx.lineTo(-L * .45, w * .6); ctx.lineTo(L * .2, w); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(-L * .45, 0); ctx.stroke();
  } else if (K === 'storm') {                         // riveted iron arc with hot rivets
    ctx.rotate(P.a); const L = r * .55, d = L * L / (2 * r * 1.65);
    const path = () => { ctx.beginPath(); ctx.moveTo(-d, -L); ctx.quadraticCurveTo(d, 0, -d, L); };
    ctx.lineCap = 'round'; path(); ctx.strokeStyle = fl ? '#FFFFFF' : '#241B3A'; ctx.lineWidth = 9; ctx.stroke();
    path(); ctx.strokeStyle = fl ? '#FFE0E8' : '#4A3F72'; ctx.lineWidth = 5.5; ctx.stroke();
    ctx.save(); ctx.translate(2.6, 0); path(); ctx.strokeStyle = 'rgba(190,180,255,.8)'; ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore();
    for (const s of SIDES) { glow(0, s * L * .6, 6, 'rgba(255,90,120,1)', .6); ctx.fillStyle = '#FF6B8A'; ctx.beginPath(); ctx.arc(0, s * L * .6, 1.8, 0, 6.283); ctx.fill(); }
    ctx.lineCap = 'butt';
  } else if (K === 'sentinel') {                      // holographic hex panel, flickers and tears when hit
    const hr = r * .3, col = ['#7DF9FF', '#FFD166', '#FF4D6D'][ph];
    const hex = (R, ox) => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; i ? ctx.lineTo(ox + Math.cos(a) * R, Math.sin(a) * R) : ctx.moveTo(ox + Math.cos(a) * R, Math.sin(a) * R); } ctx.closePath(); };
    const off = !rm && nmRnd(k * 3.3 + Math.floor(t * 10)) > .92;
    if (off) ctx.globalAlpha = .3;
    if (fl) { ctx.globalCompositeOperation = 'lighter'; hex(hr, -3); ctx.strokeStyle = 'rgba(5,217,232,.8)'; ctx.lineWidth = 1.8; ctx.stroke(); hex(hr, 3); ctx.strokeStyle = 'rgba(255,60,200,.8)'; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
    hex(hr, 0); ctx.fillStyle = fl ? 'rgba(255,255,255,.5)' : 'rgba(125,249,255,.14)'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.stroke();
    hex(hr * .55, 0); ctx.globalAlpha *= .5; ctx.stroke(); ctx.globalAlpha = off ? .3 : 1;
    ctx.fillStyle = '#FF71CE'; ctx.fillRect(hr * Math.cos(Math.PI / 6) - 1.5, hr * Math.sin(Math.PI / 6) - 1.5, 3, 3); ctx.fillStyle = '#7DF9FF'; ctx.fillRect(-hr * Math.cos(Math.PI / 6) - 1.5, -hr * Math.sin(Math.PI / 6) - 1.5, 3, 3);
  } else {                                            // Seam Colossus: strata stone slab
    ctx.rotate(P.a); const w = Math.min((b.hw || r * 2) * .3, 60), h = 17;
    for (let j = 0; j < 3; j++) { ctx.fillStyle = fl ? '#FFE2B0' : OV_COL[(k + j) % 5]; ctx.fillRect(-w / 2, -h / 2 + j * h / 3, w, h / 3 + .5); }
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-w / 2, -h / 2, w, 1.6);
    ctx.fillStyle = 'rgba(6,10,6,.45)'; ctx.fillRect(-w / 2, h / 2 - 4, w, 4);
    ctx.strokeStyle = 'rgba(10,10,10,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-w * .1, -h / 2); ctx.lineTo(w * .02, -h * .1); ctx.lineTo(-w * .06, h * .15); ctx.lineTo(w * .08, h / 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,190,130,.9)'; ctx.lineWidth = 1.4; ctx.strokeRect(-w / 2, -h / 2, w, h);
  }
  ctx.restore();
}
function drawBossArmor(b, t) {
  const n = Math.ceil(b.armor / b.armorMax * 6), fl = b.aFlash > 0;
  for (let k = 0; k < n; k++) drawPlate(b, k, t, fl);
  if (b.kind === 'storm' && !reduceMotion) {          // electricity jumps between neighbouring plates
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % 6; if (j >= n) continue;
      const fl2 = Math.max(0, Math.sin(t * 7 + k * 2) * Math.sin(t * 3.1 + k)); if (fl2 < .25) continue;
      const A = plateT(b, k, t), B = plateT(b, j, t), sd = Math.floor(t * 14);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,170,205,' + (.3 + .5 * fl2) + ')'; ctx.lineWidth = 1.6; ctx.beginPath();
      ctx.moveTo(A.x + (B.x - A.x) * .3, A.y + (B.y - A.y) * .3);
      for (let s = 1; s <= 3; s++) { const u = .3 + s * .13; ctx.lineTo(A.x + (B.x - A.x) * u + (nmRnd(k * 9.1 + s + sd) - .5) * 8, A.y + (B.y - A.y) * u + (nmRnd(k * 5.3 + s * 2 + sd) - .5) * 8); }
      ctx.stroke(); ctx.restore();
    }
  }
}

// ---- health bars: one design per boss (15 cells in three phase groups, armor row under the live group)
const BBS = {
  eye:      { font: '700 15px MothDisplay, serif', ls: '1px', name: '#D9C8FF', glow: 'rgba(160,120,255,.8)', pc: ['#C9A8FF', '#EBA8E0', '#FFE08A'], ac: '#E4EAFF' },
  jelly:    { font: '700 15px MothReef, sans-serif', ls: '0px', name: '#FFB3EA', glow: 'rgba(255,110,210,.8)', pc: ['#FF6ED2', '#FF7896', '#FF965A'], rgb: ['255,110,210', '255,120,150', '255,150,100'], ac: '#D6FF8A' },
  prism:    { font: '600 15px MothIce, sans-serif', ls: '1.5px', name: '#BFF3FF', glow: 'rgba(120,220,255,.8)', pc: ['#7FE8FF', '#7FFFD8', '#C9A8FF'], ac: '#BFF3FF' },
  storm:    { font: '400 20px MothStorm, sans-serif', ls: '1px', name: '#FF9FB4', glow: 'rgba(255,60,90,.9)', pc: ['#FF7A9C', '#FF5040', '#FFD166'], ac: '#A9A2D4' },
  sentinel: { font: '400 20px MothPixel, monospace', ls: '0px', name: '#7DF9FF', glow: 'rgba(255,60,200,.8)', pc: ['#7DF9FF', '#FFD166', '#FF4D6D'], ac: '#B967FF' },
  colossus: { font: '400 11px MothOverflow, sans-serif', ls: '2px', name: '#DDE98A', glow: 'rgba(255,98,40,.8)', pc: ['#C8A03C', '#E0902F', '#FF6228'], ac: '#9AA0A8' }
};
export function drawBossBar(b, bx, by, bw, bt, noText) {
  const K = b.kind, S = BBS[K] || BBS.eye, ph = b.phase, rm = reduceMotion, gg = 14, cells = 15, unit = (bw - gg * 2) / cells, cw = unit - 2;
  const gx = i => bx + i * unit + Math.floor(i / 5) * gg, f = Math.max(0, b.hp / b.max) * cells, hf = b.flashT > 0, ei = Math.min(cells - 1, Math.floor(f)), cx0 = bx + bw / 2;
  const mid = k => (gx(k * 5 - 1) + cw + gx(k * 5)) / 2, fr0 = i => Math.max(0, Math.min(1, f - i)), lit = i => hf && i === ei;
  ctx.save(); ctx.textAlign = 'center';
  // name
  ctx.font = S.font; if ('letterSpacing' in ctx) ctx.letterSpacing = S.ls; ctx.fillStyle = nmc(S.name); ctx.shadowColor = S.glow; ctx.shadowBlur = 8;
  if (K === 'sentinel') { const txt = '> ' + b.name.toUpperCase(), wd = ctx.measureText(txt).width; ctx.textAlign = 'left'; ctx.fillText(txt, cx0 - wd / 2 - 4, by - 8); if (Math.floor(bt * 2) % 2) ctx.fillText('_', cx0 + wd / 2 - 2, by - 8); ctx.textAlign = 'center'; }
  else ctx.fillText(b.name.toUpperCase(), cx0, by - 8);
  ctx.shadowBlur = 0; if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  if (K === 'eye') {                                  // moon phases: each cell a moon that wanes
    const rr = Math.min(6.5, cw / 2), cy = by + 4;
    ctx.strokeStyle = 'rgba(201,168,255,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx - 4, cy); ctx.lineTo(bx + bw + 4, cy); ctx.stroke();
    for (let i = 0; i < cells; i++) {
      const x = gx(i) + cw / 2, fr = fr0(i);
      ctx.fillStyle = 'rgba(24,10,44,.9)'; ctx.beginPath(); ctx.arc(x, cy, rr, 0, 6.283); ctx.fill(); ctx.strokeStyle = 'rgba(201,168,255,.38)'; ctx.stroke();
      if (fr > 0) {
        ctx.save(); ctx.beginPath(); ctx.arc(x, cy, rr, 0, 6.283); ctx.clip();
        ctx.fillStyle = lit(i) ? '#FFFFFF' : S.pc[ph]; ctx.fillRect(x - rr, cy - rr, rr * 2, rr * 2);
        if (fr < 1) { ctx.fillStyle = 'rgba(24,10,44,.97)'; ctx.beginPath(); ctx.arc(x + rr * 2 * fr, cy, rr, 0, 6.283); ctx.fill(); }
        ctx.restore();
      }
      if (i === ei && f > 0) glow(x, cy, rr * 2.3, 'rgba(201,168,255,1)', .35);
    }
    ctx.fillStyle = 'rgba(244,238,255,.85)'; for (let k = 1; k <= 2; k++) star4(mid(k), cy, 4);
  } else if (K === 'jelly') {                         // bubbles that shrink and pop
    const rr = Math.min(6.8, cw / 2 + .4), cy = by + 4;
    for (let i = 0; i < cells; i++) {
      const x = gx(i) + cw / 2, fr = fr0(i);
      ctx.strokeStyle = 'rgba(255,160,220,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, cy, rr * .8, 0, 6.283); ctx.stroke();
      if (fr > 0) {
        const r2 = rr * (.5 + .5 * fr), yy = cy + (rm ? 0 : Math.sin(bt * 3 + i * .8) * 1 * (i === ei ? 2 : 1));
        ctx.fillStyle = lit(i) ? 'rgba(255,255,255,.92)' : 'rgba(' + S.rgb[ph] + ',.5)'; ctx.beginPath(); ctx.arc(x, yy, r2, 0, 6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(255,230,248,.85)'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(x - r2 * .35, yy - r2 * .35, r2 * .22, 0, 6.283); ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(255,150,220,.38)'; ctx.lineWidth = 1.2;
    for (let g = 0; g < 3; g++) { const x0 = gx(g * 5), x1 = gx(g * 5 + 4) + cw; ctx.beginPath(); ctx.moveTo(x0, by + 12); for (let x = x0 + 4; x <= x1; x += 4) ctx.lineTo(x, by + 12 + Math.sin(x * .35 + bt * 2.5) * 1.6); ctx.stroke(); }
  } else if (K === 'prism') {                         // cut gems with a shine that sweeps along the bar
    const cy = by + 4, hw2 = cw / 2 + .5, hh2 = 6.5, shX = bx + ((bt * 90) % (bw + 60)) - 30;
    const dm = x => { ctx.beginPath(); ctx.moveTo(x, cy - hh2); ctx.lineTo(x + hw2, cy); ctx.lineTo(x, cy + hh2); ctx.lineTo(x - hw2, cy); ctx.closePath(); };
    for (let i = 0; i < cells; i++) {
      const x = gx(i) + cw / 2, fr = fr0(i);
      dm(x); ctx.fillStyle = 'rgba(10,30,50,.65)'; ctx.fill(); ctx.strokeStyle = 'rgba(150,235,255,.3)'; ctx.lineWidth = 1; ctx.stroke();
      if (fr > 0) {
        ctx.save(); dm(x); ctx.clip(); ctx.fillStyle = lit(i) ? '#FFFFFF' : S.pc[ph]; ctx.fillRect(x - hw2, cy - hh2, hw2 * 2 * fr, hh2 * 2);
        ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.moveTo(x - hw2, cy); ctx.lineTo(x, cy - hh2); ctx.lineTo(x, cy); ctx.closePath(); ctx.fill();
        const sh = Math.max(0, 1 - Math.abs(x - shX) / 16); if (sh > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (sh * .6) + ')'; ctx.fillRect(x - hw2, cy - hh2, hw2 * 2, hh2 * 2); }
        ctx.restore(); dm(x); ctx.strokeStyle = 'rgba(225,250,255,.75)'; ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(190,245,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by + 12); ctx.lineTo(bx + bw, by + 12); ctx.stroke();
    ctx.fillStyle = 'rgba(225,250,255,.85)'; for (let k = 1; k <= 2; k++) { const x = mid(k); ctx.beginPath(); ctx.moveTo(x, cy - 4); ctx.lineTo(x + 3, cy); ctx.lineTo(x, cy + 4); ctx.lineTo(x - 3, cy); ctx.closePath(); ctx.fill(); }
  } else if (K === 'storm') {                         // slanted bolt cells in a riveted iron frame
    const h = 10, y0 = by - 1, sl = 4, low = b.hp / b.max < .15, fa = low && !rm ? (Math.sin(bt * 40) > .3 ? 1 : .55) : 1;
    ctx.fillStyle = 'rgba(16,8,28,.9)'; ctx.fillRect(bx - 5, y0 - 3, bw + 10, h + 6); ctx.strokeStyle = 'rgba(138,127,184,.7)'; ctx.lineWidth = 1.4; ctx.strokeRect(bx - 5, y0 - 3, bw + 10, h + 6);
    ctx.fillStyle = '#8A7FB8'; for (const [rx, ry] of [[bx - 2, y0], [bx + bw + 2, y0], [bx - 2, y0 + h], [bx + bw + 2, y0 + h]]) { ctx.beginPath(); ctx.arc(rx, ry, 1.5, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = fa;
    for (let i = 0; i < cells; i++) {
      const x = gx(i), fr = fr0(i), cell = (w) => { ctx.beginPath(); ctx.moveTo(x + sl, y0); ctx.lineTo(x + w + sl, y0); ctx.lineTo(x + w, y0 + h); ctx.lineTo(x, y0 + h); ctx.closePath(); ctx.fill(); };
      ctx.fillStyle = 'rgba(255,255,255,.08)'; cell(cw);
      if (fr > 0) {
        ctx.fillStyle = lit(i) ? '#FFFFFF' : S.pc[ph]; cell(cw * fr);
        if (fr < 1 && !rm) { const sd = Math.floor(bt * 16), ex = x + cw * fr; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ex + sl, y0); for (let s = 1; s <= 3; s++) ctx.lineTo(ex + sl - s * sl / 3 + (nmRnd(i * 7 + s + sd) - .5) * 4, y0 + s * h / 3); ctx.stroke(); }
      }
    }
    ctx.globalAlpha = 1;
    for (let k = 1; k <= 2; k++) { const x = mid(k); ctx.fillStyle = '#2B2540'; ctx.fillRect(x - 2, y0 - 5, 4, h + 10); glow(x, y0 + h / 2, 8, 'rgba(255,90,120,1)', .5); ctx.fillStyle = '#FF6B8A'; ctx.beginPath(); ctx.arc(x, y0 + h / 2, 1.5, 0, 6.283); ctx.fill(); }
    if (!rm && Math.sin(bt * 3.1) * Math.sin(bt * 7) > .55) { const sx = bx + nmRnd(Math.floor(bt * 9)) * bw; ctx.strokeStyle = 'rgba(255,208,230,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx, y0 - 3); ctx.lineTo(sx + 4, y0 - 7); ctx.lineTo(sx - 1, y0 - 10); ctx.lineTo(sx + 5, y0 - 14); ctx.stroke(); }
  } else if (K === 'sentinel') {                      // terminal readout: pixel cells, scanlines, chromatic split on hits
    const s = Math.max(4, Math.min(9, cw - 1.5)), y0 = by - 1;
    ctx.strokeStyle = '#7DF9FF'; ctx.lineWidth = 1.6; ctx.beginPath();
    ctx.moveTo(bx - 2, y0 - 3); ctx.lineTo(bx - 6, y0 - 3); ctx.lineTo(bx - 6, y0 + s + 3); ctx.lineTo(bx - 2, y0 + s + 3);
    ctx.moveTo(bx + bw + 2, y0 - 3); ctx.lineTo(bx + bw + 6, y0 - 3); ctx.lineTo(bx + bw + 6, y0 + s + 3); ctx.lineTo(bx + bw + 2, y0 + s + 3); ctx.stroke();
    for (let i = 0; i < cells; i++) {
      const x = gx(i) + (cw - s) / 2, fr = fr0(i), fh = Math.round(s * fr);
      ctx.fillStyle = 'rgba(5,217,232,.07)'; ctx.fillRect(x, y0, s, s); ctx.strokeStyle = 'rgba(125,249,255,.25)'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y0 + .5, s - 1, s - 1);
      if (fh > 0) {
        if (hf) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,60,200,.55)'; ctx.fillRect(x + 2, y0 + s - fh, s, fh); ctx.fillStyle = 'rgba(5,217,232,.55)'; ctx.fillRect(x - 2, y0 + s - fh, s, fh); ctx.globalCompositeOperation = 'source-over'; }
        ctx.globalAlpha = i === ei && !hf && !rm && Math.sin(bt * 12) > 0 ? .55 : 1; ctx.fillStyle = lit(i) ? '#FFFFFF' : S.pc[ph]; ctx.fillRect(x, y0 + s - fh, s, fh); ctx.globalAlpha = 1;
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let y = y0; y < y0 + s; y += 2) ctx.fillRect(bx, y, bw, 1);
    ctx.fillStyle = '#FF71CE'; for (let k = 1; k <= 2; k++) { const x = mid(k); ctx.fillRect(x - 1, y0 + 1, 2, 2); ctx.fillRect(x - 1, y0 + 4, 2, 2); ctx.fillRect(x - 1, y0 + 7, 2, 2); }
  } else {                                            // Seam Colossus: strata blocks, the crack between phases glows hotter
    const h = 10, y0 = by - 1;
    for (let i = 0; i < cells; i++) {
      const x = gx(i), fr = fr0(i);
      ctx.fillStyle = 'rgba(6,10,8,.72)'; ctx.fillRect(x, y0, cw, h);
      if (fr < 1) { ctx.strokeStyle = 'rgba(255,120,60,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + cw * .3, y0); ctx.lineTo(x + cw * .5, y0 + h * .4); ctx.lineTo(x + cw * .4, y0 + h * .6); ctx.lineTo(x + cw * .65, y0 + h); ctx.stroke(); }
      if (fr > 0) {
        const w = cw * fr;
        for (let j = 0; j < 3; j++) { ctx.fillStyle = lit(i) ? '#FFE2B0' : OV_COL[(i + j + ph) % 5]; ctx.fillRect(x, y0 + j * h / 3, w, h / 3 + .5); }
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x, y0, w, 1.2); ctx.fillStyle = 'rgba(6,10,6,.4)'; ctx.fillRect(x, y0 + h - 3, w, 3);
      }
      ctx.strokeStyle = 'rgba(255,190,130,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y0 + .5, cw - 1, h - 1);
    }
    for (let k = 1; k <= 2; k++) {
      const x = mid(k), on = ph >= k;
      ctx.strokeStyle = 'rgba(255,98,40,' + (on ? .95 : .45) + ')'; ctx.lineWidth = on ? 2.6 : 1.6; ctx.beginPath(); ctx.moveTo(x, y0 - 5); ctx.lineTo(x + 2.5, y0 + 1); ctx.lineTo(x - 2, y0 + 5); ctx.lineTo(x + 2, y0 + h + 5); ctx.stroke();
      if (on) glow(x, y0 + h / 2, 10, 'rgba(255,98,40,1)', .5);
    }
  }
  // armor row: six segments under the live phase group, drawn as the same stuff the plates are made of
  if (b.armor > 0) {
    const ax = gx(ph * 5), aw = gx(ph * 5 + 4) + cw - ax, af = b.armor / b.armorMax, sw = aw / 6, ay = by + 15, sa = b.aFlash > 0;
    const shape = (x, w) => {
      ctx.beginPath();
      if (K === 'eye') { const rd = 2.2; ctx.moveTo(x + rd, ay); ctx.lineTo(x + w - rd, ay); ctx.arc(x + w - rd, ay + rd, rd, -1.571, 1.571); ctx.lineTo(x + rd, ay + 4.4); ctx.arc(x + rd, ay + rd, rd, 1.571, 4.712); }
      else if (K === 'jelly') ctx.arc(x + w / 2, ay + 2.5, Math.min(3.2, w / 2), 0, 6.283);
      else if (K === 'prism') { ctx.moveTo(x, ay + 6); ctx.lineTo(x + w / 2, ay); ctx.lineTo(x + w, ay + 6); }
      else if (K === 'storm') { ctx.moveTo(x + 3, ay); ctx.lineTo(x + w + 3, ay); ctx.lineTo(x + w, ay + 5); ctx.lineTo(x, ay + 5); }
      else if (K === 'sentinel') { const q = Math.min(5, w); ctx.rect(x + (w - q) / 2, ay, q, q); }
      else { ctx.rect(x, ay, w, 5); }
      ctx.closePath(); ctx.fill();
    };
    for (let k = 0; k < 6; k++) {
      const x = ax + k * sw, w = sw - 2.5, s = Math.max(0, Math.min(1, af * 6 - k));
      ctx.fillStyle = 'rgba(255,255,255,.13)'; shape(x, w);
      if (s > 0) { ctx.save(); ctx.beginPath(); ctx.rect(x - 1, ay - 1, (w + 4) * s, 10); ctx.clip(); ctx.fillStyle = sa ? '#FFFFFF' : S.ac; shape(x, w); if (K === 'colossus' && !sa) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, ay, w, 1); } ctx.restore(); }
    }
  }
  if (!noText) {
    ctx.font = '700 11px MothText, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = b.stagger > 0 ? '#FFE08A' : b.core > 0 ? '#FFFFFF' : 'rgba(255,255,255,.55)';
    ctx.fillText(b.stagger > 0 ? 'STAGGERED  x3' : b.core > 0 ? 'CORE OPEN  x2' : b.coreWarn > 0 ? 'core opening...' : 'Phase ' + (ph + 1) + ' / 3' + (b.armor > 0 ? '   ARMOR' : ''), cx0, by + 32);
  }
  ctx.restore();
}

export function drawBossCore(t) {
  const b = ST.boss; if (!b.entered) return;
  ctx.save(); ctx.translate(b.x, b.y);
  b.lt = t;
  if (b.flashT > 0) glow(0, 0, (b.hw || b.r) * 1.7, BFP[b.kind].flash, .5);       // v56: a hit tints the boss in its own colour
  if (b.armor > 0) drawBossArmor(b, t);
  const open = b.stagger > 0 || b.core > 0, bx = (b.hw || b.r) * 1.05, by = -b.r * 1.3;      // tiny badge, up and to the side
  if (open || b.coreWarn > 0) {
    if (!open) {
      const k = b.coreWarn / .7; ctx.strokeStyle = 'rgba(255,209,102,' + (.95 - k * .5) + ')'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(bx, by, 6 + k * 12, 0, 6.283); ctx.stroke();
    } else {
      const stg = b.stagger > 0, R = 8 * (1 + Math.sin(t * 14) * .08);
      glow(0, 0, b.r * 2.4, stg ? 'rgba(255,209,102,1)' : 'rgba(255,255,255,1)', stg ? .28 : .18);       // a faint aura instead of covering the face
      ctx.fillStyle = stg ? '#FFE08A' : '#FFFFFF'; ctx.beginPath(); ctx.arc(bx, by, R, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#FF4D6D'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = '#14132B'; ctx.font = '700 9px MothText, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(stg ? 'x3' : 'x2', bx, by + 3.2);
      if (stg) { ctx.fillStyle = '#FFE08A'; for (let k = 0; k < 3; k++) { const a = t * 4 + k * 2.094; ctx.beginPath(); ctx.arc(Math.cos(a) * b.r * 1.15, -b.r * .95 + Math.sin(a) * 5, 2.4, 0, 6.283); ctx.fill(); } }
    }
  }
  ctx.restore();
}
export function drawBoss(t, pulse) {
  const b = ST.boss, r = b.r, f = b.flashT > 0;
  ctx.save(); ctx.translate(b.x, b.y);
  if (b.kind === 'jelly') {
    glow(0, 0, r * 3, ['rgba(255,110,210,1)', 'rgba(255,120,150,1)', 'rgba(255,90,90,1)'][b.phase], .35 + .15 * pulse);
    ctx.strokeStyle = f ? '#FFFFFF' : ['#C65AD6', '#E0509A', '#E8403F'][b.phase]; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const NT = [6, 8, 10][b.phase];
    for (let i = 0; i < NT; i++) {
      const x0 = (i - (NT - 1) / 2) * r * 1.6 / (NT - 1); ctx.beginPath(); ctx.moveTo(x0, r * .2);
      for (let k = 1; k <= 6; k++) ctx.lineTo(x0 + Math.sin(t * 3 + i + k * .8) * 8 * (k / 6), r * .2 + k * r * .28);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    const g = ctx.createLinearGradient(0, -r, 0, r * .3);
    const GP = [['#FFB3EA', '#A83FB8'], ['#FFC6A8', '#D6409A'], ['#FFE08A', '#C8205A']][b.phase];
    g.addColorStop(0, f ? '#FFFFFF' : GP[0]); g.addColorStop(1, f ? '#FFFFFF' : GP[1]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * .95, 0, Math.PI, 6.283);
    ctx.lineTo(r * 1.1, r * .25); ctx.quadraticCurveTo(0, r * .5, -r * 1.1, r * .25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    [[-.5, -.4, .14], [.45, -.55, .1], [.1, -.25, .08]].forEach(q => { ctx.beginPath(); ctx.arc(q[0] * r, q[1] * r, q[2] * r, 0, 6.283); ctx.fill(); });
    ctx.fillStyle = '#2A0F3A';
    [-.3, .3].forEach(ex => { ctx.beginPath(); ctx.ellipse(ex * r, 0, r * .12, r * .18, 0, 0, 6.283); ctx.fill(); });
    if (b.phase >= 2) { ctx.fillStyle = 'rgba(255,224,138,.85)'; for (let k = 0; k < 5; k++) { const a = t * 1.5 + k * 1.2566; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.35, Math.sin(a) * r * .5 - r * .1, 3, 0, 6.283); ctx.fill(); } }
  } else if (b.kind === 'colossus') {
    drawColossus(b, t, pulse, f);
  } else if (b.kind === 'sentinel') {
    drawSentinel(b, t, pulse, f);
  } else if (b.kind === 'prism') {
    glow(0, 0, r * 3, 'rgba(120,220,255,1)', .4 + .15 * pulse);
    ctx.save(); ctx.rotate(t * .7);
    ctx.fillStyle = f ? '#FFFFFF' : ['rgba(40,90,140,.92)', 'rgba(30,110,120,.92)', 'rgba(80,50,150,.92)'][b.phase]; ctx.strokeStyle = ['rgba(150,235,255,.9)', 'rgba(150,255,225,.9)', 'rgba(220,170,255,.95)'][b.phase]; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -r * 1.3); ctx.lineTo(r, 0); ctx.lineTo(0, r * 1.3); ctx.lineTo(-r, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.rotate(-t * 1.4); ctx.strokeStyle = 'rgba(200,250,255,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -r * .7); ctx.lineTo(r * .6, r * .4); ctx.lineTo(-r * .6, r * .4); ctx.closePath(); ctx.stroke();
    ctx.restore();
    if (b.phase >= 1) { ctx.save(); ctx.rotate(-t * .5); ctx.strokeStyle = 'rgba(200,250,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r * 1.75); ctx.lineTo(r * 1.35, 0); ctx.lineTo(0, r * 1.75); ctx.lineTo(-r * 1.35, 0); ctx.closePath(); ctx.stroke(); ctx.restore(); }
    const NP = [3, 4, 6][b.phase];
    for (let k = 0; k < NP; k++) {
      const a = t * 2 + k * 6.283 / NP, sx = Math.cos(a) * r * 1.6, sy = Math.sin(a) * r * 1.6;
      ctx.fillStyle = '#BFF3FF'; ctx.beginPath(); ctx.moveTo(sx, sy - 7); ctx.lineTo(sx + 4, sy); ctx.lineTo(sx, sy + 7); ctx.lineTo(sx - 4, sy); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = b.phase >= 2 ? '#FFE08A' : '#E8FBFF'; ctx.beginPath(); ctx.arc(0, 0, r * (.22 + b.phase * .03), 0, 6.283); ctx.fill();
  } else if (b.kind === 'storm') {      // Storm Titan: a living thunderhead
    const rm = reduceMotion, tk = rm ? 0 : Math.floor(t * 8);
    const fl = rm ? .3 : Math.max(0, Math.sin(t * 7) * Math.sin(t * 3.1));          // inner lightning flicker
    glow(0, 0, r * 3.2, ['rgba(255,90,110,1)', 'rgba(255,70,90,1)', 'rgba(255,40,70,1)'][b.phase], .3 + .2 * pulse);
    if (fl > .45) glow(0, 0, r * 1.7, 'rgba(255,200,230,1)', (fl - .45) * .55);
    if (!rm) {                                                                      // rain curtain behind the body
      ctx.strokeStyle = 'rgba(190,180,240,.35)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < 9; i++) { const x = (i - 4) * r * .21, y0 = r * .6 + ((t * 260 + i * 37) % (r * .95)); ctx.moveTo(x, y0); ctx.lineTo(x - 3, y0 + 14); }
      ctx.stroke();
    }
    const LOBES = [[-.82, .26, .52], [.85, .22, .52], [-.5, -.34, .6], [.52, -.3, .6], [0, -.6, .66], [-.22, .34, .68], [.36, .4, .62], [0, .05, .78]];
    const bob = i => rm ? 0 : Math.sin(t * 2 + i * 1.3) * r * .035;
    ctx.fillStyle = f ? '#FFFFFF' : '#150C28';                                      // dark outline pass
    LOBES.forEach((q, i) => { ctx.beginPath(); ctx.arc(q[0] * r, q[1] * r + bob(i), q[2] * r * 1.07, 0, 6.283); ctx.fill(); });
    if (f) ctx.fillStyle = '#FFFFFF';
    else {                                                                          // shaded body: lit crown, heavy dark belly
      const cg = ctx.createLinearGradient(0, -r * 1.2, 0, r * .95);
      const CP = [['#7A55A8', '#40295E', '#1A0F2E'], ['#A24C8E', '#58214F', '#240B24'], ['#BE3A60', '#6E1230', '#2C0614']][b.phase];
      cg.addColorStop(0, CP[0]); cg.addColorStop(.45, CP[1]); cg.addColorStop(1, CP[2]);
      ctx.fillStyle = cg;
    }
    LOBES.forEach((q, i) => { ctx.beginPath(); ctx.arc(q[0] * r, q[1] * r + bob(i), q[2] * r, 0, 6.283); ctx.fill(); });
    if (!f) {                                                                       // red-lit rims on the crown lobes
      ctx.strokeStyle = 'rgba(255,150,180,.38)'; ctx.lineWidth = 2.2;
      for (let i = 2; i < 5; i++) { const q = LOBES[i]; ctx.beginPath(); ctx.arc(q[0] * r, q[1] * r + bob(i), q[2] * r, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); }
      ctx.fillStyle = 'rgba(10,4,24,.28)';                                         // underside shadow band
      ctx.beginPath(); ctx.ellipse(0, r * .62, r * .95, r * .22, 0, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';                                       // lightning veins inside the cloud
    const zig = (x0, y0, x1, y1, n, seed) => {
      ctx.moveTo(x0, y0);
      for (let k = 1; k < n; k++) { const u = k / n; ctx.lineTo(x0 + (x1 - x0) * u + Math.sin(seed + k * 4.1 + tk * 1.7) * r * .09, y0 + (y1 - y0) * u); }
      ctx.lineTo(x1, y1);
    };
    const va = rm ? .55 : .25 + .6 * fl;
    ctx.strokeStyle = 'rgba(255,120,170,' + (va * .45) + ')'; ctx.lineWidth = 6; ctx.beginPath();
    zig(-r * .55, -r * .75, -r * .3, r * .15, 5, 1); zig(r * .5, -r * .7, r * .62, r * .1, 4, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,225,240,' + va + ')'; ctx.lineWidth = 2.2; ctx.beginPath();
    zig(-r * .55, -r * .75, -r * .3, r * .15, 5, 1); zig(r * .5, -r * .7, r * .62, r * .1, 4, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,170,205,' + (.35 + .45 * fl) + ')'; ctx.lineWidth = 2; ctx.beginPath();   // crackle stubs off the rim
    for (let k = 0; k < 4 + b.phase * 2; k++) {
      const a = (rm ? k * 1.7 : (tk + k * 3) * 2.399) % 6.283, x0 = Math.cos(a) * r * 1.02, y0 = Math.sin(a) * r * .8;
      ctx.moveTo(x0, y0); ctx.lineTo(x0 * 1.14 + Math.sin(a * 9) * 4, y0 * 1.14 + Math.cos(a * 7) * 4); ctx.lineTo(x0 * 1.3, y0 * 1.3);
    }
    ctx.stroke();
    ctx.fillStyle = '#FFD3E6';                                                      // charged sparks orbiting the thunderhead
    for (let k = 0; k < 4; k++) {
      const a = (rm ? 0 : t * 1.6) + k * 1.571;
      ctx.globalAlpha = .5 + .4 * Math.abs(Math.sin(t * 6 + k)); ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.38, Math.sin(a) * r * .55, 2.4, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // face: angry glowing eyes that track the moth, heavy brows, jagged electric mouth
    const mdx = ST.moth.x - b.x, mdy = ST.moth.y - b.y, md = Math.hypot(mdx, mdy) || 1, pxo = mdx / md * r * .05, pyo = mdy / md * r * .035;
    [-1, 1].forEach(sd => {
      const ex = sd * r * .3, ey = -r * .08;
      glow(ex, ey, r * .34, 'rgba(255,90,130,1)', .6);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(sd * -.22);
      ctx.fillStyle = f ? '#FFFFFF' : '#FF6B8A'; ctx.beginPath(); ctx.ellipse(0, 0, r * .17, r * .095, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#FFF1F5'; ctx.beginPath(); ctx.ellipse(pxo * .6, pyo * .6, r * .1, r * .06, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#2A0A26'; ctx.beginPath(); ctx.ellipse(pxo, pyo, r * .035, r * .06, 0, 0, 6.283); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#0F0620'; ctx.lineWidth = Math.max(3, r * .07); ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(sd * r * .52, ey - r * .17); ctx.lineTo(sd * r * .1, ey - r * .02); ctx.stroke(); ctx.lineCap = 'butt';
    });
    ctx.fillStyle = '#0F0620'; ctx.beginPath(); ctx.moveTo(-r * .34, r * .26);
    for (let k = 0; k < 7; k++) ctx.lineTo(-r * .34 + (k + .5) * r * .68 / 7, r * (k % 2 ? .26 : .4));
    ctx.lineTo(r * .34, r * .26); ctx.quadraticCurveTo(0, r * .2, -r * .34, r * .26); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,150,190,' + (.35 + .5 * fl) + ')'; ctx.lineWidth = 1.8; ctx.beginPath();
    ctx.moveTo(-r * .3, r * .31); for (let k = 1; k < 7; k++) ctx.lineTo(-r * .3 + k * r * .6 / 7, r * (k % 2 ? .35 : .29));
    ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
  } else {                            // Void Eye
    glow(0, 0, r * 3, 'rgba(255,60,90,1)', .35 + .15 * pulse);
    const NS = [10, 14, 18][b.phase];
    ctx.save(); ctx.rotate(t * .6); ctx.fillStyle = f ? '#FFFFFF' : ['#3A1230', '#4A1426', '#5A0F1E'][b.phase];
    for (let i = 0; i < NS; i++) {
      ctx.rotate(6.283 / NS); ctx.beginPath(); ctx.moveTo(r * .9, -8); ctx.lineTo(r * 1.45, 0); ctx.lineTo(r * .9, 8); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = f ? '#FFFFFF' : '#2A0F26'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
    ctx.strokeStyle = ['rgba(255,77,109,.8)', 'rgba(255,138,77,.9)', 'rgba(255,193,61,.95)'][b.phase]; ctx.lineWidth = 3 + b.phase; ctx.stroke();
    ctx.fillStyle = '#FFE9EE'; ctx.beginPath(); ctx.ellipse(0, 0, r * .72, r * .48, 0, 0, 6.283); ctx.fill();
    if (b.phase >= 1) { ctx.strokeStyle = 'rgba(255,80,100,.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let k = 0; k < (b.phase === 1 ? 4 : 8); k++) { const a = k * .785 + .2; ctx.moveTo(Math.cos(a) * r * .7, Math.sin(a) * r * .46); ctx.lineTo(Math.cos(a) * r * .4, Math.sin(a) * r * .26); } ctx.stroke(); }
    const dx = ST.moth.x - b.x, dy = ST.moth.y - b.y, d = Math.hypot(dx, dy) || 1, px = dx / d * r * .2, py = dy / d * r * .12;
    ctx.fillStyle = ['#FF4D6D', '#FF8A4D', '#FFC13D'][b.phase]; ctx.beginPath(); ctx.arc(px, py, r * .3, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#14081A'; ctx.beginPath(); ctx.ellipse(px, py, r * (.1 - b.phase * .015), r * .24, 0, 0, 6.283); ctx.fill();
  }
  ctx.restore();
}
