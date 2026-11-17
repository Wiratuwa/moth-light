import { ST } from '../state.js';
import { ctx, reduceMotion } from '../config.js';
import { glow } from './glow.js';
import { Sound } from '../audio.js';

// ---------- background thunder: every universe has its own colours, rhythm and mix of styles
export const TH = [
  { rate: .15, amp: 44, brP: .2,  flash: '170,195,255', cols: [{ core: '240,248,255', glow: '150,185,255' }],                                                   w: { fork: .32, sheet: .4,  crawl: .1,  chain: .13, big: .05 } },
  { rate: .17, amp: 90, brP: .34, flash: '255,130,225', cols: [{ core: '255,236,252', glow: '255,80,215' }, { core: '240,225,255', glow: '160,110,255' }],      w: { fork: .28, sheet: .14, crawl: .28, chain: .24, big: .06 } },
  { rate: .17, amp: 56, brP: .26, flash: '110,255,210', cols: [{ core: '232,255,246', glow: '60,255,200' }, { core: '235,255,225', glow: '150,255,120' }],       w: { fork: .22, sheet: .22, crawl: .34, chain: .16, big: .06 } },
  { rate: .6,  amp: 70, brP: .3,  flash: '255,200,210', cols: [{ core: '255,236,244', glow: '255,70,80' }, { core: '255,240,220', glow: '255,150,60' }],        w: { fork: .44, sheet: .14, crawl: .1,  chain: .24, big: .08 } },
  { rate: .1, cd: [4, 7], amp: 60, brP: .3,  flash: '255,170,235', cols: [{ core: '255,240,255', glow: '255,113,206' }, { core: '230,255,255', glow: '5,217,232' }, { core: '255,252,214', glow: '185,103,255' }], w: { fork: .3, sheet: .24, crawl: .22, chain: .18, big: 1.6 } }
];
function thJag(x, y, endY, amp, step0, stepV) {
  const pts = [[x, y]];
  while (y < endY) { x += (Math.random() - .5) * amp; y += step0 + Math.random() * stepV; pts.push([x, y]); }
  return pts;
}
function thBranches(pts, p, maxSeg, down) {
  const out = [];
  for (let i = 2; i < pts.length - 1; i++) {
    if (Math.random() >= p) continue;
    const dir = Math.random() < .5 ? -1 : 1, seg = 3 + ((Math.random() * maxSeg) | 0);
    let bx = pts[i][0], by = pts[i][1]; const path = [[bx, by]];
    for (let j = 0; j < seg; j++) { bx += dir * (8 + Math.random() * 22); by += (down ? 8 : -4) + Math.random() * 16; path.push([bx, by]); }
    out.push(path);
  }
  return out;
}
function makeThunder(type, st, delay, xBase) {
  const cfg = TH[st], c = cfg.cols[(Math.random() * cfg.cols.length) | 0];
  const T = { type, st, col: c, flash: cfg.flash, life: .3, max: .3, delay: delay || 0, pts: [], br: [], big: false, snd: false, seed: Math.random() * 6.28 };
  if (type === 'sheet') {
    T.cx = ST.W * (.1 + Math.random() * .8); T.cy = ST.H * (.06 + Math.random() * .3); T.r = ST.W * (.55 + Math.random() * .5); T.life = T.max = .5;
  } else if (type === 'crawl') {                                            // horizontal bolt crawling across the sky
    const fromL = Math.random() < .5, sg = fromL ? 1 : -1; let x = fromL ? -10 : ST.W + 10, y = ST.H * (.1 + Math.random() * .32);
    const tx = x + sg * (ST.W + 20); T.pts.push([x, y]);               // W is the whole world width while the sky is updated
    while (fromL ? x < tx : x > tx) { x += sg * (16 + Math.random() * 22); y += (Math.random() - .5) * cfg.amp * .55; T.pts.push([x, y]); }
    T.br = thBranches(T.pts, cfg.brP * .8, 3, true); T.life = T.max = .5;
  } else {
    const big = type === 'big', x0 = xBase !== undefined ? xBase : ST.W * (.1 + Math.random() * .8);
    T.pts = thJag(x0, 0, big ? ST.H * .8 : ST.H * (.38 + Math.random() * .22), cfg.amp * (big ? 1.1 : 1), big ? 22 : 25, big ? 28 : 35);
    T.br = thBranches(T.pts, big ? .5 : cfg.brP, big ? 5 : 3, true);
    if (big) { T.big = true; T.life = T.max = .55; }
  }
  return T;
}
export function activateThunder(T) {
  if (T.snd) Sound.thunder(T.big ? 0 : .15 + Math.random() * .5, T.big);
  if (!T.big) return;
  ST.shake = Math.max(ST.shake, .45); ST.rumble = Math.max(ST.rumble, .8);
  if (ST.state === 'play' && !ST.trans) {                                         // impact frame: a hard negative flash with the bolt as a silhouette
    ST.impact = { t: 0, dur: .2, T, flash: T.flash, seed: Math.random() * 6.28, soft: reduceMotion };
    if (!reduceMotion) ST.hitStop = .06;
  }
}
export function spawnThunder(st) {
  const cfg = TH[st], keys = Object.keys(cfg.w).filter(k => k !== 'big' || ST.bigCD <= 0);
  let sum = 0; for (const k of keys) sum += cfg.w[k];
  let r = Math.random() * sum, type = keys[0];
  for (const k of keys) { r -= cfg.w[k]; if (r <= 0) { type = k; break; } }
  const list = [];
  if (type === 'chain') {
    const n = 2 + ((Math.random() * 3) | 0), xb = ST.W * (.15 + Math.random() * .7); let d = 0;
    for (let i = 0; i < n; i++) { list.push(makeThunder('fork', st, d, Math.max(10, Math.min(ST.W - 10, xb + (Math.random() - .5) * 140)))); d += .08 + Math.random() * .1; }
  } else list.push(makeThunder(type, st, 0));
  if (type === 'big') ST.bigCD = cfg.cd ? cfg.cd[0] + Math.random() * (cfg.cd[1] - cfg.cd[0]) : 14 + Math.random() * 12;
  list[0].snd = type !== 'sheet' || Math.random() < .5;
  for (const T of list) { ST.thunders.push(T); if (T.delay <= 0) activateThunder(T); }
}
function strokePts(pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); }
export function drawThunders() {
  if (!ST.thunders.length) return;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const T of ST.thunders) {
    if (T.delay > 0) continue;
    const wgt = ST.uw[T.st]; if (wgt < .02) continue;
    const a = T.life / T.max, k = a * (.62 + .38 * Math.abs(Math.sin(a * 15 + T.seed))) * wgt, c = T.col, bg = T.big ? 1.9 : 1;
    if (T.type === 'sheet') {                                                // sheet lightning: the clouds light up from inside
      glow(T.cx, T.cy, T.r, 'rgba(' + c.glow + ',1)', Math.min(.9, .77 * k));
      glow(T.cx, T.cy, T.r * .45, 'rgba(' + c.core + ',1)', .4 * k);
      continue;
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(' + T.flash + ',' + (k * (T.big ? .2 : .09)) + ')'; ctx.fillRect(-ST.W, -ST.H * .35, ST.W * 3, ST.H * 1.7);   // the whole sky flickers, over the whole map
    for (const [lw, al, col] of [[14 * bg, .22, c.glow], [6 * bg, .55, c.glow], [2.6 * bg, 1, c.core]]) {
      ctx.strokeStyle = 'rgba(' + col + ',' + Math.min(1, k * al) + ')'; ctx.lineWidth = lw; ctx.beginPath(); strokePts(T.pts); ctx.stroke();
      ctx.lineWidth = lw * .5; ctx.strokeStyle = 'rgba(' + col + ',' + Math.min(1, k * al * .8) + ')'; ctx.beginPath(); for (const b of T.br) strokePts(b); ctx.stroke();
    }
    const e = T.pts[T.pts.length - 1];
    if (T.type !== 'crawl') glow(e[0], e[1], 60 * bg, 'rgba(' + c.glow + ',1)', .5 * k);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}
export function drawImpact() {
  const im = ST.impact; if (!im) return;
  const p = im.t / im.dur, TAU = 6.283;
  ctx.save(); ctx.globalCompositeOperation = 'source-over';
  if (im.soft) { ctx.fillStyle = 'rgba(' + im.flash + ',' + (.25 * (1 - p)) + ')'; ctx.fillRect(0, 0, ST.W, ST.H); ctx.restore(); return; }
  const neg = p < .3, out = p > .62 ? 1 - (p - .62) / .38 : 1, T = im.T, e = T.pts[T.pts.length - 1];
  ctx.globalAlpha = out;
  ctx.fillStyle = neg ? '#FFFFFF' : '#07040F'; ctx.fillRect(0, 0, ST.W, ST.H);
  ctx.fillStyle = neg ? 'rgba(0,0,0,.85)' : 'rgba(255,255,255,.9)';                       // manga-style speed wedges radiating from the strike point
  const R1 = Math.hypot(ST.W, ST.H);
  for (let k = 0; k < 44; k++) {
    const an = k / 44 * TAU + im.seed, r0 = 50 + 140 * ((k * .37) % 1), hw = .008 + .012 * ((k * .61) % 1);
    ctx.beginPath(); ctx.moveTo(e[0] + Math.cos(an) * r0, e[1] + Math.sin(an) * r0);
    ctx.lineTo(e[0] + Math.cos(an - hw) * R1, e[1] + Math.sin(an - hw) * R1); ctx.lineTo(e[0] + Math.cos(an + hw) * R1, e[1] + Math.sin(an + hw) * R1); ctx.closePath(); ctx.fill();
  }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = neg ? '#05030C' : '#FFFFFF'; ctx.lineWidth = 20; ctx.beginPath(); strokePts(T.pts); ctx.stroke();
  ctx.lineWidth = 10; ctx.beginPath(); for (const b of T.br) strokePts(b); ctx.stroke();
  ctx.strokeStyle = neg ? '#FFFFFF' : 'rgb(' + T.col.glow + ')'; ctx.lineWidth = 5; ctx.beginPath(); strokePts(T.pts); ctx.stroke();    // bright core
  if (!neg) { glow(e[0], e[1], 300, 'rgba(' + T.flash + ',1)', .85); glow(e[0], e[1], 120, 'rgba(255,255,255,1)', .9); }
  ctx.restore();
}
