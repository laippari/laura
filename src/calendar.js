// Kalenterikaappi: pähkinäpuinen runko, 24 tammiluukkua saranoilla, lokeroiden hehku.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from './textures.js';

export const GRID = {
  cols: 4, rows: 6, pitch: 1,
  opening: 0.92, // clear opening of a compartment
  gap: 0.02, // between a door and its opening
  doorT: 0.06,
  inset: 0.012, // door face behind the frame face
  depth: 0.8,
  frame: 0.18,
  divider: 0.08,
};
GRID.width = (GRID.cols - 1) * GRID.pitch + GRID.opening + GRID.frame * 2;
GRID.height = (GRID.rows - 1) * GRID.pitch + GRID.opening + GRID.frame * 2;
GRID.front = GRID.depth / 2;

// Which day sits in which compartment, row by row from the top left. Mixed like in a paper calendar.
export const LAYOUT = [
  9, 16, 3, 21,
  14, 1, 19, 7,
  5, 22, 11, 17,
  20, 8, 24, 2,
  12, 23, 6, 15,
  4, 18, 13, 10,
];

export const OPEN_ANGLE = 1.92, AJAR_ANGLE = 0.95;

const SHEET = 2.6; // world units covered by one wood texture

// Planar texture coordinates from positions, so the grain has the same scale on every board.
function woodUV(geo, grain, offU, offV) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  const axes = ['x', 'y', 'z'], get = (attr, i, a) => (a === 'x' ? attr.getX(i) : a === 'y' ? attr.getY(i) : attr.getZ(i));
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const face = ax >= ay && ax >= az ? 'x' : ay >= az ? 'y' : 'z';
    let along, across;
    if (face !== grain) {
      along = get(p, i, grain);
      across = get(p, i, axes.find((a) => a !== grain && a !== face));
    } else {
      const [a, b] = axes.filter((q) => q !== grain);
      across = get(p, i, a);
      along = get(p, i, b) * 0.35;
    }
    uv.setXY(i, across / SHEET + offU, along / SHEET + offV);
  }
  return geo;
}

