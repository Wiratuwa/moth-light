import { ST } from '../state.js';
import { ctx } from '../config.js';


// ---------- drawing
// v51: glow sprites. A colour+size that shows up on two different frames gets one cached radial sprite (16-256 px, never scaled UP, so the
// gradient keeps its exact look) that is then drawn at the right size; glows too big for a sprite, and colours that change every frame
// (crossfades), keep the live gradient. Same pixels, far fewer gradient objects per frame.
const glowSpr = new Map(), glowSeen = new Map();
function glowSprite(color, r) {
  const dev = 2 * r * ST.DPR, n = dev <= 16 ? 16 : dev <= 32 ? 32 : dev <= 64 ? 64 : dev <= 128 ? 128 : dev <= 256 ? 256 : 0;
  if (!n) return null;
  const key = n + color;
  let c = glowSpr.get(key);
  if (c) return c;
  const seen = glowSeen.get(key);
  if (seen === undefined || seen === ST.glowFrame) {                      // first sighting, or still the same frame: not worth a sprite yet
    if (seen === undefined) { if (glowSeen.size > 600) glowSeen.clear(); glowSeen.set(key, ST.glowFrame); }
    return null;
  }
  if (glowSpr.size >= 120) glowSpr.clear();
  c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), h = n / 2, gr = g.createRadialGradient(h, h, 0, h, h, h);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  glowSpr.set(key, c);
  return c;
}
export function glow(x, y, r, color, a) {
  const pa = ctx.globalAlpha, ea = a * pa;
  if (ea >= 0 && ea < .004) return;                                    // under 1/255 of a colour step: not visible
  const spr = r > 0 ? glowSprite(color, r) : null;
  ctx.globalCompositeOperation = 'lighter';
  if (spr) {
    ctx.globalAlpha = ea; ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
  } else {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = ea; ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = pa; ctx.globalCompositeOperation = 'source-over';
}
