import { ST } from '../state.js';
import { PLANET_SETS, ROGUE_PAL, ctx, reduceMotion } from '../config.js';
import { warpAmt } from '../core.js';
import { auroraPlanet, crimsonPlanet, drawPlanetBody } from './planets.js';
import { glow } from './glow.js';
import { fxRnd } from './sprites-b.js';


// ---------- exoplanets
export function makePlanet(tier, y, x, r, palOverride) {
  const set = PLANET_SETS[tier], pal = palOverride || set[(Math.random() * set.length) | 0];
  const type = palOverride ? palOverride.type : pal.types[(Math.random() * pal.types.length) | 0];
  r = r || 26 + Math.random() * 64;
  const depth = (r - 26) / 64;
  const p = { x: x !== undefined ? x : Math.random() * ST.W, y: y !== undefined ? y : -r * 2, r,
    vy: 8 + depth * 30, vx: (Math.random() - .5) * 5, type, c1: pal.c1, c2: pal.c2, atm: pal.atm,
    seed: (Math.random() * 4294967296) | 0, o: Math.random(), spr: null,
    ring: type === 'ringed', tilt: (Math.random() - .5) * .8, ph: Math.random() * 6.28, craters: [], cracks: [], bands: [] };
  if (type === 'rock' || type === 'earth') for (let i = 0; i < (type === 'earth' ? 9 : 7); i++) p.craters.push({ a: Math.random() * 6.283, d: Math.random() * .75, s: .08 + Math.random() * .16 });
  if (type === 'lava') for (let i = 0; i < 5; i++) {
    const a = Math.random() * 6.283, d = .2 + Math.random() * .7; let x1 = Math.cos(a) * d, y1 = Math.sin(a) * d; const pts = [[x1, y1]];
    for (let k = 0; k < 4; k++) { x1 += (Math.random() - .5) * .5; y1 += (Math.random() - .5) * .5; pts.push([x1, y1]); }
    p.cracks.push(pts);
  }
  for (let i = 0; i < 9; i++) p.bands.push({ y: -1 + i * .25 + Math.random() * .1, h: .07 + Math.random() * .12, a: .12 + Math.random() * .2, dark: Math.random() < .5 });
  return p;
}

export function drawRingHalf(p, front, g) {
  g = g || ctx;
  const r = p.r, a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : 6.283;
  const B = p.big ? [[1.5, .14, 1, .55], [1.85, .2, 1, .5], [2.2, .1, 1, .4], [1.68, .04, 0, .3], [2.42, .05, 0, .2]] : [[1.7, .22, 1, .5], [1.45, .07, 0, .25]];
  g.save(); g.rotate(p.tilt); g.scale(1, .3);
  for (const b of B) {
    g.strokeStyle = b[2] ? 'rgba(' + p.atm + ',' + (b[3] + (front ? .1 : 0)) + ')' : 'rgba(255,255,255,' + (b[3] + (front ? .05 : 0)) + ')';
    g.lineWidth = r * b[1]; g.beginPath(); g.arc(0, 0, r * b[0], a0, a1); g.stroke();
  }
  g.restore();
}

