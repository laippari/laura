// Äänet: soittorasia soittaa joululauluja taustalla (Deck the Halls, Kulkuset, We Wish You a Merry Christmas,
// Jouluyö, juhlayö), ja luukuilla on omat äänensä.
//
// Kaikki syntetisoidaan selaimessa, joten äänitiedostoja ei ole: sävelmät ovat vanhoja ja vapaita. Äänet
// "nauhoitetaan" heti latauksen jälkeen valmiiksi (OfflineAudioContext) WAV-muotoon. Musiikki soi tavallisella
// audio-elementillä, koska iPhone soittaa sen myös äänettömällä ja hyväksyy sen napautuksesta varmimmin; luukkujen
// äänet soivat Web Audiolla, ja jos se on estetty, audio-elementeillä.

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const freq = (name) => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  const semi = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
  return 440 * Math.pow(2, (semi - 69) / 12);
};

// Melodies as "note:beats", a bass note for each bar, and the tempo in beats per minute.
const SONGS = [
  { // Deck the Halls (fa-la-la-la-la), reipas aloitus
    bpm: 160, bar: 4, bells: true, times: 2,
    tune: 'G5:1.5 F5:0.5 E5:1 D5:1 C5:1 D5:1 E5:1 C5:1 D5:0.5 E5:0.5 F5:0.5 D5:0.5 E5:1.5 D5:0.5 C5:1 B4:1 C5:2 ' +
      'G5:1.5 F5:0.5 E5:1 D5:1 C5:1 D5:1 E5:1 C5:1 D5:0.5 E5:0.5 F5:0.5 D5:0.5 E5:1.5 D5:0.5 C5:1 B4:1 C5:2 ' +
      'D5:1.5 E5:0.5 F5:1 D5:1 E5:1.5 F5:0.5 G5:1 D5:1 E5:0.5 F#5:0.5 G5:1 A5:0.5 B5:0.5 C6:1 B5:1 A5:1 G5:2 ' +
      'G5:1.5 F5:0.5 E5:1 D5:1 C5:1 D5:1 E5:1 C5:1 A5:0.5 A5:0.5 A5:0.5 A5:0.5 G5:1.5 F5:0.5 E5:1 D5:1 C5:2',
    bass: 'C3 C3 G2 C3 C3 C3 G2 C3 G2 C3 D3 G2 C3 C3 F2 C3',
  },
  { // Kulkuset (Jingle Bells), kertosäe kahdesti
    bpm: 168, bar: 4, bells: true, times: 2,
    tune: 'E5:1 E5:1 E5:2 E5:1 E5:1 E5:2 E5:1 G5:1 C5:1.5 D5:0.5 E5:4 ' +
      'F5:1 F5:1 F5:1.5 F5:0.5 F5:1 E5:1 E5:1 E5:0.5 E5:0.5 E5:1 D5:1 D5:1 E5:1 D5:2 G5:2 ' +
      'E5:1 E5:1 E5:2 E5:1 E5:1 E5:2 E5:1 G5:1 C5:1.5 D5:0.5 E5:4 ' +
      'F5:1 F5:1 F5:1.5 F5:0.5 F5:1 E5:1 E5:1 E5:0.5 E5:0.5 G5:1 G5:1 F5:1 D5:1 C5:4',
    bass: 'C3 C3 C3 C3 F3 C3 D3 G2 C3 C3 C3 C3 F3 C3 G2 C3',
  },
  { // We Wish You a Merry Christmas
    bpm: 150, bar: 3, pickup: 1, times: 2,
    tune: 'D5:1 G5:1 G5:0.5 A5:0.5 G5:0.5 F#5:0.5 E5:1 E5:1 E5:1 A5:1 A5:0.5 B5:0.5 A5:0.5 G5:0.5 F#5:1 D5:1 D5:1 ' +
      'B5:1 B5:0.5 C6:0.5 B5:0.5 A5:0.5 G5:1 E5:1 D5:0.5 D5:0.5 E5:1 A5:1 F#5:1 G5:3',
    bass: 'G2 C3 A2 D3 B2 C3 D3 G2',
  },
  { // Jouluyö, juhlayö (Stille Nacht)
    bpm: 210, bar: 6, times: 1,
    tune: 'G5:3 A5:1 G5:2 E5:6 G5:3 A5:1 G5:2 E5:6 D6:4 D6:2 B5:6 C6:4 C6:2 G5:6 ' +
      'A5:4 A5:2 C6:3 B5:1 A5:2 G5:3 A5:1 G5:2 E5:6 A5:4 A5:2 C6:3 B5:1 A5:2 G5:3 A5:1 G5:2 E5:6 ' +
      'D6:4 D6:2 F6:3 D6:1 B5:2 C6:6 E6:6 C6:3 G5:1 E5:2 G5:3 F5:1 D5:2 C5:12',
    bass: 'C3 C3 C3 C3 G2 G2 C3 C3 F2 F2 C3 C3 F2 F2 C3 C3 G2 G2 C3 C3 C3 G2 C3 C3',
  },
];

