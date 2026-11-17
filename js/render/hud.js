import { ST } from '../state.js';
import { POWER_COL, ctx, reduceMotion } from '../config.js';
import { heat } from '../core.js';
import { fmtNum, heatName, nmc, scoreMult, stage } from '../spawn.js';
import { drawBossBar } from '../bosses/fx.js';
import { glow } from './glow.js';
import { drawGlyph } from './items.js';
import { drawPopText } from './popups.js';
import { nmRR } from '../stages/neon.js';


export function drawHUD(pulse) {
  const s = 1 + ST.scorePop * .35;
  ctx.save(); ctx.translate(20, 52); ctx.scale(s, s);
  ctx.font = '700 40px MothDisplay, serif';
  ctx.fillStyle = '#E9E6FF'; ctx.shadowColor = '#5EEAD4'; ctx.shadowBlur = 14 * ST.scorePop;
  const sw = ctx.measureText(String(ST.score)).width;
  ctx.fillText(String(ST.score), 0, 0); ctx.restore();
  const mm = scoreMult();
  if (mm > 1.001) {
    ctx.font = '700 17px MothText, sans-serif'; ctx.fillStyle = heat(Math.max(ST.dispD, .35));
    ctx.fillStyle = nmc(heat(Math.max(ST.dispD, .35))); ctx.fillText('x' + fmtNum(mm), 30 + sw * s, 50);
  }
  {                                         // health bar (top right)
    const bw = 120, bh = 12, bx = ST.W - 20 - bw, by = 34, col = ST.hp > 50 ? '#5EEAD4' : ST.hp > 25 ? '#FFD166' : '#FF4D6D';
    const low = ST.hp <= 25 && !reduceMotion ? .75 + .25 * Math.sin(performance.now() / 120) : 1;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.14)'; nmRR(bx, by, bw, bh, 6); ctx.fill();
    nmRR(bx, by, bw, bh, 6); ctx.clip();
    ctx.fillStyle = 'rgba(255,170,190,.55)'; ctx.fillRect(bx, by, bw * ST.hpTrail / 100, bh);          // the damage you just took drains away slowly
    ctx.globalAlpha *= low; ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.fillRect(bx, by, bw * ST.hp / 100, bh); ctx.shadowBlur = 0;
    if (ST.hpFlash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + ST.hpFlash * .8 + ')'; ctx.fillRect(bx, by, bw, bh); }
    ctx.restore();
    ctx.save(); ctx.fillStyle = '#FF4D6D'; ctx.translate(bx - 14, by + bh / 2 + 1);                  // little heart
    ctx.beginPath(); ctx.moveTo(0, 5); ctx.bezierCurveTo(-9, -1, -5, -8, 0, -3); ctx.bezierCurveTo(5, -8, 9, -1, 0, 5); ctx.fill(); ctx.restore();
    ctx.font = '700 11px MothText, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(Math.ceil(ST.hp) + '%', bx + bw, by + bh + 14); ctx.textAlign = 'left';
  }
  // heat meter
  const x = 20, y = 94, w = ST.W - 40, h = 9, wv = w * (ST.od > 0 ? ST.od / 9 : ST.dispD);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x, y, w, h);
  const gr = ctx.createLinearGradient(x, 0, x + w, 0);
  gr.addColorStop(0, heat(0)); gr.addColorStop(.5, heat(.5)); gr.addColorStop(1, heat(1));
  ctx.fillStyle = ST.od > 0 ? 'rgba(255,209,102,1)' : gr; ctx.fillRect(x, y, wv, h);
  if (ST.dispD > .02) glow(x + wv, y + h / 2, 26 + pulse * 14 + (ST.dispD > .95 ? 12 : 0), heat(ST.dispD), .7);
  ctx.fillStyle = 'rgba(20,19,43,.8)';
  for (const k of [.25, .5, .75]) ctx.fillRect(x + w * k - 1, y, 2, h);
  ctx.font = '700 14px MothText, sans-serif';
  const tier = ST.tierShown;
  ctx.fillStyle = heat(Math.max(ST.dispD, .05)); ctx.textAlign = 'left';
  ctx.fillStyle = nmc(heat(Math.max(ST.dispD, .05))); ctx.fillText((ST.stageNo + 1) + ' · ' + stage().name, x, y + 28);
  ctx.fillStyle = 'rgba(233,230,255,.6)'; ctx.textAlign = 'right';
  { const ht = ST.od > 0 ? 'Overdrive ' + Math.ceil(ST.od) + 's' : ST.surge ? 'Storm surge' : heatName(ST.tierShown); ctx.fillStyle = ST.uw[4] > .5 ? '#F3EEFF' : 'rgba(233,230,255,.6)'; ctx.fillText(ht, x + w, y + 28); } ctx.textAlign = 'left';

  // v56: boss health bar, a different design per boss (see drawBossBar)
  if (ST.boss) { drawBossBar(ST.boss, ST.W * .16, 152, ST.W * .68, ST.boss.t, false); ctx.textAlign = 'left'; }
  // active powerups
  const chips = [];
  if (ST.pw.shield) chips.push(['shield', 1]);
  if (ST.pw.magnet > 0) chips.push(['magnet', ST.pw.magnet / 8]);
  if (ST.pw.slowT > 0) chips.push(['slow', ST.pw.slowT / 6]);
  if (ST.pw.prismT > 0) chips.push(['prism', ST.pw.prismT / 6]);
  if (ST.pw.doubleT > 0) chips.push(['double', ST.pw.doubleT / 10]);
  if (ST.pw.freezeT > 0) chips.push(['freeze', ST.pw.freezeT / 4]);
  if (ST.pw.phaseT > 0) chips.push(['phase', ST.pw.phaseT / 4]);
  if (ST.pw.rodT > 0) chips.push(['rod', ST.pw.rodT / 8]);
  if (ST.pw.calmT > 0) chips.push(['eye', ST.pw.calmT / 6]);
  if (ST.pw.undo) chips.push(['ctrlz', 1]);
  if (ST.pw.dialT > 0) chips.push(['dialup', ST.pw.dialT / 6]);
  if (ST.pw.saveD > 0) chips.push(['save', 1]);
  if (ST.pw.seedT > 0) chips.push(['reseed', ST.pw.seedT / 5]);
  chips.forEach((c, i) => {
    const cx = 32 + i * 38, cy = 184, col = POWER_COL[c[0]];
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 15, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(cx, cy, 15, -Math.PI / 2, -Math.PI / 2 + 6.283 * c[1]); ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.scale(.75, .75); drawGlyph(c[0], col); ctx.restore();
  });
  // event notices: each sits in its own slot
  for (let i = ST.notices.length - 1; i >= 0; i--) {
    const n = ST.notices[i];
    ctx.save(); ctx.globalAlpha *= Math.min(1, n.life * 2);
    drawPopText(n.text, ST.W / 2, n.y, n.color, 20, 'notice', performance.now() / 1000);
    ctx.restore();
  }
}
