// Joulukalenteri: näkymä, kamera, tilakone (tervetuloa → kalenteri → luukku auki → takaisin) ja käyttöliittymä.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SETTINGS, TEXTS, DOORS, PHOTOS } from './content.js';
import { makeTextures } from './textures.js';
import { buildCalendar, doorCenter, GRID, OPEN_ANGLE, AJAR_ANGLE } from './calendar.js';
import { buildItem } from './items.js';
import { buildBackdrop } from './backdrop.js';
import { buildPhotos } from './photos.js';
import { createSound } from './sound.js';

const $ = (id) => document.getElementById(id);
const fill = (s, n) => s.replaceAll('{n}', n);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const query = new URLSearchParams(location.search);

// ---------- päivämäärä ja muisti ----------

// Montako luukkua on auki tänään (0–24) ja mikä on päivän luukku. ?paiva=5 esikatselee tiettyä päivää.
function calendarState(now = new Date()) {
  if (query.has('paiva')) {
    const n = clamp(parseInt(query.get('paiva'), 10) || 0, 0, 24);
    return { unlocked: n, today: n || null, nights: n ? 0 : 1 };
  }
  const y = now.getFullYear(), december = now.getMonth() === 11, day = now.getDate();
  if (y > SETTINGS.year || (y === SETTINGS.year && december && day > 24)) return { unlocked: 24, today: null, nights: 0 };
  if (y === SETTINGS.year && december) return { unlocked: day, today: day, nights: 0 };
  const start = new Date(SETTINGS.year, 11, 1), midnight = new Date(y, now.getMonth(), day);
  return { unlocked: 0, today: null, nights: Math.round((start - midnight) / 864e5) };
}

const store = { opened: new Set(), seen: false };
try {
  if (query.has('nollaa')) localStorage.removeItem(SETTINGS.storageKey);
  const saved = JSON.parse(localStorage.getItem(SETTINGS.storageKey) || '{}');
  (saved.opened || []).forEach((d) => store.opened.add(d));
  store.seen = !!saved.seen;
} catch (e) { /* private window: the calendar works, it just forgets */ }
function save() {
  try { localStorage.setItem(SETTINGS.storageKey, JSON.stringify({ opened: [...store.opened], seen: store.seen })); } catch (e) { /* ignore */ }
}

// ---------- ääni ----------

const sound = createSound({ storageKey: SETTINGS.storageKey });

// ---------- käynnistys ----------

const canvas = $('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  $('fail').hidden = false;
  $('fail').textContent = TEXTS.noWebGL;
  document.body.classList.add('ready');
  throw e;
}
const phone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.autoClear = false;

// the numbers are drawn with the page's serif: wait for it, but never for long
const numberFont = '"Cormorant Garamond", Georgia, serif';
await Promise.race([
  Promise.all([document.fonts.load('600 124px "Cormorant Garamond"', '0123456789'), document.fonts.ready]).catch(() => {}),
  new Promise((r) => setTimeout(r, 2500)),
]);

const FOV = 28, TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 120);
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = env;
scene.environmentIntensity = 0.42;

const tex = makeTextures({ phone, numberFont });
const backdrop = buildBackdrop(scene, tex, { phone });

// The page's own background is the same knitted wall, at the same scale and in the same place as in the scene:
// phone browsers show the page background under their bars (the address bar, the camera) where the scene is not drawn.
const root = document.documentElement.style;
try { root.backgroundImage = `url(${tex.knit.image.toDataURL('image/png')})`; } catch (e) { /* the red colour stays */ }
function pageBackground() {
  const p = poseOverview(), ppu = view2d.h / (2 * (p.pos.z - backdrop.tile.z) * TAN);
  const bw = backdrop.tile.w * ppu, bh = backdrop.tile.h * ppu;
  root.backgroundSize = `${bw}px ${bh}px`;
  // the middle of the view shows the tile at (0.5, 0.2 from its bottom), as the wall's texture offset puts it
  root.backgroundPosition = `${view2d.w / 2 - 0.5 * bw}px ${view2d.h / 2 - 0.8 * bh}px`;
}
const cal = buildCalendar(tex);
const cabinet = cal.group;
scene.add(cabinet);
cabinet.visible = false; // it arrives after the photos have come down
backdrop.setShadow(0);
const photos = buildPhotos(scene, tex, PHOTOS);

