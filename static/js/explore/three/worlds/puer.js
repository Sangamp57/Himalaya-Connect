import * as THREE from "three";
import { bird } from "../helpers.js";
import { buildWalkableTown } from "./walk-town.js";
import { fbm, ss, lerp, mulberry } from "./walk-engine.js";
import { createFx, SKY_PRESETS, mergeGeometries, tint, lathe, cardCluster } from "./yunnan-fx.js";
import { boxUV, cylUV, roofGeometry, latticeTextures, signTexture, makeAnimal, lanternGeometry, species, plant, stiltHouse } from "./yunnan-props.js";
import { createFauna } from "./fauna.js";
import { animalId } from "../../wildlife-data.js";

/* Walkable Pu'er 普洱: terraced tea mountains, a tea-making village, the
   Jingmai ancient tea forest with a Bulang village, and a post station on
   the Tea Horse Road. A stylised composite, distances compressed. */

const B = { x0: -320, x1: 320, z0: -320, z1: 320 };
const VALLEY = 10;
const HILLS = [
  { x: -150, z: 70, R: 105, peak: 44, step: 2.4, seed: 1.3, paths: [-0.29, 2.55] },
  { x: 110, z: 150, R: 72, peak: 28, step: 2.2, seed: 4.1, paths: [-2.19, 0.9] },
];
const JM = { x: 180, z: -150, R: 100, peak: 30 };
const STREAM = [[-330, -40], [-255, -92], [-185, -118], [-152, -128], [-150, -141], [-150, -154], [-140, -185], [-100, -235], [-60, -330]];
const ROAD = [[8, -22], [-14, -50], [-50, -86], [-92, -115], [-122, -136], [-134, -141], [-166, -141], [-180, -146], [-205, -152], [-238, -168], [-268, -210], [-292, -262], [-305, -300]];
const PADS = [
  // x, z, radius, height (null = natural)
  [0, 0, 34, VALLEY + 1],
  [62, -14, 24, VALLEY + 1],
  [36, 46, 15, VALLEY + 1],
  [-30, -30, 15, VALLEY + 1],
  [112, -206, 30, null],
  [-205, -180, 27, null],
  [-150, 70, 9, null],
  [-100, 46, 8, null],
];
const BRIDGE = { x0: -160, x1: -140, z: -141, width: 3.4 };

function angN(th, s) {
  return 0.5 * Math.sin(3 * th + s) + 0.3 * Math.sin(5 * th + 2.1 * s) + 0.2 * Math.sin(7 * th + 0.7 * s);
}
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
  let t = ((px - ax) * dx + (pz - az) * dz) / L2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
function polyDist(px, pz, pts) {
  let d = 1e9;
  for (let i = 0; i < pts.length - 1; i += 1) d = Math.min(d, segDist(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  return d;
}
const smoothPts = (pts, n) => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z))).getSpacedPoints(n).map((v) => [v.x, v.z]);
const STREAM_S = smoothPts(STREAM, 90);

function hillInfo(H, x, z) {
  const dx = x - H.x, dz = z - H.z, r = Math.hypot(dx, dz);
  if (r > H.R * 1.25) return null;
  const k = 1 + 0.1 * angN(Math.atan2(dz, dx), H.seed);
  const re = r / k;
  if (re >= H.R) return null;
  const hh = H.peak * 0.5 * (1 + Math.cos((Math.PI * re) / H.R));
  const lv = hh / H.step, fl = Math.floor(lv), fr = lv - fl;
  const q = (fl + ss(0.72, 1, fr)) * H.step;
  return { re, hh, q, fr, w: ss(H.R, H.R * 0.82, re) };
}

function baseH(x, z) {
  let h = VALLEY + (fbm(x * 0.011 + 3.1, z * 0.011 - 1.7, 4) - 0.5) * 9;
  const d = Math.hypot(x * 0.92, z);
  h += ss(205, 420, d) * (32 + fbm(x * 0.006 + 7, z * 0.006 - 2, 5) * 130);
  /* far ridges with valleys between them (the "sea of clouds" sits in those) */
  h += ss(330, 700, d) * (fbm(x * 0.004 - 4, z * 0.004 + 9, 4) - 0.45) * 160;
  const jr = Math.hypot(x - JM.x, z - JM.z);
  if (jr < JM.R) h += JM.peak * 0.5 * (1 + Math.cos((Math.PI * jr) / JM.R)) * (0.85 + fbm(x * 0.03, z * 0.03, 3) * 0.3);
  return h;
}
function hillH(x, z) {
  let h = baseH(x, z);
  for (const H of HILLS) {
    const i = hillInfo(H, x, z);
    if (i) h = lerp(h, VALLEY + i.q, i.w);
  }
  return h;
}
const PAD_H = PADS.map(([x, z, r, h]) => (h == null ? hillH(x, z) : h));
function noStream(x, z) {
  let h = hillH(x, z);
  PADS.forEach(([cx, cz, r], i) => {
    const d = Math.hypot(x - cx, z - cz);
    if (d < r + 14) h = lerp(h, PAD_H[i], ss(r + 14, r, d));
  });
  return h;
}
function streamDist(x, z) {
  if (x > -40 && z > -120) return 1e9;
  return polyDist(x, z, STREAM_S);
}
function heightFn(x, z) {
  let h = noStream(x, z);
  const sd = streamDist(x, z);
  if (sd < 12) h -= 3.4 * ss(11, 2.2, sd);
  return h;
}
const waterY = (x, z) => noStream(x, z) - 2.3;

/* where tea grows, where grass grows, how the ground is coloured */
function colorFn(x, z, h) {
  const n = fbm(x * 0.05, z * 0.05, 3), n2 = fbm(x * 0.21 + 4, z * 0.21, 2);
  let c = new THREE.Color("#5f7a37").lerp(new THREE.Color("#86934a"), n).lerp(new THREE.Color("#4d6a30"), n2 * 0.5);
  for (const H of HILLS) {
    const i = hillInfo(H, x, z);
    if (i && i.w > 0.3) {
      const soil = new THREE.Color("#8d5a3a").lerp(new THREE.Color("#a3683f"), n2);
      const flat = new THREE.Color("#6a7a38").lerp(soil, 0.12 + n * 0.18);
      c = c.lerp(i.fr > 0.7 ? soil : flat, i.w);
    }
  }
  const jr = Math.hypot(x - JM.x, z - JM.z);
  if (jr < JM.R) c.lerp(new THREE.Color("#3c4f28").lerp(new THREE.Color("#4f5a30"), n), ss(JM.R, JM.R * 0.7, jr));
  PADS.forEach(([cx, cz, r]) => {
    const d = Math.hypot(x - cx, z - cz);
    if (d < r) c.lerp(new THREE.Color("#8f7556").lerp(new THREE.Color("#7a6a4c"), n), ss(r, r * 0.55, d) * 0.85);
  });
  const sd = streamDist(x, z);
  if (sd < 9) c.lerp(new THREE.Color("#4e4434"), ss(9, 4, sd));
  const d0 = Math.hypot(x * 0.92, z);
  if (d0 > 300) c.lerp(new THREE.Color("#33492a").lerp(new THREE.Color("#4a5a36"), n), ss(300, 380, d0));
  if (h > 120) c.lerp(new THREE.Color("#6d6658"), ss(120, 190, h));
  return c;
}

