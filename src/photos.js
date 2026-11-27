// Paperikuvat: valkokehyksiset valokuvat, jotka leijailevat ylhäältä alas ja jäävät läjään kaapin alapuolelle.
import * as THREE from 'three';
import { rng } from './textures.js';

const FALL = 1.9, STAGGER = 0.1;

export function buildPhotos(scene, tex, list) {
  const group = new THREE.Group(), rnd = rng(19), loader = new THREE.TextureLoader();
  scene.add(group);
  const paper = new THREE.MeshStandardMaterial({ color: '#f7f2e8', roughness: 0.75 });
  const frameGeo = new THREE.BoxGeometry(1, 1.19, 0.012), picGeo = new THREE.PlaneGeometry(0.86, 0.86);
  const shadeGeo = new THREE.PlaneGeometry(1.5, 1.7);
  const shadeMat = new THREE.MeshBasicMaterial({ map: tex.soft, color: '#000000', transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false });

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
      g, i, u: rnd(), v: rnd(), side: i % 2 ? 1 : -1, rz: (rnd() - 0.5) * 0.9, ph: rnd() * 6.28, drift: 0.8 + rnd() * 1.2,
      spin: (rnd() - 0.5) * 3, target: new THREE.Vector3(), p: -1,
    };
  });

  let size = 1, started = -1;
  // Upright screens: one heap under the cabinet. Wide screens: there is no room below, so two heaps beside its foot.
  function layout(tall) {
    size = tall ? 1.2 : 1.3;
    for (const o of photos) {
      const z = -1.7 + o.i * 0.035;
      if (tall) o.target.set((o.u - 0.5) * 4.5, -4.5 + (o.v - 0.5) * 1.05, z);
      else o.target.set(o.side * (3.5 + o.u * 3.9), -2.9 + (o.v - 0.5) * 2.2, z);
    }
  }
  function drop(t) { started = t; }
  const duration = () => photos.length * STAGGER + FALL;

  function update(dt, t) {
    if (started < 0) return;
    for (const o of photos) {
      const p = Math.min(1, (t - started - o.i * STAGGER) / FALL);
      if (p <= 0) continue;
      const g = g0(o);
      g.visible = true;
      g.scale.setScalar(size);
      if (p < 1) {
        const left = 1 - p, fall = 1 - left * left;
        g.position.set(
          o.target.x + Math.sin(p * Math.PI * 2.6 + o.ph) * o.drift * left,
          THREE.MathUtils.lerp(o.target.y + 15, o.target.y, fall),
          o.target.z + 1.2 * left,
        );
        g.rotation.set(Math.sin(p * 9 + o.ph) * 0.9 * left, Math.cos(p * 7 + o.ph) * 0.8 * left, o.rz + o.spin * left);
      } else {
        g.position.lerp(o.target, 1 - Math.exp(-dt * 6));
        g.rotation.set(0, 0, o.rz);
      }
    }
  }
  const g0 = (o) => o.g;
  return { layout, drop, duration, update };
}
