import { ST } from '../state.js';
import { ctx, reduceMotion } from '../config.js';
import { heat, warpAmt, SIDES } from '../core.js';
import { stretchAbout } from './cosmic.js';
import { glow } from './glow.js';

export function drawGearTrail(t) {
  if (ST.trailId === 'dust' || !ST.trailPts.length || !ST.moth) return;
  const Y = p => ST.moth.y + 14 + p.a * 190;      // points stream downward behind the moth, so sideways moves bend the trail
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (ST.trailId === 'ribbon') {
    for (let i = 1; i < ST.trailPts.length; i++) {
      const p = ST.trailPts[i], q = ST.trailPts[i - 1], f = 1 - p.a / .7; if (f <= 0) continue;
      ctx.strokeStyle = 'hsla(' + ((150 + p.a * 260 + t * 40) % 360) + ',90%,65%,' + (.55 * f) + ')'; ctx.lineWidth = 3 + 9 * f;
      ctx.beginPath(); ctx.moveTo(q.x, Y(q)); ctx.lineTo(p.x, Y(p)); ctx.stroke();
    }
  } else if (ST.trailId === 'bolt') {
    for (const [lw, al] of [[7, .22], [2, .9]]) {
      ctx.strokeStyle = 'rgba(190,230,255,' + al + ')'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(ST.moth.x, ST.moth.y + 10);
      for (let i = 0; i < ST.trailPts.length; i += 2) { const p = ST.trailPts[i]; if (p.a > .45) break; ctx.lineTo(p.x + (reduceMotion ? 0 : (Math.sin(p.sd * 99 + t * 30)) * 9), Y(p)); }
      ctx.stroke();
    }
  } else if (ST.trailId === 'pixels') {
    for (const p of ST.trailPts) { const f = 1 - p.a / .7; if (f <= 0) continue; const sz = 3 + ((p.sd * 4) | 0); ctx.fillStyle = (p.sd > .5 ? 'rgba(5,217,232,' : 'rgba(255,60,200,') + f + ')'; ctx.fillRect(((p.x + (p.sd - .5) * 26) | 0), (Y(p) | 0), sz, sz); }
  } else if (ST.trailId === 'bubbles') {
    ctx.lineWidth = 1.5;
    for (let i = 0; i < ST.trailPts.length; i += 2) { const p = ST.trailPts[i], f = 1 - p.a / .7; if (f <= 0) continue; ctx.strokeStyle = 'rgba(210,250,255,' + (.7 * f) + ')'; ctx.beginPath(); ctx.arc(p.x + Math.sin(p.a * 9 + p.sd * 6) * 8, Y(p), 3 + p.sd * 5, 0, 6.283); ctx.stroke(); }
  }
  ctx.restore();
}