// warm key from the upper left, cool fill from the right
const key = new THREE.DirectionalLight('#ffdcb0', 3.1);
key.position.set(-5.5, 7, 11);
key.castShadow = true;
key.shadow.mapSize.setScalar(phone ? 1024 : 2048);
Object.assign(key.shadow.camera, { left: -4.2, right: 4.2, top: 4.6, bottom: -4.6, near: 2, far: 30 });
key.shadow.bias = -0.0005;
key.shadow.normalBias = 0.02;
key.shadow.radius = 5;
const fillLight = new THREE.DirectionalLight('#9db8ff', 0.7);
fillLight.position.set(7, -1, 6);
const rim = new THREE.DirectionalLight('#ffb070', 0.9);
rim.position.set(3, 5, -8);
scene.add(key, fillLight, rim, new THREE.HemisphereLight('#b9cdf0', '#2a1c14', 0.35));

// ---------- näyttämö: luukun sisältö omassa näkymässään, piirretään kalenterin päälle ----------

const stage = (() => {
  const s = new THREE.Scene();
  s.environment = env;
  s.environmentIntensity = 0.75;
  const rig = new THREE.Group(); // follows the camera: everything in it is in view coordinates
  s.add(rig);
  const DIST = 6;
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    color: '#03060a', transparent: true, opacity: 0, depthTest: false, depthWrite: false,
  }));
  veil.position.z = -DIST - 4;
  veil.scale.setScalar(60);
  veil.renderOrder = -10;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex.soft, color: '#ffb469', transparent: true, opacity: 0, depthTest: false, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  halo.renderOrder = -5;
  const holder = new THREE.Group(), spinner = new THREE.Group();
  holder.add(spinner);
  const k1 = new THREE.DirectionalLight('#fff1dc', 1.7), k2 = new THREE.DirectionalLight('#a8c0ff', 0.5), k3 = new THREE.DirectionalLight('#ffb878', 1.6);
  k1.position.set(-2.5, 3.5, 2);
  k2.position.set(3.5, -1, 1);
  k3.position.set(1.5, 2.5, -DIST - 5);
  for (const l of [k1, k2, k3]) { l.target = holder; }
  const under = new THREE.Scene(), underRig = new THREE.Group();
  under.add(underRig);
  underRig.add(veil, halo);
  rig.add(holder, k1, k2, k3);

  const niche = new THREE.Vector3(), target = new THREE.Vector3();
  const st = { active: false, door: null, item: null, pop: 0, fly: 0, spin: 0, spinVel: 0, t0: 0 };

  st.begin = (door) => {
    st.end();
    st.door = door;
    st.item = buildItem(DOORS[door.day]);
    spinner.add(st.item);
    st.pop = st.fly = 0;
    st.spin = -0.5;
    st.spinVel = 0;
    st.active = true;
  };
  st.end = () => {
    if (st.item) {
      spinner.remove(st.item);
      st.item.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
      });
    }
    st.item = null;
    st.active = false;
    veil.material.opacity = halo.material.opacity = 0;
  };
  st.update = (dt, t) => {
    if (!st.active) return;
    rig.position.copy(camera.position);
    rig.quaternion.copy(camera.quaternion);
    underRig.position.copy(camera.position);
    underRig.quaternion.copy(camera.quaternion);
    const visH = 2 * DIST * TAN, visW = visH * camera.aspect;
    const size = Math.min(visW * 0.62, visH * 0.34);
    target.set(0, visH * 0.13, -DIST);
    niche.set(st.door.cx, st.door.cy, -0.04).applyMatrix4(cabinet.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
    const f = st.fly;
    holder.position.lerpVectors(niche, target, f);
    holder.position.y += Math.sin(f * Math.PI) * 0.25; // a slight arc on the way out
    holder.scale.setScalar(THREE.MathUtils.lerp(0.46 * st.pop, size, f));
    // spin: free rotation that settles into a slow turn, or a gentle sway for flat things
    const flat = st.item.userData.spin === false;
    st.spinVel *= Math.exp(-dt * 2.2);
    st.spin += st.spinVel * dt;
    if (flat) {
      st.spin += (0 - st.spin) * (1 - Math.exp(-dt * 2.5));
      spinner.rotation.y = st.spin + Math.sin(t * 0.8) * 0.3 * f;
    } else {
      st.spin += dt * 0.55 * f;
      spinner.rotation.y = st.spin + (1 - f) * 0.4;
    }
    spinner.rotation.x = Math.sin(t * 0.6) * 0.06 * f;
    spinner.position.y = Math.sin(t * 1.1) * 0.03 * f;
    if (st.item.userData.update) st.item.userData.update(t);
    veil.material.opacity = 0.82 * f;
    halo.position.copy(holder.position);
    halo.position.z -= 1.2;
    halo.scale.setScalar(size * 3.4);
    halo.material.opacity = 0.34 * f;
  };
  st.scene = s;
  st.under = under;
  return st;
})();

