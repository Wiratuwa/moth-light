import { ST } from '../state.js';
import { PAL, ctx, reduceMotion } from '../config.js';
import { kEio, kSm, rgb } from '../core.js';
import { makePlanet } from './cosmic.js';
import { auroraPlanet, crimsonPlanet, drawPlanetBody } from './planets.js';
import { stage, stageIdx } from '../spawn.js';
import { glow } from './glow.js';
import { art5 } from '../stages/overflow.js';
import { nmRnd } from '../stages/neon.js';

// v50: the stage cards now show each stage's own planet families. No ground, sea, shelf or horizon anywhere: we are flying through space.
let artPl = {};
let artPlSig = '';
const ART_SKY = [['#0F0E2E', '#2A2468', '#6B5BC4'], ['#1B0830', '#5A1670', '#C23A9A'], ['#031E2C', '#0A5560', '#1E9A8E'], ['#1E0409', '#5E0F1C', '#C2351F'], ['#1A0B4A', '#6A1A96', '#FF71CE'], ['#2C4A2A', '#3F6B30', '#8FB04A']];
function artStars(n, t, X, Y, maxY, col) {
  ctx.fillStyle = col || '#FFFFFF';
  for (let k = 0; k < n; k++) {
    ctx.globalAlpha = ST.artGA * (.25 + .6 * Math.abs(Math.sin(t * 1.2 + k * 1.7)));
    const s = k % 5 === 0 ? 2.2 : 1.4; ctx.fillRect(X(nmRnd(k * 3.1 + 1)), Y(nmRnd(k * 7.7 + 2) * maxY), s, s);
  }
  ctx.globalAlpha = ST.artGA;
}
function artPath(pts, X, Y) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); }
export function artMoth(cx, cy, s, t) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  const fl = .55 + Math.abs(Math.sin(t * 5)) * .45;
  for (const sd of [-1, 1]) { ctx.save(); ctx.scale(sd * fl, 1); ctx.fillStyle = ST.skin.a; ctx.beginPath(); ctx.ellipse(16, -5, 18, 9, -.5, 0, 6.283); ctx.fill(); ctx.fillStyle = ST.skin.b; ctx.beginPath(); ctx.ellipse(12, 7, 11, 6, .5, 0, 6.283); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = ST.skin.body; ctx.beginPath(); ctx.ellipse(0, 1, 3.6, 10, 0, 0, 6.283); ctx.fill(); ctx.restore();
}
function artWorld(card, key, mk, x, y, t, boost) {                // a real planet body from the game's own renderer, built once per card world and reused every frame
  const sig = (ST.lowFx ? 'L' : 'H') + Math.min(ST.DPR, 2);
  if (sig !== artPlSig) { artPl = {}; artPlSig = sig; }    // a new DPR or low-effects mode rebuilds the cached sprites
  let p = artPl[card + key]; if (!p) p = artPl[card + key] = mk();
  p.x = x; p.y = y; drawPlanetBody(p, t);
  if (boost) { ctx.save(); ctx.globalAlpha = ST.artGA * boost; ctx.globalCompositeOperation = 'lighter'; drawPlanetBody(p, t); ctx.restore(); }     // in the game bodies sit dim behind the hazards; on a card they get a lift
}
function artDust(X, Y, x0, y0, x1, y1, col, a, wd) {      // a soft dust lane: a chain of big dim puffs along a line
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k <= 9; k++) {
    const f = k / 9, px = X(x0 + (x1 - x0) * f), py = Y(y0 + (y1 - y0) * f + Math.sin(f * 6) * .03), r = wd * (.8 + .5 * nmRnd(k * 3.3 + 1));
    const g = ctx.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(' + col + ',' + (a * ST.artGA) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, 6.283); ctx.fill();
  }
  ctx.restore();
}
function artStarsC(n, t, X, Y, maxY, pal) {               // stars with a real colour spread
  for (let k = 0; k < n; k++) {
    ctx.fillStyle = 'rgb(' + pal[k % pal.length] + ')';
    ctx.globalAlpha = ST.artGA * (.25 + .6 * Math.abs(Math.sin(t * 1.1 + k * 1.7)));
    const s = k % 6 === 0 ? 2.3 : 1.4; ctx.fillRect(X(nmRnd(k * 3.1 + 1)), Y(nmRnd(k * 7.7 + 2) * maxY), s, s);
  }
  ctx.globalAlpha = ST.artGA;
}
function artFrost(cx, cy, r, ph) {                         // Moonlit frosted rock world: ridged highlands, fracture lines, a frost cap, never a smooth cratered disc
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.clip();
  const g = ctx.createRadialGradient(cx - r * .38, cy - r * .42, r * .1, cx, cy, r * 1.1);
  g.addColorStop(0, '#F4F2FF'); g.addColorStop(.45, '#B9B6E6'); g.addColorStop(1, '#3E3A86'); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) {                            // ridged highlands: pale ridge lines with a dark shadow beside them
    const yy = cy + (k - 2.5) * r * .3, bow = (k % 2 ? 1 : -1) * r * .16;
    ctx.strokeStyle = 'rgba(40,34,100,.22)'; ctx.lineWidth = r * .09; ctx.beginPath(); ctx.moveTo(cx - r, yy + r * .05); ctx.quadraticCurveTo(cx, yy + bow + r * .05, cx + r, yy + r * .05); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = r * .05; ctx.beginPath(); ctx.moveTo(cx - r, yy); ctx.quadraticCurveTo(cx, yy + bow, cx + r, yy); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(30,26,80,.5)'; ctx.lineWidth = 1;                     // long fracture lines
  for (let k = 0; k < 3; k++) { const a = ph + k * 2.1, sx = cx + Math.cos(a) * r * .8, sy = cy + Math.sin(a) * r * .8; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx + Math.cos(a + .5) * r * .1, cy + Math.sin(a + .5) * r * .1); ctx.lineTo(cx - Math.cos(a) * r * .55, cy - Math.sin(a) * r * .3); ctx.stroke(); }
  const cap = ctx.createRadialGradient(cx, cy - r * .95, 0, cx, cy - r * .95, r * .75); cap.addColorStop(0, 'rgba(255,255,255,.9)'); cap.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = cap; ctx.fillRect(cx - r, cy - r, r * 2, r);
  const sh = ctx.createRadialGradient(cx - r * .45, cy - r * .45, r * .5, cx, cy, r * 1.15); sh.addColorStop(0, 'rgba(8,6,40,0)'); sh.addColorStop(1, 'rgba(8,6,40,.62)'); ctx.fillStyle = sh; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore(); ctx.lineCap = 'butt';
  ctx.strokeStyle = 'rgba(205,215,255,.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, r - .6, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();     // cool rim light
}
function artTwilight(cx, cy, r) {                          // Moonlit twilight world: one lit crescent with a thin glowing atmosphere edge, the dark side only a silhouette
  glow(cx, cy, r * 2.2, 'rgba(255,214,130,1)', .22);
  ctx.fillStyle = '#080720'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.clip();
  const g = ctx.createLinearGradient(cx - r, 0, cx + r * .3, 0); g.addColorStop(0, 'rgba(255,226,150,.95)'); g.addColorStop(1, 'rgba(255,190,110,.1)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.arc(cx + r * .52, cy - r * .08, r * .94, 0, 6.283, true); ctx.fill('evenodd');
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,224,150,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, r + .8, Math.PI * .62, Math.PI * 1.45); ctx.stroke();
}
function artPearl(cx, cy, r, t) {                          // Nebula pearl world: a smooth glassy sphere with slow iridescent swirls, like nacre
  glow(cx, cy, r * 2.4, 'rgba(255,190,240,1)', .3);
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.clip();
  const g = ctx.createRadialGradient(cx - r * .35, cy - r * .4, r * .1, cx, cy, r * 1.05); g.addColorStop(0, '#FFFFFF'); g.addColorStop(.55, '#FFE3F6'); g.addColorStop(1, '#B58AD8'); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'lighter';
  [['120,240,255', 0], ['255,140,220', 2.1], ['190,170,255', 4.2]].forEach(a => {
    ctx.strokeStyle = 'rgba(' + a[0] + ',.38)'; ctx.lineWidth = r * .22;
    ctx.beginPath(); for (let i = 0; i <= 14; i++) { const f = i / 14, px = cx - r + f * r * 2, py = cy + Math.sin(f * 5 + t * .5 + a[1]) * r * .42 + (a[1] - 2.1) * r * .16; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
  });
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(cx - r * .38, cy - r * .42, r * .22, r * .12, -.6, 0, 6.283); ctx.fill();
}
function artMotes(cx, cy, rx, ry, tilt, t, front, n) {      // a ring made of drifting glowing motes instead of solid bands (brighter where it crosses in front)
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < n; k++) {
    const a = k * 2.399 + t * .12 * (1 + (k % 3) * .25), s = Math.sin(a); if ((s > 0) !== front) continue;
    const rr = 1 + (nmRnd(k * 1.7) - .5) * .22, px = Math.cos(a) * rx * rr, py = s * ry * rr, al = front ? .95 : .4;
    ctx.fillStyle = (k % 2 ? 'rgba(120,240,255,' : 'rgba(255,140,220,') + al * ST.artGA + ')'; ctx.beginPath(); ctx.arc(px, py, front ? 1.5 : 1.1, 0, 6.283); ctx.fill();
    if (front && k % 4 === 0) { ctx.fillStyle = 'rgba(255,255,255,' + .3 * ST.artGA + ')'; ctx.beginPath(); ctx.arc(px, py, 3, 0, 6.283); ctx.fill(); }
  }
  ctx.restore();
}
function artVeil(cx, cy, r, t) {                           // Nebula veiled gas giant: translucent cloud layers half buried in nebula gas
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.clip();
  const g = ctx.createRadialGradient(cx - r * .3, cy - r * .35, r * .1, cx, cy, r * 1.05); g.addColorStop(0, 'rgba(255,214,244,.78)'); g.addColorStop(.6, 'rgba(200,150,240,.55)'); g.addColorStop(1, 'rgba(100,150,230,.22)'); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? 'rgba(255,255,255,.14)' : 'rgba(110,60,170,.16)'; ctx.fillRect(cx - r, cy - r + k * r * .36 + Math.sin(t * .4 + k) * 2, r * 2, r * .2); }
  ctx.restore();
  for (let k = 0; k < 4; k++) {                            // nebula gas drifting across it so the edge fades into the cloud
    const px = cx + (k - 1.5) * r * .6 + Math.sin(t * .3 + k) * 5, py = cy + (k % 2 ? .45 : -.4) * r, pr = r * .85;
    const q = ctx.createRadialGradient(px, py, 0, px, py, pr); q.addColorStop(0, 'rgba(210,90,190,.34)'); q.addColorStop(1, 'rgba(210,90,190,0)'); ctx.fillStyle = q; ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.283); ctx.fill();
  }
}
function artJelly(jx, jy, jr, t) {                         // the Nebula signature creature, now a small cosmic jellyfish of star dust
  glow(jx, jy, jr * 2.6, 'rgba(255,120,210,1)', .4);
  const jg = ctx.createLinearGradient(0, jy - jr, 0, jy + jr * .3); jg.addColorStop(0, 'rgba(255,190,240,.95)'); jg.addColorStop(1, 'rgba(210,90,200,.55)');
  ctx.fillStyle = jg; ctx.beginPath(); ctx.arc(jx, jy, jr, Math.PI, 0); ctx.quadraticCurveTo(jx + jr * .5, jy + jr * .45, jx, jy + jr * .3); ctx.quadraticCurveTo(jx - jr * .5, jy + jr * .45, jx - jr, jy); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 0; k < 5; k++) ctx.fillRect(jx + (nmRnd(k * 2.1) - .5) * jr * 1.4, jy - nmRnd(k * 4.3) * jr * .8, 1.5, 1.5);
  ctx.strokeStyle = 'rgba(255,190,240,.8)'; ctx.lineWidth = 1.6;
  for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(jx + k * jr * .35, jy + jr * .3); for (let q = 1; q <= 6; q++) ctx.lineTo(jx + k * jr * .35 + Math.sin(t * 2.4 + q * .8 + k) * 4 * (q / 6), jy + jr * .3 + q * jr * .4); ctx.stroke(); }
  for (let k = 0; k < 6; k++) { ctx.fillStyle = 'rgba(255,230,250,' + (.8 * ST.artGA) + ')'; ctx.fillRect(jx + (nmRnd(k * 3.1) - .5) * jr * 2.2, jy + jr * .5 + nmRnd(k * 5.7) * jr * 2.4, 1.6, 1.6); }
}
function art0(t, x, y, w, h, X, Y) {                       // Moonlit Garden: plain, calm deep space with a violet ringed giant, a frosted companion pair and a twilight world
  artStarsC(36, t, X, Y, 1, ['205,222,255', '205,222,255', '255,214,150', '255,150,130']);
  artDust(X, Y, -.05, .95, 1.05, .05, '150,140,230', .16, h * .55);
  glow(X(.76), Y(.5), h * .62, 'rgba(170,130,255,1)', .22);
  artWorld(0, 'giant', () => { const p = makePlanet(0, 0, 0, 40, { type: 'ringed', c1: [196, 152, 255], c2: [50, 24, 112], atm: '176,130,255' }); p.tilt = -.38; return p; }, X(.76), Y(.5), t, .25);
  glow(X(.3), Y(.62), h * .3, 'rgba(190,190,255,1)', .22);
  artFrost(X(.3), Y(.62), h * .17, 1.2);
  artFrost(X(.3) + h * .26, Y(.62) - h * .2, h * .05, 3.4);     // the companion: a small world beside its planet, the only place a small moon appears
  artTwilight(X(.1), Y(.3), h * .09);
  glow(X(.52), Y(.8), h * .26, 'rgba(120,110,210,1)', .16);
  artMoth(X(.5), Y(.3 + Math.sin(t * 1.2) * .03), .8, t);
}
function art1(t, x, y, w, h, X, Y) {                       // Nebula Reef: coral, pearl and plankton-ring worlds in a glowing nebula, a veiled giant, a star-forming pillar and the jellyfish
  artDust(X, Y, -.05, .2, 1.05, .9, '255,130,215', .2, h * .6);
  artDust(X, Y, 1.05, .05, -.05, .75, '150,110,255', .14, h * .5);
  artStarsC(24, t, X, Y, 1, ['255,230,255', '190,220,255', '255,190,230']);
  const tx = X(.88), ty = Y(.56);                          // star-forming pillar: a tapered dark column hanging in from the edge, bright rim, protostar at its tip
  const L = [[.78, -.1], [.8, .1], [.83, .24], [.82, .34], [.86, .44], [.88, .56]], R = [[.99, -.1], [.97, .12], [.94, .26], [.95, .38], [.91, .47], [.88, .56]];
  const pig = ctx.createLinearGradient(X(.78), 0, X(.98), 0); pig.addColorStop(0, 'rgba(70,16,86,.98)'); pig.addColorStop(1, 'rgba(26,6,44,.98)');
  ctx.fillStyle = pig; ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(X(R[i][0]), Y(R[i][1])); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,160,225,.7)'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); ctx.stroke(); ctx.lineJoin = 'miter';
  glow(tx, ty + 2, h * .26, 'rgba(255,200,140,1)', .8 + .15 * Math.sin(t * 2)); ctx.fillStyle = '#FFF2D0'; ctx.beginPath(); ctx.arc(tx, ty + 2, 2.8, 0, 6.283); ctx.fill();
  artVeil(X(.07), Y(.84), h * .27, t);
  artJelly(X(.25), Y(.3 + Math.sin(t * .9) * .03), h * .085, t);
  glow(X(.62), Y(.5), h * .55, 'rgba(255,110,190,1)', .3);
  artWorld(1, 'coral', () => makePlanet(1, 0, 0, 34, { type: 'coral', c1: [255, 134, 176], c2: [90, 20, 110], atm: '255,110,190' }), X(.6), Y(.5), t, .3);
  artPearl(X(.39), Y(.72), h * .12, t);
  const rx = X(.79), ry = Y(.8), pr = h * .075;             // plankton-ring world: dim planet, ring of motes passing behind and in front
  artMotes(rx, ry, h * .27, h * .08, -.3, t, false, 46);
  glow(rx, ry, pr * 2.6, 'rgba(120,230,255,1)', .3);
  const pg = ctx.createRadialGradient(rx - pr * .35, ry - pr * .35, pr * .1, rx, ry, pr * 1.1); pg.addColorStop(0, '#CFF8FF'); pg.addColorStop(1, '#3A3A9A'); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(rx, ry, pr, 0, 6.283); ctx.fill();
  artMotes(rx, ry, h * .27, h * .08, -.3, t, true, 46);
}
function art2(t, x, y, w, h, X, Y) {                       // Aurora Sea: ribbons of polar light over glacier, crystal and glint-ring worlds, with a field of tumbling ice shards
  artStars(34, t, X, Y, .6, '#E8FFFA');
  ctx.globalCompositeOperation = 'lighter';
  [['94,255,190', .28], ['80,200,255', .4], ['190,120,255', .22]].forEach((a, b) => {
    const top = [], bot = [], N = 28;
    for (let i = 0; i <= N; i++) {
      const fx = i / N, yy = Y(a[1] + Math.sin(fx * 5 + t * .5 + b * 2) * .07 + Math.sin(fx * 11 - t * .7 + b) * .025);
      top.push([X(fx), yy]); bot.push([X(fx), yy + h * (.26 + .06 * Math.sin(fx * 7 + t + b))]);
    }
    const g = ctx.createLinearGradient(0, Y(a[1] - .1), 0, Y(a[1] + .4));
    g.addColorStop(0, 'rgba(' + a[0] + ',0)'); g.addColorStop(.3, 'rgba(' + a[0] + ',.5)'); g.addColorStop(1, 'rgba(' + a[0] + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); top.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); for (let i = N; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
  for (let k = 0; k < 14; k++) {                           // far field of small, dim, tumbling ice shards
    const sx = X(nmRnd(k * 2.7 + 1)), sy = Y(.08 + nmRnd(k * 5.3 + 2) * .86), a = t * (.4 + nmRnd(k) * .6) + k, sz = 2 + nmRnd(k * 1.9) * 3;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(a); ctx.fillStyle = 'rgba(200,245,255,' + (.28 * ST.artGA) + ')'; ctx.beginPath(); ctx.moveTo(0, -sz * 1.6); ctx.lineTo(sz * .7, 0); ctx.lineTo(0, sz * 1.6); ctx.lineTo(-sz * .7, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  glow(X(.72), Y(.55), h * .6, 'rgba(140,255,220,1)', .2);
  artWorld(2, 'glacier', () => { const p = auroraPlanet(0, 0, 'glacier'); p.r = 37; p.aurStorm = true; return p; }, X(.72), Y(.55), t, .18);
  glow(X(.36), Y(.64), h * .3, 'rgba(180,170,255,1)', .22);
  artWorld(2, 'crystal', () => { const p = auroraPlanet(0, 0, 'crystal'); p.r = 21; return p; }, X(.36), Y(.64), t, .3);
  artWorld(2, 'glint', () => { const p = auroraPlanet(0, 0, 'glint'); p.r = 15; return p; }, X(.11), Y(.32), t, .3);
  const fq = (t % 3.4) / .55;                              // a rare prism flare: a short rainbow streak when the crystal world turns toward the light
  if (fq < 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1.6; const fa = Math.sin(fq * Math.PI) * .8 * ST.artGA;
    [['255,120,160', -3], ['255,230,130', -1], ['120,255,200', 1], ['130,170,255', 3]].forEach(c => { ctx.strokeStyle = 'rgba(' + c[0] + ',' + fa + ')'; ctx.beginPath(); ctx.moveTo(X(.36) + 10, Y(.64) - 14 + c[1]); ctx.lineTo(X(.36) + 44, Y(.64) - 36 + c[1]); ctx.stroke(); });
    ctx.restore();
  }
}
function art3(t, x, y, w, h, X, Y) {                       // Crimson Storm: a space rift full of thunderstorms, with a storm cell, a tempest giant, a cracked magma world and a splitting world
  const fl = (t % 2.6) < .14 || (t % 3.7) > 3.55 ? 1 : 0, A = .5 + .5 * fl;
  artStarsC(16, t, X, Y, 1, ['255,200,170', '255,150,120']);
  const pts = []; for (let i = 0; i <= 16; i++) pts.push([.45 + (nmRnd(i * 3.7 + 1) - .5) * .09 + Math.sin(i * .55) * .045, -.1 + i * .075]);   // the rift: a jagged seam across the whole sky
  glow(X(.45), Y(.5), h * .85, 'rgba(255,90,40,1)', .3 + .15 * fl);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
  [[22, .12], [11, .26], [4.2, .7], [1.4, 1]].forEach((a, k) => { ctx.strokeStyle = k > 2 ? 'rgba(255,245,225,' + (.9 * ST.artGA) + ')' : 'rgba(255,' + (110 + k * 40) + ',60,' + (a[1] * A * ST.artGA) + ')'; ctx.lineWidth = a[0]; artPath(pts, X, Y); ctx.stroke(); });
  ctx.globalCompositeOperation = 'source-over'; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
  glow(X(.66), Y(.46), h * .5, 'rgba(255,90,60,1)', .2);
  artWorld(3, 'storm', () => crimsonPlanet(0, 0, 'storm', 58), X(.2), Y(.52), t, .5);
  artWorld(3, 'tempest', () => crimsonPlanet(0, 0, 'tempest', 40), X(.7), Y(.46), t, .35);
  artWorld(3, 'split', () => crimsonPlanet(0, 0, 'split', 21), X(.45), Y(.74), t, .5);
  artWorld(3, 'magma', () => crimsonPlanet(0, 0, 'magma', 18), X(.9), Y(.76), t, .5);
  const bolt = [[.2, .56], [.17, .72], [.23, .76], [.19, .94], [.25, 1.02]];            // sheet lightning flickering out of the storm cell
  if (fl) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
    [[8, .2], [3.5, .5], [1.4, 1]].forEach(a => { ctx.strokeStyle = a[0] > 2 ? 'rgba(255,170,90,' + a[1] * ST.artGA + ')' : 'rgba(255,255,240,' + ST.artGA + ')'; ctx.lineWidth = a[0]; artPath(bolt, X, Y); ctx.stroke(); });
    ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  }
  ctx.fillStyle = 'rgba(255,140,60,.9)';
  for (let k = 0; k < 18; k++) { const ex = X((nmRnd(k * 1.7) + t * .02 * (k % 3 - 1)) % 1), ey = Y(1.05 - ((t * .12 * (1 + nmRnd(k)) + nmRnd(k + 4)) % 1.1)); ctx.globalAlpha = ST.artGA * .8; ctx.fillRect(ex, ey, 1.8, 1.8); }
  ctx.globalAlpha = ST.artGA;
}
function artPalm(px, py, s, lean, t) {
  ctx.strokeStyle = '#0F0430'; ctx.lineCap = 'round'; ctx.lineWidth = 4;
  const tx = px + lean * s * .5, ty = py - s; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + lean * s * .1, py - s * .5, tx, ty); ctx.stroke();
  ctx.lineWidth = 3;
  for (let k = 0; k < 6; k++) { const a = -2.7 + k * .45 + Math.sin(t * .8 + k) * .05, L = s * .55; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(a) * L * .6, ty + Math.sin(a) * L * .6 - 8, tx + Math.cos(a) * L, ty + Math.sin(a) * L + 12); ctx.stroke(); }
  ctx.lineCap = 'butt';
}
function art4(t, x, y, w, h, X, Y) {                       // Neon Mirage: a striped sun, a flat grid, palms and old-computer relics
  artStars(20, t, X, Y, .5, '#FFE9FA');
  const sx = X(.5), sy = Y(.5), sr = h * .34;
  glow(sx, sy, sr * 2.2, 'rgba(255,113,206,1)', .6);
  const sg = ctx.createLinearGradient(0, sy - sr, 0, sy + sr); sg.addColorStop(0, '#FFF27A'); sg.addColorStop(.55, '#FF9ED8'); sg.addColorStop(1, '#FF3CC8');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 6.283); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 6.283); ctx.clip(); ctx.fillStyle = '#5E1790';
  for (let k = 0; k < 6; k++) ctx.fillRect(sx - sr, sy + sr * (.02 + .17 * k), sr * 2, 1.5 + k * 1.7);
  ctx.restore();
  ctx.fillStyle = '#240A55'; ctx.fillRect(x, Y(.74), w, h * .26);
  ctx.strokeStyle = 'rgba(5,217,232,.75)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let k = 0; k <= 12; k++) { ctx.moveTo(X(k / 12), Y(.74)); ctx.lineTo(X(k / 12), y + h); }
  const gh = h * .26 / 4, off = (t * 10) % gh;
  for (let k = 0; k <= 4; k++) { const gy = Y(.74) + off + k * gh; if (gy < y + h) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); } }
  ctx.stroke(); ctx.fillStyle = 'rgba(255,113,206,.9)'; ctx.fillRect(x, Y(.74) - 1, w, 2);
  artPalm(X(.08), Y(.78), h * .5, .5, t); artPalm(X(.93), Y(.78), h * .42, -.5, t);
  const wx = X(.82), wy = Y(.2);
  ctx.fillStyle = '#C0C0C0'; ctx.fillRect(wx, wy, 42, 30); ctx.fillStyle = '#1084D0'; ctx.fillRect(wx + 2, wy + 2, 38, 7); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(wx + 33, wy + 3, 5, 5);
  ctx.fillStyle = '#E01010'; ctx.beginPath(); ctx.arc(wx + 11, wy + 20, 5, 0, 6.283); ctx.fill(); ctx.fillStyle = '#404040'; ctx.fillRect(wx + 20, wy + 17, 16, 2); ctx.fillRect(wx + 20, wy + 22, 11, 2);
  ctx.strokeStyle = 'rgba(255,113,206,.9)'; ctx.lineWidth = 1.5; ctx.strokeRect(wx - 1, wy - 1, 44, 32);
  const cx = X(.2), cy = Y(.24 + Math.sin(t * 1.4) * .02);
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.beginPath(); [[0, 0], [0, 19], [5, 15], [9, 23], [12, 22], [8, 14], [14, 14]].forEach((p, i) => i ? ctx.lineTo(cx + p[0], cy + p[1]) : ctx.moveTo(cx + p[0], cy + p[1])); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let k = 0; k < 4; k++) { const sx2 = X(.3 + k * .14), sy2 = Y(.16 + nmRnd(k) * .3), a = Math.abs(Math.sin(t * 2 + k * 1.7)); ctx.fillStyle = 'rgba(125,249,255,' + (ST.artGA * a) + ')'; ctx.fillRect(sx2 - 5, sy2 - .5, 10, 1); ctx.fillRect(sx2 - .5, sy2 - 5, 1, 10); }
  ctx.fillStyle = 'rgba(0,0,0,.10)'; for (let yy = y; yy < y + h; yy += 3) ctx.fillRect(x, yy, w, 1);
}
const ART = [art0, art1, art2, art3, art4, art5];
function drawStageArt(i, x, y, w, h, t) {
  if (reduceMotion) t = 0;
  ST.artGA = ctx.globalAlpha;
  const sk = ART_SKY[i], X = f => x + f * w, Y = f => y + f * h;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, sk[0]); g.addColorStop(.55, sk[1]); g.addColorStop(1, sk[2]);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ART[i](t, x, y, w, h, X, Y);
  ctx.restore();
}