export function buildCalendar(tex) {
  const G = GRID, rnd = rng(3), group = new THREE.Group();
  const innerW = G.width - G.frame * 2, innerH = G.height - G.frame * 2;

  const walnut = new THREE.MeshStandardMaterial({ map: tex.walnut, bumpMap: tex.walnutBump, bumpScale: 0.6, roughness: 0.62, metalness: 0 });
  const walnutIn = walnut.clone();
  walnutIn.color.set('#b9a79a');
  const brass = new THREE.MeshStandardMaterial({ color: '#d6ae62', roughness: 0.28, metalness: 1 });

  const board = (w, h, d, x, y, z, grain, mat = walnut, round = 0) => {
    const geo = round ? new RoundedBoxGeometry(w, h, d, 2, round) : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(woodUV(geo, grain, rnd(), rnd()), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // carcass
  board(G.width, G.frame, G.depth, 0, (G.height - G.frame) / 2, 0, 'x', walnut, 0.014);
  board(G.width, G.frame, G.depth, 0, -(G.height - G.frame) / 2, 0, 'x', walnut, 0.014);
  board(G.frame, innerH, G.depth, -(G.width - G.frame) / 2, 0, 0, 'y', walnut, 0.014);
  board(G.frame, innerH, G.depth, (G.width - G.frame) / 2, 0, 0, 'y', walnut, 0.014);
  board(innerW, innerH, 0.04, 0, 0, -G.depth / 2 + 0.02, 'y', walnutIn);
  // dividers: uprights run through, shelves sit between them
  const divD = G.depth - 0.05, divZ = -0.02;
  for (let c = 1; c < G.cols; c++) board(G.divider, innerH, divD, (c - G.cols / 2) * G.pitch, 0, divZ, 'y');
  for (let r = 1; r < G.rows; r++) {
    for (let c = 0; c < G.cols; c++) {
      board(G.opening, G.divider, divD, (c - (G.cols - 1) / 2) * G.pitch, (G.rows / 2 - r) * G.pitch, divZ, 'x');
    }
  }

  // doors
  const dw = G.opening - G.gap * 2, tints = ['#ffffff', '#f3e3cf', '#e9d2b4', '#fbeede', '#dcc3a2'];
  const doorGeo = () => {
    const g = new RoundedBoxGeometry(dw, dw, G.doorT, 3, 0.014);
    g.translate(dw / 2, 0, -G.doorT / 2);
    return woodUV(g, 'y', rnd() * 0.6, rnd() * 0.6);
  };
  const knobGeo = new THREE.SphereGeometry(0.034, 20, 14), stemGeo = new THREE.CylinderGeometry(0.014, 0.018, 0.03, 12);
  stemGeo.rotateX(Math.PI / 2);
  const faceMat = new THREE.MeshStandardMaterial({
    map: tex.numbers, transparent: true, depthWrite: false, roughness: 0.7, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const openGeo = new THREE.PlaneGeometry(G.opening, G.opening);
  const auraGeo = new THREE.PlaneGeometry(dw / 0.6, dw / 0.6);
  const zDoor = G.front - G.inset;

  const doors = [];
  LAYOUT.forEach((day, i) => {
    const col = i % G.cols, row = Math.floor(i / G.cols);
    const cx = (col - (G.cols - 1) / 2) * G.pitch, cy = ((G.rows - 1) / 2 - row) * G.pitch;

    const pivot = new THREE.Group();
    pivot.position.set(cx - dw / 2, cy, zDoor);
    const mat = new THREE.MeshStandardMaterial({
      map: tex.oak, bumpMap: tex.oakBump, bumpScale: 0.5, roughness: 0.5, metalness: 0,
      color: tints[Math.floor(rnd() * tints.length)],
    });
    const leaf = new THREE.Mesh(doorGeo(), mat);
    leaf.castShadow = leaf.receiveShadow = true;
    pivot.add(leaf);

    const face = new THREE.PlaneGeometry(dw, dw);
    face.translate(dw / 2, 0, 0.001);
    const u0 = ((day - 1) % 4) / 4, u1 = u0 + 0.25, v1 = 1 - Math.floor((day - 1) / 4) / 6, v0 = v1 - 1 / 6;
    face.attributes.uv.setXY(0, u0, v1).setXY(1, u1, v1).setXY(2, u0, v0).setXY(3, u1, v0);
    pivot.add(new THREE.Mesh(face, faceMat));

    const knob = new THREE.Mesh(knobGeo, brass), stem = new THREE.Mesh(stemGeo, brass);
    knob.position.set(dw - 0.115, 0, 0.042);
    stem.position.set(dw - 0.115, 0, 0.015);
    knob.castShadow = true;
    pivot.add(knob, stem);
    group.add(pivot);

    // warm light in the gaps of a door that can be opened
    const leakMat = new THREE.MeshBasicMaterial({ color: '#ffc477', transparent: true, opacity: 0, toneMapped: false });
    const leak = new THREE.Mesh(openGeo, leakMat);
    leak.position.set(cx, cy, zDoor - G.doorT - 0.006);
    group.add(leak);
    // the lit back wall of an opened compartment
    const glowMat = new THREE.MeshBasicMaterial({ map: tex.nicheGlow, transparent: true, opacity: 0, toneMapped: false });
    const glow = new THREE.Mesh(openGeo, glowMat);
    glow.position.set(cx, cy, -G.depth / 2 + 0.045);
    group.add(glow);

    // and the same light spilling onto the wood around it
    const auraMat = new THREE.MeshBasicMaterial({
      map: tex.aura, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.set(cx, cy, G.front + 0.004);
    aura.renderOrder = 2;
    group.add(aura);

    doors.push({
      day, col, row, cx, cy, pivot, leak, leakMat, glow, glowMat, aura, auraMat,
      angle: 0, vel: 0, target: 0, leakNow: 0, leakTo: 0, glowNow: 0, glowTo: 0,
      available: false, opened: false, today: false,
    });
  });
  doors.sort((a, b) => a.day - b.day);

  // one light that moves into the compartment being opened
  const nicheLight = new THREE.PointLight('#ffb866', 0, 2.2, 1.6);
  group.add(nicheLight);
  // Door leaves swing on a spring: a little overshoot when opening, a rattle when a locked one is tried.
  function update(dt, t) {
    for (const d of doors) {
      d.vel += (70 * (d.target - d.angle) - 10.5 * d.vel) * dt;
      d.angle += d.vel * dt;
      if (d.angle < 0) { d.angle = 0; d.vel = Math.abs(d.vel) * 0.45; }
      d.pivot.rotation.y = -d.angle;
      const k = 1 - Math.exp(-dt * 5);
      d.leakNow += (d.leakTo - d.leakNow) * k;
      d.glowNow += (d.glowTo - d.glowNow) * k;
      const pulse = d.today ? 0.8 + 0.2 * Math.sin(t * 2.4) : 1;
      const shut = Math.max(0, 1 - d.angle * 1.4);
      d.leakMat.opacity = Math.min(1, d.leakNow * 1.4) * shut;
      d.leak.visible = d.leakMat.opacity > 0.01;
      d.auraMat.opacity = d.leakNow * pulse * shut;
      d.aura.visible = d.auraMat.opacity > 0.01;
      d.glowMat.opacity = d.glowNow;
      d.glow.visible = d.glowNow > 0.01;
    }
  }

  return { group, doors, nicheLight, update };
}

export function doorCenter(d, out = new THREE.Vector3()) {
  return out.set(d.cx, d.cy, GRID.front);
}
