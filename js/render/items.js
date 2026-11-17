import { ST } from '../state.js';
import { CM_STYLE, OSTYLE, POWER_COL, SH_STYLE, ctx, reduceMotion } from '../config.js';
import { drawJack, exL, exR } from '../edge.js';
import { drawOwl } from '../hazards/signature.js';
import { glow } from './glow.js';
import { drawGlitchGhost, drawLbar, drawMarq, drawPopup, drawXSweep, nmRnd } from '../stages/neon.js';
import { drawCometTail, drawFireHead, drawMoonOrb, drawNinjaStar, drawPowerDisc, drawReefOrb, drawUrchin } from './sprites-a.js';
import { drawCloud, drawForgedBlade, drawFrostStar, drawFrostWarn, drawGateSt, drawGlacierOrb, drawIceHead, drawIceTail, drawMagmaHead, drawMagmaTail, drawPlasmaOrb, drawShard, drawStormCoin, drawStormWarn } from './sprites-b.js';
import { drawIceSpike } from '../hazards/icespike.js';
import { drawSeam, drawShear, drawSlabComet, drawSlabStar, drawStrataOrb, ovQ } from '../stages/overflow.js';


export function drawGlyph(kind, col) {
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  if (kind === 'shield') { ctx.moveTo(0, -8); ctx.lineTo(7, -5); ctx.lineTo(6, 3); ctx.lineTo(0, 9); ctx.lineTo(-6, 3); ctx.lineTo(-7, -5); ctx.closePath(); ctx.fill(); }
  else if (kind === 'ctrlz') { ctx.arc(1, 1, 6, -2.2, 1.6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-9, -3); ctx.lineTo(-2, -8); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill(); }
  else if (kind === 'defrag') { ctx.moveTo(-8, 1); ctx.lineTo(8, 1); ctx.stroke(); ctx.fillRect(-8, -7, 4, 4); ctx.fillRect(-2, -7, 4, 4); ctx.fillRect(4, -7, 4, 4); ctx.fillRect(-5, 5, 4, 4); ctx.fillRect(2, 5, 4, 4); }
  else if (kind === 'dialup') { ctx.lineWidth = 2.4; ctx.arc(0, 6, 5, -2.35, -.8); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 6, 9, -2.35, -.8); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 6, 1.8, 0, 6.283); ctx.fill(); }
  else if (kind === 'save') { ctx.lineWidth = 2.4; ctx.strokeRect(-7, -7, 14, 14); ctx.fillRect(-4, -7, 8, 5); ctx.fillRect(-4, 1, 8, 6); }
  else if (kind === 'magnet') { ctx.moveTo(-6, -7); ctx.lineTo(-6, 1); ctx.arc(0, 1, 6, Math.PI, 0, true); ctx.lineTo(6, -7); ctx.stroke(); }
  else if (kind === 'slow') {
    ctx.moveTo(-6, -8); ctx.lineTo(6, -8); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(6, 8); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  } else if (kind === 'bloom') {
    for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.57; ctx.beginPath(); ctx.arc(Math.cos(a) * 5, Math.sin(a) * 5, 3.4, 0, 6.283); ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 6.283); ctx.fill();
  } else if (kind === 'prism') { ctx.lineWidth = 2.5; ctx.moveTo(0, -9); ctx.lineTo(8, 7); ctx.lineTo(-8, 7); ctx.closePath(); ctx.stroke(); }
  else if (kind === 'chill') {
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 3; i++) { const a = i * 1.0472; ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.lineTo(-Math.cos(a) * 9, -Math.sin(a) * 9); }
    ctx.stroke();
  } else if (kind === 'reseed') {
    ctx.lineWidth = 2.2; ctx.moveTo(-3, -9); ctx.lineTo(-3, 9); ctx.moveTo(3, -9); ctx.lineTo(3, 9); ctx.moveTo(-9, -3); ctx.lineTo(9, -3); ctx.moveTo(-9, 3); ctx.lineTo(9, 3); ctx.stroke();
  } else if (kind === 'heal') {
    ctx.moveTo(0, 8); ctx.bezierCurveTo(-11, 0, -8, -9, 0, -3); ctx.bezierCurveTo(8, -9, 11, 0, 0, 8); ctx.fill();
  } else if (kind === 'double') {
    ctx.font = '700 13px MothDisplay, serif'; ctx.textAlign = 'center'; ctx.fillText('x2', 0, 5); ctx.textAlign = 'left';
  } else if (kind === 'warm') {
    ctx.moveTo(0, -10); ctx.quadraticCurveTo(9, 0, 0, 9); ctx.quadraticCurveTo(-9, 0, 0, -10); ctx.fill();
  } else if (kind === 'freeze') {
    ctx.lineWidth = 2.2; ctx.moveTo(0, -9); ctx.lineTo(8, 0); ctx.lineTo(0, 9); ctx.lineTo(-8, 0); ctx.closePath();
    ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.stroke();
  } else if (kind === 'boost') {
    ctx.lineWidth = 2.6; ctx.moveTo(-7, 2); ctx.lineTo(0, -5); ctx.lineTo(7, 2); ctx.moveTo(-7, 9); ctx.lineTo(0, 2); ctx.lineTo(7, 9); ctx.stroke();
  } else if (kind === 'phase') {
    ctx.arc(0, -1, 6.5, Math.PI, 0); ctx.lineTo(6.5, 8); ctx.lineTo(3.2, 5); ctx.lineTo(0, 8); ctx.lineTo(-3.2, 5); ctx.lineTo(-6.5, 8); ctx.closePath(); ctx.fill();
  } else if (kind === 'rod') {
    ctx.moveTo(2, -10); ctx.lineTo(-5, 1); ctx.lineTo(0, 1); ctx.lineTo(-2, 10); ctx.lineTo(5, -2); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill();
  } else if (kind === 'eye') {
    ctx.lineWidth = 2.4; ctx.arc(0, 0, 7.5, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 3, 0, 6.283); ctx.fill();
  } else {
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 3.5 : 9; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
  }
  ctx.lineCap = 'butt';
}