// ---------- stage intro card: an art band that opens like a shutter, then the name and the rule
export function drawStageCard() {
  const p = ST.card.t, DUR = 3.6, S = stage(), cy = ST.pop.c, bh = 144, top = cy - 96, mid = top + bh / 2;
  const k = Math.min(kEio(p / .45), 1 - kEio(kSm(DUR - .8, DUR - .1, p))), fade = kEio(p / .3) * (1 - kEio(kSm(DUR - .3, DUR, p)));
  if (k <= .002 || fade <= .002) return;
  const hh = bh * k, y0 = mid - hh / 2, glowC = rgb(PAL[stageIdx()].glow);
  ctx.save(); ctx.globalAlpha = fade; ctx.textAlign = 'center';
  ctx.save(); ctx.beginPath(); ctx.rect(0, y0, ST.W, hh); ctx.clip();
  drawStageArt(stageIdx(), 0, top, ST.W, bh, p + 2);
  const sh = ctx.createRadialGradient(ST.W / 2, mid, 10, ST.W / 2, mid, ST.W * .62); sh.addColorStop(0, 'rgba(8,6,26,.55)'); sh.addColorStop(1, 'rgba(8,6,26,0)'); ctx.fillStyle = sh; ctx.fillRect(0, top, ST.W, bh);
  const eg = ctx.createLinearGradient(0, 0, ST.W, 0); eg.addColorStop(0, 'rgba(8,6,26,.7)'); eg.addColorStop(.18, 'rgba(8,6,26,0)'); eg.addColorStop(.82, 'rgba(8,6,26,0)'); eg.addColorStop(1, 'rgba(8,6,26,.7)'); ctx.fillStyle = eg; ctx.fillRect(0, top, ST.W, bh);
  // the text lives inside the box: it is squashed and clipped with it, so it closes together with the art
  ctx.translate(0, mid); ctx.scale(1, k); ctx.translate(0, -mid);
  const ta = kEio(kSm(.15, .6, p)), tb = kEio(kSm(.3, .75, p)), outA = 1 - kEio(kSm(DUR - .95, DUR - .45, p));
  const lx = -(1 - ta) * 110 + kEio(kSm(DUR - .95, DUR - .25, p)) * ST.W * .7;      // swings in from the left, then out to the right
  ctx.font = '700 38px MothDisplay, serif';
  const nw = ctx.measureText(S.name).width, fs = Math.min(38, 38 * (ST.W - 56) / nw);
  ctx.save(); ctx.translate(ST.W / 2, cy);
  ctx.globalAlpha = fade * ta * outA; ctx.font = '700 14px MothText, sans-serif'; ctx.fillStyle = 'rgba(240,238,255,.9)'; ctx.fillText('STAGE ' + (ST.stageNo + 1), lx, -42);
  ctx.globalAlpha = fade * tb; ctx.font = '700 ' + fs + 'px MothDisplay, serif'; ctx.shadowColor = glowC; ctx.shadowBlur = 24; ctx.fillStyle = '#FFFFFF'; ctx.fillText(S.name, 0, (1 - tb) * 12); ctx.shadowBlur = 0;
  ctx.fillStyle = glowC; const lw = Math.min(ST.W - 80, nw * fs / 38) * .5 * tb; ctx.fillRect(-lw / 2, 14, lw, 2);
  ctx.restore();
  ctx.restore();
  ctx.fillStyle = glowC; ctx.globalAlpha = fade * .9; ctx.fillRect(0, y0 - 1, ST.W, 1.5); ctx.fillRect(0, y0 + hh - .5, ST.W, 1.5); ctx.globalAlpha = fade;
  const tc = kEio(kSm(.55, 1.0, p));
  ctx.font = '500 16px MothText, sans-serif';
  const lines = []; { let line = ''; for (const wd of S.tip.split(' ')) { const tst = line ? line + ' ' + wd : wd; if (ctx.measureText(tst).width > ST.W - 70 && line) { lines.push(line); line = wd; } else line = tst; } lines.push(line); }
  const sy = y0 + hh + 12, sg = ctx.createLinearGradient(0, sy, 0, sy + lines.length * 22 + 26); sg.addColorStop(0, 'rgba(10,8,30,.55)'); sg.addColorStop(1, 'rgba(10,8,30,0)');
  ctx.globalAlpha = fade * tc * k * k; ctx.fillStyle = sg; ctx.fillRect(0, sy, ST.W, lines.length * 22 + 26);   // the rule text rides the lower edge of the box as it closes
  ctx.fillStyle = 'rgba(240,238,255,.92)'; lines.forEach((ln, i) => ctx.fillText(ln, ST.W / 2, sy + 22 + i * 22));
  ctx.restore();
}
