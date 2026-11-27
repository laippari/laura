// Paperikuvat: valkokehyksiset valokuvat. Aloituksessa ne liukuvat isoina näkymän läpi ja asettuvat sitten
// otsikon ympärille reunoille; kalenteriin siirryttäessä ne lentävät pois ja leijailevat läjään kaapin luo.
import * as THREE from 'three';
import { rng } from './textures.js';

const FALL = 1.9, STAGGER = 0.07, Z = -1.7;

// Where the photos rest around the title: [x, y, size] in shares of the view's half width and half height,
// the most prominent places first. Upright screens: above and below the title. Wide screens: on both sides of it.
const FRAME_TALL = [
  [-0.56, -0.74, 1.95], [0.6, 0.72, 1.9], [0.62, -0.62, 1.7], [-0.6, 0.66, 1.75], [0.02, 0.9, 1.45], [0.0, -0.93, 1.45],
  [-0.16, 0.56, 1.2], [0.2, -0.54, 1.2], [0.74, 0.45, 1.15], [-0.78, -0.45, 1.15], [-0.8, 0.41, 1.1], [0.84, -0.39, 1.05],
  [-1.0, 0.98, 1.3], [1.0, -0.98, 1.3], [1.02, 1.0, 1.2],
];
const FRAME_WIDE = [
  [-0.6, -0.12, 1.9], [0.62, 0.1, 1.9], [0.86, -0.56, 1.7], [-0.86, 0.5, 1.7], [-0.84, -0.66, 1.5], [0.84, 0.66, 1.5],
  [-0.56, 0.74, 1.35], [0.56, -0.78, 1.35], [-0.36, -0.8, 1.2], [0.36, 0.82, 1.2], [-1.0, -0.08, 1.3], [1.0, 0.04, 1.3],
  [-0.3, 0.86, 1.1], [0.14, -0.9, 1.05], [-0.06, 0.92, 1.0],
];