// ---------- kamera ja animaatiot ----------

const tweens = [];
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeOutSoft = (k) => 1 + 1.9 * Math.pow(k - 1, 3) + 0.9 * Math.pow(k - 1, 2); // settles with a small overshoot
const easeOutBack = (k) => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);
const tween = (sec, step, ease = easeInOut) => new Promise((done) => tweens.push({ t: 0, sec: calm ? sec * 0.6 : sec, step, ease, done }));
const wait = (sec) => tween(sec, () => {});

const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3();
const fitDist = (w, h) => Math.max(h / 2 / TAN, w / 2 / (TAN * camera.aspect));
const wide = matchMedia('(min-width: 760px) and (min-aspect-ratio: 1/1)'); // same rule as the stylesheet
const portrait = () => !wide.matches;

function poseOverview() {
  // the cabinet in the middle, with room around it for the knitted wall and the photos
  const d = fitDist(GRID.width * 1.36, GRID.height * 1.5);
  return { pos: new THREE.Vector3(0, 0, GRID.front + d), target: new THREE.Vector3(0, 0, 0) };
}
const poseIntro = poseOverview;
function poseFocus(door) {
  const target = doorCenter(door).add(new THREE.Vector3(0, -0.14, 0));
  const dir = new THREE.Vector3(0.2, 0.04, 1).normalize();
  return { pos: target.clone().addScaledVector(dir, fitDist(2.6, 3.3)), target };
}
let view = 'intro'; // 'intro' | 'overview' | door
const poseOf = (v) => (v === 'intro' ? poseIntro() : v === 'overview' ? poseOverview() : poseFocus(v));
let cameraMoving = 0;
function moveCamera(to, sec) {
  view = to;
  const pose = poseOf(to), p0 = camPos.clone(), t0 = camTarget.clone();
  cameraMoving++;
  return tween(sec, (k) => {
    camPos.lerpVectors(p0, pose.pos, k);
    camTarget.lerpVectors(t0, pose.target, k);
  }).then(() => { cameraMoving--; });
}

const view2d = { w: innerWidth, h: innerHeight }; // the canvas in CSS pixels; it can reach under the browser's bars
function resize() {
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
  view2d.w = w;
  view2d.h = h;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (!cameraMoving) { const p = poseOf(view); camPos.copy(p.pos); camTarget.copy(p.target); }
  {
    // the part of the scene the camera sees at the photos' depth
    const p = poseOverview(), hh = (p.pos.z + 1.5) * TAN;
    photos.layout({ tall: portrait(), hw: hh * camera.aspect, hh, cy: p.target.y });
  }
  pageBackground();
}
addEventListener('resize', resize);
if (window.visualViewport) visualViewport.addEventListener('resize', resize);
resize();

// ---------- kalenterin tila ----------

let now = calendarState();
let mode = 'intro'; // 'intro' | 'busy' | 'calendar' | 'reveal'
let active = null;
const doorOf = (day) => cal.doors[day - 1];
const todayDoor = () => (now.today ? doorOf(now.today) : null);

function refreshDoors() {
  for (const d of cal.doors) {
    d.available = d.day <= now.unlocked;
    d.opened = d.available && store.opened.has(d.day);
    d.today = d.day === now.today && !d.opened;
    if (d === active) continue;
    d.target = d.opened ? AJAR_ANGLE : 0;
    d.glowTo = d.opened ? 0.85 : 0;
    d.leakTo = d.available && !d.opened ? (d.today ? 1 : 0.5) : 0;
  }
}