// Moth shots: glowing drops of wing-dust that leave a fluttering trail of motes
function moteDrop(x, y, r, len) {
  ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0);
  ctx.quadraticCurveTo(x + r * .6, y + len * .5, x, y + len);
  ctx.quadraticCurveTo(x - r * .6, y + len * .5, x - r, y);
  ctx.fill();
}
export function drawMote(bl) {
  const x = bl.x, y = bl.y, pr = !bl.pierce, ga = ctx.globalAlpha;
  ctx.fillStyle = pr ? 'rgba(210,190,255,.35)' : 'rgba(94,234,212,.32)';
  moteDrop(x, y, 6.5, 22);
  ctx.fillStyle = pr ? '#F3EBFF' : '#DDFFF9';
  moteDrop(x, y, 3.1, 14);
  if (!reduceMotion) {
    ctx.fillStyle = pr ? 'rgba(235,225,255,.7)' : 'rgba(190,255,245,.7)';
    for (let k = 1; k <= 3; k++) {
      const sw = Math.sin(y * .05 + k * 2.1 + x * .03) * (2 + k);
      ctx.globalAlpha = ga * (.65 - k * .15);
      ctx.beginPath(); ctx.arc(x + sw, y + 14 + k * 9, 1.8 - k * .3, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = ga;
  }
}

// the moth flies up, so its light-speed streak trails below it: echoes of its own shape, stretched along the flight path
export function drawMothTrail(t, pulse) {
  const wv = warpAmt();
  if (wv <= .06 || !ST.moth) return;
  const lean = Math.max(-.5, Math.min(.5, ST.moth.tilt * 2)), ul = Math.hypot(lean * .5, 1), ux = -lean * .5 / ul, uy = 1 / ul;
  const N = ST.lowFx ? 4 : 8, step = 8 * (1 + wv * 1.6), x0 = ST.moth.x, y0 = ST.moth.y;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = N; k >= 1; k--) {
    const gx = x0 + ux * k * step, gy = y0 + uy * k * step;
    if (gy > ST.H + 60) continue;
    ctx.save(); stretchAbout(gx, gy, ux, uy, 1 + wv * (.45 + k * .2));
    ST.moth.x = gx; ST.moth.y = gy; drawMoth(t, pulse, .16 * wv * (1 - k / (N + 1)));
    ctx.restore();
  }
  ST.moth.x = x0; ST.moth.y = y0;
  ctx.restore();
}

export function drawMothShadow(t) {                                           // v53: over land the moth throws a soft shadow down and to the right
  const k = ST.uw[5]; if (k < .05 || ST.state === 'menu' || ST.state === 'pv') return;
  const flap = reduceMotion ? .8 : .45 + Math.abs(Math.sin(t * (16 + ST.dispD * 10))) * .55;
  ctx.save(); ctx.globalAlpha = .28 * k; ctx.translate(ST.moth.x + 16, ST.moth.y + 30); ctx.rotate(Math.max(-.35, Math.min(.35, ST.moth.tilt))); ctx.scale(1, .62); ctx.fillStyle = '#000';
  for (const side of SIDES) { ctx.save(); ctx.scale(side * flap, 1); ctx.beginPath(); ctx.ellipse(20, -6, 26, 14, -.5, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(15, 10, 16, 9, .5, 0, 6.283); ctx.fill(); ctx.restore(); }
  ctx.beginPath(); ctx.ellipse(0, 2, 5, 14, 0, 0, 6.283); ctx.fill(); ctx.restore();
}
export function drawMoth(t, pulse, ghostA) {
  if (ghostA !== undefined) ctx.globalAlpha = ghostA;
  else if (ST.pw.phaseT > 0) ctx.globalAlpha = .45;
  else if (ST.inv > 0 && ST.od <= 0 && !ST.trans && Math.floor(ST.inv * 12) % 2 === 0) ctx.globalAlpha = .35;
  const { x, y, tilt } = ST.moth;
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.max(-.35, Math.min(.35, tilt)));
  if (ghostA === undefined) glow(0, 0, 70 + ST.dispD * 60 + pulse * 22, ST.dispD > .1 ? heat(ST.dispD) : ST.skin.g, .35 + ST.dispD * .25);
  const flap = reduceMotion ? .8 : .45 + Math.abs(Math.sin(t * (16 + ST.dispD * 10))) * .55;
  for (const side of SIDES) {
    ctx.save(); ctx.scale(side * flap, 1);
    ctx.fillStyle = ST.skin.a;
    ctx.beginPath(); ctx.ellipse(20, -6, 26, 14, -.5, 0, 6.283); ctx.fill();
    ctx.fillStyle = ST.skin.b;
    ctx.beginPath(); ctx.ellipse(15, 10, 16, 9, .5, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = ST.skin.body;
  ctx.beginPath(); ctx.ellipse(0, 2, 5, 14, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = ST.skin.body; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-2, -11); ctx.quadraticCurveTo(-9, -24, -13, -22);
  ctx.moveTo(2, -11); ctx.quadraticCurveTo(9, -24, 13, -22); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
}

export function drawMothFx(t) {
  if (ST.od > 0) {
    ctx.save(); ctx.translate(ST.moth.x, ST.moth.y);
    glow(0, 0, 100, 'rgba(255,209,102,1)', .5);
    ctx.strokeStyle = 'rgba(255,209,102,' + (.5 + .3 * Math.sin(t * 10)) + ')'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 38 + Math.sin(t * 8) * 3, 0, 6.283); ctx.stroke(); ctx.restore();
  }
  if (ST.pw.shield) {
    ctx.save(); ctx.translate(ST.moth.x, ST.moth.y);
    ctx.strokeStyle = 'rgba(125,184,255,' + (.55 + .25 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, 6.283); ctx.stroke();
    glow(0, 0, 44, 'rgba(125,184,255,1)', .28); ctx.restore();
  }
  if (ST.pw.magnet > 0) {
    const r = 200 - ((t * 120) % 140);
    ctx.save(); ctx.translate(ST.moth.x, ST.moth.y);
    ctx.strokeStyle = 'rgba(255,158,216,' + (.5 * (1 - (200 - r) / 140)) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke(); ctx.restore();
  }
  if (ST.pw.seedT > 0 || ST.pw.seedFx > 0) {                                  // v54 Reseed: a lime lattice round the moth while the land holds still
    const a = Math.min(1, (ST.pw.seedT || 0) / 1.2) * .2 + Math.max(0, ST.pw.seedFx || 0) * .3, R = 260, cs = 36;
    ctx.save(); ctx.beginPath(); ctx.arc(ST.moth.x, ST.moth.y, R, 0, 6.283); ctx.clip();
    ctx.strokeStyle = 'rgba(205,226,106,' + a + ')'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = Math.floor((ST.moth.x - R) / cs) * cs; x <= ST.moth.x + R; x += cs) { ctx.moveTo(x, ST.moth.y - R); ctx.lineTo(x, ST.moth.y + R); }
    for (let y = Math.floor((ST.moth.y - R) / cs) * cs; y <= ST.moth.y + R; y += cs) { ctx.moveTo(ST.moth.x - R, y); ctx.lineTo(ST.moth.x + R, y); }
    ctx.stroke(); ctx.restore();
  }
}
