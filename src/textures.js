// Proseduraaliset tekstuurit: puu (ovet ja runko), numerot ja pehmeät hehkut. Ei kuvatiedostoja.
import * as THREE from 'three';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function valueNoise(seed) {
  const r = rng(seed), N = 256, tab = new Float32Array(N * N);
  for (let i = 0; i < tab.length; i++) tab[i] = r();
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = s(x - xi), fy = s(y - yi);
    const x0 = xi & 255, x1 = (xi + 1) & 255, y0 = (yi & 255) * N, y1 = ((yi + 1) & 255) * N;
    const a = tab[y0 + x0], b = tab[y0 + x1], c = tab[y1 + x0], d = tab[y1 + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

// Grain runs along the canvas y axis. Returns values 0..1 (dark latewood lines are low).
function woodField(size, seed) {
  const n = valueNoise(seed), out = new Float32Array(size * size), k = 768 / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const X = x * k, Y = y * k;
      const warp = (n(X * 0.004, Y * 0.0016) * 2 - 1) * 74 + (n(X * 0.013 + 40, Y * 0.004) * 2 - 1) * 16;
      const ring = 0.5 + 0.5 * Math.sin((X + warp) * 0.21);
      const line = Math.pow(1 - ring, 3);
      const fiber = n(X * 0.85, Y * 0.011) - 0.5;
      const fiber2 = n(X * 2.3 + 100, Y * 0.04) - 0.5;
      const broad = n(X * 0.0045 + 7, Y * 0.003 + 3) - 0.5;
      out[y * size + x] = 0.62 - 0.27 * line + 0.2 * fiber + 0.12 * fiber2 + 0.34 * broad;
    }
  }
  return out;
}

function fieldTexture(field, size, dark, light) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d'), img = ctx.createImageData(size, size), d = img.data;
  for (let i = 0; i < field.length; i++) {
    const v = Math.min(1, Math.max(0, field[i]));
    d[i * 4] = dark[0] + (light[0] - dark[0]) * v;
    d[i * 4 + 1] = dark[1] + (light[1] - dark[1]) * v;
    d[i * 4 + 2] = dark[2] + (light[2] - dark[2]) * v;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function radialTexture(stops, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d'), g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// One sheet with all 24 door faces: a fine routed line and the number, both burned into the wood. 4 columns x 6 rows, day d at cell d-1.
function numberAtlas(font) {
  const S = 256, c = document.createElement('canvas');
  c.width = S * 4;
  c.height = S * 6;
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (let day = 1; day <= 24; day++) {
    const x = ((day - 1) % 4) * S, y = Math.floor((day - 1) / 4) * S;
    // a routed line near the edge, burned dark like the number
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,240,215,0.22)';
    ctx.strokeRect(x + 23.2, y + 23.4, S - 44, S - 44);
    ctx.strokeStyle = 'rgba(52,28,12,0.62)';
    ctx.strokeRect(x + 22, y + 22, S - 44, S - 44);
    if (day === 24) ctx.strokeRect(x + 30, y + 30, S - 60, S - 60);
    // number
    ctx.font = `600 128px ${font}`;
    const m = ctx.measureText(String(day));
    const by = y + S / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    ctx.fillStyle = 'rgba(255,240,215,0.3)';
    ctx.fillText(String(day), x + S / 2 + 1.2, by + 1.6);
    ctx.fillStyle = 'rgba(46,24,10,0.94)';
    ctx.fillText(String(day), x + S / 2, by);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Light spilling from around a door: a soft ring along its edges. `frac` is the door's share of the plane.
function auraTexture(frac) {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d'), a = (S * (1 - frac)) / 2, w = S * frac;
  ctx.strokeStyle = 'rgba(255,214,150,0.9)';
  ctx.shadowColor = 'rgba(255,176,90,1)';
  for (const [blur, lw] of [[34, 5], [16, 4], [6, 2.5]]) {
    ctx.shadowBlur = blur;
    ctx.lineWidth = lw;
    ctx.strokeRect(a, a, w, w);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function backgroundTexture() {
  const W = 512, H = 1024, c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a1622');
  g.addColorStop(0.55, '#0c1a24');
  g.addColorStop(1, '#060b10');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, H * 0.62);
  r.addColorStop(0, 'rgba(58,84,104,0.55)');
  r.addColorStop(0.5, 'rgba(30,48,64,0.25)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
  // a little grain against banding
  const img = ctx.getImageData(0, 0, W, H), d = img.data, rnd = rng(5);
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 5;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeTextures({ phone, numberFont }) {
  const size = phone ? 512 : 768;
  const fieldA = woodField(size, 11), fieldB = woodField(size, 29);
  const oak = fieldTexture(fieldA, size, [150, 104, 60], [224, 186, 138]);
  const walnut = fieldTexture(fieldB, size, [44, 25, 14], [104, 66, 38]);
  oak.colorSpace = walnut.colorSpace = THREE.SRGBColorSpace;
  const oakBump = fieldTexture(fieldA, size, [0, 0, 0], [255, 255, 255]);
  const walnutBump = fieldTexture(fieldB, size, [0, 0, 0], [255, 255, 255]);
  return {
    oak, walnut, oakBump, walnutBump,
    numbers: numberAtlas(numberFont),
    background: backgroundTexture(),
    aura: auraTexture(0.6),
    soft: radialTexture([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]),
    nicheGlow: radialTexture([[0, '#fff0cf'], [0.45, '#f0a956'], [1, '#6b2f10']], 256),
  };
}
