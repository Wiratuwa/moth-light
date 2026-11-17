import { ST } from '../state.js';
import { HAZ, ctx, cur, reduceMotion } from '../config.js';
import { kSm, rgb } from '../core.js';
import { drawImpact } from './thunder.js';
import { drawEdgeBleed, drawStripDeco, ecApply, ecOn } from '../edge.js';
import { nmc } from '../spawn.js';
import { drawCurrent, drawIce } from '../hazards/signature.js';
import { drawGearTrail, drawMote, drawMoth, drawMothFx, drawMothShadow, drawMothTrail } from './moth.js';
import { drawBoss, drawBossCore, drawBossFx } from '../bosses/fx.js';
import { glow } from './glow.js';
import { drawBG, drawBufSpin, drawCRT, drawCdHud, drawCdLanes, drawDefrag, drawLandTrans, drawMatrix, drawY2K } from '../stages/neon.js';
import { drawItem } from './items.js';
import { drawPopText } from './popups.js';
import { drawHUD } from './hud.js';
import { drawStageCard } from './stageart.js';
import { ttlFrame } from '../title.js';
import { cineAmt, cineZoom, drawCine, drawDyingBoss } from '../cine.js';
import { drawPVOverlay, pvFocal } from '../trailer.js';
import { Sound } from '../audio.js';