const ui = {
  status: $('status'), statusText: $('status').querySelector('span'), statusBtn: $('status').querySelector('button'),
  hint: $('hint'), tease: $('tease'), card: $('card'),
};
let statusAction = null;
function updateStatus() {
  let text = '', btn = '';
  statusAction = null;
  if (view !== 'overview') {
    btn = TEXTS.wholeCalendar;
    statusAction = () => goOverview();
  } else if (now.unlocked === 0) {
    text = TEXTS.statusBefore + ' ' + (now.nights === 1 ? TEXTS.statusBeforeNights.one : fill(TEXTS.statusBeforeNights.many, now.nights));
  } else {
    const t = todayDoor(), left = cal.doors.filter((d) => d.available && !d.opened).length;
    if (t && !t.opened) {
      text = TEXTS.statusToday;
      btn = fill(TEXTS.statusTodayAction, t.day);
      statusAction = () => openDoor(t);
    } else if (left) text = left === 1 ? TEXTS.statusUnopened.one : fill(TEXTS.statusUnopened.many, left);
    else text = now.today ? TEXTS.statusDone : TEXTS.statusAfter;
  }
  ui.statusText.textContent = text;
  ui.statusBtn.textContent = btn;
  ui.statusBtn.hidden = !btn;
  ui.status.classList.toggle('on', mode === 'calendar');
  document.body.classList.toggle('near', view !== 'overview');
}
ui.statusBtn.addEventListener('click', () => { if (mode === 'calendar' && statusAction) statusAction(); });

// a playful line under the cabinet when a door is tried too early
let teaseTimer = 0, teaseN = 0;
function tease() {
  ui.tease.textContent = TEXTS.tooEarly[teaseN++ % TEXTS.tooEarly.length];
  ui.tease.classList.remove('on');
  void ui.tease.offsetWidth; // restart the pop-in
  ui.tease.classList.add('on');
  clearTimeout(teaseTimer);
  teaseTimer = setTimeout(() => ui.tease.classList.remove('on'), 2800);
}

// ---------- kulku ----------

let away = 1; // 1: the cabinet is still up above the view, 0: it has come down into place

async function enter() {
  if (mode !== 'intro' || !document.body.classList.contains('titled')) return;
  mode = 'busy';
  $('intro').classList.add('gone');
  document.body.classList.add('cal');
  store.seen = true;
  save();
  // the photos fly off and come back to the same composition in other places, and the cabinet comes down among them
  photos.exit(timer.getElapsed());
  view = 'overview';
  await wait(0.9);
  photos.reshuffle();
  photos.frame(timer.getElapsed());
  await wait(0.5);
  cabinet.visible = true;
  await tween(1.25, (k) => { away = 1 - k; backdrop.setShadow(k); }, easeOutSoft);
  const t = todayDoor();
  if (t && !t.opened) {
    await wait(0.25);
    await moveCamera(t, 1.4);
  }
  mode = 'calendar';
  updateStatus();
}

async function goOverview() {
  if (mode !== 'calendar' || view === 'overview') return;
  mode = 'busy';
  ui.status.classList.remove('on');
  await moveCamera('overview', 1.2);
  mode = 'calendar';
  updateStatus();
}

async function openDoor(d) {
  if (mode !== 'calendar' || !d.available) return;
  mode = 'busy';
  active = d;
  ui.status.classList.remove('on');
  if (view !== d) await moveCamera(d, view === 'overview' ? 1.25 : 0.8);
  d.target = OPEN_ANGLE;
  sound.open();
  d.leakTo = 0;
  d.glowTo = 1;
  d.today = false;
  cal.nicheLight.position.set(d.cx, d.cy, 0.1);
  tween(0.7, (k) => { cal.nicheLight.intensity = 2.4 * k; });
  store.opened.add(d.day);
  save();
  await wait(0.6);
  stage.begin(d);
  await tween(0.45, (k) => { stage.pop = k; }, easeOutBack);
  await tween(1.2, (k) => { stage.fly = k; });
  const c = DOORS[d.day] || {};
  $('card-eyebrow').textContent = fill(TEXTS.doorLabel, d.day) + ' · ' + fill(TEXTS.dateLabel, d.day);
  $('card-title').textContent = c.title || '';
  $('card-text').textContent = c.text || '';
  ui.card.classList.add('on');
  sound.reveal();
  document.body.classList.add('reveal');
  mode = 'reveal';
}

