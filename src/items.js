// Luukkujen 3D-esineet. Jokainen mahtuu noin yhden yksikön kokoiseen palloon ja on keskitetty origoon.
// userData.spin = false: litteä esine keinuu eikä pyöri ympäri. userData.update(t): oma animaatio.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, radialTexture } from './textures.js';

const gold = () => new THREE.MeshStandardMaterial({ color: '#f1c56c', roughness: 0.3, metalness: 0.88, emissive: '#3d2606', emissiveIntensity: 0.5 });
const lacquer = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });

function centered(geo) {
  geo.computeBoundingBox();
  const c = geo.boundingBox.getCenter(new THREE.Vector3());
  geo.translate(-c.x, -c.y, -c.z);
  return geo;
}

// A sphere pulled into a heart: pointed below, two lobes above, flatter front to back.
function heartGeometry() {
  const geo = new THREE.SphereGeometry(1, 96, 64), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = THREE.MathUtils.smoothstep(y, -1.05, 0.5); // 0 at the tip
    const taper = 0.1 + 0.9 * Math.pow(k, 0.85);
    const hx = x * taper * 1.08;
    const lobe = 0.5 * Math.pow(Math.abs(hx), 0.72) * THREE.MathUtils.smoothstep(y, -0.9, 0.3);
    p.setXYZ(i, hx, y * 0.86 + lobe - 0.18, z * (0.3 + 0.28 * k));
  }
  geo.computeVertexNormals();
  return centered(geo);
}

function heart({ color = '#a80f2a' }) {
  const g = new THREE.Group(), m = new THREE.Mesh(heartGeometry(), lacquer(color));
  m.scale.setScalar(0.46);
  g.add(m);
  return g;
}

function starShape(outer, inner) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer, a = Math.PI / 2 + (i * Math.PI) / 5;
    s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}

function star() {
  const geo = centered(new THREE.ExtrudeGeometry(starShape(0.44, 0.19), {
    depth: 0.02, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.07, bevelSegments: 1,
  }));
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, gold()));
  return g;
}

function gift({ color = '#8e1626' }) {
  const g = new THREE.Group(), goldPaper = color.toLowerCase() === '#c9a25a';
  const paper = new THREE.MeshPhysicalMaterial({ color, roughness: goldPaper ? 0.3 : 0.5, metalness: goldPaper ? 0.9 : 0, clearcoat: 0.3 });
  const ribbon = goldPaper ? lacquer('#8e1626') : gold();
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  add(new RoundedBoxGeometry(0.6, 0.46, 0.6, 3, 0.025), paper, 0, -0.1);
  add(new RoundedBoxGeometry(0.66, 0.13, 0.66, 3, 0.025), paper, 0, 0.19);
  add(new THREE.BoxGeometry(0.11, 0.462, 0.606), ribbon, 0, -0.1);
  add(new THREE.BoxGeometry(0.606, 0.462, 0.11), ribbon, 0, -0.1);
  add(new THREE.BoxGeometry(0.11, 0.134, 0.666), ribbon, 0, 0.19);
  add(new THREE.BoxGeometry(0.666, 0.134, 0.11), ribbon, 0, 0.19);
  const loop = new THREE.TorusGeometry(0.1, 0.032, 12, 28);
  loop.scale(1.25, 0.8, 1.5);
  for (const s of [-1, 1]) {
    const m = add(loop, ribbon, s * 0.115, 0.315);
    m.rotation.z = s * 0.75;
    m.rotation.y = Math.PI / 2 + s * 0.25;
  }
  add(new THREE.SphereGeometry(0.05, 16, 12), ribbon, 0, 0.29);
  g.position.y = -0.03;
  const wrap = new THREE.Group();
  wrap.add(g);
  wrap.rotation.x = 0.28;
  return wrap;
}