export default function buildPuer({ scene, stage, manager }) {
  const LOW = stage.quality === "low";
  /* state shared between the build and people callbacks (fresh on every load) */
  const WORK = {}, PRESS = {}, TERR = {}, STATION = {}, ANIMALS = [];
  const CARAVAN = { s: 30, dir: 1, wait: 0 };
  const rnd = mulberry(20261105);
  const rr = (a, b) => a + (b - a) * rnd();
  const fx = createFx({ stage, manager });
  const nightMats = [];
  const anims = [];
  const lights = [];
  const PATHS = [];

  const places = {
    village: { n: "Tea Village", zh: "茶山村寨", sub: "普洱茶山村寨", x: 0, z: 0, r: 34, spawn: [14, 26], look: [-30, -30], pitch: 1.47, dist: 13 },
    teahouse: { n: "Tea House", zh: "茶馆", sub: "功夫茶馆", x: -30, z: -30, r: 14, spawn: [-16, -16], look: [-30, -30], pitch: 1.47, dist: 11 },
    workshop: { n: "Tea Workshop", zh: "制茶坊", sub: "杀青 · 揉捻 · 晒青", x: 62, z: -14, r: 24, spawn: [44, -10], look: [64, -18], pitch: 1.47, dist: 12 },
    press: { n: "Cake Press", zh: "压饼坊", sub: "七子饼", x: 36, z: 46, r: 15, spawn: [26, 36], look: [38, 48], pitch: 1.47, dist: 11 },
    terraces: { n: "Tea Terraces", zh: "茶山梯田", sub: "茶山梯田", x: -100, z: 46, r: 30, spawn: [-84, 40], look: [-150, 70], pitch: 1.47, dist: 13 },
    summit: { n: "Tea Hill Summit", zh: "茶山之巅", sub: "云海观景亭", x: -150, z: 70, r: 18, spawn: [-142, 62], look: [-60, 10], pitch: 1.47, dist: 13 },
    jingmai: { n: "Jingmai Ancient Tea Forest", zh: "景迈山古茶林", sub: "景迈山古茶林 · 世界遗产", x: 172, z: -142, r: 40, spawn: [150, -128], look: [180, -150], pitch: 1.47, dist: 12 },
    bulang: { n: "Bulang Village", zh: "布朗族村寨", sub: "芒景布朗族村寨", x: 112, z: -206, r: 30, spawn: [124, -180], look: [112, -210], pitch: 1.47, dist: 13 },
    caravan: { n: "Tea Horse Road", zh: "茶马古道", sub: "茶马古道", x: -92, z: -115, r: 22, spawn: [-80, -104], look: [-120, -136], pitch: 1.47, dist: 12 },
    bridge: { n: "Covered Bridge", zh: "风雨桥", sub: "风雨桥", x: -150, z: -141, r: 16, spawn: [-128, -138], look: [-150, -141], pitch: 1.47, dist: 11 },
    station: { n: "Post Station", zh: "茶马驿站", sub: "那柯里式马店驿站", x: -205, z: -180, r: 27, spawn: [-199, -150], look: [-205, -180], pitch: 1.47, dist: 13 },
  };

  /* map colours */
  const mapColor = (x, z) => {
    const c = colorFn(x, z, heightFn(x, z));
    if (streamDist(x, z) < 4.6) return [64, 112, 120];
    if (polyDist(x, z, ROAD) < 2.2) return [170, 150, 120];
    return [c.r * 255, c.g * 255, c.b * 255].map((v) => Math.min(255, v * 1.1));
  };

  const W = buildWalkableTown({
    scene,
    stage,
    manager,
    seed: 20261105,
    terrain: {
      heightFn,
      colorFn,
      segments: LOW ? 200 : 340,
      material: (M) => {
        const s = fx.surface("ground", { repeat: [150, 150], seed: 12 });
        return M({ vertexColors: true, roughness: 1, map: s.map, normalMap: s.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughnessMap: s.roughnessMap });
      },
    },
    water: [],
    places,
    startPlace: "village",
    worldName: { en: "Pu'er Tea Mountains", zh: "普洱茶山", sub: "普洱 · 云南" },
    mapBounds: B,
    mapLines: [ROAD, [[0, 0], [62, -14]], [[0, 0], [36, 46]], [[0, 0], [-90, 52], [-150, 70]], [[16, -12], [112, -98], [172, -142]], [[138, -118], [112, -206]]],
    mapColor,
    kmPerUnit: 0.03,
    fogDensity: 0.0017,
    exposureScale: 0.9,
    far: 4200,
    nightMats,
    waterMask: (x, z) => streamDist(x, z) < 4.4,
    walker: {
      collision: "slide",
      skyKeys: SKY_PRESETS.puer,
      runSpeed: 12,
      onTime: (info) => {
        fx.setMood(info);
        lights.forEach((l) => (l.intensity = l.userData.base * Math.min(1, info.night * 1.4 + (info.y < 0.08 ? 0.4 : 0))));
      },
    },
    build: (ctx) => buildWorld(ctx),
    people: (Wk) => addPeople(Wk),
  });
  W.fx = fx;

  return W;

  /* ===================================================================== */
  function buildWorld({ kit, W: Wk, stage: st, hgt, groundY, makePath, addBridge, M, canStand }) {
    fx.attach(Wk);
    const F = fx;
    /* interactive() clones a building's materials for its highlight; keep night glow on the clones */
    const interact = (id, g, label, pos, o) => {
      const e = Wk.interactive(id, g, label, pos, o);
      g.traverse((c) => { if (c.material && c.material.userData && c.material.userData.night && !nightMats.includes(c.material)) nightMats.push(c.material); });
      return e;
    };
    const { blockBox, block } = kit;

    /* ------------------------------------------------ materials */
    const mats = {
      road: F.pbr("flagstone", { color: "#8d8778", color2: "#6f6a5e", color3: "#3d3a30", moss: true, cells: 5, repeat: [1, 1.2], seed: 31 }),
      plaza: F.pbr("flagstone", { color: "#a39a88", color2: "#8a8170", color3: "#4d463a", moss: true, cells: 6, repeat: [6, 6], seed: 32 }),
      dirt: F.pbr("ground", { repeat: [0.6, 0.6], seed: 33, bump: 1.4 }, { color: "#a07a5e", polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      earthWall: F.pbr("earth", { color: "#b38a62", color2: "#9c7552", color3: "#6d5038", layers: 10, seed: 34 }),
      plaster: F.pbr("plaster", { color: "#e6dfcf", color2: "#d3cab6", color3: "#9b927d", seed: 35 }),
      timber: F.pbr("planks", { color: "#6e452a", color2: "#58361f", color3: "#2c1a0f", boards: 5, seed: 36 }),
      timberDark: F.pbr("planks", { color: "#4a2e1c", color2: "#3a2416", color3: "#1c120a", boards: 6, seed: 37 }),
      tile: F.pbr("tiles", { color: "#5f6366", color2: "#4e5255", color3: "#2f3234", lichen: true, seed: 38 }, { side: THREE.DoubleSide }),
      thatch: F.pbr("thatch", { color: "#a58a55", color2: "#7d6a42", color3: "#4a3b22", seed: 39 }, { side: THREE.DoubleSide }),
      stone: F.pbr("flagstone", { color: "#7f7a70", color2: "#68645b", color3: "#3a372f", cells: 4, seed: 40 }),
      brick: F.pbr("brick", { color: "#7d6656", color2: "#6a5446", color3: "#c4b8a2", seed: 41 }),
      weave: F.pbr("weave", { color: "#cfb173", color2: "#b8985a", color3: "#6d5530", cells: 14, seed: 42 }),
      bamboo: F.pbr("bamboo", { color: "#b49a5c", color2: "#9c8448", color3: "#5a4a28", seed: 43 }),
      leaves: F.pbr("leafmass", { color: "#4f7f2c", color2: "#78a23e", color3: "#27401a", leaves: 16, buds: true, seed: 44 }),
      wilted: F.pbr("leafmass", { color: "#4a5a28", color2: "#66703a", color3: "#2a3016", leaves: 22, seed: 45 }),
      dried: F.pbr("leafmass", { color: "#3a3a22", color2: "#545032", color3: "#1e1c10", leaves: 26, seed: 46 }),
      iron: F.track(new THREE.MeshStandardMaterial({ color: "#2b2a28", roughness: 0.42, metalness: 0.65 })),
      dark: F.track(new THREE.MeshStandardMaterial({ color: "#2a1e16", roughness: 0.85 })),
      red: F.track(new THREE.MeshStandardMaterial({ color: "#a32a22", roughness: 0.7 })),
      gold: F.pbr("gold", { color: "#d1a443", color2: "#b8862e", seed: 47 }, { metalness: 0.75 }),
      cloth: F.track(new THREE.MeshStandardMaterial({ color: "#e9e4d8", roughness: 0.95 })),
      granite: F.pbr("plaster", { color: "#6e6c68", color2: "#5a5854", color3: "#3a3836", seed: 48 }),
      fire: F.track(new THREE.MeshStandardMaterial({ color: "#2a0a00", emissive: "#ff6a1a", emissiveIntensity: 2.2, roughness: 1 })),
      water: F.waterMaterial({ color: "#2e5a55", opacity: 0.88, repeat: [2, 26], flow: [0, -0.05], flow2: [0.01, -0.03] }),
      foam: F.foamMaterial({ repeat: [1, 24], speed: 0.06 }),
      porcelain: F.track(new THREE.MeshStandardMaterial({ color: "#f2efe6", roughness: 0.18 })),
      clay: F.track(new THREE.MeshStandardMaterial({ color: "#7a3a24", roughness: 0.5 })),
      tea: F.track(new THREE.MeshStandardMaterial({ color: "#6a2e12", roughness: 0.1 })),
      fig: F.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })),
    };
    const lat = latticeTextures(F, { color: "#4a2c18", gap: "#120c08", glow: "#ffb35c" });
    const windowMat = F.track(new THREE.MeshStandardMaterial({ map: lat.map, emissiveMap: lat.emissiveMap, emissive: "#ffb35c", emissiveIntensity: 0, roughness: 0.8 }));
    windowMat.userData.night = true;
    nightMats.push(windowMat);
    const lan = lanternGeometry();
    const lanternMat = F.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: "#ff4a20", emissiveIntensity: 0 }));
    lanternMat.userData.night = true;
    nightMats.push(lanternMat);
    const capMat = F.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }));
    F.geo(lan.body); F.geo(lan.caps);

    const mesh = (geo, mat, x, y, z, ry = 0, parent = null) => {
      F.geo(geo);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      m.castShadow = true;
      m.receiveShadow = true;
      (parent || stage.root).add(m);
      return m;
    };
    const group = (x, z, ry = 0, y = null) => {
      const g = new THREE.Group();
      g.position.set(x, y == null ? hgt(x, z) : y, z);
      g.rotation.y = ry;
      stage.add(g);
      return g;
    };
    const lantern = (parent, x, y, z) => {
      mesh(lan.body, lanternMat, x, y, z, 0, parent);
      mesh(lan.caps, capMat, x, y, z, 0, parent);
    };
    const pointLight = (x, y, z, color, base, dist = 18) => {
      const l = new THREE.PointLight(color, 0, dist, 1.6);
      l.position.set(x, y, z);
      l.userData.base = base;
      stage.add(l);
      lights.push(l);
      return l;
    };

    /* ------------------------------------------------ paths and the Tea Horse Road */
    const path = (pts, w, mat) => {
      const res = makePath(pts, w, mat);
      PATHS.push({ pts: res.map((v) => [v.x, v.z]), w });
      return res;
    };
    mats.road.map.repeat.set(1, 1); mats.road.normalMap.repeat.set(1, 1); mats.road.roughnessMap.repeat.set(1, 1);
    const roadMat = mats.road;
    roadMat.polygonOffset = true; roadMat.polygonOffsetFactor = -2; roadMat.polygonOffsetUnits = -2;
    path(ROAD.slice(0, 6), 3.0, roadMat);
    path(ROAD.slice(6), 3.0, roadMat);
    path([[-205, -152], [-205, -160], [-205, -168]], 2.6, roadMat);
    const dirtPaths = [
      [[14, -4], [32, -10], [46, -12]],
      [[10, 14], [24, 32], [32, 42]],
      [[-16, 10], [-44, 26], [-70, 42], [-96, 50]],
      [[16, -12], [42, -46], [78, -76], [112, -98], [138, -118], [160, -136], [178, -148]],
      [[138, -118], [128, -160], [116, -190]],
      [[24, 34], [50, 80], [70, 105]],
    ];
    dirtPaths.forEach((p) => path(p, 2.4, mats.dirt));
    /* paths up the terraces (radial, from foot to summit) */
    HILLS.forEach((H) => H.paths.forEach((a) => {
      const pts = [];
      for (let r = H.R * 1.05; r > 4; r -= 6) pts.push([H.x + Math.cos(a) * r * (1 + 0.1 * angN(a, H.seed)), H.z + Math.sin(a) * r * (1 + 0.1 * angN(a, H.seed))]);
      path(pts, 1.8, mats.dirt);
    }));

    /* plaza */
    const plazaG = new THREE.CircleGeometry(21, 48);
    plazaG.rotateX(-Math.PI / 2);
    mats.plaza.polygonOffset = true; mats.plaza.polygonOffsetFactor = -3; mats.plaza.polygonOffsetUnits = -3;
    mesh(plazaG, mats.plaza, 0, VALLEY + 1 + 0.06, 0).castShadow = false;

    /* stream with foam banks */
    const streamPts = STREAM_S.map(([x, z]) => new THREE.Vector3(x, 0, z));
    kit.ribbon(streamPts, 12, (x, z) => waterY(x, z), mats.water, 26);
    [-1, 1].forEach((side) => {
      const edge = streamPts.map((p, i) => {
        const q = streamPts[Math.min(i + 1, streamPts.length - 1)], o = streamPts[Math.max(i - 1, 0)];
        const tx = q.x - o.x, tz = q.z - o.z, L = Math.hypot(tx, tz) || 1;
        return new THREE.Vector3(p.x - (tz / L) * 4.3 * side, 0, p.z + (tx / L) * 4.3 * side);
      });
      kit.ribbon(edge, 1.4, (x, z) => waterY(x, z) + 0.03, mats.foam, 8);
    });
    /* stepping stones and rocks along the stream */
    const rockG = new THREE.DodecahedronGeometry(1, 1);
    F.geo(rockG);
    const rocks = [];
    for (let i = 0; i < (LOW ? 40 : 110); i += 1) {
      const k = (rnd() * (STREAM_S.length - 1)) | 0, [x, z] = STREAM_S[k], s = rr(0.4, 1.4);
      const ox = rr(-6, 6), oz = rr(-6, 6);
      rocks.push({ x: x + ox, y: waterY(x + ox, z + oz) + 0.1, z: z + oz, s, sx: s * 1.3, sy: s * 0.6, ry: rnd() * 6 });
    }
    F.instances(rockG, mats.stone, rocks);

    /* ------------------------------------------------ village houses (Pu'er vernacular) */
    const houseMats = { wallLow: mats.earthWall, wallUp: mats.plaster, timber: mats.timber, roof: mats.tile, trim: mats.timberDark };
    function house(x, z, ry, { w = 8, d = 6, floors = 1, plaster = rnd() < 0.5, lanterns = false } = {}) {
      const y = hgt(x, z);
      const g = group(x, z, ry, y);
      const h1 = 3.1, H = floors === 2 ? 5.8 : h1;
      mesh(boxUV(w + 0.4, 0.5, d + 0.4, 1.2), mats.stone, 0, 0.2, 0, 0, g);
      mesh(boxUV(w, h1, d, 1.4), plaster ? houseMats.wallUp : houseMats.wallLow, 0, 0.45 + h1 / 2, 0, 0, g);
      if (floors === 2) {
        mesh(boxUV(w + 0.3, 0.18, d + 0.3, 1), houseMats.trim, 0, 0.45 + h1 + 0.09, 0, 0, g);
        mesh(boxUV(w, H - h1, d, 1.2), houseMats.timber, 0, 0.45 + h1 + (H - h1) / 2, 0, 0, g);
        /* balcony */
        mesh(boxUV(w * 0.7, 0.12, 1.0, 1), houseMats.trim, 0, 0.45 + h1 + 0.1, d / 2 + 0.5, 0, g);
        mesh(boxUV(w * 0.7, 0.7, 0.06, 1), houseMats.timber, 0, 0.45 + h1 + 0.5, d / 2 + 1.0, 0, g);
      }
      /* timber posts on corners */
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => mesh(boxUV(0.24, H, 0.24, 1), houseMats.trim, sx * (w / 2 - 0.05), 0.45 + H / 2, sz * (d / 2 - 0.05), 0, g));
      /* door, couplets and windows */
      mesh(new THREE.BoxGeometry(1.3, 2.2, 0.1), mats.timberDark, 0, 0.45 + 1.1, d / 2 + 0.03, 0, g);
      mesh(new THREE.BoxGeometry(0.28, 1.7, 0.04), mats.red, -0.95, 0.45 + 1.2, d / 2 + 0.05, 0, g);
      mesh(new THREE.BoxGeometry(0.28, 1.7, 0.04), mats.red, 0.95, 0.45 + 1.2, d / 2 + 0.05, 0, g);
      mesh(new THREE.BoxGeometry(1.6, 0.3, 0.04), mats.red, 0, 0.45 + 2.45, d / 2 + 0.05, 0, g);
      [-w / 2 + 1.4, w / 2 - 1.4].forEach((wx) => mesh(new THREE.PlaneGeometry(1.2, 1.0), windowMat, wx, 0.45 + 1.7, d / 2 + 0.02, 0, g));
      if (floors === 2) [-w / 4, w / 4].forEach((wx) => mesh(new THREE.PlaneGeometry(1.1, 0.9), windowMat, wx, 0.45 + h1 + 1.3, d / 2 + 0.02, 0, g));
      const R = roofGeometry({ w, d, h: 2.0 + d * 0.12, oh: 0.9, type: "gable", curve: 1.5, upturn: 0.3, tile: 1 });
      mesh(R.roof, mats.tile, 0, 0.45 + H, 0, 0, g);
      if (R.trim) mesh(R.trim, mats.timberDark, 0, 0.45 + H, 0, 0, g);
      /* gable end walls */
      const gab = new THREE.BufferGeometry();
      const gh = 2.0 + d * 0.12;
      gab.setAttribute("position", new THREE.Float32BufferAttribute([-w / 2, 0, -d / 2, -w / 2, 0, d / 2, -w / 2, gh, 0, w / 2, 0, d / 2, w / 2, 0, -d / 2, w / 2, gh, 0], 3));
      gab.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, d / 1.4, 0, d / 2.8, gh / 1.4, 0, 0, d / 1.4, 0, d / 2.8, gh / 1.4], 2));
      gab.computeVertexNormals();
      mesh(gab, plaster ? houseMats.wallUp : houseMats.wallLow, 0, 0.45 + H, 0, 0, g).material.side = THREE.DoubleSide;
      if (lanterns) { lantern(g, -1.0, 0.45 + 2.6, d / 2 + 0.6); lantern(g, 1.0, 0.45 + 2.6, d / 2 + 0.6); }
      blockBox(x, z, w + 0.5, d + 0.5, ry);
      return g;
    }
    /* ring of houses round the plaza, leaving the paths open */
    const avoid = (x, z, pad = 6) => {
      if (PATHS.some((p) => polyDist(x, z, p.pts) < p.w / 2 + pad)) return true;
      if (Math.hypot(x + 30, z + 30) < 16) return true;
      return false;
    };
    let made = 0;
    for (let a = 0; a < Math.PI * 2 && made < 16; a += 0.36) {
      const r = rr(29, 40), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (avoid(x, z, 5.5)) continue;
      house(x, z, Math.atan2(-x, -z), { w: rr(7, 9.5), d: rr(5.5, 6.8), floors: rnd() < 0.45 ? 2 : 1, lanterns: rnd() < 0.4 });
      made += 1;
    }
    /* a big old banyan-like shade tree on the plaza with a stone seat ring */
    const shade = species(F, "canopy", { variants: 1, seed: 71 });
    plant(F, shade, [{ x: 9, y: VALLEY + 1, z: 6, s: 1.05, ry: 0.4 }]);
    mesh(new THREE.TorusGeometry(2.2, 0.32, 6, 20).rotateX(Math.PI / 2), mats.stone, 9, VALLEY + 1.3, 6);
    block(9, 6, 2.6);

    /* ------------------------------------------------ tea house (gongfu tea) */
    {
      const x = -30, z = -30, ry = Math.atan2(30, 30);
      const g = group(x, z, ry, VALLEY + 1);
      const w = 13, d = 9, h1 = 3.4, h2 = 2.8;
      mesh(boxUV(w + 1.2, 0.5, d + 1.4, 1.2), mats.stone, 0, 0.25, 0.3, 0, g);
      /* back and side walls (front open) */
      mesh(boxUV(w, h1, 0.3, 1.2), mats.plaster, 0, 0.5 + h1 / 2, -d / 2, 0, g);
      mesh(boxUV(0.3, h1, d, 1.2), mats.plaster, -w / 2, 0.5 + h1 / 2, 0, 0, g);
      mesh(boxUV(0.3, h1, d, 1.2), mats.plaster, w / 2, 0.5 + h1 / 2, 0, 0, g);
      for (let i = 0; i < 6; i += 1) mesh(cylUV(0.2, 0.22, h1 + h2, 10, 1), mats.red, -w / 2 + 0.3 + (i * (w - 0.6)) / 5, 0.5 + (h1 + h2) / 2, d / 2, 0, g);
      /* upper floor */
      mesh(boxUV(w + 0.4, 0.25, d + 0.8, 1), mats.timberDark, 0, 0.5 + h1, 0.2, 0, g);
      mesh(boxUV(w, h2, d, 1.2), mats.timber, 0, 0.5 + h1 + h2 / 2, -0.2, 0, g);
      for (let i = 0; i < 5; i += 1) mesh(new THREE.PlaneGeometry(1.6, 1.4), windowMat, -w / 2 + 1.6 + i * 2.45, 0.5 + h1 + h2 / 2, d / 2 - 0.18, 0, g);
      /* balcony rail */
      mesh(boxUV(w, 0.1, 0.1, 1), mats.timberDark, 0, 0.5 + h1 + 0.95, d / 2 + 0.55, 0, g);
      for (let i = 0; i <= 18; i += 1) mesh(new THREE.BoxGeometry(0.07, 0.8, 0.07), mats.timberDark, -w / 2 + (i * w) / 18, 0.5 + h1 + 0.55, d / 2 + 0.55, 0, g);
      const R = roofGeometry({ w, d: d + 0.6, h: 3.6, oh: 1.6, type: "xieshan", curve: 1.3, upturn: 0.85, tile: 1, skirt: 0.45 });
      mesh(R.roof, mats.tile, 0, 0.5 + h1 + h2, 0, 0, g);
      if (R.trim) mesh(R.trim, mats.timberDark, 0, 0.5 + h1 + h2, 0, 0, g);
      if (R.gableWall) mesh(R.gableWall, mats.timber, 0, 0.5 + h1 + h2, 0, 0, g).material.side = THREE.DoubleSide;
      /* signboard */
      const sign = F.track(new THREE.MeshStandardMaterial({ map: signTexture(F, "普洱茶馆"), roughness: 0.6 }));
      mesh(new THREE.BoxGeometry(3.6, 1.1, 0.12), sign, 0, 0.5 + h1 + 0.3, d / 2 + 0.66, 0, g);
      /* lanterns */
      [-4.5, -1.5, 1.5, 4.5].forEach((lx) => lantern(g, lx, 0.5 + h1 - 0.5, d / 2 + 0.9));
      /* tea tables with gongfu sets */
      const tables = [[-3.6, -1.2], [0, 0.6], [3.6, -1.2]];
      tables.forEach(([tx, tz]) => {
        mesh(boxUV(2.0, 0.12, 1.2, 1), mats.timberDark, tx, 0.5 + 0.78, tz, 0, g);
        mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.74, 10), mats.timberDark, tx, 0.5 + 0.37, tz, 0, g);
        mesh(boxUV(1.1, 0.06, 0.6, 1), mats.timber, tx, 0.5 + 0.87, tz, 0, g);
        mesh(lathe([[0, 0], [0.11, 0.0], [0.13, 0.06], [0.09, 0.11], [0.1, 0.13], [0.0, 0.14]], 12), mats.porcelain, tx - 0.25, 0.5 + 0.9, tz, 0, g);
        mesh(lathe([[0, 0], [0.07, 0.0], [0.09, 0.1], [0.05, 0.13], [0.0, 0.13]], 10), mats.porcelain, tx + 0.15, 0.5 + 0.9, tz + 0.1, 0, g);
        for (let c = 0; c < 4; c += 1) mesh(lathe([[0, 0], [0.04, 0], [0.05, 0.05], [0.0, 0.05]], 8), mats.porcelain, tx - 0.35 + c * 0.22, 0.5 + 0.9, tz - 0.18, 0, g);
        [[-1.4, 0], [1.4, 0]].forEach(([sx]) => mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.5, 8), mats.timber, tx + sx, 0.5 + 0.25, tz, 0, g));
      });
      /* kettle on a small charcoal stove */
      mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.6, 10), mats.clay, 4.8, 0.5 + 0.3, 2.2, 0, g);
      mesh(lathe([[0, 0], [0.18, 0], [0.22, 0.12], [0.18, 0.26], [0.06, 0.3], [0, 0.32]], 12), mats.iron, 4.8, 0.5 + 0.62, 2.2, 0, g);
      /* colliders: walls, columns, tables */
      const wc = (lx, lz, bw, bd) => kit.blockBoxIn(g, lx, lz, bw, bd);
      wc(0, -d / 2, w + 0.3, 0.6); wc(-w / 2, 0, 0.6, d); wc(w / 2, 0, 0.6, d);
      for (let i = 0; i < 6; i += 1) wc(-w / 2 + 0.3 + (i * (w - 0.6)) / 5, d / 2, 0.5, 0.5);
      tables.forEach(([tx, tz]) => wc(tx, tz, 3.4, 1.4));
      wc(4.8, 2.2, 0.8, 0.8);
      pointLight(x, VALLEY + 4, z, "#ffb366", 30, 22);
      interact("cn-pe-teahouse", g, "Tea house · gongfu tea", [x + 7, z + 7], { radius: 16, labelOffset: 1.6 });
    }

    /* ------------------------------------------------ workshop: 杀青 · 揉捻 · 晒青 */
    function shed(g, lx, lz, w, d, h) {
      const posts = [];
      for (let i = 0; i <= 3; i += 1) for (const sz of [-1, 1]) {
        const px = -w / 2 + (i * w) / 3, pz = (sz * d) / 2;
        mesh(cylUV(0.16, 0.18, h, 8, 1), mats.timberDark, lx + px, h / 2, lz + pz, 0, g);
        posts.push([lx + px, lz + pz]);
      }
      const R = roofGeometry({ w, d, h: 2.2, oh: 1.0, type: "gable", curve: 1.4, upturn: 0.4, tile: 1 });
      mesh(R.roof, mats.tile, lx, h, lz, 0, g);
      if (R.trim) mesh(R.trim, mats.timberDark, lx, h, lz, 0, g);
      posts.forEach(([px, pz]) => kit.blockBoxIn(g, px, pz, 0.45, 0.45));
      return posts;
    }
    const steam = F.particles({ max: 500, color: "#f2f4f2", opacity: 0.28, size: 0.9, type: "steam" });
    const smoke = F.particles({ max: 260, color: "#9c9a96", opacity: 0.2, size: 1.2, type: "steam" });
    const wokSpots = [];
    const fires = [];
    {
      /* layout (world axes): drying yard in the middle, kill-green shed north of it,
         rolling shed east of it, a tall drying rack to the south; the path arrives from the west */
      const tray = (r, rep) => {
        const t = new THREE.CylinderGeometry(r, r * 0.96, 0.08, 24);
        const tu = t.attributes.uv;
        for (let k = 0; k < tu.count; k += 1) tu.setXY(k, tu.getX(k) * rep, tu.getY(k) * rep);
        return t;
      };
      /* kill-green shed (杀青) */
      const g = group(60, -29, 0, VALLEY + 1);
      shed(g, 0, 0, 14, 7, 3.4);
      mesh(boxUV(14, 1.4, 0.3, 1.2), mats.brick, 0, 0.7, -3.6, 0, g);
      for (let i = 0; i < 3; i += 1) {
        const sx = -4.5 + i * 4.5, sz = -2.2;
        mesh(boxUV(2.2, 1.0, 1.6, 0.8), mats.brick, sx, 0.5, sz, 0, g);
        const wok = lathe([[0.0, -0.32], [0.3, -0.3], [0.55, -0.2], [0.75, 0.0], [0.78, 0.04], [0.72, 0.02], [0.52, -0.16], [0.28, -0.25], [0, -0.27]], 24);
        mesh(wok, mats.iron, sx, 1.05, sz, 0, g);
        const leafPile = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        leafPile.scale(1, 0.35, 1);
        mesh(leafPile, mats.wilted, sx, 0.86, sz, 0, g);
        fires.push(mesh(new THREE.PlaneGeometry(0.6, 0.4), mats.fire, sx, 0.3, sz + 0.81, 0, g));
        mesh(new THREE.CylinderGeometry(0.16, 0.18, 3.2, 8), mats.brick, sx + 0.8, 2.1, sz - 0.6, 0, g);
        kit.blockBoxIn(g, sx, sz, 2.3, 1.7);
        g.updateMatrixWorld(true);
        wokSpots.push({ wp: new THREE.Vector3(sx, 1.15, sz).applyMatrix4(g.matrixWorld), cp: new THREE.Vector3(sx + 0.8, 3.7, sz - 0.6).applyMatrix4(g.matrixWorld) });
      }
      for (let i = 0; i < 18; i += 1) mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.4, 6).rotateX(Math.PI / 2), mats.timber, 5.8 + (i % 6) * 0.2, 0.12 + Math.floor(i / 6) * 0.18, -2.6, 0, g);
      kit.blockBoxIn(g, 6.3, -2.6, 1.6, 1.6);
      /* rolling shed (揉捻), facing west onto the yard */
      const g2 = group(77, -12, -Math.PI / 2, VALLEY + 1);
      shed(g2, 0, 0, 12, 6.5, 3.2);
      mesh(boxUV(12, 1.2, 0.3, 1.2), mats.brick, 0, 0.6, -3.4, 0, g2);
      const rollTables = [[-4, -0.6], [0, -0.6], [4, -0.6]];
      rollTables.forEach(([tx, tz]) => {
        mesh(boxUV(2.4, 0.1, 1.3, 1), mats.timber, tx, 0.85, tz, 0, g2);
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), mats.timberDark, tx + a * 1.05, 0.42, tz + b * 0.5, 0, g2));
        mesh(tray(0.62, 2), mats.weave, tx - 0.55, 0.94, tz, 0, g2);
        mesh(tray(0.62, 2), mats.weave, tx + 0.6, 0.94, tz, 0, g2);
        const pile = new THREE.SphereGeometry(0.42, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        pile.scale(1, 0.4, 1);
        mesh(pile, mats.wilted, tx - 0.55, 0.98, tz, 0, g2);
        mesh(pile, mats.leaves, tx + 0.6, 0.98, tz, 0, g2);
        kit.blockBoxIn(g2, tx, tz, 2.5, 1.4);
      });
      /* sun-drying yard (晒青) */
      const yard = group(58, -12, 0, VALLEY + 1);
      const trays = [];
      for (let i = 0; i < 4; i += 1) for (let j = 0; j < 2; j += 1) {
        const lx = -6.5 + i * 4.4, lz = -2.6 + j * 5.2;
        mesh(boxUV(1.8, 0.5, 0.25, 1), mats.timberDark, lx, 0.25, lz - 0.6, 0, yard);
        mesh(boxUV(1.8, 0.5, 0.25, 1), mats.timberDark, lx, 0.25, lz + 0.6, 0, yard);
        mesh(tray(1.25, 3), mats.weave, lx, 0.55, lz, 0, yard);
        mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.05, 24), (i + j) % 3 === 0 ? mats.wilted : mats.dried, lx, 0.6, lz, rnd() * 6, yard);
        trays.push([lx, lz]);
        kit.blockBoxIn(yard, lx, lz, 2.4, 2.4);
      }
      /* bamboo mats on the ground with spread leaves (walkable) */
      for (let i = 0; i < 3; i += 1) {
        mesh(boxUV(3.2, 0.04, 2.2, 0.5), mats.weave, -4.4 + i * 4.4, 0.03, 6.4, 0, yard);
        mesh(boxUV(2.8, 0.05, 1.8, 0.6), mats.dried, -4.4 + i * 4.4, 0.07, 6.4, 0, yard);
      }
      /* tall drying rack */
      const rack = new THREE.Group();
      rack.position.set(0, 0, 11);
      yard.add(rack);
      [[-1.3, -0.7], [1.3, -0.7], [1.3, 0.7], [-1.3, 0.7]].forEach(([a, b]) => mesh(new THREE.BoxGeometry(0.12, 3.2, 0.12), mats.timberDark, a, 1.6, b, 0, rack));
      for (let k = 0; k < 5; k += 1) {
        mesh(boxUV(2.6, 0.05, 1.4, 0.5), mats.weave, 0, 0.5 + k * 0.62, 0, 0, rack);
        mesh(boxUV(2.3, 0.05, 1.2, 0.6), k % 2 ? mats.dried : mats.wilted, 0, 0.55 + k * 0.62, 0, 0, rack);
      }
      kit.blockBoxIn(yard, 0, 11, 3, 1.8);
      stage.root.updateMatrixWorld(true);
      /* each step has its own small marker group and beacon */
      const tagGroup = (x, y, z) => { const gg = new THREE.Group(); const m = new THREE.Mesh(F.geo(new THREE.BoxGeometry(0.01, 0.01, 0.01)), mats.dark); m.position.set(x, y, z); gg.add(m); return gg; };
      interact("cn-pe-shaqing", tagGroup(60, VALLEY + 2.2, -30), "Kill-green wok · 杀青", [60, -23.5], { radius: 12, labelOffset: 2.6 });
      interact("cn-pe-rounian", tagGroup(77, VALLEY + 2.2, -12), "Hand rolling · 揉捻", [72.5, -8.5], { radius: 12, labelOffset: 2.6 });
      interact("cn-pe-shaiqing", tagGroup(58, VALLEY + 2.0, -12), "Sun-drying · 晒青", [51, -14.5], { radius: 14, labelOffset: 2.4 });
      pointLight(64, VALLEY + 4.4, -20, "#ffa050", 24, 22);
      WORK.g = g; WORK.g2 = g2; WORK.yard = yard; WORK.rollTables = rollTables; WORK.trays = trays;
    }

    /* ------------------------------------------------ cake press (七子饼) */
    const pressSpots = [];
    {
      const x = 36, z = 46, ry = Math.atan2(-36, -46);
      const g = group(x, z, ry, VALLEY + 1);
      shed(g, 0, -1, 10, 6, 3.2);
      mesh(boxUV(10, 1.0, 0.3, 1), mats.brick, 0, 0.5, -4.2, 0, g);
      /* steamer stove */
      mesh(boxUV(1.8, 0.9, 1.4, 0.8), mats.brick, -3.6, 0.45, -3.2, 0, g);
      for (let k = 0; k < 3; k += 1) mesh(cylUV(0.42, 0.42, 0.22, 16, 0.5), mats.bamboo, -3.6, 1.02 + k * 0.23, -3.2, 0, g);
      mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 16), mats.weave, -3.6, 1.72, -3.2, 0, g);
      fires.push(mesh(new THREE.PlaneGeometry(0.5, 0.35), mats.fire, -3.6, 0.28, -2.49, 0, g));
      kit.blockBoxIn(g, -3.6, -3.2, 1.9, 1.5);
      g.updateMatrixWorld(true);
      pressSpots.push(new THREE.Vector3(-3.6, 1.8, -3.2).applyMatrix4(g.matrixWorld));
      /* two stone presses on boards */
      [[0, -2.4], [2.8, -2.4]].forEach(([px, pz], i) => {
        mesh(boxUV(1.6, 0.12, 1.6, 0.8), mats.timber, px, 0.4, pz, 0, g);
        mesh(boxUV(0.2, 0.4, 0.2, 1), mats.timberDark, px - 0.6, 0.2, pz - 0.6, 0, g);
        mesh(boxUV(0.2, 0.4, 0.2, 1), mats.timberDark, px + 0.6, 0.2, pz + 0.6, 0, g);
        const bag = new THREE.SphereGeometry(0.42, 12, 8); bag.scale(1, 0.32, 1);
        mesh(bag, mats.cloth, px, 0.52, pz, 0, g);
        const stone = lathe([[0, 0], [0.48, 0], [0.5, 0.06], [0.5, 0.42], [0.46, 0.46], [0, 0.46]], 20);
        mesh(stone, mats.granite, px, 0.58, pz, 0, g);
        mesh(new THREE.TorusGeometry(0.16, 0.04, 6, 12, Math.PI).rotateY(i), mats.iron, px, 1.04, pz, 0, g);
        kit.blockBoxIn(g, px, pz, 1.4, 1.4);
      });
      /* shelves of wrapped cakes and bamboo-sheathed tongs (七子饼 = seven cakes) */
      const wrap = (() => {
        const c = F.canvas(256, 256), q = c.getContext("2d");
        q.fillStyle = "#efe7d4"; q.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 900; i += 1) { q.fillStyle = `rgba(150,120,80,${Math.random() * 0.06})`; q.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
        q.strokeStyle = "#b3261e"; q.lineWidth = 6; q.beginPath(); q.arc(128, 128, 70, 0, 7); q.stroke();
        q.fillStyle = "#b3261e"; q.font = "bold 48px 'Noto Serif SC',serif"; q.textAlign = "center"; q.fillText("普洱", 128, 112); q.font = "bold 34px 'Noto Serif SC',serif"; q.fillText("七子饼", 128, 160);
        return F.toTex(c);
      })();
      const cakeMat = F.track(new THREE.MeshStandardMaterial({ map: wrap, roughness: 0.85 }));
      const cakeG = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 20);
      const cakeTop = cakeG.attributes.uv;
      F.geo(cakeG);
      for (let i = 0; i < 2; i += 1) {
        mesh(boxUV(3.2, 0.08, 0.7, 1), mats.timber, 3.3 - i * 0.0, 1.0 + i * 0.7, -3.8, 0, g);
      }
      [[-0.4, 0], [0, 0], [0.4, 0], [0.8, 0]].forEach(() => 0);
      for (let k = 0; k < 12; k += 1) {
        const m = new THREE.Mesh(cakeG, cakeMat);
        m.position.set(2.0 + (k % 6) * 0.45, 1.07 + Math.floor(k / 6) * 0.7, -3.8);
        g.add(m);
      }
      /* tongs: seven cakes wrapped in bamboo sheath */
      const sheath = F.pbr("thatch", { color: "#b59a63", color2: "#94784a", color3: "#5d4a2a", courses: 3, seed: 61 });
      for (let k = 0; k < 8; k += 1) {
        const t = mesh(cylUV(0.22, 0.22, 0.42, 12, 0.5), sheath, -1.5 + (k % 4) * 0.5, 0.21 + Math.floor(k / 4) * 0.44, -3.8, 0, g);
        t.rotation.z = 0;
      }
      kit.blockBoxIn(g, 3.3, -3.8, 3.3, 0.9);
      kit.blockBoxIn(g, -0.8, -3.8, 2.2, 0.9);
      interact("cn-pe-cake", g, "Stone press · 七子饼", [x + Math.sin(ry) * 4.2, z + Math.cos(ry) * 4.2], { radius: 12, labelOffset: 1.2 });
      PRESS.g = g;
    }

    /* ------------------------------------------------ tea terraces: bushes in contour rows */
    const bushGeo = (() => {
      const g = new THREE.IcosahedronGeometry(0.75, 1);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i += 1) {
        let y = p.getY(i);
        if (y > 0.3) y = 0.3 + (y - 0.3) * 0.25;
        if (y < -0.1) y = -0.1 + (y + 0.1) * 0.4;
        const k = 1 + (Math.sin(p.getX(i) * 9) + Math.cos(p.getZ(i) * 11)) * 0.06;
        p.setXYZ(i, p.getX(i) * k, y, p.getZ(i) * k);
      }
      g.computeVertexNormals();
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 2);
      return g;
    })();
    mats.leaves.map.repeat.set(1, 1);
    const bushMat = mats.leaves;
    F.wind(bushMat, 0.04, 1.2);
    const bushes = [], bushCols = [], pickSpots = [];
    const col = new THREE.Color();
    HILLS.forEach((H, hi) => {
      const levels = Math.floor(H.peak / H.step) - 1;
      for (let k = 0; k < levels; k += 1) {
        const hhRow = (k + 0.36) * H.step;
        const r0 = (H.R / Math.PI) * Math.acos(Math.min(1, Math.max(-1, (2 * hhRow) / H.peak - 1)));
        if (r0 < 3) continue;
        const spacing = LOW ? 2.3 : 1.15;
        const dth = spacing / r0;
        for (let th = 0; th < Math.PI * 2; th += dth) {
          if (H.paths.some((a) => Math.abs(Math.atan2(Math.sin(th - a), Math.cos(th - a))) * r0 < 2.6)) continue;
          const kf = 1 + 0.1 * angN(th, H.seed);
          const x = H.x + Math.cos(th) * r0 * kf, z = H.z + Math.sin(th) * r0 * kf;
          const y = hgt(x, z);
          bushes.push({ x, y: y - 0.05, z, ry: -th + rr(-0.15, 0.15), sx: rr(1.0, 1.25), sy: rr(0.95, 1.25), sz: rr(1.35, 1.75) });
          bushCols.push(col.clone().setHSL(0.2 + rnd() * 0.06, 0.25 + rnd() * 0.2, 0.72 + rnd() * 0.18));
          if (hi === 0 && k < 6 && Math.abs(Math.atan2(Math.sin(th - H.paths[0]), Math.cos(th - H.paths[0]))) < 0.22 && rnd() < 0.45) {
            const hp = (k + 0.66) * H.step, rp = (H.R / Math.PI) * Math.acos((2 * hp) / H.peak - 1) * kf;
            pickSpots.push([H.x + Math.cos(th) * rp, H.z + Math.sin(th) * rp, th]);
          }
        }
      }
    });
    F.instances(bushGeo, bushMat, bushes, { colors: bushCols, shadow: !LOW });
    TERR.pickSpots = pickSpots;
    {
      /* terraces discovery marker: a picker's basket on a stone at the foot of the slope */
      const g = group(-98, 50, 0.4);
      mesh(cylUV(0.45, 0.32, 0.7, 14, 0.4), mats.weave, 0, 0.35, 0, 0, g);
      const pile = new THREE.SphereGeometry(0.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); pile.scale(1, 0.5, 1);
      mesh(pile, mats.leaves, 0, 0.7, 0, 0, g);
      mesh(boxUV(1.4, 0.5, 0.9, 0.8), mats.stone, 1.1, 0.25, 0.3, 0.3, g);
      kit.blockBoxIn(g, 0.5, 0.1, 2.2, 1.2);
      interact("cn-pe-terraces", g, "Tea terraces", [-95, 46], { radius: 18, labelOffset: 1.6 });
    }
    /* summit pavilion (亭) */
    {
      const g = group(-150, 70, 0.3);
      mesh(boxUV(6.4, 0.5, 6.4, 1), mats.stone, 0, 0.25, 0, 0, g);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { mesh(cylUV(0.16, 0.18, 3.2, 10, 1), mats.red, a * 2.6, 0.5 + 1.6, b * 2.6, 0, g); kit.blockBoxIn(g, a * 2.6, b * 2.6, 0.45, 0.45); });
      const R = roofGeometry({ w: 5.6, d: 5.6, h: 2.8, oh: 1.0, type: "hip", curve: 1.4, upturn: 0.9, ridgeRatio: 0.05 });
      mesh(R.roof, mats.tile, 0, 3.7, 0, 0, g);
      if (R.trim) mesh(R.trim, mats.timberDark, 0, 3.7, 0, 0, g);
      mesh(lathe([[0, 0], [0.18, 0], [0.12, 0.4], [0.04, 0.8], [0, 0.9]], 10), mats.gold, 0, 6.5, 0, 0, g);
    }

    /* ------------------------------------------------ Jingmai ancient tea forest + Bulang village */
    const canopy = species(F, "canopy", { variants: 3, seed: 11 });
    const oldtea = species(F, "oldtea", { variants: 4, seed: 12 });
    const pine = species(F, "pine", { variants: 3, seed: 13 });
    const bamboo = species(F, "bamboo", { variants: 2, seed: 14 });
    const banana = species(F, "banana", { variants: 2, seed: 15 });
    const fern = species(F, "fern", { variants: 2, seed: 16 });
    const shrub = species(F, "shrub", { variants: 2, seed: 17 });
    const onPath = (x, z, pad) => PATHS.some((p) => polyDist(x, z, p.pts) < p.w / 2 + pad);
    const inPad = (x, z, pad = 0) => PADS.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r + pad);
    const inBounds = (x, z, m = 6) => x > B.x0 + m && x < B.x1 - m && z > B.z0 + m && z < B.z1 - m;
    const inHill = (x, z) => HILLS.some((H) => { const i = hillInfo(H, x, z); return i && i.w > 0.05; });
    const ok = (x, z, pad = 2) => inBounds(x, z) && !onPath(x, z, pad) && !inPad(x, z, 2) && streamDist(x, z) > 7 && !inHill(x, z);

    const L = { canopy: [], oldtea: [], pine: [], bamboo: [], banana: [], fern: [], shrub: [] };
    const scatter = (list, n, fn, tries = 8) => { for (let i = 0; i < n * tries && list.length < n; i += 1) { const p = fn(); if (p) list.push(p); } };
    scatter(L.canopy, LOW ? 60 : 150, () => {
      const a = rnd() * 6.283, r = Math.sqrt(rnd()) * JM.R * 0.95, x = JM.x + Math.cos(a) * r, z = JM.z + Math.sin(a) * r;
      if (!ok(x, z, 3)) return null;
      if (kit.blocked(x, z, 2.2)) return null;
      block(x, z, 0.9);
      return { x, y: hgt(x, z), z, s: rr(0.8, 1.15), ry: rnd() * 6, v: (rnd() * 3) | 0 };
    });
    scatter(L.oldtea, LOW ? 50 : 120, () => {
      const a = rnd() * 6.283, r = Math.sqrt(rnd()) * JM.R * 0.9, x = JM.x + Math.cos(a) * r, z = JM.z + Math.sin(a) * r;
      if (!ok(x, z, 1.8) || kit.blocked(x, z, 1.2)) return null;
      block(x, z, 0.45);
      return { x, y: hgt(x, z), z, s: rr(0.8, 1.2), ry: rnd() * 6, v: (rnd() * 4) | 0 };
    });
    scatter(L.fern, LOW ? 150 : 520, () => {
      const a = rnd() * 6.283, r = Math.sqrt(rnd()) * JM.R, x = JM.x + Math.cos(a) * r, z = JM.z + Math.sin(a) * r;
      if (!ok(x, z, 0.8)) return null;
      return { x, y: hgt(x, z), z, s: rr(0.7, 1.4), ry: rnd() * 6, v: (rnd() * 2) | 0 };
    });
    /* pines and broadleaf on the slopes around the valley */
    scatter(L.pine, LOW ? 180 : 520, () => {
      const x = rr(B.x0, B.x1), z = rr(B.z0, B.z1);
      const d = Math.hypot(x * 0.92, z);
      if (d < 120 || !ok(x, z, 3) || Math.hypot(x - JM.x, z - JM.z) < JM.R * 0.9) return null;
      if (kit.blocked(x, z, 1.6)) return null;
      block(x, z, 0.55);
      return { x, y: hgt(x, z), z, s: rr(0.75, 1.15), ry: rnd() * 6, v: (rnd() * 3) | 0 };
    });
    scatter(L.canopy, (LOW ? 60 : 150) + (LOW ? 40 : 110), () => {
      const x = rr(B.x0, B.x1), z = rr(B.z0, B.z1);
      if (Math.hypot(x * 0.92, z) < 90 || !ok(x, z, 4) || kit.blocked(x, z, 2.5)) return null;
      block(x, z, 0.85);
      return { x, y: hgt(x, z), z, s: rr(0.7, 1.0), ry: rnd() * 6, v: (rnd() * 3) | 0 };
    });
    /* bamboo and bananas round the village and the stream */
    scatter(L.bamboo, LOW ? 16 : 38, () => {
      const nearStream = rnd() < 0.5;
      let x, z;
      if (nearStream) { const k = (rnd() * STREAM_S.length) | 0; x = STREAM_S[k][0] + rr(-14, 14); z = STREAM_S[k][1] + rr(-14, 14); }
      else { const a = rnd() * 6.283, r = rr(46, 80); x = Math.cos(a) * r; z = Math.sin(a) * r; }
      if (!ok(x, z, 4) || kit.blocked(x, z, 3)) return null;
      block(x, z, 1.4);
      return { x, y: hgt(x, z), z, s: rr(0.8, 1.1), ry: rnd() * 6, v: (rnd() * 2) | 0 };
    });
    scatter(L.banana, LOW ? 20 : 50, () => {
      const a = rnd() * 6.283, r = rr(26, 60), cx = rnd() < 0.7 ? 0 : 112, cz = cx ? -206 : 0;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (!inBounds(x, z) || onPath(x, z, 2) || kit.blocked(x, z, 1.4) || Math.hypot(x, z) < 22) return null;
      if (Object.values(places).some((p) => Math.hypot(x - p.spawn[0], z - p.spawn[1]) < 9)) return null;
      block(x, z, 0.35);
      return { x, y: hgt(x, z), z, s: rr(0.8, 1.2), ry: rnd() * 6, v: (rnd() * 2) | 0 };
    });
    scatter(L.shrub, LOW ? 120 : 380, () => {
      const x = rr(B.x0, B.x1), z = rr(B.z0, B.z1);
      if (!ok(x, z, 1.2) || Math.hypot(x, z) < 30) return null;
      return { x, y: hgt(x, z), z, s: rr(0.6, 1.3), ry: rnd() * 6, v: (rnd() * 2) | 0 };
    });
    /* the special "tea soul" tree in Jingmai: a large old tree with a stone altar */
    const soulX = 172, soulZ = -146;
    L.oldtea.push({ x: soulX, y: hgt(soulX, soulZ), z: soulZ, s: 1.7, ry: 1.2, v: 0 });
    block(soulX, soulZ, 0.9);
    plant(F, canopy, L.canopy);
    plant(F, oldtea, L.oldtea);
    plant(F, pine, L.pine);
    plant(F, bamboo, L.bamboo);
    plant(F, banana, L.banana);
    plant(F, fern, L.fern, { shadow: false });
    plant(F, shrub, L.shrub, { shadow: false });
    {
      const g = group(soulX + 2.6, soulZ + 1.5, -0.6);
      mesh(boxUV(1.6, 0.7, 1.0, 0.8), mats.stone, 0, 0.35, 0, 0, g);
      mesh(lathe([[0, 0], [0.12, 0], [0.12, 0.18], [0, 0.18]], 10), mats.clay, -0.3, 0.7, 0, 0, g);
      mesh(boxUV(0.05, 0.4, 0.05, 1), mats.red, 0.3, 0.9, 0, 0, g);
      kit.blockBoxIn(g, 0, 0, 1.7, 1.1);
      interact("cn-pe-jingmai", g, "Jingmai ancient tea forest", [soulX + 5.5, soulZ + 4], { radius: 16, labelOffset: 4.5 });
    }
    /* Bulang stilt houses with "one bud, two leaves" ridge ornaments */
    {
      const bm = { post: mats.timberDark, floor: mats.timber, wall: mats.timber, roof: rnd() < 0.5 ? mats.tile : mats.thatch, trim: mats.timberDark, gable: mats.weave, dark: mats.dark, window: windowMat, orn: F.track(new THREE.MeshStandardMaterial({ color: "#6a8a3a", roughness: 0.6 })) };
      const [bx, bz] = [112, -206];
      const hy = PAD_H[4];
      const spots = [[-14, -10, 0.2], [2, -16, 0.0], [16, -8, -0.3], [-16, 8, 0.6], [16, 10, -0.7], [0, 16, 3.1]];
      let first = null;
      spots.forEach(([dx, dz, ry], i) => {
        const x = bx + dx, z = bz + dz;
        const g = group(x, z, ry + Math.atan2(-dx, -dz) - ry * 0.0, hy);
        const h = stiltHouse(F, Object.assign({}, bm, { roof: i % 2 ? mats.thatch : mats.tile }), { w: rr(7, 8.5), d: rr(5.5, 6.5), postH: 1.9, roofH: 4.4, ornament: "bud", stairSide: i % 2 ? 1 : -1, upturn: 0.25 });
        g.add(h.group);
        kit.blockBoxIn(g, 0, 0, h.foot[0], h.foot[1]);
        kit.blockBoxIn(g, h.stairX, h.foot[1] / 2 - 1.2, 1.1, 2.6);
        if (!first) first = g;
      });
      /* a village tea-drying platform in the middle */
      const g = group(bx, bz, 0.4, hy);
      mesh(boxUV(5, 0.12, 3.4, 0.6), mats.weave, 0, 0.7, 0, 0, g);
      mesh(boxUV(4.5, 0.06, 3, 0.6), mats.dried, 0, 0.78, 0, 0, g);
      [[-2.2, -1.5], [2.2, -1.5], [2.2, 1.5], [-2.2, 1.5]].forEach(([a, b]) => mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), mats.timberDark, a, 0.35, b, 0, g));
      kit.blockBoxIn(g, 0, 0, 5.2, 3.6);
      interact("cn-pe-bulang", g, "Bulang tea village", [bx + 4, bz + 5], { radius: 18, labelOffset: 1.6 });
    }

    /* ------------------------------------------------ the covered bridge (风雨桥) */
    {
      const deckY = Math.max(noStream(BRIDGE.x0, BRIDGE.z), noStream(BRIDGE.x1, BRIDGE.z)) + 0.35;
      addBridge({ x0: BRIDGE.x0 - 2, x1: BRIDGE.x1 + 2, z: BRIDGE.z, width: BRIDGE.width, ya: deckY, yb: deckY, sag: 0 });
      const g = group((BRIDGE.x0 + BRIDGE.x1) / 2, BRIDGE.z, 0, deckY);
      const Lb = BRIDGE.x1 - BRIDGE.x0 + 4;
      mesh(boxUV(Lb, 0.3, BRIDGE.width + 0.6, 1), mats.timber, 0, -0.15, 0, 0, g);
      [-1, 1].forEach((sz) => {
        mesh(boxUV(Lb, 0.12, 0.14, 1), mats.timberDark, 0, 0.95, sz * (BRIDGE.width / 2 + 0.15), 0, g);
        mesh(boxUV(Lb, 0.5, 0.06, 0.6), mats.timber, 0, 0.45, sz * (BRIDGE.width / 2 + 0.15), 0, g);
        for (let i = 0; i <= 8; i += 1) mesh(cylUV(0.12, 0.13, 3.0, 8, 1), mats.red, -Lb / 2 + (i * Lb) / 8, 1.5, sz * (BRIDGE.width / 2 + 0.2), 0, g);
        kit.blockBox((BRIDGE.x0 + BRIDGE.x1) / 2, BRIDGE.z + sz * (BRIDGE.width / 2 + 0.45), Lb, 0.5, 0);
      });
      /* stone piers */
      [-4, 4].forEach((px) => mesh(boxUV(1.4, deckY - waterY(BRIDGE.x0, BRIDGE.z) + 2.5, 2.8, 1), mats.stone, px, -(deckY - waterY(BRIDGE.x0, BRIDGE.z) + 2.5) / 2 - 0.2, 0, 0, g));
      const R = roofGeometry({ w: Lb, d: BRIDGE.width + 0.8, h: 1.8, oh: 0.7, type: "gable", curve: 1.4, upturn: 0.6 });
      mesh(R.roof, mats.tile, 0, 3.0, 0, 0, g);
      if (R.trim) mesh(R.trim, mats.timberDark, 0, 3.0, 0, 0, g);
      const R2 = roofGeometry({ w: 4, d: BRIDGE.width + 1.4, h: 1.8, oh: 0.8, type: "hip", curve: 1.4, upturn: 0.9, ridgeRatio: 0.2 });
      mesh(cylUV(0.1, 0.1, 1.2, 6, 1), mats.red, 0, 4.4, 0, 0, g);
      mesh(R2.roof, mats.tile, 0, 4.6, 0, 0, g);
      if (R2.trim) mesh(R2.trim, mats.timberDark, 0, 4.6, 0, 0, g);
      [-6, 0, 6].forEach((lx) => lantern(g, lx, 2.5, 0));
    }

    /* ------------------------------------------------ the post station (马店 / 驿站) */
    {
      const sx = -205, sz = -180, hy = PAD_H[5];
      const g = group(sx, sz, 0, hy);
      const Wc = 32, Dc = 28, wallH = 2.8;
      const wall = (lx, lz, len, alongX) => {
        const geo = alongX ? boxUV(len, wallH, 0.8, 1.4) : boxUV(0.8, wallH, len, 1.4);
        mesh(geo, mats.earthWall, lx, wallH / 2, lz, 0, g);
        const cap = alongX ? boxUV(len + 0.3, 0.25, 1.2, 1) : boxUV(1.2, 0.25, len + 0.3, 1);
        mesh(cap, mats.tile, lx, wallH + 0.12, lz, 0, g);
        kit.blockBox(sx + lx, sz + lz, alongX ? len : 0.9, alongX ? 0.9 : len, 0);
      };
      const gate = 4.2;
      /* north wall split by the gate */
      const seg = (Wc - gate) / 2;
      wall(-(gate / 2 + seg / 2), -Dc / 2 + Dc, seg, true);
      wall(gate / 2 + seg / 2, -Dc / 2 + Dc, seg, true);
      wall(0, -Dc / 2, Wc, true);
      wall(-Wc / 2, 0, Dc, false);
      wall(Wc / 2, 0, Dc, false);
      /* local +z faces the road (north side of the courtyard) */
      /* gate house */
      const gx = 0, gz = Dc / 2;
      [-1, 1].forEach((s) => { mesh(boxUV(0.6, 3.6, 0.6, 1), mats.timberDark, gx + s * (gate / 2 + 0.1), 1.8, gz, 0, g); });
      const GR = roofGeometry({ w: gate + 1.6, d: 2.0, h: 1.3, oh: 0.6, type: "gable", curve: 1.4, upturn: 0.5 });
      mesh(GR.roof, mats.tile, gx, 3.6, gz, 0, g);
      if (GR.trim) mesh(GR.trim, mats.timberDark, gx, 3.6, gz, 0, g);
      const sign = F.track(new THREE.MeshStandardMaterial({ map: signTexture(F, "茶马驿站", { w: 512, h: 150 }), roughness: 0.6 }));
      mesh(new THREE.BoxGeometry(2.6, 0.75, 0.1), sign, gx, 3.25, gz + 0.36, 0, g);
      lantern(g, gx - 1.6, 2.9, gz + 0.7);
      lantern(g, gx + 1.6, 2.9, gz + 0.7);
      /* inn (two floors) along the south wall */
      const inn = new THREE.Group();
      inn.position.set(0, 0, -Dc / 2 + 4.6);
      g.add(inn);
      mesh(boxUV(18, 0.4, 7, 1), mats.stone, 0, 0.2, 0, 0, inn);
      mesh(boxUV(17, 3.0, 6, 1.4), mats.earthWall, 0, 1.9, 0, 0, inn);
      mesh(boxUV(17.4, 2.6, 6.4, 1.2), mats.timber, 0, 4.7, 0, 0, inn);
      for (let i = 0; i < 5; i += 1) mesh(new THREE.PlaneGeometry(1.3, 1.1), windowMat, -6.4 + i * 3.2, 4.7, 3.22, 0, inn);
      mesh(new THREE.BoxGeometry(1.4, 2.2, 0.1), mats.timberDark, 0, 1.5, 3.03, 0, inn);
      const IR = roofGeometry({ w: 17.4, d: 6.4, h: 2.6, oh: 1.0, type: "gable", curve: 1.5, upturn: 0.45 });
      mesh(IR.roof, mats.tile, 0, 6.0, 0, 0, inn);
      if (IR.trim) mesh(IR.trim, mats.timberDark, 0, 6.0, 0, 0, inn);
      kit.blockBox(sx, sz - Dc / 2 + 4.6, 18.2, 7.2, 0);
      /* stable along the west wall: posts, roof, trough, hay */
      const st2 = new THREE.Group();
      st2.position.set(-Wc / 2 + 3.4, 0, 3);
      g.add(st2);
      for (let i = 0; i < 4; i += 1) { mesh(boxUV(0.25, 3, 0.25, 1), mats.timberDark, 2.4, 1.5, -5 + i * 3.4, 0, st2); kit.blockBox(sx - Wc / 2 + 3.4 + 2.4, sz + 3 - 5 + i * 3.4, 0.4, 0.4, 0); }
      const SR = roofGeometry({ w: 11, d: 5, h: 1.2, oh: 0.6, type: "gable", curve: 1.2, upturn: 0.2 });
      const srm = mesh(SR.roof, mats.thatch, 0, 3.0, 0.1, Math.PI / 2, st2);
      srm.rotation.y = Math.PI / 2;
      mesh(boxUV(0.8, 0.6, 9, 0.8), mats.timber, 1.6, 0.3, 0, 0, st2);
      kit.blockBox(sx - Wc / 2 + 3.4 + 1.6, sz + 3, 1.0, 9.2, 0);
      for (let i = 0; i < 3; i += 1) { const hay = new THREE.CylinderGeometry(0.6, 0.6, 1.1, 12).rotateZ(Math.PI / 2); mesh(hay, mats.thatch, -1.0, 0.6, -4 + i * 1.3, 0, st2); }
      kit.blockBox(sx - Wc / 2 + 3.4 - 1.0, sz + 3 - 2.7, 1.4, 4.2, 0);
      /* well */
      mesh(lathe([[0.9, 0], [1.0, 0], [1.0, 0.8], [0.8, 0.8], [0.8, 0.1]], 18), mats.stone, 6, 0, 2, 0, g);
      kit.block(sx + 6, sz + 2, 1.1);
      /* tied mules resting in the stable */
      STATION.g = g; STATION.hy = hy;
      interact("cn-pe-station", g, "Tea Horse Road post station", [sx + 4.5, sz + Dc / 2 + 4], { radius: 22, labelOffset: 1.2 });
      pointLight(sx, hy + 3.4, sz + Dc / 2 + 1, "#ffb366", 22, 18);
    }

    /* ------------------------------------------------ caravan rest stop with a stele (discovery) */
    {
      const g = group(-90, -108, 0.6);
      const stele = boxUV(0.9, 2.2, 0.32, 0.8);
      mesh(stele, F.track(new THREE.MeshStandardMaterial({ map: signTexture(F, "茶马古道", { w: 160, h: 420, bg: "#6f6a60", fg: "#2a2622", border: "#55524a", font: "bold 110px 'Noto Serif SC',serif" }), roughness: 0.9 })), 0, 1.1 + 0.3, 0, 0, g);
      mesh(boxUV(1.4, 0.3, 0.8, 0.6), mats.stone, 0, 0.15, 0, 0, g);
      kit.blockBoxIn(g, 0, 0, 1.6, 1.0);
      for (let i = 0; i < 3; i += 1) mesh(cylUV(0.2, 0.2, 0.9, 12, 0.4).rotateX(Math.PI / 2), mats.bamboo, 1.6 + i * 0.42, 0.22, 0.6, 0.2, g);
      interact("cn-pe-caravan", g, "Tea Horse Road caravan", [-84, -104], { radius: 16, labelOffset: 1.6 });
    }

    /* ------------------------------------------------ far mountains, distant forest, clouds and mist */
    F.farTerrain({ heightFn: (x, z) => baseH(x, z), colorFn, bounds: B, extent: 3600, segments: 200, sink: 12 });
    {
      const cone = new THREE.ConeGeometry(2.6, 9, 6);
      cone.translate(0, 4.2, 0);
      tint(cone, "#3b5a2e", "#22381d", 0, 9);
      const farTrees = [];
      const fr = mulberry(77);
      for (let i = 0; i < (LOW ? 1600 : 4200); i += 1) {
        const a = fr() * 6.283, r = 330 + Math.pow(fr(), 0.7) * 900, x = Math.cos(a) * r, z = Math.sin(a) * r;
        const h = baseH(x, z);
        if (h < 14 || h > 150) continue;
        farTrees.push({ x, y: h - 0.6, z, s: 0.7 + fr() * 0.8, ry: fr() * 6 });
      }
      F.instances(cone, F.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })), farTrees, { shadow: false, receive: false });
    }
    F.cloudDome({ coverage: 0.48, scale: 1.2, speed: 0.006 });
    /* a sea of clouds in the far valleys and mist banks over the tea hills */
    F.mistSheet(0, 44, 0, 3400, 3400, { opacity: 0.6, color: "#f1f4f4", speed: 0.002, ring: [470, 1800] });
    const banks = [];
    for (let i = 0; i < (LOW ? 10 : 26); i += 1) {
      const a = rnd() * 6.283, r = rr(150, 300);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      banks.push([x, hgt(x, z) + rr(5, 14), z, rr(70, 130)]);
    }
    banks.push([-150, 40, 70, 120], [-60, 20, 60, 90], [110, 30, 150, 90], [180, 34, -150, 100], [-200, 20, -150, 80]);
    F.mistBank(banks, { opacity: 0.32, morning: 2.0, night: 0.5 });
    /* grass near the player */
    F.grass({
      hgt,
      R: LOW ? 22 : 34,
      count: 4200,
      colors: ["#3f5a26", "#8da04e"],
      density: (x, z) => {
        if (streamDist(x, z) < 5.5 || onPath(x, z, 0.4) || Math.hypot(x, z) < 22) return 0;
        if (kit.blocked(x, z, 0.3)) return 0;
        for (const H of HILLS) { const i = hillInfo(H, x, z); if (i && i.w > 0.4) return i.fr > 0.72 ? 0.35 : 0.55; }
        if (inPad(x, z, -4)) return 0.25;
        return 0.95;
      },
    });
    /* birds */
    for (let i = 0; i < 10; i += 1) stage.add(bird(rr(-200, 200), rr(40, 70), rr(-200, 200)));
    F.contactShadows(() => {
      const L2 = [{ x: Wk.st.x, y: groundY(Wk.st.x, Wk.st.z), z: Wk.st.z, r: 0.42 }];
      Wk.NPC.forEach((n) => { if (Math.abs(n.x - Wk.st.x) < 80 && Math.abs(n.z - Wk.st.z) < 80) L2.push({ x: n.x, y: n.y, z: n.z, r: 0.4 }); });
      ANIMALS.forEach((a) => { const p = a.anim.root.position; if (Math.abs(p.x - Wk.st.x) < 80 && Math.abs(p.z - Wk.st.z) < 80) L2.push({ x: p.x, y: p.y, z: p.z, r: 0.55, rz: 1.1, ry: a.anim.root.rotation.y }); });
      return L2;
    });

    /* ------------------------------------------------ animals: caravan + resting mules */
    const animalMat = F.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
    const trk = (g) => F.geo(g);
    for (let i = 0; i < 3; i += 1) {
      const m = makeAnimal(i === 1 ? "horse" : "mule", animalMat, trk, { pack: i !== 1 });
      const x = -213.4, z = -180 + 3 - 3.4 + i * 3.4;
      m.root.position.set(x, PAD_H[5], z);
      m.root.rotation.y = -Math.PI / 2;
      stage.add(m.root);
      kit.blockBox(x, z, 1.9, 0.9, 0);
      ANIMALS.push({ anim: m, still: true });
    }
    {
      /* caravan: lead mule with bell and red plume, five pack mules */
      const route = smoothPts([...ROAD.slice(0, 9), [-205, -158], [-205, -166]], 260);
      let total = 0;
      const seglen = [0];
      for (let i = 1; i < route.length; i += 1) { total += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]); seglen.push(total); }
      const at = (s) => {
        s = Math.max(0, Math.min(total, s));
        let lo = 0, hi = seglen.length - 1;
        while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (seglen[mid] < s) lo = mid; else hi = mid; }
        const u = (s - seglen[lo]) / (seglen[hi] - seglen[lo] || 1);
        const a = route[lo], b = route[hi];
        return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[0] - a[0], b[1] - a[1])];
      };
      const mules = [];
      for (let i = 0; i < 6; i += 1) {
        const m = makeAnimal("mule", animalMat, trk, { pack: true, bell: i === 0, plume: i === 0 });
        stage.add(m.root);
        mules.push(m);
        ANIMALS.push({ anim: m });
      }
      CARAVAN.at = at; CARAVAN.total = total; CARAVAN.mules = mules;
    }

    /* ------------------------------------------------ per-frame: fires, steam, caravan */
    let steamT = 0;
    F.onUpdate((time, dt) => {
      if (stage.reducedMotion) return;
      fires.forEach((f, i) => { f.material.emissiveIntensity = 1.8 + Math.sin(time * 13 + i) * 0.35 + Math.sin(time * 7.3 + i * 2) * 0.25; });
      steamT += dt;
      if (steamT > 0.12) {
        steamT = 0;
        wokSpots.forEach((w) => {
          if (Math.abs(w.wp.x - Wk.st.x) > 90 || Math.abs(w.wp.z - Wk.st.z) > 90) return;
          steam.emit(w.wp.x, w.wp.y + 0.1, w.wp.z, 0, 0.9, 0, 1, 0.25, 3.2, 0.7);
          smoke.emit(w.cp.x, w.cp.y, w.cp.z, 0.15, 1.2, 0.05, 1, 0.2, 5, 1.0);
        });
        pressSpots.forEach((p) => steam.emit(p.x, p.y, p.z, 0, 1.0, 0, 1, 0.2, 3, 0.8));
      }
    });
    Wk.onUpdate((time, dt) => {
      const reduced = stage.reducedMotion;
      if (CARAVAN.at) {
        const C = CARAVAN;
        if (!reduced) {
          if (C.wait > 0) C.wait -= dt;
          else {
            C.s += C.dir * dt * 1.55;
            if (C.s > C.total - 2) { C.s = C.total - 2; C.dir = -1; C.wait = 14; }
            if (C.s < 22) { C.s = 22; C.dir = 1; C.wait = 10; }
          }
        }
        const moving = C.wait <= 0 && !reduced;
        C.mules.forEach((m, i) => {
          const s = C.s - C.dir * i * 3.3;
          const [x, z, yaw] = C.at(s);
          m.root.position.set(x, groundY(x, z), z);
          m.root.rotation.y = yaw + (C.dir < 0 ? Math.PI : 0);
          m.update(time, moving, 1, reduced);
        });
        if (C.drivers) {
          const [x1, z1, y1] = C.at(C.s + C.dir * 2.4), [x2, z2, y2] = C.at(C.s - C.dir * (6 * 3.3 + 0.6));
          Object.assign(C.drivers[0], { x: x1, z: z1, yaw: y1 + (C.dir < 0 ? Math.PI : 0), moving });
          Object.assign(C.drivers[1], { x: x2, z: z2, yaw: y2 + (C.dir < 0 ? Math.PI : 0), moving });
        }
      }
      ANIMALS.forEach((a) => { if (a.still) a.anim.update(time, false, 0, reduced); });
    });

    /* ------------------------------------------------ animal info badges, a horse to ride, more animals */
    {
      const id = (k) => animalId("puer", k);
      if (CARAVAN.mules) Wk.addInfoTarget(id("mule"), CARAVAN.mules[0].root, 2.9);
      ANIMALS.forEach((a, i) => { if (a.still && i === 1) Wk.addInfoTarget(id("horse"), a.anim.root, 2.8); });
      const fa = createFauna({ W: Wk, stage, kit, hgt, groundY, canStand, fx: F });
      const near = (x, z, r = 20) => {
        for (let d = 0; d <= r; d += 2) for (let k = 0; k < 12; k += 1) {
          const px = x + Math.cos(k * 0.52) * d, pz = z + Math.sin(k * 0.52) * d;
          if (canStand(px, pz) && !kit.blocked(px, pz, 1.2)) return [px, pz];
        }
        return [x, z];
      };
      /* ride a Yunnan pony along the Tea Horse Road */
      { const [x, z] = near(-84, -100, 12); fa.rideAnimal({ kind: "horse", x, z, yaw: 2.4, label: { en: "a Yunnan pony (Tea Horse Road)", zh: "滇马（茶马古道）" }, id: id("horse"), opts: { color: "#6a4a30" }, vmax: 4.5, vrun: 10 }); }
      { const [x, z] = near(30, 70); fa.herd({ id: id("buffalo"), kind: "buffalo", count: 3, cx: x, cz: z, R: 8, speed: 0.4 }); }
      { const [x, z] = near(118, -176); fa.herd({ id: id("goat"), kind: "goat", count: 5, cx: x, cz: z, R: 8, speed: 0.7, opts: (i) => ({ color: ["#2a2420", "#6b5644", "#d8d0c4"][i % 3] }) }); }
      fa.soar({ id: id("eagle"), kind: "eagle", count: 2, cx: -120, cz: 40, R: 50, h: 85 });
      F.contactShadows(() => fa.shadows(Wk.st), { max: 40, opacity: 0.38 });
    }

    /* post-processing: gentle bloom and a cool morning grade */
    F.post({ bloom: { strength: 0.28, radius: 0.6, threshold: 0.86 }, grade: { tint: "#f4f8f4", contrast: 1.06, saturation: 1.04, vignette: 0.3 } });
    return {};
  }

  /* ===================================================================== */
  function addPeople(Wk) {
    const D = Wk.D;
    const add = (o) => Wk.addNpc(Object.assign({ tx: 0, tz: 0, wait: Math.random() * 4 }, o));
    /* village life */
    const mix = ["tea-master", "bulang-woman", "tea-picker", "mule-driver", "elder", "schoolgirl", "dai-man"];
    for (let i = 0; i < 16; i += 1) {
      const a = Math.random() * 6.283, d = 4 + Math.random() * 16;
      add({ kind: Math.random() < 0.35 ? "idle" : "wander", cx: 0, cz: 0, R: 18, x: Math.cos(a) * d, z: Math.sin(a) * d, design: Wk.pick(mix) });
    }
    /* tea pickers on the terraces */
    (TERR.pickSpots || []).slice(0, 14).forEach(([x, z, th]) => add({ kind: "idle", act: "pick", rate: 0.8 + Math.random() * 0.5, x, z, yaw: Math.atan2(Math.cos(th), Math.sin(th)), design: D["tea-picker"] }));
    /* workshop: tea masters at the woks, rollers, a drier turning leaves */
    if (WORK.g) {
      const g = WORK.g, g2 = WORK.g2, y = WORK.yard;
      [g, g2, y].forEach((q) => q.updateMatrixWorld(true));
      for (let i = 0; i < 3; i += 1) {
        const p = new THREE.Vector3(-4.5 + i * 4.5, 0, -1.0).applyMatrix4(g.matrixWorld);
        add({ kind: "idle", act: "work", rate: 1 + i * 0.1, x: p.x, z: p.z, yaw: Math.PI, design: D[i === 1 ? "tea-master" : "tea-picker"] });
      }
      WORK.rollTables.forEach(([tx, tz], i) => {
        const p = new THREE.Vector3(tx, 0, tz + 1.15).applyMatrix4(g2.matrixWorld);
        add({ kind: "idle", act: "roll", rate: 0.9 + i * 0.15, x: p.x, z: p.z, yaw: g2.rotation.y + Math.PI, design: D[i % 2 ? "bulang-woman" : "tea-picker"] });
      });
      [[-4.3, 0], [4.5, 0]].forEach(([lx, lz]) => {
        const p = new THREE.Vector3(lx, 0, lz).applyMatrix4(y.matrixWorld);
        add({ kind: "idle", act: "pick", rate: 0.6, x: p.x, z: p.z, yaw: Math.random() * 6, design: D["tea-picker"] });
      });
    }
    /* cake press worker standing on the stone */
    if (PRESS.g) {
      const p = new THREE.Vector3(0, 0, -2.4).applyMatrix4(PRESS.g.matrixWorld);
      add({ kind: "idle", act: "work", rate: 0.6, x: p.x, z: p.z, fixedY: VALLEY + 1 + 1.04, yaw: PRESS.g.rotation.y, design: D["tea-master"] });
      const q = new THREE.Vector3(-2.4, 0, -1.8).applyMatrix4(PRESS.g.matrixWorld);
      add({ kind: "idle", act: "pour", x: q.x, z: q.z, yaw: PRESS.g.rotation.y + Math.PI, design: D["bulang-woman"] });
    }
    /* tea house: master pouring, guests */
    {
      const ry = Math.atan2(30, 30), c = Math.cos(ry), s = Math.sin(ry);
      const P = (lx, lz) => [-30 + lx * c + lz * s, -30 - lx * s + lz * c];
      const [mx, mz] = P(0, -0.4);
      add({ kind: "idle", act: "pour", rate: 0.8, x: mx, z: mz, yaw: ry, design: D["tea-master"] });
      [[-3.6, -2.2], [-3.6, -0.1], [3.6, -2.2], [3.6, -0.1], [0, 1.7]].forEach(([lx, lz], i) => {
        const [x, z] = P(lx, lz);
        add({ kind: "idle", act: i % 2 ? "pray" : null, x, z, yaw: ry + (lz < -1 ? 0 : Math.PI), design: Wk.pick(["elder", "mule-driver", "bulang-woman", "dai-man"]) });
      });
    }
    /* Jingmai and the Bulang village */
    for (let i = 0; i < 9; i += 1) {
      const a = Math.random() * 6.283, d = 4 + Math.random() * 12;
      add({ kind: Math.random() < 0.4 ? "idle" : "wander", cx: 112, cz: -206, R: 12, x: 112 + Math.cos(a) * d, z: -206 + Math.sin(a) * d, design: Wk.pick(["bulang-woman", "bulang-woman", "tea-picker", "elder", "dai-woman"]) });
    }
    for (let i = 0; i < 5; i += 1) add({ kind: "idle", act: "pick", rate: 0.7, x: 166 + Math.random() * 12, z: -150 + Math.random() * 12, yaw: Math.random() * 6, design: D[i % 2 ? "bulang-woman" : "tea-picker"] });
    /* the post station */
    for (let i = 0; i < 6; i += 1) {
      const a = Math.random() * 6.283, d = 2 + Math.random() * 8;
      add({ kind: Math.random() < 0.5 ? "idle" : "wander", cx: -200, cz: -176, R: 8, x: -200 + Math.cos(a) * d, z: -176 + Math.sin(a) * d, design: Wk.pick(["mule-driver", "mule-driver", "tea-master", "elder"]) });
    }
    /* caravan drivers (moved by the world script) */
    CARAVAN.drivers = [0, 1].map(() => {
      const n = { kind: "script", design: D["mule-driver"], x: 0, z: 0, ph: Math.random() * 6, sp: 1.1, yaw: 0, swing: 0, y: 0 };
      Wk.NPC.push(n);
      return n;
    });
  }
}