// ---------- deep-sky background objects (everything except plain planets, which use makePlanet/drawPlanet)
export function spawnBg(kind, sIdx) {
  const R = (a, b) => a + Math.random() * (b - a);
  if (kind === 'exo') { ST.planets.push(sIdx === 3 ? crimsonPlanet() : sIdx === 2 ? auroraPlanet() : makePlanet(sIdx)); return; }
  if (kind === 'rings' && sIdx === 2) { ST.planets.push(auroraPlanet(undefined, undefined, 'glint')); return; }
  if (kind === 'rogue') { ST.planets.push(makePlanet(0, undefined, undefined, R(26, 54), ROGUE_PAL)); return; }
  if (kind === 'rings') {
    const set = PLANET_SETS[sIdx], pal = set[(Math.random() * set.length) | 0];
    const p = makePlanet(sIdx, undefined, undefined, R(32, 62), Object.assign({}, pal, { type: 'ringed' }));
    p.big = true; p.tilt = (Math.random() - .5) * .6; ST.planets.push(p); return;
  }
  const o = { kind, x: R(.12, .88) * ST.W, y: 0, r: 40, vy: R(7, 20), vx: 0, ph: Math.random() * 6.28, col: '255,255,255', tilt: R(-.6, .6) };
  switch (kind) {
    case 'cluster': o.r = R(36, 64); o.col = '255,230,190'; o.pts = [];
      for (let i = 0; i < (ST.lowFx ? 16 : 36); i++) o.pts.push({ a: Math.random() * 6.283, d: Math.pow(Math.random(), 1.7), s: R(.6, 2.1), c: ['255,243,214', '200,222,255', '255,205,170'][(Math.random() * 3) | 0] });
      break;
    case 'sat': o.r = R(14, 22); o.mode = Math.random() < .65 ? 'sat' : 'debris'; o.vx = R(-14, 14); o.spin = R(-.4, .4); o.col = '170,190,230'; o.frags = [];
      for (let i = 0; i < 7; i++) o.frags.push({ x: R(-2.2, 2.2) * o.r, y: R(-1.6, 1.6) * o.r, a: Math.random() * 6.283, w: R(3, 9), h: R(2, 5), va: R(-1.5, 1.5) });
      break;
    case 'ship': o.r = R(14, 20); o.mode = Math.random() < .7 ? 'ship' : 'saucer'; o.vy = R(14, 26); o.vx = R(-18, 18); o.col = '255,190,120'; break;
    case 'snr': o.r = R(60, 100); o.col = '255,120,180'; break;
    case 'galcl': o.r = R(70, 110); o.col = '255,210,170'; o.gal = [];
      for (let i = 0; i < 7; i++) o.gal.push({ x: R(-1, 1) * o.r * .8, y: R(-.6, .6) * o.r * .8, rot: R(0, 3.14), w: R(10, 26), e: R(.3, .6), c: ['255,225,190', '200,220,255', '255,200,210'][(Math.random() * 3) | 0], sp: Math.random() < .5 });
      break;
    case 'whitehole': o.r = R(36, 52); o.col = '255,255,255'; break;
    case 'pulsar': o.r = R(34, 46); o.col = '180,220,255'; break;
    case 'quasar': o.r = R(52, 78); o.col = '200,230,255'; break;
    case 'gw': o.r = R(70, 110); o.col = '165,205,255'; break;
    case 'neutron': o.r = R(20, 26); o.col = '150,200,255'; break;
    case 'filament': o.r = ST.W * .55; o.x = ST.W / 2; o.col = '150,170,255'; o.vy = R(5, 10); o.nodes = [];
      for (let i = 0; i < 9; i++) o.nodes.push({ x: (i / 8 * 2 - 1) * o.r + R(-20, 20), y: R(-.7, .7) * o.r * .5, s: R(6, 16) });
      break;
    case 'wormhole': o.r = R(44, 62); o.col = '150,190,255'; break;
    case 'supernova': o.r = R(50, 80); o.col = '255,200,140'; break;
    case 'wdwarf': o.r = R(10, 14); o.col = '170,210,255'; break;
    case 'magnetar': o.r = R(34, 46); o.col = '200,140,255'; break;
    case 'exotic': o.r = R(50, 70); o.col = '255,200,255'; break;
    case 'dyson': o.r = R(42, 70); o.col = '255,215,150'; o.mode = Math.random() < .5 ? 'sphere' : 'swarm'; o.hex = []; o.pan = [];
      { const hs = o.r * .3;
        for (let row = -3; row <= 3; row++) for (let col = -3; col <= 3; col++) {
          const hx = (col + (row & 1 ? .5 : 0)) * hs * 1.732, hy = row * hs * 1.5;
          if (Math.hypot(hx, hy) < o.r * 1.05) o.hex.push({ x: hx, y: hy, solid: Math.random() < .72 });
        } }
      for (let i = 0; i < 70; i++) o.pan.push({ a0: Math.random() * 6.283, rad: o.r * R(.55, 1.25), inc: R(.15, .9), tl: R(0, 3.14), spd: R(.2, .7) * (Math.random() < .5 ? -1 : 1), sz: R(1.6, 3.2) });
      break;
    case 'dysonring': o.r = R(44, 66); o.col = '255,215,150'; o.tilt = R(-.5, .5); break;
    case 'engine': o.r = R(40, 62); o.col = '255,225,170'; o.ang = R(-.5, .5) + (Math.random() < .5 ? 0 : Math.PI); break;
    case 'matrioshka': o.r = R(46, 70); o.col = '255,170,90'; break;
  }
  o.y = -o.r * 3;
  ST.cosmos.push(o);
}