function drawSpore(it, t) {
  ctx.save(); ctx.translate(it.x, it.y);
  const ready = it.y > ST.H * .3, pu = 1 + .1 * Math.sin(t * (ready ? 18 : 6)), R = it.r;
  glow(0, 0, 56, 'rgba(255,110,210,1)', .5);
  ctx.rotate(it.spin * .3);
  const g = ctx.createRadialGradient(-R * .25, -R * .3, R * .1, 0, 0, R * 1.35 * pu);
  g.addColorStop(0, '#FFE4F6'); g.addColorStop(.6, '#FF8AD8'); g.addColorStop(1, 'rgba(255,70,185,.92)');
  ctx.fillStyle = g; ctx.beginPath();                                   // frilled membrane: a ring of soft bumps
  for (let k = 0; k < 12; k++) { const a = k * .5236, cx = Math.cos(a) * R * .95 * pu, cy = Math.sin(a) * R * .95 * pu; ctx.moveTo(cx + R * .36 * pu, cy); ctx.arc(cx, cy, R * .36 * pu, 0, 6.283); }
  ctx.moveTo(R * .95 * pu, 0); ctx.arc(0, 0, R * .95 * pu, 0, 6.283); ctx.fill();
  const ng = ctx.createRadialGradient(-R * .1, -R * .12, 0, 0, 0, R * .62); ng.addColorStop(0, '#FFFFFF'); ng.addColorStop(1, 'rgba(255,209,240,.9)');
  ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(0, 0, R * .62, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(194,60,155,.4)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let k = 0; k < 5; k++) { const a = k * 1.2566; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R * .56, Math.sin(a) * R * .56); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(160,40,130,.65)';
  for (let k = 0; k < 4; k++) { const a = -t * .9 + k * 1.5708; ctx.beginPath(); ctx.arc(Math.cos(a) * R * .4, Math.sin(a) * R * .4, 1.4, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = '#7A1E66'; ctx.beginPath(); ctx.arc(0, 0, R * .2, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-R * .38, -R * .42, R * .2, R * .1, -.7, 0, 6.283); ctx.fill();
  if (ready) { ctx.strokeStyle = 'rgba(255,255,255,' + (.35 + .25 * Math.sin(t * 18)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * 1.5 * pu, 0, 6.283); ctx.stroke(); }
  ctx.restore();
}

const PX_COL = ['5,217,232', '255,60,200', '255,240,120', '185,103,255', '255,255,255'];
function pxIcon(x, y, sc, locked, t) {      // pixel error icon in place of the warning triangle
  const c = 4 * sc, o = reduceMotion || Math.sin(t * 30) < .6 ? 0 : 2;
  ctx.save(); ctx.translate(x - 4 * c + o, y - 4 * c);
  ctx.fillStyle = 'rgb(5,217,232)'; ctx.fillRect(c * .5, c * .5, 8 * c, 8 * c);
  ctx.fillStyle = locked ? 'rgb(255,60,200)' : 'rgb(255,113,206)'; ctx.fillRect(0, 0, 8 * c, 8 * c);
  ctx.fillStyle = '#2a0a4a'; ctx.fillRect(c, c, 6 * c, 6 * c);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(3.5 * c, 1.8 * c, c, 3 * c); ctx.fillRect(3.5 * c, 5.4 * c, c, c);
  ctx.restore();
}
function drawPixelBurst(it, t) {            // Neon Mirage version of the lightning hazard: a lane of glitching pixels that bursts
  const x = it.x, hw = it.w / 2 + 10, cs = 14, slot = Math.floor(t * (it.warn > 0 && it.warn <= .3 ? 24 : 10));
  ctx.save();
  if (it.warn > 0) {
    const locked = it.warn <= .3, pr = 1 - it.warn / 1.05, pulse = .5 + .5 * Math.sin(it.warn * (locked ? 45 : 14));
    ctx.fillStyle = 'rgba(120,20,160,' + (locked ? .3 + .1 * pulse : .16 + .06 * pulse) + ')'; ctx.fillRect(x - hw, -ST.H * .35, hw * 2, ST.H * 1.7);
    ctx.globalCompositeOperation = 'lighter';
    const cols = Math.ceil(hw * 2 / cs), x0 = x - cols * cs / 2, scroll = reduceMotion ? 0 : (t * 90) % (cs * 2);
    for (let r = -Math.ceil(ST.H * .35 / cs); r < ST.H * 1.35 / cs; r++) for (let c = 0; c < cols; c++) {
      const k = nmRnd(r * 31.7 + c * 7.3 + slot * 1.9);
      if (k > (locked ? .5 : .28)) continue;
      ctx.fillStyle = 'rgba(' + PX_COL[(r + c + slot) % 3 === 0 ? 1 : 0] + ',' + (locked ? .5 : .3) + ')';
      ctx.fillRect(x0 + c * cs, r * cs + scroll, cs - 2, cs - 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(5,217,232,' + (.6 + .3 * pulse) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - hw, -ST.H * .35); ctx.lineTo(x - hw, ST.H * 1.35); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,60,200,' + (.6 + .3 * pulse) + ')'; ctx.beginPath(); ctx.moveTo(x + hw, -ST.H * .35); ctx.lineTo(x + hw, ST.H * 1.35); ctx.stroke();
    if (locked) { ctx.strokeStyle = 'rgba(255,255,255,' + (.5 + .4 * pulse) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, -ST.H * .35); ctx.lineTo(x, ST.H * 1.35); ctx.stroke(); }
    glow(x, 0, 60 + pr * 90, 'rgba(255,60,200,1)', .35 + .4 * pr);
    ctx.fillStyle = 'rgba(255,255,255,.85)';                                          // pixels rushing down the lane
    for (let k = 0; k < 5; k++) { const yy = ((t * 380 + k * ST.H * .21) % (ST.H + 40)) - 20; ctx.fillRect(x - 4 + (k % 2 ? 7 : -7), yy, 7, 7); }
    pxIcon(x, 150, 1 + .14 * pulse, locked, t); pxIcon(x, ST.H * .62, 1 + .14 * pulse, locked, t);
  } else {
    const a = Math.max(0, it.act / .25), sp = 1 - a;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,60,200,' + (a * .22) + ')'; ctx.fillRect(x - it.w / 2, -ST.H * .35, it.w, ST.H * 1.7);
    for (let y = -Math.ceil(ST.H * .35 / 10) * 10; y < ST.H * 1.35; y += 10) {
      const n = 2 + (((y / 10) % 3) + 3) % 3;
      for (let i = 0; i < n; i++) {
        const sz = 5 + Math.random() * 11, bx = x + (Math.random() - .5) * (it.w + 26 + sp * 36);
        ctx.fillStyle = 'rgba(' + PX_COL[(Math.random() * 5) | 0] + ',' + (a * (.55 + Math.random() * .4)) + ')';
        ctx.fillRect(bx - sz / 2, y + (Math.random() - .5) * 16, sz, sz);
      }
    }
    for (let i = 0; i < 4; i++) {                                                       // RGB-split slices across the lane
      const yy = Math.random() * ST.H, w2 = it.w * 2.2 + Math.random() * 60, o = (Math.random() - .5) * 24;
      ctx.fillStyle = 'rgba(5,217,232,' + (a * .6) + ')'; ctx.fillRect(x - w2 / 2 + o, yy, w2, 3);
      ctx.fillStyle = 'rgba(255,60,200,' + (a * .6) + ')'; ctx.fillRect(x - w2 / 2 - o, yy + 4, w2, 3);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}
function drawStrike(it, t) {
  const x = it.x;
  ctx.save();
  if (it.warn > 0) {
    // bright yellow-white warning that reads on every sky: the exact hit zone, moving hazard stripes, chevrons, '!' markers
    const locked = it.warn <= .3, hw = it.w / 2 + 10, pr = 1 - it.warn / 1.05, pulse = .5 + .5 * Math.sin(it.warn * (locked ? 45 : 14));
    ctx.fillStyle = 'rgba(255,230,120,' + (locked ? .28 + .18 * pulse : .13 + .07 * pulse) + ')'; ctx.fillRect(x - hw, -ST.H * .35, hw * 2, ST.H * 1.7);
    ctx.save(); ctx.beginPath(); ctx.rect(x - hw, -ST.H * .35, hw * 2, ST.H * 1.7); ctx.clip();
    ctx.strokeStyle = 'rgba(255,240,170,' + (locked ? .4 : .22) + ')'; ctx.lineWidth = 6; ctx.beginPath();
    const off = reduceMotion ? 0 : (t * 140) % 44;
    for (let y = -ST.H * .35 + off; y < ST.H * 1.35; y += 44) { ctx.moveTo(x - hw, y + hw * 2); ctx.lineTo(x + hw, y); }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,246,190,' + (.7 + .3 * pulse) + ')'; ctx.lineWidth = 2.5; ctx.beginPath();
    ctx.moveTo(x - hw, -ST.H * .35); ctx.lineTo(x - hw, ST.H * 1.35); ctx.moveTo(x + hw, -ST.H * .35); ctx.lineTo(x + hw, ST.H * 1.35); ctx.stroke();
    if (locked) { ctx.strokeStyle = 'rgba(255,255,255,' + (.6 + .4 * pulse) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, -ST.H * .35); ctx.lineTo(x, ST.H * 1.35); ctx.stroke(); }
    glow(x, 0, 60 + pr * 90, 'rgba(255,230,120,1)', .45 + .5 * pr);                  // charging flare where the bolt starts
    ctx.strokeStyle = 'rgba(255,246,200,.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) {                                                      // chevrons rushing down the lane
      const y = ST.H * .16 + k * ST.H * .17, al = reduceMotion ? .6 : .3 + .6 * Math.max(0, Math.sin(t * 10 - k * 1.1));
      ctx.globalAlpha = al; ctx.beginPath(); ctx.moveTo(x - 11, y - 7); ctx.lineTo(x, y + 5); ctx.lineTo(x + 11, y - 7); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    [150, ST.H * .62].forEach(my => {
      const sc = 1 + .14 * pulse;
      ctx.save(); ctx.translate(x, my); ctx.scale(sc, sc);
      ctx.fillStyle = 'rgb(255,230,120)'; ctx.strokeStyle = '#14132B'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(21, 14); ctx.lineTo(-21, 14); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = '#14132B'; ctx.font = '700 20px MothDisplay, serif'; ctx.textAlign = 'center'; ctx.fillText('!', 0, 11);
      ctx.restore();
    });
  } else {
    const a = Math.max(0, it.act / .25), cc = 'rgba(' + it.col + ',';
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const lg = ctx.createLinearGradient(x - it.w / 2, 0, x + it.w / 2, 0); lg.addColorStop(0, cc + '0)'); lg.addColorStop(.5, cc + (a * .38) + ')'); lg.addColorStop(1, cc + '0)');
    ctx.fillStyle = lg; ctx.fillRect(x - it.w / 2, -ST.H * .35, it.w, ST.H * 1.7);
    const pts = [[x, -ST.H * .35]], forks = [];
    for (let y = 26 - ST.H * .35; y < ST.H * 1.35; y += 26) { const px = x + (Math.random() - .5) * 18; pts.push([px, y]); if (pts.length > 3 && Math.random() < .2) { const sg = Math.random() < .5 ? -1 : 1, f = [[px, y]]; for (let q = 0; q < 3; q++) f.push([f[q][0] + sg * (10 + Math.random() * 14), f[q][1] + 10 + Math.random() * 16]); forks.push(f); } }
    const stroke = (P, c, lw) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); P.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); };
    stroke(pts, cc + (a * .35) + ')', 12); stroke(pts, cc + (a * .75) + ')', 5); stroke(pts, 'rgba(255,255,255,' + a + ')', 2.2);
    for (const f of forks) { stroke(f, cc + (a * .45) + ')', 4); stroke(f, 'rgba(255,255,255,' + (a * .85) + ')', 1.3); }
    glow(x, 20, 90, cc + '1)', a * .7); ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  }
  ctx.restore();
}

