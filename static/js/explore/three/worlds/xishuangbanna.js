import * as THREE from "three";
import { bird } from "../helpers.js";
import { buildWalkableTown } from "./walk-town.js";
import { fbm, ss, lerp, mulberry } from "./walk-engine.js";
import { createFx, SKY_PRESETS, tint, lathe, mergeGeometries } from "./yunnan-fx.js";
import { createFauna } from "./fauna.js";
import { animalId } from "../../wildlife-data.js";
import { boxUV, cylUV, roofGeometry, latticeTextures, signTexture, makeAnimal, makePeacock, lanternGeometry, species, plant, stiltHouse } from "./yunnan-props.js";

/* Walkable Xishuangbanna 西双版纳: a Dai village of stilt houses, a Theravada
   temple and white pagoda, the Water-Splashing Festival square, dragon boats
   on the Lancang (Mekong), a peacock-dance stage, a pineapple-rice stall,
   paddy fields and the rainforest with wild Asian elephants. A stylised
   composite of the prefecture, distances compressed. */

const B = { x0: -300, x1: 300, z0: -300, z1: 300 };
const LAND = 7;
/* The Lancang runs far beyond the walkable area so boat rides can follow it for kilometres. */
const RIVER = [[150, -1650], [232, -1380], [168, -1120], [252, -880], [200, -620], [178, -420], [158, -220], [140, -100], [142, 20], [160, 130], [152, 230], [140, 380], [206, 600], [118, 860], [192, 1130], [140, 1400], [204, 1650]];
const RIVER_HALF = 30;
const WATER_Y = 2.2;
const PAG = { x: -130, z: -50, R: 46, peak: 15 };
const PADS = [
  [-30, 30, 38, LAND], // village
  [-40, -70, 28, LAND + 0.4], // temple
  [60, 0, 26, LAND], // festival square
  [45, 72, 14, LAND], // peacock stage
  [22, -40, 12, LAND], // night market
  [-130, -50, 13, null], // pagoda top
  [-110, 90, 34, LAND - 0.6], // paddies
  [-178, 178, 30, LAND - 0.5], // elephant valley
];
const PADDY = { x0: -142, x1: -78, z0: 66, z1: 114, y: LAND - 0.6 };

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
const RIVER_S = smoothPts(RIVER, 640);
/* z-binned segment index so distance queries stay cheap on a long river */
const RBIN = 40, RIDX = new Map();
for (let i = 0; i < RIVER_S.length - 1; i += 1) {
  const z0 = Math.min(RIVER_S[i][1], RIVER_S[i + 1][1]) - RBIN * 2, z1 = Math.max(RIVER_S[i][1], RIVER_S[i + 1][1]) + RBIN * 2;
  for (let b = Math.floor(z0 / RBIN); b <= Math.floor(z1 / RBIN); b += 1) { if (!RIDX.has(b)) RIDX.set(b, []); RIDX.get(b).push(i); }
}
function riverInfo(x, z) {
  const list = RIDX.get(Math.floor(z / RBIN));
  let d = 1e9, best = 0;
  if (list) for (const i of list) {
    const a = RIVER_S[i], b = RIVER_S[i + 1], e = segDist(x, z, a[0], a[1], b[0], b[1]);
    if (e < d) { d = e; best = i; }
  }
  return { d, i: best };
}
const riverDist = (x, z) => (x < 40 ? 1e9 : riverInfo(x, z).d);

function baseH(x, z) {
  let h = LAND + (fbm(x * 0.012 + 2, z * 0.012 + 5, 4) - 0.5) * 5;
  h += ss(-150, -330, x) * (18 + fbm(x * 0.008, z * 0.008 + 3, 4) * 46);
  h += ss(160, 330, -z) * (10 + fbm(x * 0.01 + 8, z * 0.01, 4) * 30);
  const d = Math.hypot(x, z);
  h += ss(300, 700, d) * (30 + fbm(x * 0.005 - 3, z * 0.005 + 1, 5) * 120);
  const pr = Math.hypot(x - PAG.x, z - PAG.z);
  if (pr < PAG.R) h += PAG.peak * 0.5 * (1 + Math.cos((Math.PI * pr) / PAG.R));
  return h;
}
const PAD_H = PADS.map(([x, z, r, h]) => (h == null ? baseH(x, z) : h));
function landH(x, z) {
  let h = baseH(x, z);
  PADS.forEach(([cx, cz, r], i) => {
    const d = Math.hypot(x - cx, z - cz);
    if (d < r + 12) h = lerp(h, PAD_H[i], ss(r + 12, r, d));
  });
  /* water hole in the elephant valley */
  const wh = Math.hypot(x + 186, z - 186);
  if (wh < 12) h -= 1.6 * ss(12, 5, wh);
  return h;
}
function heightFn(x, z) {
  let h = landH(x, z);
  const rd = riverDist(x, z);
  if (rd < RIVER_HALF + 14) h = lerp(h, WATER_Y - 3.2, ss(RIVER_HALF + 12, RIVER_HALF - 6, rd));
  return h;
}
/* beyond the walkable area: a river valley with lowland banks between the hills */
function farH(x, z) {
  const rd = riverDist(x, z);
  let h = baseH(x, z);
  h = lerp(h, LAND + 2 + fbm(x * 0.01, z * 0.01, 3) * 6, ss(260, 70, rd));
  return lerp(h, WATER_Y - 2.6, ss(RIVER_HALF + 30, RIVER_HALF + 2, rd));
}
function colorFn(x, z, h) {
  const n = fbm(x * 0.05, z * 0.05, 3), n2 = fbm(x * 0.19 + 3, z * 0.19, 2);
  let c = new THREE.Color("#5a7a32").lerp(new THREE.Color("#7f9640"), n).lerp(new THREE.Color("#466a2a"), n2 * 0.5);
  if (x < -150 || z > 150) c.lerp(new THREE.Color("#365a24").lerp(new THREE.Color("#46602a"), n), 0.6);
  PADS.forEach(([cx, cz, r], i) => {
    const d = Math.hypot(x - cx, z - cz);
    if (d < r && i !== 6 && i !== 7) c.lerp(new THREE.Color("#a68a64").lerp(new THREE.Color("#b49a72"), n), ss(r, r * 0.6, d) * 0.7);
  });
  const rd = riverDist(x, z);
  if (rd < RIVER_HALF + 10) c.lerp(new THREE.Color("#8a7458").lerp(new THREE.Color("#a08a66"), n), ss(RIVER_HALF + 10, RIVER_HALF - 2, rd));
  if (h > 40) c.lerp(new THREE.Color("#2f4a22"), ss(40, 90, h) * 0.6);
  return c;
}