export function drawCosmic(o, t) { drawWithTrail(o, drawCosmicBody, t); }
function drawCosmicBody(o, t) {
  const R = o.r, tt = t + o.ph, LT = 'lighter', SO = 'source-over', TAU = 6.283;
  ctx.save(); ctx.translate(o.x, o.y);
  switch (o.kind) {
    case 'cluster': {
      glow(0, 0, R * 1.3, 'rgba(255,225,180,1)', .3);
      for (let i = 0; i < o.pts.length; i++) {
        const q = o.pts[i], x = Math.cos(q.a) * q.d * R, y = Math.sin(q.a) * q.d * R * .9;
        ctx.fillStyle = 'rgba(' + q.c + ',' + (.55 + .45 * Math.sin(tt * 2 + i * 1.7)) + ')'; ctx.beginPath(); ctx.arc(x, y, q.s, 0, TAU); ctx.fill();
        if (q.s > 1.6) glow(x, y, q.s * 5, 'rgba(' + q.c + ',1)', .25);
      }
      break;
    }
    case 'sat': {
      glow(0, 0, R * 1.6, 'rgba(170,190,230,1)', .1);
      if (o.mode === 'debris') {
        for (const f of o.frags) {
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a + tt * f.va);
          ctx.fillStyle = '#69718A'; ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = .8; ctx.strokeRect(-f.w / 2, -f.h / 2, f.w, f.h);
          ctx.restore();
          if (Math.sin(tt * 3 + f.a) > .93) glow(f.x, f.y, 9, 'rgba(255,255,255,1)', .8);
        }
      } else {
        ctx.rotate(tt * o.spin); const u = R / 14;
        ctx.fillStyle = '#2B4C9B'; ctx.strokeStyle = 'rgba(180,210,255,.7)'; ctx.lineWidth = .8;
        [-27, 7].forEach(px => {
          ctx.fillRect(px * u, -5 * u, 20 * u, 10 * u); ctx.strokeRect(px * u, -5 * u, 20 * u, 10 * u);
          ctx.beginPath(); ctx.moveTo((px + 6.7) * u, -5 * u); ctx.lineTo((px + 6.7) * u, 5 * u); ctx.moveTo((px + 13.4) * u, -5 * u); ctx.lineTo((px + 13.4) * u, 5 * u); ctx.stroke();
        });
        ctx.fillStyle = '#B8C0D2'; ctx.fillRect(-7 * u, -9 * u, 14 * u, 18 * u);
        ctx.fillStyle = '#D9B45A'; ctx.fillRect(-7 * u, -3 * u, 14 * u, 5 * u);
        ctx.fillStyle = '#E6E9F2'; ctx.beginPath(); ctx.arc(0, -9 * u, 4 * u, Math.PI, TAU); ctx.fill();
        if (Math.sin(tt * 4) > .6) glow(0, 9 * u, 11, 'rgba(255,70,70,1)', .9);
      }
      break;
    }
    case 'ship': {
      const u = R / 16;
      if (o.mode === 'saucer') {
        ctx.rotate(Math.sin(tt * .8) * .12);
        glow(0, 0, R * 1.8, 'rgba(160,230,255,1)', .14);
        const dg = ctx.createLinearGradient(0, -6 * u, 0, 6 * u); dg.addColorStop(0, '#C6CFE6'); dg.addColorStop(1, '#6C7794');
        ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(0, 0, 19 * u, 6 * u, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(125,216,255,.75)'; ctx.beginPath(); ctx.ellipse(0, -3 * u, 8 * u, 6 * u, 0, Math.PI, TAU); ctx.fill();
        for (let k = 0; k < 5; k++) { const on = Math.sin(tt * 5 + k * 1.3) > 0; ctx.fillStyle = on ? '#FFE27A' : '#8A7A3A'; ctx.beginPath(); ctx.arc((k - 2) * 7 * u, 2.5 * u, 1.4 * u, 0, TAU); ctx.fill(); }
      } else {
        const fl = (10 + 4 * Math.sin(tt * 30)) * u;
        ctx.fillStyle = '#8E9BBB';
        ctx.beginPath(); ctx.moveTo(5 * u, 2 * u); ctx.lineTo(17 * u, 14 * u); ctx.lineTo(5 * u, 12 * u); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-5 * u, 2 * u); ctx.lineTo(-17 * u, 14 * u); ctx.lineTo(-5 * u, 12 * u); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#CBD3E6'; ctx.beginPath(); ctx.moveTo(0, -18 * u); ctx.lineTo(5 * u, -4 * u); ctx.lineTo(5 * u, 12 * u); ctx.lineTo(-5 * u, 12 * u); ctx.lineTo(-5 * u, -4 * u); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FF6B6B'; ctx.fillRect(-5 * u, 4 * u, 10 * u, 2 * u);
        ctx.fillStyle = '#7DD8FF'; ctx.beginPath(); ctx.ellipse(0, -5 * u, 2.3 * u, 4 * u, 0, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = LT;
        const fg = ctx.createLinearGradient(0, 12 * u, 0, 12 * u + fl); fg.addColorStop(0, 'rgba(255,241,192,.95)'); fg.addColorStop(1, 'rgba(255,140,60,0)');
        ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-3 * u, 12 * u); ctx.lineTo(0, 12 * u + fl); ctx.lineTo(3 * u, 12 * u); ctx.closePath(); ctx.fill();
        for (let k = 1; k <= 5; k++) { ctx.fillStyle = 'rgba(255,190,120,' + (.5 - k * .08) + ')'; ctx.beginPath(); ctx.arc(Math.sin(tt * 6 + k) * 2 * u, 12 * u + fl + k * 8 * u, 1.6 * u, 0, TAU); ctx.fill(); }
        ctx.globalCompositeOperation = SO;
        glow(0, 14 * u, 12 * u, 'rgba(255,170,90,1)', .55);
      }
      break;
    }
    case 'snr': {
      ctx.globalCompositeOperation = LT;
      const cols = ['255,110,170', '110,200,255', '200,150,255', '255,180,110'];
      for (let k = 0; k < 4; k++) {
        const rad = R * (.45 + .18 * k), n = 48; ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const a = i / n * TAU, rr = rad * (1 + .1 * Math.sin(a * (3 + k) + o.ph + tt * .15 * (k % 2 ? 1 : -1)) + .05 * Math.sin(a * 7 + k));
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .85);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(' + cols[k] + ',.14)'; ctx.lineWidth = R * .1; ctx.stroke();
        ctx.strokeStyle = 'rgba(' + cols[k] + ',.55)'; ctx.lineWidth = 1.6; ctx.stroke();
      }
      glow(0, 0, R * .5, 'rgba(255,200,230,1)', .3);
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = SO;
      break;
    }
    case 'galcl': {
      glow(0, 0, R * 1.2, 'rgba(255,200,150,1)', .1);
      for (const g of o.gal) {
        ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot + tt * .02); ctx.scale(1, g.e);
        glow(0, 0, g.w, 'rgba(' + g.c + ',1)', .55); glow(0, 0, g.w * .35, 'rgba(255,245,220,1)', .9);
        if (g.sp) {
          ctx.strokeStyle = 'rgba(' + g.c + ',.5)'; ctx.lineWidth = 1.2;
          for (let arm = 0; arm < 2; arm++) { ctx.beginPath(); for (let a = 0; a < 4; a += .25) ctx.lineTo(Math.cos(a + arm * Math.PI) * a * g.w * .25, Math.sin(a + arm * Math.PI) * a * g.w * .25); ctx.stroke(); }
        }
        ctx.restore();
      }
      break;
    }
    case 'whitehole': {
      ctx.globalCompositeOperation = LT;
      glow(0, 0, R * 1.6, 'rgba(255,255,255,1)', .45);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
      for (let k = 0; k < 12; k++) {
        const a = k * .5236 + tt * .15, len = R * (1.1 + .5 * Math.sin(tt * 2 + k * 1.3));
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * .25, Math.sin(a) * R * .25); ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.stroke();
      }
      for (let k = 0; k < 3; k++) {
        const ph = (tt * .5 + k / 3) % 1;
        ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - ph) * .5) + ')'; ctx.lineWidth = 1 + 2 * (1 - ph);
        ctx.beginPath(); ctx.arc(0, 0, R * (.4 + ph * 1.4), 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, R * .22, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = SO;
      break;
    }
    case 'pulsar': {
      ctx.globalCompositeOperation = LT;
      glow(0, 0, R * .9, 'rgba(170,210,255,1)', .35);
      ctx.save(); ctx.rotate(tt * 3.2);
      const L = R * 2.6;
      for (let sd = 0; sd < 2; sd++) {
        ctx.save(); ctx.rotate(sd * Math.PI);
        const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, 'rgba(200,230,255,.8)'); g.addColorStop(1, 'rgba(120,180,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(L, -L * .07); ctx.lineTo(L, L * .07); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      glow(0, 0, R * .5, 'rgba(220,240,255,1)', Math.max(0, Math.sin(tt * 6.4)) * .6);
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = SO;
      break;
    }
    case 'quasar': {
      ctx.globalCompositeOperation = LT;
      const fk = .85 + .15 * Math.sin(tt * 9);
      ctx.save(); ctx.rotate(o.tilt);
      for (let sd = -1; sd <= 1; sd += 2) {
        const g = ctx.createLinearGradient(0, 0, 0, sd * R * 3.2); g.addColorStop(0, 'rgba(190,230,255,' + (.8 * fk) + ')'); g.addColorStop(1, 'rgba(110,160,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-R * .05, 0); ctx.lineTo(-R * .22, sd * R * 3.2); ctx.lineTo(R * .22, sd * R * 3.2); ctx.lineTo(R * .05, 0); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,200,140,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, R * .85, R * .2, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,235,200,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, R * .55, R * .13, 0, 0, TAU); ctx.stroke();
      ctx.restore();
      glow(0, 0, R * 1.5, 'rgba(255,235,200,1)', .65 * fk);
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, R * .12, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = SO;
      break;
    }
    case 'gw': {
      ctx.globalCompositeOperation = LT;
      for (let k = 0; k < 5; k++) {
        const ph = (tt * .35 + k / 5) % 1, rad = R * (.15 + ph * .95);
        ctx.strokeStyle = 'rgba(165,205,255,' + ((1 - ph) * .4) + ')'; ctx.lineWidth = 1 + 2 * (1 - ph); ctx.beginPath();
        for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU, rr = rad * (1 + .1 * Math.cos(2 * (a - tt * 1.8))); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .8); }
        ctx.stroke();
      }
      const ang = tt * 4, d = R * .1;
      glow(Math.cos(ang) * d, Math.sin(ang) * d, 14, 'rgba(255,255,255,1)', .9); glow(-Math.cos(ang) * d, -Math.sin(ang) * d, 14, 'rgba(150,190,255,1)', .9);
      ctx.globalCompositeOperation = SO;
      break;
    }
    case 'neutron': {
      ctx.globalCompositeOperation = LT;
      glow(0, 0, R * 1.8, 'rgba(150,200,255,1)', .45);
      ctx.strokeStyle = 'rgba(120,200,255,.35)'; ctx.lineWidth = 1.2;
      ctx.save(); ctx.rotate(tt * .5); ctx.beginPath(); ctx.ellipse(0, 0, R * 1.5, R * .5, 0, 0, TAU); ctx.stroke(); ctx.rotate(.6); ctx.beginPath(); ctx.ellipse(0, 0, R * 1.5, R * .5, 0, 0, TAU); ctx.stroke(); ctx.restore();
      glow(0, 0, R * .6, 'rgba(255,255,255,1)', .8);
      ctx.fillStyle = '#EAF6FF'; ctx.beginPath(); ctx.arc(0, 0, R * .18, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = SO;
      break;
    }
    case 'filament': {
      ctx.globalCompositeOperation = LT;
      const N = o.nodes, sh = .75 + .25 * Math.sin(tt * .8);
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = 'rgba(150,170,255,' + (pass ? .35 * sh : .09) + ')'; ctx.lineWidth = pass ? 1.2 : 6; ctx.beginPath();
        for (let i = 0; i < N.length - 1; i++) { ctx.moveTo(N[i].x, N[i].y); ctx.lineTo(N[i + 1].x, N[i + 1].y); if (i % 2 === 0 && i + 2 < N.length) { ctx.moveTo(N[i].x, N[i].y); ctx.lineTo(N[i + 2].x, N[i + 2].y + 24); } }
        ctx.stroke();
      }
      for (const n of N) { glow(n.x, n.y, n.s * 2.4, 'rgba(200,210,255,1)', .5 * sh); ctx.fillStyle = 'rgba(235,240,255,.9)'; ctx.beginPath(); ctx.arc(n.x, n.y, 1.8, 0, TAU); ctx.fill(); }
      ctx.globalCompositeOperation = SO;
      break;
    }
    case 'wormhole': {                                                      // v48-v1: a rift seam, a jagged tear with light leaking out
      if (!o.seam) { const n = 9; o.seam = []; let yy = 0; for (let i = 0; i <= n; i++) { yy += (Math.random() - .5) * R * .35; o.seam.push([(i / n - .5) * R * 2.4, yy * .8]); } }
      ctx.rotate(o.tilt * .9);
      const br = reduceMotion ? .85 : .75 + .25 * Math.sin(tt * .8), pa = () => { ctx.beginPath(); ctx.moveTo(o.seam[0][0], o.seam[0][1]); for (let i = 1; i < o.seam.length; i++) ctx.lineTo(o.seam[i][0], o.seam[i][1]); };
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = SO; ctx.strokeStyle = 'rgba(20,2,8,.6)'; ctx.lineWidth = R * .28; pa(); ctx.stroke();
      ctx.globalCompositeOperation = LT; glow(0, 0, R * 1.5, 'rgba(255,90,60,1)', .3 * br);
      for (const [lw, col] of [[R * .16, 'rgba(255,60,40,' + .28 * br + ')'], [R * .07, 'rgba(255,150,80,' + .6 * br + ')'], [1.6, 'rgba(255,236,215,' + .95 * br + ')']]) { ctx.strokeStyle = col; ctx.lineWidth = lw; pa(); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,170,110,' + .22 * br + ')'; ctx.lineWidth = 1.2;
      for (let i = 1; i < o.seam.length - 1; i += 2) { const q = o.seam[i], sg = i % 4 === 1 ? -1 : 1; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + (i % 3 - 1) * 5, q[1] + sg * R * (.4 + (i % 3) * .15)); ctx.stroke(); }
      ctx.globalCompositeOperation = SO;
      break;
    }
    case 'supernova': {
      const ph = (tt * .16) % 1, a = Math.pow(1 - ph, 1.4);
      ctx.globalCompositeOperation = LT;
      glow(0, 0, R * (.5 + ph * 1.8), 'rgba(255,200,140,1)', .8 * a + .1); glow(0, 0, R * .5 * (1 - ph * .5), 'rgba(255,255,255,1)', .9 * a);
      ctx.strokeStyle = 'rgba(255,170,110,' + (a * .6) + ')'; ctx.lineWidth = 2 + 4 * (1 - ph); ctx.beginPath(); ctx.arc(0, 0, R * (.2 + ph * 1.5), 0, TAU); ctx.stroke();
      const L = R * (1.9 - ph) * (.6 + .4 * a);
      ctx.strokeStyle = 'rgba(255,255,255,' + (a * .8) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L, 0); ctx.moveTo(0, -L); ctx.lineTo(0, L); ctx.stroke();
      ctx.fillStyle = 'rgba(255,220,170,' + a + ')';
      for (let k = 0; k < 10; k++) { const ang = k * .628 + o.ph, d = R * ph * 1.6 * (.6 + .4 * ((k * .37) % 1)); ctx.beginPath(); ctx.arc(Math.cos(ang) * d, Math.sin(ang) * d, 1.6, 0, TAU); ctx.fill(); }
      ctx.globalCompositeOperation = SO;
      break;
    }
    case 'wdwarf': {
      ctx.globalCompositeOperation = LT;
      glow(0, 0, R * 2.8, 'rgba(170,210,255,1)', .5);
      ctx.strokeStyle = 'rgba(220,240,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-R * 1.8, 0); ctx.lineTo(R * 1.8, 0); ctx.moveTo(0, -R * 1.8); ctx.lineTo(0, R * 1.8); ctx.stroke();
      ctx.fillStyle = '#F4FAFF'; ctx.beginPath(); ctx.arc(0, 0, R * .45, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = SO;
      break;
    }
    case 'magnetar': {
      ctx.globalCompositeOperation = LT;
      glow(0, 0, R * 1.2, 'rgba(190,130,255,1)', .4);
      const fl = Math.pow(Math.max(0, Math.sin(tt * .6)), 24);
      ctx.save(); ctx.rotate(.5 + Math.sin(tt * .2) * .1);
      for (let k = 1; k <= 4; k++) {
        const Lk = R * (.5 + k * .35);
        ctx.strokeStyle = 'rgba(200,150,255,' + (.55 - k * .08 + fl * .3) + ')'; ctx.lineWidth = 1.6;
        for (let sd = -1; sd <= 1; sd += 2) {
          ctx.beginPath();
          for (let i = 0; i <= 24; i++) { const th = i / 24 * Math.PI, rr = Lk * Math.sin(th) * Math.sin(th); ctx.lineTo(sd * rr * Math.sin(th), rr * Math.cos(th)); }
          ctx.stroke();
        }
      }
      ctx.restore();
      if (!reduceMotion) {                                                  // crackling arcs jumping off the field lines
        const cs = (tt * 9) | 0; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let k = 0; k < 3; k++) {
          if (fxRnd(cs * 3.1 + k * 7.7) < .4) continue;
          const a0 = k * 2.1 + fxRnd(cs + k) * 1.5, a1 = a0 + .5 + fxRnd(cs * 2 + k) * .9, ar = [];
          for (let i = 0; i <= 6; i++) { const f = i / 6, aa = a0 + (a1 - a0) * f, rr = R * (.14 + f * (.9 + fxRnd(cs + k) * .5)) + (i && i < 6 ? (fxRnd(cs * 5 + k * 11 + i) - .5) * R * .22 : 0); ar.push([Math.cos(aa) * rr, Math.sin(aa) * rr]); }
          for (const [lw, col] of [[3.2, 'rgba(190,130,255,.35)'], [1.2, 'rgba(240,215,255,.9)']]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(ar[0][0], ar[0][1]); for (let i = 1; i < ar.length; i++) ctx.lineTo(ar[i][0], ar[i][1]); ctx.stroke(); }
        }
      }
      if (fl > .05) glow(0, 0, R * 2.2, 'rgba(255,230,255,1)', fl * .8);
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, R * .12, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = SO;
      break;
    }
    case 'exotic': {
      ctx.globalCompositeOperation = LT;
      glow(0, 0, R * 1.3, 'rgba(255,255,255,1)', .3 + .15 * Math.sin(tt * 3));
      for (let k = 0; k < 6; k++) {
        ctx.save(); ctx.rotate(tt * (.35 + k * .12) * (k % 2 ? 1 : -1));
        const sd = k % 2 ? 3 : 4, sr = R * (1 - k * .14);
        ctx.strokeStyle = 'hsla(' + (((k * 55 + tt * 50) % 360) | 0) + ',100%,70%,.55)'; ctx.lineWidth = 1.8; ctx.beginPath();
        for (let i = 0; i <= sd; i++) { const a = i / sd * TAU; ctx.lineTo(Math.cos(a) * sr, Math.sin(a) * sr); }
        ctx.stroke(); ctx.restore();
      }
      for (let k = 0; k < 6; k++) {
        const a = tt * .8 + k * 1.047, x = Math.cos(a) * R * 1.1, y = Math.sin(a) * R * 1.1;
        ctx.fillStyle = 'hsla(' + (((k * 60 + tt * 70) % 360) | 0) + ',100%,75%,.8)';
        ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 3, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 3, y); ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = SO;
      break;
    }
    case 'dyson': {
      glow(0, 0, R * 1.5, 'rgba(255,215,150,1)', .7);
      if (o.mode === 'sphere') {           // Dyson sphere: unfinished lattice shell, the star blazes through the gaps
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip();
        const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, R); sg.addColorStop(0, '#FFF3C8'); sg.addColorStop(.6, '#FFB347'); sg.addColorStop(1, '#C8641E');
        ctx.fillStyle = sg; ctx.fillRect(-R, -R, R * 2, R * 2);
        const hs = R * .3;
        for (const h of o.hex) {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; ctx.lineTo(h.x + Math.cos(a) * hs * .98, h.y + Math.sin(a) * hs * .98); }
          ctx.closePath();
          if (h.solid) { ctx.fillStyle = 'rgba(46,52,72,.95)'; ctx.fill(); }
          ctx.strokeStyle = 'rgba(160,180,220,.55)'; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = 'rgba(160,180,220,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
        glow(0, 0, R * 1.15, 'rgba(255,200,120,1)', .2);
      } else {                             // Dyson swarm: thousands of collector panels in crossing orbits
        for (let pass = 0; pass < 2; pass++) {
          if (pass === 1) { ctx.fillStyle = '#FFF1C9'; ctx.beginPath(); ctx.arc(0, 0, R * .2, 0, TAU); ctx.fill(); }
          for (let i = 0; i < o.pan.length; i++) {
            const q = o.pan[i], a = q.a0 + tt * q.spd;
            if ((Math.sin(a) < 0) === (pass === 1)) continue;
            const x0 = Math.cos(a) * q.rad, y0 = Math.sin(a) * q.rad * q.inc, cs = Math.cos(q.tl), sn = Math.sin(q.tl);
            const x = x0 * cs - y0 * sn, y = x0 * sn + y0 * cs;
            ctx.fillStyle = (i * 7 + Math.floor(tt * 3)) % 13 === 0 ? 'rgba(255,255,255,1)' : 'rgba(200,215,240,.9)';
            ctx.fillRect(x - q.sz, y - q.sz * .6, q.sz * 2, q.sz * 1.2);
          }
        }
      }
      break;
    }
    case 'dysonring': {
      const half = front => {
        ctx.save(); ctx.rotate(o.tilt); ctx.scale(1, .3);
        const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : TAU;
        ctx.strokeStyle = '#4A5069'; ctx.lineWidth = R * .16; ctx.beginPath(); ctx.arc(0, 0, R * 1.25, a0, a1); ctx.stroke();
        ctx.strokeStyle = 'rgba(154,167,200,.85)'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.arc(0, 0, R * 1.25 - R * .05, a0, a1); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,214,150,.8)'; ctx.lineWidth = R * .035; ctx.setLineDash([R * .22, R * .09]); ctx.lineDashOffset = -tt * R * .1;
        ctx.beginPath(); ctx.arc(0, 0, R * 1.25 + R * .04, a0, a1); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
      };
      half(false);
      glow(0, 0, R * 1.5, 'rgba(255,215,150,1)', .7);
      ctx.fillStyle = '#FFF1C9'; ctx.beginPath(); ctx.arc(0, 0, R * .42, 0, TAU); ctx.fill();
      half(true);
      break;
    }
    case 'engine': {                       // stellar engine: a vast mirror arc and an uneven plume of starlight
      glow(0, 0, R * 1.5, 'rgba(255,225,170,1)', .7);
      ctx.save(); ctx.rotate(o.ang);
      ctx.globalCompositeOperation = LT;
      const pg = ctx.createLinearGradient(0, 0, -R * 3, 0); pg.addColorStop(0, 'rgba(255,210,150,.4)'); pg.addColorStop(1, 'rgba(255,150,80,0)');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(0, -R * .2); ctx.lineTo(-R * 3, -R * .9); ctx.lineTo(-R * 3, R * .9); ctx.lineTo(0, R * .2); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = SO;
      ctx.fillStyle = '#FFF1C9'; ctx.beginPath(); ctx.arc(0, 0, R * .42, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#B9C8E8'; ctx.lineWidth = R * .12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, R * 1.25, -.87, .87); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,180,.85)'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.arc(0, 0, R * 1.17, -.87, .87); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.restore();
      break;
    }
    case 'matrioshka': {
      ctx.globalCompositeOperation = LT;
      glow(0, 0, R * 1.3, 'rgba(255,170,90,1)', .4);
      ctx.globalCompositeOperation = SO;
      const cl = ['255,230,170', '255,170,90', '230,90,50', '150,40,40'];
      for (let k = 3; k >= 0; k--) {
        const rad = R * (.4 + k * .2);
        ctx.fillStyle = 'rgba(' + cl[k] + ',.07)'; ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(' + cl[k] + ',.55)'; ctx.lineWidth = 2; ctx.setLineDash([rad * .5, rad * .15, rad * .1, rad * .15]); ctx.lineDashOffset = -tt * rad * .3 * (k % 2 ? 1 : -1);
        ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        for (let j = 0; j < 4; j++) { const a = j * 1.571 + k + tt * .15 * (k % 2 ? 1 : -1); glow(Math.cos(a) * rad, Math.sin(a) * rad, 7, 'rgba(' + cl[k] + ',1)', .5); }
      }
      ctx.fillStyle = '#FFF4D6'; ctx.beginPath(); ctx.arc(0, 0, R * .12, 0, TAU); ctx.fill();
      break;
    }
  }
  ctx.restore();
}