// Every note of one song, and its length with a breath after it.
function songEvents(song) {
  const ev = [], spb = 60 / song.bpm;
  const notes = song.tune.trim().split(/\s+/).map((x) => { const [n, b] = x.split(':'); return [n, +b]; });
  const bass = song.bass.split(/\s+/);
  let t = 0.1;
  for (let r = 0; r < song.times; r++) {
    let beat = 0;
    for (const [n, b] of notes) {
      ev.push({ at: t + beat * spb, f: freq(n), gain: 0.85, decay: Math.min(2.4, 0.9 + b * spb * 1.4) });
      beat += b;
    }
    bass.forEach((n, i) => {
      const at = t + ((song.pickup || 0) + i * song.bar) * spb;
      ev.push({ at, f: freq(n), gain: 0.55, decay: 2.2 });
      if (song.bar === 4) ev.push({ at: at + 2 * spb, f: freq(n) * 1.5, gain: 0.32, decay: 1.6 });
    });
    if (song.bells) for (let k = 0; k < beat; k++) ev.push({ at: t + k * spb, bell: true });
    t += beat * spb;
  }
  return { ev, length: t + 2.4 }; // a breath before the next song
}

// ---------- synthesis, into any audio context (here: offline ones) ----------

function room(ctx, out, wetGain) {
  const rev = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  rev.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = wetGain;
  rev.connect(wet).connect(out);
  const dry = ctx.createGain();
  dry.connect(out);
  dry.connect(rev);
  return dry;
}

// A music-box tine: a sine with a few bell-like partials and a quick bright attack.
function tine(ctx, out, f, at, { gain = 1, decay = 1.6 } = {}) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0008, at + decay);
  g.connect(out);
  for (const [mul, amp, dec] of [[1, 1, 1], [2.0, 0.28, 0.45], [3.01, 0.12, 0.25], [5.43, 0.06, 0.12]]) {
    if (f * mul > ctx.sampleRate * 0.45) continue;
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.frequency.value = f * mul;
    a.gain.setValueAtTime(amp, at);
    a.gain.exponentialRampToValueAtTime(0.0005, at + decay * dec);
    o.connect(a).connect(g);
    o.start(at);
    o.stop(at + decay + 0.05);
  }
}

function noise(ctx, out, at, { gain = 0.1, dur = 0.06, hp = 6000 } = {}) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf;
  f.type = 'highpass';
  f.frequency.value = Math.min(hp, ctx.sampleRate * 0.45);
  g.gain.value = gain;
  src.connect(f).connect(g).connect(out);
  src.start(at);
}

function knock(ctx, out, at, gain) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(220, at);
  o.frequency.exponentialRampToValueAtTime(90, at + 0.08);
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + 0.15);
  noise(ctx, out, at, { gain: gain * 0.25, dur: 0.02, hp: 2500 });
}

const EFFECTS = {
  // a door opens: a soft wooden knock, then a sparkling run of bells upwards
  open: [3.4, (c, o) => {
    knock(c, o, 0.02, 0.7);
    ['C6', 'E6', 'G6', 'C7', 'E7', 'G7', 'C8'].forEach((n, i) => tine(c, o, freq(n), 0.34 + i * 0.07, { gain: 0.6 - i * 0.05, decay: 1.8 }));
    for (let i = 0; i < 10; i++) noise(c, o, 0.37 + i * 0.09, { gain: 0.05, dur: 0.03, hp: 9000 });
  }],
  // what the door held arrives: one warm chord
  reveal: [3.2, (c, o) => ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => tine(c, o, freq(n), 0.02 + i * 0.025, { gain: 0.45, decay: 2.6 }))],
  // the door closes
  close: [1.8, (c, o) => { tine(c, o, freq('G5'), 0.02, { gain: 0.3, decay: 0.9 }); tine(c, o, freq('C5'), 0.12, { gain: 0.3, decay: 1.2 }); }],
  // a door that may not be opened yet: two wooden taps and a playful little "uh-uh"
  locked: [1.8, (c, o) => {
    knock(c, o, 0.01, 0.9);
    knock(c, o, 0.14, 0.6);
    tine(c, o, freq('E6'), 0.33, { gain: 0.35, decay: 0.6 });
    tine(c, o, freq('C6'), 0.49, { gain: 0.35, decay: 0.8 });
  }],
};

