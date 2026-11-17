import { ST } from './state.js';
import { HAZ, STAGES, ctx, reduceMotion } from './config.js';
import { lerp } from './core.js';
import { buzz } from './input.js';
import { addHeat, addScore, burst, floatText, fmtNum, ring, scoreMult, showBanner, spawnShard, spawnSpore, spawnStrike, stage, tierOf } from './spawn.js';
import { clampN } from './bosses/sentinel.js';
import { glow } from './render/glow.js';
import { nmRnd } from './stages/neon.js';
import { Sound } from './audio.js';

// ---------- edge strips (v40): about 15% of the scene hides on each side. Dragging the moth into the edge zone slides and banks the camera to reveal it.
const EDGE_F = .16 / .68;
export const stripW = () => ST.W * EDGE_F;
export const wLo = () => -stripW() + 24, wHi = () => ST.W + stripW() - 24;      // moth limits in world coordinates
export const xL = () => -stripW(), xR = () => ST.W + stripW();                    // outer edges of the whole world, hidden strips included
export const bgM = () => stripW() * .75, exL = () => xL() - bgM(), exR = () => xR() + bgM();   // v46: the drawn map reaches past the strips (bank, shake and slide never show a bare edge)
export const BGK = 1 + 3.5 * EDGE_F;                                          // background world width / screen width
export const worldX = (m, pStrip) => {                                         // a spawn x: usually the stage, sometimes a strip
  const S = stripW(), ms = Math.min(m, S * .3);
  if (Math.random() < pStrip) return Math.random() < .5 ? -S + ms + Math.random() * (S - ms) : ST.W + Math.random() * (S - ms);
  return m + Math.random() * (ST.W - 2 * m);
};
const ecZone = () => ST.W * .12;                                          // the edge zone starts 12% in from the screen edge
export const EC = { x: 0, xv: 0, roll: 0, rv: 0, gl: 0, gr: 0, hl: 0, hr: 0 };       // x: camera pan, roll: radians, g*/h*: light bleed amounts (reward / hazard) per side
const EP = [{ s: .55, c: 8, r: 1 }, { s: .6, c: 6.5, r: 1.15 }, { s: .5, c: 7.5, r: 1 }, { s: .72, c: 9, r: 1.25 }, { s: .55, c: 8.5, r: 1 }, { s: .6, c: 7.5, r: 1.1 }];   // c = spring frequency: about 0.6 s to settle   // per stage: rubber-band stiffness, camera follow rate, roll strength
export const ecOn = () => ST.state === 'play' && (Math.abs(EC.x) > .2 || Math.abs(EC.roll) > .0004);
export function ecApply(par) {                                                // world -> screen: bank around the moth, then slide
  const px = ST.moth.x - EC.x, py = ST.moth.y;
  ctx.translate(px, py); ctx.rotate(EC.roll); ctx.translate(-px, -py); ctx.translate(-EC.x * par, 0);
}
function ecTarget(mw) {                                                // where the camera wants to be for a moth at world x
  const a = ecZone(), S = stripW();
  if (mw < a) return -S * clampN((a - mw) / (a - wLo()), 0, 1);
  if (mw > ST.W - a) return S * clampN((mw - (ST.W - a)) / (wHi() - (ST.W - a)), 0, 1);
  return 0;
}
function ecFinger() {                                                  // where the finger alone wants the camera (closed form, so the pan never has to crawl toward it)
  if (ST.fingerSX === null) return 0;
  const a = ecZone(), P = EP[ST.curStage] || EP[0], sx = ST.fingerSX, span = Math.max(1, a - 24), S = stripW();
  if (sx < a) { const q = clampN((a - sx) / span, 0, 1); return -S * q * (P.s + (1 - P.s) * q); }
  if (sx > ST.W - a) { const q = clampN((sx - (ST.W - a)) / span, 0, 1); return S * q * (P.s + (1 - P.s) * q); }
  return 0;
}
export function ecAim() {                                                     // finger (screen) -> moth target (world), with rubber-band resistance inside the edge zone
  if (ST.fingerSX === null) return;
  const a = ecZone(), P = EP[ST.curStage] || EP[0], sx = ST.fingerSX, span = Math.max(1, a - 24);
  let ef = sx;
  if (sx < a) { const q = clampN((a - sx) / span, 0, 1); ef = a - span * q * (P.s + (1 - P.s) * q); }
  else if (sx > ST.W - a) { const q = clampN((sx - (ST.W - a)) / span, 0, 1); ef = (ST.W - a) + span * q * (P.s + (1 - P.s) * q); }
  ST.moth.tx = clampN(ef + EC.x, wLo(), wHi());
}
export function ecStep(dt) {
  const S = stripW(), P = EP[ST.curStage] || EP[0], live = ST.state === 'play' && !ST.trans && !ST.CINE;
  if (live) {
    const fT = ecFinger(), mT = ecTarget(ST.moth.x);                  // finger intent, or the moth being carried there by a current / ice / hole
    const tg = Math.abs(fT) >= Math.abs(mT) ? fT : mT, om = P.c * (ST.flow && ST.flow.t >= ST.flow.wait ? .85 : 1), h = dt / 2;
    for (let i = 0; i < 2; i++) { EC.xv += (om * om * (tg - EC.x) - 2 * om * EC.xv) * h; EC.x += EC.xv * h; }   // critically damped: eases in, eases out, never overshoots
    ST.moth.x = clampN(ST.moth.x + EC.xv * dt, wLo(), wHi());                // the moth rides along with the camera, so it stays under the finger
    const lo = Math.max(ST.moth.x - (ST.W - 8), -S), hi = Math.min(ST.moth.x - 8, S);   // never lose the moth off-screen
    if (EC.x < lo) { EC.x = lo; if (EC.xv < 0) EC.xv = 0; } else if (EC.x > hi) { EC.x = hi; if (EC.xv > 0) EC.xv = 0; }
  } else {
    EC.x += (0 - EC.x) * Math.min(1, dt * 7); EC.xv = 0;
    ST.moth.x += (clampN(ST.moth.x, 24, ST.W - 24) - ST.moth.x) * Math.min(1, dt * 6);   // jumps and boss scenes happen on the main stage
    ST.moth.tx = clampN(ST.moth.tx, 24, ST.W - 24);
  }
  const rk = reduceMotion ? 0 : P.r * (ST.ice ? 1.4 : 1);
  let rt = -(EC.x / S) * .052 * rk;                                    // up to about 3 degrees, banking toward the side being revealed
  if (ST.curStage === 4 && ST.dispD > .7 && Math.abs(EC.x) > S * .3 && !reduceMotion) rt += Math.sin(ST.elapsed * 41) * .004 * ST.dispD;
  EC.rv += ((rt - EC.roll) * 90 - EC.rv * 11) * dt;                    // slightly under-damped spring: a little rubber-band overshoot when it settles
  EC.roll = clampN(EC.roll + EC.rv * dt, -.09, .09);
}
export function ecBleed(dt) {                                                 // what is waiting in each hidden strip, as a faint glow at the screen edge
  let gl = 0, gr = 0, hl = 0, hr = 0;
  for (const it of ST.items) {
    const T = it.type, side = it.x < -2 ? -1 : it.x > ST.W + 2 ? 1 : 0;
    if (!side || it.y < -10 || it.y > ST.H) continue;
    let rw = 0, hz = 0;
    if (T === 'orb' || T === 'gold' || T === 'power') rw = it.jack ? 1.6 : T === 'power' ? 1 : .5;
    else if (HAZ[T] || T === 'strike') hz = 1;
    if (side < 0) { gl += rw; hl += hz; } else { gr += rw; hr += hz; }
  }
  const k = Math.min(1, dt * 3);
  EC.gl += (Math.min(1, gl * .55) - EC.gl) * k; EC.gr += (Math.min(1, gr * .55) - EC.gr) * k;
  EC.hl += (Math.min(1, hl * .45) - EC.hl) * k; EC.hr += (Math.min(1, hr * .45) - EC.hr) * k;
}
export function drawEdgeBleed(t) {
  if (ST.state !== 'play') return;
  const pu = .8 + .2 * Math.sin(t * 2.2), S = stripW();
  for (const side of [-1, 1]) {
    const g = side < 0 ? EC.gl : EC.gr, h = side < 0 ? EC.hl : EC.hr, tot = g + h;
    if (tot < .02) continue;
    const seen = (side < 0 ? Math.max(0, -EC.x) : Math.max(0, EC.x)) / S;            // once the strip is revealed the glow is not needed
    const a = Math.min(.14, tot * .11) * pu * (1 - Math.min(1, seen * 1.4));
    if (a < .004) continue;
    const hz = h / tot, gg = Math.round(lerp(214, 70, hz)), bb = Math.round(lerp(110, 90, hz)), w = 54;   // gold when it is loot, red when it bites
    const gr = ctx.createLinearGradient(side < 0 ? 0 : ST.W, 0, side < 0 ? w : ST.W - w, 0);
    gr.addColorStop(0, 'rgba(255,' + gg + ',' + bb + ',' + a + ')'); gr.addColorStop(1, 'rgba(255,' + gg + ',' + bb + ',0)');
    ctx.fillStyle = gr; ctx.fillRect(side < 0 ? 0 : ST.W - w, 0, w, ST.H);
  }
}
export function drawStripDeco(t) {                                            // per-stage flavour inside the hidden strips
  const S = stripW(), N = ST.lowFx ? 6 : 12;
  for (const side of [-1, 1]) {
    if (side < 0 ? EC.x > -3 : EC.x < 3) continue;
    const x0 = side < 0 ? -S : ST.W, vis = Math.min(1, Math.abs(EC.x) / (S * .5));
    const sg = ctx.createLinearGradient(side < 0 ? 0 : ST.W, 0, side < 0 ? -S : ST.W + S, 0);
    sg.addColorStop(0, 'rgba(4,3,16,0)'); sg.addColorStop(1, 'rgba(4,3,16,' + (.16 * vis) + ')');
    ctx.fillStyle = sg; ctx.fillRect(side < 0 ? x0 - 400 : x0, -ST.H * .3, S + 400, ST.H * 1.6);   // oversized so a banked camera never shows the end of the shade
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      const rx = nmRnd(i + side * 17), ry = nmRnd(i * 3 + 5 + side), px = x0 + 10 + rx * (S - 20);
      if (ST.curStage === 0) {                                            // Moonlit Garden: fireflies
        glow(px + Math.sin(t * .6 + i * 2) * 10, ST.H * (.12 + ry * .8) + Math.sin(t * .8 + i) * 14, 16, 'rgba(210,255,140,1)', (.35 + .35 * Math.sin(t * 2.2 + i * 1.7)) * vis);
      } else if (ST.curStage === 1) {                                     // Nebula Reef: rising bubbles
        const y = ST.H + 20 - ((t * (26 + ry * 30) + ry * ST.H) % (ST.H + 40)), xx = px + Math.sin(t + i) * 8, r = 3 + rx * 5;
        ctx.strokeStyle = 'rgba(190,240,255,' + (.4 * vis) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(xx, y, r, 0, 6.283); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,' + (.35 * vis) + ')'; ctx.beginPath(); ctx.arc(xx - r * .3, y - r * .3, r * .22, 0, 6.283); ctx.fill();
      } else if (ST.curStage === 2) {                                     // Aurora Sea: glinting crystals
        const y = ST.H * (.1 + ry * .85), tw = .5 + .5 * Math.sin(t * 1.6 + i * 2.3), sz = 5 + rx * 7;
        ctx.save(); ctx.translate(px, y); ctx.rotate(.6 * (rx - .5));
        ctx.fillStyle = 'rgba(170,230,255,' + ((.12 + .3 * tw) * vis) + ')';
        ctx.beginPath(); ctx.moveTo(0, -sz * 1.6); ctx.lineTo(sz * .6, 0); ctx.lineTo(0, sz * 1.1); ctx.lineTo(-sz * .6, 0); ctx.closePath(); ctx.fill(); ctx.restore();
        if (tw > .9) glow(px, y, 22, 'rgba(200,245,255,1)', .5 * vis);
      } else if (ST.curStage === 3) {                                     // Crimson Storm: ember updraft
        const y = ST.H + 10 - ((t * (70 + ry * 90) + ry * ST.H) % (ST.H + 30)), xx = px + Math.sin(t * 3 + i * 1.3) * 7;
        glow(xx, y, 9, 'rgba(255,140,60,1)', (.5 + .3 * Math.sin(t * 9 + i)) * vis);
      } else if (ST.curStage === 5) {                                     // Overflow Reach: stretched terrain flecks
        const y = ((t * (26 + ry * 40) + ry * ST.H) % (ST.H + 80)) - 40, len = 12 + rx * 26 * (1 + ST.dispD * 1.6);
        ctx.fillStyle = (i % 3 === 0 ? 'rgba(206,176,70,' : 'rgba(80,185,160,') + (.5 * vis) + ')'; ctx.fillRect(px, y, 2, len);
      } else {                                                         // Neon Mirage: falling pixels
        const y = ((t * (40 + ry * 50) + ry * ST.H) % (ST.H + 20)) - 10, sz = 4 + (i % 3) * 2;
        ctx.fillStyle = (i % 2 ? 'rgba(125,249,255,' : 'rgba(255,113,206,') + (.5 * vis) + ')'; ctx.fillRect(px, y, sz, sz);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (ST.curStage === 4) {                                              // a tiny drifting window nobody asked for
      const wx = x0 + S * .5, wy = ST.H * .3 + Math.sin(t * .7 + side) * 20;
      ctx.save(); ctx.globalAlpha = .55 * vis; ctx.fillStyle = '#C0C0C8'; ctx.fillRect(wx - 23, wy - 15, 46, 30);
      ctx.fillStyle = '#000080'; ctx.fillRect(wx - 21, wy - 13, 42, 7); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(wx + 13, wy - 12, 5, 5);
      ctx.fillStyle = '#7A7A86'; ctx.fillRect(wx - 18, wy - 2, 30, 3); ctx.fillRect(wx - 18, wy + 5, 20, 3); ctx.restore();
    }
  }
}
export function drawJack(it, t) {
  const pu = 1 + Math.sin(t * 6 + it.ph) * .1;
  ctx.save(); ctx.translate(it.x, it.y);
  glow(0, 0, 78 * pu, 'rgba(255,209,102,1)', .75); glow(0, 0, 40, 'rgba(255,255,255,1)', .35);
  if (ST.curStage === 5) {                                                // v55 Overflow Reach: a geode cluster, gold and diamond crystals radiating from a bright core
    ctx.rotate(t * .7);
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, g = k % 2 === 0, L = it.r * (g ? 1.75 : 1.4) * pu, cx = Math.cos(a) * L, cy = Math.sin(a) * L;
      const p1x = Math.cos(a + 1.25) * it.r * .5, p1y = Math.sin(a + 1.25) * it.r * .5, p2x = Math.cos(a - 1.25) * it.r * .5, p2y = Math.sin(a - 1.25) * it.r * .5;
      ctx.fillStyle = g ? '#FFE79A' : '#E6FBFF'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p1x, p1y); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = g ? '#D8960F' : '#52BFE0'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p2x, p2y); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    }
    ctx.rotate(-t * 1.4); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.lineTo(Math.cos(a) * it.r * .5, Math.sin(a) * it.r * .5); } ctx.closePath(); ctx.fill();
    ctx.restore(); return;
  }
  ctx.rotate(t * 1.6); ctx.fillStyle = '#FFD166'; ctx.strokeStyle = '#FFF3C4'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, rr = k % 2 ? it.r * .72 : it.r * 1.45 * pu; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.rotate(-t * 3.2); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, it.r * .42, 0, 6.283); ctx.fill();
  ctx.restore();
}
export function jackpot(it) {                                                 // the strip's big prize: a burst of score and heat, plus a cascade of gold
  const mult = scoreMult() * (ST.pw.doubleT > 0 ? 2 : 1), raw = 30 * mult;
  addScore(raw); addHeat(8); ST.scorePop = 1; ST.flash = Math.max(ST.flash, .18);
  showBanner('Jackpot', '#FFD166'); floatText(it.x, it.y - 34, '+' + fmtNum(raw), '#FFD166');
  ring(it.x, it.y, 'rgba(255,209,102,.95)', 900, .8, 6); ring(it.x, it.y, 'rgba(255,255,255,.8)', 560, .6, 3); burst(it.x, it.y, '#FFD166', 44, 460, 1.2);
  Sound.bonus(); buzz([20, 30, 40]);
  const S = stripW(), lo = it.x < 0 ? -S + 18 : ST.W + 18, hi = it.x < 0 ? -18 : ST.W + S - 18;
  for (let k = 0; k < 6; k++) { const x = clampN(it.x + (Math.random() - .5) * 40, lo, hi); ST.items.push({ type: 'gold', r: 12, x, x0: x, y: -30 - k * 70, vy: 230, ph: Math.random() * 6.28, spin: 0, amp: 0, passed: false }); }
}
export function spawnEdgeItem(side, forceJack) {                              // premium loot that shoots diagonally across the stage into a hidden strip
  const S = stripW();
  const ex = side > 0 ? ST.W + S * (.35 + Math.random() * .3) : -S * (.35 + Math.random() * .3);
  const x0 = ST.W / 2 - side * ST.W * (.2 + Math.random() * .16);
  const yT = ST.H * (.8 + Math.random() * .06), vy = 190 + ST.diff * 110 + Math.random() * 30;
  let type = 'gold', kind, jack = false;
  if (forceJack || (ST.jackCD <= 0 && Math.random() < .5)) { jack = true; ST.jackCD = 36 + Math.random() * 20; }
  else if (Math.random() < .35) {
    const kinds = stage().powers.filter(k => !(k === 'shield' && ST.pw.shield) && !(k === 'ctrlz' && ST.pw.undo) && !(k === 'save' && (ST.pw.saveD > 0 || tierOf(ST.diff) < 1)));
    if (kinds.length) { type = 'power'; kind = kinds[(Math.random() * kinds.length) | 0]; }
  }
  ST.items.push({ type, kind, jack, r: jack ? 18 : type === 'power' ? 15 : 13, x: x0, x0, y: -30, vy, ph: Math.random() * 6.28, spin: 0, edge: 1, ex0: x0, ex1: ex, ef: x0, eyT: yT });
}
export function spawnStripHazard(side) {                                      // strips are never safe: every stage sends its own hazards down them
  const S = stripW(), L = 1 + .08 * Math.floor(ST.stageNo / STAGES.length), r = Math.random();
  const x = side < 0 ? -S + 22 + Math.random() * (S - 26) : ST.W + 4 + Math.random() * (S - 26);
  if (ST.curStage === 1 && r < .5) spawnSpore(x, ST.H * (.36 + Math.random() * .16));
  else if (ST.curStage === 2 && r < .55) spawnShard(x, -30);
  else if (ST.curStage === 3 && r < .42) spawnStrike(x, '255,107,138');
  else ST.items.push({ type: 'shuriken', r: 16, x, x0: x, y: -30, vy: (150 + ST.diff * 280 + Math.random() * 60) * L, ph: Math.random() * 6.28, spin: 0, amp: 0, passed: false, strip: true });
}
export function edgeDirector(g) {                                             // timers for loot lanes, strip hazards and the "you stayed too long" comet
  if (ST.trans || ST.CINE) return;
  ST.edgeT -= g; ST.jackCD -= g;
  if (ST.edgeT <= 0) { ST.edgeSide = -ST.edgeSide; spawnEdgeItem(ST.edgeSide); ST.edgeT = lerp(7.5, 5.2, ST.diff) * (.85 + Math.random() * .3) * (ST.boss ? 1.3 : 1); }
  if (ST.elapsed > 3) for (let k = 0; k < 2; k++) {
    ST.stripT[k] -= g;
    if (ST.stripT[k] <= 0) { spawnStripHazard(k ? 1 : -1); ST.stripT[k] = lerp(3.4, 1.5, ST.diff) * (.75 + Math.random() * .5) * (ST.boss ? 1.2 : 1) * (ST.pw.calmT > 0 ? 2 : 1); }
  }
  if (Math.abs(EC.x) / stripW() > .55) {
    ST.lingerT += g;
    if (ST.lingerT > lerp(3.6, 2.2, ST.diff)) { ST.lingerT = 0; ST.items.push({ type: 'comet', r: 14, x: ST.moth.x, y: -40, vx: 0, vy: 900 + ST.diff * 300, warn: 1 }); Sound.warn(); }
  } else ST.lingerT = Math.max(0, ST.lingerT - g * 1.5);
}