// stretch everything drawn next by factor f along the unit direction (ux, uy), about (gx, gy): a cheap directional (motion) blur
export function stretchAbout(gx, gy, ux, uy, f) {
  const th = Math.atan2(ux, -uy);
  ctx.translate(gx, gy); ctx.rotate(th); ctx.scale(1, f); ctx.rotate(-th); ctx.translate(-gx, -gy);
}
// light-speed trail: echoes of the object's own silhouette, smeared along its real direction of travel (scroll plus its own drift)
function drawWithTrail(o, body, t) {
  const wv = warpAmt();
  if (wv > .06) {
    const mult = 1 + ST.dispD * 5 + wv * 16;
    let ux = -(o.vx || 0), uy = -(o.vy || 8) * mult; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
    const N = ST.lowFx ? 3 : 7, base = Math.max(6, o.r * .28) * (1 + wv * 1.5), x0 = o.x, y0 = o.y, ga = ctx.globalAlpha;
    for (let k = N; k >= 1; k--) {
      const gx = x0 + ux * k * base, gy = y0 + uy * k * base;
      if (gy < -o.r * 3) continue;
      ctx.save(); stretchAbout(gx, gy, ux, uy, 1 + wv * (.5 + k * .22));   // farther echoes are blurred more
      o.x = gx; o.y = gy; ctx.globalAlpha = ga * .22 * wv * (1 - k / (N + 1)); body(o, t);
      ctx.restore();
    }
    o.x = x0; o.y = y0; ctx.globalAlpha = ga;
  }
  body(o, t);
}

export function drawPlanet(p, t) { drawWithTrail(p, drawPlanetBody, t); }