export function cometRock(n, r, seed) {
  ctx.beginPath();
  for (let k = 0; k < n; k++) { const a = k * 6.283 / n, rr = r * (.82 + .3 * Math.abs(Math.sin(k * 2.3 + seed))); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath();
}
function drawComet(it, t) {
  const CS = CM_STYLE[ST.curStage];
  ctx.save();
  if (it.warn > 0) {                  // warning lane straight down from the top
    const locked = it.warn <= .35, x = it.x;
    ctx.globalAlpha = locked ? .65 + .35 * Math.abs(Math.sin(it.warn * 40)) : .4 + .3 * Math.abs(Math.sin(it.warn * 12));
    ctx.fillStyle = 'rgba(' + CS.lane + ',' + (locked ? .16 : .08) + ')'; ctx.fillRect(x - 16, -ST.H * .35, 32, ST.H * 1.7);
    ctx.strokeStyle = 'rgba(' + CS.lane + ',.5)'; ctx.setLineDash([10, 10]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, -ST.H * .35); ctx.lineTo(x, ST.H * 1.35); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    drawWarnSign(x, 268, locked, t, CS);
    ctx.restore(); return;
  }
  ctx.translate(it.x, it.y);
  glow(0, 0, 60, CS.glow, CS.kind === 'slab' ? .18 : .7);
  if (CS.kind === 'slab') { drawSlabComet(it, t, CS); ctx.restore(); return; }
  const tg = ctx.createLinearGradient(0, 0, 0, -150);
  tg.addColorStop(0, CS.t0); tg.addColorStop(1, CS.t1);
  ctx.fillStyle = tg;
  if (CS.kind === 'ice') {            // Aurora: braided ribbons of cold light
    drawIceTail(it, CS, t);
  } else if (CS.kind === 'fire' || CS.kind === 'crystal') {
    drawCometTail(it, CS, t);
  } else {                            // Crimson: smoke, flame and embers
    drawMagmaTail(it, CS, t);
  }
  if (!reduceMotion && CS.kind === 'crystal') {   // trailing sparkles
    ctx.fillStyle = CS.t0;
    for (let k = 1; k <= 5; k++) {
      const sw = Math.sin(t * 9 + k * 1.9) * (4 + k * 2.2);
      ctx.globalAlpha = .75 - k * .12;
      ctx.beginPath(); ctx.arc(sw, -20 - k * 22, CS.kind === 'lava' ? 2.4 : 1.9, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.rotate(reduceMotion ? 0 : t * (CS.kind === 'fire' ? 0 : 2.2));
  if (CS.kind === 'crystal') {        // Nebula Reef: faceted violet crystal
    ctx.fillStyle = '#E9B8FF'; ctx.strokeStyle = '#FF4FC8'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    cometRock(6, it.r * 1.15, 1); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#B05CFF'; cometRock(6, it.r * .6, 1); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = k * 1.0472; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * it.r * 1.05, Math.sin(a) * it.r * 1.05); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(-it.r * .5, -it.r * .7); ctx.lineTo(it.r * .1, -it.r * .9); ctx.lineTo(-it.r * .1, -it.r * .2); ctx.closePath(); ctx.fill();
  } else if (CS.kind === 'ice') {     // Aurora Sea: faceted crystal prism
    drawIceHead(it, t);
  } else if (CS.kind === 'lava') {    // Crimson Storm: charred meteor with glowing fissures
    drawMagmaHead(it, t);
  } else {                            // Moonlit Garden: classic fireball
    drawFireHead(it, t);
  }
  ctx.restore();
}

function drawPxBullet(it, t) {            // Neon Sentinel bullet: RGB-split pixel square
  const lag = it.lagT > 0, s = it.r * 1.3, j = reduceMotion ? 0 : (Math.random() - .5) * 2.5;
  ctx.save(); ctx.translate(it.x, it.y); ctx.globalAlpha = lag ? (Math.sin(t * 60) > 0 ? 1 : .35) : 1;
  glow(0, 0, 40, 'rgba(255,60,200,1)', .5);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(5,217,232,.85)'; ctx.fillRect(-s / 2 - 3 + j, -s / 2, s, s);
  ctx.fillStyle = 'rgba(255,60,200,.85)'; ctx.fillRect(-s / 2 + 3 - j, -s / 2, s, s);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-s * .32, -s * .32, s * .64, s * .64);
  if (lag) { ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; const a0 = t * 9; ctx.beginPath(); ctx.arc(0, 0, s * 1.15, a0, a0 + 2.2); ctx.stroke(); }
  ctx.restore();
}
function drawPixelWall(it, t) {           // Neon Mirage version of the laser gate: a wall of glitching pixel tiles
  const y = it.y, L = it.gx - it.gap / 2, R = it.gx + it.gap / 2, cs = 14, slot = Math.floor(t * 14);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let side = 0; side < 2; side++) {
    const x0 = side ? R : exL(), x1 = side ? exR() : L;
    for (let r = 0; r < 2; r++) {
      const jx = !reduceMotion && nmRnd(slot * 3.1 + r + side * 5) > .8 ? (nmRnd(slot + r) - .5) * 18 : 0;
      for (let x = x0; x < x1; x += cs) {
        const ci = Math.floor(x / cs), k = nmRnd(ci * 7.1 + r * 3.3 + slot * 1.3);
        if (k > .86) continue;
        ctx.fillStyle = 'rgba(' + PX_COL[(ci + r + slot) % 2] + ',' + (.55 + k * .35) + ')';
        ctx.fillRect(x + jx, y - cs + r * cs, Math.min(cs - 2, x1 - x), cs - 2);
      }
    }
  }
  ctx.restore();
  glow(L, y, 40, 'rgba(5,217,232,1)', .6); glow(R, y, 40, 'rgba(255,60,200,1)', .6);
  ctx.fillStyle = '#7DF9FF'; ctx.fillRect(L - 4, y - 22, 8, 44); ctx.fillStyle = '#FF71CE'; ctx.fillRect(R - 4, y - 22, 8, 44);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(L - 1, y - 22, 2, 44); ctx.fillRect(R - 1, y - 22, 2, 44);
}
function drawGate(it, t) {
  if (ST.curStage === 4) { drawPixelWall(it, t); return; }
  if (ST.curStage === 5) { drawSeam(it, t); return; }
  const y = it.y, L = it.gx - it.gap / 2, R = it.gx + it.gap / 2, fl = .85 + .15 * Math.sin(t * 40), st = ST.curStage;
  if (st >= 2) { drawGateSt(it, t, st); return; }
  if (st >= 1) {                            // themed barriers (hit zone is the same row)
    const segs = [[exL(), L], [R, exR()]];
    ctx.save();
    if (st === 1) {                         // coral pods: a string of glowing bubbles
      ctx.strokeStyle = 'rgba(255,120,220,.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(exL(), y); ctx.lineTo(L, y); ctx.moveTo(R, y); ctx.lineTo(exR(), y); ctx.stroke();
      for (const [a, b] of segs) for (let x = a + 8; x < b; x += 22) {
        const bob = Math.sin(t * 4 + x * .1) * 3; ctx.fillStyle = 'rgba(255,170,235,.9)'; ctx.beginPath(); ctx.arc(x, y + bob, 6, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x - 2, y + bob - 2, 2, 0, 6.283); ctx.fill();
      }
    }
    ctx.restore();
    glow(L, y, 36, 'rgba(255,120,220,1)', .8); glow(R, y, 36, 'rgba(255,120,220,1)', .8);
    ctx.fillStyle = '#FFE0F4'; ctx.strokeStyle = '#14132B'; ctx.lineWidth = 2;
    for (const px of [L, R]) { ctx.beginPath(); ctx.arc(px, y, 9, 0, 6.283); ctx.fill(); ctx.stroke(); }
    return;
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fl;
  ctx.fillStyle = 'rgba(255,60,100,.25)'; ctx.fillRect(exL(), y - 14, L - exL(), 28); ctx.fillRect(R, y - 14, exR() - R, 28);
  ctx.fillStyle = 'rgba(255,170,190,.95)'; ctx.fillRect(exL(), y - 2.5, L - exL(), 5); ctx.fillRect(R, y - 2.5, exR() - R, 5);
  ctx.restore();
  glow(L, y, 36, 'rgba(255,60,100,1)', .8); glow(R, y, 36, 'rgba(255,60,100,1)', .8);
  ctx.fillStyle = '#FFE0E8';
  ctx.beginPath(); ctx.arc(L, y, 7, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.arc(R, y, 7, 0, 6.283); ctx.fill();
}

function drawHole(it, t) {                  // black hole, one look per stage
  const st = ST.curStage, A = ['150,90,255', '60,200,255', '150,230,255', '255,80,40', '255,60,200', '255,98,40'][st];
  ctx.save(); ctx.translate(it.x, it.y);
  glow(0, 0, it.pull, 'rgba(' + A + ',1)', .22);
  ctx.globalCompositeOperation = 'lighter';
  if (st === 1) {                           // whirlpool: spiral arms and little bubbles
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = k % 2 ? 'rgba(255,130,225,.6)' : 'rgba(127,240,255,.65)'; ctx.lineWidth = 3; ctx.beginPath();
      for (let q = 0; q <= 12; q++) { const u = q / 12, a = it.spin * 1.5 + k * 2.094 + u * 4, rr = it.r * (1.05 + u * 2.3); q ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .8) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * .8); }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(200,250,255,.7)'; for (let k = 0; k < 4; k++) { const a = -it.spin * 2 + k * 1.57, rr = it.r * (1.6 + (k % 2) * .7); ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * .8, 2.2, 0, 6.283); ctx.fill(); }
  } else if (st === 2) {                    // ice vortex: rotating hexagon rings
    const AC = ['94,255,190', '80,200,255', '190,120,255'];     // polar vortex: aurora-coloured hexagon rings, ice motes spiralling in
    for (let k = 0; k < 3; k++) {
      ctx.save(); ctx.rotate(it.spin * (k % 2 ? -1 : 1) * (.8 + k * .3)); ctx.strokeStyle = 'rgba(' + AC[k] + ',' + (.7 - k * .12) + ')'; ctx.lineWidth = 3 - k * .6; ctx.beginPath();
      for (let q = 0; q < 6; q++) { const a = q * Math.PI / 3, rr = it.r * (1.5 + k * .65); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.stroke(); ctx.restore();
    }
    if (!reduceMotion) {
      ctx.fillStyle = 'rgba(235,252,255,.9)'; const pa = ctx.globalAlpha;
      for (let k = 0; k < 8; k++) {
        const u = (t * .4 + k / 8) % 1, a = k * .785 + u * 5 - it.spin, rr = it.r * (3.4 - u * 2.4), sz = 2.4 * (1 - u * .5), px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        ctx.globalAlpha = pa * (1 - u) * .9; ctx.beginPath(); ctx.moveTo(px, py - sz * 1.6); ctx.lineTo(px + sz * .5, py); ctx.lineTo(px, py + sz * 1.6); ctx.lineTo(px - sz * .5, py); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = pa;
    }
  } else if (st === 3) {                    // storm singularity: burning accretion ring and crackling arcs
    ctx.save(); ctx.rotate(it.spin * .35); ctx.scale(1, .46);       // tilted accretion disc, brighter on the approaching side
    const dg = ctx.createRadialGradient(0, 0, it.r * 1.05, 0, 0, it.r * 2.9);
    dg.addColorStop(0, 'rgba(255,236,190,0)'); dg.addColorStop(.12, 'rgba(255,226,160,.95)'); dg.addColorStop(.38, 'rgba(255,120,40,.7)'); dg.addColorStop(.75, 'rgba(190,30,20,.3)'); dg.addColorStop(1, 'rgba(120,0,10,0)');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, it.r * 2.9, 0, 6.283); ctx.fill();
    const dp = ctx.createLinearGradient(-it.r * 2.9, 0, it.r * 2.9, 0); dp.addColorStop(0, 'rgba(255,255,255,0)'); dp.addColorStop(.5, 'rgba(255,255,255,0)'); dp.addColorStop(1, 'rgba(255,240,200,.4)');
    ctx.fillStyle = dp; ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,200,130,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, it.r * 1.28, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();   // light bent over the top
    if (!reduceMotion) { ctx.strokeStyle = 'rgba(255,240,170,.85)'; ctx.lineWidth = 1.6; for (let k = 0; k < 3; k++) { const a = Math.random() * 6.283; ctx.beginPath(); ctx.moveTo(Math.cos(a) * it.r, Math.sin(a) * it.r); ctx.lineTo(Math.cos(a + .2) * it.r * 1.7 + (Math.random() - .5) * 6, Math.sin(a + .2) * it.r * 1.7 + (Math.random() - .5) * 6); ctx.lineTo(Math.cos(a) * it.r * 2.3, Math.sin(a) * it.r * 2.3); ctx.stroke(); } }
  } else if (st === 4) {                    // glitch portal: nested squares with an RGB split
    for (let k = 0; k < 3; k++) {
      ctx.save(); ctx.rotate(it.spin * (k % 2 ? -1 : 1) * .7 + k * .3); const R = it.r * (1.5 + k * .65), o = 2.5;
      ctx.lineWidth = 2.6 - k * .5; ctx.strokeStyle = 'rgba(5,217,232,' + (.6 - k * .12) + ')'; ctx.strokeRect(-R - o, -R, R * 2, R * 2);
      ctx.strokeStyle = 'rgba(255,60,200,' + (.6 - k * .12) + ')'; ctx.strokeRect(-R + o, -R, R * 2, R * 2); ctx.restore();
    }
  } else if (st === 5) {                    // v52 sinkhole: stretched rhombus shells that shear around the core
    for (let k = 0; k < 3; k++) {
      ctx.save(); ctx.rotate(it.spin * (k % 2 ? -.6 : .6)); ctx.scale(.62, 1.5); const R = it.r * (1.5 + k * .65);
      ctx.strokeStyle = 'rgba(255,98,40,' + (.75 - k * .15) + ')'; ctx.lineWidth = 2.6 - k * .5;
      ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(R, 0); ctx.lineTo(0, R); ctx.lineTo(-R, 0); ctx.closePath(); ctx.stroke(); ctx.restore();
    }
  } else {
    for (let k = 0; k < 3; k++) {
      ctx.save(); ctx.rotate(it.spin * (1 + k * .4) + k); ctx.scale(1, .45);
      ctx.strokeStyle = 'rgba(190,140,255,' + (.55 - k * .12) + ')'; ctx.lineWidth = 3 - k * .6;
      ctx.beginPath(); ctx.arc(0, 0, it.r * (1.7 + k * .7), 0, 4.6); ctx.stroke(); ctx.restore();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  if (st === 4) {
    ctx.fillStyle = '#050310'; ctx.save(); ctx.rotate(it.spin * .5); ctx.fillRect(-it.r, -it.r, it.r * 2, it.r * 2);
    ctx.strokeStyle = 'rgba(255,200,245,.9)'; ctx.lineWidth = 2; ctx.strokeRect(-it.r, -it.r, it.r * 2, it.r * 2); ctx.restore();
  } else {
    ctx.fillStyle = st === 3 ? '#0A0204' : '#050310'; ctx.beginPath(); ctx.arc(0, 0, it.r, 0, 6.283); ctx.fill();
    if (st <= 1) { const pr = ctx.createLinearGradient(-it.r, -it.r, it.r, it.r); pr.addColorStop(0, 'rgba(255,255,255,.95)'); pr.addColorStop(.5, 'rgba(' + A + ',.9)'); pr.addColorStop(1, 'rgba(255,255,255,.35)'); ctx.strokeStyle = pr; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, 0, it.r * 1.04, 0, 6.283); ctx.stroke(); }
    ctx.strokeStyle = st === 1 ? 'rgba(160,245,255,.9)' : st === 2 ? 'rgba(235,252,255,.95)' : st === 3 ? 'rgba(255,140,70,.95)' : 'rgba(220,190,255,.9)'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.restore();
}

function drawOrb(it, t) {
  const st = ST.curStage, gold = it.type === 'gold', O = OSTYLE[st], col = gold ? O.g : O.b, r = it.r, pu = 1 + Math.sin(t * 6 + it.ph) * .12, ph = it.ph || 0;
  glow(0, 0, 44 * pu, col, .5);
  ctx.lineJoin = 'round';
  if (st === 0) {
    drawMoonOrb(it, t, gold, r, pu, ph);
  } else if (st === 1) {
    drawReefOrb(it, t, gold, r, pu, ph, col);
  } else if (st === 99) {                      // Nebula Reef: pearl bubble / golden sea-star
    if (!gold) {
      const R = r * pu * 1.05, g = ctx.createRadialGradient(-R * .3, -R * .3, R * .1, 0, 0, R);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.45, 'rgba(120,235,255,.4)'); g.addColorStop(1, 'rgba(255,120,220,.6)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(-R * .38, -R * .42, R * .22, R * .12, -.7, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(R * .38, R * .4, R * .1, 0, 6.283); ctx.fill();
    } else {
      ctx.rotate(Math.sin(t * 2 + ph) * .25);
      ctx.beginPath();
      for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, rr = (k % 2 ? r * .55 : r * 1.3) * pu; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#FF9E3D'; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.fillStyle = '#FFE9B0'; ctx.beginPath(); ctx.arc(0, 0, r * .3, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,140,60,.8)'; for (let k = 0; k < 5; k++) { const a = k * 1.2566 - 1.57; ctx.beginPath(); ctx.arc(Math.cos(a) * r * .62, Math.sin(a) * r * .62, 1.5, 0, 6.283); ctx.fill(); }
    }
  } else if (st === 2) {                      // Aurora Sea: glacier gem / sun-dog halo
    drawGlacierOrb(it, t, gold, r, pu, ph, col);
  } else if (st === 3) {                      // Crimson Storm: plasma globe / storm coin
    if (gold) drawStormCoin(it, t, r, pu, ph, col); else drawPlasmaOrb(it, t, r, pu, ph);
  } else if (st === 5) {                      // Overflow Reach: strata sphere / hex prism
    drawStrataOrb(it, t, gold, r, pu, ph, col);
  } else {                                    // Neon Mirage: holo diamond gem / 8-bit star
    if (!gold) {
      const R = r * 1.25 * pu, dia = (dx, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(dx, -R); ctx.lineTo(dx + R * .78, 0); ctx.lineTo(dx, R); ctx.lineTo(dx - R * .78, 0); ctx.closePath(); ctx.fill(); };
      dia(-2, 'rgba(255,60,200,.65)'); dia(2, 'rgba(5,217,232,.65)'); dia(0, '#DDFCFF');
      ctx.fillStyle = '#05D9E8'; ctx.beginPath(); ctx.moveTo(0, -R * .55); ctx.lineTo(R * .42, 0); ctx.lineTo(0, R * .55); ctx.lineTo(-R * .42, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(-R * .45, ((t * 28 + ph * 9) % (R * 2)) - R, R * .9, 1.6);
    } else {
      const c = r * .5, P = ['..X..', '.XXX.', 'XXXXX', '.XXX.', '.X.X.'];
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass ? col : '#8A5A00';
        for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (P[y][x] === 'X') ctx.fillRect((x - 2.5) * c * pu + (pass ? 0 : 1.6), (y - 2.5) * c * pu + (pass ? 0 : 1.6), c * pu, c * pu);
      }
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-c * .5, -c * 1.5, c, c * .5);
    }
  }
}
// warning sign above a comet lane, in each stage's own shape
function drawWarnSign(x, y, locked, t, CS) {
  const sc = 1 + (locked ? .14 * Math.sin(t * 30) : 0);
  if (ST.curStage === 4) { pxIcon(x, y, 1.1 * sc, locked, t); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.fillStyle = locked ? CS.laneHi : CS.laneLo; ctx.strokeStyle = '#14132B'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (ST.curStage === 1) { ctx.arc(0, 0, 16, 0, 6.283); ctx.moveTo(-5, 14); ctx.lineTo(0, 24); ctx.lineTo(6, 14); }       // speech bubble
  else if (ST.curStage === 2) { ctx.moveTo(0, -20); ctx.lineTo(18, 0); ctx.lineTo(0, 20); ctx.lineTo(-18, 0); ctx.closePath(); }  // diamond
  else if (ST.curStage === 3) { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); } ctx.closePath(); }   // octagon
  else { ctx.moveTo(0, -14); ctx.lineTo(16, 14); ctx.lineTo(-16, 14); ctx.closePath(); }                                     // classic triangle
  ctx.stroke(); ctx.fill();
  ctx.fillStyle = '#14132B'; ctx.font = '700 17px MothDisplay, serif'; ctx.textAlign = 'center'; ctx.fillText('!', 0, ST.curStage === 0 ? 11 : 6);
  ctx.restore();
}

export function drawItem(it, t) {
  if (it.jack) { drawJack(it, t); return; }
  if (it.type === 'comet') { drawComet(it, t); return; }
  if (it.type === 'spore') { drawSpore(it, t); return; }
  if (it.type === 'shard') { drawShard(it, t); return; }
  if (it.type === 'strike') { if (ST.curStage === 4) drawPixelBurst(it, t); else if (ST.curStage === 2 && it.warn > 0) drawFrostWarn(it, t); else if (ST.curStage === 3 && it.warn > 0) drawStormWarn(it, t); else drawStrike(it, t); return; }
  if (it.type === 'ispike') { drawIceSpike(it, t); return; }
  if (it.type === 'gate') { drawGate(it, t); return; }
  if (it.type === 'shear') { drawShear(it, t); return; }
  if (it.type === 'owl') { drawOwl(it, t); return; }
  if (it.type === 'cloud') { drawCloud(it, t); return; }
  if (it.type === 'popup') { drawPopup(it, t); return; }
  if (it.type === 'marq') { drawMarq(it, t); return; }
  if (it.type === 'lbar') { drawLbar(it, t); return; }
  if (it.type === 'xsweep') { drawXSweep(it, t); return; }
  if (it.type === 'hole') { drawHole(it, t); return; }
  if (it.px) { drawPxBullet(it, t); return; }
  if (it.type === 'shuriken' && !it.bullet && ST.curStage === 4) drawGlitchGhost(it, t);
  const oq = (ST.curStage === 5 && it.type === 'shuriken' && !it.bullet) ? ovQ() : 1;        // v52: Overflow Reach hazards are drawn on a coarser grid as heat rises (hit area unchanged, at most a few px)
  ctx.save(); ctx.translate(oq > 1 ? Math.round(it.x / oq) * oq : it.x, oq > 1 ? Math.round(it.y / oq) * oq : it.y);
  if (it.type === 'shuriken') {
    if (ST.curStage === 4 && !it.bullet && !reduceMotion) {      // Glitch Heat: hot hazards flicker, a hazard about to jump flickers harder
      const fl = it.gl ? Math.sin(t * 40) < 0 : (ST.dispD >= .75 && Math.sin(t * 22 + it.ph * 9) > .8);
      if (fl) { ctx.globalAlpha *= .45; ctx.translate((Math.random() - .5) * 4, 0); }
    }
    const SS = SH_STYLE[ST.curStage], R = it.r * 1.55;
    glow(0, 0, 48, SS.glow, ST.curStage === 5 ? .16 : .55);
    ctx.rotate(it.spin);
    ctx.fillStyle = SS.fill; ctx.strokeStyle = SS.stroke; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (SS.kind === 'thorn') {                 // Nebula Reef: glossy sea-urchin
      drawUrchin(R, it.r, SS, t, it.ph);
    } else if (SS.kind === 'ice') {            // Aurora Sea: faceted frost star
      drawFrostStar(R, SS, it.spin, t);
    } else if (SS.kind === 'cd') {             // Neon Mirage: iridescent compact disc
      let cg;
      if (ctx.createConicGradient) {
        cg = ctx.createConicGradient(0, 0, 0);
        [[0, '#7df9ff'], [.2, '#ff71ce'], [.4, '#fffb96'], [.6, '#b967ff'], [.8, '#05ffa1'], [1, '#7df9ff']].forEach(s => cg.addColorStop(s[0], s[1]));
      } else { cg = ctx.createLinearGradient(-R, -R, R, R); cg.addColorStop(0, '#7df9ff'); cg.addColorStop(.5, '#ff71ce'); cg.addColorStop(1, '#fffb96'); }
      ctx.fillStyle = cg; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, 0, R * .98, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(0, 0, R * .98, -.5, .25); ctx.arc(0, 0, R * .62, .25, -.5, true); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#14072B'; ctx.beginPath(); ctx.arc(0, 0, R * .3, 0, 6.283); ctx.fill();
    } else if (SS.kind === 'blade') {          // Crimson Storm: forged pinwheel blade with heated edge
      drawForgedBlade(R, SS, it.spin, t);
    } else if (SS.kind === 'slab') {           // Overflow Reach: a stretched, sheared strata chunk
      drawSlabStar(R, SS, t);
    } else {                                   // Moonlit Garden: faceted steel star
      drawNinjaStar(R, it.r, SS, it.spin, t);
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = SS.hub; ctx.beginPath(); ctx.arc(0, 0, it.r * .22, 0, 6.283); ctx.fill();
  } else if (it.type === 'power') {
    const col = POWER_COL[it.kind], pu = 1 + Math.sin(t * 5 + it.ph) * .1;
    glow(0, 0, 50 * pu, col, .55);
    if (ST.curStage <= 3) drawPowerDisc(it, col, pu, t);
    else {
      ctx.fillStyle = 'rgba(20,19,43,.92)'; ctx.beginPath(); ctx.arc(0, 0, it.r * pu, 0, 6.283); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
    }
    drawGlyph(it.kind, col);
  } else {
    drawOrb(it, t);
  }
  ctx.restore();
}