async function closeDoor() {
  if (mode !== 'reveal') return;
  mode = 'busy';
  ui.card.classList.remove('on');
  sound.close();
  document.body.classList.remove('reveal');
  await tween(0.8, (k) => { stage.fly = 1 - k; });
  await tween(0.22, (k) => { stage.pop = 1 - k; }, easeOut);
  stage.end();
  active = null;
  refreshDoors();
  tween(0.8, (k) => { cal.nicheLight.intensity = 2.4 * (1 - k); });
  await moveCamera('overview', 1.35);
  mode = 'calendar';
  updateStatus();
}

function tryLocked(d) {
  d.vel += 2.6; // a rattle: the leaf springs out a little and falls back
  sound.locked();
  tease();
}

// ---------- osoitin ----------

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), inv = new THREE.Matrix4(), hit = new THREE.Vector3();
function doorAt(x, y) {
  ndc.set((x / view2d.w) * 2 - 1, -(y / view2d.h) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  ray.ray.applyMatrix4(inv.copy(cabinet.matrixWorld).invert());
  const o = ray.ray.origin, dir = ray.ray.direction;
  if (Math.abs(dir.z) < 1e-6) return null;
  const k = (GRID.front - o.z) / dir.z;
  if (k <= 0) return null;
  hit.copy(o).addScaledVector(dir, k);
  const col = Math.floor(hit.x / GRID.pitch + GRID.cols / 2), row = Math.floor(GRID.rows / 2 - hit.y / GRID.pitch);
  if (col < 0 || col >= GRID.cols || row < 0 || row >= GRID.rows) return null;
  return cal.doors.find((d) => d.col === col && d.row === row) || null;
}

const drag = { yaw: 0, pitch: 0, yawTo: 0, pitchTo: 0 };
let ptr = null;
canvas.addEventListener('pointerdown', (e) => {
  ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, travel: 0 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!ptr || ptr.id !== e.pointerId) {
    if (e.pointerType === 'mouse') {
      const d = mode === 'calendar' ? doorAt(e.clientX, e.clientY) : null;
      canvas.style.cursor = d && d.available ? 'pointer' : '';
    }
    return;
  }
  const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
  ptr.x = e.clientX;
  ptr.y = e.clientY;
  ptr.travel += Math.hypot(dx, dy);
  if (ptr.travel < 8) return;
  if (mode === 'reveal') stage.spinVel += dx * 0.05;
  else if (mode === 'calendar') {
    drag.yawTo = clamp(drag.yawTo + dx * 0.0045, -0.5, 0.5);
    drag.pitchTo = clamp(drag.pitchTo + dy * 0.003, -0.22, 0.22);
  }
});
const release = (e) => {
  if (!ptr || ptr.id !== e.pointerId) return;
  const tap = ptr.travel < 8 && e.type === 'pointerup';
  ptr = null;
  drag.yawTo = drag.pitchTo = 0;
  if (!tap || mode !== 'calendar') return;
  const d = doorAt(e.clientX, e.clientY);
  if (!d) goOverview();
  else if (d.available) openDoor(d);
  else tryLocked(d);
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

$('enter').addEventListener('click', enter);
{
  const b = $('sound'), show = () => { b.setAttribute('aria-pressed', String(!sound.muted)); b.setAttribute('aria-label', sound.muted ? TEXTS.soundOn : TEXTS.soundOff); };
  b.addEventListener('click', (e) => { e.stopPropagation(); sound.setMuted(!sound.muted); show(); });
  show();
}
$('close').addEventListener('click', closeDoor);
ui.hint.querySelector('button').addEventListener('click', () => { const t = todayDoor(); if (t) openDoor(t); });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (mode === 'reveal') closeDoor(); else goOverview(); }
  if (e.key === 'Enter' && mode === 'intro') enter();
});
// a page left open over midnight gets its new door
document.addEventListener('visibilitychange', () => {
  if (document.hidden || mode === 'busy' || mode === 'reveal') return;
  const next = calendarState();
  if (next.unlocked !== now.unlocked) { now = next; refreshDoors(); updateStatus(); }
});

// ---------- tekstit ----------

document.title = TEXTS.pageTitle;
$('top').textContent = TEXTS.pageTitle;
$('intro-eyebrow').textContent = TEXTS.introEyebrow;
$('intro-title').textContent = TEXTS.introTitle;
$('intro-text').textContent = TEXTS.introText;
$('enter').textContent = TEXTS.enter;
$('close').textContent = TEXTS.close;
ui.hint.querySelector('button').textContent = TEXTS.hint;