export default function buildXishuangbanna({ scene, stage, manager }) {
  const LOW = stage.quality === "low";
  const rnd = mulberry(20260413);
  const rr = (a, b) => a + (b - a) * rnd();
  const fx = createFx({ stage, manager });
  const nightMats = [];
  const lights = [];
  const PATHS = [];
  const VEG_EXTRA = {};
  const S = { farElephants: [], rides: [], animals: [], peacocks: [], boats: [], splashers: [], village: [], dancers: [], drums: [], stall: null, beiye: null, temple: null };

  const places = {
    village: { n: "Dai Village", zh: "傣族村寨", sub: "曼景兰式傣寨", x: -30, z: 30, r: 38, spawn: [-8, 18], look: [-34, 34], pitch: 1.47, dist: 13 },
    temple: { n: "Dai Buddhist Temple", zh: "傣族佛寺", sub: "南传上座部佛寺", x: -40, z: -70, r: 28, spawn: [-40, -42], look: [-40, -74], pitch: 1.45, dist: 14 },
    pagoda: { n: "White Pagoda", zh: "曼飞龙白塔", sub: "笋塔", x: -130, z: -50, r: 16, spawn: [-108, -36], look: [-130, -50], pitch: 1.4, dist: 15 },
    square: { n: "Water-Splashing Square", zh: "泼水广场", sub: "泼水节 · 傣历新年", x: 60, z: 0, r: 26, spawn: [40, 6], look: [62, 0], pitch: 1.47, dist: 12 },
    river: { n: "Lancang River Bank", zh: "澜沧江畔", sub: "澜沧江 · 湄公河", x: 112, z: 40, r: 20, spawn: [104, 40], look: [150, 30], pitch: 1.5, dist: 12 },
    pier: { n: "Boat Pier", zh: "游船码头", sub: "乘船游澜沧江", x: 118, z: 78, r: 14, spawn: [108, 78], look: [140, 78], pitch: 1.45, dist: 13 },
    trek: { n: "Elephant Trek", zh: "骑象", sub: "大象骑行站", x: -84, z: 6, r: 16, spawn: [-72, 12], look: [-86, 4], pitch: 1.42, dist: 15 },
    stage: { n: "Peacock Dance Stage", zh: "孔雀舞台", sub: "孔雀舞", x: 45, z: 72, r: 14, spawn: [45, 56], look: [45, 74], pitch: 1.47, dist: 12 },
    market: { n: "Night Market", zh: "夜市小吃", sub: "菠萝饭", x: 22, z: -40, r: 12, spawn: [16, -28], look: [22, -42], pitch: 1.47, dist: 11 },
    paddies: { n: "Rice Paddies", zh: "稻田", sub: "傣家稻田", x: -110, z: 90, r: 34, spawn: [-72, 70], look: [-110, 92], pitch: 1.5, dist: 13 },
    forest: { n: "Rainforest", zh: "热带雨林", sub: "热带雨林", x: -150, z: 140, r: 30, spawn: [-138, 126], look: [-170, 160], pitch: 1.5, dist: 12 },
    elephants: { n: "Wild Elephant Valley", zh: "野象谷", sub: "亚洲象观景台", x: -178, z: 178, r: 30, spawn: [-146, 148], look: [-180, 182], pitch: 1.45, dist: 13 },
  };

  const mapColor = (x, z) => {
    if (riverDist(x, z) < RIVER_HALF - 3) return [96, 116, 96];
    if (x > PADDY.x0 && x < PADDY.x1 && z > PADDY.z0 && z < PADDY.z1) return [120, 150, 92];
    const c = colorFn(x, z, heightFn(x, z));
    return [c.r * 255, c.g * 255, c.b * 255].map((v) => Math.min(255, v * 1.1));
  };

  const W = buildWalkableTown({
    scene,
    stage,
    manager,
    seed: 20260413,
    terrain: {
      heightFn,
      farHeightFn: farH,
      colorFn,
      segments: LOW ? 190 : 320,
      material: (M) => {
        const s = fx.surface("ground", { repeat: [140, 140], seed: 22 });
        return M({ vertexColors: true, roughness: 1, map: s.map, normalMap: s.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughnessMap: s.roughnessMap });
      },
    },
    water: [],
    places,
    startPlace: "village",
    worldName: { en: "Xishuangbanna", zh: "西双版纳", sub: "西双版纳 · 云南" },
    mapBounds: B,
    mapLines: [[[-30, 30], [60, 0]], [[-30, 30], [-40, -70]], [[-40, -70], [-130, -50]], [[60, 0], [112, 40]], [[60, 0], [45, 72]], [[60, 0], [22, -40]], [[-30, 30], [-110, 90], [-150, 140], [-178, 178]]],
    mapColor,
    kmPerUnit: 0.03,
    fogDensity: 0.0019,
    exposureScale: 0.92,
    far: 4200,
    nightMats,
    waterMask: (x, z) => riverDist(x, z) < RIVER_HALF - 5 || Math.hypot(x + 186, z - 186) < 6.5 || (x > PADDY.x0 + 0.5 && x < PADDY.x1 - 0.5 && z > PADDY.z0 + 0.5 && z < PADDY.z1 - 0.5),
    walker: {
      collision: "slide",
      skyKeys: SKY_PRESETS.banna,
      flagColors: ["#e6b43c", "#b2321f", "#f4f1ea", "#2f6a4a", "#d86a9a"],
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
  W.riverDist = riverDist;
  return W;

  /* ===================================================================== */
  function buildWorld({ kit, W: Wk, hgt, groundY, makePath, addBridge, canStand }) {
    fx.attach(Wk);
    const F = fx;
    const { blockBox, block } = kit;
    const interact = (id, g, label, pos, o) => {
      const e = Wk.interactive(id, g, label, pos, o);
      g.traverse((c) => { if (c.material && c.material.userData && c.material.userData.night && !nightMats.includes(c.material)) nightMats.push(c.material); });
      return e;
    };

    /* ------------------------------------------------ materials */
    const mats = {
      paving: F.pbr("flagstone", { color: "#c2b49a", color2: "#a99a80", color3: "#6a5e4a", cells: 6, repeat: [6, 6], seed: 51 }, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
      brickPave: F.pbr("brick", { color: "#a8563a", color2: "#8f4630", color3: "#c9b49a", rows: 14, cols: 6, repeat: [1, 1], seed: 52 }, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      path: F.pbr("ground", { repeat: [0.6, 0.6], seed: 53, bump: 1.3 }, { color: "#b49a78", polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      white: F.pbr("plaster", { color: "#d8d2c4", color2: "#c9c1b0", color3: "#9a9080", stains: 0.45, seed: 54 }, { roughness: 1 }),
      gold: F.pbr("gold", { color: "#e0b347", color2: "#c28f2a", seed: 55 }, { metalness: 0.8 }),
      goldPlain: F.track(new THREE.MeshStandardMaterial({ color: "#d9a93c", metalness: 0.85, roughness: 0.3 })),
      roofRed: F.pbr("tiles", { color: "#b5532c", color2: "#9c4424", color3: "#5e2814", cols: 9, rows: 12, seed: 56 }, { side: THREE.DoubleSide }),
      roofGrey: F.pbr("tiles", { color: "#6a5e54", color2: "#574c44", color3: "#2e2824", lichen: true, seed: 57 }, { side: THREE.DoubleSide }),
      thatch: F.pbr("thatch", { color: "#b49a62", color2: "#8f7a4c", color3: "#4a3b22", seed: 58 }, { side: THREE.DoubleSide }),
      weave: F.pbr("weave", { color: "#cdb27a", color2: "#b39660", color3: "#6a5434", cells: 16, seed: 59 }),
      bamboo: F.pbr("bamboo", { color: "#b9a46a", color2: "#a08c52", color3: "#5e4f2c", seed: 60 }),
      timber: F.pbr("planks", { color: "#7a5236", color2: "#62402a", color3: "#2e1d12", boards: 5, seed: 61 }),
      timberDark: F.pbr("planks", { color: "#4c3020", color2: "#3c2618", color3: "#1c120a", boards: 6, seed: 62 }),
      red: F.track(new THREE.MeshStandardMaterial({ color: "#9e2a20", roughness: 0.6 })),
      green: F.track(new THREE.MeshStandardMaterial({ color: "#2f6a4a", roughness: 0.6 })),
      dark: F.track(new THREE.MeshStandardMaterial({ color: "#2a1e16", roughness: 0.85 })),
      water: F.waterMaterial({ color: "#4a5238", opacity: 0.95, repeat: [3, 40], flow: [0, 0.035], flow2: [0.006, 0.02], scale: 0.55, rough: 0.14 }),
      paddyWater: F.waterMaterial({ color: "#5b6e52", opacity: 0.86, repeat: [10, 10], flow: [0.002, 0.003], flow2: [-0.002, 0.002], scale: 0.25 }),
      pool: F.waterMaterial({ color: "#4f5e44", opacity: 0.9, repeat: [3, 3], flow: [0.004, 0.002], flow2: [-0.003, 0.004], scale: 0.3 }),
      foam: F.foamMaterial({ repeat: [1, 40], speed: 0.05 }),
      cloth: F.track(new THREE.MeshStandardMaterial({ color: "#e9e4d8", roughness: 0.95 })),
      fig: F.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })),
      stone: F.pbr("flagstone", { color: "#8a8576", color2: "#6f6a5e", color3: "#3d3a30", moss: true, cells: 4, seed: 63 }),
    };
    const skinMatR = F.pbr("plaster", { color: "#7a7470", color2: "#625c58", color3: "#4a4542", stains: 0.2, seed: 82, bump: 3 }, { vertexColors: true });
    const BOAT_OBST_PIER = [], BOAT_OBST = [];
    const lat = latticeTextures(F, { color: "#4a2c18", gap: "#120c08", glow: "#ffb35c", pattern: "diamond" });
    const windowMat = F.track(new THREE.MeshStandardMaterial({ map: lat.map, emissiveMap: lat.emissiveMap, emissive: "#ffb35c", emissiveIntensity: 0, roughness: 0.8 }));
    windowMat.userData.night = true;
    nightMats.push(windowMat);
    const lan = lanternGeometry();
    F.geo(lan.body); F.geo(lan.caps);
    const lanternMat = F.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: "#ff5a22", emissiveIntensity: 0 }));
    lanternMat.userData.night = true;
    nightMats.push(lanternMat);
    const capMat = F.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }));

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
    const lantern = (parent, x, y, z) => { mesh(lan.body, lanternMat, x, y, z, 0, parent); mesh(lan.caps, capMat, x, y, z, 0, parent); };
    const pointLight = (x, y, z, color, base, dist = 18) => {
      const l = new THREE.PointLight(color, 0, dist, 1.6);
      l.position.set(x, y, z);
      l.userData.base = base;
      stage.add(l);
      lights.push(l);
    };
    const path = (pts, w, mat) => { const r = makePath(pts, w, mat); PATHS.push({ pts: r.map((v) => [v.x, v.z]), w }); return r; };

    /* ------------------------------------------------ paths */
    [
      [[-10, 20], [20, 10], [38, 4]],
      [[-30, 8], [-36, -20], [-40, -42]],
      [[-64, -70], [-90, -60], [-112, -52]],
      [[82, 6], [100, 20], [108, 38]],
      [[56, 24], [50, 44], [46, 60]],
      [[48, -14], [34, -28], [24, -34]],
      [[-50, 46], [-72, 66], [-74, 92], [-74, 118], [-100, 124], [-130, 128], [-142, 132]],
      [[-142, 132], [-146, 146]],
    ].forEach((p) => path(p, 2.8, mats.path));

    /* ------------------------------------------------ the Lancang river */
    const rp = RIVER_S.map(([x, z]) => new THREE.Vector3(x, 0, z));
    kit.ribbon(rp, RIVER_HALF * 2 + 10, () => WATER_Y, mats.water, 40);
    [-1, 1].forEach((side) => {
      const edge = rp.map((p, i) => {
        const q = rp[Math.min(i + 1, rp.length - 1)], o = rp[Math.max(i - 1, 0)];
        const tx = q.x - o.x, tz = q.z - o.z, L = Math.hypot(tx, tz) || 1;
        return new THREE.Vector3(p.x - (tz / L) * (RIVER_HALF - 1.5) * side, 0, p.z + (tx / L) * (RIVER_HALF - 1.5) * side);
      });
      kit.ribbon(edge, 3, () => WATER_Y + 0.03, mats.foam, 10);
    });
    /* stone steps (ghat) down to the water by the festival square */
    {
      const g = group(112, 22, Math.PI / 2 + 0.05, LAND - 0.2);
      for (let i = 0; i < 7; i += 1) mesh(boxUV(20, 0.5, 1.4, 1), mats.stone, 0, -i * 0.55, 1 + i * 1.3, 0, g);
    }

    /* ------------------------------------------------ Dai stilt houses (竹楼) */
    const dm = (thatch) => ({
      post: mats.timberDark, floor: mats.timber, wall: rnd() < 0.5 ? mats.weave : mats.bamboo, roof: thatch ? mats.thatch : rnd() < 0.5 ? mats.roofGrey : mats.roofRed,
      trim: mats.timberDark, gable: mats.weave, dark: mats.dark, window: windowMat, orn: mats.goldPlain,
    });
    let made = 0;
    for (let a = 0; a < Math.PI * 2 && made < 14; a += 0.43) {
      const r = rr(18, 34), x = -30 + Math.cos(a) * r, z = 30 + Math.sin(a) * r;
      if (PATHS.some((p) => polyDist(x, z, p.pts) < p.w / 2 + 7)) continue;
      if (Math.hypot(x - 8, z - 52) < 10) continue;
      const g = group(x, z, Math.atan2(-30 - x, 30 - z), LAND);
      const h = stiltHouse(F, dm(rnd() < 0.4), { w: rr(8, 10), d: rr(6, 7.5), postH: 2.1, wallH: 2.2, roofH: rr(4.6, 5.6), roofType: "xieshan", veranda: 2.4, ornament: rnd() < 0.5 ? "finial" : null, stairSide: rnd() < 0.5 ? 1 : -1, upturn: 0.2, oh: 1.6 });
      g.add(h.group);
      kit.blockBoxIn(g, 0, 0, h.foot[0], h.foot[1]);
      kit.blockBoxIn(g, h.stairX, h.foot[1] / 2 - 1.2, 1.1, 2.6);
      S.village.push(g);
      made += 1;
    }
    /* the stilt-house discovery: one house with a granary and a loom under it */
    {
      const g = group(-30, 30, 0.3, LAND);
      const h = stiltHouse(F, dm(true), { w: 10, d: 7, postH: 2.2, wallH: 2.3, roofH: 5.6, roofType: "xieshan", veranda: 2.6, ornament: "finial", stairSide: 1, upturn: 0.22, oh: 1.8 });
      g.add(h.group);
      /* loom and baskets under the floor */
      mesh(boxUV(1.6, 1.0, 0.9, 0.6), mats.timber, -2.4, 0.5, -1.2, 0, g);
      mesh(cylUV(0.35, 0.28, 0.55, 12, 0.3), mats.weave, 1.6, 0.28, -1.8, 0, g);
      mesh(cylUV(0.35, 0.28, 0.55, 12, 0.3), mats.weave, 2.4, 0.28, -1.4, 0, g);
      kit.blockBoxIn(g, 0, 0, h.foot[0], h.foot[1]);
      kit.blockBoxIn(g, h.stairX, h.foot[1] / 2 - 1.2, 1.1, 2.6);
      interact("cn-xb-zhulou", g, "Dai bamboo house · 竹楼", [-30 + 8.5 * Math.cos(0.3), 30 + 8.5 * Math.sin(0.3) + 2], { radius: 18, labelOffset: 1.2 });
    }

    /* ------------------------------------------------ clothing stall (筒裙) */
    {
      const g = group(8, 52, -2.4, LAND);
      [[-1.6, -1], [1.6, -1], [1.6, 1], [-1.6, 1]].forEach(([a, b]) => mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), mats.timberDark, a, 1.3, b, 0, g));
      const aw = roofGeometry({ w: 3.6, d: 2.4, h: 0.8, oh: 0.4, type: "gable", curve: 1.1, upturn: 0.1 });
      mesh(aw.roof, mats.thatch, 0, 2.6, 0, 0, g);
      mesh(boxUV(3.2, 0.08, 0.08, 1), mats.timberDark, 0, 2.2, 0.9, 0, g);
      const skirtTex = (c1, c2) => {
        const c = F.canvas(128, 256), q = c.getContext("2d");
        q.fillStyle = c1; q.fillRect(0, 0, 128, 256);
        for (let i = 0; i < 9; i += 1) { q.fillStyle = i % 2 ? c2 : "#e6c25a"; q.fillRect(0, 170 + i * 9, 128, 4); }
        for (let i = 0; i < 40; i += 1) { q.fillStyle = "rgba(255,255,255,.15)"; q.fillRect(Math.random() * 128, Math.random() * 160, 2, 12); }
        return F.toTex(c);
      };
      [["#2d6e74", "#8a2f4a"], ["#7a2a52", "#2a5a8a"], ["#c46a2a", "#2d6e4a"], ["#3a3a7a", "#c43a4a"], ["#e4a3b8", "#6a2a4a"]].forEach(([a, b], i) => {
        const m = F.track(new THREE.MeshStandardMaterial({ map: skirtTex(a, b), roughness: 0.85, side: THREE.DoubleSide }));
        mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.4, 14, 1, true), m, -1.3 + i * 0.65, 1.45, 0.9, 0, g);
      });
      mesh(boxUV(3, 0.9, 0.9, 0.6), mats.timber, 0, 0.45, -0.4, 0, g);
      kit.blockBoxIn(g, 0, 0, 3.6, 2.4);
      interact("cn-xb-clothing", g, "Dai clothing · 筒裙", [8 + 3.4 * Math.sin(-2.4), 52 + 3.4 * Math.cos(-2.4)], { radius: 12, labelOffset: 1.0 });
    }

    /* ------------------------------------------------ the temple compound */
    function templeHall(g, { w, d, tiers = 3, h0 = 1.6, wallH = 4.2 }) {
      /* raised base with naga stairs */
      mesh(boxUV(w + 2, h0, d + 2, 1.2), mats.white, 0, h0 / 2, 0, 0, g);
      mesh(boxUV(w + 2.2, 0.22, d + 2.2, 1), mats.red, 0, h0, 0, 0, g);
      for (let i = 0; i < 6; i += 1) mesh(boxUV(4.4, 0.27, 0.5, 1), mats.white, 0, (h0 / 6) * (i + 0.5), d / 2 + 1 + 0.25 + (5 - i) * 0.5, 0, g);
      [-1, 1].forEach((sx) => {
        /* naga balustrades: a serpent body sweeping down, head raised at the bottom */
        const pts = [];
        for (let i = 0; i <= 12; i += 1) { const t = i / 12; pts.push(new THREE.Vector3(sx * 2.45, h0 + 0.5 - t * (h0 + 0.2) + Math.sin(t * Math.PI) * 0.2, d / 2 + 1 + t * 3.2)); }
        pts.push(new THREE.Vector3(sx * 2.45, 1.2, d / 2 + 4.6));
        const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.2, 8, false);
        mesh(tube, mats.goldPlain, 0, 0, 0, 0, g);
        mesh(new THREE.ConeGeometry(0.32, 0.9, 6).rotateX(-0.6), mats.green, sx * 2.45, 1.55, d / 2 + 4.75, 0, g);
      });
      /* columns and walls (front portico open) */
      for (let i = 0; i < 6; i += 1) {
        const x = -w / 2 + 0.4 + (i * (w - 0.8)) / 5;
        mesh(cylUV(0.26, 0.28, wallH + 0.6, 12, 1), mats.red, x, h0 + (wallH + 0.6) / 2, d / 2 - 0.3, 0, g);
        mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 12), mats.goldPlain, x, h0 + wallH + 0.35, d / 2 - 0.3, 0, g);
      }
      mesh(boxUV(w - 0.6, wallH, 0.3, 1.2), mats.white, 0, h0 + wallH / 2, -d / 2 + 0.3, 0, g);
      mesh(boxUV(0.3, wallH, d - 2.4, 1.2), mats.white, -w / 2 + 0.3, h0 + wallH / 2, -1.0, 0, g);
      mesh(boxUV(0.3, wallH, d - 2.4, 1.2), mats.white, w / 2 - 0.3, h0 + wallH / 2, -1.0, 0, g);
      mesh(boxUV(w - 0.6, wallH, 0.3, 1.2), mats.white, 0, h0 + wallH / 2, d / 2 - 2.4, 0, g);
      mesh(boxUV(w - 0.4, 0.5, 0.36, 1), mats.gold, 0, h0 + wallH - 0.3, d / 2 - 2.35, 0, g);
      mesh(new THREE.BoxGeometry(2.4, 3.2, 0.2), mats.red, 0, h0 + 1.6, d / 2 - 2.2, 0, g);
      mesh(new THREE.BoxGeometry(2.0, 2.8, 0.22), mats.gold, 0, h0 + 1.5, d / 2 - 2.18, 0, g);
      for (let i = 0; i < 4; i += 1) if (i !== 1 && i !== 2) mesh(new THREE.PlaneGeometry(1.2, 1.8), windowMat, -w / 2 + 2 + i * ((w - 4) / 3), h0 + 2.2, d / 2 - 2.24, 0, g);
      /* stacked steep roofs, descending tiers, gilded ridges and finials */
      const top = h0 + wallH + 0.6;
      for (let t = 0; t < tiers; t += 1) {
        const tw = w + 1.8 - t * (w * 0.22), td = d + 1.4 - t * 0.6, th = 3.2 + t * 0.4;
        const R = roofGeometry({ w: tw, d: td, h: th, oh: 1.2, type: "gable", curve: 1.12, upturn: 0.65, tile: 1 });
        const y = top + t * 2.4;
        mesh(R.roof, mats.roofRed, 0, y, 0, 0, g);
        if (R.trim) mesh(R.trim, mats.goldPlain, 0, y, 0, 0, g);
        /* gilded gable triangle */
        const gt = new THREE.BufferGeometry();
        const hw = tw / 2 + 0.6, hd = td / 2 + 0.4;
        gt.setAttribute("position", new THREE.Float32BufferAttribute([hw, 0.2, -hd * 0.7, hw, 0.2, hd * 0.7, hw, th - 0.2, 0, -hw, 0.2, hd * 0.7, -hw, 0.2, -hd * 0.7, -hw, th - 0.2, 0], 3));
        gt.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 1, 1.5, 0, 0, 2, 0, 1, 1.5], 2));
        gt.computeVertexNormals();
        mesh(gt, mats.gold, 0, y, 0, 0, g).material.side = THREE.DoubleSide;
        /* flame finials along the ridge */
        const n = 5 - t;
        for (let i = 0; i < n; i += 1) mesh(new THREE.ConeGeometry(0.12, 0.8, 5), mats.goldPlain, -tw / 2 + 0.6 + (i * (tw - 1.2)) / Math.max(1, n - 1), y + th + 0.45, 0, 0, g);
        /* naga (serpent) eave ends at the gable corners */
        [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
          const c = mesh(new THREE.ConeGeometry(0.14, 1.2, 5), mats.goldPlain, sx * (tw / 2 + 1.2), y + 0.9, sz * (td / 2 + 1.2), 0, g);
          c.rotation.set(sz * 0.6, 0, -sx * 0.4);
        }));
      }
      return top + tiers * 2.4 + 3;
    }
    {
      const tx = -40, tz = -70;
      const g = group(tx, tz, 0, PAD_H[1]);
      const Wc = 46, Dc = 40;
      /* low white compound wall with a gold band and gaps for gates */
      const wall = (lx, lz, len, alongX) => {
        mesh(alongX ? boxUV(len, 1.4, 0.5, 1.2) : boxUV(0.5, 1.4, len, 1.2), mats.white, lx, 0.7, lz, 0, g);
        mesh(alongX ? boxUV(len + 0.1, 0.18, 0.62, 1) : boxUV(0.62, 0.18, len + 0.1, 1), mats.gold, lx, 1.45, lz, 0, g);
        kit.blockBox(tx + lx, tz + lz, alongX ? len : 0.6, alongX ? 0.6 : len, 0);
      };
      const gap = 6;
      const seg = (Wc - gap) / 2;
      wall(-(gap / 2 + seg / 2), Dc / 2, seg, true);
      wall(gap / 2 + seg / 2, Dc / 2, seg, true);
      wall(0, -Dc / 2, Wc, true);
      wall(Wc / 2, 0, Dc, false);
      const segW = (Dc - gap) / 2;
      wall(-Wc / 2, -(gap / 2 + segW / 2), segW, false);
      wall(-Wc / 2, gap / 2 + segW / 2, segW, false);
      /* gate pavilion */
      {
        const gg = new THREE.Group();
        gg.position.set(0, 0, Dc / 2);
        g.add(gg);
        [-2.6, 2.6].forEach((x) => { mesh(cylUV(0.22, 0.24, 3.4, 10, 1), mats.red, x, 1.7, 0, 0, gg); kit.blockBox(tx + x, tz + Dc / 2, 0.6, 0.6, 0); });
        const R1 = roofGeometry({ w: 6.4, d: 3, h: 2.2, oh: 0.8, type: "gable", curve: 1.12, upturn: 0.6 });
        mesh(R1.roof, mats.roofRed, 0, 3.4, 0, 0, gg);
        if (R1.trim) mesh(R1.trim, mats.goldPlain, 0, 3.4, 0, 0, gg);
        const R2 = roofGeometry({ w: 3.6, d: 2.4, h: 1.8, oh: 0.6, type: "gable", curve: 1.12, upturn: 0.6 });
        mesh(R2.roof, mats.roofRed, 0, 4.9, 0, 0, gg);
        if (R2.trim) mesh(R2.trim, mats.goldPlain, 0, 4.9, 0, 0, gg);
        mesh(new THREE.ConeGeometry(0.12, 0.9, 5), mats.goldPlain, 0, 7.1, 0, 0, gg);
        /* gate guardian lions (chinthe-like) */
        [-3.6, 3.6].forEach((x) => {
          mesh(boxUV(1.0, 0.8, 1.0, 0.6), mats.white, x, 0.4, 1.2, 0, gg);
          mesh(boxUV(0.6, 1.0, 0.8, 0.6), mats.white, x, 1.3, 1.2, 0, gg);
          mesh(boxUV(0.5, 0.45, 0.55, 0.6), mats.white, x, 2.0, 1.45, 0, gg);
          kit.blockBox(tx + x, tz + Dc / 2 + 1.2, 1.1, 1.1, 0);
        });
      }
      /* main hall (vihara) */
      const hall = new THREE.Group();
      hall.position.set(0, 0, -5);
      g.add(hall);
      const hallTop = templeHall(hall, { w: 18, d: 14, tiers: 3 });
      kit.blockBox(tx, tz - 5, 20.4, 16.4, 0);
      kit.blockBox(tx - 2.45, tz - 5 + 7 + 1 + 2.2, 0.6, 4.6, 0);
      kit.blockBox(tx + 2.45, tz - 5 + 7 + 1 + 2.2, 0.6, 4.6, 0);
      /* Buddha image visible in the portico */
      const bud = new THREE.Group();
      bud.position.set(0, 1.6, 1.2);
      hall.add(bud);
      mesh(lathe([[0, 0], [1.0, 0], [1.1, 0.25], [0.9, 0.5], [0, 0.5]], 18), mats.goldPlain, 0, 0, 0, 0, bud);
      mesh(boxUV(1.4, 0.9, 1.0, 1), mats.goldPlain, 0, 0.9, 0, 0, bud);
      mesh(boxUV(0.9, 1.1, 0.6, 1), mats.goldPlain, 0, 1.85, 0, 0, bud);
      mesh(new THREE.SphereGeometry(0.34, 14, 10), mats.goldPlain, 0, 2.65, 0.05, 0, bud);
      mesh(new THREE.ConeGeometry(0.16, 0.6, 10), mats.goldPlain, 0, 3.15, 0.05, 0, bud);
      /* drum pavilion and monks' quarters */
      {
        const dp = new THREE.Group();
        dp.position.set(15, 0, 10);
        g.add(dp);
        [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]].forEach(([a, b]) => { mesh(cylUV(0.14, 0.15, 3, 8, 1), mats.red, a, 1.5, b, 0, dp); kit.blockBox(tx + 15 + a, tz + 10 + b, 0.4, 0.4, 0); });
        const R = roofGeometry({ w: 3.6, d: 3.6, h: 2.4, oh: 0.6, type: "hip", curve: 1.2, upturn: 0.6, ridgeRatio: 0.05 });
        mesh(R.roof, mats.roofRed, 0, 3, 0, 0, dp);
        if (R.trim) mesh(R.trim, mats.goldPlain, 0, 3, 0, 0, dp);
        const drum = lathe([[0, -0.9], [0.5, -0.9], [0.62, 0], [0.5, 0.9], [0, 0.9]], 18);
        drum.rotateZ(Math.PI / 2);
        mesh(drum, mats.red, 0, 1.4, 0, 0, dp);
        S.drumPos = new THREE.Vector3(tx + 15, PAD_H[1] + 1.4, tz + 10);
      }
      {
        const mq = stiltHouse(F, dm(false), { w: 12, d: 6, postH: 1.4, wallH: 2.2, roofH: 4, roofType: "gable", veranda: 1.8, stairSide: -1, upturn: 0.25, oh: 1.2 });
        mq.group.position.set(-14, 0, -12);
        mq.group.rotation.y = Math.PI / 2;
        g.add(mq.group);
        kit.blockBox(tx - 14, tz - 12, mq.foot[1], mq.foot[0], 0);
      }
      /* scripture pavilion with palm-leaf manuscripts (贝叶经) */
      {
        const sp = new THREE.Group();
        sp.position.set(-14, 0, 10);
        g.add(sp);
        mesh(boxUV(7, 1.0, 5.4, 1), mats.white, 0, 0.5, 0, 0, sp);
        [[-3, -2.3], [3, -2.3], [3, 2.3], [-3, 2.3]].forEach(([a, b]) => mesh(cylUV(0.16, 0.17, 3.2, 8, 1), mats.red, a, 2.6, b, 0, sp));
        const R = roofGeometry({ w: 6.6, d: 5, h: 2.8, oh: 0.9, type: "gable", curve: 1.12, upturn: 0.6 });
        mesh(R.roof, mats.roofRed, 0, 4.2, 0, 0, sp);
        if (R.trim) mesh(R.trim, mats.goldPlain, 0, 4.2, 0, 0, sp);
        mesh(boxUV(3.2, 0.1, 1.4, 1), mats.timberDark, 0, 1.75, 0, 0, sp);
        [[-1.4, -0.6], [1.4, -0.6], [1.4, 0.6], [-1.4, 0.6]].forEach(([a, b]) => mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), mats.timberDark, a, 1.38, b, 0, sp));
        /* palm-leaf bundles: long narrow strips with string holes and wooden covers */
        const leafTex = (() => {
          const c = F.canvas(512, 64), q = c.getContext("2d");
          q.fillStyle = "#d6c08a"; q.fillRect(0, 0, 512, 64);
          q.fillStyle = "#2a2014";
          for (let r = 0; r < 4; r += 1) for (let i = 0; i < 60; i += 1) { q.fillRect(30 + i * 7.5, 10 + r * 12, 3 + Math.random() * 3, 6); }
          q.beginPath(); q.arc(140, 32, 4, 0, 7); q.arc(372, 32, 4, 0, 7); q.fill();
          return F.toTex(c);
        })();
        const leafMat = F.track(new THREE.MeshStandardMaterial({ map: leafTex, roughness: 0.75 }));
        for (let k = 0; k < 5; k += 1) {
          const b = mesh(boxUV(1.2, 0.12, 0.13, 1), mats.timber, -1.0 + (k % 3) * 0.05, 1.86 + Math.floor(k / 3) * 0.13, -0.3 + k * 0.12, 0, sp);
          b.rotation.y = (k - 2) * 0.05;
        }
        const open = new THREE.Mesh(F.geo(new THREE.PlaneGeometry(1.1, 0.14).rotateX(-Math.PI / 2)), leafMat);
        open.position.set(0.7, 1.82, 0.1);
        sp.add(open);
        for (let k = 1; k < 4; k += 1) { const o2 = open.clone(); o2.position.z += k * 0.16; sp.add(o2); }
        kit.blockBox(tx - 14, tz + 10, 7.4, 5.8, 0);
        S.beiye = sp;
        stage.root.updateMatrixWorld(true);
        const bp = new THREE.Vector3(0, 0, 4.3).applyMatrix4(sp.matrixWorld);
        interact("cn-xb-beiye", sp, "Palm-leaf scriptures · 贝叶经", [bp.x, bp.z], { radius: 12, labelOffset: 0.8 });
      }
      /* talipot palm (the beiye palm) and frangipani in the courtyard */
      S.templePlants = [{ x: tx - 20, z: tz + 14 }, { x: tx + 19, z: tz - 15 }, { x: tx - 19, z: tz - 15 }];
      lantern(g, -2.6, 2.9, Dc / 2 + 0.6);
      lantern(g, 2.6, 2.9, Dc / 2 + 0.6);
      pointLight(tx, PAD_H[1] + 5, tz + 4, "#ffc070", 30, 26);
      S.temple = g;
      /* hall discovery: a proxy group around the hall */
      const proxy = new THREE.Group();
      const pm = new THREE.Mesh(F.geo(new THREE.BoxGeometry(20, hallTop, 16)), mats.dark);
      pm.visible = false;
      pm.position.set(tx, PAD_H[1] + hallTop / 2, tz - 5);
      proxy.add(pm);
      interact("cn-xb-temple", proxy, "Dai Buddhist temple", [tx + 5, tz + 12], { radius: 22, labelOffset: 0.5 });
    }

    /* ------------------------------------------------ white pagoda (曼飞龙白塔, the "bamboo-shoot pagoda") */
    {
      const px = PAG.x, pz = PAG.z, py = PAD_H[5];
      const g = group(px, pz, 0.2, py);
      const base = new THREE.CylinderGeometry(9.5, 10.2, 1.4, 8);
      mesh(base, mats.white, 0, 0.7, 0, 0, g);
      mesh(new THREE.CylinderGeometry(9.7, 9.7, 0.18, 8), mats.gold, 0, 1.45, 0, 0, g);
      const stupa = (s) => lathe([
        [1.9, 0], [1.9, 0.6], [1.6, 0.62], [1.6, 1.2], [1.35, 1.22], [1.35, 1.8], [1.15, 1.82],
        [1.25, 2.1], [1.32, 2.6], [1.2, 3.2], [0.95, 3.7], [0.62, 4.1], [0.52, 4.25], [0.58, 4.4], [0.42, 4.55],
        [0.46, 4.7], [0.33, 4.85], [0.36, 5.0], [0.24, 5.15], [0.26, 5.3], [0.14, 5.6], [0.1, 6.2], [0.0, 6.6],
      ].map(([r, y]) => [r * s, y * s]), 24);
      const finial = (s) => lathe([[0.18, 0], [0.12, 0.3], [0.32, 0.45], [0.06, 0.6], [0.05, 1.2], [0.2, 1.3], [0.03, 1.45], [0, 1.8]].map(([r, y]) => [r * s, y * s]), 12);
      mesh(stupa(2.45), mats.white, 0, 1.5, 0, 0, g);
      mesh(finial(2.0), mats.goldPlain, 0, 1.5 + 6.2 * 2.45, 0, 0, g);
      /* gold bands */
      [1.82, 4.25, 4.7].forEach((y) => mesh(new THREE.TorusGeometry(1.25 * 2.45 * (y > 4 ? 0.43 : 0.95), 0.07, 6, 28).rotateX(Math.PI / 2), mats.goldPlain, 0, 1.5 + y * 2.45, 0, 0, g));
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8, r = 6.6;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        mesh(stupa(1.05), mats.white, x, 1.5, z, 0, g);
        mesh(finial(0.9), mats.goldPlain, x, 1.5 + 6.2 * 1.05, z, 0, g);
        /* niche shrine facing out */
        const ni = mesh(boxUV(0.9, 1.1, 0.5, 1), mats.dark, Math.cos(a) * (r + 1.6), 2.1, Math.sin(a) * (r + 1.6), -a + Math.PI / 2, g);
        ni.rotation.y = Math.PI / 2 - a;
      }
      /* steps up the octagonal base */
      for (let i = 0; i < 4; i += 1) mesh(boxUV(3, 0.35, 0.6, 1), mats.white, 0, 0.18 + i * 0.35, 10.6 - i * 0.55, 0, g);
      kit.block(px, pz, 10.4);
      stage.root.updateMatrixWorld(true);
      const bp = new THREE.Vector3(3.5, 0, 13).applyMatrix4(g.matrixWorld);
      interact("cn-xb-pagoda", g, "White Pagoda · 笋塔", [bp.x, bp.z], { radius: 26, labelOffset: 1.2 });
      /* bells and prayer streamers (Dai tung banners) on poles */
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2, r = 13;
        const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
        const pole = mesh(new THREE.CylinderGeometry(0.07, 0.09, 7, 6), mats.timberDark, x, hgt(x, z) + 3.5, z);
        block(x, z, 0.25);
        kit.flagString(new THREE.Vector3(x, hgt(x, z) + 6.8, z), new THREE.Vector3(px + Math.cos(a + 1.047) * r, hgt(px + Math.cos(a + 1.047) * r, pz + Math.sin(a + 1.047) * r) + 6.8, pz + Math.sin(a + 1.047) * r), 1.2, 4);
        pole.castShadow = true;
      }
    }

    /* ------------------------------------------------ festival square (泼水节) */
    const splash = F.particles({ max: 2600, color: "#dff2ff", opacity: 0.8, size: 0.13, type: "drop", groundY: (x, z) => groundY(x, z), onLand: (x, y, z) => wet.add(x, y, z) });
    const wet = F.wetMarks({ max: 160, opacity: 0.3, life: 10 });
    {
      const sx = 60, sz = 0, sy = PAD_H[2];
      const disc = new THREE.CircleGeometry(24, 48).rotateX(-Math.PI / 2);
      mesh(disc, mats.paving, sx, sy + 0.05, sz).castShadow = false;
      /* Buddha-bathing pavilion in the centre with a water trough */
      const g = group(sx, sz, 0, sy);
      mesh(boxUV(6, 0.6, 6, 1), mats.white, 0, 0.3, 0, 0, g);
      [[-2.4, -2.4], [2.4, -2.4], [2.4, 2.4], [-2.4, 2.4]].forEach(([a, b]) => mesh(cylUV(0.18, 0.2, 3.4, 10, 1), mats.red, a, 2.3, b, 0, g));
      const R = roofGeometry({ w: 5.4, d: 5.4, h: 2.8, oh: 0.8, type: "hip", curve: 1.15, upturn: 0.7, ridgeRatio: 0.05 });
      mesh(R.roof, mats.roofRed, 0, 4.0, 0, 0, g);
      if (R.trim) mesh(R.trim, mats.goldPlain, 0, 4.0, 0, 0, g);
      mesh(new THREE.ConeGeometry(0.16, 1.4, 6), mats.goldPlain, 0, 7.4, 0, 0, g);
      mesh(lathe([[0, 0], [0.5, 0], [0.6, 0.2], [0.4, 0.4], [0, 0.4]], 14), mats.goldPlain, 0, 0.6, 0, 0, g);
      mesh(boxUV(0.5, 1.1, 0.4, 1), mats.goldPlain, 0, 1.5, 0, 0, g);
      mesh(new THREE.SphereGeometry(0.22, 12, 8), mats.goldPlain, 0, 2.25, 0, 0, g);
      /* the long "dragon" water channel that carries water over the Buddha */
      const ch = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(2.2, 3.0, 0), new THREE.Vector3(0.6, 2.7, 0), new THREE.Vector3(0.1, 2.6, 0)]), 8, 0.08, 6);
      mesh(ch, mats.goldPlain, 0, 0, 0, 0, g);
      kit.blockBox(sx, sz, 6.4, 6.4, 0);
      S.bath = new THREE.Vector3(sx + 0.1, sy + 2.6, sz);
      /* basins and water barrels round the square */
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2, r = 19;
        const x = sx + Math.cos(a) * r, z = sz + Math.sin(a) * r;
        if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.3) continue;
        mesh(cylUV(0.55, 0.48, 0.9, 14, 0.5), i % 2 ? mats.timber : mats.red, x, sy + 0.45, z);
        mesh(new THREE.CircleGeometry(0.5, 14).rotateX(-Math.PI / 2), mats.pool, x, sy + 0.82, z);
        block(x, z, 0.65);
      }
      /* festival arch with flowers and bunting */
      const ag = group(sx - 24, sz, Math.PI / 2, sy);
      [-3.4, 3.4].forEach((x) => { mesh(cylUV(0.25, 0.28, 5, 10, 1), mats.red, x, 2.5, 0, 0, ag); });
      [[-3.4, 0], [3.4, 0]].forEach(([x]) => block(sx - 24, sz + x * -1, 0.4));
      const AR = roofGeometry({ w: 8.2, d: 1.8, h: 1.6, oh: 0.6, type: "gable", curve: 1.12, upturn: 0.8 });
      mesh(AR.roof, mats.roofRed, 0, 5, 0, 0, ag);
      if (AR.trim) mesh(AR.trim, mats.goldPlain, 0, 5, 0, 0, ag);
      const sign = F.track(new THREE.MeshStandardMaterial({ map: signTexture(F, "欢度泼水节", { bg: "#9e2a20", fg: "#f6d36b", border: "#e0b347" }), roughness: 0.6 }));
      mesh(new THREE.BoxGeometry(5.4, 1.1, 0.12), sign, 0, 4.1, 0.2, 0, ag);
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2, b = ((i + 1) / 8) * Math.PI * 2, r = 23;
        kit.flagString(new THREE.Vector3(sx + Math.cos(a) * r, sy + 5, sz + Math.sin(a) * r), new THREE.Vector3(sx + Math.cos(b) * r, sy + 5, sz + Math.sin(b) * r), 1.4, 5);
      }
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2, r = 23;
        const x = sx + Math.cos(a) * r, z = sz + Math.sin(a) * r;
        mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.4, 6), mats.timberDark, x, sy + 2.7, z);
        block(x, z, 0.25);
      }
      F.petals({ x: sx, z: sz, w: 44, d: 44, top: 9, count: 320, hgt: (x, z) => groundY(x, z) });
      stage.root.updateMatrixWorld(true);
      interact("cn-xb-poshui", g, "Water-Splashing Festival", [sx - 6, sz + 6.5], { radius: 20, labelOffset: 1.0 });
    }

    /* ------------------------------------------------ dragon boats on the Lancang */
    const boatMat = F.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
    function dragonBoat(colorA, colorB) {
      const g = new THREE.Group();
      const parts = [];
      /* hull: a long, narrow lathe-like shape built from a stretched cylinder */
      const hull = new THREE.CylinderGeometry(0.75, 0.75, 18, 14, 10, false, 0, Math.PI);
      hull.rotateZ(Math.PI / 2);
      hull.rotateX(Math.PI);
      const p = hull.attributes.position;
      for (let i = 0; i < p.count; i += 1) {
        const x = p.getX(i), t = Math.abs(x) / 9;
        const k = Math.sqrt(Math.max(0.02, 1 - t * t * t));
        p.setXYZ(i, x, p.getY(i) * k * 0.9 + t * t * 0.9, p.getZ(i) * k);
      }
      hull.computeVertexNormals();
      parts.push(tint(hull, colorA));
      const rail = new THREE.BoxGeometry(17, 0.1, 1.5);
      parts.push(tint(rail, colorB));
      /* dragon head and neck */
      const neck = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(8.6, 0.6, 0), new THREE.Vector3(9.6, 1.6, 0), new THREE.Vector3(10.0, 2.6, 0)]), 10, 0.32, 8);
      parts.push(tint(neck, colorA));
      const head = new THREE.BoxGeometry(1.3, 0.7, 0.7); head.translate(10.4, 2.8, 0); parts.push(tint(head, colorB));
      const jaw = new THREE.BoxGeometry(1.0, 0.25, 0.6); jaw.translate(10.6, 2.3, 0); parts.push(tint(jaw, colorA));
      [-0.22, 0.22].forEach((z) => { const h = new THREE.ConeGeometry(0.09, 0.8, 5); h.rotateZ(0.6); h.translate(9.9, 3.4, z); parts.push(tint(h, "#e6c04a")); });
      [-0.36, 0.36].forEach((z) => { const e = new THREE.BoxGeometry(0.16, 0.16, 0.04); e.translate(10.6, 3.0, z); parts.push(tint(e, "#111111")); });
      const tail = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-8.6, 0.6, 0), new THREE.Vector3(-9.6, 1.4, 0), new THREE.Vector3(-9.8, 2.4, 0), new THREE.Vector3(-9.3, 2.9, 0)]), 10, 0.22, 8);
      parts.push(tint(tail, colorB));
      const geo = mergeGeometries(parts);
      parts.forEach((x) => x.dispose());
      mesh(geo, boatMat, 0, 0, 0, 0, g).castShadow = true;
      /* paddles on both sides, animated */
      const paddles = [];
      for (let i = 0; i < 14; i += 1) {
        const side = i % 2 ? 1 : -1, x = -6 + Math.floor(i / 2) * 1.75;
        const pv = new THREE.Group();
        pv.position.set(x, 1.0, side * 0.55);
        g.add(pv);
        mesh(new THREE.BoxGeometry(0.06, 1.6, 0.06).translate(0, -0.6, 0), mats.timberDark, 0, 0, 0, 0, pv);
        mesh(new THREE.BoxGeometry(0.05, 0.5, 0.22).translate(0, -1.35, 0), mats.timber, 0, 0, 0, 0, pv);
        paddles.push({ pv, side, ph: i * 0.15 });
      }
      /* drum in the middle */
      mesh(lathe([[0, -0.3], [0.32, -0.3], [0.36, 0], [0.32, 0.3], [0, 0.3]], 12), mats.red, 0.8, 0.95, 0, 0, g);
      stage.add(g);
      return { g, paddles, rowers: [] };
    }
    const lap = smoothPts([[124, -90], [136, -20], [140, 60], [150, 120], [168, 128], [166, 60], [158, -20], [148, -90], [124, -90]], 220);
    let lapLen = 0;
    const lapS = [0];
    for (let i = 1; i < lap.length; i += 1) { lapLen += Math.hypot(lap[i][0] - lap[i - 1][0], lap[i][1] - lap[i - 1][1]); lapS.push(lapLen); }
    const lapAt = (s) => {
      s = ((s % lapLen) + lapLen) % lapLen;
      let lo = 0, hi = lapS.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (lapS[mid] < s) lo = mid; else hi = mid; }
      const u = (s - lapS[lo]) / (lapS[hi] - lapS[lo] || 1);
      const a = lap[lo], b = lap[hi];
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[0] - a[0], b[1] - a[1])];
    };
    S.boats = [dragonBoat("#b2321f", "#e6b43c"), dragonBoat("#1f6a4a", "#e6b43c")];
    S.boats.forEach((b, i) => { b.s = i * 14; b.speed = 4.6 + i * 0.25; b.lane = i ? 3.2 : -3.2; });
    S.lapAt = lapAt;
    {
      /* riverside discovery marker: a moored boat prow and a drum on the bank */
      const g = group(112, 44, -Math.PI / 2, LAND);
      mesh(lathe([[0, -0.6], [0.55, -0.6], [0.64, 0], [0.55, 0.6], [0, 0.6]], 16).rotateZ(Math.PI / 2), mats.red, 0, 0.9, 0, 0, g);
      [[-0.5, 0.4], [0.5, 0.4], [-0.5, -0.4], [0.5, -0.4]].forEach(([a, b]) => mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), mats.timberDark, a, 0.25, b, 0, g));
      kit.blockBoxIn(g, 0, 0, 1.6, 1.2);
      interact("cn-xb-dragonboat", g, "Dragon boats on the Lancang", [108, 46], { radius: 18, labelOffset: 1.4 });
    }

    /* ------------------------------------------------ peacock dance stage */
    {
      const sx = 45, sz = 74, sy = PAD_H[3];
      const g = group(sx, sz, Math.PI, sy);
      mesh(boxUV(12, 1.0, 7, 1), mats.timber, 0, 0.5, 0, 0, g);
      [[-5.6, -3.2], [5.6, -3.2], [5.6, 3.2], [-5.6, 3.2]].forEach(([a, b]) => mesh(cylUV(0.2, 0.22, 4.6, 10, 1), mats.red, a, 3.3, b, 0, g));
      const R = roofGeometry({ w: 12, d: 7, h: 3.6, oh: 1.2, type: "xieshan", curve: 1.12, upturn: 0.6, skirt: 0.45 });
      mesh(R.roof, mats.roofRed, 0, 5.6, 0, 0, g);
      if (R.trim) mesh(R.trim, mats.goldPlain, 0, 5.6, 0, 0, g);
      if (R.gableWall) mesh(R.gableWall, mats.gold, 0, 5.6, 0, 0, g).material.side = THREE.DoubleSide;
      /* painted backdrop of a peacock */
      const bd = (() => {
        const c = F.canvas(512, 256), q = c.getContext("2d");
        const gr = q.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#123a3a"); gr.addColorStop(1, "#1d5a4a"); q.fillStyle = gr; q.fillRect(0, 0, 512, 256);
        for (let i = 0; i < 30; i += 1) {
          const a = -Math.PI + (i / 29) * Math.PI;
          q.strokeStyle = "#3fae8a"; q.lineWidth = 4; q.beginPath(); q.moveTo(256, 230); q.lineTo(256 + Math.cos(a) * 210, 230 + Math.sin(a) * 200); q.stroke();
          q.fillStyle = "#e6c64a"; q.beginPath(); q.arc(256 + Math.cos(a) * 190, 230 + Math.sin(a) * 180, 12, 0, 7); q.fill();
          q.fillStyle = "#1e3c8a"; q.beginPath(); q.arc(256 + Math.cos(a) * 190, 230 + Math.sin(a) * 180, 6, 0, 7); q.fill();
        }
        q.fillStyle = "#1d5db6"; q.beginPath(); q.ellipse(256, 200, 22, 40, 0, 0, 7); q.fill();
        return F.toTex(c);
      })();
      mesh(new THREE.PlaneGeometry(11, 3.8), F.track(new THREE.MeshStandardMaterial({ map: bd, roughness: 0.8 })), 0, 3.0, -3.3, 0, g);
      /* elephant-foot drums */
      const drum = lathe([[0, 0], [0.24, 0], [0.18, 0.5], [0.16, 0.8], [0.3, 1.1], [0.32, 1.3], [0, 1.3]], 14);
      mesh(drum, mats.red, -4.5, 1.0, 1.5, 0, g);
      mesh(drum, mats.green, 4.5, 1.0, 1.5, 0, g);
      kit.blockBox(sx, sz, 12.4, 7.4, 0);
      lantern(g, -5.6, 4.8, 3.5); lantern(g, 5.6, 4.8, 3.5);
      pointLight(sx, sy + 4.6, sz - 4, "#ffc070", 26, 20);
      stage.root.updateMatrixWorld(true);
      S.stage = g;
      interact("cn-xb-peacock", g, "Peacock dance", [sx + 6, sz - 7], { radius: 16, labelOffset: 1.0 });
    }

    /* ------------------------------------------------ night market: pineapple rice */
    {
      const sx = 22, sz = -40, sy = PAD_H[4];
      const smoke = F.particles({ max: 160, color: "#bdb8b0", opacity: 0.22, size: 1.0, type: "steam" });
      const pineMat = F.pbr("cobble", { color: "#c7962e", color2: "#9e6c1f", color3: "#4a3010", cells: 7, seed: 71 }, { roughness: 0.8 });
      const crownMat = F.track(new THREE.MeshStandardMaterial({ color: "#4d7a2e", roughness: 0.6 }));
      const purple = F.pbr("cobble", { color: "#5a2a4a", color2: "#3e1a32", color3: "#2a1020", cells: 18, seed: 72 }, { roughness: 0.6 });
      const stall = (lx, lz, ry, kind) => {
        const g = group(sx + lx, sz + lz, ry, sy);
        [[-1.6, -1], [1.6, -1], [1.6, 1], [-1.6, 1]].forEach(([a, b]) => mesh(new THREE.BoxGeometry(0.1, 2.5, 0.1), mats.timberDark, a, 1.25, b, 0, g));
        const R = roofGeometry({ w: 3.6, d: 2.4, h: 0.9, oh: 0.4, type: "gable", curve: 1.1, upturn: 0.15 });
        mesh(R.roof, kind ? mats.thatch : mats.roofRed, 0, 2.5, 0, 0, g);
        mesh(boxUV(3.2, 0.9, 1.4, 0.6), mats.bamboo, 0, 0.45, 0.2, 0, g);
        mesh(boxUV(3.3, 0.06, 1.5, 0.6), mats.weave, 0, 0.93, 0.2, 0, g);
        lantern(g, -1.4, 2.2, 1.1); lantern(g, 1.4, 2.2, 1.1);
        stage.root.updateMatrixWorld(true);
        const p = new THREE.Vector3(0, 0, 0).applyMatrix4(g.matrixWorld);
        kit.blockBox(p.x, p.z, 3.6, 2.4, ry);
        return g;
      };
      const g = stall(0, 0, 0.2, 0);
      /* whole and halved pineapples filled with purple sticky rice */
      const pine = lathe([[0, 0], [0.16, 0.02], [0.2, 0.15], [0.19, 0.32], [0.12, 0.42], [0, 0.44]], 14);
      for (let i = 0; i < 4; i += 1) {
        mesh(pine, pineMat, -1.2 + i * 0.32, 0.96, -0.2, 0, g);
        for (let k = 0; k < 5; k += 1) { const lf = mesh(new THREE.ConeGeometry(0.03, 0.3, 4), crownMat, -1.2 + i * 0.32, 1.52, -0.2, 0, g); lf.rotation.set(Math.cos(k * 1.26) * 0.5, 0, Math.sin(k * 1.26) * 0.5); }
      }
      for (let i = 0; i < 4; i += 1) {
        const half = new THREE.SphereGeometry(0.22, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); half.scale(1.3, 0.8, 1);
        mesh(half, pineMat, 0.2 + (i % 2) * 0.55, 1.12, 0.1 + Math.floor(i / 2) * 0.5, 0, g);
        const rice = new THREE.SphereGeometry(0.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); rice.scale(1.25, 0.5, 0.95);
        mesh(rice, purple, 0.2 + (i % 2) * 0.55, 1.12, 0.1 + Math.floor(i / 2) * 0.5, 0, g);
      }
      /* steamer */
      mesh(cylUV(0.4, 0.4, 0.5, 14, 0.4), mats.bamboo, 1.3, 1.2, -0.2, 0, g);
      S.marketSmoke = { smoke, pos: new THREE.Vector3(1.3, 1.6, -0.2).applyMatrix4(g.matrixWorld) };
      interact("cn-xb-pineapple", g, "Pineapple rice · 菠萝饭", [sx - 1, sz + 4], { radius: 12, labelOffset: 1.0 });
      stall(-6, 3, -0.5, 1);
      stall(6, 4, 0.7, 1);
      const sign = F.track(new THREE.MeshStandardMaterial({ map: signTexture(F, "菠萝饭", { bg: "#2a5a3a", fg: "#f6d36b", border: "#e0b347" }), roughness: 0.6 }));
      mesh(new THREE.BoxGeometry(2.4, 0.7, 0.1), sign, sx, sy + 3.2, sz - 1.3, 0.2);
      pointLight(sx, sy + 3, sz + 2, "#ffb366", 24, 18);
    }

    /* ------------------------------------------------ rice paddies with a buffalo */
    {
      const g = group(0, 0, 0, 0);
      const P = PADDY, nx = 5, nz = 4, cw = (P.x1 - P.x0) / nx, cd = (P.z1 - P.z0) / nz;
      const rice = [];
      for (let i = 0; i < nx; i += 1) for (let j = 0; j < nz; j += 1) {
        const cx = P.x0 + (i + 0.5) * cw, cz = P.z0 + (j + 0.5) * cd;
        const water = new THREE.PlaneGeometry(cw - 1.0, cd - 1.0).rotateX(-Math.PI / 2);
        mesh(water, mats.paddyWater, cx, P.y + 0.18, cz, 0, g).castShadow = false;
        /* bunds */
        mesh(boxUV(cw, 0.35, 0.9, 1), F.track(new THREE.MeshStandardMaterial({ color: "#6b5a3a", roughness: 1 })), cx, P.y + 0.15, cz - cd / 2, 0, g);
        if ((i + j) % 3) for (let a = 0; a < (LOW ? 40 : 110); a += 1) rice.push({ x: cx + (rnd() - 0.5) * (cw - 2), y: P.y + 0.05, z: cz + (rnd() - 0.5) * (cd - 2), s: rr(0.6, 1.0), ry: rnd() * 6 });
      }
      const tuft = (() => {
        const parts = [];
        for (let k = 0; k < 6; k += 1) { const b = new THREE.PlaneGeometry(0.06, 0.8); b.translate(0, 0.4, 0); b.rotateY((k / 6) * Math.PI); b.rotateZ((rnd() - 0.5) * 0.4); parts.push(tint(b, "#9ac04a", "#4f7a2a", 0, 0.8)); }
        const m = mergeGeometries(parts); parts.forEach((x) => x.dispose()); return m;
      })();
      const riceMat = F.track(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }));
      F.wind(riceMat, 0.15, 1.2);
      F.instances(tuft, riceMat, rice, { shadow: false });
      S.paddyBlocked = true;
    }

    /* ------------------------------------------------ river boats you can ride */
    function makeLongBoat(seed = 0) {
      const g = new THREE.Group();
      const paint = ["#2f6a8a", "#a0402a", "#2f7a52", "#c48a2a"][seed % 4];
      const hull = new THREE.CylinderGeometry(0.62, 0.62, 5.6, 12, 8, false, 0, Math.PI);
      hull.rotateZ(Math.PI / 2);
      hull.rotateX(Math.PI);
      const hp = hull.attributes.position;
      for (let i = 0; i < hp.count; i += 1) {
        const x = hp.getX(i), t = Math.abs(x) / 2.8, k = Math.sqrt(Math.max(0.05, 1 - t * t * t));
        hp.setXYZ(i, x, hp.getY(i) * k * 0.8 + t * t * 0.55, hp.getZ(i) * k);
      }
      hull.computeVertexNormals();
      const parts = [tint(hull, "#6a4a30"), tint(new THREE.BoxGeometry(5.0, 0.12, 1.1).translate(0, 0.02, 0), paint)];
      parts.push(tint(new THREE.BoxGeometry(0.9, 0.12, 1.0).translate(-0.6, 0.18, 0), "#8a6a44"));
      parts.push(tint(new THREE.BoxGeometry(0.9, 0.12, 1.0).translate(1.0, 0.18, 0), "#8a6a44"));
      parts.push(tint(new THREE.BoxGeometry(0.4, 0.4, 0.4).translate(-2.55, 0.35, 0), "#2a2a2a"));
      parts.push(tint(new THREE.BoxGeometry(1.6, 0.06, 0.06).translate(-3.2, 0.15, 0), "#3a3a3a"));
      parts.push(tint(new THREE.ConeGeometry(0.14, 0.7, 6).rotateZ(-1.2).translate(2.9, 0.75, 0), paint));
      const geo = mergeGeometries(parts);
      parts.forEach((x) => x.dispose());
      mesh(geo, boatMat, 0, 0, 0, 0, g);
      /* light canopy on posts */
      [[-1.2, -0.45], [-1.2, 0.45], [0.4, -0.45], [0.4, 0.45]].forEach(([a, b]) => mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 5), mats.timberDark, a, 0.75, b, 0, g));
      const roof = new THREE.BoxGeometry(2.0, 0.06, 1.25);
      mesh(roof, mats.thatch, -0.4, 1.42, 0, 0, g);
      return g;
    }
    const inWater = (x, z, m = 3) => riverDist(x, z) < RIVER_HALF - m;
    {
      /* pier: find where the water starts on the bank at z = 78 */
      const pz = 78;
      let xw = 100;
      while (xw < 170 && !inWater(xw, pz, 5)) xw += 0.5;
      const x0 = xw - 9, x1 = xw + 10, deckY = Math.max(heightFn(x0, pz), WATER_Y + 1.3) + 0.2;
      addBridge({ x0, x1, z: pz, width: 3.2, ya: deckY, yb: deckY, sag: 0 });
      const deck = boxUV(x1 - x0, 0.24, 3.2, 1);
      mesh(deck, mats.timber, (x0 + x1) / 2, deckY - 0.12, pz);
      for (let x = x0; x <= x1 + 0.1; x += 2.5) [-1.5, 1.5].forEach((dz) => {
        const h = deckY - (WATER_Y - 2);
        mesh(new THREE.CylinderGeometry(0.13, 0.15, h, 6), mats.timberDark, x, deckY - h / 2, pz + dz);
        mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 5), mats.timberDark, x, deckY + 0.5, pz + dz);
        if (x > xw - 2) BOAT_OBST_PIER.push({ x, z: pz + dz, r: 0.9 });
      });
      [-1, 1].forEach((sd) => {
        mesh(new THREE.BoxGeometry(x1 - x0 - 3, 0.08, 0.08), mats.timberDark, (x0 + x1) / 2 - 1.5, deckY + 0.95, pz + sd * 1.5);
        kit.blockBox((x0 + x1) / 2 - 1.5, pz + sd * 1.85, x1 - x0 - 3, 0.4, 0);
      });
      lantern(stage.root, x1 - 0.3, deckY + 1.6, pz - 1.5);
      const sign = F.track(new THREE.MeshStandardMaterial({ map: signTexture(F, "游船码头", { bg: "#1f4a5a", fg: "#f6d36b", border: "#e0b347" }), roughness: 0.6 }));
      mesh(new THREE.BoxGeometry(2.4, 0.7, 0.1), sign, x0 + 1, deckY + 2.2, pz - 1.7);
      mesh(new THREE.BoxGeometry(0.1, 2.2, 0.1), mats.timberDark, x0 + 1, deckY + 1.1, pz - 1.7);
      block(x0 + 1, pz - 1.7, 0.2);
      /* three boats moored round the end of the pier */
      const moor = [[x1 + 3.2, pz, 0], [x1 - 3, pz + 3.4, 0], [x1 - 3, pz - 3.4, 0]];
      moor.forEach(([mx, mz, my], i) => {
        const g = makeLongBoat(i);
        stage.add(g);
        const b = { g, x: mx, z: mz, yaw: Math.PI / 2, v: 0, home: [mx, mz, Math.PI / 2], turn: 0, ridden: false };
        S.rides.push(b);
        Wk.addRideable({
          kind: "boat",
          label: { en: "a boat on the Lancang", zh: "游船" },
          radius: 4.6,
          blockR: 0,
          camLift: 1.3,
          camDist: 17,
          pos: () => ({ x: b.x, z: b.z }),
          mount: () => { b.ridden = true; },
          dismounted: () => { b.ridden = false; b.v = 0; },
          reset: () => { b.ridden = false; [b.x, b.z, b.yaw] = b.home; b.v = 0; },
          step: (dt, inp) => boatStep(b, dt, inp),
          state: b,
          dismount: () => {
            for (const r of [2.6, 3.6, 5, 6.5, 8]) for (let k = 0; k < 16; k += 1) {
              const a = (k / 16) * Math.PI * 2, x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r;
              if (canStand(x, z) && !kit.blocked(x, z, 0.5)) return [x, z];
            }
            return null;
          },
        });
      });
    }
    const wake = F.particles({ max: 700, color: "#eef6f4", opacity: 0.7, size: 0.16, type: "drop", gravity: -6 });
    function boatHits(b, x, z) {
      if (!inWater(x, z, 2.2)) return true;
      for (const o of BOAT_OBST) if (Math.hypot(x - o.x, z - o.z) < o.r + 1.4) return true;
      for (const o of BOAT_OBST_PIER) if (Math.hypot(x - o.x, z - o.z) < o.r + 1.0) return true;
      for (const o of S.rides) if (o !== b && Math.hypot(x - o.x, z - o.z) < 2.6) return true;
      return false;
    }
    function boatStep(b, dt, inp) {
      const vmax = inp.run ? 15 : 8.5;
      let thrust = 0;
      if (inp.n > 0.1) {
        let df = Math.atan2(inp.mx, inp.mz) - b.yaw;
        df = Math.atan2(Math.sin(df), Math.cos(df));
        const rate = (0.8 + Math.min(1, Math.abs(b.v) / 6) * 0.6) * dt;
        const t = Math.max(-rate, Math.min(rate, df));
        b.yaw += t;
        b.turn = t / Math.max(dt, 1e-3);
        thrust = inp.n * vmax * Math.max(0.15, Math.cos(df));
      } else b.turn *= 0.9;
      b.v += (thrust - b.v) * Math.min(1, dt * 0.7);
      const nx = b.x + Math.sin(b.yaw) * b.v * dt, nz = b.z + Math.cos(b.yaw) * b.v * dt;
      if (!boatHits(b, nx, nz)) { b.x = nx; b.z = nz; }
      else if (!boatHits(b, nx, b.z)) { b.x = nx; b.v *= 0.97; }
      else if (!boatHits(b, b.x, nz)) { b.z = nz; b.v *= 0.97; }
      else b.v *= -0.25;
      if (!inp.reduced && Math.abs(b.v) > 2.5 && Math.random() < 0.6) {
        const sx = b.x - Math.sin(b.yaw) * 2.6, sz = b.z - Math.cos(b.yaw) * 2.6;
        wake.emit(sx, WATER_Y + 0.1, sz, -Math.sin(b.yaw) * 1.2, 1.2, -Math.cos(b.yaw) * 1.2, 3, 1.4, 0.8, 0.14);
        wake.emit(b.x + Math.sin(b.yaw) * 2.6, WATER_Y + 0.15, b.z + Math.cos(b.yaw) * 2.6, Math.cos(b.yaw) * 1.5, 1.0, -Math.sin(b.yaw) * 1.5, 1, 0.8, 0.6, 0.12);
      }
      const y = WATER_Y - 0.12 + Math.sin(inp.time * 1.7 + b.home[0]) * 0.05;
      /* sit on the rear bench: hips (0.76 above the feet) on the plank top */
      return { x: b.x - Math.sin(b.yaw) * 0.6, y: y + 0.26 - 0.72, z: b.z - Math.cos(b.yaw) * 0.6, face: b.yaw };
    }
    /* ------------------------------------------------ elephant trek station: two elephants with howdahs you can ride */
    {
      const sx = -84, sz = 6, sy = hgt(sx, sz);
      const g = group(sx, sz, 0.3, sy);
      mesh(boxUV(4, 3.4, 3, 1), mats.timber, 0, 1.7, 0, 0, g);
      for (let i = 0; i < 8; i += 1) mesh(boxUV(1.2, 0.2, 0.42, 1), mats.timber, -2.6, 0.2 + i * 0.42, -1.2 + i * 0.36 - 0.0, 0, g);
      [[-1.8, -1.3], [1.8, -1.3], [1.8, 1.3], [-1.8, 1.3]].forEach(([a, b]) => mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.0, 6), mats.timberDark, a, 4.9, b, 0, g));
      const R = roofGeometry({ w: 4, d: 3, h: 1.6, oh: 0.6, type: "hip", curve: 1.2, upturn: 0.4, ridgeRatio: 0.1 });
      mesh(R.roof, mats.thatch, 0, 6.4, 0, 0, g);
      kit.blockBoxIn(g, 0, 0, 4.2, 3.2);
      kit.blockBoxIn(g, -2.6, 0, 1.4, 3.4);
      const sign = F.track(new THREE.MeshStandardMaterial({ map: signTexture(F, "骑象 Elephant trek", { font: "bold 64px 'Noto Serif SC',serif", bg: "#3a2a18", fg: "#f2d58a" }), roughness: 0.6 }));
      mesh(new THREE.BoxGeometry(3, 0.8, 0.1), sign, 0, 4.0, 1.56, 0, g);
      const howdahMat = F.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
      [[4.6, 0.8], [4.6, -6.4]].forEach(([lx, lz], i) => {
        const c = Math.cos(0.3), sn = Math.sin(0.3);
        const ex = sx + lx * c + lz * sn, ez = sz - lx * sn + lz * c;
        const e = makeAnimal("elephant", skinMatR, (q) => F.geo(q), { color: "#ffffff", tusks: i === 0 });
        e.parts.forEach((m) => { m.material = skinMatR; });
        /* howdah: a padded saddle cloth, a seat box with rails and a small canopy */
        const hp = [tint(new THREE.BoxGeometry(1.9, 0.12, 2.0).translate(0, 3.66, 0), "#b3261e"), tint(new THREE.BoxGeometry(2.0, 0.6, 0.12).translate(0, 3.3, 1.0), "#e0b347"), tint(new THREE.BoxGeometry(2.0, 0.6, 0.12).translate(0, 3.3, -1.0), "#e0b347"),
          tint(new THREE.BoxGeometry(1.4, 0.35, 1.3).translate(0, 3.9, -0.1), "#6a4a30"), tint(new THREE.BoxGeometry(1.5, 0.08, 0.08).translate(0, 4.4, 0.55), "#3a2a18"), tint(new THREE.BoxGeometry(1.5, 0.08, 0.08).translate(0, 4.4, -0.75), "#3a2a18"),
          tint(new THREE.BoxGeometry(1.7, 0.06, 1.7).translate(0, 5.6, -0.1), "#c8302a")];
        [[-0.7, 0.55], [0.7, 0.55], [-0.7, -0.75], [0.7, -0.75]].forEach(([a, b2]) => hp.push(tint(new THREE.BoxGeometry(0.06, 1.6, 0.06).translate(a, 4.8, b2), "#3a2a18")));
        const hg = mergeGeometries(hp); hp.forEach((q) => q.dispose()); F.geo(hg);
        const hm = new THREE.Mesh(hg, howdahMat); hm.castShadow = true; e.inner.add(hm);
        const yaw0 = -Math.PI / 2 + 0.3;
        e.root.position.set(ex, hgt(ex, ez), ez);
        e.root.rotation.y = yaw0;
        stage.add(e.root);
        const r = { e, x: ex, z: ez, yaw: yaw0, v: 0, home: [ex, ez, yaw0], ridden: false };
        S.rides.push(r);
        S.trek = S.trek || [];
        S.trek.push(r);
        Wk.addRideable({
          kind: "elephant",
          label: { en: "the elephant", zh: "大象" },
          radius: 5.2,
          blockR: 1.9,
          camLift: 2.6,
          camDist: 19,
          pos: () => ({ x: r.x, z: r.z }),
          mount: () => { r.ridden = true; },
          dismounted: () => { r.ridden = false; r.v = 0; },
          reset: () => { r.ridden = false; [r.x, r.z, r.yaw] = r.home; r.v = 0; },
          step: (dt, inp) => elephantStep(r, dt, inp),
          dismount: () => {
            for (const d of [3.2, 4.2, 5.5]) for (const a of [Math.PI / 2, -Math.PI / 2, Math.PI, 0, 2.3, -2.3, 0.8, -0.8]) {
              const x = r.x + Math.sin(r.yaw + a) * d, z = r.z + Math.cos(r.yaw + a) * d;
              if (canStand(x, z) && !kit.blocked(x, z, 0.5)) return [x, z];
            }
            return null;
          },
        });
      });
    }
    function elephantStep(r, dt, inp) {
      const vmax = inp.run ? 6.5 : 3.4;
      let target = 0;
      if (inp.n > 0.1) {
        let df = Math.atan2(inp.mx, inp.mz) - r.yaw;
        df = Math.atan2(Math.sin(df), Math.cos(df));
        const rate = 1.3 * dt, t = Math.max(-rate, Math.min(rate, df));
        r.yaw += t;
        target = inp.n * vmax * Math.max(0, Math.cos(df));
      }
      r.v += (target - r.v) * Math.min(1, dt * 1.6);
      if (r.v > 0.05) {
        const nx = r.x + Math.sin(r.yaw) * r.v * dt, nz = r.z + Math.cos(r.yaw) * r.v * dt;
        const [qx, qz] = kit.resolve(nx, nz, 1.6);
        const fx = qx + Math.sin(r.yaw) * 1.8, fz = qz + Math.cos(r.yaw) * 1.8;
        if (canStand(qx, qz) && canStand(fx, fz) && Math.abs(groundY(fx, fz) - groundY(qx, qz)) < 1.4) { r.x = qx; r.z = qz; }
        else r.v = 0;
      }
      const y = hgt(r.x, r.z);
      return { x: r.x - Math.sin(r.yaw) * 0.1, y: y + 4.07 - 0.74 + r.e.inner.position.y, z: r.z - Math.cos(r.yaw) * 0.1, face: r.yaw };
    }

    /* ------------------------------------------------ rainforest and elephant valley */
    const banyan = species(F, "banyan", { variants: 2, seed: 31 });
    const canopy = species(F, "canopy", { variants: 3, seed: 32 });
    const palm = species(F, "palm", { variants: 3, seed: 33 });
    const fan = species(F, "fanpalm", { variants: 2, seed: 34 });
    const banana = species(F, "banana", { variants: 3, seed: 35 });
    const bamboo = species(F, "bamboo", { variants: 2, seed: 36 });
    const fern = species(F, "fern", { variants: 2, seed: 37 });
    const shrub = species(F, "shrub", { variants: 2, seed: 38 });
    const onPath = (x, z, pad) => PATHS.some((p) => polyDist(x, z, p.pts) < p.w / 2 + pad);
    const inPad = (x, z, pad = 0) => PADS.some(([cx, cz, r], i) => i !== 7 && Math.hypot(x - cx, z - cz) < r + pad);
    const inPaddy = (x, z, m = 2) => x > PADDY.x0 - m && x < PADDY.x1 + m && z > PADDY.z0 - m && z < PADDY.z1 + m;
    const inValley = (x, z, m = 0) => Math.hypot(x + 178, z - 178) < 30 + m;
    const inBounds = (x, z, m = 6) => x > B.x0 + m && x < B.x1 - m && z > B.z0 + m && z < B.z1 - m;
    const ok = (x, z, pad = 2) => inBounds(x, z) && Math.hypot(x + 84, z - 6) > 18 && Math.hypot(x - 116, z - 78) > 14 && !onPath(x, z, pad) && !inPad(x, z, 2) && riverDist(x, z) > RIVER_HALF + 4 && !inPaddy(x, z) && Math.hypot(x - PAG.x, z - PAG.z) > 16;
    const forestish = (x, z) => x < -140 || z > 150 || (x < -60 && z > 120);
    const L = { banyan: [], canopy: [], palm: [], fan: [], banana: [], bamboo: [], fern: [], shrub: [] };
    const scatter = (list, n, fn, tries = 10) => { for (let i = 0; i < n * tries && list.length < n; i += 1) { const p = fn(); if (p) list.push(p); } };
    const place = (r, s0, s1, v) => ({ x: 0, y: 0, z: 0, s: rr(s0, s1), ry: rnd() * 6, v: (rnd() * v) | 0 });
    scatter(L.banyan, LOW ? 14 : 34, () => {
      const x = rr(B.x0, -60), z = rr(-100, B.z1);
      if (!forestish(x, z) || !ok(x, z, 6) || inValley(x, z, 8) || kit.blocked(x, z, 6)) return null;
      block(x, z, 2.0);
      return Object.assign(place(0, 0.85, 1.2, 2), { x, y: hgt(x, z), z });
    });
    scatter(L.canopy, LOW ? 90 : 240, () => {
      const x = rr(B.x0, B.x1), z = rr(B.z0, B.z1);
      const f = forestish(x, z);
      if ((!f && rnd() < 0.85) || !ok(x, z, 3) || inValley(x, z, 4) || kit.blocked(x, z, 2.4)) return null;
      block(x, z, 0.9);
      return Object.assign(place(0, 0.8, 1.25, 3), { x, y: hgt(x, z), z });
    });
    scatter(L.palm, LOW ? 60 : 150, () => {
      const nearV = rnd() < 0.5;
      const x = nearV ? rr(-80, 110) : rr(B.x0, B.x1), z = nearV ? rr(-100, 100) : rr(B.z0, B.z1);
      if (!ok(x, z, 2.5) || inValley(x, z, 3) || kit.blocked(x, z, 1.8)) return null;
      if (Object.values(places).some((p) => Math.hypot(x - p.spawn[0], z - p.spawn[1]) < 7)) return null;
      block(x, z, 0.4);
      return Object.assign(place(0, 0.8, 1.2, 3), { x, y: hgt(x, z), z });
    });
    S.templePlants.forEach((p, i) => L.fan.push({ x: p.x, y: hgt(p.x, p.z), z: p.z, s: 1.0, ry: i, v: i % 2 }));
    S.templePlants.forEach((p) => block(p.x, p.z, 0.6));
    scatter(L.fan, LOW ? 10 : 24, () => {
      const x = rr(B.x0, B.x1), z = rr(B.z0, B.z1);
      if (!ok(x, z, 2) || inValley(x, z, 3) || kit.blocked(x, z, 2)) return null;
      block(x, z, 0.5);
      return Object.assign(place(0, 0.8, 1.1, 2), { x, y: hgt(x, z), z });
    });
    scatter(L.banana, LOW ? 50 : 130, () => {
      const nearV = rnd() < 0.6;
      const x = nearV ? -30 + rr(-46, 46) : rr(B.x0, B.x1), z = nearV ? 30 + rr(-46, 46) : rr(B.z0, B.z1);
      if (!ok(x, z, 2) && !(inPad(x, z) && Math.hypot(x + 30, z - 30) > 14 && Math.hypot(x + 30, z - 30) < 40 && !onPath(x, z, 2))) return null;
      if (kit.blocked(x, z, 1.4) || inValley(x, z, 2) || riverDist(x, z) < RIVER_HALF + 3 || inPaddy(x, z)) return null;
      if (Object.values(places).some((p) => Math.hypot(x - p.spawn[0], z - p.spawn[1]) < 7)) return null;
      block(x, z, 0.35);
      return Object.assign(place(0, 0.8, 1.3, 3), { x, y: hgt(x, z), z });
    });
    scatter(L.bamboo, LOW ? 18 : 44, () => {
      const x = rr(B.x0, B.x1), z = rr(B.z0, B.z1);
      if (!ok(x, z, 4) || inValley(x, z, 4) || kit.blocked(x, z, 3.5)) return null;
      block(x, z, 1.4);
      return Object.assign(place(0, 0.8, 1.15, 2), { x, y: hgt(x, z), z });
    });
    scatter(L.fern, LOW ? 220 : 800, () => {
      const x = rr(B.x0, B.x1), z = rr(B.z0, B.z1);
      if (!forestish(x, z) || !ok(x, z, 0.8)) return null;
      return Object.assign(place(0, 0.7, 1.5, 2), { x, y: hgt(x, z), z });
    });
    scatter(L.shrub, LOW ? 160 : 480, () => {
      const x = rr(B.x0, B.x1), z = rr(B.z0, B.z1);
      if (!ok(x, z, 1) || Math.hypot(x - 60, z) < 28) return null;
      return Object.assign(place(0, 0.6, 1.4, 2), { x, y: hgt(x, z), z });
    });
    plant(F, banyan, L.banyan);
    plant(F, canopy, L.canopy);
    plant(F, palm, L.palm);
    plant(F, fan, L.fan);
    plant(F, banana, L.banana);
    plant(F, bamboo, L.bamboo);
    plant(F, fern, L.fern, { shadow: false });
    plant(F, shrub, L.shrub, { shadow: false });
    /* hanging lianas in the forest */
    {
      const parts = [];
      L.canopy.filter((t) => forestish(t.x, t.z)).slice(0, LOW ? 30 : 80).forEach((t) => {
        for (let k = 0; k < 2; k += 1) {
          const a = rnd() * 6.28, r = rr(2, 4), x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r, top = t.y + 13 * t.s, len = rr(5, 11);
          const c = new THREE.CatmullRomCurve3([new THREE.Vector3(x, top, z), new THREE.Vector3(x + 0.4, top - len * 0.5, z + 0.3), new THREE.Vector3(x - 0.2, top - len, z)]);
          parts.push(tint(new THREE.TubeGeometry(c, 6, 0.05, 4), "#4a5a2a"));
        }
      });
      if (parts.length) { const g = mergeGeometries(parts); parts.forEach((x) => x.dispose()); mesh(g, F.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })), 0, 0, 0); }
    }
    /* elephant valley: fence, water hole, a raised walkway (ramp + platform) */
    {
      const cx = -178, cz = 178, R = 30;
      const fence = F.track(new THREE.MeshStandardMaterial({ color: "#6a4a30", roughness: 0.9 }));
      const segs = 28;
      for (let i = 0; i < segs; i += 1) {
        const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
        const x0 = cx + Math.cos(a0) * R, z0 = cz + Math.sin(a0) * R, x1 = cx + Math.cos(a1) * R, z1 = cz + Math.sin(a1) * R;
        if (!inBounds(x0, z0, 2) && !inBounds(x1, z1, 2)) continue;
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
        const y = hgt(mx, mz);
        mesh(new THREE.BoxGeometry(len, 0.12, 0.12), fence, mx, y + 1.1, mz, ry);
        mesh(new THREE.BoxGeometry(len, 0.12, 0.12), fence, mx, y + 0.6, mz, ry);
        mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.5, 6), fence, x0, hgt(x0, z0) + 0.75, z0);
        kit.blockBox(mx, mz, len + 0.2, 0.5, ry);
      }
      const pool = new THREE.CircleGeometry(7.5, 28).rotateX(-Math.PI / 2);
      mesh(pool, mats.pool, cx - 8, landH(cx - 8, cz + 8) + 0.15 + 1.0, cz + 8).castShadow = false;
      /* raised viewing walkway: a ramp rising along x, then a platform over the fence */
      const z = 150, xa = -128, xb = -146, xc = -160, top = LAND + 3.2;
      const ya = hgt(xa, z);
      addBridge({ x0: xc, x1: xb, z, width: 3.0, ya: top, yb: top, sag: 0 });
      addBridge({ x0: xb, x1: xa, z, width: 3.0, ya: top, yb: ya, sag: 0 });
      const deck = F.track(new THREE.MeshStandardMaterial({ map: mats.timber.map, normalMap: mats.timber.normalMap, roughness: 0.85 }));
      const rampLen = Math.hypot(xa - xb, top - ya);
      const ramp = mesh(boxUV(rampLen, 0.2, 3.0, 1), deck, (xa + xb) / 2, (ya + top) / 2 - 0.1, z);
      ramp.rotation.z = Math.atan2(top - ya, xa - xb) * -1;
      mesh(boxUV(xb - xc, 0.25, 3.0, 1), deck, (xb + xc) / 2, top - 0.12, z);
      for (let x = xc; x <= xa; x += 3) {
        const yy = x < xb ? top : top + (ya - top) * ((x - xb) / (xa - xb));
        [-1, 1].forEach((s) => mesh(new THREE.CylinderGeometry(0.1, 0.1, yy - hgt(x, z + s * 1.5) + 1.1, 6), fence, x, (yy + hgt(x, z + s * 1.5) + 1.1) / 2, z + s * 1.55));
      }
      [-1, 1].forEach((s) => {
        kit.blockBox((xa + xc) / 2 - 1.5, z + s * 1.9, xa - xc - 3, 0.4, 0);
        mesh(new THREE.BoxGeometry(xb - xc, 0.1, 0.1), fence, (xb + xc) / 2, top + 1.0, z + s * 1.55);
      });
      kit.blockBox(xc - 0.3, z, 0.4, 3.6, 0);
      S.valley = { cx, cz, R: R - 5 };
      const g = group(-146, 144, 0);
      const sign = F.track(new THREE.MeshStandardMaterial({ map: signTexture(F, "野象谷", { bg: "#2a3a22", fg: "#e8d9a0", border: "#7a6a40" }), roughness: 0.7 }));
      mesh(new THREE.BoxGeometry(2.2, 0.8, 0.12), sign, 0, 2.0, 0, 0, g);
      mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), fence, -0.9, 1.0, 0, 0, g);
      mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), fence, 0.9, 1.0, 0, 0, g);
      kit.blockBoxIn(g, 0, 0, 2.2, 0.4);
      interact("cn-xb-elephant", g, "Asian elephants · 亚洲象", [-140, 146], { radius: 20, labelOffset: 1.0 });
    }
    /* light shafts through the canopy (faded with the sun) */
    {
      const S2 = 128, c = F.canvas(32, S2), q = c.getContext("2d");
      const gr = q.createLinearGradient(0, 0, 0, S2); gr.addColorStop(0, "rgba(255,240,200,0)"); gr.addColorStop(0.3, "rgba(255,240,200,.55)"); gr.addColorStop(1, "rgba(255,240,200,0)");
      q.fillStyle = gr; q.fillRect(0, 0, 32, S2);
      const hz = q.createLinearGradient(0, 0, 32, 0); hz.addColorStop(0, "rgba(0,0,0,1)"); hz.addColorStop(0.5, "rgba(0,0,0,0)"); hz.addColorStop(1, "rgba(0,0,0,1)");
      q.globalCompositeOperation = "destination-out"; q.fillStyle = hz; q.fillRect(0, 0, 32, S2);
      const t = F.toTex(c);
      const m = F.track(new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      const list = [];
      for (let i = 0; i < (LOW ? 8 : 26); i += 1) {
        const x = rr(-250, -150), z = rr(90, 260);
        list.push({ x, y: hgt(x, z) + 9, z, rx: 0, ry: rnd() * 6, rz: 0.35, sx: rr(2, 4), sy: rr(16, 22), sz: 1 });
      }
      const shafts = F.instances(new THREE.PlaneGeometry(1, 1), m, list, { shadow: false, receive: false });
      F.onTime(({ day, morning }) => { m.opacity = 0.1 + morning * 0.18 * day; shafts.visible = day > 0.2; });
    }

    /* ------------------------------------------------ animals */
    const animalMat = F.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
    const skinMat = F.pbr("plaster", { color: "#7a7470", color2: "#625c58", color3: "#4a4542", stains: 0.2, seed: 81, bump: 3 }, { vertexColors: true });
    const trk = (g) => F.geo(g);
    [["elephant", { tusks: true }], ["elephant", {}], ["elephant", {}], ["calf", {}]].forEach(([k, o], i) => {
      const e = makeAnimal(k, skinMat, trk, Object.assign({ color: "#ffffff" }, o));
      e.parts.forEach((m) => { m.material = skinMat; });
      const a = i * 1.6;
      e.root.position.set(S.valley.cx + Math.cos(a) * 10, 0, S.valley.cz + Math.sin(a) * 10);
      stage.add(e.root);
      S.animals.push({ a: e, kind: k, tx: e.root.position.x, tz: e.root.position.z, wait: i * 2, sp: k === "calf" ? 1.2 : 0.9, follow: k === "calf" ? 1 : null });
    });
    {
      const b = makeAnimal("buffalo", animalMat, trk);
      b.root.position.set(-100, PADDY.y, 96);
      stage.add(b.root);
      S.animals.push({ a: b, kind: "buffalo", tx: -100, tz: 96, wait: 0, sp: 0.6, box: [PADDY.x0 + 4, PADDY.x1 - 4, PADDY.z0 + 4, PADDY.z1 - 4] });
    }
    [[36, 66], [56, 64], [-26, -46], [-150, 120], [-56, -54]].forEach(([x, z]) => {
      const p = makePeacock(animalMat, trk);
      p.root.position.set(x, hgt(x, z), z);
      p.root.rotation.y = rnd() * 6;
      stage.add(p.root);
      S.peacocks.push({ p, cx: x, cz: z, tx: x, tz: z, wait: rnd() * 4 });
    });

    /* ------------------------------------------------ atmosphere */
    F.farTerrain({ heightFn: farH, colorFn, bounds: B, extent: 3600, segments: LOW ? 200 : 300, sink: 12 });
    {
      const blob = new THREE.SphereGeometry(4, 7, 5);
      tint(blob, "#2f5a26");
      const far = [];
      const fr = mulberry(91);
      for (let i = 0; i < (LOW ? 1600 : 4600); i += 1) {
        const a = fr() * 6.283, r = 310 + Math.pow(fr(), 0.7) * 1300, x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (riverDist(x, z) < RIVER_HALF + 26) continue;
        far.push({ x, y: farH(x, z) + 1, z, s: 0.8 + fr() * 1.0, sy: 0.7 + fr() * 0.6, ry: fr() * 6 });
      }
      F.instances(blob, F.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })), far, { shadow: false, receive: false });
    }
    /* scenery along the river beyond the map: palms, bamboo, villages, a bridge, a stupa, elephants at the water */
    {
      const fr = mulberry(57);
      const outside = (z) => Math.abs(z) > 300;
      const bankPts = [];
      for (let i = 2; i < RIVER_S.length - 2; i += 3) {
        const [x, z] = RIVER_S[i];
        if (!outside(z)) continue;
        const [x2, z2] = RIVER_S[i + 1], tx = x2 - x, tz = z2 - z, L = Math.hypot(tx, tz) || 1;
        bankPts.push({ x, z, nx: -tz / L, nz: tx / L, i });
      }
      const tP = [], tB = [], tN = [], tC = [];
      bankPts.forEach((b) => [-1, 1].forEach((side) => {
        for (let k = 0; k < 2; k += 1) {
          const off = RIVER_HALF + 8 + fr() * 70, x = b.x + b.nx * off * side + (fr() - 0.5) * 6, z = b.z + b.nz * off * side + (fr() - 0.5) * 6;
          const y = farH(x, z), pick = fr();
          const item = { x, y, z, s: 0.8 + fr() * 0.5, ry: fr() * 6, v: (fr() * 3) | 0 };
          (pick < 0.35 ? tP : pick < 0.55 ? tB : pick < 0.8 ? tN : tC).push(item);
        }
      }));
      VEG_EXTRA.palm = tP; VEG_EXTRA.bamboo = tB; VEG_EXTRA.banana = tN; VEG_EXTRA.canopy = tC;
      /* riverside villages of stilt houses with landing steps and moored boats */
      [[-760, 1], [-1240, -1], [520, -1], [1000, 1], [1500, -1]].forEach(([zTarget, side], vi) => {
        let best = bankPts[0];
        bankPts.forEach((b) => { if (Math.abs(b.z - zTarget) < Math.abs(best.z - zTarget)) best = b; });
        for (let h = 0; h < 4; h += 1) {
          const along = (h - 1.5) * 13, off = RIVER_HALF + 16 + (h % 2) * 9;
          const x = best.x + best.nx * off * side + best.nz * along * 0, z = best.z + best.nz * off * side + along;
          const g = group(x, z, Math.atan2(-best.nx * side, -best.nz * side), farH(x, z));
          const hs = stiltHouse(F, dm(fr() < 0.5), { w: 8 + fr() * 2, d: 6 + fr(), postH: 2.4, roofH: 5, roofType: "xieshan", veranda: 2.2, upturn: 0.22, oh: 1.6, stairSide: 1 });
          g.add(hs.group);
        }
        for (let k = 0; k < 2; k += 1) {
          const off = RIVER_HALF - 4, x = best.x + best.nx * off * side, z = best.z + best.nz * off * side + (k - 0.5) * 8;
          const bt = makeLongBoat(vi * 2 + k);
          bt.position.set(x, WATER_Y - 0.1, z);
          bt.rotation.y = Math.atan2(best.nx, best.nz);
          stage.add(bt);
          BOAT_OBST.push({ x, z, r: 2.8 });
        }
      });
      /* a highway bridge high over the river (boats pass between the piers) */
      {
        let best = bankPts[0];
        bankPts.forEach((b) => { if (Math.abs(b.z + 520) < Math.abs(best.z + 520)) best = b; });
        const span = RIVER_HALF * 2 + 90, yaw = Math.atan2(best.nx, best.nz);
        const g = group(best.x, best.z, yaw, WATER_Y + 18);
        const concrete = F.pbr("plaster", { color: "#b9b4aa", color2: "#a39e94", color3: "#77736b", seed: 96 });
        mesh(boxUV(9, 1.6, span, 2), concrete, 0, 0, 0, 0, g);
        [-1, 1].forEach((sx) => mesh(boxUV(0.3, 1.0, span, 1), mats.goldPlain, sx * 4.4, 1.2, 0, 0, g));
        for (const pz of [-RIVER_HALF - 30, -14, 14, RIVER_HALF + 30]) {
          mesh(boxUV(6, 26, 3, 2), concrete, 0, -13, pz, 0, g);
          if (Math.abs(pz) < RIVER_HALF) { g.updateMatrixWorld(true); const w = new THREE.Vector3(0, 0, pz).applyMatrix4(g.matrixWorld); BOAT_OBST.push({ x: w.x, z: w.z, r: 4.2 }); }
        }
        for (let k = -6; k <= 6; k += 1) lantern(g, 4.4, 2.2, k * 9);
      }
      /* a white stupa on a hill above the river */
      {
        let best = bankPts[0];
        bankPts.forEach((b) => { if (Math.abs(b.z - 760) < Math.abs(best.z - 760)) best = b; });
        const x = best.x - best.nx * (RIVER_HALF + 60), z = best.z - best.nz * (RIVER_HALF + 60);
        const g = group(x, z, 0, farH(x, z));
        mesh(new THREE.CylinderGeometry(6, 6.6, 1.4, 8), mats.white, 0, 0.7, 0, 0, g);
        mesh(lathe([[3.2, 0], [3.2, 1.4], [2.6, 1.5], [2.7, 4], [2.2, 6], [1.2, 7.8], [0.7, 9], [0.4, 10.4], [0.12, 12.5], [0, 13]], 20), mats.white, 0, 1.4, 0, 0, g);
        mesh(new THREE.ConeGeometry(0.4, 3, 8), mats.goldPlain, 0, 15.4, 0, 0, g);
      }
      /* wild elephants drinking at a far bank */
      {
        let best = bankPts[0];
        bankPts.forEach((b) => { if (Math.abs(b.z - 1180) < Math.abs(best.z - 1180)) best = b; });
        const skinMat2 = F.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, color: "#8a847e" }));
        [0, 1, 2].forEach((k) => {
          const e = makeAnimal(k === 2 ? "calf" : "elephant", skinMat2, (g) => F.geo(g), { color: "#ffffff", tusks: k === 0 });
          const off = RIVER_HALF + 2 + k * 3, x = best.x + best.nx * off, z = best.z + best.nz * off + (k - 1) * 6;
          e.root.position.set(x, farH(x, z), z);
          e.root.rotation.y = Math.atan2(-best.nx, -best.nz);
          stage.add(e.root);
          S.farElephants.push(e);
        });
      }
      plant(F, palm, VEG_EXTRA.palm);
      plant(F, bamboo, VEG_EXTRA.bamboo);
      plant(F, banana, VEG_EXTRA.banana);
      plant(F, canopy, VEG_EXTRA.canopy);
    }
    F.cloudDome({ coverage: 0.42, scale: 1.0, speed: 0.008, tintC: "#fff6ea" });
    const banks = [];
    for (let i = 0; i < (LOW ? 10 : 24); i += 1) { const x = rr(-290, -140), z = rr(60, 290); banks.push([x, hgt(x, z) + rr(3, 9), z, rr(50, 90)]); }
    banks.push([150, 6, -150, 140], [150, 6, 160, 140]);
    F.mistBank(banks, { opacity: 0.26, morning: 2.2, night: 0.5, color: "#eef3ee" });
    F.grass({
      hgt,
      R: LOW ? 22 : 34,
      count: 4400,
      colors: ["#3f6026", "#94ad4c"],
      density: (x, z) => {
        if (riverDist(x, z) < RIVER_HALF + 2 || onPath(x, z, 0.4) || inPaddy(x, z, 0) || kit.blocked(x, z, 0.3)) return 0;
        if (Math.hypot(x - 60, z) < 25 || Math.hypot(x + 40, z + 70) < 24 || Math.hypot(x - 22, z + 40) < 11) return 0;
        if (inPad(x, z, -5)) return 0.3;
        return forestish(x, z) ? 0.6 : 0.95;
      },
    });
    for (let i = 0; i < 12; i += 1) stage.add(bird(rr(-200, 200), rr(30, 60), rr(-200, 200)));
    F.contactShadows(() => {
      const st = Wk.st;
      const L2 = [{ x: st.x, y: groundY(st.x, st.z), z: st.z, r: 0.42 }];
      Wk.NPC.forEach((n) => { if (n.fixedY == null && Math.abs(n.x - st.x) < 80 && Math.abs(n.z - st.z) < 80) L2.push({ x: n.x, y: n.y, z: n.z, r: 0.4 }); });
      S.animals.forEach((a) => { const p = a.a.root.position; if (Math.abs(p.x - st.x) < 120 && Math.abs(p.z - st.z) < 120) L2.push({ x: p.x, y: p.y, z: p.z, r: a.kind === "elephant" ? 1.6 : a.kind === "calf" ? 0.9 : 0.7, rz: a.kind === "elephant" ? 2.4 : 1.3, ry: a.a.root.rotation.y }); });
      return L2;
    });

    /* ------------------------------------------------ per-frame */
    let tick = 0, bathT = 0;
    const tmp = new THREE.Vector3();
    Wk.onUpdate((time, dt) => {
      const reduced = stage.reducedMotion;
      tick += 1;
      /* splashers: emit droplets at the top of each throw, toward a neighbour or the player */
      S.splashers.forEach((n) => {
        if (reduced || n.splashPhase == null) return;
        const near = Math.hypot(n.x - Wk.st.x, n.z - Wk.st.z);
        if (near > 90) return;
        if (n.lastPh != null && n.lastPh < 0.27 && n.splashPhase >= 0.27) {
          if (near < 9 && Math.random() < 0.55) n.yaw = Math.atan2(Wk.st.x - n.x, Wk.st.z - n.z);
          const fx2 = Math.sin(n.yaw), fz2 = Math.cos(n.yaw);
          splash.emit(n.x + fx2 * 0.5, n.y + 1.6, n.z + fz2 * 0.5, fx2 * 5.2, 3.4, fz2 * 5.2, LOW ? 20 : 46, 1.6, 1.6);
        }
        n.lastPh = n.splashPhase;
      });
      /* water over the Buddha in the bathing pavilion */
      bathT += dt;
      if (!reduced && bathT > 0.06 && S.bath && Math.hypot(S.bath.x - Wk.st.x, S.bath.z - Wk.st.z) < 70) { bathT = 0; splash.emit(S.bath.x, S.bath.y, S.bath.z, 0, -0.3, 0, 3, 0.25, 0.8, 0.09); }
      if (S.marketSmoke && !reduced && tick % 8 === 0) { const m = S.marketSmoke; m.smoke.emit(m.pos.x, m.pos.y, m.pos.z, 0.1, 0.8, 0, 1, 0.2, 4, 0.8); }
      /* dragon boats */
      S.boats.forEach((b) => {
        if (!reduced) b.s += b.speed * dt * (1 + Math.sin(time * 0.3 + b.lane) * 0.08);
        const [x, z, yaw] = S.lapAt(b.s);
        const nx = Math.cos(yaw), nz = -Math.sin(yaw);
        b.g.position.set(x + nx * b.lane, WATER_Y - 0.45 + Math.sin(time * 2 + b.lane) * 0.04, z + nz * b.lane);
        b.g.rotation.y = yaw - Math.PI / 2;
        b.paddles.forEach((p) => { p.pv.rotation.z = reduced ? 0 : Math.sin(time * 6 + p.ph) * 0.7; p.pv.rotation.x = p.side * (0.4 + Math.cos(time * 6 + p.ph) * 0.15); });
        b.g.updateMatrixWorld(true);
        b.rowers.forEach((r, i) => {
          tmp.set(-6 + Math.floor(i / 2) * 1.75 + 0.3, 0, (i % 2 ? 1 : -1) * 0.18).applyMatrix4(b.g.matrixWorld);
          r.x = tmp.x; r.z = tmp.z; r.fixedY = b.g.position.y + 0.15; r.yaw = b.g.rotation.y + Math.PI / 2;
        });
      });
      /* elephants, buffalo and peacocks wander */
      S.animals.forEach((an, i) => {
        const p = an.a.root.position;
        let moving = false;
        if (!reduced) {
          if (an.wait > 0) an.wait -= dt;
          else {
            let tx = an.tx, tz = an.tz;
            if (an.follow) { const m = S.animals[0].a.root.position; tx = m.x + 3; tz = m.z + 2; }
            const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
            if (d < 1.2) {
              if (!an.follow) {
                if (an.box) { an.tx = rr(an.box[0], an.box[1]); an.tz = rr(an.box[2], an.box[3]); }
                else { const a = rnd() * 6.283, r = rnd() * S.valley.R; an.tx = S.valley.cx + Math.cos(a) * r; an.tz = S.valley.cz + Math.sin(a) * r; }
                an.wait = rr(3, 9);
              }
            } else {
              p.x += (dx / d) * an.sp * dt; p.z += (dz / d) * an.sp * dt; moving = true;
              let df = Math.atan2(dx, dz) - an.a.root.rotation.y;
              df = Math.atan2(Math.sin(df), Math.cos(df));
              an.a.root.rotation.y += df * Math.min(1, dt * 1.5);
            }
          }
        }
        p.y = an.kind === "buffalo" ? PADDY.y + 0.05 : landH(p.x, p.z);
        an.a.update(time, moving, an.sp, reduced);
      });
      S.rides.forEach((r) => {
        if (r.e) {
          r.e.root.position.set(r.x, hgt(r.x, r.z), r.z);
          r.e.root.rotation.y = r.yaw;
          r.e.update(time, r.v > 0.2, Math.max(0.6, r.v * 0.6), reduced);
        } else {
          const bob = reduced ? 0 : Math.sin(time * 1.7 + r.home[0]) * 0.05;
          r.g.position.set(r.x, WATER_Y - 0.12 + bob, r.z);
          r.g.rotation.set(reduced ? 0 : Math.sin(time * 1.1 + r.home[1]) * 0.03 + (r.turn || 0) * 0.05, r.yaw - Math.PI / 2, reduced ? 0 : -Math.min(0.08, Math.abs(r.v) * 0.006));
        }
      });
      S.farElephants.forEach((e) => e.update(time, false, 0, reduced));
      S.peacocks.forEach((pc) => {
        const p = pc.p.root.position;
        if (!reduced) {
          if (pc.wait > 0) pc.wait -= dt;
          else {
            const dx = pc.tx - p.x, dz = pc.tz - p.z, d = Math.hypot(dx, dz);
            if (d < 0.3) { const a = rnd() * 6.283; pc.tx = pc.cx + Math.cos(a) * 4; pc.tz = pc.cz + Math.sin(a) * 4; pc.wait = rr(2, 7); }
            else { p.x += (dx / d) * 0.6 * dt; p.z += (dz / d) * 0.6 * dt; pc.p.root.rotation.y = Math.atan2(dx, dz); }
          }
        }
        p.y = hgt(p.x, p.z);
        pc.p.update(time, dt, reduced);
      });
    });

    /* ------------------------------------------------ animal info badges and more animals (fauna.js) */
    {
      S.animals.forEach((a, i) => {
        if (a.kind === "elephant" && i === 0) Wk.addInfoTarget("cn-xb-elephant", a.a.root, 5.4);
        if (a.kind === "buffalo") Wk.addInfoTarget(animalId("xishuangbanna", "buffalo"), a.a.root, 2.8);
      });
      (S.trek || []).forEach((r) => Wk.addInfoTarget("cn-xb-elephant", r.e.root, 6.4));
      S.peacocks.forEach((p, i) => { if (i < 2) Wk.addInfoTarget("cn-xb-peacock", p.p.root, 1.8); });
      const fa = createFauna({ W: Wk, stage, kit, hgt, groundY, canStand, fx: F });
      const near = (x, z, r = 20) => {
        for (let d = 0; d <= r; d += 2) for (let k = 0; k < 12; k += 1) {
          const px = x + Math.cos(k * 0.52) * d, pz = z + Math.sin(k * 0.52) * d;
          if (canStand(px, pz) && !kit.blocked(px, pz, 1.2)) return [px, pz];
        }
        return [x, z];
      };
      const id = (k) => animalId("xishuangbanna", k);
      { const [x, z] = near(-70, 110); fa.herd({ id: id("monkey"), kind: "monkey", count: 7, cx: x, cz: z, R: 10, speed: 1.3, wild: true, flee: 4, opts: { color: "#8a7258" } }); }
      { const [x, z] = near(-8, 62); fa.herd({ id: id("goat"), kind: "goat", count: 5, cx: x, cz: z, R: 7, speed: 0.7, opts: (i) => ({ color: ["#2a2420", "#6b5644", "#d8d0c4"][i % 3] }) }); }
      { const [x, z] = near(-110, 70); fa.herd({ id: id("buffalo"), kind: "buffalo", count: 2, cx: x, cz: z, R: 8, speed: 0.4 }); }
      fa.soar({ id: id("eagle"), kind: "eagle", count: 2, cx: -40, cz: 20, R: 60, h: 70 });
      F.contactShadows(() => fa.shadows(Wk.st), { max: 60, opacity: 0.38 });
    }

    F.post({ bloom: { strength: 0.34, radius: 0.62, threshold: 0.84 }, grade: { tint: "#fff7ec", contrast: 1.05, saturation: 1.1, vignette: 0.3 } });
    return {};
  }

  /* ===================================================================== */
  function addPeople(Wk) {
    const D = Wk.D;
    const add = (o) => { Wk.addNpc(Object.assign({ tx: 0, tz: 0, wait: Math.random() * 4 }, o)); return Wk.NPC[Wk.NPC.length - 1]; };
    const tints = ["#ffffff", "#ffe6ee", "#e8f4ff", "#fff3dc", "#eaffe8"];
    /* village life */
    const mix = ["dai-woman", "dai-woman", "dai-man", "dai-man", "novice-monk", "elder", "schoolgirl"];
    for (let i = 0; i < 18; i += 1) {
      const a = Math.random() * 6.283, d = 4 + Math.random() * 14;
      add({ kind: Math.random() < 0.35 ? "idle" : "wander", cx: -30, cz: 30, R: 14, x: -30 + Math.cos(a) * d, z: 30 + Math.sin(a) * d, design: Wk.pick(mix), tint: tints[i % tints.length] });
    }
    /* festival crowd splashing water */
    for (let i = 0; i < 34; i += 1) {
      const a = Math.random() * 6.283, d = 6 + Math.random() * 14;
      const x = 60 + Math.cos(a) * d, z = Math.sin(a) * d;
      const n = add({ kind: "idle", act: "splash", rate: 0.7 + Math.random() * 0.6, x, z, yaw: Math.random() * 6.283, design: Wk.pick(["dai-woman", "dai-man", "dai-woman", "novice-monk", "trekker", "schoolgirl"]), tint: tints[i % tints.length] });
      S.splashers.push(n);
    }
    for (let i = 0; i < 8; i += 1) {
      const a = Math.random() * 6.283, d = 8 + Math.random() * 10;
      add({ kind: "wander", cx: 60, cz: 0, R: 18, x: 60 + Math.cos(a) * d, z: Math.sin(a) * d, design: Wk.pick(["dai-woman", "dai-man", "trekker"]) });
    }
    /* temple: novice monks */
    for (let i = 0; i < 7; i += 1) {
      const a = Math.random() * 6.283, d = 4 + Math.random() * 10;
      add({ kind: Math.random() < 0.5 ? "idle" : "wander", act: Math.random() < 0.3 ? "pray" : null, cx: -40, cz: -55, R: 10, x: -40 + Math.cos(a) * d, z: -55 + Math.sin(a) * d, design: D["novice-monk"] });
    }
    add({ kind: "idle", act: "work", rate: 0.4, x: -54, z: -59.0, fixedY: PAD_H[1] + 1.0, yaw: Math.PI, design: D["novice-monk"] });
    for (let i = 0; i < 3; i += 1) add({ kind: "idle", act: "pray", x: -132 + i * 2, z: -36, yaw: Math.PI, design: Wk.pick(["dai-woman", "elder", "novice-monk"]) });
    /* peacock dancers and drummers on the stage */
    [[-2.6, 0.2], [0, -0.6], [2.6, 0.2]].forEach(([lx, lz], i) => add({ kind: "idle", act: "dance", rate: 0.9 + i * 0.05, x: 45 - lx, z: 74 - lz, fixedY: 7 + 1.0, yaw: Math.PI, design: D["peacock-dancer"] }));
    [[-4.5, 2.4], [4.5, 2.4]].forEach(([lx, lz]) => add({ kind: "idle", act: "roll", rate: 1.6, x: 45 - lx, z: 74 - lz, fixedY: 7 + 1.0, yaw: Math.PI, design: D["dai-man"] }));
    for (let i = 0; i < 12; i += 1) {
      const x = 45 + (Math.random() - 0.5) * 14, z = 62 - Math.random() * 6;
      add({ kind: "idle", x, z, yaw: 0, design: Wk.pick(["dai-woman", "dai-man", "trekker", "schoolgirl", "elder"]), tint: tints[i % tints.length] });
    }
    /* market */
    add({ kind: "idle", act: "work", x: 22 - Math.sin(0.2) * 1.2, z: -40 - Math.cos(0.2) * 1.2, yaw: 0.2, design: D["dai-woman"] });
    for (let i = 0; i < 8; i += 1) add({ kind: "wander", cx: 22, cz: -34, R: 8, x: 22 + (Math.random() - 0.5) * 10, z: -34 + (Math.random() - 0.5) * 8, design: Wk.pick(["dai-woman", "dai-man", "trekker", "schoolgirl"]) });
    /* clothing stall vendor and river bank spectators */
    add({ kind: "idle", act: "pour", x: 8 - Math.sin(-2.4) * 0.9, z: 52 - Math.cos(-2.4) * 0.9, yaw: -2.4, design: D["dai-woman"] });
    for (let i = 0; i < 14; i += 1) add({ kind: "idle", act: Math.random() < 0.3 ? "dance" : null, x: 104 + Math.random() * 6, z: 8 + Math.random() * 50, yaw: Math.PI / 2, design: Wk.pick(["dai-woman", "dai-man", "trekker", "schoolgirl", "novice-monk"]), tint: tints[i % tints.length] });
    /* rice farmer in the paddy */
    add({ kind: "idle", act: "pick", rate: 0.5, x: -96, z: 80, fixedY: PADDY.y + 0.05, yaw: 1, design: D["dai-man"] });
    add({ kind: "idle", act: "pick", rate: 0.6, x: -120, z: 102, fixedY: PADDY.y + 0.05, yaw: -0.6, design: D["dai-woman"] });
    /* boat crews (moved by the world script) */
    S.boats.forEach((b) => {
      for (let i = 0; i < 14; i += 1) {
        const n = { kind: "script", act: "row", rate: 1.0, design: D["dai-man"], x: 0, z: 0, ph: i * 0.15, sp: 1, yaw: 0, swing: 0, y: 0, fixedY: 0, tint: tints[i % tints.length] };
        Wk.NPC.push(n);
        b.rowers.push(n);
      }
    });
  }
}
