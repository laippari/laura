// Äänet: soittorasia soittaa joululauluja taustalla, ja luukuilla on omat äänensä. Kaikki syntetisoidaan
// selaimessa (Web Audio), joten äänitiedostoja ei ole eikä tekijänoikeuksia tarvitse miettiä: sävelmät ovat
// vanhoja ja vapaita. Selain sallii äänen vasta ensimmäisestä kosketuksesta, joten musiikki alkaa siitä.

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const freq = (name) => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  const semi = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
  return 440 * Math.pow(2, (semi - 69) / 12);
};

// Melodies as "note:beats" ("-" is a rest), a bass note for each bar, and the tempo in beats per minute.
const SONGS = [
  { // Kulkuset (Jingle Bells), kertosäe kahdesti
    bpm: 168, bar: 4, bells: true,
    tune: ('E5:1 E5:1 E5:2 E5:1 E5:1 E5:2 E5:1 G5:1 C5:1.5 D5:0.5 E5:4 ' +
      'F5:1 F5:1 F5:1.5 F5:0.5 F5:1 E5:1 E5:1 E5:0.5 E5:0.5 E5:1 D5:1 D5:1 E5:1 D5:2 G5:2 ' +
      'E5:1 E5:1 E5:2 E5:1 E5:1 E5:2 E5:1 G5:1 C5:1.5 D5:0.5 E5:4 ' +
      'F5:1 F5:1 F5:1.5 F5:0.5 F5:1 E5:1 E5:1 E5:0.5 E5:0.5 G5:1 G5:1 F5:1 D5:1 C5:4'),
    bass: 'C3 C3 C3 C3 F3 C3 D3 G2 C3 C3 C3 C3 F3 C3 G2 C3',
    times: 2,
  },
  { // We Wish You a Merry Christmas
    bpm: 150, bar: 3, pickup: 1,
    tune: 'D5:1 G5:1 G5:0.5 A5:0.5 G5:0.5 F#5:0.5 E5:1 E5:1 E5:1 A5:1 A5:0.5 B5:0.5 A5:0.5 G5:0.5 F#5:1 D5:1 D5:1 ' +
      'B5:1 B5:0.5 C6:0.5 B5:0.5 A5:0.5 G5:1 E5:1 D5:0.5 D5:0.5 E5:1 A5:1 F#5:1 G5:3',
    bass: 'G2 C3 A2 D3 B2 C3 D3 G2',
    times: 2,
  },
  { // Jouluyö, juhlayö (Stille Nacht)
    bpm: 210, bar: 6,
    tune: 'G5:3 A5:1 G5:2 E5:6 G5:3 A5:1 G5:2 E5:6 D6:4 D6:2 B5:6 C6:4 C6:2 G5:6 ' +
      'A5:4 A5:2 C6:3 B5:1 A5:2 G5:3 A5:1 G5:2 E5:6 A5:4 A5:2 C6:3 B5:1 A5:2 G5:3 A5:1 G5:2 E5:6 ' +
      'D6:4 D6:2 F6:3 D6:1 B5:2 C6:6 E6:6 C6:3 G5:1 E5:2 G5:3 F5:1 D5:2 C5:12',
    bass: 'C3 C3 C3 C3 G2 G2 C3 C3 F2 F2 C3 C3 F2 F2 C3 C3 G2 G2 C3 C3 C3 G2 C3 C3',
    times: 1,
  },
];