// ---------- silmukka ----------

refreshDoors();
for (const d of cal.doors) { d.angle = d.target; d.glowNow = d.glowTo; } // opened doors start ajar, without swinging
{ const p = poseIntro(); camPos.copy(p.pos); camTarget.copy(p.target); }

// The opening: a short loading moment, the photos glide through the view, then the title with the photos around it.
// A tap during the photos skips to the title.
let skipParade = null;
async function opening() {
  await new Promise((r) => setTimeout(r, Math.max(0, 1900 - performance.now())));
  document.body.classList.add('ready');
  photos.parade(timer.getElapsed());
  await Promise.race([wait(store.seen ? 3.2 : 5.2), new Promise((r) => { skipParade = r; })]);
  skipParade = null;
  photos.frame(timer.getElapsed());
  document.body.classList.add('titled');
}
canvas.addEventListener('pointerdown', () => { if (skipParade) skipParade(); });

const timer = new THREE.Timer(), anchor = new THREE.Vector3();
let sway = 1, first = true;
function frame(ms) {
  timer.update(ms);
  const dt = Math.min(timer.getDelta(), 0.05), t = timer.getElapsed();

  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i];
    w.t += dt;
    const k = Math.min(1, w.t / w.sec);
    w.step(w.ease(k));
    if (k >= 1) { tweens.splice(i, 1); w.done(); }
  }

  // the cabinet floats and sways so that it reads as alive; calmer when a door is being looked at
  const swayTo = (view === 'overview' || view === 'intro' ? 1 : 0.4) * (calm ? 0.3 : 1);
  sway += (swayTo - sway) * (1 - Math.exp(-dt * 2));
  const e = 1 - Math.exp(-dt * (ptr ? 14 : 4));
  drag.yaw += (drag.yawTo - drag.yaw) * e;
  drag.pitch += (drag.pitchTo - drag.pitch) * e;
  cabinet.rotation.y = (Math.sin(t * 0.8) * 0.21 + Math.sin(t * 1.37 + 0.6) * 0.05) * sway + drag.yaw; // wide enough to show the sides
  cabinet.rotation.x = (Math.sin(t * 0.63 + 1) * 0.04 + Math.sin(t * 1.21) * 0.014) * sway + drag.pitch;
  cabinet.rotation.z = Math.sin(t * 0.52 + 2) * 0.018 * sway;
  cabinet.position.y = Math.sin(t * 1.05) * 0.1 * sway + away * 14;
  cabinet.position.x = Math.sin(t * 0.47 + 0.8) * 0.05 * sway;
  cal.update(dt, t);

  camera.position.copy(camPos);
  camera.lookAt(camTarget);
  camera.updateMatrixWorld();
  cabinet.updateMatrixWorld(true);

  // the label under today's door
  const td = todayDoor(), invite = !!td && td.today && mode === 'calendar';
  ui.hint.classList.toggle('on', invite);
  if (invite) {
    anchor.set(td.cx, td.cy - GRID.opening / 2 - 0.06, GRID.front).applyMatrix4(cabinet.matrixWorld).project(camera);
    ui.hint.style.transform = `translate(${((anchor.x + 1) / 2) * view2d.w}px, ${((1 - anchor.y) / 2) * view2d.h + 8}px)`;
  }

  // the playful line stays just under the cabinet, clear of the status line
  if (ui.tease.classList.contains('on')) {
    anchor.set(0, -GRID.height / 2 - 0.12, GRID.front).applyMatrix4(cabinet.matrixWorld).project(camera);
    const y = Math.min(((1 - anchor.y) / 2) * view2d.h + 10, innerHeight - 150);
    ui.tease.style.top = y + 'px';
  }

  backdrop.update(dt, t);
  photos.update(dt, t);
  stage.update(dt, t);

  renderer.clear();
  renderer.render(scene, camera);
  if (stage.active) {
    renderer.render(stage.under, camera);
    renderer.clearDepth();
    renderer.render(stage.scene, camera);
  }
  if (first) { first = false; requestAnimationFrame(opening); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// for looking at things from the console while developing
window.__kalenteri = { cal, stage, openDoor, closeDoor, enter, get mode() { return mode; } };
