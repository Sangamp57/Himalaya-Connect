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

  /* collision: circles in a grid */
  const BG = new Map(), BC = 10;
  function block(x, z, r) {
    const x0 = Math.floor((x - r) / BC), x1 = Math.floor((x + r) / BC), z0 = Math.floor((z - r) / BC), z1 = Math.floor((z + r) / BC);
    for (let a = x0; a <= x1; a += 1) for (let b = z0; b <= z1; b += 1) {
      const k = a + "," + b;
      if (!BG.has(k)) BG.set(k, []);
      BG.get(k).push([x, z, r]);
    }
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

  return { rnd, rr, track, M, ctex, noiseFill, repeatTex, mk, bx, cy, block, blockRect, blocked, ribbon, flagString, FLAGS, _o: new THREE.Object3D() };
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
export function createWalker(opts) {
  const { scene, stage, manager, kit, places: PL } = opts;
  const { _o } = kit;
  const camera = manager.camera, controls = manager.controls, renderer = manager.renderer;
  const LOWQ = stage.quality === "low";

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
    if (hintEl) hintEl.textContent = touch ? t.hintTouch : t.hintDesk;
    lastPlace = "";
    nearId = "__refresh__";
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
    const p = PL[k];
    fade.classList.add("on");
    timers.push(window.setTimeout(() => {
      st.x = p.spawn[0];
      st.z = p.spawn[1];
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
  prompt.addEventListener("click", () => {
    if (nearId && POS[nearId]) manager.onSelect(nearId);
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
    if (e.code === "KeyE" && nearId && POS[nearId] && worldVisible()) manager.onSelect(nearId);
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
    camera.position.copy(t).addScaledVector(camDir, Math.min(dist, st.camD));
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
    if (L > 0.08 && worldVisible()) {
      const n = Math.min(1, L);
      ix /= L; iz /= L;
      const th = controls.theta;
      const fx = -Math.sin(th), fz = -Math.cos(th), rx = Math.cos(th), rz = -Math.sin(th);
      const mx = fx * iz + rx * ix, mz = fz * iz + rz * ix, sp = (run ? (opts.runSpeed || 12) : 4.6) * n;
      const nx = st.x + mx * sp * dt, nz = st.z + mz * sp * dt;
      if (opts.canStand(nx, nz)) { st.x = nx; st.z = nz; }
      else if (opts.canStand(nx, st.z)) st.x = nx;
      else if (opts.canStand(st.x, nz)) st.z = nz;
      let df = Math.atan2(mx, mz) - st.face;
      df = Math.atan2(Math.sin(df), Math.cos(df));
      st.face += df * Math.min(1, dt * 10);
      st.walk += dt * sp * 1.5;
      st.speed = sp;
      moving = true;
    } else st.speed = 0;
    const gy = opts.groundY(st.x, st.z);
    player.root.position.set(st.x, gy, st.z);
    player.inner.rotation.y = st.face;
    player.pose(moving ? Math.sin(st.walk) * Math.min(0.75, st.speed * 0.09) : 0);
    player.inner.position.y = moving ? Math.abs(Math.cos(st.walk)) * 0.05 : 0;
    controls.target.set(st.x, gy + 1.6, st.z);
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
      } else if (n.kind === "idle") {
        mov = false;
        n.wave = Math.sin(time * 1.3 + n.ph) > 0.97 ? -1.2 : 0;
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
      n.y = opts.groundY(n.x, n.z);
      const walkPh = time * 6 * n.sp + n.ph;
      n.swing = mov && !reduced ? Math.sin(walkPh) * 0.55 : 0;
      n.bob = mov && !reduced ? Math.abs(Math.cos(walkPh)) * 0.04 : 0;
    });
    if (crowd) crowd.update();
    extraUpdates.forEach((fn) => fn(time, dt, st));

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
    if (best !== nearId) {
      nearId = best;
      if (best) {
        prompt.innerHTML = `<span></span><kbd>${touch ? "Tap" : "E"}</kbd>`;
        prompt.firstChild.textContent = tr().learn + (lang === "zh" ? "：" : " ") + objectName(best);
        prompt.hidden = false;
      } else prompt.hidden = true;
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
    st, sun, hemi, sunDir, setTime, lights, interactive, controls, stage, addNpc, pick, D, NPC, start, travelTo, figMat,
    onUpdate: (fn) => extraUpdates.push(fn),
    setTimeIdx: (i) => { timeIdx = i; timeBtn.textContent = tr().times[i]; setTime(TIMES[i]); },
  };
  window.__walk = api;
  return api;
}
