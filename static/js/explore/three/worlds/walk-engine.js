import * as THREE from "three";
import { OBJECT_MAP } from "../../data.js";
import { DESIGNS, PLAYER_DESIGN, makeCrowd, makeFigure } from "./kathmandu-people.js";

/* Shared engine for the walkable worlds (Karakoram Highway and future ones).
   A world supplies its terrain and landmarks; the engine supplies the walker,
   the follow camera, the crowd, the sky, the on-screen controls and clean-up. */

export function mulberry(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hs(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
export function vn(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hs(ix, iy), b = hs(ix + 1, iy), c = hs(ix, iy + 1), d = hs(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, o = 5) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < o; i += 1) {
    s += a * vn(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}
export const ss = (a, b, x) => {
  let t = (x - a) / (b - a);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
};
export const lerp = (a, b, t) => a + (b - a) * t;
export const col = (h) => new THREE.Color(h);

/* Building and bookkeeping helpers bound to one stage. */
export function createKit(stage, renderer, seed = 1) {
  const rnd = mulberry(seed);
  const rr = (a, b) => a + (b - a) * rnd();
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const track = (m) => {
    stage.materials.add(m);
    return m;
  };
  const M = (o) => track(new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.88, metalness: 0 }, o)));
  function ctex(w, h, fn, rep, srgb = true) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    fn(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rep) t.repeat.set(rep[0], rep[1]);
    t.anisotropy = ANISO;
    stage.trackTexture(t);
    return t;
  }
  function noiseFill(g, w, h, n, a, lo, hi) {
    for (let i = 0; i < n; i += 1) {
      const v = (lo + Math.random() * (hi - lo)) | 0;
      g.fillStyle = `rgba(${v},${v},${v},${a})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }
  function repeatTex(base, rx, ry) {
    const t = base.clone();
    t.needsUpdate = true;
    t.repeat.set(rx, ry);
    stage.trackTexture(t);
    return t;
  }
  function mk(geo, mat, x, y, z, par, ry) {
    stage.trackGeometry(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    (par || stage.root).add(m);
    return m;
  }
  const bx = (w, h, d, mat, x, y, z, par, ry) => mk(new THREE.BoxGeometry(w, h, d), mat, x, y, z, par, ry);
  const cy = (rt, rb, h, seg, mat, x, y, z, par, ry) => mk(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, par, ry);

  /* collision: circles ([x, z, r]) and oriented boxes ({ box }) in a grid.
     Items are registered in every cell they touch, padded by QPAD so a query
     circle of radius <= QPAD only needs to look at its own cell. */
  const BG = new Map(), BC = 10, QPAD = 1.2;
  const COLLIDERS = [];
  function addToCells(item, x0w, x1w, z0w, z1w) {
    const x0 = Math.floor((x0w - QPAD) / BC), x1 = Math.floor((x1w + QPAD) / BC);
    const z0 = Math.floor((z0w - QPAD) / BC), z1 = Math.floor((z1w + QPAD) / BC);
    for (let a = x0; a <= x1; a += 1) for (let b = z0; b <= z1; b += 1) {
      const k = a + "," + b;
      if (!BG.has(k)) BG.set(k, []);
      BG.get(k).push(item);
    }
  }
  function block(x, z, r) {
    const item = [x, z, r];
    COLLIDERS.push(item);
    addToCells(item, x - r, x + r, z - r, z + r);
  }
  /* Oriented box collider: centre, full width (local x), full depth (local z),
     rotation about Y using the same convention as Object3D.rotation.y. */
  function blockBox(cx, cz, w, d, ry = 0) {
    const c = Math.cos(ry), s = Math.sin(ry), hw = w / 2, hd = d / 2;
    const ex = Math.abs(hw * c) + Math.abs(hd * s), ez = Math.abs(hw * s) + Math.abs(hd * c);
    const item = { box: true, x: cx, z: cz, hw, hd, c, s, ry };
    COLLIDERS.push(item);
    addToCells(item, cx - ex, cx + ex, cz - ez, cz + ez);
    return item;
  }
  /* Box collider for an object placed inside a rotated/translated group. */
  function blockBoxIn(group, lx, lz, w, d, lry = 0) {
    const gr = group.rotation.y, c = Math.cos(gr), s = Math.sin(gr), sc = group.scale.x;
    return blockBox(group.position.x + (lx * c + lz * s) * sc, group.position.z + (-lx * s + lz * c) * sc, w * sc, d * sc, gr + lry);
  }
  function boxHit(b, x, z, pr) {
    const dx = x - b.x, dz = z - b.z;
    const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
    const qx = lx < -b.hw ? -b.hw : lx > b.hw ? b.hw : lx;
    const qz = lz < -b.hd ? -b.hd : lz > b.hd ? b.hd : lz;
    const ox = lx - qx, oz = lz - qz;
    return ox * ox + oz * oz < pr * pr;
  }
  /* Push a circle of radius pr out of every collider it overlaps; repeated
     a few times so corners between two colliders resolve cleanly. The
     result slides along walls instead of stopping dead. */
  function resolve(x, z, pr) {
    for (let it = 0; it < 4; it += 1) {
      const l = BG.get(Math.floor(x / BC) + "," + Math.floor(z / BC));
      if (!l) return [x, z];
      let moved = false;
      for (const b of l) {
        if (b.box) {
          const dx = x - b.x, dz = z - b.z;
          const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
          const qx = lx < -b.hw ? -b.hw : lx > b.hw ? b.hw : lx;
          const qz = lz < -b.hd ? -b.hd : lz > b.hd ? b.hd : lz;
          let px = 0, pz = 0;
          if (qx === lx && qz === lz) {
            /* centre inside the box: leave by the nearest face */
            const fx = b.hw - Math.abs(lx), fz = b.hd - Math.abs(lz);
            if (fx < fz) px = (lx >= 0 ? 1 : -1) * (fx + pr + 1e-3);
            else pz = (lz >= 0 ? 1 : -1) * (fz + pr + 1e-3);
          } else {
            const ox = lx - qx, oz = lz - qz, d2 = ox * ox + oz * oz;
            if (d2 >= pr * pr) continue;
            const d = Math.sqrt(d2) || 1e-6, push = pr - d + 1e-3;
            px = (ox / d) * push;
            pz = (oz / d) * push;
          }
          x += px * b.c + pz * b.s;
          z += -px * b.s + pz * b.c;
          moved = true;
        } else {
          const dx = x - b[0], dz = z - b[1], R = b[2] + pr, d2 = dx * dx + dz * dz;
          if (d2 >= R * R) continue;
          const d = Math.sqrt(d2);
          if (d < 1e-5) { x += R; moved = true; continue; }
          const push = R - d + 1e-3;
          x += (dx / d) * push;
          z += (dz / d) * push;
          moved = true;
        }
      }
      if (!moved) break;
    }
    return [x, z];
  }
  function blockRect(cx, cz, w, d, ry) {
    const c = Math.cos(ry), s = Math.sin(ry), r = Math.min(w, d) / 2;
    const n = Math.max(1, Math.ceil(Math.max(w, d) / Math.min(w, d)));
    for (let i = 0; i < n; i += 1) {
      const t = (i + 0.5) / n - 0.5;
      const lx = w >= d ? t * w : 0, lz = w >= d ? 0 : t * d;
      block(cx + lx * c + lz * s, cz - lx * s + lz * c, r * 1.05);
    }
  }
  function blocked(x, z, pr) {
    const l = BG.get(Math.floor(x / BC) + "," + Math.floor(z / BC));
    if (!l) return false;
    for (const b of l) {
      if (b.box) {
        if (boxHit(b, x, z, pr)) return true;
        continue;
      }
      const dx = x - b[0], dz = z - b[1], R2 = b[2] + pr;
      if (dx * dx + dz * dz < R2 * R2) return true;
    }
    return false;
  }

  function ribbon(points, width, yFn, mat, uvScale) {
    const pos = [], uv = [], idx = [];
    let acc = 0;
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i], q = points[Math.min(i + 1, points.length - 1)], o = points[Math.max(i - 1, 0)];
      let tx = q.x - o.x, tz = q.z - o.z;
      const L = Math.hypot(tx, tz) || 1;
      tx /= L;
      tz /= L;
      const nx = -tz, nz = tx;
      if (i > 0) acc += Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z);
      const w = typeof width === "function" ? width(i, p) : width;
      const lx = p.x + (nx * w) / 2, lz = p.z + (nz * w) / 2, rx = p.x - (nx * w) / 2, rz = p.z - (nz * w) / 2;
      pos.push(lx, yFn(lx, lz, p, i), lz, rx, yFn(rx, rz, p, i), rz);
      uv.push(0, acc / uvScale, 1, acc / uvScale);
      if (i < points.length - 1) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    stage.trackGeometry(g);
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    stage.add(m);
    return m;
  }

  /* prayer flags and other fluttering strings */
  const FLAGS = [];
  const lineMat = track(new THREE.LineBasicMaterial({ color: 0x2c241c }));
  function flagString(A, B, sag, palette = 5) {
    const pts = [];
    for (let i = 0; i <= 20; i += 1) {
      const t = i / 20;
      const v = A.clone().lerp(B, t);
      v.y -= Math.sin(t * Math.PI) * sag;
      pts.push(v);
    }
    stage.add(new THREE.Line(stage.trackGeometry(new THREE.BufferGeometry().setFromPoints(pts)), lineMat));
    const len = A.distanceTo(B), n = Math.floor(len / 0.62), yaw = Math.atan2(B.x - A.x, B.z - A.z) + Math.PI / 2;
    for (let i = 1; i < n; i += 1) {
      const t = i / n;
      const v = A.clone().lerp(B, t);
      v.y -= Math.sin(t * Math.PI) * sag;
      FLAGS.push({ x: v.x, y: v.y, z: v.z, yaw, c: i % palette, ph: Math.random() * 6 });
    }
  }

  return {
    rnd, rr, track, M, ctex, noiseFill, repeatTex, mk, bx, cy,
    block, blockRect, blockBox, blockBoxIn, blocked, resolve, COLLIDERS,
    ribbon, flagString, FLAGS, _o: new THREE.Object3D(),
  };
}

/* Default sky colours by sun height (linear values). */
const K = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
const SKY_KEYS = [
  [-0.25, K(0.006, 0.01, 0.03), K(0.02, 0.03, 0.06), K(0, 0, 0)],
  [-0.03, K(0.06, 0.08, 0.2), K(0.7, 0.34, 0.18), K(1, 0.4, 0.15)],
  [0.1, K(0.18, 0.32, 0.62), K(0.95, 0.62, 0.38), K(1, 0.6, 0.3)],
  [0.32, K(0.1, 0.3, 0.78), K(0.6, 0.74, 0.92), K(1, 0.9, 0.7)],
  [1, K(0.05, 0.22, 0.72), K(0.55, 0.7, 0.9), K(1, 0.95, 0.85)],
];

const BASE_STR = {
  en: {
    travel: "Travel", here: "you are here", km: "km", arriving: "Arriving at", learn: "Learn about",
    times: ["Morning", "Midday", "Golden hour", "Night"], langBtn: "中文", langLabel: "Switch to Chinese",
    hintTouch: "Left thumb to walk · drag to look · tap a beacon to read",
    hintDesk: "W A S D to walk · Shift to run · drag to look · E or click a beacon to read", map: "Route map. Select to travel.",
  },
  zh: {
    travel: "前往", here: "你在这里", km: "公里", arriving: "抵达", learn: "了解",
    times: ["清晨", "正午", "黄昏", "夜晚"], langBtn: "EN", langLabel: "切换到英文",
    hintTouch: "左手拇指行走 · 拖动转换视角 · 点按光柱阅读",
    hintDesk: "W A S D 行走 · Shift 奔跑 · 拖动转换视角 · 按 E 或点击光柱阅读", map: "路线地图，点击可前往各地。",
  },
};

/**
 * opts: {
 *   scene, stage, manager, kit,
 *   places: { key: { n, zh, sub, subZh, x, z, r, spawn:[x,z], look:[x,z]?, pitch?, dist? } },
 *   worldName: { en, zh, sub },
 *   hgt(x,z), groundY(x,z), canStand(x,z),
 *   mapBounds: { x0, x1, z0, z1 }, mapColor(x,z) -> [r,g,b], mapLines: [[ [x,z], ... ]],
 *   kmPerUnit, startPlace, onTime(info), nightMats, fogDensity, skyKeys
 * }
 */

/* Minimap badge for a rideable: a teal disc with a tiny glyph for its kind. */
export function drawRideIcon(g, kind, X, Y, active = false) {
  g.save();
  g.translate(X, Y);
  g.fillStyle = active ? "#f2c76b" : "#1f8a8a";
  g.strokeStyle = "#ffffff";
  g.lineWidth = 2;
  g.beginPath(); g.arc(0, 0, 7.5, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = active ? "#1d1406" : "#ffffff";
  g.fillStyle = active ? "#1d1406" : "#ffffff";
  g.lineWidth = 1.6;
  g.beginPath();
  if (kind === "boat") { g.moveTo(-5, 0); g.lineTo(5, 0); g.lineTo(3, 3); g.lineTo(-3, 3); g.closePath(); g.fill(); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -5); g.lineTo(3, -1); g.stroke(); }
  else if (kind === "glider") { g.moveTo(-5.5, -1); g.quadraticCurveTo(0, -6.5, 5.5, -1); g.stroke(); g.beginPath(); g.moveTo(-4, -1); g.lineTo(0, 4); g.lineTo(4, -1); g.stroke(); }
  else if (kind === "jeep" || kind === "cart" || kind === "rickshaw") { g.rect(-4.5, -3, 9, 3.5); g.fill(); g.beginPath(); g.arc(-2.6, 2.2, 1.6, 0, 7); g.arc(2.6, 2.2, 1.6, 0, 7); g.fill(); }
  else if (kind === "sled") { g.moveTo(-5, 1); g.lineTo(4, 1); g.quadraticCurveTo(6, 1, 5, -2); g.stroke(); g.beginPath(); g.moveTo(-3, 1); g.lineTo(-3, -2); g.moveTo(2, 1); g.lineTo(2, -2); g.stroke(); }
  else { /* animals: a horseshoe */ g.arc(0, 0.5, 3.6, Math.PI * 0.1, Math.PI * 0.9, true); g.lineWidth = 2.2; g.stroke(); }
  g.restore();
}

export function createWalker(opts) {
  const { scene, stage, manager, kit, places: PL } = opts;
  const { _o } = kit;
  const camera = manager.camera, controls = manager.controls, renderer = manager.renderer;
  const LOWQ = stage.quality === "low";
  /* collision: "slide" pushes the walker out of circle/box colliders so it
     glides along walls (Pu'er, Xishuangbanna). Older worlds keep "stop". */
  const SLIDE = opts.collision === "slide";
  const PR = opts.playerRadius || 0.5;

  /* camera and controls, restored on dispose */
  const saved = {
    far: camera.far, near: camera.near, exposure: renderer.toneMappingExposure,
    maxTargetY: controls.maxTargetY, minTargetY: controls.minTargetY, minPhi: controls.minPhi, maxPhi: controls.maxPhi,
    updateCamera: controls.updateCamera,
  };
  camera.near = 0.25;
  camera.far = opts.far || 5200;
  camera.updateProjectionMatrix();
  Object.assign(controls, { maxTargetY: 1e5, minTargetY: -1e5, minPhi: 0.25, maxPhi: 1.62 });

  /* sky, light, stars */
  const sunDir = new THREE.Vector3(0.4, 0.6, 0.3).normalize();
  const skyU = { sun: { value: sunDir }, zen: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, glow: { value: new THREE.Color() } };
  const skyMat = kit.track(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: "varying vec3 w;void main(){w=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: "uniform vec3 sun,zen,hor,glow;varying vec3 w;void main(){vec3 d=normalize(w);float t=clamp(d.y,0.,1.);vec3 c=mix(hor,zen,pow(t,.5));if(d.y<0.)c=hor*0.9;float s=max(dot(d,normalize(sun)),0.);c+=glow*(pow(s,8.)*.45+pow(s,1200.)*5.);gl_FragColor=vec4(c,1.);}",
  }));
  const sky = new THREE.Mesh(stage.trackGeometry(new THREE.SphereGeometry(camera.far * 0.9, 32, 16)), skyMat);
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  stage.add(sky);
  scene.fog = new THREE.FogExp2(0xffffff, opts.fogDensity || 0.0006);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x4a3e2a, 1.5);
  const sun = new THREE.DirectionalLight(0xffffff, 8);
  sun.castShadow = renderer.shadowMap.enabled;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 600 });
  stage.add(hemi, sun, sun.target);
  const stars = (() => {
    const g = new THREE.BufferGeometry(), p = [], r = camera.far * 0.85;
    for (let i = 0; i < 1500; i += 1) {
      const u = Math.random() * Math.PI * 2, v = Math.random() * 0.9 + 0.08, c = Math.cos(Math.asin(v));
      p.push(Math.cos(u) * c * r, v * r, Math.sin(u) * c * r);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    stage.trackGeometry(g);
    const s = new THREE.Points(g, kit.track(new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })));
    s.frustumCulled = false;
    return s;
  })();
  stage.add(stars);
  const keys = opts.skyKeys || SKY_KEYS;
  const samp = (y, i, out) => {
    for (let k = 0; k < keys.length - 1; k += 1) {
      if (y <= keys[k + 1][0] || k === keys.length - 2) {
        const t = Math.min(Math.max((y - keys[k][0]) / (keys[k + 1][0] - keys[k][0]), 0), 1);
        return out.copy(keys[k][i]).lerp(keys[k + 1][i], t);
      }
    }
    return out;
  };
  const TIMES = [24, 45, 79, 100];
  let timeIdx = 0;
  const lights = { lamps: [], nightMats: opts.nightMats || [] };
  function setTime(v) {
    const t = v / 100, el = Math.sin(t * Math.PI) * 1.15 - 0.12, az = Math.PI * 0.15 + t * Math.PI * 0.95;
    sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el) * 0.7 + 0.3).normalize();
    const y = sunDir.y;
    samp(y, 1, skyU.zen.value);
    samp(y, 2, skyU.hor.value);
    samp(y, 3, skyU.glow.value);
    scene.fog.color.copy(skyU.hor.value);
    const day = ss(-0.05, 0.3, y), warm = 1 - ss(0.05, 0.42, y), night = 1 - ss(-0.12, 0.04, y);
    sun.intensity = 2.7 * Math.PI * ss(-0.03, 0.1, y);
    sun.color.setRGB(1, 0.7 + 0.3 * (1 - warm), 0.48 + 0.52 * (1 - warm));
    hemi.intensity = (0.32 + 0.45 * day) * Math.PI;
    hemi.color.copy(skyU.zen.value).lerp(new THREE.Color(1, 1, 1), 0.5);
    renderer.toneMappingExposure = (0.82 + 0.22 * day + 0.3 * night) * (opts.exposureScale || 1);
    stars.material.opacity = night * 0.9;
    lights.lamps.forEach((m) => (m.visible = night > 0.15 || y < 0.12));
    lights.nightMats.forEach((m) => (m.emissiveIntensity = night * 1.1 + ss(0.1, -0.05, y) * 0.3));
    if (opts.onTime) opts.onTime({ day, night, y });
  }

  /* the walker */
  const figMat = kit.M({ vertexColors: true, roughness: 0.75 });
  const player = makeFigure(PLAYER_DESIGN, figMat);
  player.geometries.forEach((g) => stage.trackGeometry(g));
  stage.add(player.root);
  const startP = PL[opts.startPlace];
  const st = { x: startP.spawn[0], z: startP.spawn[1], face: Math.PI, walk: 0, speed: 0, ready: false, camD: null };

  /* interactives registered by the world */
  const POS = {};
  function interactive(id, group, label, beacon, o = {}) {
    group.updateMatrixWorld(true);
    const by = opts.groundY(beacon[0], beacon[1]);
    const entry = stage.addInteractive(id, group, {
      label,
      accent: "#e6bc6a",
      radius: o.radius || 14,
      beaconPosition: [beacon[0], by + 0.1, beacon[1]],
      labelOffset: o.labelOffset || 1.2,
    });
    entry.beacon.group.scale.setScalar(1.6);
    POS[id] = { x: beacon[0], z: beacon[1], label };
    return entry;
  }

  /* NPCs: the world pushes entries, then calls start() */
  const NPC = [];
  const D = Object.fromEntries(DESIGNS.map((d, i) => [d.id, i]));
  const pick = (ids) => D[ids[(kit.rnd() * ids.length) | 0]];
  const addNpc = (o) => NPC.push(Object.assign({ ph: kit.rnd() * 6, sp: kit.rr(0.9, 1.4), y: 0, yaw: kit.rnd() * Math.PI * 2, swing: 0, x: 0, z: 0 }, o));
  let crowd = null;
  const extraUpdates = [];
  /* Rideables (elephants, boats...). A rideable is
     { kind, label:{en,zh}, radius, blockR, pos():{x,z}, mount(), step(dt, input) -> {x,y,z,face},
       dismount() -> [x,z] | null, reset()?, camLift?, camDist? }.
     F (or the on-screen prompt) mounts the nearest one and dismounts again. */
  const RIDES = [];
  let riding = null;
  let nearRide = null;
  const RIDE_STR = {
    en: { ride: "Ride", off: "Get off", shore: "Steer closer to the shore or a pier to get off" },
    zh: { ride: "乘坐", off: "下来", shore: "靠近岸边或码头才能下来" },
  };
  function pushDyn(x, z) {
    for (const r of RIDES) {
      if (r === riding || !r.blockR) continue;
      const p = r.pos(), dx = x - p.x, dz = z - p.z, R = r.blockR + PR, d = Math.hypot(dx, dz);
      if (d < R && d > 1e-5) { x = p.x + (dx / d) * R; z = p.z + (dz / d) * R; }
    }
    for (const b of DYN) {
      const p = b.pos(), dx = x - p.x, dz = z - p.z, R = b.r + PR, d = Math.hypot(dx, dz);
      if (d < R && d > 1e-5) { x = p.x + (dx / d) * R; z = p.z + (dz / d) * R; }
    }
    return [x, z];
  }
  /* a small ride log: the first time you try each ride in a world you get a note */
  function logRide(r) {
    try {
      const key = "hc-rides", wname = (opts.worldName && opts.worldName.en) || "world";
      const log = JSON.parse(window.localStorage.getItem(key) || "{}");
      const list = log[wname] || [];
      const tag = r.kind + ":" + RIDES.indexOf(r);
      const kinds = [...new Set(RIDES.map((q) => q.kind + ":" + RIDES.indexOf(q)))];
      if (list.includes(tag)) return;
      list.push(tag); log[wname] = list;
      window.localStorage.setItem(key, JSON.stringify(log));
      const n = list.filter((q) => kinds.includes(q)).length;
      const lab = r.label ? r.label[lang] || r.label.en : r.kind;
      timers.push(window.setTimeout(() => showNote((lang === "zh" ? "新坐骑：" : "New ride: ") + lab + `  ·  ${n}/${kinds.length}`), 400));
    } catch (e) { /* storage unavailable */ }
  }
  function mount(r) {
    if (riding || !r) return;
    riding = r;
    r.mount();
    logRide(r);
    saved.rideRadius = controls.desiredRadius;
    controls.desiredRadius = r.camDist || 18;
    promptKey = "";
  }
  function showNote(text) {
    arrive.innerHTML = "<small></small><strong></strong>";
    arrive.querySelector("small").textContent = "";
    arrive.querySelector("strong").textContent = text;
    arrive.querySelector("strong").style.fontSize = "22px";
    arrive.style.opacity = "1";
    timers.push(window.setTimeout(() => (arrive.style.opacity = "0"), 2200));
  }
  function dismount(force = false) {
    if (!riding) return;
    let spot = riding.dismount();
    if (!spot && !force) { showNote(riding.offNote ? riding.offNote[lang] || riding.offNote.en : RIDE_STR[lang].shore); return; }
    if (!spot) spot = [st.x, st.z];
    const r = riding;
    riding = null;
    if (force && r.reset) r.reset();
    if (SLIDE) [st.x, st.z] = kit.resolve(spot[0], spot[1], PR);
    else { st.x = spot[0]; st.z = spot[1]; }
    controls.desiredRadius = saved.rideRadius || 14;
    if (r.dismounted) r.dismounted();
    promptKey = "";
  }
  /* each rideable gets a floating ride badge so it can be spotted from afar */
  const rideTex = {};
  function rideBadge(kind) {
    if (!rideTex[kind]) {
      const c = document.createElement("canvas"); c.width = c.height = 64;
      const g = c.getContext("2d"); g.scale(3.6, 3.6); drawRideIcon(g, kind, 8.9, 8.9);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; stage.trackTexture(t);
      rideTex[kind] = t;
    }
    const m = new THREE.SpriteMaterial({ map: rideTex[kind], depthTest: false, transparent: true });
    stage.materials.add(m);
    const sp = new THREE.Sprite(m); sp.renderOrder = 11; sp.scale.setScalar(1.1);
    stage.add(sp);
    return sp;
  }
  function addRideable(r) { RIDES.push(r); r.badge = rideBadge(r.kind); return r; }
  function updateRideBadges(time) {
    for (const r of RIDES) {
      const p = r.pos(), d = Math.hypot(p.x - st.x, p.z - st.z);
      r.badge.visible = r !== riding && d < 90 && worldVisible();
      if (!r.badge.visible) continue;
      const h = r.iconH || (r.camLift || 2) * 1.6 + 1.6;
      r.badge.position.set(p.x, opts.groundY(p.x, p.z) + h + (stage.reducedMotion ? 0 : Math.sin(time * 2.4 + p.x) * 0.1), p.z);
      r.badge.scale.setScalar(0.8 + Math.min(2.2, d / 22));
    }
  }
  /* Moving obstacles (herd animals, carts...): { pos():{x,z}, r } */
  const DYN = [];
  function addBlocker(b) { DYN.push(b); return b; }
  /* Info targets: moving things (animals) that open a discovery card. Each gets a
     small floating ⓘ badge; E or clicking the badge opens the card. Several
     targets can share one discovery id (a herd); the nearest one is used. */
  const INFO = [];
  let badgeTex = null;
  function badgeTexture() {
    if (badgeTex) return badgeTex;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2);
    g.fillStyle = "rgba(14,40,52,.88)"; g.fill();
    g.lineWidth = 9; g.strokeStyle = "#f2c76b"; g.stroke();
    g.fillStyle = "#fff4d6";
    g.font = "bold 76px Georgia, 'Times New Roman', serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("i", 64, 70);
    badgeTex = new THREE.CanvasTexture(c);
    badgeTex.colorSpace = THREE.SRGBColorSpace;
    stage.trackTexture(badgeTex);
    return badgeTex;
  }
  function addInfoTarget(id, object, height = 2.6) {
    const mat = new THREE.SpriteMaterial({ map: badgeTexture(), depthTest: true, transparent: true, fog: false });
    stage.materials.add(mat);
    const sp = new THREE.Sprite(mat);
    sp.scale.setScalar(0.85);
    sp.userData.infoId = id;
    sp.renderOrder = 6;
    stage.add(sp);
    const t = { id, object, height, sprite: sp };
    INFO.push(t);
    return t;
  }
  const infoRay = new THREE.Raycaster();
  let infoDown = null;
  function onInfoDown(e) { infoDown = { x: e.clientX, y: e.clientY }; }
  function onInfoUp(e) {
    if (!infoDown || Math.hypot(e.clientX - infoDown.x, e.clientY - infoDown.y) > 6 || !INFO.length) return;
    const r = renderer.domElement.getBoundingClientRect();
    infoRay.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = infoRay.intersectObjects(INFO.filter((t) => t.sprite.visible).map((t) => t.sprite), false)[0];
    if (hit) manager.onSelect(hit.object.userData.infoId);
  }
  renderer.domElement.addEventListener("pointerdown", onInfoDown);
  renderer.domElement.addEventListener("pointerup", onInfoUp);
  const _ip = new THREE.Vector3();
  function updateInfo(time) {
    updateRideBadges(time);
    if (!INFO.length) return;
    const best = {};
    for (const t of INFO) {
      t.object.getWorldPosition(_ip);
      const d = Math.hypot(_ip.x - st.x, _ip.z - st.z);
      t.sprite.position.set(_ip.x, _ip.y + t.height + (stage.reducedMotion ? 0 : Math.sin(time * 2 + t.height) * 0.08), _ip.z);
      t.sprite.visible = d < 46 && worldVisible();
      const s = 0.55 + Math.min(1.6, d / 30);
      t.sprite.scale.setScalar(s);
      if (!best[t.id] || d < best[t.id].d) best[t.id] = { d, x: _ip.x, z: _ip.z };
    }
    for (const id in best) POS[id] = { x: best[id].x, z: best[id].z };
  }
  /* Small looping actions for idle NPCs (n.act): picking tea, working a wok,
     splashing water, dancing, rowing, praying. Arms only; cheap. */
  function actPose(n, time, dt) {
    const p = time * (n.rate || 1) + n.ph;
    n.armZ = 0; n.waveR = 0;
    switch (n.act) {
      case "pick":
        n.wave = -1.05 - 0.35 * Math.sin(p * 3.1);
        n.waveR = -0.9 - 0.45 * Math.sin(p * 3.1 + 1.7);
        break;
      case "work":
        n.wave = -0.9;
        n.waveR = -1.0 - 0.5 * Math.sin(p * 4.2);
        break;
      case "roll":
        n.wave = -1.1 + 0.25 * Math.sin(p * 5);
        n.waveR = -1.1 - 0.25 * Math.sin(p * 5);
        break;
      case "splash": {
        const c = (p * 0.9) % 1;
        const swing = c < 0.25 ? c / 0.25 : c < 0.4 ? 1 : Math.max(0, 1 - (c - 0.4) / 0.6);
        n.wave = -0.5;
        n.waveR = 0.3 - 2.6 * swing;
        n.splashPhase = c;
        break;
      }
      case "dance":
        n.armZ = 1.15 + 0.35 * Math.sin(p * 2.2);
        n.wave = -0.25 + 0.2 * Math.sin(p * 2.2 + 1);
        n.waveR = n.wave;
        n.yaw += dt * 0.5 * Math.sin(p * 0.4);
        n.bob = Math.abs(Math.sin(p * 2.2)) * 0.06;
        break;
      case "row":
        n.wave = -1.2 - 0.6 * Math.sin(p * 3.4);
        n.waveR = n.wave;
        break;
      case "pray":
        n.wave = -1.35;
        n.waveR = -1.35;
        break;
      case "pour":
        n.wave = -0.6;
        n.waveR = -1.25 - 0.3 * Math.max(0, Math.sin(p * 0.9));
        break;
      default:
        n.wave = 0;
    }
  }

  /* ---------- on-screen controls ---------- */
  const STR = {
    en: Object.assign({}, BASE_STR.en, { valley: opts.worldName.en }),
    zh: Object.assign({}, BASE_STR.zh, { valley: opts.worldName.zh }),
  };
  let lang = manager.language === "zh" ? "zh" : "en";
  const tr = () => STR[lang];
  const placeName = (p) => (lang === "zh" ? p.zh : p.n);
  const placeSub = (p) => (lang === "zh" ? p.zh : p.sub || "");
  const objectName = (id) => {
    const o = OBJECT_MAP[id];
    if (!o) return POS[id]?.label || id;
    return o.names[manager.language] || o.names[lang] || o.names.en;
  };
  const worldPanel = document.querySelector('[data-view-panel="world"]') || manager.container;
  const css = document.createElement("style");
  css.textContent = `
  .ktm-hud{position:absolute;top:calc(var(--ex-topbar-h,76px) + 16px);inset-inline-end:clamp(14px,3vw,44px);display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none;z-index:3}
  .ktm-hud>*{pointer-events:auto}
  .ktm-place{padding:8px 14px;border-radius:14px;background:var(--ex-panel,rgba(8,26,34,.78));border:1px solid var(--ex-border,rgba(232,205,151,.22));text-align:end;backdrop-filter:blur(8px)}
  .ktm-place b{display:block;font-family:var(--ex-serif,Georgia,serif);font-weight:600;font-size:15px;color:var(--ex-ink,#f8f0df)}
  .ktm-place span{display:block;margin-top:2px;font-family:"Manrope","Noto Nastaliq Urdu","Noto Sans Devanagari","Nirmala UI",sans-serif;font-size:12px;line-height:1.55;color:var(--ex-muted,#cfc6b3);unicode-bidi:plaintext}
  .ktm-map{display:block;width:176px;height:176px;border-radius:14px;border:1px solid var(--ex-border,rgba(232,205,151,.22));cursor:pointer}
  .ktm-row{display:flex;gap:6px}
  .ktm-btn{height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--ex-border-strong,rgba(232,205,151,.42));background:var(--ex-panel,rgba(8,26,34,.78));color:var(--ex-ink,#f8f0df);font:600 12px var(--ex-sans,system-ui);cursor:pointer;backdrop-filter:blur(8px)}
  .ktm-btn:hover{border-color:var(--ex-gold,#e6bc6a)}
  .ktm-btn--gold{background:var(--ex-gold,#e6bc6a);color:#1d1406;border-color:var(--ex-gold,#e6bc6a)}
  .ktm-menu{width:288px;max-height:min(62vh,460px);overflow:auto;padding:7px;border-radius:18px;background:linear-gradient(180deg,rgba(10,31,39,.98),rgba(7,22,29,.98));border:1px solid rgba(230,188,106,.28);box-shadow:0 24px 60px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter:blur(16px);scrollbar-width:thin;scrollbar-color:rgba(230,188,106,.35) transparent}
  .ktm-menu::-webkit-scrollbar{width:8px}
  .ktm-menu::-webkit-scrollbar-thumb{background:rgba(230,188,106,.28);border-radius:99px}
  .ktm-menu-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:8px 12px 9px;margin:0 0 5px;border-bottom:1px solid rgba(230,188,106,.18)}
  .ktm-menu-head span{font:600 16px var(--ex-serif,Georgia,serif);color:var(--ex-ink,#f8f0df)}
  .ktm-menu .ktm-menu-head small{font:700 9px/1 var(--ex-sans,system-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--ex-gold,#e6bc6a)}
  .ktm-menu button{display:grid;grid-template-columns:1fr;gap:1px;width:100%;text-align:start;padding:9px 12px 9px 14px;border:0;border-radius:11px;background:none;color:var(--ex-ink,#f8f0df);font:600 13.5px/1.3 var(--ex-serif,Georgia,serif);cursor:pointer;position:relative}
  .ktm-menu button:hover,.ktm-menu button:focus-visible{background:var(--ex-gold-soft,rgba(230,188,106,.16))}
  .ktm-menu button.is-here{background:rgba(230,188,106,.09)}
  .ktm-menu button.is-here::before{content:"";position:absolute;inset-inline-start:4px;top:14px;bottom:14px;width:3px;border-radius:99px;background:var(--ex-gold,#e6bc6a)}
  .ktm-menu small{display:flex;flex-wrap:wrap;align-items:baseline;gap:5px;font-family:"Manrope","Noto Nastaliq Urdu","Noto Sans Devanagari","Nirmala UI",sans-serif;font-weight:400;font-size:11px;line-height:1.65;color:var(--ex-muted,#cfc6b3)}
  .ktm-menu .ktm-local{unicode-bidi:plaintext;font-family:"Noto Nastaliq Urdu","Noto Sans Devanagari","Manrope","Nirmala UI",sans-serif;color:var(--ex-ink,#f8f0df);opacity:.86}
  .ktm-menu .ktm-sep{opacity:.4}
  .ktm-menu .ktm-dist{font-family:var(--ex-sans,system-ui);color:var(--ex-muted,#cfc6b3)}
  .ktm-prompt{position:absolute;left:50%;bottom:132px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:7px 8px 7px 16px;border-radius:999px;border:1px solid var(--ex-gold,#e6bc6a);background:var(--ex-panel,rgba(8,26,34,.86));color:var(--ex-ink,#f8f0df);font:600 13px var(--ex-sans,system-ui);white-space:nowrap;pointer-events:auto;z-index:3;cursor:pointer}
  .ktm-prompt kbd{font:700 11px ui-monospace,monospace;padding:3px 8px;border-radius:7px;background:var(--ex-gold,#e6bc6a);color:#1d1406}
  .ktm-joy{position:absolute;left:clamp(14px,3vw,44px);bottom:96px;width:124px;height:124px;border-radius:50%;border:1.5px solid rgba(248,240,223,.35);background:rgba(8,26,34,.35);pointer-events:auto;touch-action:none;z-index:3}
  .ktm-joy i{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:rgba(230,188,106,.9)}
  .ktm-arrive{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;color:var(--ex-ink,#f8f0df);text-shadow:0 2px 18px rgba(0,0,0,.7);transition:opacity .8s;z-index:3}
  .ktm-arrive small{display:block;font:700 11px var(--ex-sans,system-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--ex-gold,#e6bc6a)}
  .ktm-arrive strong{display:block;font:600 clamp(28px,5vw,44px)/1.1 var(--ex-serif,Georgia,serif)}
  .ktm-arrive span{font-size:17px}
  .ktm-fade{position:fixed;inset:0;background:#06141b;opacity:0;pointer-events:none;transition:opacity .45s;z-index:2}
  .ktm-fade.on{opacity:1}
  @media (max-width:760px){.ktm-hud{top:auto;bottom:74px;inset-inline-end:12px}.ktm-map,.ktm-place{display:none}.ktm-prompt{bottom:150px}.ktm-joy{bottom:84px;width:112px;height:112px}}
  `;
  document.head.appendChild(css);
  const hud = document.createElement("div");
  hud.className = "ktm-hud";
  hud.innerHTML = `<div class="ktm-place" aria-live="polite"><b data-k="pen"></b><span data-k="psub" dir="auto"></span></div>
    <canvas class="ktm-map" data-k="map" width="352" height="352"></canvas>
    <div class="ktm-row"><button type="button" class="ktm-btn" data-k="lang"></button><button type="button" class="ktm-btn" data-k="time"></button><button type="button" class="ktm-btn ktm-btn--gold" data-k="travel" aria-expanded="false"></button></div>
    <div class="ktm-menu" data-k="menu" hidden></div>`;
  worldPanel.appendChild(hud);
  const q = (k) => hud.querySelector(`[data-k="${k}"]`);
  const prompt = document.createElement("button");
  prompt.type = "button";
  prompt.className = "ktm-prompt";
  prompt.hidden = true;
  const arrive = document.createElement("div");
  arrive.className = "ktm-arrive";
  arrive.style.opacity = "0";
  const fade = document.createElement("div");
  fade.className = "ktm-fade";
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const joyEl = document.createElement("div");
  joyEl.className = "ktm-joy";
  joyEl.innerHTML = "<i></i>";
  joyEl.setAttribute("aria-hidden", "true");
  joyEl.hidden = !touch;
  [prompt, arrive, fade, joyEl].forEach((el) => worldPanel.appendChild(el));
  const hintEl = document.querySelector("#world-hint [data-i18n='world.dragHint']");
  const savedHint = hintEl ? hintEl.textContent : null;
  const menu = q("menu"), travelBtn = q("travel"), timeBtn = q("time"), langBtn = q("lang");
  const kmPer = opts.kmPerUnit || 0.035;
  function renderMenu() {
    menu.innerHTML = "";
    const head = document.createElement("div");
    head.className = "ktm-menu-head";
    const headTitle = document.createElement("span");
    headTitle.textContent = tr().travel;
    const headSub = document.createElement("small");
    headSub.textContent = lang === "zh" ? opts.worldName.zh : opts.worldName.en;
    head.append(headTitle, headSub);
    menu.appendChild(head);
    Object.keys(PL).forEach((k) => {
      const p = PL[k], b = document.createElement("button");
      b.type = "button";
      const d = Math.hypot(st.x - p.x, st.z - p.z);
      const here = d < p.r + 10;
      b.classList.toggle("is-here", here);
      const name = document.createElement("span");
      name.className = "ktm-name";
      name.textContent = placeName(p);
      const small = document.createElement("small");
      const local = document.createElement("span");
      local.className = "ktm-local";
      local.dir = "auto";
      local.textContent = placeSub(p);
      const sep = document.createElement("span");
      sep.className = "ktm-sep";
      sep.textContent = placeSub(p) ? "·" : "";
      const dist = document.createElement("span");
      dist.className = "ktm-dist";
      dist.textContent = here ? tr().here : "≈ " + Math.round(d * kmPer) + " " + tr().km;
      small.append(local, sep, dist);
      b.append(name, small);
      b.addEventListener("click", () => travelTo(k));
      menu.appendChild(b);
    });
  }
  const toggleMenu = (open) => {
    menu.hidden = !open;
    travelBtn.setAttribute("aria-expanded", String(open));
    if (open) renderMenu();
  };
  travelBtn.addEventListener("click", () => toggleMenu(menu.hidden));
  q("map").addEventListener("click", () => toggleMenu(true));
  timeBtn.addEventListener("click", () => {
    timeIdx = (timeIdx + 1) % TIMES.length;
    timeBtn.textContent = tr().times[timeIdx];
    setTime(TIMES[timeIdx]);
  });
  let nearId = null, lastPlace = "";
  function applyLanguage() {
    lang = manager.language === "zh" ? "zh" : "en";
    const t = tr();
    langBtn.textContent = t.langBtn;
    langBtn.setAttribute("aria-label", t.langLabel);
    timeBtn.textContent = t.times[timeIdx];
    travelBtn.textContent = t.travel;
    q("map").setAttribute("aria-label", t.map);
    if (hintEl) hintEl.textContent = (touch ? t.hintTouch : t.hintDesk) + (RIDES.length && !touch ? (lang === "zh" ? " · F 乘坐" : " · F to ride") : "");
    lastPlace = "";
    nearId = "__refresh__";
    promptKey = "";
    if (!menu.hidden) renderMenu();
  }
  langBtn.addEventListener("click", () => {
    const next = lang === "zh" ? "en" : "zh";
    const select = document.getElementById("language-select");
    if (select) {
      select.value = next;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (manager.language !== next) manager.language = next;
    applyLanguage();
  });
  const timers = [];
  function aimAt(p) {
    const look = p.look || [p.x, p.z];
    const yaw = Math.atan2(st.x - look[0], st.z - look[1]);
    controls.theta = controls.desiredTheta = yaw;
    st.face = yaw + Math.PI;
    controls.phi = controls.desiredPhi = p.pitch || 1.2;
    controls.radius = controls.desiredRadius = p.dist || 14;
  }
  function travelTo(k) {
    toggleMenu(false);
    if (riding) dismount(true);
    const p = PL[k];
    fade.classList.add("on");
    timers.push(window.setTimeout(() => {
      st.x = p.spawn[0];
      st.z = p.spawn[1];
      if (SLIDE) [st.x, st.z] = kit.resolve(st.x, st.z, PR);
      aimAt(p);
      arrive.innerHTML = "<small></small><strong></strong><span></span>";
      arrive.querySelector("small").textContent = tr().arriving;
      arrive.querySelector("strong").textContent = placeName(p);
      arrive.querySelector("span").textContent = placeSub(p);
      arrive.style.opacity = "1";
      timers.push(window.setTimeout(() => (arrive.style.opacity = "0"), 2200));
      fade.classList.remove("on");
    }, 480));
  }
  let promptKind = "", promptKey = "";
  prompt.addEventListener("click", () => {
    if (promptKind === "off") dismount();
    else if (promptKind === "ride" && nearRide) mount(nearRide);
    else if (nearId && POS[nearId]) manager.onSelect(nearId);
  });

  /* map */
  const mapC = q("map"), mg = mapC.getContext("2d"), MB = opts.mapBounds;
  const mapBg = document.createElement("canvas");
  mapBg.width = mapC.width;
  mapBg.height = mapC.height;
  const toMap = (x, z) => [((x - MB.x0) / (MB.x1 - MB.x0)) * mapC.width, ((z - MB.z0) / (MB.z1 - MB.z0)) * mapC.height];
  (function paintMap() {
    const g = mapBg.getContext("2d"), W = mapBg.width, H = mapBg.height, img = g.createImageData(W, H);
    for (let j = 0; j < H; j += 1) for (let i = 0; i < W; i += 1) {
      const x = MB.x0 + ((MB.x1 - MB.x0) * i) / W, z = MB.z0 + ((MB.z1 - MB.z0) * j) / H;
      const c = opts.mapColor(x, z), o = (j * W + i) * 4;
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = "rgba(60,45,30,.85)";
    g.lineWidth = 2.5;
    (opts.mapLines || []).forEach((line) => {
      g.beginPath();
      line.forEach((p, i) => {
        const [X, Y] = toMap(p[0], p[1]);
        if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
      });
      g.stroke();
    });
    Object.values(PL).forEach((p) => {
      const [X, Y] = toMap(p.x, p.z);
      g.fillStyle = "#fff3dc"; g.beginPath(); g.arc(X, Y, 5, 0, 7); g.fill();
      g.strokeStyle = "#5a3b10"; g.lineWidth = 2; g.stroke();
    });
  })();
  function drawMap() {
    mg.drawImage(mapBg, 0, 0);
    Object.values(POS).forEach((m) => {
      const [X, Y] = toMap(m.x, m.z);
      mg.fillStyle = "#e6bc6a"; mg.beginPath(); mg.arc(X, Y, 3, 0, 7); mg.fill();
    });
    RIDES.forEach((r) => {
      if (r === riding) return;
      const p = r.pos(), [rx, ry] = toMap(p.x, p.z);
      drawRideIcon(mg, r.kind, rx, ry, r === nearRide);
    });
    const [X, Y] = toMap(st.x, st.z);
    mg.save(); mg.translate(X, Y); mg.rotate(-st.face + Math.PI);
    mg.fillStyle = "#fff"; mg.strokeStyle = "#c8462e"; mg.lineWidth = 3;
    mg.beginPath(); mg.moveTo(0, -11); mg.lineTo(7, 8); mg.lineTo(0, 4); mg.lineTo(-7, 8); mg.closePath(); mg.stroke(); mg.fill();
    mg.restore();
  }

  /* input */
  const keysDown = {};
  const typing = (t) => t && t.matches && (t.matches("input, textarea, select") || t.isContentEditable);
  const worldVisible = () => worldPanel === manager.container || worldPanel.classList.contains("is-active");
  const onKeyDown = (e) => {
    if (typing(e.target) || document.querySelector("dialog[open]")) return;
    keysDown[e.code] = true;
    if (e.code === "KeyF" && worldVisible() && !e.repeat) {
      if (riding) dismount();
      else if (nearRide) mount(nearRide);
    }
    if (e.code === "KeyE" && nearId && POS[nearId] && worldVisible() && !(promptKind === "ride" && nearRide)) manager.onSelect(nearId);
    else if (e.code === "KeyE" && promptKind === "ride" && nearRide && worldVisible()) mount(nearRide);
  };
  const onKeyUp = (e) => { keysDown[e.code] = false; };
  const onBlur = () => Object.keys(keysDown).forEach((k) => (keysDown[k] = false));
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  const joy = { id: null, x: 0, y: 0, dx: 0, dy: 0 };
  const knob = joyEl.querySelector("i");
  const joyMove = (e) => {
    if (e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.x, dy = e.clientY - joy.y;
    const L = Math.hypot(dx, dy), mx = 48;
    if (L > mx) { dx *= mx / L; dy *= mx / L; }
    joy.dx = dx / mx; joy.dy = dy / mx;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  const joyUp = (e) => {
    if (e.pointerId !== joy.id) return;
    joy.id = null; joy.dx = joy.dy = 0; knob.style.transform = "";
  };
  joyEl.addEventListener("pointerdown", (e) => {
    joy.id = e.pointerId;
    const r = joyEl.getBoundingClientRect();
    joy.x = r.left + r.width / 2; joy.y = r.top + r.height / 2;
    joyEl.setPointerCapture(e.pointerId);
    joyMove(e);
    e.preventDefault();
  });
  joyEl.addEventListener("pointermove", joyMove);
  joyEl.addEventListener("pointerup", joyUp);
  joyEl.addEventListener("pointercancel", joyUp);

  /* follow camera: stay above ground and in front of buildings */
  const camDir = new THREE.Vector3();
  controls.updateCamera = function patchedUpdateCamera() {
    saved.updateCamera.call(this);
    const t = this.target;
    camDir.copy(camera.position).sub(t);
    const dist = camDir.length();
    camDir.normalize();
    let allowed = dist;
    for (let s = 1.6; s <= dist; s += 0.5) {
      if (kit.blocked(t.x + camDir.x * s, t.z + camDir.z * s, 0.35)) { allowed = Math.max(1.6, s - 0.7); break; }
    }
    st.camD = st.camD == null ? allowed : st.camD + (allowed - st.camD) * (allowed < st.camD ? 0.5 : 0.08);
    /* When the visitor deliberately zooms in or out, let the requested
       distance win instead of the building-clearance cap. This is what makes
       the zoom buttons and wheel work in dense worlds; normal follow still
       uses collision clearance. */
    camera.position.copy(t).addScaledVector(camDir, this.zoomOverride ? dist : Math.min(dist, st.camD));
    const gy = opts.hgt(camera.position.x, camera.position.z) + 0.8;
    if (camera.position.y < gy) camera.position.y = gy;
    camera.lookAt(t);
  };

  const nearPlace = () => {
    let best = null, bd = 1e9;
    for (const k in PL) {
      const p = PL[k], d = Math.hypot(st.x - p.x, st.z - p.z);
      if (d < p.r + 60 && d < bd) { bd = d; best = p; }
    }
    return best;
  };
  let frame = 0;
  function update(time, delta) {
    frame += 1;
    const dt = Math.min(delta || 0.016, 0.05);
    const reduced = stage.reducedMotion;
    if (!st.ready) {
      st.ready = true;
      aimAt(startP);
      applyLanguage();
    }
    controls.autoRotate = false;
    if (controls.transition) {
      const to = controls.transition.to;
      if (to.target && to.target.distanceTo(controls.home.target) < 0.01) {
        controls.desiredRadius = 15;
        controls.desiredPhi = 1.2;
      }
      controls.transition = null;
    }
    let ix = 0, iz = 0;
    if (keysDown.KeyW) iz += 1;
    if (keysDown.KeyS) iz -= 1;
    if (keysDown.KeyA) ix -= 1;
    if (keysDown.KeyD) ix += 1;
    let run = keysDown.ShiftLeft || keysDown.ShiftRight;
    if (joy.id !== null) { ix += joy.dx; iz -= joy.dy; run = run || Math.hypot(joy.dx, joy.dy) > 0.92; }
    const L = Math.hypot(ix, iz);
    let moving = false;
    let gy;
    if (riding) {
      /* steering a ridden elephant or boat: the vehicle decides where it can go */
      let mx = 0, mz = 0, n = 0;
      if (L > 0.08 && worldVisible()) {
        n = Math.min(1, L);
        const th = controls.theta, ux = ix / L, uz = iz / L;
        mx = -Math.sin(th) * uz + Math.cos(th) * ux;
        mz = -Math.cos(th) * uz - Math.sin(th) * ux;
      }
      const seat = riding.step(dt, { mx, mz, n, run, reduced, time });
      st.x = seat.x; st.z = seat.z; st.face = seat.face; st.speed = 0;
      gy = seat.y;
    } else if (L > 0.08 && worldVisible()) {
      const n = Math.min(1, L);
      ix /= L; iz /= L;
      const th = controls.theta;
      const fx = -Math.sin(th), fz = -Math.cos(th), rx = Math.cos(th), rz = -Math.sin(th);
      const mx = fx * iz + rx * ix, mz = fz * iz + rz * ix, sp = (run ? (opts.runSpeed || 12) : 4.6) * n;
      if (SLIDE) {
        /* sub-stepped push-out: the walker slides along walls and round corners */
        const stepLen = sp * dt, steps = Math.max(1, Math.ceil(stepLen / 0.25));
        for (let k = 0; k < steps; k += 1) {
          const tx = st.x + (mx * stepLen) / steps, tz = st.z + (mz * stepLen) / steps;
          const [rx, rz] = pushDyn(...kit.resolve(tx, tz, PR));
          if (opts.canStand(rx, rz)) { st.x = rx; st.z = rz; }
          else {
            const [ax, az] = kit.resolve(tx, st.z, PR);
            if (opts.canStand(ax, az)) { st.x = ax; st.z = az; }
            else {
              const [bx2, bz2] = kit.resolve(st.x, tz, PR);
              if (opts.canStand(bx2, bz2)) { st.x = bx2; st.z = bz2; }
              else break;
            }
          }
        }
      } else {
        const nx = st.x + mx * sp * dt, nz = st.z + mz * sp * dt;
        if (opts.canStand(nx, nz)) { st.x = nx; st.z = nz; }
        else if (opts.canStand(nx, st.z)) st.x = nx;
        else if (opts.canStand(st.x, nz)) st.z = nz;
      }
      let df = Math.atan2(mx, mz) - st.face;
      df = Math.atan2(Math.sin(df), Math.cos(df));
      st.face += df * Math.min(1, dt * 10);
      st.walk += dt * sp * 1.5;
      st.speed = sp;
      moving = true;
    } else st.speed = 0;
    if (gy === undefined) gy = opts.groundY(st.x, st.z);
    player.root.position.set(st.x, gy, st.z);
    player.inner.rotation.y = st.face;
    if (riding) (riding.pose === "straddle" ? player.straddle() : riding.pose === "stand" ? player.pose(0) : player.sit());
    else player.pose(moving ? Math.sin(st.walk) * Math.min(0.75, st.speed * 0.09) : 0);
    player.inner.position.y = moving ? Math.abs(Math.cos(st.walk)) * 0.05 : 0;
    controls.target.set(st.x, gy + (riding ? riding.camLift || 1.6 : 1.6), st.z);
    controls.desiredTarget.copy(controls.target);
    sun.position.set(st.x + sunDir.x * 260, gy + sunDir.y * 260, st.z + sunDir.z * 260);
    sun.target.position.set(st.x, gy, st.z);
    sun.target.updateMatrixWorld();

    if (!reduced && frame % 2 === 0 && flagIM) {
      const F = kit.FLAGS;
      for (let i = 0; i < F.length; i += 1) {
        const f = F[i];
        if (Math.abs(f.x - st.x) > 140 || Math.abs(f.z - st.z) > 140) continue;
        _o.position.set(f.x, f.y, f.z); _o.rotation.set(Math.sin(time * 3.2 + f.ph) * 0.38, f.yaw, 0); _o.scale.set(1, 1, 1); _o.updateMatrix();
        flagIM.setMatrixAt(i, _o.matrix);
      }
      flagIM.instanceMatrix.needsUpdate = true;
    }

    NPC.forEach((n) => {
      if (Math.abs(n.x - st.x) > 260 && Math.abs(n.z - st.z) > 260 && frame % 8 !== 0) return;
      let mov = true;
      if (n.kind === "kora") {
        if (!reduced) n.a += (dt * n.sp) / n.r;
        n.x = n.cx + Math.cos(n.a) * n.r; n.z = n.cz + Math.sin(n.a) * n.r; n.yaw = -n.a;
      } else if (n.kind === "road") {
        const pts = n.pts, L2 = pts.length - 1;
        if (!reduced) n.t += (n.dir * dt * n.sp * 1.1) / (n.len || L2 * 2);
        if (n.t > n.t1) { n.t = n.t1; n.dir = -1; } else if (n.t < n.t0) { n.t = n.t0; n.dir = 1; }
        const f = n.t * L2, i0 = Math.min(L2 - 1, Math.floor(f)), u = f - i0;
        const a = pts[i0], b = pts[i0 + 1];
        const tx = b.x - a.x, tz = b.z - a.z, LL = Math.hypot(tx, tz) || 1;
        n.x = a.x + tx * u - (tz / LL) * n.off * n.dir; n.z = a.z + tz * u + (tx / LL) * n.off * n.dir;
        n.yaw = Math.atan2(tx * n.dir, tz * n.dir);
      } else if (n.kind === "script") {
        /* position driven by the world (caravans, boats); n.moving animates the legs */
        mov = Boolean(n.moving);
        if (n.act && !reduced) actPose(n, time, dt);
      } else if (n.kind === "idle") {
        mov = false;
        if (n.act && !reduced) actPose(n, time, dt);
        else n.wave = Math.sin(time * 1.3 + n.ph) > 0.97 ? -1.2 : 0;
      } else {
        if (n.wait > 0) { n.wait -= dt; mov = false; }
        else {
          const dx = n.tx - n.x, dz = n.tz - n.z, d = Math.hypot(dx, dz);
          if (d < 0.4 || !n.tx) {
            const a = kit.rnd() * 6.28, r = kit.rr(2, n.R || 4);
            n.tx = n.cx + Math.cos(a) * r; n.tz = n.cz + Math.sin(a) * r; n.wait = kit.rr(1, 6);
          } else if (!reduced) {
            const nx2 = n.x + (dx / d) * dt * n.sp, nz2 = n.z + (dz / d) * dt * n.sp;
            if (kit.blocked(nx2, nz2, 0.4) || !opts.canStand(nx2, nz2)) { n.tx = 0; n.wait = kit.rr(0.5, 2); }
            else { n.x = nx2; n.z = nz2; n.yaw = Math.atan2(dx, dz); }
          }
        }
      }
      n.y = n.fixedY != null ? n.fixedY : opts.groundY(n.x, n.z);
      const walkPh = time * 6 * n.sp + n.ph;
      n.swing = mov && !reduced ? Math.sin(walkPh) * 0.55 : 0;
      if (!(n.act === "dance" && !mov)) n.bob = mov && !reduced ? Math.abs(Math.cos(walkPh)) * 0.04 : 0;
    });
    if (crowd) crowd.update();
    extraUpdates.forEach((fn) => fn(time, dt, st));
    updateInfo(time);

    let best = null, bd = 10;
    stage.interactives.forEach((entry) => {
      const p = POS[entry.id];
      if (!p) return;
      const d = Math.hypot(p.x - st.x, p.z - st.z);
      entry.label.sprite.visible = d < 110;
      const s = d > 40 ? Math.min(3.4, d / 40) : 1;
      entry.label.sprite.scale.set((entry.label.sprite.scale.x / entry.label.sprite.scale.y) * 0.95 * s, 0.95 * s, 1);
      entry.beacon.group.scale.setScalar(1.6 * Math.max(1, d / 50));
      if (d < bd) { bd = d; best = entry.id; }
    });
    /* nearest rideable within reach (only when walking) */
    let bestInfo = false;
    if (best === null && INFO.length) {
      /* moving info targets (animals) also count as nearby discoveries */
      for (const t of INFO) {
        const p = POS[t.id];
        if (!p) continue;
        const d = Math.hypot(p.x - st.x, p.z - st.z);
        if (d < 7 && d < bd) { bd = d; best = t.id; bestInfo = true; }
      }
    }
    nearRide = null;
    if (!riding) {
      let rd = 1e9;
      RIDES.forEach((r) => { const p = r.pos(), d = Math.hypot(p.x - st.x, p.z - st.z); if (d < r.radius && d < rd) { rd = d; nearRide = r; } });
      /* Rideables take priority over nearby beacons: F should mount at a pier or trek station. */
      /* ...and over an animal's ⓘ (it stays clickable): standing by a camel, the prompt says "Ride" */
      if (nearRide && bestInfo) best = null;
    }
    if (best !== nearId) { nearId = best; promptKey = ""; }
    const kind = riding ? "off" : nearRide ? "ride" : best ? "learn" : "";
    const key = kind + "|" + (kind === "ride" ? RIDES.indexOf(nearRide) : kind === "learn" ? best : "") + "|" + lang;
    if (key !== promptKey) {
      promptKey = key;
      promptKind = kind;
      if (!kind) prompt.hidden = true;
      else {
        const k2 = kind === "learn" ? (touch ? "Tap" : "E") : touch ? "Tap" : "F";
        prompt.innerHTML = `<span></span><kbd>${k2}</kbd>`;
        const R2 = RIDE_STR[lang];
        prompt.firstChild.textContent = kind === "off" ? R2.off + (riding.label ? (lang === "zh" ? "" : " · ") + riding.label[lang] : "")
          : kind === "ride" ? R2.ride + (lang === "zh" ? "" : " ") + nearRide.label[lang]
            : tr().learn + (lang === "zh" ? "：" : " ") + objectName(best);
        prompt.hidden = false;
      }
    }
    if (frame % 15 === 0) {
      if ((manager.language === "zh" ? "zh" : "en") !== lang) applyLanguage();
      const p = nearPlace(), k = p ? placeName(p) : tr().valley;
      if (k !== lastPlace) {
        lastPlace = k;
        q("pen").textContent = k;
        q("psub").textContent = p ? placeSub(p) : lang === "zh" ? opts.worldName.en : opts.worldName.sub || "";
      }
    }
    if (frame % 4 === 0) drawMap();
  }

  let flagIM = null;
  function start() {
    const F = kit.FLAGS;
    if (F.length) {
      const g = new THREE.PlaneGeometry(0.44, 0.54);
      g.translate(0, -0.27, 0);
      flagIM = new THREE.InstancedMesh(stage.trackGeometry(g), kit.M({ side: THREE.DoubleSide, roughness: 0.9 }), F.length);
      const cs = (opts.flagColors || ["#2f62c8", "#f4f1ea", "#c8382a", "#2e8e4a", "#e8b82a"]).map(col);
      F.forEach((f, i) => {
        flagIM.setColorAt(i, cs[f.c % cs.length]);
        _o.position.set(f.x, f.y, f.z); _o.rotation.set(0, f.yaw, 0); _o.scale.set(1, 1, 1); _o.updateMatrix();
        flagIM.setMatrixAt(i, _o.matrix);
      });
      flagIM.castShadow = true;
      stage.add(flagIM);
    }
    if (NPC.length) {
      crowd = makeCrowd(figMat, NPC);
      crowd.meshes.forEach((m) => stage.add(m));
      crowd.geometries.forEach((g) => stage.trackGeometry(g));
    }
    setTime(TIMES[0]);
    stage.animate(update);
  }

  const baseDispose = stage.dispose.bind(stage);
  stage.dispose = () => {
    camera.near = saved.near;
    camera.far = saved.far;
    camera.updateProjectionMatrix();
    renderer.toneMappingExposure = saved.exposure;
    Object.assign(controls, { maxTargetY: saved.maxTargetY, minTargetY: saved.minTargetY, minPhi: saved.minPhi, maxPhi: saved.maxPhi });
    controls.updateCamera = saved.updateCamera;
    renderer.domElement.removeEventListener("pointerdown", onInfoDown);
    renderer.domElement.removeEventListener("pointerup", onInfoUp);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    timers.forEach((t) => window.clearTimeout(t));
    [hud, prompt, arrive, fade, joyEl, css].forEach((el) => el.remove());
    if (hintEl && savedHint != null) hintEl.textContent = savedHint;
    if (window.__walk && window.__walk.st === st) delete window.__walk;
    baseDispose();
  };

  const api = {
    st, sun, hemi, sunDir, skyU, setTime, lights, interactive, controls, stage, addNpc, pick, D, NPC, start, travelTo, figMat, kit, player,
    getTimeIdx: () => timeIdx, getLang: () => lang, POS, places: opts.places,
    addRideable, mount, dismount, isRiding: () => riding, RIDES, addBlocker, addInfoTarget, INFO,
    onUpdate: (fn) => extraUpdates.push(fn),
    setTimeIdx: (i) => { timeIdx = i; timeBtn.textContent = tr().times[i]; setTime(TIMES[i]); },
  };
  window.__walk = api;
  return api;
}