export function createSound({ storageKey }) {
  let ctx = null, master = null, musicBus = null, fxBus = null, reverb = null, timer = 0;
  let muted = false;
  try { muted = localStorage.getItem(storageKey + '-mute') === '1'; } catch (e) { /* ignore */ }

  function setup() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    // iOS: play even with the ring/silent switch off, like music does
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    // a gentle limiter, so that chords and the reverb never clip on small phone speakers
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -10;
    limit.ratio.value = 6;
    master.connect(limit).connect(ctx.destination);
    // a small room: decaying noise as the impulse response
    reverb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    reverb.connect(wet).connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.2;
    fxBus = ctx.createGain();
    fxBus.gain.value = 0.42;
    for (const bus of [musicBus, fxBus]) { bus.connect(master); bus.connect(reverb); }
    return true;
  }

  // A music-box tine: a sine with a few bell-like partials and a quick bright attack.
  function tine(f, at, { gain = 1, decay = 1.6, out = musicBus } = {}) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, at + decay);
    g.connect(out);
    for (const [mul, amp, dec] of [[1, 1, 1], [2.0, 0.28, 0.45], [3.01, 0.12, 0.25], [5.43, 0.06, 0.12]]) {
      const o = ctx.createOscillator(), a = ctx.createGain();
      o.frequency.value = f * mul;
      a.gain.setValueAtTime(amp, at);
      a.gain.exponentialRampToValueAtTime(0.0005, at + decay * dec);
      o.connect(a).connect(g);
      o.start(at);
      o.stop(at + decay + 0.05);
    }
  }

  function noiseBurst(at, { gain = 0.1, dur = 0.06, hp = 6000, out = musicBus } = {}) {
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf;
    f.type = 'highpass';
    f.frequency.value = hp;
    g.gain.value = gain;
    src.connect(f).connect(g).connect(out);
    src.start(at);
  }

  // ---------- music: a look-ahead scheduler that walks through the songs and loops ----------
  const queue = [];
  function enqueueSongs(t) {
    for (const song of SONGS) {
      const spb = 60 / song.bpm;
      const notes = song.tune.trim().split(/\s+/).map((s) => { const [n, b] = s.split(':'); return [n, +b]; });
      const bass = song.bass.split(/\s+/);
      for (let r = 0; r < song.times; r++) {
        let beat = 0;
        for (const [n, b] of notes) {
          if (n !== '-') queue.push({ at: t + beat * spb, f: freq(n), gain: 0.85, decay: Math.min(2.4, 0.9 + b * spb * 1.4) });
          beat += b;
        }
        const pick = song.pickup || 0;
        bass.forEach((n, i) => {
          const at = t + (pick + i * song.bar) * spb;
          queue.push({ at, f: freq(n), gain: 0.55, decay: 2.2 });
          if (song.bar === 4) queue.push({ at: at + 2 * spb, f: freq(n) * 1.5, gain: 0.32, decay: 1.6 });
        });
        if (song.bells) for (let k = 0; k < beat; k++) queue.push({ at: t + k * spb, bell: true });
        t += beat * spb;
      }
      t += 2.2; // a breath between the songs
    }
    queue.sort((a, b) => a.at - b.at);
    return t;
  }
  let end = 0;
  function pump() {
    if (!ctx || ctx.state !== 'running') return;
    const horizon = ctx.currentTime + 0.4;
    if (end - ctx.currentTime < 4) end = enqueueSongs(Math.max(end, ctx.currentTime + 0.2));
    while (queue.length && queue[0].at < horizon) {
      const ev = queue.shift();
      if (ev.at < ctx.currentTime - 0.05) continue;
      if (ev.bell) noiseBurst(ev.at, { gain: 0.05, dur: 0.05, hp: 7500 });
      else tine(ev.f, ev.at, ev);
    }
  }

  function start() {
    if (!ctx && !setup()) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    if (!timer) timer = setInterval(pump, 100);
  }
  // the browser allows sound only from a touch or a click: try on each one until it runs
  const unlock = () => { start(); if (ctx && ctx.state === 'running') for (const e of EVENTS) removeEventListener(e, unlock, true); };
  const EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
  for (const e of EVENTS) addEventListener(e, unlock, true);

  // quiet while the page is hidden, and back when it returns
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else ctx.resume().catch(() => {});
  });

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem(storageKey + '-mute', m ? '1' : '0'); } catch (e) { /* ignore */ }
    if (!ctx) start();
    if (ctx) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.08);
  }

  // ---------- effects ----------
  const ready = () => ctx && ctx.state === 'running';
  // a door opens: a soft wooden knock, then a sparkling run of bells upwards
  function open() {
    if (!ready()) return;
    const t = ctx.currentTime + 0.02;
    knock(t, 0.7);
    musicBus.gain.setTargetAtTime(0.08, t, 0.15); // the music steps back for a moment
    musicBus.gain.setTargetAtTime(0.2, t + 3.2, 0.8);
    ['C6', 'E6', 'G6', 'C7', 'E7', 'G7', 'C8'].forEach((n, i) => tine(freq(n), t + 0.32 + i * 0.07, { gain: 0.6 - i * 0.05, decay: 1.8, out: fxBus }));
    for (let i = 0; i < 10; i++) noiseBurst(t + 0.35 + Math.random() * 0.9, { gain: 0.05, dur: 0.03, hp: 9000, out: fxBus });
  }
  // the photo of what the door held arrives: one warm chord
  function reveal() {
    if (!ready()) return;
    const t = ctx.currentTime + 0.02;
    ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => tine(freq(n), t + i * 0.025, { gain: 0.45, decay: 2.6, out: fxBus }));
  }
  // a door that may not be opened yet: two wooden taps and a playful little "uh-uh"
  function locked() {
    if (!ready()) return;
    const t = ctx.currentTime + 0.01;
    knock(t, 0.9);
    knock(t + 0.13, 0.6);
    tine(freq('E6'), t + 0.32, { gain: 0.35, decay: 0.6, out: fxBus });
    tine(freq('C6'), t + 0.48, { gain: 0.35, decay: 0.8, out: fxBus });
  }
  function knock(at, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(220, at);
    o.frequency.exponentialRampToValueAtTime(90, at + 0.08);
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
    o.connect(g).connect(fxBus);
    o.start(at);
    o.stop(at + 0.15);
    noiseBurst(at, { gain: gain * 0.25, dur: 0.02, hp: 2500, out: fxBus });
  }
  // the door closes
  function close() {
    if (!ready()) return;
    const t = ctx.currentTime + 0.02;
    tine(freq('G5'), t, { gain: 0.3, decay: 0.9, out: fxBus });
    tine(freq('C5'), t + 0.1, { gain: 0.3, decay: 1.2, out: fxBus });
  }

  return { start, setMuted, get muted() { return muted; }, open, reveal, locked, close };
}
