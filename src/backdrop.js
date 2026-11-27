// Tausta: neulottu jouluseinä kaapin takana, sen edessä lumisade ja pehmeät lämpimät valot.
import * as THREE from 'three';
import { rng, KNIT } from './textures.js';

export function buildBackdrop(scene, tex, { phone }) {
  scene.background = new THREE.Color('#080305');
  const rnd = rng(77);

  // the knitted wall: well behind the cabinet and dim, brightest behind it and fading into the dark
  const WALL = 52, Z = -4.5, STITCH = 0.085;
  const tileW = KNIT.cols * STITCH, tileH = KNIT.rows * STITCH * (KNIT.sh / KNIT.sw);
  tex.knit.repeat.set(WALL / tileW, WALL / tileH);
  tex.knit.offset.set(0.5 - WALL / tileW / 2, 0.2 - WALL / tileH / 2);
  const flat = (map, extra) => new THREE.MeshBasicMaterial({ map, toneMapped: false, depthWrite: false, ...extra });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(WALL, WALL), flat(tex.knit));
  wall.position.z = Z;
  wall.renderOrder = -30;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 15.6), flat(tex.wallShadow, { transparent: true, opacity: 0.7 }));
  shadow.position.set(0.8, -1.0, Z + 0.01);
  shadow.renderOrder = -29;
  const vignette = new THREE.Mesh(new THREE.PlaneGeometry(WALL, WALL), flat(tex.vignette, { transparent: true }));
  vignette.position.z = Z + 0.02;
  vignette.renderOrder = -28;
  scene.add(wall, shadow, vignette);

  // soft lights floating between the wall and the cabinet
  const lights = [];
  const palette = ['#ffc98a', '#ffb060', '#ffe2b8', '#ff9a6a', '#ffd9a0'];
  for (let i = 0; i < 16; i++) {
    const mat = new THREE.SpriteMaterial({
      map: tex.soft, color: palette[i % palette.length], transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.1,
    });
    const s = new THREE.Sprite(mat);
    s.position.set((rnd() - 0.5) * 22, (rnd() - 0.5) * 18, -4 + rnd() * 2.6);
    const size = 0.7 + rnd() * 1.5;
    s.scale.set(size, size, 1);
    scene.add(s);
    lights.push({ s, base: 0.06 + rnd() * 0.12, f: 0.3 + rnd() * 0.7, p: rnd() * 6.28, x: s.position.x, y: s.position.y });
  }

  // snow
  const N = phone ? 220 : 360, box = { x: 22, y: 20, z0: -4.2, z1: 7 };
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
  return { update, setShadow: (k) => { shadow.material.opacity = 0.7 * k; }, tile: { w: tileW, h: tileH, z: Z } };
}
