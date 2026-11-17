import { ST } from '../state.js';
import { ctx, reduceMotion } from '../config.js';
import { glow } from './glow.js';
import { drawForgeDisc, drawFrostDisc } from './sprites-b.js';


// ---------- per-stage orbs (blue + gold): Moonlit keeps the original glowing balls
// ====== Moonlit Garden / Nebula Reef detail pass: smooth gradients, bevels and soft light instead of flat fills ======
export function drawNinjaStar(R, hr, SS, spin, t) {                 // Moonlit: four curved steel blades, faceted, with a moonlight glint that stays put while the star spins
  const tp = k => [Math.cos(k * Math.PI / 2 - Math.PI / 2) * R, Math.sin(k * Math.PI / 2 - Math.PI / 2) * R];
  const ct = k => { const a = k * Math.PI / 2 - Math.PI / 4; return [Math.cos(a) * R * .3, Math.sin(a) * R * .3]; };
  const star = () => { const p0 = tp(0); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); for (let k = 0; k < 4; k++) { const c = ct(k), q = tp((k + 1) % 4); ctx.quadraticCurveTo(c[0], c[1], q[0], q[1]); } ctx.closePath(); };
  const bg = ctx.createRadialGradient(0, 0, R * .08, 0, 0, R);
  bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(.5, SS.fill); bg.addColorStop(1, '#8B94BC');
  star(); ctx.fillStyle = bg; ctx.fill();
  ctx.save(); star(); ctx.clip();
  for (let k = 0; k < 4; k++) {
    const a = tp(k), c = ct(k), b = tp((k + 1) % 4), m = [.25 * a[0] + .5 * c[0] + .25 * b[0], .25 * a[1] + .5 * c[1] + .25 * b[1]];
    ctx.fillStyle = 'rgba(34,40,92,.36)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(a[0], a[1]); ctx.lineTo(m[0], m[1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(m[0], m[1]); ctx.lineTo(b[0], b[1]); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  star(); ctx.strokeStyle = SS.stroke; ctx.lineWidth = 2; ctx.stroke();
  ctx.save(); ctx.scale(.86, .86); star(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  ctx.fillStyle = '#2A2E52'; ctx.beginPath(); ctx.arc(0, 0, R * .27, 0, 6.283); ctx.fill();            // hub ring with a tiny crescent engraved on it
  ctx.strokeStyle = '#D5DAF0'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = 'rgba(213,218,240,.9)'; ctx.beginPath(); ctx.arc(0, 0, R * .16, .7, 5.6); ctx.arc(R * .05, -R * .02, R * .12, 5.6, .7, true); ctx.fill();
  ctx.save(); ctx.rotate(-spin);                                                                         // fixed glint
  glow(-R * .38, -R * .42, R * .5, 'rgba(255,255,255,1)', .5);
  ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.moveTo(-R * .38, -R * .62); ctx.lineTo(-R * .33, -R * .47); ctx.lineTo(-R * .18, -R * .42); ctx.lineTo(-R * .33, -R * .37); ctx.lineTo(-R * .38, -R * .22); ctx.lineTo(-R * .43, -R * .37); ctx.lineTo(-R * .58, -R * .42); ctx.lineTo(-R * .43, -R * .47); ctx.closePath(); ctx.fill();
  ctx.restore();
}
export function drawUrchin(R, r, SS, t, ph) {                       // Nebula: glossy sea-urchin with tapered, glowing-tipped spines
  const N = 14, body = R * .5;
  for (let k = 0; k < N; k++) {
    const a = k * 6.283 / N - Math.PI / 2, lg = k % 2 === 0, L = R * (lg ? 1.1 : .8) * (1 + .05 * Math.sin(t * 3 + k + ph)), w = lg ? 3.6 : 2.7;
    const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca, bend = (lg ? 1 : -1) * R * .06;
    const g = ctx.createLinearGradient(ca * body, sa * body, ca * L, sa * L);
    g.addColorStop(0, '#B93FD0'); g.addColorStop(.65, '#FF8AD8'); g.addColorStop(1, '#FFF2FC');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(ca * body * .8 + px * w, sa * body * .8 + py * w);
    ctx.quadraticCurveTo(ca * L * .62 + px * bend, sa * L * .62 + py * bend, ca * L, sa * L);
    ctx.quadraticCurveTo(ca * L * .55 + px * bend - px * 1.1, sa * L * .55 + py * bend - py * 1.1, ca * body * .8 - px * w, sa * body * .8 - py * w);
    ctx.closePath(); ctx.fill();
    if (lg) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(ca * L, sa * L, 1.5, 0, 6.283); ctx.fill(); }
  }
  const bg = ctx.createRadialGradient(-body * .3, -body * .35, body * .08, 0, 0, body * 1.05);
  bg.addColorStop(0, '#FFE3F6'); bg.addColorStop(.5, '#FF5EC0'); bg.addColorStop(1, '#7A1E8F');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, body, 0, 6.283); ctx.fill();
  ctx.strokeStyle = SS.stroke; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, body * .64, 0, 6.283); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let k = 0; k < 6; k++) { const a = k * 1.0472 + t * .4; ctx.beginPath(); ctx.arc(Math.cos(a) * body * .64, Math.sin(a) * body * .64, 1.3, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = '#4A0F45'; ctx.beginPath(); ctx.arc(0, 0, body * .28, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(-body * .09, -body * .1, body * .08, 0, 6.283); ctx.fill();
}
export function drawMoonOrb(it, t, gold, r, pu, ph) {               // Moonlit: moonstone / amber orb with an inner swirl, rim light and a specular glint
  const R = r * pu, c = gold ? ['#FFF6D0', '#FFD166', '#D98A1F', '255,209,102'] : ['#EFFFFB', '#5EEAD4', '#1B8C83', '94,234,212'];
  const g = ctx.createRadialGradient(-R * .36, -R * .42, R * .06, 0, 0, R * 1.08);
  g.addColorStop(0, c[0]); g.addColorStop(.38, c[1]); g.addColorStop(1, c[2]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(0, 0, R * .62, t * .9 + ph, t * .9 + ph + 2.1); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.arc(0, 0, R * .42, -t * 1.3 + ph, -t * 1.3 + ph + 1.6); ctx.stroke();
  ctx.strokeStyle = 'rgba(' + c[3] + ',.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, R * .9, .25, 1.25); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(-R * .34, -R * .4, R * .24, R * .13, -.72, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(R * .3, R * .38, R * .07, 0, 6.283); ctx.fill();
  if (gold) { ctx.save(); ctx.rotate(t * .8 + ph); ctx.fillStyle = 'rgba(255,250,220,.85)'; for (let k = 0; k < 2; k++) { ctx.rotate(Math.PI / 4 * k); ctx.beginPath(); ctx.moveTo(0, -R * 1.5); ctx.lineTo(R * .1, 0); ctx.lineTo(0, R * 1.5); ctx.lineTo(-R * .1, 0); ctx.closePath(); ctx.fill(); } ctx.restore(); }
  const oa = t * 2 + ph; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(Math.cos(oa) * R * 1.5, Math.sin(oa) * R * 1.5, 1.4, 0, 6.283); ctx.fill();
  ctx.lineCap = 'butt';
}
export function drawReefOrb(it, t, gold, r, pu, ph, col) {          // Nebula: iridescent soap-bubble / textured golden sea-star
  if (!gold) {
    const R = r * pu * 1.05;
    let g = ctx.createRadialGradient(-R * .3, -R * .3, R * .1, 0, 0, R);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.45, 'rgba(120,235,255,.35)'); g.addColorStop(.85, 'rgba(255,130,225,.5)'); g.addColorStop(1, 'rgba(255,255,255,.55)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
    const rg = ctx.createLinearGradient(-R, -R, R, R);
    rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(.35, 'rgba(130,240,255,.9)'); rg.addColorStop(.65, 'rgba(255,140,230,.9)'); rg.addColorStop(1, 'rgba(255,240,170,.9)');
    ctx.strokeStyle = rg; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R * .72, t * .7 + ph, t * .7 + ph + 1.1); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(-R * .38, -R * .42, R * .22, R * .12, -.7, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(R * .38, R * .4, R * .1, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) { const a = t * .8 + ph + k * 2.09, d = R * (.2 + .12 * k); ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d + R * .05, R * (.07 + .02 * k), 0, 6.283); ctx.stroke(); }
  } else {
    ctx.rotate(Math.sin(t * 2 + ph) * .25);
    const arm = k => (k % 2 ? r * .55 : r * 1.3) * pu * (k % 2 ? 1 : 1 + .05 * Math.sin(t * 3 + k + ph));
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.4);
    g.addColorStop(0, '#FFF1B8'); g.addColorStop(.55, '#FFC95C'); g.addColorStop(1, '#F08A24');
    ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, rr = arm(k); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#E8832C'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(184,87,15,.45)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0; k < 5; k++) { const a = k * 1.2566 - Math.PI / 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * arm(k * 2) * .92, Math.sin(a) * arm(k * 2) * .92); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,238,175,.95)';
    for (let k = 0; k < 5; k++) { const a = k * 1.2566 - Math.PI / 2; for (const f of [.42, .64, .84]) { ctx.beginPath(); ctx.arc(Math.cos(a) * arm(k * 2) * f, Math.sin(a) * arm(k * 2) * f, 1.25, 0, 6.283); ctx.fill(); } }
    const cg = ctx.createRadialGradient(-r * .08, -r * .1, 0, 0, 0, r * .36); cg.addColorStop(0, '#FFFBE8'); cg.addColorStop(1, '#FFC95C');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, r * .34, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(-r * .1, -r * .12, r * .08, 0, 6.283); ctx.fill();
  }
}
export function drawPowerDisc(it, col, pu, t) {                      // Moonlit medallion / reef sea-glass cameo (the glyph is drawn on top by the caller)
  const R = it.r * pu;
  if (ST.curStage === 0) {
    const bg = ctx.createRadialGradient(-R * .3, -R * .35, R * .1, 0, 0, R);
    bg.addColorStop(0, '#34306E'); bg.addColorStop(1, '#14132B');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R * .62, 0, 6.283); ctx.clip();
    ctx.fillStyle = 'rgba(210,220,255,.09)'; ctx.beginPath(); ctx.rect(-R, -R, R * 2, R * 2); ctx.arc(R * .38, -R * .1, R * .56, 0, 6.283); ctx.fill('evenodd'); ctx.restore();
    const rg = ctx.createLinearGradient(-R, -R, R, R); rg.addColorStop(0, '#F3F5FF'); rg.addColorStop(.5, '#8D93B8'); rg.addColorStop(1, '#E7EAFF');
    ctx.strokeStyle = rg; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha *= .9; ctx.beginPath(); ctx.arc(0, 0, R * .8, 0, 6.283); ctx.stroke(); ctx.globalAlpha /= .9;
    ctx.strokeStyle = 'rgba(235,240,255,.5)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0; k < 12; k++) { const a = k * .5236; ctx.moveTo(Math.cos(a) * R * .88, Math.sin(a) * R * .88); ctx.lineTo(Math.cos(a) * R * .95, Math.sin(a) * R * .95); }
    ctx.stroke();
    const oa = t * 1.6 + it.ph; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(Math.cos(oa) * R * 1.22, Math.sin(oa) * R * 1.22, 1.8, 0, 6.283); ctx.fill();
  } else if (ST.curStage === 2) {
    drawFrostDisc(it, col, pu, t);
  } else if (ST.curStage === 3) {
    drawForgeDisc(it, col, pu, t);
  } else {
    const bg = ctx.createRadialGradient(-R * .25, -R * .3, R * .1, 0, 0, R);
    bg.addColorStop(0, 'rgba(40,130,170,.92)'); bg.addColorStop(1, 'rgba(10,36,76,.94)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * .8, 0, 6.283); ctx.stroke();
    const rg = ctx.createLinearGradient(-R, -R, R, R); rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(.35, 'rgba(130,240,255,.9)'); rg.addColorStop(.65, 'rgba(255,140,230,.9)'); rg.addColorStop(1, 'rgba(255,240,170,.9)');
    ctx.strokeStyle = rg; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-R * .42, -R * .5, R * .24, R * .12, -.7, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(190,245,255,.7)'; ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) { const a = t * .9 + k * 2.09 + it.ph; ctx.beginPath(); ctx.arc(Math.cos(a) * R * 1.25, Math.sin(a) * R * 1.25, 2, 0, 6.283); ctx.stroke(); }
  }
}
export function drawCometTail(it, CS, t) {                           // Moonlit fireball / Nebula crystal: layered, curved, softly fading tails
  const r = it.r, L = 170, sw = reduceMotion ? 0 : Math.sin(t * 7) * 5;
  for (const [wd, len, al] of [[1.5, L, .35], [1, L * .8, .6], [.55, L * .55, .9]]) {
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, CS.t0.replace(/[\d.]+\)$/, al + ')')); g.addColorStop(1, CS.t1);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-r * wd, 0);
    ctx.quadraticCurveTo(-r * wd * .7 + sw * .3, -len * .5, sw, -len); ctx.quadraticCurveTo(r * wd * .7 + sw * .3, -len * .5, r * wd, 0);
    ctx.closePath(); ctx.fill();
  }
  if (!reduceMotion && CS.kind === 'fire') {
    ctx.fillStyle = CS.t0;
    for (let k = 1; k <= 5; k++) { const f = (t * 1.1 + k * .2) % 1; ctx.globalAlpha = (1 - f) * .5; ctx.beginPath(); ctx.arc(Math.sin(k * 5.1 + t * 4) * (3 + k * 1.8), -20 - f * 120, 1.25, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
export function drawFireHead(it, t) {
  const r = it.r, fl = reduceMotion ? 0 : t;
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * .38 + Math.sin(fl * 9 + k * 1.7) * .1, L = r * (1.5 + .5 * Math.sin(fl * 11 + k * 2.3));
    const g = ctx.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L); g.addColorStop(0, 'rgba(255,200,110,.9)'); g.addColorStop(1, 'rgba(255,90,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(Math.cos(a) * L * .45, Math.sin(a) * L * .45, L * .5, r * .38, a, 0, 6.283); ctx.fill();
  }
  const hg = ctx.createRadialGradient(-r * .25, -r * .3, r * .05, 0, 0, r * 1.1);
  hg.addColorStop(0, '#FFFFFF'); hg.addColorStop(.35, '#FFF0C0'); hg.addColorStop(.75, '#FFB05A'); hg.addColorStop(1, '#FF6A2E');
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(255,120,50,.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, r * .6, fl * 3, fl * 3 + 2.2); ctx.stroke();
}