export function draw(t) {
  ST.glowFrame++;
  const pulse = reduceMotion ? 0 : Sound.pulse();
  ctx.save();
  const amp = reduceMotion ? 0 : ST.shake * 20 + ST.rumble * 8 + (ST.dispD > .85 ? (ST.dispD - .85) * 10 : 0);
  if (amp > 0) ctx.translate((Math.random() - .5) * amp, (Math.random() - .5) * amp);
  if (ST.PVX && ST.PVX.cam && !ST.PVX.epi) { const c = ST.PVX.cam; ctx.translate(ST.W / 2, ST.H / 2); ctx.rotate(c.roll); ctx.scale(c.z, c.z); ctx.translate(-(ST.W / 2 + c.sx), -(ST.H / 2 + c.sy)); }
  if (ST.CINE) { const z = cineZoom(); if (z !== 1) { ctx.translate(ST.CINE.b.x, ST.CINE.b.y); ctx.scale(z, z); ctx.translate(-ST.CINE.b.x, -ST.CINE.b.y); } }
  if (ST.PVX && ST.PVX.cam && !ST.PVX.epi) { ctx.save(); ctx.translate(ST.PVX.cam.sx * .5, ST.PVX.cam.sy * .5); drawBG(t, pulse, false); ctx.restore(); }   // the far background drifts less than the foreground: parallax
  else drawBG(t, pulse, ecOn());   // the sky is one big map: it slides and banks with the world
  if (ST.trans && ST.trans.land) drawLandTrans(t);

  if (ST.moth) {
    const ecl = ecOn(); ctx.save(); if (ecl) { ecApply(1); drawStripDeco(t); }
    if (ST.boss) {
      const sp = ST.boss.spin ? Math.cos(ST.boss.spin) : 1, sx = Math.abs(sp) < .12 ? .12 * (sp < 0 ? -1 : 1) : sp;
      if (ST.boss.spin) { ctx.save(); ctx.translate(ST.boss.x, ST.boss.y); ctx.scale(sx, 1); ctx.translate(-ST.boss.x, -ST.boss.y); }
      drawBoss(t, pulse); drawBossCore(t);
      if (ST.boss.spin) ctx.restore();
    }
    else if (ST.CINE && ST.CINE.k === 'out' && !ST.CINE.boomed) drawDyingBoss(t, pulse);
    drawBossFx(t);
    if (ST.flow) drawCurrent(t);
    if (ST.ice) drawIce(t);
    if (ST.ctd) drawCdLanes(t);
    for (const it of ST.items) {
      drawItem(it, t);
      if (ST.pw.freezeT > 0 && HAZ[it.type]) glow(it.x, it.y, 34, 'rgba(160,230,255,1)', .55);   // icy halo on frozen hazards
      if (ST.dialBufNow && (HAZ[it.type] || it.type === 'gate')) drawBufSpin(it.type === 'gate' ? it.gx : it.x, it.y, t);   // Dial-up: hazards show a buffering ring
    }
    if (ST.defrag) drawDefrag(t);
    ctx.globalCompositeOperation = 'lighter';
    for (const bl of ST.bolts) drawMote(bl);
    for (const p of ST.parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.fill();
    }
    for (const r of ST.rings) {
      ctx.globalAlpha = Math.max(0, r.life / r.max); ctx.strokeStyle = r.color; ctx.lineWidth = r.w;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.font = '700 18px MothText, sans-serif';
    for (const f of ST.floats) { ctx.globalAlpha = Math.max(0, f.life); ctx.fillStyle = nmc(f.color); ctx.fillText(f.text, f.x - 14, f.y); }
    ctx.globalAlpha = 1;
    if (ST.state === 'menu' || (ST.state === 'pv' && ST.PVX && ST.PVX.epi)) {
      if (ST.state === 'pv') { ctx.fillStyle = 'rgba(10,8,30,' + (.5 * kSm(24.2, 25.4, ST.PVX.t)) + ')'; ctx.fillRect(0, 0, ST.W, ST.H); }
      ttlFrame(t, pulse);
    } else { drawMothShadow(t); drawGearTrail(t); drawMothTrail(t, pulse); drawMoth(t, pulse); drawMothFx(t); }
    ctx.restore(); drawEdgeBleed(t);
    if (ST.state === 'play' && ST.hudA > .02) { ctx.save(); ctx.globalAlpha = ST.hudA * (1 - cineAmt()); drawHUD(pulse); if (ST.ctd) drawCdHud(t); ctx.restore(); }
    if (ST.banner) {
      const k = 1.3 - ST.banner.life, sc = k < .25 ? 1.35 - 1.4 * k : 1, a = ST.banner.life < .4 ? ST.banner.life / .4 : 1;
      ctx.save(); ctx.translate(ST.W / 2, ST.pop.b); ctx.scale(sc, sc); ctx.globalAlpha = a;
      drawPopText(ST.banner.text, 0, 0, ST.banner.color, 40, 'banner', t);
      ctx.restore(); ctx.textAlign = 'left';
    }
    if (ST.nar && ST.hudA > .02) {                // narrator caption, typed out while the voice line plays
      const k = 2.6 - ST.nar.life, n = Math.min(ST.nar.text.length, Math.floor(k / .028)), txt = ST.nar.text.toUpperCase().slice(0, n);
      ctx.save(); ctx.globalAlpha = Math.min(1, ST.nar.life * 2.2); ctx.textAlign = 'center'; ctx.font = '400 23px MothPixel, monospace'; if ('letterSpacing' in ctx) ctx.letterSpacing = '1.6px';
      ctx.fillStyle = '#BFF8FF'; ctx.shadowColor = '#7DF9FF'; ctx.shadowBlur = 10; ctx.fillText(txt, ST.W / 2 + .8, ST.pop.b + 34); ctx.restore();
    }
  }
  ctx.restore();

  // vignette that throbs with the beat
  if (ST.dispD > .1 && !ST.lowFx) {
    const a = ST.dispD * .3 * (.6 + .4 * pulse);
    const vg = ctx.createRadialGradient(ST.W / 2, ST.H / 2, Math.min(ST.W, ST.H) * .35, ST.W / 2, ST.H / 2, Math.max(ST.W, ST.H) * .75);
    vg.addColorStop(0, rgb(cur.glow, 0)); vg.addColorStop(1, rgb(cur.glow, a));
    ctx.fillStyle = vg; ctx.fillRect(0, 0, ST.W, ST.H);
  }
  if (ST.pw && ST.pw.freezeT > 0) { ctx.fillStyle = 'rgba(150,225,255,' + Math.min(.08, ST.pw.freezeT * .06) + ')'; ctx.fillRect(0, 0, ST.W, ST.H); }
  if (ST.pw && ST.pw.dialT > 0) { ctx.fillStyle = 'rgba(255,251,150,' + (ST.dialBufNow ? .06 : .03) + ')'; ctx.fillRect(0, 0, ST.W, ST.H); }
  if (ST.undoFx > 0) {                         // Ctrl+Z: cyan rewind flash
    const a = ST.undoFx / .6; ctx.fillStyle = 'rgba(156,246,255,' + (.2 * a) + ')'; ctx.fillRect(0, 0, ST.W, ST.H);
    ctx.fillStyle = 'rgba(255,255,255,' + (.3 * a) + ')'; for (let i = 0; i < 7; i++) ctx.fillRect(0, Math.random() * ST.H, ST.W, 2);
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = '700 34px MothDisplay, serif'; ctx.fillStyle = '#9CF6FF'; ctx.shadowColor = '#9CF6FF'; ctx.shadowBlur = 16; ctx.fillText('Ctrl+Z', ST.W / 2, ST.H * .45); ctx.restore();
  }
  if (ST.pw && ST.pw.calmT > 0) { ctx.fillStyle = 'rgba(168,230,207,' + Math.min(.07, ST.pw.calmT * .05) + ')'; ctx.fillRect(0, 0, ST.W, ST.H); }
  if (ST.pw && ST.pw.slowT > 0) { ctx.fillStyle = 'rgba(110,170,255,' + Math.min(.12, ST.pw.slowT * .1) + ')'; ctx.fillRect(0, 0, ST.W, ST.H); }
  if (ST.rumble > 0 && !reduceMotion) { ctx.fillStyle = 'rgba(0,0,8,' + (ST.rumble * .22) + ')'; ctx.fillRect(0, 0, ST.W, ST.H); }
  if (ST.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (ST.flash * (reduceMotion ? .25 : .6)) + ')'; ctx.fillRect(0, 0, ST.W, ST.H);
    ctx.fillStyle = 'rgba(255,40,80,' + (ST.flash * .3) + ')'; ctx.fillRect(0, 0, ST.W, ST.H);
  }
  drawImpact();
  if (ST.trans && ST.trans.neon) drawMatrix(t);
  drawY2K();
  if (ST.PVX && ST.state === 'pv' && !ST.PVX.epi) pvFocal();
  if (ST.card) drawStageCard();
  if (ST.state === 'pv') drawPVOverlay(t);
  if (ST.CINE) drawCine(t);
  drawCRT(t, pulse);
}