export function buildPhotos(scene, tex, list) {
  const group = new THREE.Group(), rnd = rng(19), loader = new THREE.TextureLoader();
  scene.add(group);
  const paper = new THREE.MeshStandardMaterial({ color: '#f7f2e8', roughness: 0.75 });
  const frameGeo = new THREE.BoxGeometry(1, 1.19, 0.012), picGeo = new THREE.PlaneGeometry(0.86, 0.86);
  const shadeGeo = new THREE.PlaneGeometry(1.5, 1.7);
  const shadeMat = new THREE.MeshBasicMaterial({ map: tex.soft, color: '#000000', transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false });
  const n = list.length;

  const photos = list.map((src, i) => {
    const g = new THREE.Group();
    const pic = new THREE.Mesh(picGeo, new THREE.MeshBasicMaterial({ color: '#d8cfc0', toneMapped: false }));
    pic.position.set(0, 0.095, 0.0065);
    loader.load(src, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      pic.material.map = t;
      pic.material.color.set('#f4f0ec');
      pic.material.needsUpdate = true;
    });
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.set(0.05, -0.07, -0.012);
    g.add(new THREE.Mesh(frameGeo, paper), pic, shade);
    g.visible = false;
    group.add(g);
    return {
      g, i, k: n - 1 - i, // k: order of appearance, the last photos in the list come first
      u: rnd(), v: rnd(), side: i % 2 ? 1 : -1, rz: (rnd() - 0.5) * 0.9, ph: rnd() * 6.28, drift: 0.8 + rnd() * 1.2,
      spin: (rnd() - 0.5) * 3, pile: new THREE.Vector3(), rest: new THREE.Vector3(), restSize: 1, away: new THREE.Vector3(),
    };
  });

  let view = { tall: true, hw: 3, hh: 6.5, cy: 0 }, pileSize = 1.2;
  let mode = 'hidden', t0 = 0;

  function layout(v) {
    view = v;
    pileSize = v.tall ? 1.2 : 1.3;
    const slots = v.tall ? FRAME_TALL : FRAME_WIDE;
    for (const o of photos) {
      const z = Z + o.i * 0.035;
      // the heap by the cabinet: under it on upright screens, beside its foot on wide ones
      if (v.tall) o.pile.set((o.u - 0.5) * 4.5, -4.5 + (o.v - 0.5) * 1.05, z);
      else o.pile.set(o.side * (3.5 + o.u * 3.9), -2.9 + (o.v - 0.5) * 2.2, z);
      const s = slots[o.k % slots.length];
      o.rest.set(s[0] * v.hw, v.cy + s[1] * v.hh, z);
      o.restSize = s[2] * (v.tall ? 1 : 1.25);
      o.away.set(s[0], s[1], 0).normalize().multiplyScalar(Math.hypot(v.hw, v.hh) + 3).add(new THREE.Vector3(0, v.cy, z));
    }
  }

  const start = (m) => (t) => { mode = m; t0 = t; };
  const duration = () => n * STAGGER + FALL;

  function update(dt, t) {
    if (mode === 'hidden') return;
    const e = t - t0, v = view;
    for (const o of photos) {
      const g = o.g;
      if (mode === 'parade') {
        // a loose column of big photos gliding down through the view, evenly spaced
        const cols = v.tall ? [-0.44, 0.44] : [-0.72, 0.24, -0.24, 0.72], gap = v.tall ? 1.75 : 1.15, size = v.tall ? 2.35 : 2.7;
        // once through, a photo waits just below the view, so that it has a short way to its place by the title
        const y = Math.max(v.cy - v.hh - size, v.cy + v.hh + size * 0.75 + o.k * gap - e * 3.1);
        g.visible = y > v.cy - v.hh - size;
        g.position.set(cols[o.k % cols.length] * v.hw + Math.sin(t * 0.9 + o.ph) * 0.22, y, Z + o.i * 0.035);
        g.rotation.set(Math.sin(t * 1.1 + o.ph) * 0.12, Math.cos(t * 0.8 + o.ph) * 0.16, o.rz * 0.35 + Math.sin(t * 0.7 + o.ph) * 0.06);
        g.scale.setScalar(size);
      } else if (mode === 'frame' || mode === 'exit') {
        const to = mode === 'frame' ? o.rest : o.away, late = Math.max(0, e - o.k * (mode === 'frame' ? 0.05 : 0.025));
        const k = late > 0 ? 1 - Math.exp(-dt * (mode === 'frame' ? 2.6 : 3.4)) : 0;
        g.visible = true;
        g.position.lerp(to, k);
        g.position.y += Math.sin(t * 0.9 + o.ph) * 0.0025; // a slight drift, so the photos never sit quite still
        g.scale.setScalar(g.scale.x + (o.restSize - g.scale.x) * k);
        const rz = mode === 'frame' ? o.rz * 0.55 + Math.sin(t * 0.6 + o.ph) * 0.035 : o.rz + o.spin;
        g.rotation.set(g.rotation.x * (1 - k), g.rotation.y * (1 - k), g.rotation.z + (rz - g.rotation.z) * k);
      } else if (mode === 'drop') {
        const p = Math.min(1, (e - o.i * STAGGER) / FALL);
        if (p <= 0) { g.visible = false; continue; }
        g.visible = true;
        g.scale.setScalar(pileSize);
        if (p < 1) {
          const left = 1 - p, fall = 1 - left * left;
          g.position.set(
            o.pile.x + Math.sin(p * Math.PI * 2.6 + o.ph) * o.drift * left,
            THREE.MathUtils.lerp(o.pile.y + 15, o.pile.y, fall),
            o.pile.z + 1.2 * left,
          );
          g.rotation.set(Math.sin(p * 9 + o.ph) * 0.9 * left, Math.cos(p * 7 + o.ph) * 0.8 * left, o.rz + o.spin * left);
        } else {
          g.position.lerp(o.pile, 1 - Math.exp(-dt * 6));
          g.rotation.set(0, 0, o.rz);
        }
      }
    }
  }
  return { layout, parade: start('parade'), frame: start('frame'), exit: start('exit'), drop: start('drop'), duration, update };
}
