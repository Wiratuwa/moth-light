# Peta modul Moth Light (dari moth-light-56.html)

Hanya peta. Tidak ada kode yang diubah. Nomor baris = baris di `moth-light-56.html`.

## Bentuk file sekarang
- 7903 baris, 802 KB. Sekitar 192 KB di antaranya base64: 8 `@font-face` (153 KB, baris 11-18) dan 3 klip suara `VOICE` (`warn`, `welcome`, `survived`; baris 152, ±38 KB).
- Baris 10-93: CSS. Baris 95-137: markup (canvas, menu, closet, paused, over). Baris 139-7901: satu `<script>`.
- Script berisi **dua IIFE**: `Sound` (153-816) dan `GAME` (820-7899). `Sound` berdiri sendiri (state-nya milik sendiri, tidak membaca variabel game). Seluruh game ada di satu closure dengan 506 deklarasi top-level.

## Peta modul (usulan)

| File | Isi (baris v56) |
|---|---|
| `index.html` | meta + markup 95-137, `<script type=module src=js/main.js>` |
| `style.css` | CSS 11-92; font base64 dipindah ke `public/fonts/*.woff2` (8 file) |
| `js/voice.js` | `VOICE` (152) |
| `js/audio.js` | `Sound` (153-816). Leaf: hanya import `voice.js` |
| `js/config.js` | tabel data lintas-stage: `ORB_MAX HEAT_* SH_STYLE CM_STYLE OSTYLE STAGE_STEP HAZ EVT CLR STAGES PAL AUR WARP_COL POWER_COL PLANET_SETS BG_* ROGUE_PAL TH` (820-935, 992), `DMG` (3345), `EP` (2040), `POPF` (5811) |
| `js/state.js` | semua variabel mutable bersama (lihat bagian State) |
| `js/util.js` | `lerp heat rgb mixc rng32 hexA kSm nmRR wrapText` (944-1000 sebagian, 1556, 7008-7009) |
| `js/input.js` | `point`, listener pointer/touch, `buzz` (2241-2251) |
| `js/save.js` | `save`, `persist`, `SKINS`, `TRAILS`, `gearOk`, `unlockStage/Boss`, wardrobe dots/`unlockFx` (1996-2025, 7011-7023). Key `mothlight.gear` tetap |
| `js/edge.js` | kamera strip tepi + jackpot + `edgeDirector` (2026-2252), `drawEdgeBleed`, `drawStripDeco` |
| `js/spawn.js` | efek (`burst ring floatText`), `spawn`, power-up (`applyPower reseed nova bloom`) (2253-2417) |
| `js/events.js` | `runEvent`, `heavyOn` (2418-2485) |
| `js/hazards/signature.js` | owl, current, ice, awan badai: update + draw sekaligus (2486-2558: `spawnOwl startCurrent startIce spawnCloud drawOwl drawCurrent drawIce`) |
| `js/hazards/icespike.js` | 5536-5679 |
| `js/hazards/neon.js` | popup/marq/lbar/countdown/defrag/glitch (2583-2678) + draw (4562-4825 sebagian) |
| `js/hazards/heat.js` | overdrive, storm surge (2679-2703) |
| `js/stages/transition.js` | `testJump startTransition stageSwap` (2704-2745), `drawLandTrans`, Y2K (6912-7001) |
| `js/stages/neon.js` | latar Neon (5989-6303), CRT, matrix (4726-4826) |
| `js/stages/overflow.js` | Stage 6: `ov*`, `drawOverflow`, seam, shear, `art5` (6401-6703) |
| `js/bosses/boss.js` | `BOSS startBoss updateBoss damageBoss bossPhase bossDefeat bossLeave` (2745-2777, 2840-2937, 3308-3323) |
| `js/bosses/sentinel.js` | 2778-2819 + `drawSentinel` (4321-4361) |
| `js/bosses/colossus.js` | 2820-2839 + `drawColossus` (4362-4401) |
| `js/bosses/fx.js` | armor plate, health bar, `bfx` (2938-3322), `drawBoss*` (4402-4532) |
| `js/update.js` | `update` + `hitHazard rollDmg checkTier narrate` (3324-3850) |
| `js/render/glow.js` | `glowSprite glow` + cache (3855-3892) |
| `js/render/moth.js` | moth, trail, shadow, mote (3893-3964), `drawMothFx` (4533) |
| `js/render/items.js` | glyph/spore/strike/comet/gate/hole/pixel + `drawItem`, `drawOrb`, `drawWarnSign` (3965-4320, 5680-5807) |
| `js/render/sprites-a.js` | detail pass Moonlit/Nebula (4826-4982) |
| `js/render/sprites-b.js` | Aurora/Crimson (4983-5535), awan/langit badai |
| `js/render/popups.js` | `drawPopText`, `popMeas` cache (5808-5913) |
| `js/render/hud.js` | `drawHUD` (5914-5988) |
| `js/render/planets.js` | benda angkasa, planet sprite cache, thunder, impact (991-2010) |
| `js/render/background.js` | `drawBG`, `drawBackground`, ambience, `drawStageDetail` (6290-6400, 6666-6815) |
| `js/render/draw.js` | `draw` (6816-6911) |
| `js/render/stageart.js` | `art0-4`, `drawStageArt`, `drawStageCard` (7024-7297) |
| `js/title.js` | judul (7298-7372) |
| `js/cine.js` | cutscene boss (7373-7464) |
| `js/trailer.js` | trailer `PV*` (7465-7741) |
| `js/ui.js` | `startGame endGame closet setPause gfxUI` + panel Test (7742-7867) |
| `js/main.js` | urutan init: listener, font preload (7868), `resize(); reset();`, `frame()` (7872-7899) |

