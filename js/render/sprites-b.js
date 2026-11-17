import { ST } from '../state.js';
import { AUR, ctx, reduceMotion } from '../config.js';
import { rgb, SIDES } from '../core.js';
import { PTAU, mixc, rng32 } from './planets.js';
import { exL, exR } from '../edge.js';
import { glow } from './glow.js';
import { cometRock } from './items.js';
import { bgOn } from '../stages/neon.js';

let shardS = null;
let riftC = null;
let stormPuffs = null;


// ================= v45: Aurora Sea and Crimson Storm detail pass =================
// Aurora Sea = cold, glassy, prismatic (faceted crystal, frosted lens, aurora-coloured light).
// Crimson Storm = hot and forged (charred crust, glowing fissures, plasma, embers).
export const fxRnd = k => { const q = Math.sin(k * 127.1 + 311.7) * 43758.5453; return q - Math.floor(q); };
const hexPath = (R, rot) => { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = rot + k * Math.PI / 3; k ? ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R) : ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R); } ctx.closePath(); };
export const polyPath = pts => { ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); };
function aurGrad(R, rot) {                                      // mint, cyan, violet and back: the aurora colour sweep
  const g = ctx.createConicGradient ? ctx.createConicGradient(rot, 0, 0) : ctx.createLinearGradient(-R, -R, R, R);
  g.addColorStop(0, '#7DFFC8'); g.addColorStop(.33, '#6FD8FF'); g.addColorStop(.66, '#C79BFF'); g.addColorStop(1, '#7DFFC8'); return g;
}
function frostBlade(R, w) { ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(w, -R * .52); ctx.lineTo(w * .5, -R * .16); ctx.lineTo(-w * .5, -R * .16); ctx.lineTo(-w, -R * .52); ctx.closePath(); }
export function drawFrostStar(R, SS, spin, t) {                        // Aurora hazard: six faceted ice blades, light and dark halves, aurora tint, thin warning-red rim
  const w = R * .2;
  const gl = ctx.createLinearGradient(0, -R, 0, -R * .1); gl.addColorStop(0, '#FFFFFF'); gl.addColorStop(.55, '#CFF3FF'); gl.addColorStop(1, '#6FC4F0');
  const gd = ctx.createLinearGradient(0, -R, 0, -R * .1); gd.addColorStop(0, '#9BDDF8'); gd.addColorStop(.55, '#4FA8DE'); gd.addColorStop(1, '#1F6AA8');
  const tint = ctx.createLinearGradient(0, -R, 0, 0); tint.addColorStop(0, 'rgba(199,155,255,.4)'); tint.addColorStop(.55, 'rgba(111,216,255,.22)'); tint.addColorStop(1, 'rgba(125,255,200,0)');
  ctx.fillStyle = 'rgba(205,243,255,.55)'; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
  for (let k = 0; k < 6; k++) { ctx.save(); ctx.rotate(k * Math.PI / 3 + Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, -R * .62); ctx.lineTo(w * .5, -R * .28); ctx.lineTo(-w * .5, -R * .28); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  for (let k = 0; k < 6; k++) {
    ctx.save(); ctx.rotate(k * Math.PI / 3);
    ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(-w, -R * .52); ctx.lineTo(-w * .5, -R * .16); ctx.lineTo(0, -R * .16); ctx.closePath(); ctx.fillStyle = gl; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(w, -R * .52); ctx.lineTo(w * .5, -R * .16); ctx.lineTo(0, -R * .16); ctx.closePath(); ctx.fillStyle = gd; ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; frostBlade(R, w); ctx.fillStyle = tint; ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    frostBlade(R, w); ctx.strokeStyle = SS.stroke; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -R * .9); ctx.lineTo(0, -R * .2); ctx.stroke();
    ctx.restore();
  }
  const hg = ctx.createRadialGradient(-R * .06, -R * .08, 0, 0, 0, R * .3); hg.addColorStop(0, '#FFFFFF'); hg.addColorStop(.6, '#7FD6FF'); hg.addColorStop(1, '#2A7DB5');
  hexPath(R * .28, Math.PI / 6); ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = '#E6FAFF'; ctx.lineWidth = 1.5; ctx.stroke();
  hexPath(R * .15, 0); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.save(); ctx.rotate(-spin);                                 // glint that stays put while the star spins
  glow(-R * .34, -R * .4, R * .45, 'rgba(255,255,255,1)', .45);
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-R * .54, -R * .4); ctx.lineTo(-R * .14, -R * .4); ctx.moveTo(-R * .34, -R * .6); ctx.lineTo(-R * .34, -R * .2); ctx.stroke();
  ctx.restore();
}
export function drawForgedBlade(R, SS, spin, t) {                      // Crimson hazard: forged dark-steel pinwheel, bevelled, with a heated cutting edge
  const tm = reduceMotion ? 0 : t, heat = .7 + .3 * Math.sin(tm * 5);
  const bl = () => { ctx.beginPath(); ctx.moveTo(R * .15, -R * .38); ctx.quadraticCurveTo(R * .6, -R * .5, R * 1.08, 0); ctx.quadraticCurveTo(R * .55, -R * .02, R * .15, R * .22); ctx.closePath(); };
  const sg = ctx.createLinearGradient(R * .15, 0, R * 1.08, 0); sg.addColorStop(0, '#1A0C10'); sg.addColorStop(.6, '#3C2024'); sg.addColorStop(1, '#6A3A32');
  const eg = ctx.createLinearGradient(R * .3, 0, R * 1.08, 0); eg.addColorStop(0, 'rgba(255,90,30,0)'); eg.addColorStop(.6, 'rgba(255,120,40,' + (.7 * heat) + ')'); eg.addColorStop(1, 'rgba(255,240,190,' + heat + ')');
  for (let k = 0; k < 4; k++) {
    ctx.save(); ctx.rotate(k * Math.PI / 2);
    bl(); ctx.fillStyle = sg; ctx.fill();
    ctx.beginPath(); ctx.moveTo(R * .15, -R * .38); ctx.quadraticCurveTo(R * .6, -R * .5, R * 1.08, 0); ctx.lineTo(R * .2, -R * .06); ctx.closePath(); ctx.fillStyle = 'rgba(255,190,150,.16)'; ctx.fill();   // bevel: the upper face catches the light
    bl(); ctx.strokeStyle = SS.stroke; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(R * .15, -R * .38); ctx.quadraticCurveTo(R * .6, -R * .5, R * 1.08, 0);
    ctx.strokeStyle = 'rgba(255,100,40,' + (.25 * heat) + ')'; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = eg; ctx.lineWidth = 2; ctx.stroke();   // heated edge
    ctx.beginPath(); ctx.moveTo(R * .3, -R * .08); ctx.lineTo(R * .95, -R * .01); ctx.strokeStyle = 'rgba(255,160,70,' + (.6 * heat) + ')'; ctx.lineWidth = 1; ctx.stroke();   // ember vein
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }
  const hg = ctx.createRadialGradient(-R * .05, -R * .06, 0, 0, 0, R * .3); hg.addColorStop(0, '#5A2A22'); hg.addColorStop(1, '#14080A');
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, R * .3, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(255,140,60,' + (.6 + .3 * heat) + ')'; ctx.lineWidth = 2; ctx.stroke();
}
export function drawGlacierOrb(it, t, gold, r, pu, ph, col) {          // Aurora orbs: faceted glacier gem (blue) / sun-dog halo (gold)
  const tm = reduceMotion ? 0 : t;
  if (!gold) {
    const R = r * 1.32 * pu;
    ctx.save(); ctx.rotate(Math.sin(tm * 1.3 + ph) * .16);
    const g = ctx.createRadialGradient(-R * .3, -R * .35, R * .08, 0, 0, R * 1.05); g.addColorStop(0, '#FFFFFF'); g.addColorStop(.5, '#A8E9FF'); g.addColorStop(1, '#3C9AD6');
    hexPath(R, -Math.PI / 2); ctx.fillStyle = g; ctx.fill();
    ctx.save(); hexPath(R, -Math.PI / 2); ctx.clip();
    for (let k = 0; k < 6; k++) { const a0 = k * Math.PI / 3 - Math.PI / 2, a1 = a0 + Math.PI / 3; ctx.fillStyle = k % 2 ? 'rgba(8,56,118,.26)' : 'rgba(255,255,255,.24)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * R, Math.sin(a0) * R); ctx.lineTo(Math.cos(a1) * R, Math.sin(a1) * R); ctx.closePath(); ctx.fill(); }
    const tg = ctx.createLinearGradient(-R * .5, -R * .5, R * .5, R * .5); tg.addColorStop(0, 'rgba(190,255,230,.9)'); tg.addColorStop(.5, 'rgba(160,232,255,.8)'); tg.addColorStop(1, 'rgba(205,176,255,.9)');
    hexPath(R * .5, -Math.PI / 2); ctx.fillStyle = tg; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1; ctx.stroke();
    const sx = (((tm * .5 + ph * .3) % 1.6) - .3) * R * 2 - R, sg = ctx.createLinearGradient(sx - R * .3, -R, sx + R * .3, R);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.6)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();
    hexPath(R, -Math.PI / 2); ctx.strokeStyle = 'rgba(236,252,255,.95)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  } else {
    const R = r * pu;
    const pg = ctx.createLinearGradient(0, -R * 3, 0, R * 3); pg.addColorStop(0, 'rgba(255,224,138,0)'); pg.addColorStop(.5, 'rgba(255,236,170,.5)'); pg.addColorStop(1, 'rgba(255,224,138,0)');
    ctx.fillStyle = pg; ctx.fillRect(-R * .16, -R * 3, R * .32, R * 6);                       // light pillar
    const hg = ctx.createRadialGradient(0, 0, R * 1.35, 0, 0, R * 1.75); hg.addColorStop(0, 'rgba(255,230,150,0)'); hg.addColorStop(.5, 'rgba(255,230,150,.5)'); hg.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, R * 1.75, 0, 6.283); ctx.fill();         // halo ring
    glow(-R * 1.55, 0, R * .7, 'rgba(255,240,180,1)', .5); glow(R * 1.55, 0, R * .7, 'rgba(255,240,180,1)', .5);   // sun dogs
    ctx.save(); ctx.rotate(tm * .5 + ph); ctx.strokeStyle = 'rgba(255,236,170,.45)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0; k < 12; k++) { const a = k * .5236, r1 = k % 2 ? 1.35 : 1.6; ctx.moveTo(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05); ctx.lineTo(Math.cos(a) * R * r1, Math.sin(a) * R * r1); }
    ctx.stroke(); ctx.restore();
    const dg = ctx.createRadialGradient(-R * .3, -R * .3, R * .05, 0, 0, R); dg.addColorStop(0, '#FFFFFF'); dg.addColorStop(.35, '#FFF4C2'); dg.addColorStop(.75, col); dg.addColorStop(1, '#E39A2C');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill(); ctx.strokeStyle = 'rgba(255,246,200,.9)'; ctx.lineWidth = 1.4; ctx.stroke();
  }
}
export function drawPlasmaOrb(it, t, r, pu, ph) {                      // Crimson blue orb: glass plasma globe with smooth living filaments
  const R = r * pu, tm = reduceMotion ? 0 : t;
  const g = ctx.createRadialGradient(-R * .2, -R * .25, R * .05, 0, 0, R); g.addColorStop(0, '#F6FBFF'); g.addColorStop(.35, '#8CC4FF'); g.addColorStop(.75, '#2F58C8'); g.addColorStop(1, '#14308A');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R * .98, 0, 6.283); ctx.clip();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    const a = tm * .9 + k * 1.2566 + ph, a2 = a + Math.sin(tm * 2 + k) * .5, ex = Math.cos(a2) * R, ey = Math.sin(a2) * R;
    const cx = Math.cos(a + .6) * R * .55 + Math.sin(tm * 6 + k * 2) * 3, cy = Math.sin(a + .6) * R * .55 + Math.cos(tm * 6 + k * 2) * 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.strokeStyle = 'rgba(130,190,255,.35)'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = 'rgba(235,246,255,.9)'; ctx.lineWidth = 1.3; ctx.stroke();
  }
  ctx.lineCap = 'butt'; ctx.globalCompositeOperation = 'source-over'; ctx.restore();
  glow(0, 0, R * .55, 'rgba(255,255,255,1)', .5 + .15 * Math.sin(tm * 7 + ph));
  const rg = ctx.createLinearGradient(-R, -R, R, R); rg.addColorStop(0, 'rgba(225,242,255,.95)'); rg.addColorStop(1, 'rgba(80,120,220,.5)');
  ctx.strokeStyle = rg; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, R * .82, 3.4, 4.5); ctx.stroke(); ctx.lineCap = 'butt';
}
export function drawStormCoin(it, t, r, pu, ph, col) {                 // Crimson gold orb: bevelled coin with a reeded rim, embossed bolt and a travelling shine
  const tm = reduceMotion ? 0 : t, R = r * pu, sx = reduceMotion ? 1 : .62 + .38 * Math.abs(Math.cos(tm * 2.2 + ph));
  ctx.save(); ctx.scale(sx, 1);
  const rg = ctx.createLinearGradient(-R, -R, R, R); rg.addColorStop(0, '#FFF1B0'); rg.addColorStop(.5, '#C98A14'); rg.addColorStop(1, '#FFE48A');
  ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,0,.55)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let k = 0; k < 24; k++) { const a = k * .2618; ctx.moveTo(Math.cos(a) * R * .9, Math.sin(a) * R * .9); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); }
  ctx.stroke();
  const fg = ctx.createRadialGradient(-R * .25, -R * .3, R * .05, 0, 0, R * .86); fg.addColorStop(0, '#FFF6C8'); fg.addColorStop(.45, col); fg.addColorStop(1, '#D99A1E');
  ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, R * .86, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(255,246,190,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, R * .72, 0, 6.283); ctx.stroke();
  const bolt = (ox, oy) => { ctx.beginPath(); ctx.moveTo(r * .12 + ox, -r * .62 + oy); ctx.lineTo(-r * .38 + ox, r * .08 + oy); ctx.lineTo(-r * .04 + ox, r * .08 + oy); ctx.lineTo(-r * .22 + ox, r * .66 + oy); ctx.lineTo(r * .4 + ox, -r * .14 + oy); ctx.lineTo(r * .04 + ox, -r * .14 + oy); ctx.closePath(); };
  bolt(.9, 1.1); ctx.fillStyle = 'rgba(120,70,0,.55)'; ctx.fill();
  bolt(-.8, -.9); ctx.fillStyle = 'rgba(255,250,210,.8)'; ctx.fill();
  bolt(0, 0); ctx.fillStyle = '#7A4A00'; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.clip();
  const bx = (((tm * .7 + ph) % 2) - .5) * R * 2.4 - R * 1.2, sg = ctx.createLinearGradient(bx - R * .25, -R, bx + R * .25, R);
  sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.restore(); ctx.restore();
}
export function drawFrostDisc(it, col, pu, t) {                        // Aurora power-up: frosted lens with an aurora-coloured ring
  const R = it.r * pu, tm = reduceMotion ? 0 : t;
  const bg = ctx.createRadialGradient(-R * .25, -R * .3, R * .1, 0, 0, R); bg.addColorStop(0, 'rgba(34,96,128,.94)'); bg.addColorStop(1, 'rgba(5,26,48,.96)');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(215,246,255,.5)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; ctx.moveTo(Math.cos(a) * R * .62, Math.sin(a) * R * .62); ctx.lineTo(Math.cos(a) * R * .78, Math.sin(a) * R * .78); }
  ctx.stroke();
  ctx.strokeStyle = aurGrad(R, tm * .8 + (it.ph || 0)); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, 0, R * .9, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = 'rgba(235,252,255,.85)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, R * .66, 3.5, 4.5); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R * .88, 0, 6.283); ctx.clip();
  const sx = (((tm * .6 + (it.ph || 0) * .2) % 1.7) - .35) * R * 2 - R, sg = ctx.createLinearGradient(sx - R * .3, -R, sx + R * .3, R);
  sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.28)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.restore();
}
export function drawForgeDisc(it, col, pu, t) {                        // Crimson power-up: storm-forged iron medallion, toothed rim, ember ring
  const R = it.r * pu, tm = reduceMotion ? 0 : t, ph = it.ph || 0;
  const bg = ctx.createRadialGradient(-R * .25, -R * .3, R * .1, 0, 0, R); bg.addColorStop(0, '#4A1C20'); bg.addColorStop(1, '#150508');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
  ctx.strokeStyle = '#7A4636'; ctx.lineWidth = 3; ctx.beginPath();
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; ctx.moveTo(Math.cos(a) * R * .9, Math.sin(a) * R * .9); ctx.lineTo(Math.cos(a) * R * 1.06, Math.sin(a) * R * 1.06); }
  ctx.stroke();
  const rg = ctx.createLinearGradient(-R, -R, R, R); rg.addColorStop(0, '#FFC9A0'); rg.addColorStop(.5, '#8A3A2A'); rg.addColorStop(1, '#FFB080');
  ctx.strokeStyle = rg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * .92, 0, 6.283); ctx.stroke();
  const fl = .5 + .5 * Math.sin(tm * 5 + ph);
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = col; ctx.globalAlpha *= .22 + .2 * fl; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, R * .7, 0, 6.283); ctx.stroke();
  ctx.globalAlpha /= (.22 + .2 * fl); ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * .7, 0, 6.283); ctx.stroke();
  glow(0, 0, R * .9, 'rgba(255,90,40,1)', .12 + .1 * fl);
}
export function drawIceTail(it, CS, t) {                               // Aurora comet: two braided ribbons of cold light and drifting snow sparkles
  const r = it.r, L = 170, tm = reduceMotion ? 0 : t;
  for (const sd of [0, Math.PI]) {
    const g = ctx.createLinearGradient(0, 0, 0, -L); g.addColorStop(0, 'rgba(225,250,255,.85)'); g.addColorStop(.4, 'rgba(120,225,255,.45)'); g.addColorStop(.75, 'rgba(190,140,255,.2)'); g.addColorStop(1, 'rgba(60,170,255,0)');
    const N = 14, Lp = [], Rp = [];
    for (let i = 0; i <= N; i++) { const u = i / N, cx = Math.sin(i * .5 + tm * 4 + sd) * r * (.25 + .9 * u), w = r * .42 * (1 - u) + .5; Lp.push([cx - w, -L * u]); Rp.push([cx + w, -L * u]); }
    ctx.fillStyle = g; ctx.beginPath(); Lp.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); for (let i = N; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]); ctx.closePath(); ctx.fill();
  }
  if (!reduceMotion) {
    ctx.strokeStyle = 'rgba(235,252,255,.9)'; ctx.lineWidth = 1; const prevA = ctx.globalAlpha;
    for (let k = 0; k < 6; k++) { const u = (tm * .8 + k * .17) % 1, x = Math.sin(k * 5.1 + tm * 3) * (6 + u * 10), y = -20 - u * 135; ctx.globalAlpha = prevA * (1 - u) * .85; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke(); }
    ctx.globalAlpha = prevA;
  }
}
export function drawIceHead(it, t) {                                   // Aurora comet head: faceted crystal prism, light fixed while it wobbles
  const R = it.r, tm = reduceMotion ? 0 : t;
  ctx.rotate(-(reduceMotion ? 0 : t * 2.2)); ctx.rotate(Math.sin(tm * 2.4) * .12);
  const P = [[0, R * 1.55], [R * .82, R * .3], [R * .62, -R * .95], [0, -R * 1.2], [-R * .62, -R * .95], [-R * .82, R * .3]];
  const gl = ctx.createLinearGradient(-R, -R, 0, R); gl.addColorStop(0, '#FFFFFF'); gl.addColorStop(1, '#9ADFFF');
  const gd = ctx.createLinearGradient(0, -R, R, R); gd.addColorStop(0, '#6EC8F5'); gd.addColorStop(1, '#2A78C0');
  polyPath([P[0], P[5], P[4], P[3]]); ctx.fillStyle = gl; ctx.fill();
  polyPath([P[0], P[1], P[2], P[3]]); ctx.fillStyle = gd; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P[4][0], P[4][1]); ctx.lineTo(0, -R * .1); ctx.lineTo(P[2][0], P[2][1]); ctx.moveTo(0, -R * 1.2); ctx.lineTo(0, R * 1.55); ctx.stroke();
  glow(0, -R * .1, R * .8, 'rgba(255,255,255,1)', .4 + .2 * Math.sin(tm * 6));
  polyPath(P); ctx.strokeStyle = '#46C8FF'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
}
export function drawMagmaTail(it, CS, t) {                             // Crimson comet: dark smoke plume, hot flame layers and slanted embers
  const r = it.r, L = 190, tm = reduceMotion ? 0 : t, sw = Math.sin(tm * 6) * 4;
  const plume = (w, len) => { ctx.beginPath(); ctx.moveTo(-r * w, 0); ctx.quadraticCurveTo(-r * w * 1.4 + sw, -len * .5, sw * 1.5, -len); ctx.quadraticCurveTo(r * w * 1.4 + sw, -len * .5, r * w, 0); ctx.closePath(); };
  let g = ctx.createLinearGradient(0, 0, 0, -L); g.addColorStop(0, 'rgba(60,18,22,.7)'); g.addColorStop(1, 'rgba(30,8,12,0)');
  ctx.fillStyle = g; plume(1.5, L); ctx.fill();
  for (const [wd, len, c0, c1] of [[1.25, L * .78, 'rgba(255,90,40,.55)', 'rgba(200,30,20,0)'], [.8, L * .55, 'rgba(255,170,70,.8)', 'rgba(255,90,40,0)'], [.4, L * .34, 'rgba(255,245,200,.95)', 'rgba(255,200,110,0)']]) {
    g = ctx.createLinearGradient(0, 0, 0, -len); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; plume(wd, len); ctx.fill();
  }
  if (!reduceMotion) {
    ctx.lineCap = 'round'; ctx.lineWidth = 1.6; const prevA = ctx.globalAlpha;
    for (let k = 0; k < 8; k++) { const u = (tm * .9 + k * .125) % 1, x = Math.sin(k * 3.7) * r * 1.3 * (.4 + u), y = -r * .8 - u * L * .85; ctx.globalAlpha = prevA * (1 - u) * .9; ctx.strokeStyle = k % 2 ? '#FFB36B' : '#FF6A2E'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(k * 2.1) * 3, y - 7); ctx.stroke(); }
    ctx.globalAlpha = prevA; ctx.lineCap = 'butt';
  }
}
export function drawMagmaHead(it, t) {                                 // Crimson comet head: charred crust with glowing fissures and a white-hot leading face
  const R = it.r * 1.15, tm = reduceMotion ? 0 : t, rot = reduceMotion ? 0 : t * 2.2, pulse = .7 + .3 * Math.sin(tm * 5);
  ctx.save(); ctx.rotate(-rot); glow(0, R * .6, R * 1.5, 'rgba(255,150,60,1)', .45 * pulse); ctx.restore();
  const cg = ctx.createRadialGradient(-R * .35, -R * .4, R * .1, 0, 0, R * 1.15); cg.addColorStop(0, '#5A3A3C'); cg.addColorStop(.55, '#2E171B'); cg.addColorStop(1, '#140709');
  cometRock(8, R, 3); ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = 'rgba(255,100,40,.85)'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.save(); cometRock(8, R * .98, 3); ctx.clip(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const c of [[[-.62, -.22], [-.12, .1], [.52, -.3]], [[-.12, .1], [.1, .72]], [[.2, -.7], [.05, -.2]]]) {
    for (const [lw, col] of [[4, 'rgba(255,90,30,' + (.3 * pulse) + ')'], [1.6, 'rgba(255,190,110,' + pulse + ')']]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); c.forEach((q, i) => i ? ctx.lineTo(q[0] * R, q[1] * R) : ctx.moveTo(q[0] * R, q[1] * R)); ctx.stroke();
    }
  }
  ctx.restore();
}
export function drawShard(it, t) {                                     // Aurora shard: a long faceted icicle spear with a glinting tip
  const r = it.r, tm = reduceMotion ? 0 : t;
  ctx.save(); ctx.translate(it.x, it.y);
  glow(0, 0, 34, 'rgba(150,220,255,1)', .5);
  const tg = ctx.createLinearGradient(0, 0, 0, -60);
  tg.addColorStop(0, 'rgba(180,235,255,.6)'); tg.addColorStop(1, 'rgba(180,235,255,0)');
  ctx.fillStyle = tg; ctx.fillRect(-r * .35, -60, r * .7, 60);
  const P = [[0, r * 1.95], [r * .62, -r * .2], [r * .38, -r * .95], [0, -r * 1.15], [-r * .38, -r * .95], [-r * .62, -r * .2]];
  const gl = ctx.createLinearGradient(-r, 0, 0, 0); gl.addColorStop(0, '#FFFFFF'); gl.addColorStop(1, '#BDEBFF');
  const gd = ctx.createLinearGradient(0, 0, r, 0); gd.addColorStop(0, '#7FCFF5'); gd.addColorStop(1, '#2F86C8');
  polyPath([P[0], P[5], P[4], P[3]]); ctx.fillStyle = gl; ctx.fill();
  polyPath([P[0], P[1], P[2], P[3]]); ctx.fillStyle = gd; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -r * .95); ctx.lineTo(0, r * 1.7); ctx.stroke();
  ctx.lineJoin = 'round'; polyPath(P); ctx.strokeStyle = '#7FD6FF'; ctx.lineWidth = 1.8; ctx.stroke();
  glow(0, r * 1.85, 10, 'rgba(255,255,255,1)', .55 + .3 * Math.sin(tm * 14 + it.x));
  ctx.restore();
}
export function drawCloud(it, t) {                                     // Crimson thundercloud: shaded puffs lit red from below, lightning building inside
  const soon = it.n > 0 && it.fire < .45, fl = soon && Math.sin(t * 40) > 0, a = it.gone > 0 ? Math.min(1, it.gone / .5) : 1;
  ctx.save(); ctx.translate(it.x, it.y); ctx.globalAlpha = a;
  if (soon) glow(0, 22, 70, 'rgba(255,107,138,1)', fl ? .55 : .3);
  for (const [dx, dy, r] of [[-38, 10, 20], [-24, -2, 24], [-6, -10, 28], [14, -6, 27], [32, 4, 24], [42, 12, 17], [-14, 12, 24], [10, 14, 24], [28, 14, 20]]) {
    const g = ctx.createRadialGradient(dx - r * .25, dy - r * .35, r * .1, dx, dy, r); g.addColorStop(0, 'rgba(106,74,114,.95)'); g.addColorStop(.6, 'rgba(58,34,56,.9)'); g.addColorStop(1, 'rgba(30,15,28,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx, dy, r, 0, 6.283); ctx.fill();
  }
  for (const [dx, dy, r] of [[-14, -14, 15], [12, -12, 16], [-30, -2, 11]]) {
    const g = ctx.createRadialGradient(dx - r * .3, dy - r * .3, 1, dx, dy, r); g.addColorStop(0, 'rgba(132,100,142,.85)'); g.addColorStop(1, 'rgba(74,48,84,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx, dy, r, 0, 6.283); ctx.fill();
  }
  glow(0, 22, 56, 'rgba(255,70,60,1)', .12 + (soon ? .25 : 0));
  if (soon) glow(0, 4, 36, 'rgba(255,200,170,1)', fl ? .5 : .15);
  if (soon) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [lw, c] of [[5, 'rgba(255,107,138,.35)'], [2.5, fl ? '#FFFFFF' : '#FF8FA3']]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-4, 26); ctx.lineTo(4, 36); ctx.lineTo(-3, 42); ctx.lineTo(3, 52); ctx.stroke(); }
  }
  ctx.restore();
}
export function drawGateSt(it, t, st) {                                // Aurora / Crimson laser gate (same hit row as before)
  const y = it.y, L = it.gx - it.gap / 2, R = it.gx + it.gap / 2, tm = reduceMotion ? 0 : t, segs = [[exL(), L], [R, exR()]];
  ctx.save();
  if (st === 2) {                                               // frozen light barrier: glass bar, travelling shimmer, gradient icicles
    const bg = ctx.createLinearGradient(0, y - 5, 0, y + 5); bg.addColorStop(0, '#F4FDFF'); bg.addColorStop(.5, '#8FDDFF'); bg.addColorStop(1, '#3E9AD8');
    const ic = ctx.createLinearGradient(0, 0, 0, 18); ic.addColorStop(0, 'rgba(244,253,255,.95)'); ic.addColorStop(1, 'rgba(127,208,247,.55)');
    for (const [a, b] of segs) {
      if (b - a < 2) continue;
      ctx.fillStyle = bg; ctx.fillRect(a, y - 5, b - a, 10);
      ctx.globalCompositeOperation = 'lighter';
      const ag = ctx.createLinearGradient(0, y - 22, 0, y + 22); ag.addColorStop(0, 'rgba(94,255,190,0)'); ag.addColorStop(.5, 'rgba(120,220,255,.28)'); ag.addColorStop(1, 'rgba(190,120,255,0)');
      ctx.fillStyle = ag; ctx.fillRect(a, y - 22, b - a, 44);
      const sx = a + ((tm * 140) % (b - a + 120)) - 60, sg = ctx.createLinearGradient(sx - 40, 0, sx + 40, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.7)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(a, y - 5, b - a, 10);
      ctx.globalCompositeOperation = 'source-over';
      for (let x = a + 6; x < b - 6; x += 13) for (const sgn of [1, -1]) {
        const h = (sgn > 0 ? 7 : 5) + 15 * Math.pow(Math.abs(Math.sin(x * .37 + (sgn < 0 ? 1.7 : 0))), 1.6);
        ctx.save(); ctx.translate(x, y + sgn * 5); ctx.scale(1, sgn); ctx.fillStyle = ic;
        ctx.beginPath(); ctx.moveTo(-3.6, 0); ctx.quadraticCurveTo(-1, h * .55, .6, h); ctx.quadraticCurveTo(1.2, h * .5, 3.6, 0); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    for (const px of [L, R]) {
      glow(px, y, 40, 'rgba(150,230,255,1)', .85);
      ctx.save(); ctx.translate(px, y);
      const hg = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12); hg.addColorStop(0, '#FFFFFF'); hg.addColorStop(.6, '#9CE4FF'); hg.addColorStop(1, '#3C9AD6');
      hexPath(11, Math.PI / 6); ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = '#E6FAFF'; ctx.lineWidth = 1.6; ctx.stroke();
      hexPath(5.5, Math.PI / 6); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill(); ctx.restore();
    }
  } else {                                                      // plasma arc fence between two forged coil pylons
    ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
    for (const [a, b] of segs) {
      if (b - a < 2) continue;
      for (let sd = 0; sd < (ST.lowFx ? 2 : 3); sd++) {
        const amp = 5 + sd * 3, pts = [[a, y]];
        for (let x = a + 16; x < b; x += 16) pts.push([x, y + (reduceMotion ? 0 : (Math.random() - .5) * amp * 2) + Math.sin(x * .05 + tm * 8 + sd * 2) * amp * .5]);
        pts.push([b, y]);
        for (const [c, lw] of [['rgba(255,100,40,.5)', 5], ['rgba(255,246,214,.95)', 1.6]]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const px of [L, R]) {
      glow(px, y, 40, 'rgba(255,110,40,1)', .8);
      ctx.save(); ctx.translate(px, y);
      const bg = ctx.createLinearGradient(-8, 0, 8, 0); bg.addColorStop(0, '#1A0A0D'); bg.addColorStop(.5, '#5A2A2E'); bg.addColorStop(1, '#1A0A0D');
      ctx.fillStyle = bg; ctx.fillRect(-8, -20, 16, 40); ctx.strokeStyle = '#FF7A2E'; ctx.lineWidth = 1.2; ctx.strokeRect(-8, -20, 16, 40);
      for (let k = -1; k <= 1; k++) { ctx.strokeStyle = 'rgba(255,150,70,' + (.55 + .3 * Math.sin(tm * 6 + k * 1.4)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, k * 10); ctx.lineTo(8, k * 10); ctx.stroke(); }
      glow(0, -22, 18, 'rgba(255,180,90,1)', .9);
      const og = ctx.createRadialGradient(-1, -23, 0, 0, -22, 5); og.addColorStop(0, '#FFFFFF'); og.addColorStop(1, '#FF9A3D'); ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, -22, 5, 0, 6.283); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}
const acGrad = [null, null, null];                                     // one gradient per layer, rebuilt only when the screen height changes
let acH = -1;
export function drawAuroraCurtains(t, pulse) {                         // Aurora sky: rays of light rising from the ribbons, bright at the hem, fading upward
  const a = ST.uw[2]; if (a < .02) return;
  const tm = reduceMotion ? 0 : t, step = ST.lowFx ? 10 : 6, layers = ST.lowFx ? 2 : 3, Hm = ST.H * .27;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (acH !== Hm) { acGrad[0] = acGrad[1] = acGrad[2] = null; acH = Hm; }
  for (let j = 0; j < layers; j++) {
    if (!acGrad[j]) { const g = ctx.createLinearGradient(0, 0, 0, -Hm); g.addColorStop(0, 'rgba(' + AUR[j] + ',.13)'); g.addColorStop(.4, 'rgba(' + AUR[j] + ',.05)'); g.addColorStop(1, 'rgba(' + AUR[j] + ',0)'); acGrad[j] = g; }
    ctx.fillStyle = acGrad[j]; ctx.globalAlpha = a * (.8 + pulse * .3);
    for (let x = -10; x <= ST.W + 10; x += step) {
      const y = ST.H * (.16 + .13 * j) + Math.sin(x * .011 + tm * (.5 + .2 * j) + j * 2) * (30 + j * 12) + Math.sin(x * .027 - tm * .7) * (14 + j * 5);
      const k = .5 + .5 * Math.sin(x * .021 + tm * .45 + j * 1.7), k2 = .5 + .5 * Math.sin(x * .047 - tm * .3 + j * 2.3), h = Hm * (.35 + .65 * (k * .6 + k2 * .4));
      ctx.translate(x, y); ctx.fillRect(-step * .6, -h, step * 1.2, h); ctx.translate(-x, -y);
    }
  }
  ctx.restore();
}
export function drawAuroraSky(t, a, n) {                               // Aurora foreground: diamond dust, slow glints, a faint polar halo
  ctx.save(); ctx.globalAlpha = a;
  const cx = ST.W * .5 + Math.sin(t * .05) * 20, cy = ST.H * .02, hr = ST.H * .5;
  ctx.lineWidth = 6;
  for (const [dr, c] of [[6, 'rgba(255,170,190,.05)'], [0, 'rgba(190,255,200,.06)'], [-6, 'rgba(130,200,255,.07)']]) { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(cx, cy, hr + dr, .2, Math.PI - .2); ctx.stroke(); }
  const nd = n(16);
  ctx.fillStyle = 'rgba(235,252,255,1)'; ctx.strokeStyle = 'rgba(235,252,255,.8)'; ctx.lineWidth = 1;
  for (let i = 0; i < nd; i++) {
    const x = fxRnd(i * 1.7) * ST.W + Math.sin(t * .3 + i) * 12, y = ((fxRnd(i * 1.7 + 50) * (ST.H + 40) + t * (10 + fxRnd(i + 90) * 16)) % (ST.H + 40)) - 20, sz = .8 + fxRnd(i + 130) * 1.4;
    if (!bgOn(x, 8)) continue;
    ctx.globalAlpha = a * (.35 + .5 * Math.abs(Math.sin(t * 1.4 + i)));
    ctx.beginPath(); ctx.arc(x, y, sz, 0, 6.283); ctx.fill();
    if (sz > 1.6) { ctx.beginPath(); ctx.moveTo(x - sz * 3, y); ctx.lineTo(x + sz * 3, y); ctx.moveTo(x, y - sz * 3); ctx.lineTo(x, y + sz * 3); ctx.stroke(); }
  }
  for (let i = 0; i < n(3); i++) {
    const pl = Math.max(0, Math.sin(t * .7 + i * 2.3)); if (pl < .05) continue;
    const x = fxRnd(i + 200) * ST.W, y = ((fxRnd(i + 210) * ST.H + t * 6) % ST.H), s = 8 + 12 * pl * pl * pl;
    if (!bgOn(x, s * 1.6 + 4)) continue;
    ctx.globalAlpha = a * pl; glow(x, y, s * 1.6, 'rgba(210,245,255,1)', .5);
    ctx.strokeStyle = 'rgba(240,252,255,.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s * 1.4); ctx.lineTo(x, y + s * 1.4); ctx.stroke();
  }
  ctx.restore();
}
export function drawStormClouds(t, pulse) {                            // Crimson sky: slow storm-cloud banks, lit red from beneath, with faint sheet flashes inside
  const a = ST.uw[3]; if (a < .02) return;
  const tm = reduceMotion ? 0 : t, np = ST.lowFx ? 7 : 12, fl = reduceMotion ? 0 : Math.max(Math.pow(Math.max(0, Math.sin(tm * .73 + Math.sin(tm * 2.1) * 1.7)), 14), ST.stormFlash * .9);
  ctx.save();
  for (let i = 0; i < np; i++) {
    const lay = i % 3, r = 70 + fxRnd(i) * 70 + lay * 10, x = fxRnd(i + 11) * (ST.W + 160) - 80 + Math.sin(tm * .1 + i) * 30, span = ST.H + r * 2, y = ((fxRnd(i + 23) * span + tm * (8 + lay * 6)) % span) - r;
    if (!bgOn(x, r + 4)) continue;
    ctx.globalAlpha = a * (.5 + .12 * lay);
    ctx.save(); ctx.translate(x, y); ctx.scale(1, .62);
    const g = ctx.createRadialGradient(-r * .2, -r * .25, r * .1, 0, 0, r); g.addColorStop(0, 'rgba(66,22,38,.7)'); g.addColorStop(.55, 'rgba(40,10,24,.4)'); g.addColorStop(1, 'rgba(24,4,14,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const ug = ctx.createRadialGradient(0, r * .35, 0, 0, r * .35, r * .8); ug.addColorStop(0, 'rgba(255,70,50,.12)'); ug.addColorStop(1, 'rgba(255,70,50,0)');
    ctx.fillStyle = ug; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
    if (fl > .04) { const fg = ctx.createRadialGradient(-r * .2, -r * .2, 0, -r * .2, -r * .2, r * .8); fg.addColorStop(0, 'rgba(255,150,120,' + (fl * .22) + ')'); fg.addColorStop(1, 'rgba(255,150,120,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill(); }
    ctx.restore();
  }
  // v48-v1: a far layer (small, slow, dark) and a near layer (big, quicker, lit from inside by sheet lightning); puffs are cached sprites
  if (!stormPuffs) {
    const mkp = (n, stops, glowTop) => {
      const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), h = n / 2;
      let gr = g.createRadialGradient(h * .8, h * .7, h * .1, h, h, h); stops.forEach(q => gr.addColorStop(q[0], q[1])); g.fillStyle = gr; g.fillRect(0, 0, n, n);
      if (glowTop) { g.globalCompositeOperation = 'lighter'; gr = g.createRadialGradient(h, h * 1.4, 0, h, h * 1.4, h * .85); gr.addColorStop(0, 'rgba(255,60,60,.14)'); gr.addColorStop(1, 'rgba(255,60,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); }
      return c;
    };
    stormPuffs = { far: mkp(96, [[0, 'rgba(58,16,34,.65)'], [.6, 'rgba(34,8,22,.35)'], [1, 'rgba(24,4,14,0)']], false), near: mkp(192, [[0, 'rgba(78,26,46,.7)'], [.55, 'rgba(46,12,28,.45)'], [1, 'rgba(24,4,14,0)']], true) };
  }
  for (let i = 0, nf = ST.lowFx ? 5 : 9; i < nf; i++) {
    const r = 36 + fxRnd(i + 101) * 34, x = fxRnd(i + 111) * (ST.W + 160) - 80, span = ST.H + r * 2, y = ((fxRnd(i + 123) * span + tm * 3.5) % span) - r;
    if (!bgOn(x, r + 2)) continue;
    ctx.globalAlpha = a * .34; ctx.drawImage(stormPuffs.far, x - r, y - r * .5, r * 2, r);
  }
  for (let i = 0, nn = ST.lowFx ? 3 : 5; i < nn; i++) {
    const r = 130 + fxRnd(i + 201) * 80, x = fxRnd(i + 211) * (ST.W + 200) - 100 + Math.sin(tm * .07 + i * 2) * 40, span = ST.H + r * 2, y = ((fxRnd(i + 223) * span + tm * 22) % span) - r;
    if (!bgOn(x, r + 2)) continue;
    ctx.globalAlpha = a * .42; ctx.drawImage(stormPuffs.near, x - r, y - r * .56, r * 2, r * 1.12);
    const fi = reduceMotion ? 0 : Math.max(Math.pow(Math.max(0, Math.sin(tm * (.5 + .17 * i) + i * 2.1)), 16) * .5, ST.stormFlash * .6);
    if (fi > .03) {                                                    // sheet lightning from inside
      ctx.save(); ctx.translate(x, y); ctx.scale(1, .56); ctx.globalCompositeOperation = 'lighter';
      const fg = ctx.createRadialGradient(0, -r * .05, 0, 0, -r * .05, r * .75); fg.addColorStop(0, 'rgba(255,175,205,' + fi * .22 + ')'); fg.addColorStop(1, 'rgba(255,175,205,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill(); ctx.restore();
    }
  }
  ctx.restore();
}
const bandC = {}, SH_COL = [[120, 255, 210], [110, 170, 255], [190, 140, 255]];
function bandSprite(kind) {                                            // a long soft polar-light band, as wide as the whole map and seamless when tiled
  const w = Math.round(ST.W), h = Math.round(ST.H * .3), key = w + '|' + h + '|' + ST.lowFx;
  if (bandC[kind] && bandC[kind].key === key) return bandC[kind].c;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), rnd = rng32(kind === 'far' ? 0xA11 : 0xB22);
  const f1 = 1 + ((rnd() * 2) | 0), f2 = 3 + ((rnd() * 2) | 0), p1 = rnd() * 6, p2 = rnd() * 6, step = ST.lowFx ? 6 : 3;
  for (let x = 0; x < w; x += step) {
    const u = PTAU * x / w, y = h * .5 + h * .12 * Math.sin(u * f1 + p1) + h * .05 * Math.sin(u * f2 + p2), m = .5 + .5 * Math.cos(u * (kind === 'far' ? 1 : 2) + (kind === 'far' ? 0 : 1.5));
    const col = mixc(SH_COL[kind === 'far' ? 0 : 2], SH_COL[1], m), lg = g.createLinearGradient(0, y - h * .3, 0, y + h * .3);
    lg.addColorStop(0, rgb(col, 0)); lg.addColorStop(.5, rgb(col, .55)); lg.addColorStop(1, rgb(col, 0)); g.fillStyle = lg; g.fillRect(x, y - h * .3, step + 1, h * .6);
  }
  bandC[kind] = { key, c }; return c;
}
export function drawAuroraBands(t) {                                          // Aurora: polar-light bands at two depths with a faint shimmer
  const a = ST.uw[2]; if (a < .02) return;
  const rm = reduceMotion, tm = rm ? 0 : t, w = Math.round(ST.W);
  ctx.save();
  for (const [kind, y0, al, sp] of [['far', .2, .2, 4], ['near', .46, .13, 9]]) {
    const c = bandSprite(kind), x = -((tm * sp) % w), sh = rm ? 1 : .82 + .18 * Math.sin(tm * .5 + (kind === 'far' ? 0 : 2)), yy = ST.H * y0 + (rm ? 0 : Math.sin(tm * .06 + y0 * 9) * 18) - c.height * .5;
    ctx.globalAlpha = a * al * sh; ctx.drawImage(c, x, yy); ctx.drawImage(c, x + w, yy);
  }
  ctx.restore();
}
export function drawIceShards(t) {                                            // Aurora: a far field of small, dim, tumbling ice shards at the slowest depth
  const a = ST.uw[2]; if (a < .02) return;
  if (!shardS) {
    shardS = [[[-13, 0], [-4, -5], [10, -3], [14, 1], [3, 6]], [[-12, 2], [-2, -7], [11, -2], [12, 3], [-3, 6]], [[-14, -1], [-5, -6], [9, -4], [14, 0], [5, 7], [-6, 5]]].map(pts => {
      const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.translate(16, 16); g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath();
      const gr = g.createLinearGradient(-14, -6, 14, 6); gr.addColorStop(0, 'rgba(225,250,255,.85)'); gr.addColorStop(1, 'rgba(110,200,240,.5)'); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.stroke(); return c;
    });
  }
  const rm = reduceMotion, tm = rm ? 0 : t, n = ST.lowFx ? 10 : 22;
  ctx.save(); ctx.globalAlpha = a * .28;
  for (let i = 0; i < n; i++) {
    const sz = 5 + fxRnd(i + 301) * 8, x = fxRnd(i + 311) * (ST.W + 100) - 50 + Math.sin(tm * .08 + i) * 10, span = ST.H + 60, y = ((fxRnd(i + 321) * span + tm * (3 + fxRnd(i + 331) * 3)) % span) - 30;
    if (!bgOn(x, sz * 1.5 + 2)) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(fxRnd(i + 341) * 6.28 + tm * (.1 + fxRnd(i + 351) * .25) * (i % 2 ? 1 : -1)); ctx.drawImage(shardS[i % 3], -sz, -sz, sz * 2, sz * 2); ctx.restore();
  }
  ctx.restore();
}
function buildRift(key, S, RH) {                                       // the rift: one cached, full-map seam, torn at the edges with light leaking out
  const w = Math.round(ST.W), c = document.createElement('canvas'); c.width = Math.ceil(w * S); c.height = Math.ceil(RH * S); const g = c.getContext('2d'); g.scale(S, S);
  const rnd = rng32(0x5EA11), R = (a, b) => a + rnd() * (b - a), slope = -RH * .28 / w, y0 = x => RH * .5 + slope * (x - w / 2), pts = [];
  let y = y0(-10);
  for (let x = -10; x <= w + 10; x += 12) { y += R(-9, 9) + (y0(x) - y) * .12; if (rnd() < .06) y += R(-20, 20); pts.push([x, y]); }
  const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); };
  g.lineCap = g.lineJoin = 'round';
  g.strokeStyle = 'rgba(14,1,6,.7)'; g.lineWidth = 40; path(); g.stroke(); g.strokeStyle = 'rgba(6,0,3,.95)'; g.lineWidth = 22; path(); g.stroke();   // dark lips of the tear
  for (let i = 0; i < pts.length - 1; i += ST.lowFx ? 6 : 3) {                                // jagged teeth on both edges
    const p0 = pts[i], p1 = pts[i + 1], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, sg = rnd() < .5 ? -1 : 1, h = R(6, 16);
    g.fillStyle = 'rgba(30,4,12,.85)'; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p0[0] + dx / l * 8, p0[1] + dy / l * 8); g.lineTo(p0[0] + dx / l * 3 + nx * sg * h, p0[1] + dy / l * 3 + ny * sg * h); g.closePath(); g.fill();
  }
  for (let k = 0, n = ST.lowFx ? 5 : 9; k < n; k++) {                                         // light leaking out
    const q = pts[(rnd() * pts.length) | 0], rr = R(50, 110), gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], rr);
    gr.addColorStop(0, 'rgba(255,90,50,.22)'); gr.addColorStop(1, 'rgba(255,90,50,0)'); g.fillStyle = gr; g.beginPath(); g.arc(q[0], q[1], rr, 0, 6.283); g.fill();
    for (let j = 0, m = ST.lowFx ? 1 : 3; j < m; j++) {
      const a = (rnd() < .5 ? -1 : 1) * 1.57 + R(-.6, .6) + Math.atan2(slope, 1), l = R(30, 80), ex = q[0] + Math.cos(a) * l, ey = q[1] + Math.sin(a) * l, lg = g.createLinearGradient(q[0], q[1], ex, ey);
      lg.addColorStop(0, 'rgba(255,170,110,.3)'); lg.addColorStop(1, 'rgba(255,170,110,0)'); g.strokeStyle = lg; g.lineWidth = 1.5; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(ex, ey); g.stroke();
    }
  }
  for (const [lw, col] of [[12, 'rgba(255,60,40,.22)'], [5.5, 'rgba(255,140,70,.5)'], [1.8, 'rgba(255,238,222,.8)']]) { g.strokeStyle = col; g.lineWidth = lw; path(); g.stroke(); }
  return { key, c };
}
export function drawRift(t) {                                                 // Crimson: a far, slow seam that drifts down like every other layer and stays dim where the moth flies
  const a = ST.uw[3]; if (a < .02) return;
  const S = ST.lowFx ? 1 : Math.min(ST.DPR, 2), RH = Math.round(ST.H * .42), key = Math.round(ST.W) + '|' + RH + '|' + S + '|' + ST.lowFx;
  if (!riftC || riftC.key !== key) riftC = buildRift(key, S, RH);
  const rm = reduceMotion, span = ST.H + RH, y = (((rm ? ST.H * .2 : t * 5) + span * .35) % span) - RH, cy = y + RH * .5, lane = 1 - .55 * Math.max(0, Math.min(1, (cy - ST.H * .58) / (ST.H * .3)));
  ctx.save(); ctx.globalAlpha = Math.min(.7, a * lane * (.62 * (rm || ST.lowFx ? .9 : .8 + .15 * Math.sin(t * .7)) + ST.stormFlash * .12)); ctx.drawImage(riftC.c, 0, y, ST.W, RH); ctx.restore();
}
export function drawStormSky(t, a, n) {                                // Crimson foreground: wind gusts and slanted rain in two parallax layers
  const tm = reduceMotion ? 0 : t;
  ctx.save();
  for (let k = 0; k < 3; k++) {
    const x = ST.W + 200 - ((tm * 60 + k * ST.W * .45) % (ST.W + 400)), y = ST.H * (.2 + .25 * k) + Math.sin(tm * .3 + k) * 20;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(-.32);
    const g = ctx.createLinearGradient(-190, 0, 190, 0); g.addColorStop(0, 'rgba(255,110,90,0)'); g.addColorStop(.5, 'rgba(255,110,90,.07)'); g.addColorStop(1, 'rgba(255,110,90,0)');
    ctx.fillStyle = g; ctx.fillRect(-190, -5, 380, 10); ctx.restore();
  }
  ctx.lineCap = 'round';
  [[n(30), 22, 40, .16, 640, 1.2, 0], [n(36), 12, 22, .09, 420, 1, 100]].forEach(([cnt, l0, l1, al, sp, lw, sd]) => {
    ctx.strokeStyle = 'rgba(255,170,150,' + (al * a) + ')'; ctx.lineWidth = lw; ctx.beginPath();
    const Wd = ST.W + 200;
    for (let i = 0; i < cnt; i++) {
      const len = l0 + fxRnd(i + sd + 7) * (l1 - l0), y0 = ((fxRnd(i + sd + 40) * (ST.H + 60) + tm * sp) % (ST.H + 60)) - 30;
      const x0 = ((((fxRnd(i + sd) * Wd - tm * sp * .28) % Wd) + Wd) % Wd) - 100;
      ctx.moveTo(x0, y0); ctx.lineTo(x0 - len * .28, y0 + len);
    }
    ctx.stroke();
  });
  ctx.restore();
}


// ================= v46: stage-styled lightning warnings + the Aurora ice spike =================
export const clamp01 = v => Math.max(0, Math.min(1, v));
function stormPlate(x, y, sc, locked, t) {                      // Crimson warning marker: a forged plate with ember-lit edges
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  const g = ctx.createLinearGradient(0, -22, 0, 22); g.addColorStop(0, '#4A1C20'); g.addColorStop(1, '#1A0709');
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-20, -22, 40, 44, 7); else ctx.rect(-20, -22, 40, 44);
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = locked ? 'rgba(255,226,168,.9)' : 'rgba(255,110,40,.9)'; ctx.shadowBlur = 12; ctx.strokeStyle = locked ? '#FFE2A8' : '#FF7A2E'; ctx.lineWidth = 2.2; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#FF9A5A'; for (const [rx, ry] of [[-14, -16], [14, -16], [-14, 16], [14, 16]]) { ctx.beginPath(); ctx.arc(rx, ry, 1.6, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = locked ? '#FFF1D6' : '#FFB36B'; ctx.shadowColor = 'rgba(255,120,50,.9)'; ctx.shadowBlur = 8;
  ctx.font = '400 34px MothStorm, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', 0, 11); ctx.shadowBlur = 0;
  ctx.restore();
}
export function drawStormWarn(it, t) {                                 // Crimson Storm: the lane is a charged column: crackling edges, driving rain, a plasma ball swelling at the top
  const x = it.x, hw = it.w / 2 + 10, locked = it.warn <= .3, pr = 1 - it.warn / 1.05, pulse = .5 + .5 * Math.sin(it.warn * (locked ? 45 : 14)), tm = reduceMotion ? 0 : t;
  ctx.save();
  const lg = ctx.createLinearGradient(0, -ST.H * .35, 0, ST.H * 1.35);
  lg.addColorStop(0, 'rgba(255,90,50,' + (.28 + .2 * pr) + ')'); lg.addColorStop(.5, 'rgba(160,20,30,' + (locked ? .3 + .08 * pulse : .14 + .04 * pulse) + ')'); lg.addColorStop(1, 'rgba(90,6,18,.1)');
  ctx.fillStyle = lg; ctx.fillRect(x - hw, -ST.H * .35, hw * 2, ST.H * 1.7);
  ctx.save(); ctx.beginPath(); ctx.rect(x - hw, -ST.H * .35, hw * 2, ST.H * 1.7); ctx.clip();
  ctx.strokeStyle = 'rgba(255,170,130,' + (locked ? .5 : .3) + ')'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath();
  for (let k = 0; k < 12; k++) { const xx = x - hw + fxRnd(k * 3.1) * hw * 2, yy = ((fxRnd(k * 5.3) * (ST.H + 80) + tm * (520 + (k % 4) * 90)) % (ST.H + 80)) - 40; ctx.moveTo(xx, yy); ctx.lineTo(xx - 3, yy + 22); }
  ctx.stroke(); ctx.restore();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
  for (const sd of SIDES) {                                   // crackling filaments crawl down both edges: the exact hit zone
    const pts = []; for (let y = -ST.H * .35; y < ST.H * 1.35; y += 22) pts.push([x + sd * hw + (reduceMotion ? 0 : (Math.random() - .5) * (locked ? 7 : 4)), y]);
    for (const [c, lw] of [['rgba(255,90,40,' + (.35 + .2 * pulse) + ')', 5], ['rgba(255,214,170,' + (.7 + .3 * pulse) + ')', 1.6]]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); }
  }
  if (locked) { ctx.strokeStyle = 'rgba(255,245,220,' + (.6 + .4 * pulse) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, -ST.H * .35); ctx.lineTo(x, ST.H * 1.35); ctx.stroke(); }
  const cr = 14 + pr * 26; glow(x, 6, cr * 3, 'rgba(255,100,40,1)', .5 + .4 * pr);
  const cg = ctx.createRadialGradient(x, 6, 0, x, 6, cr); cg.addColorStop(0, 'rgba(255,255,240,.95)'); cg.addColorStop(.5, 'rgba(255,190,110,.7)'); cg.addColorStop(1, 'rgba(255,90,40,0)');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(x, 6, cr, 0, 6.283); ctx.fill();
  if (!reduceMotion) { ctx.strokeStyle = 'rgba(255,236,200,.9)'; ctx.lineWidth = 1.3; for (let k = 0; k < 5; k++) { const a = Math.random() * 6.283, r0 = cr * .6, r1 = cr * (1.1 + Math.random() * .8); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, 6 + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a + .25) * (r0 + r1) / 2, 6 + Math.sin(a + .25) * (r0 + r1) / 2 + 3); ctx.lineTo(x + Math.cos(a) * r1, 6 + Math.sin(a) * r1); ctx.stroke(); } }
  ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  [150, ST.H * .62].forEach(my => stormPlate(x, my, 1 + .12 * pulse, locked, t));
  ctx.restore();
}
function frostPlate(x, y, sc, locked) {                         // Aurora warning marker: a frosted hexagon plate
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  const g = ctx.createLinearGradient(0, -22, 0, 22); g.addColorStop(0, 'rgba(60,140,180,.92)'); g.addColorStop(1, 'rgba(10,40,70,.95)');
  hexPath(23, Math.PI / 6); ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'rgba(150,235,255,.95)'; ctx.shadowBlur = locked ? 16 : 10; ctx.strokeStyle = locked ? '#FFFFFF' : '#CFF3FF'; ctx.lineWidth = 2.2; ctx.stroke(); ctx.shadowBlur = 0;
  hexPath(16.5, Math.PI / 6); ctx.strokeStyle = 'rgba(220,248,255,.35)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#F4FDFF'; ctx.shadowColor = 'rgba(120,225,255,.95)'; ctx.shadowBlur = 8;
  ctx.font = '600 28px MothIce, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', 0, 10); ctx.shadowBlur = 0;
  ctx.restore();
}
export function drawFrostWarn(it, t) {                                 // Aurora Sea: the lane is a column of frozen light, frost crystals creeping down its edges, ice gem charging at the top
  const x = it.x, hw = it.w / 2 + 10, locked = it.warn <= .3, pr = 1 - it.warn / 1.05, pulse = .5 + .5 * Math.sin(it.warn * (locked ? 45 : 14)), tm = reduceMotion ? 0 : t;
  ctx.save();
  const lg = ctx.createLinearGradient(0, -ST.H * .35, 0, ST.H * 1.35);
  lg.addColorStop(0, 'rgba(160,240,255,' + (.2 + .2 * pr) + ')'); lg.addColorStop(.5, 'rgba(120,200,255,' + (locked ? .26 + .08 * pulse : .12 + .04 * pulse) + ')'); lg.addColorStop(1, 'rgba(190,140,255,.12)');
  ctx.fillStyle = lg; ctx.fillRect(x - hw, -ST.H * .35, hw * 2, ST.H * 1.7);
  ctx.save(); ctx.beginPath(); ctx.rect(x - hw, -ST.H * .35, hw * 2, ST.H * 1.7); ctx.clip();
  const by = ((tm * 300) % (ST.H * 1.7)) - ST.H * .35, bg = ctx.createLinearGradient(0, by - 60, 0, by + 60);       // prism band sliding down the lane
  bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(.5, 'rgba(255,255,255,' + (locked ? .3 : .16) + ')'); bg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = bg; ctx.fillRect(x - hw, by - 60, hw * 2, 120);
  ctx.fillStyle = 'rgba(235,252,255,.9)';
  for (let k = 0; k < 14; k++) { const xx = x - hw + 4 + fxRnd(k * 2.7) * (hw * 2 - 8) + Math.sin(tm * 1.5 + k) * 3, yy = ((fxRnd(k * 4.1) * (ST.H + 60) + tm * (40 + (k % 5) * 24)) % (ST.H + 60)) - 30; ctx.beginPath(); ctx.arc(xx, yy, .9 + fxRnd(k) * 1.2, 0, 6.283); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = 'rgba(225,248,255,.85)'; ctx.beginPath();     // frost crystals creep inward along both edges, top first
  for (const sd of SIDES) for (let y = -ST.H * .35 + 10; y < ST.H * 1.35; y += 24) {
    const fr = (y + ST.H * .35) / (ST.H * 1.7), gl = clamp01(pr * 2.2 - fr * 1.1 + (locked ? .5 : 0)); if (gl < .02) continue;
    const len = (5 + 8 * fxRnd(y * .13 + sd)) * gl, xe = x + sd * hw; ctx.moveTo(xe, y); ctx.lineTo(xe - sd * len, y + 5); ctx.lineTo(xe, y + 10);
  }
  ctx.fill();
  ctx.strokeStyle = 'rgba(225,248,255,' + (.65 + .3 * pulse) + ')'; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(x - hw, -ST.H * .35); ctx.lineTo(x - hw, ST.H * 1.35); ctx.moveTo(x + hw, -ST.H * .35); ctx.lineTo(x + hw, ST.H * 1.35); ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  if (locked) { ctx.strokeStyle = 'rgba(255,255,255,' + (.55 + .4 * pulse) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, -ST.H * .35); ctx.lineTo(x, ST.H * 1.35); ctx.stroke(); }
  glow(x, 6, 50 + pr * 80, 'rgba(150,235,255,1)', .4 + .45 * pr);
  for (let k = 0; k < 3; k++) { const u = (tm * .9 + k / 3) % 1; ctx.strokeStyle = 'rgba(190,245,255,' + ((1 - u) * .55) + ')'; ctx.lineWidth = 1.5; hexPath(14 + u * (30 + pr * 40), tm * .3); ctx.save(); ctx.translate(x, 6); ctx.stroke(); ctx.restore(); }
  ctx.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.translate(x, 6); const gr = 8 + pr * 9, gg = ctx.createRadialGradient(-2, -2, 1, 0, 0, gr * 1.2); gg.addColorStop(0, '#FFFFFF'); gg.addColorStop(.6, '#9CE4FF'); gg.addColorStop(1, '#3C9AD6');
  hexPath(gr, Math.PI / 6); ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = '#E6FAFF'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
  [150, ST.H * .62].forEach(my => frostPlate(x, my, 1 + .12 * pulse, locked));
  ctx.restore();
}