async function render(seconds, rate, draw, peak) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new OAC(1, Math.ceil(seconds * rate), rate);
  draw(ctx, room(ctx, ctx.destination, 0.3));
  const buf = await new Promise((resolve, reject) => {
    ctx.oncomplete = (e) => resolve(e.renderedBuffer); // older Safari answers only this way
    const p = ctx.startRendering();
    if (p && p.then) p.then(resolve, reject);
  });
  // the same loudness whatever the mix: scale to the wanted peak
  const d = buf.getChannelData(0);
  let max = 0;
  for (let i = 0; i < d.length; i++) max = Math.max(max, Math.abs(d[i]));
  if (max > 0) for (let i = 0; i < d.length; i++) d[i] *= peak / max;
  return buf;
}

// 16-bit mono WAV
function wav(buf) {
  const d = buf.getChannelData(0), n = d.length, out = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * 2, true);
  out.setUint16(32, 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
  return URL.createObjectURL(new Blob([out], { type: 'audio/wav' }));
}

// a moment of silence, to wake an audio element up inside a tap
function silence() {
  const n = 800, out = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, 8000, true); out.setUint32(28, 16000, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  str(36, 'data'); out.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([out], { type: 'audio/wav' }));
}

export function createSound({ storageKey }) {
  let muted = false, wanted = false, ctx = null;
  try { muted = localStorage.getItem(storageKey + '-mute') === '1'; } catch (e) { /* ignore */ }
  // iOS: play like music, also with the ring/silent switch off
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }

  const music = new Audio();
  music.preload = 'auto';
  music.setAttribute('playsinline', '');
  const VOL = 0.85;
  music.volume = VOL;
  const songs = [], quiet = silence(), fxBuf = {}, fxUrl = {};
  let song = 0; // the one playing

  // Record everything as soon as the page is up: the first song first, so that it is ready by her first tap, then
  // the door sounds, then the other songs. The songs play one after another and start over.
  const recordSong = async (i) => {
    const { ev, length } = songEvents(SONGS[i]);
    const buf = await render(length, 24000, (c, o) => {
      for (const e of ev) {
        if (e.bell) noise(c, o, e.at, { gain: 0.05, dur: 0.05, hp: 7500 });
        else tine(c, o, e.f, e.at, e);
      }
    }, 0.6);
    songs[i] = wav(buf);
    if (i === 0 && wanted && !muted && !document.hidden) playMusic();
  };
  setTimeout(async () => {
    try {
      await recordSong(0);
      for (const [name, [len, draw]] of Object.entries(EFFECTS)) {
        fxBuf[name] = await render(len, 44100, draw, 0.85);
        fxUrl[name] = wav(fxBuf[name]);
      }
      for (let i = 1; i < SONGS.length; i++) await recordSong(i);
    } catch (e) { console.warn('sound', e); }
  }, 50);

  function playMusic() {
    const src = songs[song] || quiet; // until the music is ready, silence keeps the element awake
    if (music.src !== src) music.src = src;
    const p = music.play();
    if (p && p.catch) p.catch(() => {});
  }
  music.addEventListener('ended', () => {
    if (music.src === quiet) return;
    do song = (song + 1) % SONGS.length; while (!songs[song]);
    if (wanted && !muted && !document.hidden) playMusic();
  });

  // Sound may only start from a tap. Inside each tap until it all works: wake the audio element, and the Web Audio
  // context with a silent sound, which is what iOS asks for.
  function unlock() {
    wanted = true;
    if (!muted) playMusic();
    try {
      if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
      if (ctx) {
        if (ctx.state !== 'running') ctx.resume().catch(() => {});
        const s = ctx.createBufferSource();
        s.buffer = ctx.createBuffer(1, 1, 22050);
        s.connect(ctx.destination);
        s.start(0);
      }
    } catch (e) { /* ignore */ }
    if (songs[0] && !music.paused && ctx && ctx.state === 'running') for (const e of EVENTS) removeEventListener(e, unlock, true);
  }
  const EVENTS = ['touchend', 'click', 'pointerup', 'keydown'];
  for (const e of EVENTS) addEventListener(e, unlock, true);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) music.pause();
    else if (wanted && !muted) playMusic();
  });

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem(storageKey + '-mute', m ? '1' : '0'); } catch (e) { /* ignore */ }
    if (m) music.pause();
    else { wanted = true; playMusic(); }
  }

  let duck = 0;
  function fx(name) {
    if (muted || !wanted) return;
    // the music steps back for a moment, where the browser lets a page change the volume
    music.volume = VOL * 0.35;
    clearTimeout(duck);
    duck = setTimeout(() => { music.volume = VOL; }, 2600);
    if (ctx && ctx.state === 'running' && fxBuf[name]) {
      const s = ctx.createBufferSource();
      s.buffer = fxBuf[name];
      s.connect(ctx.destination);
      s.start();
    } else if (fxUrl[name]) {
      const p = new Audio(fxUrl[name]).play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  return {
    setMuted, get muted() { return muted; },
    open: () => fx('open'), reveal: () => fx('reveal'), close: () => fx('close'), locked: () => fx('locked'),
    get ready() { return !!songs[0]; }, get playing() { return !music.paused && music.src !== quiet; },
  };
}