Catatan: ~35 file untuk 7000 baris sudah cukup. Jangan dipecah lebih halus; setiap pemisahan menambah impor.

## State global bersama
Ada sekitar 140 variabel `let` top-level. Modul ES tidak boleh meng-assign variabel hasil impor. Hasil pemetaan per bagian:

- **Dipakai di banyak bagian (±75 nama), wajib masuk `state.js`:** `W H DPR state best moth items parts floats rings uw ash boss bolts score hp hpTrail hpFlash streak diff dispD shake scorePop flash slow inv banner curStage lowFx pcap card stageNo trans od surge pop nebScroll hudA notices stormT pw powerCD eventT bossCD bossPending bossLvl bossRollT stageTime rumble tierShown tierMax paused qual save skin flow ice defrag ctd nar undoFx dialClock bgS wBase CINE PVX planets cosmos props portal warpBoost warpStars blobs stars lines`.
- **Milik satu bagian saja, tetap `let` lokal di modulnya:** efek Neon (`gridScroll scanPat stat* tear* kanaCols`), CRT (`crtA crtB crtAx crtBx lcSpr`), edge (`fingerSX edgeT edgeSide jackCD stripT lingerT`), `glowFrame sprBudget stormFlash lastFl CHUNK shardS riftC stormPuffs ovBud ovCloudC artGA artPl artPlSig pvBl pvSm pauseShown shownQual gfxManual avgMs slowFor forceStage bgLo bgHi bgSlide`.
- Cara ubah: satu objek `S` di `state.js`; `score` jadi `S.score`. Dengan ±75 nama dan ribuan pemakaian, **ini tidak boleh dikerjakan tangan**. Rencana Fase 2: codemod berbasis AST (acorn + analisis scope) yang menulis ulang referensi, termasuk `x++`, `x += `, shorthand `{x}`, `typeof x`, dan menjaga variabel lokal yang menimpa nama.
- Kasus khusus: `W` dan `H` dipakai 20+ bagian dan di loop gambar. Hasil codemod akan `S.W`; di fungsi yang sangat panas boleh diambil ke variabel lokal di awal fungsi (itu bagian Fase 3, bukan Fase 2). `W` ditukar sementara dengan `wBase` saat `drawBG` (baris 6296, 7899 `catch`); perilaku itu harus tetap.
- Array yang di-assign ulang (`items = items.filter`, reset) ikut jadi `S.items`; semua pembaca selalu lewat `S.`, jadi aman.
- `ctx`, `cv`, `menu`, `over`, `reduceMotion`, tabel const: tetap `const`, di-export dari `config.js` / `dom.js`. `reduceMotion` dibaca sekali saat load.

