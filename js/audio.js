import { VOICE } from './voice.js';

/* =====================================================================
   SOUND: everything is synthesized with WebAudio (no audio files).
   Music layers fade in as difficulty (0..1) rises:
     0.00  pad only (calm)
     0.18  arpeggio
     0.35  bass
     0.40  kick
     0.55  hats
     0.70  snare + driving bass
     0.82  lead line
   Tempo goes 84 -> 154 BPM and the filter opens up with difficulty.
   ===================================================================== */
   // easygoing narrator (Kokoro am_michael, rendered offline): "Welcome to 1999" / "1999 survived" (mp3, base64)
export const Sound = (() => {
  const MASTER = 1.1, MUSIC = 1.8, VRATE = .93;   // louder overall, music most of all; the male voice sits a little lower (playbackRate lowers pitch)
  let ac = null, master, musicGain, sfxGain, lp, send, noiseBuf;
  let running = false, muted = false, ducked = false;
  let nextT = 0, step = 0, bar = 0, timer = null, D = 0, tr = 0, style = 0;
  const beats = [], vbuf = {};
  const prog = [[45,[0,3,7]],[41,[0,4,7]],[48,[0,4,7]],[43,[0,4,7]]]; // Am F C G
  const NEB = [[50, [0, 3, 7, 10, 14]], [46, [0, 4, 7, 11, 14]], [53, [0, 4, 7, 11, 14]], [48, [0, 4, 7, 10, 14]]];   // Nebula Reef: Dm9 Bbmaj9 Fmaj9 C9
  const AUR = [[53, [0, 4, 7, 11, 14]], [50, [0, 3, 7, 10, 14]], [46, [0, 4, 7, 11, 14]], [48, [0, 4, 7, 9, 14]]];    // Aurora Sea: Fmaj9 Dm9 Bbmaj9 C6/9
  const CRI = [[36, [0, 3, 7, 10]], [37, [0, 4, 7, 11]], [34, [0, 4, 7, 10]], [31, [0, 3, 6, 9]]];                 // Crimson Storm: Cm7 Dbmaj7 Bb7 Gdim7
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const lvl = (a, b) => Math.max(0, Math.min(1, (D - a) / (b - a)));

  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = MASTER;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = .005; comp.release.value = .15;
    const mk = ac.createGain(); mk.gain.value = 1.35; master.connect(comp); comp.connect(mk); mk.connect(ac.destination);   // soft limiter: lets the music sit louder without clipping
    musicGain = ac.createGain(); musicGain.gain.value = MUSIC;
    lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = .8;
    musicGain.connect(lp); lp.connect(master);
    const delay = ac.createDelay(1); delay.delayTime.value = .3;
    const fb = ac.createGain(); fb.gain.value = .33;
    const wet = ac.createGain(); wet.gain.value = .35;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(lp);
    send = ac.createGain(); send.connect(delay);
    sfxGain = ac.createGain(); sfxGain.gain.value = 1.0; sfxGain.connect(master);
    const len = ac.sampleRate;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    loadVoices();
  }
  function loadVoices() {
    for (const k in VOICE) {
      try {
        const bin = atob(VOICE[k]), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        const pr = ac.decodeAudioData(u.buffer, b => { vbuf[k] = b; }, () => {}); if (pr && pr.catch) pr.catch(() => {});
      } catch (e) {}
    }
  }

  function tone(f, t, dur, type, vol, dest, o = {}) {
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    const a = Math.min(o.attack || .005, dur * .5);
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(g); g.connect(dest);
    if (o.send) g.connect(send);
    osc.start(t); osc.stop(t + dur + .05);
  }

  function noise(t, dur, vol, dest, o = {}) {
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = o.type || 'highpass';
    f.frequency.setValueAtTime(o.freq || 5000, t);
    if (o.q) f.Q.value = o.q;
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t); src.stop(t + dur + .05);
  }

  function schedule0() {
    const bpm = 84 + D * 70, sd = 60 / bpm / 4;
    const [root0, ch] = prog[bar % 4], root = root0 + tr;
    const t = nextT, s = step % 16, m = musicGain;

    if (s % 4 === 0) { beats.push(t); if (beats.length > 12) beats.shift(); }

    // calm pad: always present
    if (s === 0) {
      ch.forEach(iv => tone(mtof(root + 12 + iv), t, sd * 16.5, 'triangle', .075 - D * .03, m, { attack: .7, send: true }));
      tone(mtof(root), t, sd * 16.5, 'sine', .09, m, { attack: .5 });
    }
    // arpeggio
    const arp = lvl(.18, .5);
    if (arp > .02 && (D > .6 || s % 2 === 0)) {
      const seq = [0, 1, 2, 1, 0, 2, 1, 2];
      const idx = D > .6 ? s % 8 : (s / 2) % 8;
      const oct = (idx === 5 || idx === 7) ? 12 : 0;
      tone(mtof(root + 24 + ch[seq[idx]] + oct), t, sd * 1.9, D > .55 ? 'sawtooth' : 'triangle',
        (D > .55 ? .035 : .06) * arp, m, { send: true });
    }
    // bass
    const bass = lvl(.35, .65);
    if (bass > .02) {
      const pat = D > .7 ? [0, 2, 3, 6, 8, 10, 11, 14] : [0, 6, 8, 14];
      if (pat.includes(s)) tone(mtof(root - 12), t, sd * 1.8, 'sawtooth', .13 * bass, m, { slide: mtof(root - 12) * .98 });
    }
    // drums
    const kick = lvl(.4, .6);
    if (kick > .02 && s % 4 === 0) {
      tone(160, t, .14, 'sine', .55 * kick, m, { slide: 42 });
      tone(55, t, .22, 'sine', .35 * kick, m);
    }
    const hat = lvl(.55, .75);
    if (hat > .02 && (D > .8 ? true : s % 4 === 2)) noise(t, .04, .13 * hat, m, { freq: 8000 });
    if (D > .8 && (s === 6 || s === 14)) noise(t, .13, .1, m, { freq: 7000 });
    const sn = lvl(.7, .82);
    if (sn > .02 && (s === 4 || s === 12)) {
      noise(t, .15, .3 * sn, m, { freq: 1800, type: 'highpass' });
      tone(210, t, .09, 'triangle', .22 * sn, m, { slide: 120 });
    }
    // lead at high heat
    const lead = lvl(.82, 1);
    if (lead > .02 && [0, 3, 6, 10, 12, 14].includes(s)) {
      const n = root + 36 + ch[(s * 7) % 3];
      tone(mtof(n), t, sd * 2.2, 'sawtooth', .05 * lead, m, { send: true });
      tone(mtof(n) * 1.005, t, sd * 2.2, 'square', .025 * lead, m);
    }

    return sd;
  }

  const beat = t => { beats.push(t); if (beats.length > 12) beats.shift(); };
  const kickD = (t, v) => { tone(160, t, .14, 'sine', .55 * v, musicGain, { slide: 42 }); tone(55, t, .22, 'sine', .35 * v, musicGain); };
  const snareD = (t, v) => { noise(t, .15, .3 * v, musicGain, { freq: 1800 }); tone(210, t, .09, 'triangle', .22 * v, musicGain, { slide: 120 }); };
  const hatD = (t, v, d = .04) => noise(t, d, v, musicGain, { freq: 8000 });

  // Nebula Reef: cosmic ambient -> ethereal electronic -> liquid drum & bass
  function schedule1() {
    const bpm = 92 + D * 78, sd = 60 / bpm / 4, m = musicGain;
    const [root, ch] = NEB[bar % 4], t = nextT, s = step % 16;
    if (s % 4 === 0) beat(t);
    if (s === 0) {
      ch.forEach(iv => {
        tone(mtof(root + 12 + iv), t, sd * 16.5, 'sine', .045, m, { attack: 1.2, send: true });
        tone(mtof(root + 12 + iv) * 1.004, t, sd * 16.5, 'triangle', .02, m, { attack: 1.4, send: true });
      });
      tone(mtof(root - 12), t, sd * 16.5, 'sine', .12, m, { attack: .8 });
    }
    const calm = 1 - lvl(.3, .7);                       // weightless bubbles when calm
    if (calm > .05 && s % 2 === 1 && Math.random() < .25 * calm) {
      const n = root + 24 + ch[(Math.random() * ch.length) | 0] + (Math.random() < .4 ? 12 : 0);
      tone(mtof(n), t, sd * 5, 'sine', .05, m, { slide: mtof(n) * 1.06, send: true });
    }
    const arp = lvl(.2, .5);
    if (arp > .02 && s % 2 === 0) {
      const n = root + 24 + ch[((s / 2) + bar) % ch.length];
      tone(mtof(n), t, sd * 3, 'sine', .05 * arp, m, { send: true });
      tone(mtof(n) * 2.76, t, sd * 1.5, 'sine', .012 * arp, m, { send: true });
    }
    const dr = lvl(.4, .6);                             // two-step liquid DnB break
    if (dr > .02) {
      if (s === 0 || s === 10) kickD(t, dr);
      if (s === 4 || s === 12) snareD(t, dr * .75);
      if (s % 2 === 0) hatD(t, .08 * dr);
      if (s === 7 || s === 15) hatD(t, .05 * dr, .03);
    }
    const bs = lvl(.3, .6);
    if (bs > .02 && (s === 0 || s === 3 || s === 6 || s === 10 || s === 14)) {
      tone(mtof(root - 12), t, sd * 2.2, 'sine', .22 * bs, m);
      tone(mtof(root - 12) * 1.01, t, sd * 2.2, 'sawtooth', .04 * bs, m);
    }
    const ld = lvl(.75, 1);
    if (ld > .02 && (s === 0 || s === 6 || s === 12)) tone(mtof(root + 36 + ch[((s / 6) | 0) + 1]), t, sd * 5, 'triangle', .05 * ld, m, { send: true });
    return sd;
  }

  // Aurora Sea: dream pop / neoclassical ambient / soft piano
  function schedule2() {
    const bpm = 68 + D * 44, sd = 60 / bpm / 4, m = musicGain;
    const [root, ch] = AUR[bar % 4], t = nextT, s = step % 16;
    if (s % 4 === 0) beat(t);
    const piano = (n, dur, v) => {
      tone(mtof(n), t, dur, 'triangle', v, m, { attack: .004, send: true });
      tone(mtof(n) * 2, t, dur * .6, 'sine', v * .35, m, { send: true });
      tone(mtof(n) * 3.01, t, dur * .25, 'sine', v * .12, m);
      noise(t, .03, v * .25, m, { type: 'lowpass', freq: 1500 });
    };
    if (s === 0) ch.forEach(iv => {
      tone(mtof(root + 12 + iv), t, sd * 16.5, 'triangle', .05, m, { attack: .9, send: true });
      tone(mtof(root + iv), t, sd * 16.5, 'sine', .04, m, { attack: .7 });
    });
    if (s % (D < .2 ? 4 : 2) === 0) {
      const seq = [0, 1, 2, 3, 4, 3, 2, 1], q = seq[(s / 2) % 8];
      piano(root + 12 + ch[q % ch.length] + (q >= 3 ? 12 : 0), sd * 6, .08);
    }
    const sh = lvl(.25, .55);
    if (sh > .02 && (s === 0 || s === 8)) tone(mtof(root + 36 + ch[2]), t, sd * 8, 'sine', .035 * sh, m, { attack: .4, send: true });
    const dr = lvl(.35, .6);                            // soft kick, brushed snare, shaker
    if (dr > .02) {
      if (s === 0 || s === 8 || (D > .7 && s === 10)) tone(120, t, .16, 'sine', .3 * dr, m, { slide: 48 });
      if (s === 4 || s === 12) noise(t, .13, .1 * dr, m, { type: 'bandpass', freq: 2600, q: 1 });
      if (D > .5 && s % 2 === 0) hatD(t, .04 * dr, .025);
    }
    const bs = lvl(.3, .6);
    if (bs > .02 && (s === 0 || s === 8 || (D > .75 && s === 6))) tone(mtof(root - 12), t, sd * 6, 'sine', .2 * bs, m, { attack: .01 });
    const ld = lvl(.6, .9);
    if (ld > .02 && (s === 0 || s === 6 || s === 10)) tone(mtof(root + 24 + ch[s === 0 ? 4 : s === 6 ? 2 : 3]), t, sd * 5, 'triangle', .055 * ld, m, { attack: .02, send: true });
    return sd;
  }

  // Crimson Storm: dark ambient -> industrial -> cinematic orchestral
  function schedule3() {
    const bpm = 74 + D * 76, sd = 60 / bpm / 4, m = musicGain;
    const [root, ch] = CRI[bar % 4], t = nextT, s = step % 16;
    if (s % 4 === 0) beat(t);
    if (s === 0) {                                      // low drone + dark strings
      tone(mtof(root - 12), t, sd * 16.5, 'sawtooth', .07, m, { attack: .6 });
      tone(mtof(root - 12) * 1.006, t, sd * 16.5, 'sawtooth', .05, m, { attack: .6 });
      tone(mtof(root - 24), t, sd * 16.5, 'sine', .16, m, { attack: .3 });
      ch.forEach(iv => tone(mtof(root + iv), t, sd * 16.5, 'sawtooth', .022, m, { attack: 1.0 }));
    }
    if (s === 0 || (s === 8 && Math.random() < .5)) {  // distant war drum
      tone(95, t, .5, 'sine', .35, m, { slide: 42 });
      noise(t, .4, .18, m, { type: 'lowpass', freq: 400, sweep: 80 });
    }
    if (Math.random() < .035) {                         // metallic clang
      noise(t, .9, .07, m, { type: 'bandpass', freq: 2200, sweep: 900, q: 6 });
      tone(mtof(root + 36 + ch[(Math.random() * ch.length) | 0]) * 1.41, t, .8, 'square', .018, m, { send: true });
    }
    const bs = lvl(.25, .5);                            // pulsing industrial ostinato
    if (bs > .02) {
      const off = [0, 0, 12, 0, 0, 0, 7, 0, 0, 0, 12, 0, 0, 3, 0, 5][s];
      tone(mtof(root - 12 + off), t, sd * .9, 'sawtooth', .12 * bs, m);
    }
    const kk = lvl(.35, .55);
    if (kk > .02 && s % 4 === 0) {
      tone(130, t, .18, 'sine', .65 * kk, m, { slide: 32 });
      noise(t, .02, .25 * kk, m, { freq: 3000 });
    }
    const sn = lvl(.55, .75);
    if (sn > .02 && (s === 4 || s === 12)) {
      noise(t, .2, .32 * sn, m, { freq: 1500 });
      tone(330, t, .15, 'square', .06 * sn, m, { slide: 180 });
      tone(497, t, .12, 'square', .04 * sn, m, { slide: 260 });
    }
    const hh = lvl(.65, .85);
    if (hh > .02) hatD(t, (s % 4 === 2 ? .12 : .06) * hh, .03);
    const st = lvl(.5, .75);                            // brass / orchestra hits
    if (st > .02 && (s === 0 || s === 6 || s === 10)) ch.forEach(iv => {
      tone(mtof(root + 12 + iv), t, sd * 3, 'sawtooth', .04 * st, m);
      tone(mtof(root + iv), t, sd * 3, 'square', .02 * st, m);
    });
    const sw = lvl(.8, 1);
    if (sw > .02 && s === 0 && bar % 2 === 0) ch.forEach(iv => tone(mtof(root + 24 + iv), t, sd * 16, 'sawtooth', .02 * sw, m, { attack: .9 }));
    if (D > .6 && bar % 4 === 3 && s === 8) noise(t, sd * 8, .14, m, { type: 'highpass', freq: 300, sweep: 9000 });
    return sd;
  }

  // Neon Mirage: dreamwave. Wobbling detuned pads, glassy arps, gated snare, rolling bass; a tape-stutter break at high heat
  const NEO = [[49, [0, 4, 7, 11, 14]], [46, [0, 3, 7, 10, 14]], [42, [0, 4, 7, 11, 14]], [44, [0, 5, 7, 10, 14]]];   // Dbmaj9 Bbm9 Gbmaj9 Absus9
  function schedule4() {
    const bpm = 80 + D * 34, sd = 60 / bpm / 4, m = musicGain;
    const [root, ch] = NEO[bar % 4], t = nextT, s = step % 16;
    if (s % 4 === 0) beat(t);
    const wob = 1 + Math.sin(bar * 1.9) * .0035;                                   // tape wobble
    if (s === 0) {
      ch.forEach(iv => {
        const f = mtof(root + 12 + iv) * wob;
        tone(f, t, sd * 16.5, 'sawtooth', .02, m, { attack: .9, send: true });
        tone(f * 1.006, t, sd * 16.5, 'sawtooth', .02, m, { attack: 1.0, send: true });
        tone(f * .994, t, sd * 16.5, 'triangle', .03, m, { attack: .8 });
      });
      tone(mtof(root - 12), t, sd * 16.5, 'sine', .14, m, { attack: .4 });
    }
    const calm = 1 - lvl(.2, .55);                                                 // floating bells while it is calm
    if (calm > .05 && s % 4 === 2 && Math.random() < .5 * calm) {
      const n = root + 24 + ch[(Math.random() * ch.length) | 0] + (Math.random() < .4 ? 12 : 0);
      tone(mtof(n), t, sd * 7, 'sine', .05, m, { send: true }); tone(mtof(n) * 2.01, t, sd * 4, 'sine', .015, m, { send: true });
    }
    const arp = lvl(.12, .45);                                                     // glassy arpeggio
    if (arp > .02 && (s % 2 === 0 || (D > .65 && s % 2 === 1))) {
      const q = [0, 2, 4, 3, 1, 4, 2, 3][(s >> 1) % 8], n = root + 24 + ch[q % ch.length] + (q >= 3 ? 12 : 0);
      tone(mtof(n), t, sd * 2.6, 'sine', .055 * arp, m, { send: true });
      tone(mtof(n) * 2.01, t, sd * 1.4, 'sine', .018 * arp, m, { send: true });
    }
    const kk = lvl(.3, .5);
    if (kk > .02 && (s === 0 || s === 10 || (D > .75 && s === 7))) { tone(150, t, .16, 'sine', .5 * kk, m, { slide: 44 }); tone(55, t, .22, 'sine', .3 * kk, m); }
    const sn = lvl(.45, .65);                                                      // gated-reverb snare
    if (sn > .02 && (s === 4 || s === 12)) {
      noise(t, .22, .22 * sn, m, { type: 'bandpass', freq: 2000, q: .8 }); noise(t, .1, .14 * sn, m, { freq: 4500 });
      tone(200, t, .1, 'triangle', .2 * sn, m, { slide: 100 });
    }
    const hh = lvl(.55, .75);
    if (hh > .02) { if (s % 2 === 0) hatD(t, .06 * hh, .03); if (s === 14) hatD(t, .08 * hh, .16); }
    const bs = lvl(.2, .5);                                                        // rolling bass
    if (bs > .02 && [0, 3, 6, 8, 11, 14].includes(s)) {
      const n = root - 12 + (s === 8 || s === 14 ? 12 : 0);
      tone(mtof(n), t, sd * 2.4, 'triangle', .2 * bs, m); tone(mtof(n) * .5, t, sd * 2.4, 'sine', .1 * bs, m);
    }
    const ld = lvl(.7, 1);                                                         // gliding lead
    if (ld > .02 && (s === 0 || s === 6 || s === 10)) {
      const n = root + 36 + ch[s === 0 ? 4 : s === 6 ? 2 : 3];
      tone(mtof(n) * .94, t, sd * 5, 'sawtooth', .04 * ld, m, { slide: mtof(n), send: true }); tone(mtof(n) * 1.005, t, sd * 5, 'square', .018 * ld, m);
    }
    if (D > .55 && bar % 4 === 3 && s >= 12) {                                     // tape stutter
      tone(mtof(root + 36 + ch[4]), t, sd * .8, 'square', .035 * (1 - (s - 12) * .22), m, { send: true });
      noise(t, .02, .05, m, { freq: 5000 });
    }
    if (Math.random() < .06) noise(t, .012, .03, m, { freq: 6500 });               // record crackle
    return sd;
  }

  // v54 Overflow Reach: open-land ambient that loses its precision as heat climbs. Calm: a wide open-fifth drone, wind and a pentatonic pluck on a clean grid.
  // Heat: voices detune apart, pitches wander off the grid, notes stick and repeat (a buffer that will not clear), the sub-bass stretches, and every fourth bar ends in an integer-overflow wrap.
  const OVR = [[45, [0, 7, 12, 14]], [43, [0, 7, 12, 14]], [40, [0, 7, 12, 16]], [38, [0, 7, 12, 14]]];   // A, G, E, D: open voicings
  const OPENT = [0, 2, 4, 7, 9];
  function schedule5() {
    const bpm = 66 + D * 50, sd = 60 / bpm / 4, m = musicGain;
    const [root, ch] = OVR[bar % 4], t = nextT, s = step % 16, dr = D * D;
    if (s % 4 === 0) beat(t);
    if (s === 0) {                                                                // the land: an open drone; the voices detune apart with heat
      ch.forEach((iv, i) => {
        const f = mtof(root + 12 + iv);
        tone(f, t, sd * 16.5, 'triangle', .05, m, { attack: .9, send: true });
        tone(f * (1.003 + dr * .03 * (i + 1)), t, sd * 16.5, 'sine', .035, m, { attack: 1.1, send: true });
      });
      tone(mtof(root - 12), t, sd * 16.5, 'sine', .15, m, { attack: .4 });
      if (bar % 2 === 0) noise(t, sd * 15, .04 * (1 - dr * .5), m, { type: 'bandpass', freq: 500, sweep: 1100, q: .7 });   // wind over the land
    }
    const pl = 1 - lvl(.5, .95) * .55;                                            // a pluck on the grid; at heat the pitch wanders off it
    if (s % 4 === 2 && Math.random() < .6 * pl) {
      const n = root + 24 + OPENT[(Math.random() * 5) | 0] + (Math.random() < .3 ? 12 : 0), f = mtof(n) * (1 + (Math.random() - .5) * dr * .09);
      tone(f, t, sd * 5, 'triangle', .06, m, { send: true, slide: f * (1 - dr * .06) });
      tone(f * 2.003, t, sd * 2.5, 'sine', .016, m, { send: true });
    }
    const arp = lvl(.15, .5);                                                     // grid arpeggio; at heat a stuck buffer repeats notes
    if (arp > .02 && s % 2 === 0) {
      const q = [0, 1, 2, 3, 2, 1, 3, 2][(s >> 1) % 8], f = mtof(root + 24 + ch[q % ch.length]) * (1 + (Math.random() - .5) * dr * .06);
      tone(f, t, sd * 1.8, 'square', .026 * arp, m, { send: true });
      if (Math.random() < dr * .55) tone(f, t + sd * .5, sd * 1.2, 'square', .018 * arp, m, { send: true });
    }
    const bs = lvl(.25, .55);                                                     // sub-bass that stretches and sags with heat
    if (bs > .02 && (s === 0 || s === 6 || s === 10 || (D > .7 && s === 14))) {
      const f = mtof(root - 12), len = sd * (2.4 + dr * 5);
      tone(f, t, len, 'triangle', .17 * bs, m, { slide: f * (1 - dr * .25) }); tone(f * .5, t, len, 'sine', .1 * bs, m);
    }
    const kk = lvl(.35, .55);
    if (kk > .02 && (s === 0 || s === 8 || (D > .75 && s === 11))) { tone(130, t, .16, 'sine', .42 * kk, m, { slide: 42 }); tone(52, t, .22, 'sine', .26 * kk, m); }
    const sn = lvl(.5, .7);                                                       // a dry slab clap
    if (sn > .02 && (s === 4 || s === 12)) { noise(t, .12, .16 * sn, m, { type: 'bandpass', freq: 1500, q: 1.2 }); tone(180, t, .08, 'triangle', .14 * sn, m, { slide: 90 }); }
    const hh = lvl(.6, .85);
    if (hh > .02 && s % 2 === 0) hatD(t, .045 * hh, .03);
    if (D > .75 && bar % 4 === 3 && s >= 10) {                                    // integer overflow: the line climbs, wraps down an octave and stutters
      const k = s - 10, n = root + 36 + ch[k % ch.length] - (k % 3 === 2 ? 12 : 0);
      tone(mtof(n), t, sd * .8, 'square', .03, m, { send: true }); noise(t, .02, .04, m, { freq: 5000 });
    }
    return sd;
  }

  function schedule() {
    const sd = [schedule0, schedule1, schedule2, schedule3, schedule4, schedule5][style]();
    nextT += sd; step++;
    if (step % 16 === 0) bar++;
  }

  function tick() {
    if (!ac || !running) return;
    while (nextT < ac.currentTime + .15) schedule();
    const cut = ducked ? 380 : [650, 520, 900, 450, 820, 760][style] + D * D * 7800;
    lp.frequency.setTargetAtTime(cut, ac.currentTime, .12);
    musicGain.gain.setTargetAtTime(ducked ? MUSIC * .35 : MUSIC, ac.currentTime, .2);
  }

  // ---- sfx
  const S = {
    collect(streak) {
      if (!ac || muted) return;
      if (style) {
        const t0 = ac.currentTime, k = Math.min(streak, 9);
        if (style === 1) { const n = 62 + [0, 2, 5, 7, 9, 12, 14, 17, 19, 21][k]; tone(mtof(n), t0, .35, 'sine', .15, sfxGain, { slide: mtof(n) * 1.12, send: true }); tone(mtof(n) * 2.76, t0, .2, 'sine', .05, sfxGain, { send: true }); }
        else if (style === 2) { const n = 65 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21][k]; tone(mtof(n), t0, .6, 'triangle', .13, sfxGain, { send: true }); tone(mtof(n) * 2, t0, .35, 'sine', .05, sfxGain, { send: true }); tone(mtof(n) * 3.01, t0, .15, 'sine', .02, sfxGain); }
        else if (style === 4) { const n = 66 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21][k]; tone(mtof(n), t0, .5, 'sine', .13, sfxGain, { send: true }); tone(mtof(n) * 2.01, t0, .3, 'sine', .05, sfxGain, { send: true }); tone(mtof(n) * 4, t0 + .015, .06, 'square', .018, sfxGain); }
        else { const n = 48 + [0, 3, 5, 7, 10, 12, 15, 17, 19, 22][k]; tone(mtof(n), t0, .18, 'square', .08, sfxGain); tone(mtof(n) * 2.41, t0, .25, 'sine', .05, sfxGain, { send: true }); noise(t0, .03, .12, sfxGain, { freq: 4000 }); }
        return;
      }
      const t = ac.currentTime, sc = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];
      const n = 69 + sc[Math.min(streak, 9)];
      tone(mtof(n), t, .2, 'triangle', .17, sfxGain, { send: true });
      tone(mtof(n + 12), t + .03, .14, 'sine', .08, sfxGain);
    },
    gold() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      if (style === 1) { [74, 78, 81, 86, 90].forEach((n, i) => tone(mtof(n), t + i * .06, .45, 'sine', .08, sfxGain, { slide: mtof(n) * 1.08, send: true })); return; }
      if (style === 2) { [72, 76, 79, 83, 88, 91].forEach((n, i) => tone(mtof(n), t + i * .05, .7, 'triangle', .08, sfxGain, { send: true })); return; }
      if (style === 4) { [78, 83, 85, 90, 95].forEach((n, i) => tone(mtof(n), t + i * .05, .5, 'sine', .08, sfxGain, { send: true })); tone(mtof(102), t + .26, .05, 'square', .03, sfxGain); return; }
      if (style === 3) { [48, 55, 60].forEach(n => tone(mtof(n), t, .35, 'sawtooth', .07, sfxGain)); noise(t, .3, .15, sfxGain, { type: 'bandpass', freq: 2500, sweep: 800, q: 5 }); return; }
      [76, 79, 83, 88, 91].forEach((n, i) => tone(mtof(n), t + i * .05, .16, 'square', .07, sfxGain, { send: true }));
      noise(t, .3, .08, sfxGain, { freq: 6000 });
    },
    hit() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      if (style === 1) { tone(100, t, .8, 'sine', .8, sfxGain, { slide: 30 }); noise(t, .7, .45, sfxGain, { type: 'lowpass', freq: 900, sweep: 100 }); [88, 83, 79, 74].forEach((n, i) => tone(mtof(n), t + .05 + i * .07, .3, 'sine', .08, sfxGain, { slide: mtof(n) * .7, send: true })); return; }
      if (style === 2) { tone(120, t, .7, 'sine', .6, sfxGain, { slide: 34 }); tone(660, t, .9, 'triangle', .1, sfxGain, { slide: 110, send: true }); tone(665, t, .9, 'sine', .08, sfxGain, { slide: 112, send: true }); noise(t, .35, .25, sfxGain, { type: 'lowpass', freq: 1500, sweep: 150 }); return; }
      if (style === 4) { tone(330, t, .8, 'sawtooth', .13, sfxGain, { slide: 34 }); tone(110, t, .6, 'sine', .7, sfxGain, { slide: 30 }); noise(t, .3, .35, sfxGain, { type: 'bandpass', freq: 2600, q: 3 }); for (let i = 0; i < 4; i++) tone(1800 - i * 300, t + i * .045, .04, 'square', .05, sfxGain); return; }
      if (style === 3) { tone(80, t, .95, 'sine', .9, sfxGain, { slide: 22 }); noise(t, .8, .55, sfxGain, { type: 'lowpass', freq: 5000, sweep: 100 }); tone(220, t, .8, 'sawtooth', .22, sfxGain, { slide: 40 }); noise(t, .12, .5, sfxGain, { freq: 2000 }); tone(330, t, .5, 'square', .1, sfxGain, { slide: 110 }); return; }
      tone(130, t, .7, 'sine', .8, sfxGain, { slide: 28 });
      noise(t, .5, .5, sfxGain, { type: 'lowpass', freq: 3500, sweep: 200 });
      noise(t, .16, .45, sfxGain, { freq: 1500 });
      tone(900, t, .8, 'sawtooth', .12, sfxGain, { slide: 45 });
    },
    whoosh() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      noise(t, .28, .14, sfxGain, { type: 'bandpass', freq: 500, sweep: 3200, q: 2 });
    },
    tier(i) {
      if (!ac || muted) return;
      const t = ac.currentTime;
      if (style) {
        const wf = ['square', 'sine', 'triangle', 'sawtooth', 'triangle'][style], base = style === 3 ? 43 : 57;
        noise(t, .6, .1, sfxGain, { type: 'highpass', freq: 400, sweep: 9000 });
        for (let k = 0; k < 5; k++) tone(mtof(base + i * 2 + k * 4), t + k * .06, .25, wf, .07, sfxGain, { send: true });
        return;
      }
      noise(t, .6, .12, sfxGain, { type: 'highpass', freq: 400, sweep: 9000 });
      for (let k = 0; k < 5; k++) tone(mtof(57 + i * 2 + k * 4), t + k * .06, .2, 'square', .06, sfxGain, { send: true });
    },
    jump() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      noise(t, 2.1, .28, sfxGain, { type: 'highpass', freq: 200, sweep: 12000 });
      tone(110, t, 2.1, 'sawtooth', .08, sfxGain, { slide: 2200, send: true });
      tone(55, t, 2.0, 'sine', .3, sfxGain, { slide: 260 });
    },
    arrive() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      tone(90, t, .9, 'sine', .7, sfxGain, { slide: 24 });
      noise(t, 1.2, .4, sfxGain, { type: 'lowpass', freq: 3000, sweep: 120 });
      [60, 67, 72, 76].forEach((n, i) => tone(mtof(n), t + .05 + i * .05, .9, 'sawtooth', .07, sfxGain, { send: true }));
    },
    glitchJump(enter) {                       // Y2K modem screech + stutter + tape-stop, only for Neon Mirage jumps
      if (!ac || muted) return;
      const t = ac.currentTime, F = [1200, 2200, 1800, 980, 2600, 1500];
      for (let i = 0; i < 15; i++) tone(F[i % 6] * (1 + (i % 3) * .06), t + i * .085, .07, 'square', .045, sfxGain);
      for (let i = 0; i < 9; i++) noise(t + .08 + i * .14 + Math.random() * .04, .05 + Math.random() * .06, .22, sfxGain, { type: 'bandpass', freq: 500 + Math.random() * 5500, q: 7 });
      tone(enter ? 220 : 1100, t, 1.35, 'sawtooth', .07, sfxGain, { slide: enter ? 1400 : 70, send: true });
      tone(70, t + .9, .55, 'sine', .32, sfxGain, { slide: 28 });
    },
    glitchArrive(enter) {                     // error ding, crash, then a pastel boot chime (up when entering, down when leaving)
      if (!ac || muted) return;
      const t = ac.currentTime;
      tone(880, t, .3, 'sine', .3, sfxGain); tone(660, t + .15, .45, 'sine', .3, sfxGain);
      noise(t, .14, .45, sfxGain, { type: 'bandpass', freq: 3200, q: 2 });
      const ch = enter ? [60, 64, 67, 71, 76] : [88, 83, 79, 76, 72];
      ch.forEach((n, i) => tone(mtof(n), t + .32 + i * .09, 1.1, 'triangle', .09, sfxGain, { send: true }));
      if (!enter) noise(t + .3, 1.2, .25, sfxGain, { type: 'lowpass', freq: 4000, sweep: 150 });
    },
    voice(k, delay = 0) {                     // narrator line, dry plus a little echo
      if (!ac || muted || !vbuf[k]) return;
      const s = ac.createBufferSource(), g = ac.createGain(), w = ac.createGain();
      s.buffer = vbuf[k]; s.playbackRate.value = VRATE; g.gain.value = 1.35; w.gain.value = .16;
      s.connect(g); g.connect(master); g.connect(w); w.connect(send); s.start(ac.currentTime + delay);
    },
    voiceReady() { return Object.keys(vbuf).map(k => k + ':' + vbuf[k].duration.toFixed(2)).join(' '); },
    glimmer() {                               // Neon Mirage ambience: a soft descending sparkle instead of a distant roar
      if (!ac || muted) return;
      const t = ac.currentTime, P = [93, 90, 88, 85, 83, 81, 78], o = (Math.random() * 3) | 0;
      for (let i = 0; i < 4; i++) tone(mtof(P[o + i]), t + i * .12, .6, 'sine', .035, sfxGain, { send: true });
      noise(t, 1, .045, sfxGain, { type: 'bandpass', freq: 1200, sweep: 5200, q: 3 });
    },
    glitchBurst() {                           // Neon Mirage hazard: crunchy bit-crush burst instead of thunder
      if (!ac || muted) return;
      const t = ac.currentTime;
      for (let i = 0; i < 6; i++) noise(t + i * .035, .05, .32, sfxGain, { type: 'bandpass', freq: 600 + Math.random() * 5000, q: 6 });
      tone(1760, t, .04, 'square', .07, sfxGain, { slide: 440 }); tone(110, t, .22, 'square', .12, sfxGain, { slide: 38 });
      tone(660, t + .05, .05, 'square', .05, sfxGain, { slide: 1320 });
    },
    thunder(delay = 0, big = false) {
      if (!ac || muted) return;
      const t = ac.currentTime + delay, k = big ? 1.5 : 1;
      noise(t, big ? .16 : .09, .5 * k, sfxGain, { freq: big ? 3800 : 2500 });                                   // the crack
      noise(t + .05, big ? 3.6 : 2.4, .6 * k, sfxGain, { type: 'lowpass', freq: 520, sweep: 55 });                // the roll
      noise(t + .55, big ? 2.8 : 1.9, .38 * k, sfxGain, { type: 'lowpass', freq: 380, sweep: 50 });
      tone(big ? 46 : 58, t + .05, big ? 2 : 1.2, 'sine', .55 * k, sfxGain, { slide: 30 });
      if (big) tone(32, t + .1, 2.4, 'sine', .5, sfxGain, { slide: 20 });                                         // deep boom
    },
    roar(big) {
      if (!ac || muted) return;
      const t = ac.currentTime, dur = big ? 1.9 : 1.3, f0 = big ? 120 : 95, f1 = big ? 42 : 50;
      const o = ac.createOscillator(), o2 = ac.createOscillator(), lfo = ac.createOscillator();
      const f = ac.createBiquadFilter(), tr = ac.createGain(), env = ac.createGain(), lg = ac.createGain();
      o.type = 'sawtooth'; o2.type = 'square'; lfo.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      o2.frequency.setValueAtTime(f0 * .5, t); o2.frequency.exponentialRampToValueAtTime(f1 * .5 + 10, t + dur);
      f.type = 'lowpass'; f.Q.value = 4;
      f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(220, t + dur);
      tr.gain.value = .55; lfo.frequency.value = big ? 34 : 26; lg.gain.value = .45;
      lfo.connect(lg); lg.connect(tr.gain);
      env.gain.setValueAtTime(.0001, t);
      env.gain.linearRampToValueAtTime(big ? .5 : .32, t + .18);
      env.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(f); o2.connect(f); f.connect(tr); tr.connect(env); env.connect(sfxGain);
      [o, o2, lfo].forEach(x => { x.start(t); x.stop(t + dur + .1); });
      noise(t, dur * .8, .14, sfxGain, { type: 'bandpass', freq: 700, sweep: 200, q: 1.5 });
    },
    warn() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      for (let i = 0; i < 2; i++) tone(880, t + i * .13, .09, 'square', .08, sfxGain);
    },
    coreOpen() { if (!ac || muted) return; const t = ac.currentTime; tone(mtof(79), t, .08, 'square', .06, sfxGain); tone(mtof(86), t + .08, .25, 'triangle', .08, sfxGain, { send: true }); },
    seam() {            // v54: a wall of terrain rises: a low grind and two warning blips
      if (!ac || muted) return;
      const t = ac.currentTime;
      noise(t, .8, .2, sfxGain, { type: 'lowpass', freq: 900, sweep: 120 }); tone(110, t, .8, 'sawtooth', .08, sfxGain, { slide: 55 });
      tone(880, t, .09, 'square', .06, sfxGain); tone(660, t + .12, .09, 'square', .06, sfxGain);
    },
    seamTick() { if (!ac || muted) return; const t = ac.currentTime; tone(mtof(88), t, .05, 'square', .05, sfxGain); tone(mtof(76), t + .06, .07, 'square', .05, sfxGain); },   // the gap is about to move
    shear() {           // v54: a slab starts to slide: a grinding rise
      if (!ac || muted) return;
      const t = ac.currentTime;
      noise(t, .7, .16, sfxGain, { type: 'bandpass', freq: 600, sweep: 3200, q: 2 }); tone(220, t, .6, 'sawtooth', .07, sfxGain, { slide: 880 });
      tone(mtof(81), t + .05, .07, 'square', .05, sfxGain);
    },
    slab() {            // v54: the Seam Colossus slams down: a deep thud and a rolling grind
      if (!ac || muted) return;
      const t = ac.currentTime;
      tone(80, t, .5, 'sine', .4, sfxGain, { slide: 30 }); noise(t, .35, .25, sfxGain, { type: 'lowpass', freq: 700, sweep: 90 });
      tone(mtof(43), t + .05, .4, 'sawtooth', .05, sfxGain, { slide: mtof(36) });
    },
    reseed() {          // v54: the land snaps back onto the grid: evenly spaced ticks, then a settling tone
      if (!ac || muted) return;
      const t = ac.currentTime;
      [72, 74, 76, 79, 81, 84].forEach((n, i) => tone(mtof(n), t + i * .06, .12, 'square', .05, sfxGain));
      tone(mtof(60), t + .4, .6, 'sine', .12, sfxGain, { send: true }); noise(t, .3, .1, sfxGain, { freq: 5000, sweep: 1500 });
    },
    glitchTp() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      tone(1400, t, .07, 'square', .06, sfxGain, { slide: 300 }); noise(t, .08, .12, sfxGain, { type: 'bandpass', freq: 3000, q: 4 });
      tone(220, t + .05, .06, 'square', .045, sfxGain, { slide: 900 });
    },
    undo() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      noise(t, .35, .2, sfxGain, { type: 'bandpass', freq: 7000, sweep: 600, q: 2 });
      tone(1500, t, .3, 'sawtooth', .07, sfxGain, { slide: 220 });
      tone(mtof(88), t + .3, .12, 'square', .07, sfxGain); tone(mtof(95), t + .4, .3, 'square', .07, sfxGain, { send: true });
    },
    defrag() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      noise(t, 1.0, .22, sfxGain, { type: 'bandpass', freq: 400, sweep: 6000, q: 3 });
      for (let i = 0; i < 10; i++) tone(900 + i * 140, t + i * .1, .05, 'square', .05, sfxGain);
      tone(70, t, .9, 'sine', .3, sfxGain, { slide: 200 });
    },
    dialup() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      [1200, 2200, 1800, 2400, 1500, 2100].forEach((f, i) => tone(f, t + i * .09, .08, 'square', .045, sfxGain));
      noise(t + .5, .5, .12, sfxGain, { type: 'bandpass', freq: 1800, q: 6 });
    },
    save() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      noise(t, .05, .3, sfxGain, { freq: 1200 });
      tone(mtof(79), t + .05, .1, 'square', .07, sfxGain); tone(mtof(84), t + .14, .25, 'square', .07, sfxGain, { send: true });
    },
    popOpen() { if (!ac || muted) return; const t = ac.currentTime; tone(660, t, .07, 'square', .06, sfxGain); tone(440, t + .07, .12, 'square', .06, sfxGain); },
    popClose() { if (!ac || muted) return; tone(300, ac.currentTime, .05, 'square', .035, sfxGain); },
    marq(on) { if (!ac || muted) return; const t = ac.currentTime; noise(t, .05, .2, sfxGain, { freq: 1500 }); tone(on ? 500 : 900, t, .06, 'square', .05, sfxGain); },
    buffer() { if (!ac || muted) return; tone(520, ac.currentTime, .12, 'triangle', .06, sfxGain, { slide: 380 }); },
    cdTick(last) { if (!ac || muted) return; tone(last ? 1200 : 800, ac.currentTime, .06, 'square', last ? .09 : .05, sfxGain); },
    sweep() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      noise(t, .9, .35, sfxGain, { type: 'highpass', freq: 300, sweep: 9000 });
      tone(110, t, .9, 'sawtooth', .12, sfxGain, { slide: 1500 }); tone(55, t, .6, 'sine', .35, sfxGain, { slide: 30 });
    },
    bonus() { if (!ac || muted) return; const t = ac.currentTime; [76, 79, 83, 88, 91].forEach((n, i) => tone(mtof(n), t + i * .06, .3, 'square', .07, sfxGain, { send: true })); },
    power(kind) {
      if (!ac || muted) return;
      const t = ac.currentTime;
      if (kind === 'reseed') { S.reseed(); return; }
      if (kind === 'ctrlz') { tone(mtof(84), t, .08, 'square', .07, sfxGain); tone(mtof(79), t + .08, .2, 'square', .07, sfxGain, { send: true }); return; }
      if (kind === 'defrag') { S.defrag(); return; }
      if (kind === 'dialup') { S.dialup(); return; }
      if (kind === 'save') { S.save(); return; }
      if (kind === 'heal') { [72, 76, 79, 84].forEach((n, i) => tone(mtof(n), t + i * .08, .4, 'sine', .12, sfxGain, { send: true })); return; }
      if (kind === 'double') { tone(mtof(83), t, .09, 'square', .08, sfxGain); tone(mtof(88), t + .09, .3, 'square', .08, sfxGain, { send: true }); return; }
      if (kind === 'warm') { noise(t, .6, .2, sfxGain, { type: 'bandpass', freq: 300, sweep: 3000, q: 1.5 }); tone(200, t, .5, 'sawtooth', .08, sfxGain, { slide: 900 }); return; }
      if (kind === 'freeze') { [96, 93, 89, 84].forEach((n, i) => tone(mtof(n), t + i * .04, .35, 'sine', .08, sfxGain, { send: true })); noise(t, .35, .1, sfxGain, { freq: 7000 }); return; }
      if (kind === 'boost') { tone(200, t, .7, 'sawtooth', .1, sfxGain, { slide: 2400 }); noise(t, .7, .15, sfxGain, { freq: 500, sweep: 10000 }); return; }
      if (kind === 'phase') { tone(mtof(76), t, .7, 'sine', .1, sfxGain, { slide: mtof(64), send: true }); tone(mtof(76) * 1.01, t, .7, 'triangle', .06, sfxGain, { slide: mtof(64), send: true }); return; }
      if (kind === 'rod') { noise(t, .12, .4, sfxGain, { freq: 2500 }); tone(1800, t, .25, 'sawtooth', .08, sfxGain, { slide: 200 }); return; }
      if (kind === 'eye') { [57, 64, 69].forEach(n => tone(mtof(n), t, 1.2, 'sine', .09, sfxGain, { attack: .5, send: true })); return; }
      if (kind === 'bloom') { [72, 76, 79, 84, 88].forEach((n, i) => tone(mtof(n), t + i * .06, .3, 'sine', .13, sfxGain, { send: true })); return; }
      if (kind === 'prism') { tone(1600, t, .35, 'sawtooth', .08, sfxGain, { slide: 300 }); tone(mtof(91), t + .15, .25, 'square', .06, sfxGain, { send: true }); return; }
      if (kind === 'chill') { tone(mtof(88), t, .5, 'sine', .12, sfxGain, { slide: mtof(72), send: true }); noise(t, .4, .08, sfxGain, { freq: 6000, sweep: 1500 }); return; }
      if (kind === 'shield') [72, 79, 84].forEach((n, i) => tone(mtof(n), t + i * .07, .3, 'triangle', .14, sfxGain, { send: true }));
      else if (kind === 'magnet') { tone(300, t, .5, 'sine', .14, sfxGain, { slide: 1000 }); tone(mtof(88), t + .3, .2, 'triangle', .1, sfxGain); }
      else if (kind === 'slow') { tone(900, t, .7, 'sine', .16, sfxGain, { slide: 140 }); noise(t, .5, .06, sfxGain, { type: 'lowpass', freq: 2000, sweep: 200 }); }
      else {
        noise(t, .7, .3, sfxGain, { freq: 300, sweep: 9000 });
        [60, 67, 72, 79, 84].forEach((n, i) => tone(mtof(n), t + .1 + i * .04, .5, 'sawtooth', .07, sfxGain, { send: true }));
        tone(90, t, .5, 'sine', .5, sfxGain, { slide: 30 });
      }
    },
    shieldBreak() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      noise(t, .25, .4, sfxGain, { freq: 3500 });
      tone(1400, t, .25, 'triangle', .12, sfxGain, { slide: 300 });
    },
    bossHit() {
      if (!ac || muted) return;
      tone(200, ac.currentTime, .09, 'square', .09, sfxGain, { slide: 90 });
    },
    bossDie() {
      if (!ac || muted) return;
      S.thunder(0); S.roar(true);
      const t = ac.currentTime;
      [84, 79, 72, 67, 60].forEach((n, i) => tone(mtof(n), t + .5 + i * .09, .4, 'triangle', .12, sfxGain, { send: true }));
    },
    over() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      [64, 60, 57, 45].forEach((n, i) => tone(mtof(n), t + i * .22, .4, 'triangle', .16, sfxGain, { send: true }));
    },
    start() {
      if (!ac || muted) return;
      const t = ac.currentTime;
      [57, 64, 69].forEach((n, i) => tone(mtof(n), t + i * .08, .25, 'triangle', .14, sfxGain, { send: true }));
    }
  };

  return {
    ...S,
    start() {
      init(); if (!ac) return;
      ac.resume();
      if (!running) {
        running = true; nextT = ac.currentTime + .1; step = 0; bar = 0;
        timer = setInterval(tick, 25);
      }
      ducked = false;
    },
    setD(v) { D = v; },
    edge(pan, kind) {                      // soft chime panned toward the strip where something just landed: 0 = orb, 1 = power-up, 2 = jackpot
      if (!ac || muted) return;
      const t = ac.currentTime; let dest = sfxGain;
      if (ac.createStereoPanner) { const pn = ac.createStereoPanner(); pn.pan.value = pan * .85; pn.connect(sfxGain); dest = pn; }
      (kind === 2 ? [88, 91, 95, 100] : kind === 1 ? [84, 88, 91] : [86, 91]).forEach((n, i) => tone(mtof(n), t + i * .07, .55, 'sine', kind === 2 ? .075 : .055, dest, { send: true }));
    },
    setStage(i) { style = i >= 4 ? i : i % 4; tr = 0; step = 0; bar = 0; },
    duck(b) { ducked = b; },
    toggle() {
      muted = !muted;
      if (ac) master.gain.setTargetAtTime(muted ? 0 : MASTER, ac.currentTime, .05);
      return muted;
    },
    visible(v) { if (!ac) return; v ? ac.resume() : ac.suspend(); },
    pulse() {
      if (!ac) return 0;
      const n = ac.currentTime; let b = -1;
      for (const x of beats) if (x <= n) b = x;
      return b < 0 ? 0 : Math.exp(-(n - b) * 6);
    }
  };
})();
