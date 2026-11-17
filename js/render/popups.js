import { ST } from '../state.js';
import { ctx, reduceMotion } from '../config.js';
import { nmc } from '../spawn.js';
import { OV_COL } from '../stages/overflow.js';
import { SIDES } from '../core.js';


// ---------- stage-flavoured text popups (event notices and banners) ----------
// v44 rules: ALL CAPS, upright type only, no icons / pictures / emoticons, no dark text outlines.
// Every stage gets its own typeface, tracking (in em) and light treatment; legibility comes from glow, a feathered scrim or a plate, never an outline.
const POPF = [
  { f: '700 %spx MothDisplay, serif', k: .96, ls: .13 },        // Moonlit Garden: inscriptional capitals (Cinzel), moon-silver, slow sheen
  { f: '700 %spx MothReef, sans-serif', k: .9, ls: .09 },       // Nebula Reef: rounded geometric caps (Comfortaa), drifting cyan to pink gradient
  { f: '600 %spx MothIce, sans-serif', k: .94, ls: .16 },       // Aurora Sea: wide-tracked geometric caps (Josefin Sans), shimmer sweep, frost hairlines
  { f: '400 %spx MothStorm, sans-serif', k: 1.34, ls: .06 },    // Crimson Storm: tall condensed impact caps (Bebas Neue) on a warning plate
  { f: '400 %spx MothPixel, monospace', k: 1.4, ls: .08 },      // Neon Mirage: terminal caps (VT323), RGB split and glitch
  { f: '400 %spx MothOverflow, sans-serif', k: .78, ls: .07 }   // Overflow Reach: wide extended caps (Michroma), strata bands and a smear that grows with heat
];
const popStage = () => { let b = 0; for (let i = 1; i < ST.uw.length; i++) if (ST.uw[i] > ST.uw[b]) b = i; return b; };
export function popSpark(x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * .22, y - s * .22); ctx.lineTo(x + s, y); ctx.lineTo(x + s * .22, y + s * .22); ctx.lineTo(x, y + s); ctx.lineTo(x - s * .22, y + s * .22); ctx.lineTo(x - s, y); ctx.lineTo(x - s * .22, y - s * .22); ctx.closePath(); ctx.fill();
}
function popScrim(w, h, cy, a, rgb) {                         // soft elliptical shade behind the letters: no edge, so it never reads as an outline
  ctx.save(); ctx.translate(0, cy); ctx.scale(1, h / w);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
  g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(.55, 'rgba(' + rgb + ',' + (a * .7) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, 6.283); ctx.fill(); ctx.restore();
}
function popPlate(pw, py0, ph, rgba, topC, botC) {              // translucent band whose ends fade out, with a thin line on top and bottom: reads as a banner, never as a box outline
  const g = ctx.createLinearGradient(-pw / 2, 0, pw / 2, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.1, rgba); g.addColorStop(.9, rgba); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(-pw / 2, py0, pw, ph);
  ctx.save(); ctx.globalAlpha *= .95;
  for (const [c, yy] of [[topC, py0], [botC, py0 + ph - 1.5]]) { const lg = ctx.createLinearGradient(-pw / 2, 0, pw / 2, 0); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(.1, c); lg.addColorStop(.9, c); lg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = lg; ctx.fillRect(-pw / 2, yy, pw, 1.5); }
  ctx.restore();
}
const popMeas = new Map();
export function drawPopText(text, x, y, color, size, kind, t) {
  const st = popStage(), P = POPF[st], big = kind === 'banner', col = nmc(color) || color, txt = String(text).toUpperCase();
  const lsOn = 'letterSpacing' in ctx, avail = ST.W - 24, padE = [.8, .8, 1.5, 1.9, 1.6, 1.5][st];
  let fs = size * P.k, ls = P.ls;
  ctx.save(); ctx.translate(x, y); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const setF = (f, l) => { ctx.font = P.f.replace('%s', f.toFixed(1)); if (lsOn) ctx.letterSpacing = (l * f).toFixed(2) + 'px'; };
  const mk = st + '|' + size + '|' + avail + '|' + txt, mc = popMeas.get(mk);
  let wd;
  if (mc) { fs = mc.fs; ls = mc.ls; wd = mc.wd; setF(fs, ls); }
  else {
    setF(fs, ls);
    wd = ctx.measureText(txt).width;
    if (wd + padE * fs > avail) { ls = P.ls * .3; setF(fs, ls); wd = ctx.measureText(txt).width; }                                        // long line: tighten the tracking first
    if (wd + padE * fs > avail) { fs *= avail / (wd + padE * fs); setF(fs, ls); wd = ctx.measureText(txt).width; }                       // then scale it down
    if (!document.fonts || document.fonts.status === 'loaded') { if (popMeas.size > 80) popMeas.clear(); popMeas.set(mk, { fs, ls, wd }); }   // never cache a width measured with a fallback font
  }
  const lsPx = lsOn ? ls * fs : 0, wv = wd - lsPx;                                                                                    // wv = visible width (canvas adds spacing after the last letter too)
  ctx.translate(lsPx / 2, 0);
  const mid = -fs * .34, shake = !reduceMotion && big, c01 = v => Math.max(0, Math.min(1, v));
  if (st === 0) {                                                           // Moonlit Garden
    popScrim(wv + fs * 2.6, fs * 2.1, mid, .4, '10,8,36');
    const ln = ctx.createLinearGradient(-wv / 2 - fs, 0, wv / 2 + fs, 0); ln.addColorStop(0, 'rgba(225,232,255,0)'); ln.addColorStop(.5, 'rgba(225,232,255,.6)'); ln.addColorStop(1, 'rgba(225,232,255,0)');
    ctx.fillStyle = ln; ctx.fillRect(-wv / 2 - fs, fs * .3, wv + fs * 2, 1);
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = big ? 22 : 12; ctx.fillText(txt, 0, 0);
    ctx.shadowBlur = 0; const mg = ctx.createLinearGradient(0, -fs * .78, 0, 0); mg.addColorStop(0, 'rgba(255,255,255,.85)'); mg.addColorStop(1, 'rgba(255,255,255,.12)');
    ctx.fillStyle = mg; ctx.fillText(txt, 0, 0);
    if (!reduceMotion) {
      const o = (t * .32) % 1.7 - .35, sg = ctx.createLinearGradient(-wv / 2, 0, wv / 2, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(c01(o - .14), 'rgba(255,255,255,0)'); sg.addColorStop(c01(o), 'rgba(255,255,255,.7)'); sg.addColorStop(c01(o + .14), 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg; ctx.fillText(txt, 0, 0);
    }
  } else if (st === 1) {                                                    // Nebula Reef
    popScrim(wv + fs * 2.6, fs * 2.1, mid, .46, '8,10,44');
    const dm = .5 + (reduceMotion ? 0 : .22 * Math.sin(t * .9)), g = ctx.createLinearGradient(-wv / 2, 0, wv / 2, 0);
    g.addColorStop(0, '#9FF2FF'); g.addColorStop(dm, col); g.addColorStop(1, '#FFA8E6');
    ctx.shadowColor = col; ctx.shadowBlur = big ? 26 : 14; ctx.fillStyle = g; ctx.fillText(txt, 0, 0);
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.26)'; ctx.fillText(txt, 0, -.8);
  } else if (st === 2) {                                                    // Aurora Sea
    popScrim(wv + fs * 2.6, fs * 2.1, mid, .4, '4,18,36');
    const o = (t * .45) % 1.5 - .25, g = ctx.createLinearGradient(-wv / 2, 0, wv / 2, 0);
    g.addColorStop(0, col); g.addColorStop(c01(o - .2), col); g.addColorStop(c01(o), '#FFFFFF'); g.addColorStop(c01(o + .2), col); g.addColorStop(1, col);
    const gap = fs * .55, len = Math.max(0, Math.min(34, (avail - wv) / 2 - gap - 2));
    if (len > 6) for (const sd of SIDES) {                                 // frost hairlines, fading outwards
      const x0 = sd * (wv / 2 + gap), lg = ctx.createLinearGradient(x0, 0, x0 + sd * len, 0); lg.addColorStop(0, 'rgba(190,240,255,.8)'); lg.addColorStop(1, 'rgba(190,240,255,0)');
      ctx.fillStyle = lg; ctx.fillRect(Math.min(x0, x0 + sd * len), mid, len, 1);
    }
    ctx.shadowColor = 'rgba(160,240,255,.85)'; ctx.shadowBlur = big ? 20 : 11; ctx.fillStyle = g; ctx.fillText(txt, 0, 0);
    ctx.shadowBlur = 0; const ig = ctx.createLinearGradient(0, -fs * .78, 0, 0); ig.addColorStop(0, 'rgba(255,255,255,.4)'); ig.addColorStop(.6, 'rgba(255,255,255,0)');
    ctx.fillStyle = ig; ctx.fillText(txt, 0, 0);
  } else if (st === 3) {                                                    // Crimson Storm
    const pw = wv + fs * 1.9, ph = fs * .98, py0 = -fs * .84 + (shake ? (Math.random() - .5) * 1.5 : 0);
    popPlate(pw + fs * .6, py0, ph, 'rgba(30,2,8,.62)', col, col);
    const g = ctx.createLinearGradient(0, -fs * .8, 0, fs * .1); g.addColorStop(0, '#FFF1B0'); g.addColorStop(.5, col); g.addColorStop(1, '#FF4A2E');
    const tx = shake ? (Math.random() - .5) * 1.5 : 0;
    ctx.shadowColor = col; ctx.shadowBlur = big ? 20 : 10; ctx.fillStyle = g; ctx.fillText(txt, tx, 0);
    if (!reduceMotion && Math.sin(t * 9.1) + Math.sin(t * 3.7) > 1.8) { ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText(txt, tx, 0); }   // rare lightning flash through the letters
  } else if (st === 4) {                                                    // Neon Mirage
    const gl = !reduceMotion && Math.sin(t * 17) > .93 ? (Math.random() - .5) * 5 : 0, pw = wv + fs * 1.6, ph = fs * .95, py0 = -fs * .76;
    popPlate(pw + fs * .6, py0, ph, 'rgba(30,0,50,.42)', '#05D9E8', '#FF2A6D');
    ctx.fillStyle = 'rgba(125,249,255,.06)'; for (let yy = py0 + 2; yy < py0 + ph - 2; yy += 3) ctx.fillRect(-pw / 2 + pw * .1, yy, pw * .8, 1);   // faint scanlines on the plate
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(5,217,232,.7)'; ctx.fillText(txt, -1.2 + gl, 0); ctx.fillStyle = 'rgba(255,60,200,.7)'; ctx.fillText(txt, 1.2 - gl, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = col; ctx.fillText(txt, 0, 0);
  } else {                                                                  // Overflow Reach: the letters smear sideways with heat, strata bands run through them, a stripe of the stage palette underneath
    popScrim(wv + fs * 2.6, fs * 2.1, mid, .44, '4,16,12');
    const sm = fs * (.1 + (reduceMotion ? 0 : ST.dispD) * .45);
    ctx.save(); ctx.fillStyle = col; const a0 = ctx.globalAlpha; for (let k = 3; k >= 1; k--) { ctx.globalAlpha = a0 * .2; ctx.fillText(txt, -sm * k / 3, 0); } ctx.restore();
    ctx.shadowColor = col; ctx.shadowBlur = big ? 18 : 9; ctx.fillStyle = col; ctx.fillText(txt, 0, 0);
    ctx.shadowBlur = 0; const sg = ctx.createLinearGradient(0, -fs * .8, 0, 0);
    sg.addColorStop(0, 'rgba(255,255,255,.4)'); sg.addColorStop(.25, 'rgba(255,255,255,.4)'); sg.addColorStop(.25, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,0)');
    sg.addColorStop(.5, 'rgba(255,255,255,.18)'); sg.addColorStop(.75, 'rgba(255,255,255,.18)'); sg.addColorStop(.75, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillText(txt, 0, 0);
    for (let k = 0; k < 5; k++) { ctx.fillStyle = OV_COL[k]; ctx.fillRect(-wv / 2 + wv * k / 5, fs * .3, wv / 5 + .5, 2); }
  }
  ctx.restore();
}