function bauble({ color = '#a3162a' }) {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.05 });
  const R = 0.38, ball = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), glass);
  ball.position.y = -0.06;
  g.add(ball);
  const gm = gold();
  for (const y of [-0.1, 0, 0.1]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(R * R - y * y) + 0.001, y ? 0.006 : 0.011, 8, 64), gm);
    band.rotation.x = Math.PI / 2;
    band.position.y = y - 0.06;
    g.add(band);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.09, 24), gm);
  cap.position.y = R - 0.03;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 8, 24), gm);
  ring.position.y = R + 0.045;
  g.add(cap, ring);
  return g;
}

function candle() {
  const g = new THREE.Group(), gm = gold();
  const dish = new THREE.Mesh(new THREE.LatheGeometry([
    [0, 0], [0.3, 0], [0.33, 0.03], [0.31, 0.05], [0.15, 0.045], [0.13, 0.09], [0, 0.09],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 40), gm);
  dish.position.y = -0.46;
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.52, 32), new THREE.MeshPhysicalMaterial({
    color: '#f3e8d2', roughness: 0.55, emissive: '#ff9a3c', emissiveIntensity: 0.12, sheen: 0.4,
  }));
  wax.position.y = -0.12;
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), new THREE.MeshBasicMaterial({ color: '#2a1a12' }));
  wick.position.y = 0.16;
  const drop = (r, h) => new THREE.LatheGeometry(Array.from({ length: 16 }, (_, i) => {
    const t = i / 15;
    return new THREE.Vector2(Math.sin(Math.PI * Math.pow(t, 0.62)) * r, t * h);
  }), 20);
  const flame = new THREE.Group();
  flame.add(new THREE.Mesh(drop(0.05, 0.2), new THREE.MeshBasicMaterial({ color: '#ffb347', toneMapped: false })));
  const core = new THREE.Mesh(drop(0.026, 0.12), new THREE.MeshBasicMaterial({ color: '#fff4d6', toneMapped: false }));
  core.position.y = 0.012;
  flame.add(core);
  flame.position.y = 0.17;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(255,200,120,0.9)'], [0.3, 'rgba(255,160,70,0.3)'], [1, 'rgba(255,140,40,0)']]),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  halo.position.y = 0.26;
  halo.scale.setScalar(0.8);
  const light = new THREE.PointLight('#ffb866', 0.6, 2, 2);
  light.position.y = 0.3;
  g.add(dish, wax, wick, flame, halo, light);
  g.userData.update = (t) => {
    const f = 1 + 0.08 * Math.sin(t * 11) + 0.05 * Math.sin(t * 17.3);
    flame.scale.set(1 / Math.sqrt(f), f, 1 / Math.sqrt(f));
    flame.rotation.z = 0.06 * Math.sin(t * 3.1);
    halo.material.opacity = 0.75 + 0.2 * Math.sin(t * 9.2);
  };
  return g;
}

function tree() {
  const g = new THREE.Group(), rnd = rng(8);
  const green = new THREE.MeshStandardMaterial({ color: '#1d573a', roughness: 0.62 });
  const tiers = [[0.36, 0.36, -0.2], [0.29, 0.33, -0.01], [0.22, 0.3, 0.17], [0.15, 0.27, 0.33]];
  const red = lacquer('#a3162a'), gm = gold(), ballGeo = new THREE.SphereGeometry(0.03, 12, 10);
  tiers.forEach(([r, h, y], ti) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 40), green);
    cone.position.y = y;
    g.add(cone);
    const n = 6 - ti;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ti * 0.9, k = 0.25 + rnd() * 0.5; // k: 0 at the rim, 1 at the tip
      const b = new THREE.Mesh(ballGeo, (i + ti) % 2 ? red : gm);
      b.position.set(Math.cos(a) * r * (1 - k) * 1.04, y - h / 2 + k * h, Math.sin(a) * r * (1 - k) * 1.04);
      g.add(b);
    }
  });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.14, 12), new THREE.MeshStandardMaterial({ color: '#4a2e1b', roughness: 0.8 }));
  trunk.position.y = -0.44;
  const top = new THREE.Mesh(centered(new THREE.ExtrudeGeometry(starShape(0.085, 0.036), {
    depth: 0.004, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.014, bevelSegments: 1,
  })), gm);
  top.position.y = 0.52;
  g.add(trunk, top);
  return g;
}