## Risiko circular import
- **Hampir semuanya melingkar** (`update` ↔ `spawn` ↔ `events` ↔ `bosses` ↔ `hitHazard`; `draw` ↔ sprites ↔ boss draw). Fungsi biasa (`function name(){}`) aman: binding hidup dan hanya dipanggil setelah semua modul selesai dimuat.
- **Bahaya sebenarnya = kode yang jalan saat modul dimuat** dan membaca modul lain. Daftar yang ditemukan:
  - `skin = SKINS.find(... gearOk ...)` dan `trailId = TRAILS.find(...)` (2015, 2024): butuh `save` terisi lebih dulu. Taruh di `save.js`, satu modul, urutan terjamin.
  - `ART = [art0..art5]` (7253) dan tabel lain berisi referensi fungsi (`BOSS`, `NM_TABLE`): pakai `function` deklarasi (aman) atau satu modul yang sama dengan isinya. Arrow `const x = () =>` yang diimpor melingkar kena TDZ jika dipanggil saat load; ada banyak `const x = (...) =>` (periksa satu per satu di Fase 2, ubah ke `function` hanya bila perlu).
  - `TH`, `STAGES`, `PAL`: data murni di `config.js` (leaf, tanpa impor game).
  - Semua listener (baris 979, 2247-2250, 7370-7371, 7757-7867), `gearDots()`, `gfxUI()`, `resize(); reset();`, font preload, `requestAnimationFrame(frame)` dipindah ke `main.js` / `ui.js` `init()` yang dipanggil `main.js` paling akhir.
- Aturan impor: `config.js`, `util.js`, `audio.js`, `voice.js` = leaf. `state.js` hanya impor `config.js`. Modul lain boleh saling impor fungsi.

## Risiko lain
1. **Font**: base64 di CSS tersedia seketika; file `.woff2` terpisah memuat asinkron. Game sudah memanggil `document.fonts.load([...])` (7868), jadi aman, tetapi frame pertama bisa memakai font cadangan sebelum selesai. Alternatif: biarkan base64 di `style.css` (build lebih besar, perilaku sama persis). **Perlu keputusan kamu.**
2. **Tombol Test dan panel Test** ada di game rilis. Dipertahankan (identik dengan v56).
3. **Tidak ada lagi `window.__d`** dll.: tidak ada ekspor global, tidak ada `onclick=` inline. Aman untuk modul.
4. **Handoff sudah usang** (tertulis v52; kode v56 sudah punya boss Seam Colossus, bar nyawa per boss, revisi "land" Stage 6). Handoff sendiri bilang: kode menang.
5. `Sound.setStage(i)`: `i >= 4 ? i : i % 4` sudah ada di v56 dan tetap.
6. Uji pembanding: karena tidak ada tes bawaan, Fase 2 harus punya skrip uji yang menjalankan v56 asli dan build baru dengan seed/jam palsu yang sama, lalu membandingkan state dan screenshot canvas per frame. Tanpa ini "identik" tidak bisa dibuktikan. `Math.random` dipakai di mana-mana; skrip uji harus mengganti dengan PRNG berseed.
7. Playwright/Chromium: catatan handoff bilang tidak tersedia di sandbox lama. Cek di Fase 2; cadangan: jsdom + `@napi-rs/canvas` (resep ada di handoff).

## Status git (Fase 0)
Folder ini **belum repo git**. Fase 0 (init, remote, commit awal, tag `v56-original`, push) belum dikerjakan.

## Hasil Fase 2
- Dipecah dengan codemod berbasis AST sekali jalan (acorn + eslint-scope; skrip tidak disimpan). Nama objek state adalah `ST`, bukan `S`, karena `S` sudah dipakai di kode lama. 122 variabel bersama ada di `js/state.js`; 34 variabel privat tetap `let` lokal di modulnya.
- Semua pernyataan yang jalan saat load (listener, `reset()`, `requestAnimationFrame(frame)`, isi awal state yang bergantung modul lain) dipindah ke `js/main.js` dengan urutan aslinya.
- Font tetap base64 di `style.css` (keputusan pemilik; pindah ke woff2 sesudah tes lolos).
- Uji: `npm run build`, lalu `npm test` (baseline `moth-light-56.html` vs `dist/`, seed + jam palsu, 215 hash canvas). `node tests/run.mjs --only src` menguji ES module asli tanpa bundler, `--only audio` smoke dengan WebAudio asli.
