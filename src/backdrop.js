// Tausta: talvi-illan sininen, lumisade ja kaukaiset lämpimät valot.
import * as THREE from 'three';
import { rng } from './textures.js';

export function buildBackdrop(scene, tex, { phone }) {
  scene.background = tex.background;
  const rnd = rng(77);

  // distant lights, out of focus
  const lights = [];
  const palette = ['#ffc98a', '#ffb060', '#ffe2b8', '#ff9a6a', '#ffd9a0'];
  for (let i = 0; i < 26; i++) {
    const mat = new THREE.SpriteMaterial({
      map: tex.soft, color: palette[i % palette.length], transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.1,
    });
    const s = new THREE.Sprite(mat);
    s.position.set((rnd() - 0.5) * 34, (rnd() - 0.5) * 26, -9 - rnd() * 9);
    const size = 1.1 + rnd() * 2.6;
    s.scale.set(size, size, 1);
    scene.add(s);
    lights.push({ s, base: 0.08 + rnd() * 0.2, f: 0.3 + rnd() * 0.7, p: rnd() * 6.28, x: s.position.x, y: s.position.y });
  }

  // snow
  const N = phone ? 220 : 360, box = { x: 22, y: 20, z0: -9, z1: 7 };
  const pos = new Float32Array(N * 3), meta = [];
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (rnd() - 0.5) * box.x;
    pos[i * 3 + 1] = (rnd() - 0.5) * box.y;
    pos[i * 3 + 2] = box.z0 + rnd() * (box.z1 - box.z0);
    meta.push({ v: 0.22 + rnd() * 0.42, f: 0.3 + rnd() * 0.8, p: rnd() * 6.28, a: 0.1 + rnd() * 0.3 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const snow = new THREE.Points(geo, new THREE.PointsMaterial({
    map: tex.soft, size: 0.13, sizeAttenuation: true, transparent: true, opacity: 0.75, depthWrite: false, color: '#eaf2ff',
  }));
  snow.frustumCulled = false;
  scene.add(snow);

  function update(dt, t) {
    for (const l of lights) {
      l.s.material.opacity = l.base * (0.75 + 0.25 * Math.sin(t * l.f + l.p));
      l.s.position.x = l.x + Math.sin(t * 0.07 + l.p) * 0.5;
      l.s.position.y = l.y + Math.cos(t * 0.05 + l.p) * 0.35;
    }
    for (let i = 0; i < N; i++) {
      const m = meta[i];
      pos[i * 3] += Math.sin(t * m.f + m.p) * m.a * dt;
      pos[i * 3 + 1] -= m.v * dt;
      if (pos[i * 3 + 1] < -box.y / 2) pos[i * 3 + 1] += box.y;
    }
    geo.attributes.position.needsUpdate = true;
  }
  return { update };
}