function snowflake() {
  const g = new THREE.Group();
  const ice = new THREE.MeshPhysicalMaterial({ color: '#e4f2ff', roughness: 0.14, metalness: 0.15, clearcoat: 1, emissive: '#5f9fd6', emissiveIntensity: 0.18 });
  const bar = (len, w, x, y, rot) => {
    const geo = new RoundedBoxGeometry(w, len, 0.045, 2, 0.012);
    geo.translate(0, len / 2, 0);
    const m = new THREE.Mesh(geo, ice);
    m.position.set(x, y, 0);
    m.rotation.z = rot;
    return m;
  };
  for (let k = 0; k < 6; k++) {
    const arm = new THREE.Group();
    arm.add(bar(0.48, 0.05, 0, 0, 0));
    for (const s of [-1, 1]) {
      arm.add(bar(0.17, 0.04, 0, 0.18, s * 1.0));
      arm.add(bar(0.11, 0.036, 0, 0.32, s * 1.0));
    }
    arm.rotation.z = (k * Math.PI) / 3;
    g.add(arm);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 6), ice);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  return g;
}

function letter() {
  const g = new THREE.Group();
  const paper = new THREE.MeshStandardMaterial({ color: '#efe3cc', roughness: 0.85 });
  const fold = new THREE.MeshStandardMaterial({ color: '#e2d2b3', roughness: 0.85 });
  const W = 0.92, H = 0.62;
  g.add(new THREE.Mesh(new RoundedBoxGeometry(W, H, 0.03, 2, 0.01), paper));
  const tri = (pts) => new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.005, bevelEnabled: false });
  const lower = new THREE.Mesh(tri([[-W / 2, -H / 2], [W / 2, -H / 2], [0, 0.02]]), paper);
  lower.position.z = 0.015;
  const flap = new THREE.Mesh(tri([[-W / 2, H / 2], [W / 2, H / 2], [0, -0.07]]), fold);
  flap.position.z = 0.021;
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.078, 0.022, 28), lacquer('#8e1626'));
  seal.rotation.x = Math.PI / 2;
  seal.position.set(0, -0.06, 0.036);
  const mini = heart({ color: '#b3122e' }).children[0];
  mini.scale.set(0.04, 0.04, 0.02);
  mini.position.set(0, -0.06, 0.05);
  g.add(lower, flap, seal, mini);
  g.userData.spin = false;
  return g;
}

function photo({ image }) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.9, 0.018, 2, 0.008), new THREE.MeshStandardMaterial({ color: '#f6f1e7', roughness: 0.7 })));
  const mat = new THREE.MeshBasicMaterial({ color: '#d8cfc0' });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.66), mat);
  pic.position.set(0, 0.07, 0.0095);
  g.add(pic);
  if (image) {
    new THREE.TextureLoader().load(image, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      // crop to a square from the centre
      const a = t.image.width / t.image.height;
      if (a > 1) { t.repeat.set(1 / a, 1); t.offset.set((1 - 1 / a) / 2, 0); } else { t.repeat.set(1, a); t.offset.set(0, (1 - a) / 2); }
      mat.map = t;
      mat.color.set('#ffffff');
      mat.needsUpdate = true;
    });
  }
  g.userData.spin = false;
  return g;
}

const BUILDERS = { heart, star, gift, bauble, candle, tree, snowflake, letter, photo };

export function buildItem(door = {}) {
  const item = (BUILDERS[door.item] || star)(door);
  item.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  return item;
}
