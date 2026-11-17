// Draws the launcher icons (the game's own classic moth over a warm glow) and writes them into the Android res folders.
//   node tools/make-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { findChrome } from '../tests/lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const res = path.join(root, 'android/app/src/main/res');

// wing, hind wing, body and antennae use the same numbers as drawMoth() in js/render/moth.js
const moth = `<g>
  ${[1, -1].map(s => `<g transform="scale(${s},1)"><ellipse cx="20" cy="-6" rx="26" ry="14" transform="rotate(-28.65 20 -6)" fill="#C9BFFF"/><ellipse cx="15" cy="10" rx="16" ry="9" transform="rotate(28.65 15 10)" fill="#9D8CFF"/></g>`).join('')}
  <ellipse cx="0" cy="2" rx="5" ry="14" fill="#F1ECFF"/>
  <path d="M-2 -11 Q-9 -24 -13 -22 M2 -11 Q9 -24 13 -22" stroke="#F1ECFF" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</g>`;
const defs = `<defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".95"/><stop offset=".45" stop-color="#9D8CFF" stop-opacity=".5"/><stop offset="1" stop-color="#9D8CFF" stop-opacity="0"/></radialGradient></defs>`;
// 108 x 108 adaptive layer; everything stays inside the central 66% that no launcher mask cuts
const layer = `${defs}<circle cx="54" cy="54" r="40" fill="url(#g)"/><g transform="translate(54 54) scale(.6)">${moth}</g>`;
const svg = (inner, size, bg, round) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 108 108">${bg ? (round ? '<circle cx="54" cy="54" r="54" fill="#14132B"/>' : '<rect width="108" height="108" fill="#14132B"/>') : ''}${inner}</svg>`;

const DENS = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] };
const browser = await chromium.launch({ executablePath: findChrome() });
const page = await browser.newPage();
const shot = async (markup, size) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent">${markup}</body>`);
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
};
for (const [d, [legacy, adaptive]] of Object.entries(DENS)) {
  const dir = path.join(res, 'mipmap-' + d);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), await shot(svg(layer, legacy, true, false), legacy));
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), await shot(svg(layer, legacy, true, true), legacy));
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), await shot(svg(layer, adaptive, false, false), adaptive));
}
fs.writeFileSync(path.join(res, 'values/ic_launcher_background.xml'), '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#14132B</color>\n</resources>\n');
// store icon / preview
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/icon-512.png'), await shot(svg(layer, 512, true, false), 512));
await browser.close();
console.log('icons written');
