import * as THREE from "three";
import { colors } from "../helpers.js";
import { DESIGNS, PLAYER_DESIGN, makeCrowd, makeFigure } from "./kathmandu-people.js";
import { OBJECT_MAP } from "../../data.js";
import { createFauna } from "./fauna.js";
import { drawRideIcon } from "./walk-engine.js";
import { animalId } from "../../wildlife-data.js";

/* Kathmandu Valley — a walkable world.
   Stalls and craft scenes below are the original Himalaya Connect builders;
   the valley, landmarks, player and crowd follow after them. */

function mesh(stage, geometry, material, x = 0, y = 0, z = 0) {
  stage.trackGeometry(geometry);
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function box(stage, w, h, d, material, x, y, z) {
  return mesh(stage, new THREE.BoxGeometry(w, h, d), material, x, y, z);
}

function cylinder(stage, rt, rb, h, segments, material, x, y, z) {
  return mesh(stage, new THREE.CylinderGeometry(rt, rb, h, segments), material, x, y, z);
}

function roof(stage, radius, height, material, x, y, z, rotation = Math.PI / 4) {
  const cone = mesh(stage, new THREE.ConeGeometry(radius, height, 4), material, x, y, z);
  cone.rotation.y = rotation;
  return cone;
}


function buildMomoStall(stage) {
  const group = new THREE.Group();
  group.position.set(9.5, 0, 5.8);
  group.rotation.y = -0.28;
  const wood = stage.material("#74432A", { roughness: 0.92 });
  const counter = box(stage, 3.5, 1.2, 1.8, wood, 0, 0.6, 0);
  group.add(counter);
  const top = box(stage, 3.8, 0.16, 2.0, stage.material("#d2b28a", { roughness: 0.85 }), 0, 1.26, 0);
  group.add(top);
  const post = stage.material(colors.timber, { roughness: 0.9 });
  [-1.55, 1.55].forEach((x) => {
    group.add(box(stage, 0.14, 3.0, 0.14, post, x, 1.5, -0.6));
  });
  const awning = box(stage, 4.1, 0.12, 2.7, stage.material("#b83a2e", { roughness: 0.82 }), 0, 3.02, 0.25);
  awning.rotation.x = -0.12;
  group.add(awning);
  const cloth = box(stage, 4.1, 0.55, 0.08, stage.material("#e8c98e", { roughness: 0.9 }), 0, 2.55, 1.5);
  group.add(cloth);
  for (let index = 0; index < 3; index += 1) {
    const steamer = cylinder(stage, 0.46, 0.46, 0.28, 12, stage.material("#9b7652", { roughness: 0.8 }), -0.8 + index * 0.8, 1.5, 0.1);
    group.add(steamer);
    const lid = cylinder(stage, 0.5, 0.46, 0.09, 12, stage.material("#b89263", { roughness: 0.8 }), -0.8 + index * 0.8, 1.68, 0.1);
    group.add(lid);
  }
  const bowl = cylinder(stage, 0.35, 0.26, 0.25, 10, stage.material("#e5d8be", { roughness: 0.75 }), 1.15, 1.46, 0.28);
  group.add(bowl);
  const soup = cylinder(stage, 0.29, 0.29, 0.03, 10, stage.material("#b33d26", { roughness: 0.65 }), 1.15, 1.57, 0.28);
  group.add(soup);
  const sign = box(stage, 1.7, 0.6, 0.12, stage.material("#f1dfb8", { roughness: 0.8 }), 0, 2.2, 1.6);
  group.add(sign);
  for (let i = 0; i < 4; i += 1) {
    const steam = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 6, 6),
      new THREE.MeshBasicMaterial({ color: "#fff7e9", transparent: true, opacity: 0.26, depthWrite: false })
    );
    stage.trackGeometry(steam.geometry);
    steam.position.set(-0.8 + i * 0.45, 1.9 + i * 0.12, 0.1);
    group.add(steam);
    stage.animate((time) => {
      if (!stage.reducedMotion) steam.position.y = 1.9 + ((time * 0.35 + i * 0.34) % 1.3);
    });
  }
  return group;
}

function buildTopiStall(stage) {
  const group = new THREE.Group();
  group.position.set(-9.8, 0, 2.2);
  group.rotation.y = 1.15;
  const wood = stage.material("#76513a", { roughness: 0.9 });
  group.add(box(stage, 2.8, 1.0, 1.3, wood, 0, 0.5, 0));
  group.add(box(stage, 3.0, 0.15, 1.6, stage.material("#d5b681", { roughness: 0.9 }), 0, 1.05, 0));
  const shelf = box(stage, 2.7, 0.12, 0.7, stage.material("#e8d7b4", { roughness: 0.9 }), 0, 1.85, -0.25);
  group.add(shelf);
  [-0.85, 0, 0.85].forEach((x, index) => {
    const hat = cylinder(stage, 0.32, 0.33, 0.26, 10, stage.material(index === 1 ? "#d7a847" : "#b34937", { roughness: 0.87 }), x, 2.05, -0.25);
    group.add(hat);
    const crown = mesh(stage, new THREE.SphereGeometry(0.32, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), stage.material("#e9dcc4", { roughness: 0.9 }), x, 2.18, -0.25);
    group.add(crown);
  });
  group.add(box(stage, 3.0, 0.08, 1.6, stage.material("#b83a2e", { roughness: 0.85 }), 0, 2.65, 0));
  [-1.4, 1.4].forEach((x) => group.add(box(stage, 0.08, 2.7, 0.08, wood, x, 1.35, -0.55)));
  return group;
}

function buildMadalSpot(stage) {
  const group = new THREE.Group();
  group.position.set(3.6, 0, 2.6);
  group.rotation.y = -0.4;
  const carpet = box(stage, 3.3, 0.06, 2.3, stage.material("#7f2f2a", { roughness: 0.9 }), 0, 0.04, 0);
  group.add(carpet);
  [colors.gold, colors.ivory, "#2d6b5c", colors.gold].forEach((color, index) => {
    group.add(box(stage, 3.0, 0.03, 0.11, stage.material(color, { roughness: 0.85 }), 0, 0.09, -0.72 + index * 0.46));
  });
  const skin = stage.material("#d8bb8b", { roughness: 0.8 });
  const wood = stage.material("#7d4d2d", { roughness: 0.75 });
  const drum = mesh(stage, new THREE.CylinderGeometry(0.55, 0.55, 0.95, 14), wood, 0, 0.72, 0);
  drum.rotation.z = Math.PI / 2;
  group.add(drum);
  const headA = mesh(stage, new THREE.CircleGeometry(0.53, 16), skin, -0.48, 0.72, 0);
  headA.rotation.y = Math.PI / 2;
  group.add(headA);
  const headB = headA.clone();
  headB.position.x = 0.48;
  group.add(headB);
  for (let index = 0; index < 8; index += 1) {
    const rope = mesh(stage, new THREE.CylinderGeometry(0.02, 0.02, 1.05, 4), stage.material("#3c2418", { roughness: 1 }), 0, 0.72, 0);
    rope.rotation.x = Math.PI / 2;
    rope.position.z = Math.sin((index / 8) * Math.PI * 2) * 0.55;
    rope.position.y = 0.72 + Math.cos((index / 8) * Math.PI * 2) * 0.55;
    rope.rotation.z = (index / 8) * Math.PI;
    group.add(rope);
  }
  const stand = box(stage, 1.5, 0.16, 0.7, wood, 0, 0.24, 0);
  group.add(stand);
  const stool = cylinder(stage, 0.3, 0.38, 0.5, 8, wood, 0.95, 0.25, 0.3);
  group.add(stool);
  return group;
}

function buildGarlandStall(stage) {
  const group = new THREE.Group();
  group.position.set(-4.5, 0, 6.6);
  group.rotation.y = 0.25;
  const wood = stage.material("#76513a", { roughness: 0.9 });
  group.add(box(stage, 2.5, 0.9, 1.1, wood, 0, 0.45, 0));
  group.add(box(stage, 2.7, 0.12, 1.35, stage.material("#c5a26d", { roughness: 0.88 }), 0, 0.96, 0));
  [-1.15, 1.15].forEach((x) => group.add(box(stage, 0.09, 2.6, 0.09, wood, x, 1.3, -0.45)));
  group.add(box(stage, 2.8, 0.08, 1.4, stage.material("#d6a53d", { roughness: 0.78 }), 0, 2.6, 0));
  const marigold = stage.material("#e59326", { roughness: 0.8, emissive: new THREE.Color("#5c2c00"), emissiveIntensity: 0.22 });
  const marigoldDeep = stage.material("#c74c27", { roughness: 0.8 });
  const leaves = stage.material("#3f6d49", { roughness: 0.95 });
  for (let stringIndex = 0; stringIndex < 3; stringIndex += 1) {
    const points = [];
    for (let index = 0; index < 12; index += 1) {
      const flower = mesh(
        stage,
        new THREE.IcosahedronGeometry(0.13, 0),
        index % 3 === 0 ? marigoldDeep : marigold,
        -0.85 + index * 0.15,
        2.25 - (index % 2 === 0 ? 0 : 0.06),
        1.6 - stringIndex * 0.18
      );
      group.add(flower);
      points.push(flower.position.clone());
    }
    const leaf = mesh(stage, new THREE.SphereGeometry(0.1, 6, 4), leaves, -0.6, 2.38, 1.52 - stringIndex * 0.18);
    leaf.scale.z = 0.3;
    group.add(leaf);
  }
  for (let index = 0; index < 5; index += 1) {
    const basket = cylinder(stage, 0.24, 0.18, 0.2, 8, stage.material("#a67843", { roughness: 0.95 }), -0.8 + index * 0.4, 1.08, 0.1);
    group.add(basket);
    for (let flower = 0; flower < 4; flower += 1) {
      const bloom = mesh(stage, new THREE.IcosahedronGeometry(0.07, 0), flower % 2 ? marigold : marigoldDeep, -0.92 + index * 0.4 + (flower - 1.5) * 0.06, 1.2, 0.1 + (flower % 2) * 0.06);
      group.add(bloom);
    }
  }
  return group;
}

function buildLoktaWorkshop(stage) {
  const group = new THREE.Group();
  group.position.set(9.2, 0, -2.4);
  group.rotation.y = -1.1;
  const wood = stage.material("#6e4b33", { roughness: 0.9 });
  group.add(box(stage, 3.3, 0.8, 1.4, wood, 0, 0.4, 0));
  group.add(box(stage, 3.5, 0.12, 1.6, stage.material("#d2b487", { roughness: 0.9 }), 0, 0.86, 0));
  const vat = box(stage, 1.2, 0.6, 0.75, stage.material("#58766e", { roughness: 0.6, metalness: 0.1 }), -0.7, 1.15, 0);
  group.add(vat);
  const water = box(stage, 1.1, 0.05, 0.65, stage.material("#7cb5b0", { roughness: 0.2, metalness: 0.1 }), -0.7, 1.43, 0);
  group.add(water);
  const paper = stage.material("#f3e7ce", { roughness: 0.9, side: THREE.DoubleSide });
  [-0.9, -0.45, 0, 0.45].forEach((x) => {
    const sheet = box(stage, 0.34, 1.25, 0.02, paper, x + 0.8, 2.1, 0.25);
    sheet.rotation.z = -0.06;
    group.add(sheet);
  });
  group.add(box(stage, 2.3, 0.08, 0.08, wood, 0.55, 2.78, 0.25));
  [-1.4, 1.4].forEach((x) => group.add(box(stage, 0.09, 2.8, 0.09, wood, x, 1.4, -0.55)));
  group.add(box(stage, 3.5, 0.07, 1.6, stage.material("#b66b36", { roughness: 0.9 }), 0, 2.98, 0.2));
  return group;
}

function buildHiti(stage) {
  const group = new THREE.Group();
  group.position.set(-5.4, 0, -4.4);
  const stone = stage.material("#857f70", { roughness: 1 });
  const stoneDark = stage.material("#615b50", { roughness: 1 });
  const waterMaterial = stage.material("#5ba5ad", { roughness: 0.22, metalness: 0.08, transparent: true, opacity: 0.86 });
  const base = box(stage, 3.3, 0.5, 2.6, stoneDark, 0, 0.25, 0);
  group.add(base);
  const back = box(stage, 2.7, 1.4, 0.45, stone, 0, 1.1, -0.9);
  group.add(back);
  const basin = box(stage, 2.3, 0.4, 1.4, stoneDark, 0, 0.52, 0.55);
  group.add(basin);
  const water = box(stage, 2.05, 0.05, 1.2, waterMaterial, 0, 0.75, 0.55);
  group.add(water);
  const spout = cylinder(stage, 0.15, 0.2, 0.9, 8, stone, 0, 1.08, 0.2);
  spout.rotation.x = Math.PI / 2;
  group.add(spout);
  const spoutHead = box(stage, 0.42, 0.34, 0.22, stoneDark, 0, 1.12, 0.63);
  group.add(spoutHead);
  const stream = cylinder(stage, 0.035, 0.05, 1.1, 6, waterMaterial, 0, 0.55, 0.82);
  group.add(stream);
  for (let index = 0; index < 2; index += 1) {
    const step = box(stage, 2.7, 0.18, 0.5, stone, 0, 0.1 + index * 0.18, 1.55 + index * 0.35);
    group.add(step);
  }
  const pot = mesh(stage, new THREE.SphereGeometry(0.3, 10, 8), stage.material("#9c6a3d", { roughness: 0.95 }), -1.0, 0.92, 0.8);
  group.add(pot);
  stage.animate((time) => {
    if (!stage.reducedMotion) water.position.y = 0.75 + Math.sin(time * 2.3) * 0.008;
  });
  return group;
}

function buildCarvedWindow(stage) {
  const windowGroup = new THREE.Group();
  const windowWood = stage.material("#5e3622", { roughness: 0.85 });
  const windowLight = stage.material("#8d5a33", { roughness: 0.9 });
  const windowDark = stage.material("#241b17", { roughness: 0.8 });
  windowGroup.add(box(stage, 3.5, 2.6, 0.22, windowDark, 0, 0, 0));
  windowGroup.add(box(stage, 3.8, 2.9, 0.24, windowWood, 0, 0, 0));
  windowGroup.add(box(stage, 3.15, 2.25, 0.2, windowLight, 0, 0, 0.18));
  const latticeMaterial = stage.material("#d5a04d", { roughness: 0.75 });
  for (let index = 0; index < 5; index += 1) windowGroup.add(box(stage, 0.07, 2.0, 0.12, latticeMaterial, -1.1 + index * 0.55, 0, 0.33));
  for (let index = 0; index < 3; index += 1) windowGroup.add(box(stage, 2.6, 0.07, 0.12, latticeMaterial, 0, -0.68 + index * 0.68, 0.33));
  const carve = box(stage, 0.85, 2.2, 0.16, windowWood, -1.7, 0, 0.28);
  carve.rotation.z = 0.08;
  windowGroup.add(carve);
  const peacock = mesh(stage, new THREE.SphereGeometry(0.3, 8, 6), latticeMaterial, 1.35, 0.95, 0.35);
  peacock.scale.set(1, 1.3, 0.25);
  windowGroup.add(peacock);
  return windowGroup;
}

/* ------------------------------------------------------------------
   The walkable Kathmandu Valley.
   Units are roughly metres. Places keep their real directions from
   each other but distances are compressed so the valley is walkable.
   ------------------------------------------------------------------ */

function mulberry(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hs(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vn(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hs(ix, iy), b = hs(ix + 1, iy), c = hs(ix, iy + 1), d = hs(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 5) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < o; i += 1) {
    s += a * vn(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}
const ss = (a, b, x) => {
  let t = (x - a) / (b - a);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const col = (h) => new THREE.Color(h);

export const PLACES = {
  ds: { n: "Kathmandu Durbar Square", zh: "加德满都杜巴广场", np: "काठमाडौं दरबार क्षेत्र", x: 0, z: 0, r: 50, spawn: [6, 40] },
  sw: { n: "Swayambhunath", zh: "斯瓦扬布纳特（猴庙）", np: "स्वयम्भूनाथ", x: -110, z: -40, r: 15, spawn: [-97, -47] },
  pa: { n: "Pashupatinath", zh: "帕舒帕蒂纳特神庙", np: "पशुपतिनाथ", x: 128, z: -20, r: 22, spawn: [146, -3] },
  bo: { n: "Boudhanath", zh: "博达哈大佛塔", np: "बौद्धनाथ", x: 215, z: -80, r: 62, spawn: [215, -28] },
  pt: { n: "Patan Durbar Square", zh: "帕坦杜巴广场", np: "पाटन दरबार क्षेत्र", x: 55, z: 140, r: 40, spawn: [58, 164] },
  bk: { n: "Bhaktapur", zh: "巴克塔普尔", np: "भक्तपुर", x: 360, z: 90, r: 38, spawn: [364, 114] },
  ng: { n: "Nagarkot", zh: "纳加阔特", np: "नगरकोट", x: 520, z: -40, r: 14, spawn: [514, -36] },
};

export default function buildKathmandu({ scene, stage, manager }) {
  const LOWQ = stage.quality === "low";
  const rnd = mulberry(20261105);
  const rr = (a, b) => a + (b - a) * rnd();
  const camera = manager.camera;
  const controls = manager.controls;
  const renderer = manager.renderer;
  const canvas = manager.canvas;
  const PL = PLACES;

  /* ---------- geography ---------- */
  const VAL = { cx: 130, cz: 30, rx: 330, rz: 235 };
  const valE = (x, z) => Math.hypot((x - VAL.cx) / VAL.rx, (z - VAL.cz) / VAL.rz);
  const V3 = (a) => a.map((p) => new THREE.Vector3(p[0], 0, p[1]));
  const bagmati = new THREE.CatmullRomCurve3(V3([[160, -330], [156, -150], [152, -60], [150, -20], [146, 20], [112, 72], [60, 98], [0, 108], [-60, 122], [-130, 180], [-240, 330]]));
  const vishnumati = new THREE.CatmullRomCurve3(V3([[-70, -330], [-62, -150], [-56, -60], [-50, 20], [-40, 80], [-12, 106]]));
  const RSEG = [];
  const addSegs = (cv, n) => {
    const p = cv.getSpacedPoints(n);
    for (let i = 0; i < p.length - 1; i += 1) RSEG.push([p[i].x, p[i].z, p[i + 1].x, p[i + 1].z]);
  };
  addSegs(bagmati, 170);
  addSegs(vishnumati, 90);
  const dSeg = (px, pz, s) => {
    const vx = s[2] - s[0], vz = s[3] - s[1], wx = px - s[0], wz = pz - s[1];
    let t = (wx * vx + wz * vz) / (vx * vx + vz * vz);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = wx - vx * t, dz = wz - vz * t;
    return Math.sqrt(dx * dx + dz * dz);
  };
  const RG = new Map(), RC = 20;
  RSEG.forEach((s, i) => {
    const x0 = Math.floor((Math.min(s[0], s[2]) - 30) / RC), x1 = Math.floor((Math.max(s[0], s[2]) + 30) / RC);
    const z0 = Math.floor((Math.min(s[1], s[3]) - 30) / RC), z1 = Math.floor((Math.max(s[1], s[3]) + 30) / RC);
    for (let a = x0; a <= x1; a += 1) for (let b = z0; b <= z1; b += 1) {
      const k = a + "," + b;
      if (!RG.has(k)) RG.set(k, []);
      RG.get(k).push(i);
    }
  });
  const riverDist = (x, z) => {
    const l = RG.get(Math.floor(x / RC) + "," + Math.floor(z / RC));
    if (!l) return 99;
    let m = 99;
    for (const i of l) {
      const d = dSeg(x, z, RSEG[i]);
      if (d < m) m = d;
    }
    return m;
  };
  const WATER = -1.6;

  function baseH(x, z) {
    const e = valE(x, z);
    let h = fbm(x * 0.012, z * 0.012, 4) * 3 - 1.5;
    h += ss(0.95, 1.42, e) * (62 + fbm(x * 0.007 + 4, z * 0.007 + 1, 5) * 120) * (z < VAL.cz ? lerp(1, 0.55, ss(VAL.cz, VAL.cz - 260, z)) : 1);
    const ridge = 1 - Math.abs(fbm(x * 0.0035 + 7, z * 0.0035 + 2, 5) * 2 - 1);
    h += ss(-480, -880, z) * (ridge * ridge * 330 + 110) * (1 - ss(1000, 1500, Math.abs(x - 130)));
    const ds = Math.hypot(x - PL.sw.x, z - PL.sw.z);
    h += 33 * ss(60, 14, ds) + fbm(x * 0.08, z * 0.08, 3) * 3 * ss(60, 20, ds) * ss(12, 20, ds);
    return h;
  }
  const FLAT = [
    { x: 0, z: 0, r: 50, f: 24 }, { x: -110, z: -40, r: 15, f: 5 }, { x: 128, z: -20, r: 20, f: 12 }, { x: 166, z: -22, r: 9, f: 6 },
    { x: 215, z: -80, r: 74, f: 20 }, { x: 55, z: 140, r: 42, f: 18 }, { x: 360, z: 90, r: 40, f: 16 }, { x: 520, z: -40, r: 14, f: 10 },
  ];
  FLAT.forEach((f) => (f.h = baseH(f.x, f.z)));
  function hgt(x, z) {
    let h = baseH(x, z);
    for (const f of FLAT) {
      const dx = x - f.x, dz = z - f.z, RR = f.r + f.f;
      if (dx * dx + dz * dz < RR * RR) h += (f.h - h) * ss(RR, f.r, Math.sqrt(dx * dx + dz * dz));
    }
    const rd = riverDist(x, z);
    if (rd < 18) h += (Math.min(h, -4.2) - h) * ss(18, 5, rd);
    return h;
  }

  /* ---------- textures ---------- */
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
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
  const bricks = (g, w, h, rowH = 8) => {
    g.fillStyle = "#3e2318";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += rowH) {
      const o = (y / rowH) % 2 ? rowH : 0;
      for (let x = -o; x < w; x += rowH * 2) {
        const v = Math.random() * 30 - 15;
        g.fillStyle = `rgb(${148 + v},${66 + v * 0.6},${44 + v * 0.4})`;
        g.fillRect(x + 1, y + 1, rowH * 2 - 2, rowH - 2);
      }
    }
  };
  const TX = {};
  TX.brick = ctex(256, 256, (g, w, h) => { bricks(g, w, h); noiseFill(g, w, h, 1500, 0.12, 0, 80); });
  TX.stone = ctex(256, 256, (g, w, h) => {
    g.fillStyle = "#5f594f"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = -((y / 32) % 2) * 20; x < w; x += 40) {
      const v = Math.random() * 26 - 13;
      g.fillStyle = `rgb(${146 + v},${138 + v},${124 + v})`;
      g.fillRect(x + 2, y + 2, 36, 28);
    }
    noiseFill(g, w, h, 2500, 0.1, 40, 200);
  });
  TX.pave = ctex(256, 256, (g, w, h) => {
    g.fillStyle = "#4a3a30"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) {
      const v = Math.random() * 24 - 12;
      g.fillStyle = `rgb(${128 + v},${90 + v * 0.7},${70 + v * 0.5})`;
      if ((x / 16 + y / 16) % 2 === 0) { g.fillRect(x + 1, y + 1, 14, 6); g.fillRect(x + 1, y + 9, 14, 6); }
      else { g.fillRect(x + 1, y + 1, 6, 14); g.fillRect(x + 9, y + 1, 6, 14); }
    }
    noiseFill(g, w, h, 3000, 0.1, 0, 120);
  });
  TX.road = ctex(128, 128, (g, w, h) => {
    g.fillStyle = "#6b6358"; g.fillRect(0, 0, w, h);
    noiseFill(g, w, h, 2500, 0.25, 40, 170);
    g.fillStyle = "rgba(60,52,44,.5)"; g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h);
  });
  TX.wood = ctex(128, 128, (g, w, h) => {
    g.fillStyle = "#3a2416"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i += 1) {
      g.strokeStyle = `rgba(${20 + Math.random() * 30},${10 + Math.random() * 15},5,.5)`;
      g.beginPath(); g.moveTo(0, Math.random() * h); g.lineTo(w, Math.random() * h); g.stroke();
    }
  });
  TX.tiles = ctex(256, 256, (g, w, h) => {
    g.fillStyle = "#2a1610"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10) {
      const o = (y / 10) % 2 ? 6 : 0;
      for (let x = -o; x < w; x += 12) {
        const v = Math.random() * 26 - 13;
        g.fillStyle = `rgb(${104 + v},${50 + v * 0.5},${36 + v * 0.4})`;
        g.beginPath(); g.ellipse(x + 6, y + 5, 5.6, 5, 0, 0, Math.PI * 2); g.fill();
      }
    }
    noiseFill(g, w, h, 2000, 0.15, 0, 60);
  });
  TX.lime = ctex(256, 256, (g, w, h) => {
    g.fillStyle = "#ece7dc"; g.fillRect(0, 0, w, h);
    noiseFill(g, w, h, 6000, 0.18, 170, 250);
    for (let i = 0; i < 30; i += 1) {
      g.fillStyle = `rgba(120,105,80,${0.04 + Math.random() * 0.06})`;
      g.fillRect(Math.random() * w, Math.random() * h * 0.6, 1 + Math.random() * 2, 20 + Math.random() * 60);
    }
  });
  TX.dome = ctex(1024, 256, (g, w, h) => {
    g.fillStyle = "#efeae0"; g.fillRect(0, 0, w, h);
    noiseFill(g, w, h, 9000, 0.14, 180, 250);
    const n = 16, pw = w / n;
    for (let k = 0; k < n; k += 1) {
      const cx = k * pw + pw / 2;
      g.strokeStyle = "rgba(226,146,40,.85)"; g.lineWidth = 7;
      g.beginPath(); g.moveTo(cx - pw * 0.42, h * 0.98); g.bezierCurveTo(cx - pw * 0.42, h * 0.55, cx + pw * 0.42, h * 0.55, cx + pw * 0.42, h * 0.98); g.stroke();
      g.strokeStyle = "rgba(226,146,40,.5)"; g.lineWidth = 4;
      g.beginPath(); g.moveTo(cx - pw * 0.25, h * 0.98); g.bezierCurveTo(cx - pw * 0.25, h * 0.72, cx + pw * 0.25, h * 0.72, cx + pw * 0.25, h * 0.98); g.stroke();
    }
  });
  TX.eyes = ctex(512, 512, (g, w, h) => {
    g.fillStyle = "#b98a2a"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i += 1) {
      g.fillStyle = `rgba(255,${(210 + Math.random() * 40) | 0},120,.18)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    g.lineCap = "round";
    [150, 362].forEach((cx) => {
      g.strokeStyle = "#1b1410"; g.lineWidth = 13;
      g.beginPath(); g.moveTo(cx - 95, 190); g.quadraticCurveTo(cx, 125, cx + 95, 190); g.stroke();
      g.fillStyle = "#f7f2e6";
      g.beginPath(); g.moveTo(cx - 88, 262); g.quadraticCurveTo(cx, 195, cx + 88, 262); g.quadraticCurveTo(cx, 300, cx - 88, 262); g.fill();
      g.lineWidth = 7; g.stroke();
      g.fillStyle = "#1b1410"; g.beginPath(); g.arc(cx, 256, 26, 0, 7); g.fill();
      g.fillStyle = "#2f5f9a"; g.beginPath(); g.arc(cx, 256, 12, 0, 7); g.fill();
    });
    g.strokeStyle = "#9c2218"; g.lineWidth = 17;
    g.beginPath(); g.moveTo(256, 305); g.quadraticCurveTo(220, 350, 256, 378); g.quadraticCurveTo(292, 398, 250, 452); g.stroke();
    g.fillStyle = "#9c2218"; g.beginPath(); g.arc(256, 215, 11, 0, 7); g.fill();
  });
  TX.templeWall = ctex(256, 256, (g, w, h) => {
    bricks(g, w, h);
    g.fillStyle = "#2a170d"; g.fillRect(78, 70, 100, 186);
    g.fillStyle = "#4a2c18"; g.fillRect(70, 60, 116, 14); g.fillRect(70, 60, 12, 196); g.fillRect(174, 60, 12, 196);
    g.strokeStyle = "#5b381f"; g.lineWidth = 4;
    for (let i = 0; i < 6; i += 1) { g.beginPath(); g.moveTo(88 + i * 15, 80); g.lineTo(88 + i * 15, 250); g.stroke(); }
    g.fillStyle = "#c9952e"; g.beginPath(); g.arc(128, 48, 16, Math.PI, 0); g.fill();
  });
  TX.water = ctex(256, 256, (g, w, h) => {
    g.fillStyle = "#808080"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i += 1) {
      const v = (110 + Math.random() * 90) | 0;
      g.strokeStyle = `rgba(${v},${v},${v},.5)`; g.lineWidth = 1 + Math.random() * 2;
      const x = Math.random() * w, y = Math.random() * h;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y + 14, x, y + 30); g.stroke();
    }
  }, [1, 6]);
  TX.cloud = ctex(256, 128, (g, w, h) => {
    for (let i = 0; i < 26; i += 1) {
      const x = w * 0.15 + Math.random() * w * 0.7, y = h * 0.4 + Math.random() * h * 0.3, r = 18 + Math.random() * 34;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  });
  TX.cloud.wrapS = TX.cloud.wrapT = THREE.ClampToEdgeWrapping;

  function facade(floors, kind) {
    const W = 256, H = 96 * floors;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const e = document.createElement("canvas"); e.width = W; e.height = H;
    const ge = e.getContext("2d"); ge.fillStyle = "#000"; ge.fillRect(0, 0, W, H);
    if (kind === "newar") bricks(g, W, H, 6);
    else {
      g.fillStyle = "#eeeae2"; g.fillRect(0, 0, W, H);
      noiseFill(g, W, H, 3000, 0.12, 150, 255);
    }
    for (let f = 0; f < floors; f += 1) {
      const y0 = H - (f + 1) * 96;
      if (kind === "newar") { g.fillStyle = "#3a2416"; g.fillRect(0, y0 + 90, W, 6); }
      else { g.fillStyle = "rgba(120,112,100,.5)"; g.fillRect(0, y0 + 92, W, 4); }
      for (let k = 0; k < 3; k += 1) {
        const cx = (k + 0.5) * W / 3;
        if (f === 0) {
          if (kind === "newar") {
            g.fillStyle = "#2b190e"; g.fillRect(cx - 26, y0 + 30, 52, 66);
            g.fillStyle = "#4a2e1a"; g.fillRect(cx - 30, y0 + 24, 60, 8);
            if (k === 1) { g.fillStyle = "#6a4a2a"; g.fillRect(cx - 22, y0 + 36, 44, 60); }
          } else {
            g.fillStyle = k === 1 ? "#4f565c" : "#6b7378"; g.fillRect(cx - 32, y0 + 26, 64, 70);
            g.strokeStyle = "rgba(30,35,40,.5)"; g.lineWidth = 1;
            for (let s = 0; s < 14; s += 1) { g.beginPath(); g.moveTo(cx - 32, y0 + 30 + s * 5); g.lineTo(cx + 32, y0 + 30 + s * 5); g.stroke(); }
          }
          if (rnd() < 0.5) { ge.fillStyle = "#ffb35a"; ge.fillRect(cx - 24, y0 + 40, 48, 50); }
        } else {
          const ww = kind === "newar" ? (f === floors - 1 ? 54 : 34) : 40, wh = kind === "newar" ? 40 : 44;
          if (kind === "newar") {
            g.fillStyle = "#3a2416"; g.fillRect(cx - ww / 2 - 6, y0 + 20, ww + 12, wh + 14);
            g.fillStyle = "#1a1009"; g.fillRect(cx - ww / 2, y0 + 26, ww, wh);
            g.strokeStyle = "#5b381f"; g.lineWidth = 2;
            for (let s = 1; s < 5; s += 1) { g.beginPath(); g.moveTo(cx - ww / 2 + s * ww / 5, y0 + 26); g.lineTo(cx - ww / 2 + s * ww / 5, y0 + 26 + wh); g.stroke(); }
            for (let s = 1; s < 4; s += 1) { g.beginPath(); g.moveTo(cx - ww / 2, y0 + 26 + s * wh / 4); g.lineTo(cx + ww / 2, y0 + 26 + s * wh / 4); g.stroke(); }
            g.fillStyle = "#4a2e1a"; g.fillRect(cx - ww / 2 - 10, y0 + 16, ww + 20, 6);
          } else {
            g.fillStyle = "#d8d2c6"; g.fillRect(cx - ww / 2 - 4, y0 + 22, ww + 8, wh + 8);
            g.fillStyle = "#2b3540"; g.fillRect(cx - ww / 2, y0 + 26, ww, wh);
            g.fillStyle = "rgba(160,190,210,.25)"; g.fillRect(cx - ww / 2, y0 + 26, ww / 2, wh);
            g.fillStyle = "#6a6f73"; g.fillRect(cx - ww / 2 - 6, y0 + 26 + wh + 4, ww + 12, 3);
          }
          if (rnd() < 0.55) { ge.fillStyle = rnd() < 0.8 ? "#ffb35a" : "#cfe3ff"; ge.fillRect(cx - ww / 2 + 2, y0 + 28, ww - 4, wh - 4); }
        }
      }
    }
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = ANISO;
    const emi = new THREE.CanvasTexture(e); emi.colorSpace = THREE.SRGBColorSpace;
    stage.trackTexture(map); stage.trackTexture(emi);
    return { map, emi };
  }
  const FAC = { n3: facade(3, "newar"), n4: facade(4, "newar"), m3: facade(3, "modern"), m4: facade(4, "modern") };

  /* ---------- materials ---------- */
  const track = (m) => { stage.materials.add(m); return m; };
  function M(o) {
    const opts = Object.assign({ roughness: 0.88, metalness: 0 }, o);
    return track(new THREE.MeshStandardMaterial(opts));
  }
  const MAT = {
    gold: M({ color: "#d29a32", metalness: 0.55, roughness: 0.3, emissive: new THREE.Color("#2a1a04") }),
    gilt: M({ color: "#cf9d3e", metalness: 0.5, roughness: 0.38, emissive: new THREE.Color("#221503") }),
    wood: M({ map: TX.wood, color: "#b9a08a" }),
    dome: M({ map: TX.dome, roughness: 0.9 }),
    eyes: M({ map: TX.eyes, roughness: 0.5, metalness: 0.15 }),
    ochre: M({ color: "#7a2614", roughness: 0.8 }),
    white: M({ color: "#e9e3d6", map: TX.lime }),
    silver: M({ color: "#c8ccd0", metalness: 0.5, roughness: 0.3 }),
    stoneGrey: M({ color: "#a69f92", map: TX.stone }),
    tiles: M({ map: TX.tiles }),
    dark: M({ color: "#222222", roughness: 0.6 }),
    copper: M({ color: "#c07a3a", metalness: 0.5, roughness: 0.35 }),
    red: M({ color: "#8c1d17", roughness: 0.7 }),
    concrete: M({ color: "#b9b4aa", roughness: 0.95 }),
    templeWall: M({ map: TX.templeWall, roughness: 0.85 }),
  };
  const matCache = new Map();
  function tmat(name, base, rx, ry, extra) {
    rx = Math.max(0.5, Math.round(rx * 2) / 2);
    ry = Math.max(0.5, Math.round(ry * 2) / 2);
    const k = name + rx + "_" + ry;
    if (matCache.has(k)) return matCache.get(k);
    const t = base.clone();
    t.needsUpdate = true;
    t.repeat.set(rx, ry);
    stage.trackTexture(t);
    const m = M(Object.assign({ map: t }, extra || {}));
    matCache.set(k, m);
    return m;
  }
  const brickM = (w, h) => tmat("b", TX.brick, w / 3, h / 3);
  const stoneM = (w, h) => tmat("s", TX.stone, w / 3, h / 3, { color: "#bdb4a4" });
  const limeM = (w, h) => tmat("l", TX.lime, w / 5, h / 5);
  const tileM = (r) => tmat("t", TX.tiles, r * 1.2, 1.4);

  /* ---------- collision ---------- */
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

  /* ---------- camera, sky, light ---------- */
  const saved = {
    far: camera.far, near: camera.near, exposure: renderer.toneMappingExposure,
    maxTargetY: controls.maxTargetY, minTargetY: controls.minTargetY, minPhi: controls.minPhi, maxPhi: controls.maxPhi,
    updateCamera: controls.updateCamera, autoRotate: controls.autoRotate,
  };
  camera.near = 0.25;
  camera.far = 4200;
  camera.updateProjectionMatrix();
  controls.maxTargetY = 1e5;
  controls.minTargetY = -1e5;
  controls.minPhi = 0.25;
  controls.maxPhi = 1.62;

  const sunDir = new THREE.Vector3(0.4, 0.6, 0.3).normalize();
  const skyU = { sun: { value: sunDir }, zen: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, glow: { value: new THREE.Color() } };
  const skyMat = track(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: "varying vec3 w;void main(){w=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: "uniform vec3 sun,zen,hor,glow;varying vec3 w;void main(){vec3 d=normalize(w);float t=clamp(d.y,0.,1.);vec3 c=mix(hor,zen,pow(t,.5));if(d.y<0.)c=hor*0.9;float s=max(dot(d,normalize(sun)),0.);c+=glow*(pow(s,8.)*.45+pow(s,1200.)*5.);gl_FragColor=vec4(c,1.);}",
  }));
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3800, 32, 16), skyMat);
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  stage.add(sky);
  scene.fog = new THREE.FogExp2(0xffffff, 0.00075);
  scene.background = null;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x4a3e2a, 0.6);
  stage.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.castShadow = renderer.shadowMap.enabled;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 500 });
  stage.add(sun, sun.target);
  const stars = (() => {
    const g = new THREE.BufferGeometry(), p = [];
    for (let i = 0; i < 1400; i += 1) {
      const u = Math.random() * Math.PI * 2, v = Math.random() * 0.9 + 0.08, r = 3500, c = Math.cos(Math.asin(v));
      p.push(Math.cos(u) * c * r, v * r, Math.sin(u) * c * r);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    const m = track(new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    const s = new THREE.Points(g, m);
    s.frustumCulled = false;
    return s;
  })();
  stage.add(stars);

  /* ---------- terrain ---------- */
  (function terrain() {
    const SEG = LOWQ ? 300 : 380;
    const g = new THREE.PlaneGeometry(2600, 2600, SEG, SEG);
    g.rotateX(-Math.PI / 2);
    g.translate(VAL.cx, 0, -300);
    const p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
    const pal = {
      gold: col("#bf9a45"), straw: col("#a89062"), green: col("#5f7f33"), brown: col("#6e5238"), mustard: col("#c7b443"),
      forest: col("#2f4a24"), forest2: col("#3d5a2a"), rock: col("#5e5953"), snow: col("#eef1f5"), urban: col("#8a7a66"), bank: col("#837c6c"), mud: col("#3d3a30"),
    };
    const placeArr = Object.values(PL);
    for (let i = 0; i < p.count; i += 1) {
      const x = p.getX(i), z = p.getZ(i), h = hgt(x, z);
      p.setY(i, h);
      const e = valE(x, z), n = fbm(x * 0.09, z * 0.09, 3), dsw = Math.hypot(x - PL.sw.x, z - PL.sw.z);
      if (h > 215 + n * 60) c.copy(pal.snow);
      else if (h > 150 + n * 40) c.copy(pal.rock).lerp(pal.snow, ss(170, 215, h) * 0.5);
      else if (e > 0.97 || dsw < 52) {
        if (h < 95 && dsw > 52 && Math.sin(h * 1.9 + n * 2) > 0.55) c.copy(pal.gold).lerp(pal.green, n);
        else c.copy(pal.forest).lerp(pal.forest2, n).lerp(pal.rock, ss(120, 170, h));
        if (dsw < 52 && dsw > 15) c.copy(pal.forest).lerp(pal.forest2, n);
      } else {
        const fx = Math.floor((x + n * 10) / 15), fz = Math.floor((z + n * 8) / 11), r = hs(fx, fz);
        c.copy(r < 0.34 ? pal.gold : r < 0.58 ? pal.straw : r < 0.8 ? pal.green : r < 0.94 ? pal.brown : pal.mustard);
        c.multiplyScalar(0.86 + n * 0.28);
        if (hs(fx * 3.1, fz * 1.7) > 0.6) c.lerp(pal.brown, 0.25);
      }
      for (const q of placeArr) {
        if (q === PL.sw || q === PL.ng) continue;
        const d = Math.hypot(x - q.x, z - q.z);
        if (d < q.r * 1.9 + 20) c.lerp(pal.urban, ss(q.r * 1.9 + 20, q.r, d) * 0.8);
      }
      const rd = riverDist(x, z);
      if (rd < 20) { c.lerp(pal.bank, ss(20, 10, rd)); if (h < WATER) c.copy(pal.mud); }
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    g.computeVertexNormals();
    const nrm = g.attributes.normal;
    for (let i = 0; i < p.count; i += 1) {
      const h = p.getY(i);
      if (h < 140) continue;
      const k = ss(0.62, 0.42, nrm.getY(i)) * ss(140, 200, h) * 0.85;
      if (k > 0) {
        c.setRGB(cols[i * 3], cols[i * 3 + 1], cols[i * 3 + 2]).lerp(pal.rock.clone().multiplyScalar(0.7 + 0.5 * hs(i, 3)), k);
        cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
      }
    }
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    stage.trackGeometry(g);
    const m = new THREE.Mesh(g, M({ vertexColors: true, roughness: 0.97 }));
    m.receiveShadow = true;
    stage.add(m);
  })();

  /* ---------- rivers and roads ---------- */
  const waterMat = M({ color: "#5b6a58", roughness: 0.12, metalness: 0.15, map: TX.water, transparent: true, opacity: 0.93 });
  function ribbon(points, width, yFn, mat, uvScale) {
    const pos = [], uv = [], idx = [];
    let acc = 0;
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i], q = points[Math.min(i + 1, points.length - 1)], o = points[Math.max(i - 1, 0)];
      let tx = q.x - o.x, tz = q.z - o.z;
      const L = Math.hypot(tx, tz) || 1;
      tx /= L; tz /= L;
      const nx = -tz, nz = tx;
      if (i > 0) acc += Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z);
      const lx = p.x + nx * width / 2, lz = p.z + nz * width / 2, rx = p.x - nx * width / 2, rz = p.z - nz * width / 2;
      pos.push(lx, yFn(lx, lz, p), lz, rx, yFn(rx, rz, p), rz);
      uv.push(0, acc / uvScale, 1, acc / uvScale);
      if (i < points.length - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
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
  ribbon(bagmati.getSpacedPoints(260), 26, () => WATER, waterMat, 30);
  ribbon(vishnumati.getSpacedPoints(160), 20, () => WATER + 0.02, waterMat, 30);

  const ROADS = [
    { w: 5, p: [[0, 0], [-22, -10], [-42, -22], [-58, -34]] },
    { w: 5, p: [[0, 0], [40, -4], [80, -6], [104, -4], [116, -3]] },
    { w: 5, p: [[116, -3], [140, -3], [152, -4], [166, -10], [186, -40], [202, -60]] },
    { w: 5, p: [[0, 0], [16, 40], [34, 78], [46, 104], [54, 126]] },
    { w: 5, p: [[55, 150], [110, 160], [200, 140], [280, 112], [340, 96]] },
    { w: 4, p: [[378, 88], [415, 66], [455, 28], [495, -12], [515, -30]] },
    { w: 4, p: [[0, 0], [-6, -80], [-14, -190]] },
    { w: 4, p: [[-10, 10], [-60, 32], [-140, 60], [-220, 86]] },
    { w: 4, p: [[240, -30], [270, 10], [300, 50], [344, 80]] },
    { w: 4, p: [[60, 0], [70, -60], [90, -130], [110, -200]] },
  ];
  const RS = [], RSG = new Map(), RSC = 8, ROADPTS = [];
  const roadMat = M({ map: TX.road, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const railPts = [];
  ROADS.forEach((rd) => {
    const cv = new THREE.CatmullRomCurve3(V3(rd.p));
    const n = Math.max(8, Math.round(cv.getLength() / 2));
    const pts = cv.getSpacedPoints(n);
    ROADPTS.push(pts);
    const yAt = (x, z) => (riverDist(x, z) < 17 ? Math.max(hgt(x, z), 0.25) : hgt(x, z)) + 0.07;
    pts.forEach((p, i) => {
      const y = yAt(p.x, p.z);
      RS.push([p.x, p.z, y]);
      const k = Math.floor(p.x / RSC) + "," + Math.floor(p.z / RSC);
      if (!RSG.has(k)) RSG.set(k, []);
      RSG.get(k).push(RS.length - 1);
      if (riverDist(p.x, p.z) < 12 && hgt(p.x, p.z) < -0.4 && i % 2 === 0) {
        const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
        const tx = q.x - o.x, tz = q.z - o.z, L = Math.hypot(tx, tz) || 1;
        railPts.push([p.x - (tz / L) * rd.w / 2, y, p.z + (tx / L) * rd.w / 2], [p.x + (tz / L) * rd.w / 2, y, p.z - (tx / L) * rd.w / 2]);
      }
    });
    ribbon(pts, rd.w, (x, z, p) => Math.max(yAt(p.x, p.z), hgt(x, z) + 0.07), roadMat, 6);
  });
  function roadInfo(x, z) {
    const cx = Math.floor(x / RSC), cz = Math.floor(z / RSC);
    let best = 99, by = 0;
    for (let a = -1; a <= 1; a += 1) for (let b = -1; b <= 1; b += 1) {
      const l = RSG.get(cx + a + "," + (cz + b));
      if (!l) continue;
      for (const i of l) {
        const s = RS[i], d = Math.hypot(x - s[0], z - s[1]);
        if (d < best) { best = d; by = s[2]; }
      }
    }
    return { d: best, y: by };
  }
  const _o = new THREE.Object3D();
  if (railPts.length) {
    const im = new THREE.InstancedMesh(stage.trackGeometry(new THREE.BoxGeometry(0.35, 1.1, 0.35)), MAT.stoneGrey, railPts.length);
    railPts.forEach((p, i) => { _o.position.set(p[0], p[1] + 0.5, p[2]); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); });
    im.castShadow = true;
    stage.add(im);
  }

  /* ---------- building helpers ---------- */
  function mk(geo, mat, x, y, z, par, ry) {
    stage.trackGeometry(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    par.add(m);
    return m;
  }
  const bx = (w, h, d, mat, x, y, z, par, ry) => mk(new THREE.BoxGeometry(w, h, d), mat, x, y, z, par, ry);
  const cy = (rt, rb, h, seg, mat, x, y, z, par, ry) => mk(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, par, ry);
  function site(x, z, ry = 0) {
    const g = new THREE.Group();
    g.position.set(x, hgt(x, z), z);
    g.rotation.y = ry;
    g.updateMatrixWorld(true);
    return g;
  }
  const toWorld = (g, x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
  const STRUTS = [], FLAGS = [], LAMPS = [], WHEELS = [];
  const lineMat = track(new THREE.LineBasicMaterial({ color: 0x2c241c }));

  function pagoda(par, o) {
    let y = 0;
    (o.plinth || []).forEach((p) => {
      bx(p.w, p.h, p.d || p.w, o.plinthMat ? o.plinthMat(p.w, p.h) : brickM(p.w, p.h), 0, y + p.h / 2, 0, par);
      bx(p.w + 0.12, 0.12, (p.d || p.w) + 0.12, MAT.stoneGrey, 0, y + p.h - 0.04, 0, par);
      y += p.h;
    });
    let roofTop = y;
    o.tiers.forEach((t, i) => {
      const w = t.w;
      if (o.open && i === 0) {
        const n = 4;
        for (let a = 0; a < n; a += 1) for (let b = 0; b < n; b += 1) {
          if (a > 0 && a < n - 1 && b > 0 && b < n - 1) continue;
          bx(0.45, t.h, 0.45, MAT.wood, -w / 2 + 0.4 + a * (w - 0.8) / (n - 1), y + t.h / 2, -w / 2 + 0.4 + b * (w - 0.8) / (n - 1), par);
        }
        bx(w * 0.55, t.h * 0.8, w * 0.55, MAT.wood, 0, y + t.h * 0.4, 0, par);
      } else bx(w, t.h, w, o.wallMat || MAT.templeWall, 0, y + t.h / 2, 0, par);
      bx(w + 0.35, 0.3, w + 0.35, MAT.wood, 0, y + t.h - 0.15, 0, par);
      const ov = t.ov != null ? t.ov : Math.max(1.2, w * 0.36);
      const nextW = i < o.tiers.length - 1 ? o.tiers[i + 1].w : w * 0.22;
      const rh = t.rh != null ? t.rh : w * 0.3;
      const rb = (w / 2 + ov) * Math.SQRT2, rt = (nextW / 2) * Math.SQRT2 * 0.96;
      const roof = mk(new THREE.CylinderGeometry(rt, rb, rh, 4, 1), o.roofMat || tileM(rb), 0, y + t.h + rh / 2 - 0.15, 0, par);
      roof.rotation.y = Math.PI / 4;
      const eave = mk(new THREE.CylinderGeometry(rb, rb * 0.985, 0.22, 4, 1, true), o.roofMat || MAT.wood, 0, y + t.h - 0.26, 0, par);
      eave.rotation.y = Math.PI / 4;
      for (let s = 0; s < 4; s += 1) {
        const ang = (s * Math.PI) / 2, ns = Math.max(2, Math.floor(w / 1.7));
        for (let k = 0; k < ns; k += 1) {
          const u = (k + 0.5) / ns - 0.5;
          const lx = Math.sin(ang) * (w / 2 + 0.42) + Math.cos(ang) * u * w, lz = Math.cos(ang) * (w / 2 + 0.42) - Math.sin(ang) * u * w;
          const wp = toWorld(par, lx, y + t.h - 0.85, lz);
          STRUTS.push([wp.x, wp.y, wp.z, par.rotation.y + ang]);
        }
      }
      roofTop = y + t.h + rh - 0.15;
      y = y + t.h + rh * 0.62;
    });
    const fs = o.finial || 1;
    cy(0.5 * fs, 0.75 * fs, 0.5 * fs, 12, MAT.gold, 0, roofTop + 0.2 * fs, 0, par);
    cy(0.15 * fs, 0.55 * fs, 1.1 * fs, 12, MAT.gold, 0, roofTop + 0.95 * fs, 0, par);
    mk(new THREE.SphereGeometry(0.38 * fs, 12, 8), MAT.gold, 0, roofTop + 1.6 * fs, 0, par);
    cy(0, 0.22 * fs, 1.1 * fs, 10, MAT.gold, 0, roofTop + 2.3 * fs, 0, par);
    const r = (o.plinth && o.plinth.length ? o.plinth[0].w : o.tiers[0].w) / 2;
    const wp = toWorld(par, 0, 0, 0);
    if (o.blockR !== 0) block(wp.x, wp.z, o.blockR || r * 1.02);
    return { top: roofTop + 2.8 * fs };
  }

  function stupa(par, o) {
    let y = 0;
    o.base.forEach((b) => {
      cy(b.r, b.r + 0.25, b.h, b.seg, limeM(b.r * 2, b.h * 2), 0, y + b.h / 2, 0, par);
      cy(b.r + 0.06, b.r + 0.06, 0.2, b.seg, MAT.ochre, 0, y + b.h - 0.1, 0, par);
      y += b.h;
    });
    const D = o.domeR;
    cy(D * 1.03, D * 1.05, o.drum, 48, limeM(D * 6, o.drum), 0, y + o.drum / 2, 0, par);
    y += o.drum;
    const dome = mk(new THREE.SphereGeometry(D, 72, 28, 0, Math.PI * 2, 0, Math.PI / 2), MAT.dome, 0, y, 0, par);
    dome.scale.y = o.domeS;
    y += D * o.domeS - 0.15;
    const H = o.harmika;
    bx(H * 1.08, 0.35, H * 1.08, MAT.gold, 0, y + 0.17, 0, par);
    bx(H, H * 0.82, H, [MAT.eyes, MAT.eyes, MAT.gold, MAT.gold, MAT.eyes, MAT.eyes], 0, y + 0.35 + H * 0.41, 0, par);
    y += 0.35 + H * 0.82;
    bx(H * 1.18, 0.35, H * 1.18, MAT.gold, 0, y + 0.17, 0, par);
    y += 0.35;
    if (o.spire === "steps") {
      for (let i = 0; i < 13; i += 1) { const s = H * 1.02 - i * (H * 0.62 / 13); bx(s, o.step, s, MAT.gold, 0, y + o.step / 2, 0, par); y += o.step; }
    } else {
      for (let i = 0; i < 13; i += 1) { const r = H * 0.52 - i * (H * 0.3 / 13); cy(r * 0.93, r, o.step, 28, MAT.gold, 0, y + o.step / 2, 0, par); y += o.step; }
    }
    cy(0.12, H * 0.62, 0.7, 24, MAT.gold, 0, y + 0.35, 0, par); y += 0.6;
    cy(H * 0.12, H * 0.16, 1.2, 12, MAT.gold, 0, y + 0.6, 0, par); y += 1.2;
    mk(new THREE.SphereGeometry(H * 0.13, 12, 10), MAT.gold, 0, y + 0.15, 0, par);
    cy(0, H * 0.07, 1.4, 10, MAT.gold, 0, y + 0.9, 0, par);
    return { spireY: y - 1.8 };
  }
  function flagString(A, B, sag) {
    const pts = [];
    for (let i = 0; i <= 20; i += 1) { const t = i / 20; const v = A.clone().lerp(B, t); v.y -= Math.sin(t * Math.PI) * sag; pts.push(v); }
    const lg = stage.trackGeometry(new THREE.BufferGeometry().setFromPoints(pts));
    stage.add(new THREE.Line(lg, lineMat));
    const len = A.distanceTo(B), n = Math.floor(len / 0.62), yaw = Math.atan2(B.x - A.x, B.z - A.z) + Math.PI / 2;
    for (let i = 1; i < n; i += 1) { const t = i / n; const v = A.clone().lerp(B, t); v.y -= Math.sin(t * Math.PI) * sag; FLAGS.push({ x: v.x, y: v.y, z: v.z, yaw, c: i % 5, ph: Math.random() * 6 }); }
  }
  function flagLines(par, from, count, toR, toY, sag, start = 0) {
    for (let k = 0; k < count; k += 1) {
      const a = ((k + start) / count) * Math.PI * 2;
      flagString(toWorld(par, 0, from, 0), toWorld(par, Math.cos(a) * toR, toY, Math.sin(a) * toR), sag);
    }
  }
  const PRISM = (() => {
    const g = new THREE.BufferGeometry();
    const v = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 1, 0, -0.5, 0, -0.5, 0.5, 1, 0, -0.5, 1, 0, 0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 1, 0, 0.5, 0, 0.5, -0.5, 1, 0, 0.5, 1, 0, -0.5, 0, 0.5, -0.5, 0, -0.5, -0.5, 1, 0, 0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 1, 0];
    const uv = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0.5, 1, 0, 0, 1, 0, 0.5, 1];
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return stage.trackGeometry(g);
  })();
  function newarBuilding(x, z, w, d, h, ry, opts = {}) {
    const g = site(x, z, ry);
    const fm = M({ map: (opts.fac || FAC.n3).map, roughness: 0.85 });
    const plain = brickM(d, h);
    bx(w, h, d, [plain, plain, MAT.wood, MAT.wood, fm, fm], 0, h / 2, 0, g);
    bx(w + 0.5, 0.35, d + 0.5, MAT.wood, 0, h - 0.1, 0, g);
    const r = new THREE.Mesh(PRISM, tileM(w / 2));
    r.position.y = h;
    r.scale.set(w + 1.6, Math.min(w, d) * 0.32, d + 1.6);
    r.castShadow = r.receiveShadow = true;
    g.add(r);
    if (opts.gate) bx(3.4, 4.6, 0.3, MAT.gold, 0, 2.3, d / 2 + 0.12, g);
    blockRect(x, z, w, d, ry);
    return g;
  }
  const paveDisc = (P, y, r, rep) => {
    const t = TX.pave.clone();
    t.needsUpdate = true;
    t.repeat.set(rep, rep);
    stage.trackTexture(t);
    const m = mk(new THREE.CircleGeometry(r, 64), M({ map: t, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 }), P.x, y + 0.03, P.z, stage.root);
    m.rotation.x = -Math.PI / 2;
    m.castShadow = false;
  };

  /* Interactive registration: their beacons are scaled up for the large valley. */
  const INTERACTIVE_POS = {};
  function interactive(id, group, label, beacon, opts = {}) {
    group.updateMatrixWorld(true);
    const by = Math.max(hgt(beacon[0], beacon[1]), roadInfo(beacon[0], beacon[1]).d < 3 ? roadInfo(beacon[0], beacon[1]).y : -99);
    const entry = stage.addInteractive(id, group, {
      label,
      accent: "#e6bc6a",
      radius: opts.radius || 14,
      beaconPosition: [beacon[0], by + 0.1, beacon[1]],
      labelOffset: opts.labelOffset || 1.2,
      focus: opts.focus,
    });
    entry.beacon.group.scale.setScalar(opts.beaconScale || 1.6);
    INTERACTIVE_POS[id] = { x: beacon[0], z: beacon[1], label };
    return entry;
  }

  /* ---------- Kathmandu Durbar Square ---------- */
  const steamSources = [];
  (function () {
    const P = PL.ds;
    paveDisc(P, FLAT[0].h, P.r, 18);
    const kast = site(-26, 18);
    pagoda(kast, { plinth: [{ w: 20, h: 0.9 }], open: true, tiers: [{ w: 15, h: 5, ov: 3, rh: 3.6 }, { w: 10.5, h: 3.6, ov: 2.2, rh: 2.8 }, { w: 6.6, h: 3, ov: 1.6, rh: 2.4 }], finial: 1.1, blockR: 9 });
    interactive("ne-kasthamandap", kast, "Kasthamandap", [-26, 31]);
    const maju = site(-6, 0);
    const mp = [];
    for (let i = 0; i < 9; i += 1) mp.push({ w: 18 - i, h: 0.72 });
    pagoda(maju, { plinth: mp, tiers: [{ w: 8, h: 4.4, rh: 2.7 }, { w: 6, h: 3.2, rh: 2.2 }, { w: 4, h: 2.6, rh: 1.9 }], blockR: 9 });
    stage.add(maju);
    const tm = site(8, 18);
    pagoda(tm, { plinth: [{ w: 10, h: 0.8 }, { w: 9, h: 0.8 }, { w: 8, h: 0.8 }, { w: 7, h: 0.8 }, { w: 6.6, h: 0.8 }], tiers: [{ w: 5.8, h: 3.8, rh: 2.2 }, { w: 4.4, h: 2.8, rh: 1.8 }, { w: 3.2, h: 2.3, rh: 1.5 }], blockR: 5.2 });
    stage.add(tm);
    const tal = site(30, -38);
    const tp = [];
    for (let i = 0; i < 12; i += 1) tp.push({ w: 24 - i * 0.95, h: 0.7 });
    pagoda(tal, { plinth: tp, tiers: [{ w: 11, h: 6, rh: 3.6 }, { w: 8, h: 4.2, rh: 2.8 }, { w: 5.4, h: 3.4, rh: 2.3 }], roofMat: MAT.gilt, finial: 1.4, blockR: 12.5 });
    stage.add(tal);
    const kumari = newarBuilding(-34, -14, 16, 14, 11, Math.PI / 2, { fac: FAC.n4 });
    interactive("ne-kumari", kumari, "Kumari Ghar", [-24, -8]);
    // carved Newar window on the Kumari Ghar façade (existing discovery)
    const win = buildCarvedWindow(stage);
    win.position.set(-26.85, hgt(-26, -18) + 6.2, -18.5);
    win.rotation.y = Math.PI / 2;
    interactive("ne-window", win, "Carved window", [-24, -19], { radius: 8 });
    const gb = site(10, -20);
    bx(24, 9, 9, MAT.white, 0, 4.5, 0, gb);
    bx(25, 0.6, 10, MAT.white, 0, 9.1, 0, gb);
    for (let i = 0; i < 9; i += 1) cy(0.42, 0.48, 8, 14, MAT.white, -11 + i * 2.75, 4, 5.2, gb);
    bx(24.6, 0.5, 1.8, MAT.white, 0, 8.25, 5.2, gb);
    const gr = new THREE.Mesh(PRISM, MAT.concrete);
    gr.position.y = 9.4; gr.scale.set(25, 2.2, 10); gr.castShadow = true;
    gb.add(gr);
    blockRect(10, -20, 25, 11, 0);
    stage.add(gb);
    stage.add(newarBuilding(40, -2, 30, 10, 10, -Math.PI / 2, { fac: FAC.n3, gate: true }));
    // their stalls, placed around the square
    const momo = buildMomoStall(stage);
    momo.position.set(22, FLAT[0].h, 30); momo.rotation.y = -0.4;
    interactive("ne-momo", momo, "Momo", [22, 33.5], { radius: 9 });
    blockRect(22, 30, 4.2, 2.6, -0.4);
    steamSources.push(new THREE.Vector3(22, FLAT[0].h + 2.2, 30));
    const topi = buildTopiStall(stage);
    topi.position.set(-14, FLAT[0].h, 36); topi.rotation.y = 0.3;
    interactive("ne-topi", topi, "Dhaka topi", [-12, 39], { radius: 9 });
    blockRect(-14, 36, 3.2, 1.8, 0.3);
    const madal = buildMadalSpot(stage);
    madal.position.set(10, FLAT[0].h, 30); madal.rotation.y = -0.3;
    interactive("ne-madal", madal, "Madal", [10, 32.5], { radius: 8 });
  })();

  /* ---------- Swayambhunath ---------- */
  (function () {
    const P = PL.sw, top = FLAT[1].h;
    const pave = mk(new THREE.CircleGeometry(P.r, 48), M({ map: TX.stone, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 }), P.x, top + 0.03, P.z, stage.root);
    pave.rotation.x = -Math.PI / 2;
    const g = site(P.x, P.z);
    const st = stupa(g, { base: [{ r: 11.5, h: 0.9, seg: 48 }], drum: 0.8, domeR: 9.2, domeS: 0.78, harmika: 4.2, spire: "rings", step: 0.52 });
    for (let k = 0; k < 4; k += 1) { const a = (k * Math.PI) / 2; bx(1.8, 2.6, 0.8, MAT.gilt, Math.cos(a) * 9.6, 2.6, Math.sin(a) * 9.6, g, -a + Math.PI / 2); }
    block(P.x, P.z, 12);
    interactive("ne-swayambhu", g, "Swayambhunath", [-100, -31], { radius: 22, labelOffset: 2 });
    flagLines(g, st.spireY, 10, 14.5, 0.6, 1.6, 0.25);
    const h = site(P.x - 6, P.z - 12.5);
    pagoda(h, { plinth: [{ w: 5.6, h: 0.6 }], tiers: [{ w: 4.2, h: 3.2, rh: 1.8 }, { w: 3, h: 2.2, rh: 1.4 }], roofMat: MAT.gilt, finial: 0.7, blockR: 3.4 });
    stage.add(h);
    const v = site(P.x + 11.6, P.z);
    cy(1.3, 1.5, 1.2, 20, MAT.stoneGrey, 0, 0.6, 0, v);
    const vj = mk(new THREE.CylinderGeometry(0.25, 0.25, 2.6, 12), MAT.gold, 0, 1.9, 0, v);
    vj.rotation.z = Math.PI / 2;
    mk(new THREE.SphereGeometry(0.6, 14, 10), MAT.gold, 1.35, 1.9, 0, v);
    mk(new THREE.SphereGeometry(0.6, 14, 10), MAT.gold, -1.35, 1.9, 0, v);
    block(P.x + 11.6, P.z, 1.6);
    stage.add(v);
    const steps = [];
    for (let x = -60; x > -96.5; x -= 0.8) steps.push(x);
    const sg = new THREE.BoxGeometry(0.85, 1.6, 4.2);
    sg.translate(0, -0.62, 0);
    const im = new THREE.InstancedMesh(stage.trackGeometry(sg), MAT.stoneGrey, steps.length);
    steps.forEach((x, i) => { _o.position.set(x, hgt(x, P.z) + 0.05, P.z); _o.rotation.set(0, 0, 0); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); });
    im.receiveShadow = im.castShadow = true;
    stage.add(im);
    for (let i = 0; i < 40; i += 1) { const a = (i / 40) * Math.PI * 2; LAMPS.push([P.x + Math.cos(a) * 12.6, top + 0.95, P.z + Math.sin(a) * 12.6]); }
    for (let i = 0; i < 6; i += 1) {
      const a = rr(0, Math.PI * 2);
      const A = new THREE.Vector3(P.x + Math.cos(a) * 14, top + 4, P.z + Math.sin(a) * 14);
      const b = a + rr(-0.5, 0.5), d = rr(26, 40), bx2 = P.x + Math.cos(b) * d, bz = P.z + Math.sin(b) * d;
      flagString(A, new THREE.Vector3(bx2, hgt(bx2, bz) + 5, bz), 1.5);
    }
  })();

  /* ---------- Pashupatinath ---------- */
  (function () {
    const P = PL.pa, y0 = FLAT[2].h;
    const st = TX.stone.clone(); st.needsUpdate = true; st.repeat.set(5, 4); stage.trackTexture(st);
    const pave = mk(new THREE.PlaneGeometry(36, 30), M({ map: st, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 }), P.x - 2, y0 + 0.03, P.z, stage.root);
    pave.rotation.x = -Math.PI / 2;
    const g = site(P.x, P.z);
    pagoda(g, { plinth: [{ w: 14, h: 1.1 }], tiers: [{ w: 10, h: 7, rh: 3.4, ov: 2.6 }, { w: 7, h: 4.6, rh: 2.8 }], roofMat: MAT.gold, finial: 1.6, blockR: 8 });
    for (let k = 0; k < 4; k += 1) { const a = (k * Math.PI) / 2; bx(2.4, 3.8, 0.25, MAT.silver, Math.sin(a) * 5.08, 3, Math.cos(a) * 5.08, g, a); }
    const half = 11, wh = 3.2;
    [[0, -half, 22, 0.9], [0, half, 22, 0.9], [-half, 0, 0.9, 22], [half, 0, 0.9, 22]].forEach((s) => {
      bx(s[2], wh, s[3], MAT.white, s[0], wh / 2, s[1], g);
      bx(s[2] + 0.6, 0.4, s[3] + 0.6, MAT.tiles, s[0], wh + 0.15, s[1], g);
    });
    for (let i = -half; i <= half; i += 1.5) { block(P.x + i, P.z - half, 1); block(P.x + i, P.z + half, 1); block(P.x - half, P.z + i, 1); block(P.x + half, P.z + i, 1); }
    bx(4, 5, 1.4, MAT.white, -half, 2.5, 0, g, Math.PI / 2);
    interactive("ne-pashupati", g, "Pashupatinath", [112, -14], { radius: 24, labelOffset: 2 });
    const gh = site(P.x + 15, P.z);
    for (let s = 0; s < 6; s += 1) bx(1.4, 0.5, 26, MAT.stoneGrey, s * 1.3, -0.25 - s * 0.5, 0, gh);
    for (let k = 0; k < 3; k += 1) cy(1.3, 1.4, 0.6, 18, MAT.stoneGrey, 6.6, -2.8, -8 + k * 8, gh);
    stage.add(gh);
    for (let i = 0; i < 9; i += 1) {
      const sz = -38 + i * 4.2, sx = 172, s = site(sx, sz);
      bx(2.6, 2.6, 2.6, MAT.white, 0, 1.3, 0, s);
      mk(new THREE.SphereGeometry(1.25, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.white, 0, 2.6, 0, s);
      cy(0, 0.3, 0.9, 8, MAT.gilt, 0, 4, 0, s);
      block(sx, sz, 1.8);
      stage.add(s);
    }
    const tb = site(160, -20);
    for (let s = 0; s < 4; s += 1) bx(2, 0.55, 30, MAT.stoneGrey, -s * 1.4 + 2, -0.25 - s * 0.55, 0, tb);
    stage.add(tb);
    for (let i = 0; i < 30; i += 1) LAMPS.push([P.x + 22.5, -1.15, P.z - 12 + i * 0.8]);
    // marigold garland stall by the temple road (existing discovery)
    const garland = buildGarlandStall(stage);
    garland.position.set(104, hgt(104, -12), -12); garland.rotation.y = 0.6;
    interactive("ne-marigold", garland, "Marigold", [106, -9], { radius: 8 });
    blockRect(104, -12, 3, 1.6, 0.6);
  })();

  /* ---------- Boudhanath ---------- */
  (function () {
    const P = PL.bo, y0 = FLAT[4].h;
    paveDisc(P, y0, P.r, 24);
    const g = site(P.x, P.z);
    const st = stupa(g, { base: [{ r: 30, h: 1.5, seg: 20 }, { r: 25.5, h: 1.6, seg: 20 }, { r: 21, h: 1.6, seg: 20 }], drum: 1.1, domeR: 16.5, domeS: 0.62, harmika: 6.8, spire: "steps", step: 0.74 });
    block(P.x, P.z, 30.6);
    interactive("ne-boudha", g, "Boudhanath", [215, -40], { radius: 34, labelOffset: 2.5 });
    flagLines(g, st.spireY, 16, 30, 1.5, 3, 0);
    for (let i = 0; i < 144; i += 1) { const a = (i / 144) * Math.PI * 2; if (Math.abs(Math.sin(a * 2)) < 0.06) continue; WHEELS.push([P.x + Math.cos(a) * 31.1, y0 + 1.0, P.z + Math.sin(a) * 31.1, a]); }
    for (let i = 0; i < 70; i += 1) { const a = (i / 70) * Math.PI * 2; LAMPS.push([P.x + Math.cos(a) * 21.7, y0 + 4.75, P.z + Math.sin(a) * 21.7]); }
    const m = site(P.x + 52, P.z - 62, -0.7);
    bx(18, 9, 14, MAT.white, 0, 4.5, 0, m);
    bx(18.4, 1.4, 14.4, MAT.red, 0, 9.4, 0, m);
    const mt = new THREE.Group(); mt.position.y = 10.1; m.add(mt); m.updateMatrixWorld(true);
    pagoda(mt, { plinth: [], tiers: [{ w: 6, h: 1.8, rh: 2, ov: 1.2 }], roofMat: MAT.gilt, finial: 0.8, blockR: 0 });
    blockRect(P.x + 52, P.z - 62, 18, 14, -0.7);
    stage.add(m);
  })();

  /* ---------- Patan ---------- */
  (function () {
    const P = PL.pt, y0 = FLAT[5].h;
    paveDisc(P, y0, P.r, 15);
    const g = site(50, 148);
    const sm = M({ map: TX.stone, color: "#c9b89a" });
    let y = 0;
    [[12, 0.8], [10.6, 0.8], [9.4, 0.8]].forEach((p) => { bx(p[0], p[1], p[0], stoneM(p[0], p[1]), 0, y + p[1] / 2, 0, g); y += p[1]; });
    const lvl = (w, h, yy) => {
      bx(w, h, w, sm, 0, yy + h / 2, 0, g);
      bx(w + 0.5, 0.35, w + 0.5, sm, 0, yy + h + 0.17, 0, g);
      for (let a = 0; a < 4; a += 1) for (let b = 0; b < 4; b += 1) {
        if (a > 0 && a < 3 && b > 0 && b < 3) continue;
        cy(0.16, 0.18, h * 0.8, 8, sm, -w / 2 - 0.3 + (a * (w + 0.6)) / 3, yy + h * 0.4, -w / 2 - 0.3 + (b * (w + 0.6)) / 3, g);
      }
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach((c) => {
        const cx = c[0] * (w / 2 + 0.1), cz = c[1] * (w / 2 + 0.1);
        for (let p = 0; p < 4; p += 1) cy(0.08, 0.08, 1.2, 6, sm, cx + (p % 2 ? 0.45 : -0.45), yy + h + 0.95, cz + (p < 2 ? 0.45 : -0.45), g);
        mk(new THREE.SphereGeometry(0.65, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), sm, cx, yy + h + 1.55, cz, g);
        cy(0, 0.12, 0.6, 8, MAT.gold, cx, yy + h + 2.4, cz, g);
      });
    };
    lvl(8.4, 3, y); y += 3.35;
    lvl(6.6, 2.6, y); y += 2.95;
    for (let i = 0; i < 10; i += 1) {
      const t = i / 10, w = lerp(4.6, 1.5, Math.pow(t, 1.1)), h = 0.95;
      const s = mk(new THREE.CylinderGeometry((w / 2) * Math.SQRT2 * 0.94, (w / 2) * Math.SQRT2, h, 4), sm, 0, y + h / 2, 0, g);
      s.rotation.y = Math.PI / 4;
      y += h;
    }
    cy(1.2, 1.2, 0.45, 18, sm, 0, y + 0.22, 0, g); y += 0.45;
    cy(0.2, 0.55, 0.9, 12, MAT.gold, 0, y + 0.45, 0, g);
    mk(new THREE.SphereGeometry(0.3, 10, 8), MAT.gold, 0, y + 1.05, 0, g);
    cy(0, 0.12, 0.8, 8, MAT.gold, 0, y + 1.6, 0, g);
    block(50, 148, 6.4);
    interactive("ne-krishna", g, "Krishna Mandir", [50, 158], { radius: 18, labelOffset: 2 });
    stage.add(newarBuilding(82, 140, 46, 11, 11, -Math.PI / 2, { fac: FAC.n4, gate: true }));
    let h = site(52, 124);
    pagoda(h, { plinth: [{ w: 11, h: 0.7 }, { w: 10, h: 0.7 }, { w: 9, h: 0.7 }, { w: 8.2, h: 0.7 }], tiers: [{ w: 7, h: 4.2, rh: 2.4 }, { w: 5, h: 3, rh: 1.9 }], blockR: 6 });
    stage.add(h);
    h = site(32, 138);
    pagoda(h, { plinth: [{ w: 9, h: 0.8 }], tiers: [{ w: 7, h: 4, rh: 2.3 }, { w: 5, h: 2.8, rh: 1.8 }, { w: 3.4, h: 2.2, rh: 1.4 }], roofMat: MAT.gilt, blockR: 5 });
    stage.add(h);
    const pil = site(62, 132);
    bx(1.6, 1, 1.6, MAT.stoneGrey, 0, 0.5, 0, pil);
    cy(0.45, 0.55, 9, 14, MAT.stoneGrey, 0, 5.5, 0, pil);
    bx(1.2, 0.5, 1.2, MAT.stoneGrey, 0, 10.2, 0, pil);
    mk(new THREE.SphereGeometry(0.55, 12, 10), MAT.gold, 0, 11, 0, pil);
    bx(0.9, 1.1, 0.6, MAT.gold, 0, 11.6, 0, pil);
    block(62, 132, 1.2);
    stage.add(pil);
    // Manga Hiti, the sunken stone water spout of Patan (existing discovery)
    const hiti = buildHiti(stage);
    hiti.position.set(70, y0, 156); hiti.rotation.y = -Math.PI / 2;
    interactive("ne-hiti", hiti, "Hiti", [67, 156], { radius: 8 });
    blockRect(70, 156, 3.3, 2.6, -Math.PI / 2);
  })();

  /* ---------- Bhaktapur ---------- */
  (function () {
    const P = PL.bk, y0 = FLAT[6].h;
    paveDisc(P, y0, P.r, 15);
    const g = site(358, 80);
    const pl = [{ w: 22, h: 1.5 }, { w: 18.6, h: 1.5 }, { w: 15.4, h: 1.5 }, { w: 12.4, h: 1.5 }, { w: 9.8, h: 1.5 }];
    pagoda(g, { plinth: pl, tiers: [{ w: 7.4, h: 4.8, rh: 2.9 }, { w: 6.2, h: 3.6, rh: 2.4 }, { w: 5.1, h: 3, rh: 2.1 }, { w: 4, h: 2.6, rh: 1.8 }, { w: 3, h: 2.2, rh: 1.6 }], finial: 1.1, blockR: 11.4 });
    for (let s = 0; s < 20; s += 1) bx(3.6, 0.38, 0.5, MAT.stoneGrey, 0, s * 0.375 + 0.19, 18 - s * 0.36, g);
    const fig = [[0.5, 1.6, "#6b5e50"], [1.1, 1.4, "#5d5348"], [0.8, 1.3, "#6b5e50"], [0.75, 1.2, "#5d5348"], [0.6, 1.1, "#6b5e50"]];
    pl.forEach((p, i) => {
      const yy = pl.slice(0, i).reduce((a, b) => a + b.h, 0), zz = p.w / 2 + 0.6, f = fig[i];
      [-1, 1].forEach((sd) => {
        bx(0.9, 0.4, 0.9, MAT.stoneGrey, sd * 2.4, yy + 0.2, zz, g);
        mk(new THREE.SphereGeometry(f[0], 10, 8), M({ color: f[2], roughness: 0.8 }), sd * 2.4, yy + 0.4 + f[1] * 0.55, zz, g).scale.set(1, (f[1] / f[0]) * 0.55, 1);
      });
    });
    interactive("ne-temple", g, "Nyatapola", [358, 104], { radius: 24, labelOffset: 2 });
    const b = site(386, 92);
    pagoda(b, { plinth: [{ w: 14, h: 1 }], tiers: [{ w: 11, h: 5, rh: 3 }, { w: 8, h: 3.4, rh: 2.4 }, { w: 5.4, h: 2.8, rh: 1.9 }], roofMat: MAT.gilt, blockR: 7.4 });
    stage.add(b);
    // lokta paper workshop (existing discovery)
    const lokta = buildLoktaWorkshop(stage);
    lokta.position.set(342, y0, 108); lokta.rotation.y = 0.3;
    interactive("ne-lokta", lokta, "Lokta paper", [343, 111], { radius: 8 });
    blockRect(342, 108, 3.5, 1.6, 0.3);
  })();

  /* ---------- Nagarkot ---------- */
  (function () {
    const P = PL.ng;
    const g = site(P.x, P.z - 4);
    for (let a = 0; a < 4; a += 1) cy(0.2, 0.2, 8, 8, MAT.concrete, a % 2 ? 1.6 : -1.6, 4, a < 2 ? 1.6 : -1.6, g);
    bx(4.4, 0.4, 4.4, MAT.concrete, 0, 8.2, 0, g);
    for (let s = 0; s < 4; s += 1) bx(4.4, 0.08, 0.08, MAT.dark, 0, 9.2, s < 2 ? 2.2 : -2.2, g);
    block(P.x, P.z - 4, 2.6);
    bx(3, 0.45, 0.8, M({ color: "#8a6a4a" }), -3, 0.45, 5, g);
    interactive("ne-nagarkot", g, "Nagarkot", [520, -31], { radius: 14 });
    flagString(toWorld(g, -2, 6, 2), new THREE.Vector3(P.x + 12, hgt(P.x + 12, P.z + 6) + 4, P.z + 6), 1.2);
  })();

  /* ---------- houses ---------- */
  const houses = [];
  function houseOK(x, z, rad) {
    if (valE(x, z) > 0.97) return false;
    if (riverDist(x, z) < 15) return false;
    if (roadInfo(x, z).d < rad + 3) return false;
    for (const k in PL) { const q = PL[k]; if (Math.hypot(x - q.x, z - q.z) < q.r + rad + 1) return false; }
    if (Math.hypot(x - PL.sw.x, z - PL.sw.z) < 64) return false;
    if (Math.hypot(x - 158, z + 20) < 26) return false;
    if (blocked(x, z, rad)) return false;
    const h0 = hgt(x, z);
    if (Math.abs(hgt(x + rad, z) - h0) > 1.2 || Math.abs(hgt(x, z + rad) - h0) > 1.2) return false;
    return true;
  }
  function cluster(cx, cz, r0, r1, n, newarShare, rot) {
    let made = 0;
    for (let t = 0; t < n * 8 && made < n; t += 1) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rr(r0 * r0, r1 * r1));
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      const newar = rnd() < newarShare, w = rr(6, 10), dd = rr(6, 9), rad = Math.max(w, dd) / 2;
      if (!houseOK(x, z, rad * 0.95)) continue;
      const ry = (rot != null ? rot : 0) + (rnd() < 0.5 ? 0 : Math.PI / 2);
      houses.push({ x, z, w, d: dd, ry, newar, fl: rnd() < 0.5 ? 3 : 4, y: hgt(x, z) });
      blockRect(x, z, w, dd, ry);
      made += 1;
    }
  }
  (function ring(cx, cz, r, n) {
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (roadInfo(x, z).d < 6 || blocked(x, z, 3)) continue;
      const w = rr(8, 10), ry = Math.atan2(cx - x, cz - z);
      houses.push({ x, z, w, d: 9, ry, newar: false, fl: 4, y: hgt(x, z) });
      blockRect(x, z, w, 9, ry);
    }
  })(PL.bo.x, PL.bo.z, PL.bo.r + 6, 44);
  cluster(0, 0, 52, 118, LOWQ ? 190 : 260, 0.62, 0.05);
  cluster(55, 140, 42, 96, LOWQ ? 110 : 150, 0.65, 0.12);
  cluster(360, 90, 40, 92, LOWQ ? 110 : 150, 0.75, -0.08);
  cluster(215, -80, 82, 120, LOWQ ? 50 : 80, 0.15, 0.6);
  cluster(128, -20, 40, 70, 30, 0.3, 0);
  for (let i = 0; i < 26; i += 1) { const s = RS[Math.floor(rr(0, RS.length))]; cluster(s[0] + rr(-25, 25), s[1] + rr(-25, 25), 6, 28, rr(3, 8) | 0, 0.4, null); }
  const nightMats = [];
  (function () {
    const sets = { n3: [], n4: [], m3: [], m4: [] };
    houses.forEach((h) => sets[(h.newar ? "n" : "m") + h.fl].push(h));
    const tint = ["#f0eadf", "#e7d7b5", "#d9e3e6", "#f2d6c9", "#e3e9cf", "#f5e3a6", "#dcd2e8", "#ffffff"];
    const boxG = stage.trackGeometry(new THREE.BoxGeometry(1, 1, 1));
    const tankG = stage.trackGeometry(new THREE.CylinderGeometry(0.6, 0.6, 1.3, 10));
    Object.keys(sets).forEach((k) => {
      const L = sets[k];
      if (!L.length) return;
      const f = FAC[k];
      const mat = M({ map: f.map, emissiveMap: f.emi, emissive: new THREE.Color(1, 0.75, 0.45), emissiveIntensity: 0, roughness: 0.9 });
      nightMats.push(mat);
      const isN = k[0] === "n";
      const walls = new THREE.InstancedMesh(boxG, mat, L.length);
      const roofs = new THREE.InstancedMesh(isN ? PRISM : boxG, isN ? MAT.tiles : MAT.concrete, L.length);
      const tanks = isN ? null : new THREE.InstancedMesh(tankG, MAT.dark, L.length);
      const cc = new THREE.Color();
      L.forEach((h, i) => {
        const H = h.fl * 3;
        _o.position.set(h.x, h.y + H / 2 - 0.2, h.z); _o.rotation.set(0, h.ry, 0); _o.scale.set(h.w, H, h.d); _o.updateMatrix();
        walls.setMatrixAt(i, _o.matrix);
        if (isN) {
          cc.setRGB(0.82 + rnd() * 0.18, 0.82 + rnd() * 0.14, 0.82 + rnd() * 0.12);
          walls.setColorAt(i, cc);
          _o.position.set(h.x, h.y + H - 0.2, h.z); _o.scale.set(h.w + 1.4, Math.min(h.w, h.d) * 0.34, h.d + 1.4); _o.updateMatrix();
          roofs.setMatrixAt(i, _o.matrix);
        } else {
          walls.setColorAt(i, cc.set(tint[(rnd() * tint.length) | 0]));
          _o.position.set(h.x, h.y + H - 0.05, h.z); _o.scale.set(h.w + 0.3, 0.3, h.d + 0.3); _o.updateMatrix();
          roofs.setMatrixAt(i, _o.matrix);
          _o.position.set(h.x + Math.cos(h.ry) * h.w * 0.25, h.y + H + 0.6, h.z - Math.sin(h.ry) * h.w * 0.25); _o.scale.set(1, 1, 1); _o.updateMatrix();
          tanks.setMatrixAt(i, _o.matrix);
        }
      });
      [walls, roofs, tanks].forEach((m) => { if (!m) return; m.castShadow = true; m.receiveShadow = true; stage.add(m); });
    });
  })();

  /* ---------- trees ---------- */
  (function () {
    const broad = [], pines = [];
    const NB = LOWQ ? 650 : 900, NP = LOWQ ? 1400 : 2200;
    for (let i = 0; i < 9000 && (broad.length < NB || pines.length < NP); i += 1) {
      const x = rr(-420, 700), z = rr(-420, 420), e = valE(x, z), h = hgt(x, z), dsw = Math.hypot(x - PL.sw.x, z - PL.sw.z);
      if (h < WATER + 0.6 || roadInfo(x, z).d < 4 || blocked(x, z, 2.5)) continue;
      let near = false;
      for (const k in PL) { const q = PL[k]; if (Math.hypot(x - q.x, z - q.z) < q.r + 6) { near = true; break; } }
      if (near) continue;
      if (dsw < 56 && dsw > 24) { if (Math.abs(z - PL.sw.z) < 5 && x > PL.sw.x) continue; broad.push([x, h, z, rr(1.1, 1.7)]); continue; }
      if (e > 0.98 && h < 175) { if (pines.length < NP && fbm(x * 0.02, z * 0.02, 3) > 0.42) pines.push([x, h, z, rr(0.9, 1.8)]); continue; }
      if (e < 0.97 && broad.length < NB) { const rd = riverDist(x, z); if (rd < 26 || hs(Math.floor(x / 15), Math.floor(z / 11)) > 0.82 || rnd() < 0.25) broad.push([x, h, z, rr(0.9, 1.6)]); }
    }
    const trunkG = stage.trackGeometry(new THREE.CylinderGeometry(0.16, 0.24, 1, 6));
    const trunkM = M({ color: "#4a3626", roughness: 1 });
    const canG = stage.trackGeometry(new THREE.IcosahedronGeometry(1, 1));
    const leafM = M({ color: "#ffffff", roughness: 0.95 });
    const t1 = new THREE.InstancedMesh(trunkG, trunkM, broad.length), c1 = new THREE.InstancedMesh(canG, leafM, broad.length);
    const cc = new THREE.Color();
    broad.forEach((t, i) => {
      const s = t[3] * 2.4;
      _o.rotation.set(0, rnd() * 6, 0);
      _o.position.set(t[0], t[1] + s * 0.6, t[2]); _o.scale.set(s * 0.9, s * 1.2, s * 0.9); _o.updateMatrix(); t1.setMatrixAt(i, _o.matrix);
      _o.position.set(t[0], t[1] + s * 1.45, t[2]); _o.scale.set(s * 1.25, s, s * 1.25); _o.updateMatrix(); c1.setMatrixAt(i, _o.matrix);
      c1.setColorAt(i, cc.setHSL(0.24 + rnd() * 0.07, 0.42, 0.16 + rnd() * 0.08, THREE.SRGBColorSpace));
    });
    const coneG = stage.trackGeometry(new THREE.ConeGeometry(1, 1, 8));
    const t2 = new THREE.InstancedMesh(trunkG, trunkM, pines.length), c2 = new THREE.InstancedMesh(coneG, leafM, pines.length), c3 = new THREE.InstancedMesh(coneG, leafM, pines.length);
    pines.forEach((t, i) => {
      const s = t[3] * 2.2;
      _o.rotation.set(0, 0, 0);
      _o.position.set(t[0], t[1] + s * 0.5, t[2]); _o.scale.set(s * 0.8, s, s * 0.8); _o.updateMatrix(); t2.setMatrixAt(i, _o.matrix);
      _o.position.set(t[0], t[1] + s * 1.9, t[2]); _o.scale.set(s * 1.3, s * 2.2, s * 1.3); _o.updateMatrix(); c2.setMatrixAt(i, _o.matrix);
      _o.position.set(t[0], t[1] + s * 3, t[2]); _o.scale.set(s * 0.9, s * 1.7, s * 0.9); _o.updateMatrix(); c3.setMatrixAt(i, _o.matrix);
      cc.setHSL(0.3, 0.35, 0.1 + rnd() * 0.06, THREE.SRGBColorSpace);
      c2.setColorAt(i, cc); c3.setColorAt(i, cc);
    });
    [t1, c1, t2, c2, c3].forEach((m) => { m.castShadow = true; m.receiveShadow = true; stage.add(m); });
  })();

  /* ---------- instanced details ---------- */
  (function () {
    const im = new THREE.InstancedMesh(stage.trackGeometry(new THREE.BoxGeometry(0.14, 1.7, 0.14)), MAT.wood, STRUTS.length);
    STRUTS.forEach((s, i) => { _o.position.set(s[0], s[1], s[2]); _o.rotation.set(0.62, s[3], 0, "YXZ"); _o.scale.set(1, 1, 1); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); });
    im.castShadow = true;
    stage.add(im);
  })();
  const flagIM = (function () {
    const g = new THREE.PlaneGeometry(0.44, 0.54);
    g.translate(0, -0.27, 0);
    const im = new THREE.InstancedMesh(stage.trackGeometry(g), M({ side: THREE.DoubleSide, roughness: 0.9 }), FLAGS.length);
    const cs = ["#2f62c8", "#f4f1ea", "#c8382a", "#2e8e4a", "#e8b82a"].map(col);
    FLAGS.forEach((f, i) => { im.setColorAt(i, cs[f.c]); _o.position.set(f.x, f.y, f.z); _o.rotation.set(0, f.yaw, 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); });
    im.castShadow = true;
    stage.add(im);
    return im;
  })();
  const lampIM = (function () {
    const im = new THREE.InstancedMesh(stage.trackGeometry(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 8)), track(new THREE.MeshBasicMaterial({ color: 0xffb24a })), LAMPS.length);
    LAMPS.forEach((l, i) => { _o.position.set(l[0], l[1], l[2]); _o.rotation.set(0, 0, 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); });
    im.visible = false;
    stage.add(im);
    return im;
  })();
  const wheelIM = (function () {
    const im = new THREE.InstancedMesh(stage.trackGeometry(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 10)), MAT.copper, WHEELS.length);
    WHEELS.forEach((w, i) => { _o.position.set(w[0], w[1], w[2]); _o.rotation.set(0, 0, 0); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); });
    im.castShadow = true;
    stage.add(im);
    const fr = new THREE.InstancedMesh(stage.trackGeometry(new THREE.BoxGeometry(0.7, 0.12, 0.4)), MAT.red, WHEELS.length * 2);
    WHEELS.forEach((w, i) => { [0.38, -0.38].forEach((dy, j) => { _o.position.set(w[0], w[1] + dy, w[2]); _o.rotation.set(0, -w[3], 0); _o.updateMatrix(); fr.setMatrixAt(i * 2 + j, _o.matrix); }); });
    stage.add(fr);
    return im;
  })();
  const clouds = [];
  (function () {
    const m = track(new THREE.SpriteMaterial({ map: TX.cloud, transparent: true, depthWrite: false, opacity: 0.55 }));
    for (let i = 0; i < 12; i += 1) {
      const s = new THREE.Sprite(m);
      const a = rr(0, Math.PI * 2), d = rr(300, 700);
      s.position.set(VAL.cx + Math.cos(a) * d, rr(330, 460), VAL.cz + Math.sin(a) * d * 0.7 + 60);
      const sc = rr(160, 300);
      s.scale.set(sc, sc * 0.5, 1);
      stage.add(s);
      clouds.push(s);
    }
  })();

  /* ---------- people: ten blocky designs ---------- */
  const D = Object.fromEntries(DESIGNS.map((d, i) => [d.id, i]));
  const NPC = [];
  const pick = (ids) => D[ids[(rnd() * ids.length) | 0]];
  const addNpc = (o) => NPC.push(Object.assign({ ph: rnd() * 6, sp: rr(0.9, 1.4), y: 0, yaw: rnd() * Math.PI * 2, swing: 0 }, o));
  const boudhaMix = ["monk", "monk", "tibetan-woman", "tibetan-woman", "trekker", "elder", "newar-woman", "schoolgirl"];
  for (let i = 0; i < (LOWQ ? 30 : 46); i += 1) addNpc({ kind: "kora", cx: PL.bo.x, cz: PL.bo.z, r: rr(32.4, 37), a: rnd() * 6.28, design: pick(boudhaMix) });
  for (let i = 0; i < 14; i += 1) addNpc({ kind: "kora", cx: PL.sw.x, cz: PL.sw.z, r: rr(12.4, 14.2), a: rnd() * 6.28, design: pick(["monk", "tibetan-woman", "trekker", "elder"]) });
  const squares = [
    [0, 0, 40, 26, ["daura-man", "newar-woman", "schoolgirl", "porter", "trekker", "elder", "momo-vendor"]],
    [55, 140, 34, 18, ["newar-woman", "daura-man", "schoolgirl", "porter", "trekker", "elder"]],
    [360, 90, 32, 18, ["newar-woman", "porter", "elder", "daura-man", "schoolgirl", "trekker"]],
    [166, -20, 8, 10, ["sadhu", "sadhu", "sadhu", "elder", "newar-woman", "daura-man"]],
    [215, -80, 55, 10, ["monk", "tibetan-woman", "trekker", "schoolgirl"]],
    [520, -40, 9, 5, ["trekker", "trekker", "daura-man"]],
  ];
  squares.forEach(([cx, cz, R, n, mix]) => {
    for (let i = 0; i < n; i += 1) {
      const a = rnd() * 6.28, d = rr(Math.min(5, R * 0.5), R);
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (blocked(x, z, 0.6)) continue;
      // about a third stand still, facing every direction; the rest stroll
      const idle = rnd() < 0.35;
      addNpc({ kind: idle ? "idle" : "wander", cx, cz, R, x, z, tx: 0, tz: 0, wait: rr(0, 4), design: pick(mix) });
    }
  });
  // people at the stalls
  addNpc({ kind: "idle", x: 22, z: 28.6, yaw: 0.0, design: D["momo-vendor"] });
  addNpc({ kind: "idle", x: 342.5, z: 106.3, yaw: 0.3, design: D["momo-vendor"] });
  // porters and walkers on the roads, heading both ways
  ROADPTS.forEach((pts, ri) => {
    const n = ri < 6 ? 3 : 1;
    for (let i = 0; i < n; i += 1) addNpc({ kind: "road", pts, t: rnd(), dir: rnd() < 0.5 ? 1 : -1, off: rr(-1.4, 1.4), design: pick(["porter", "porter", "daura-man", "newar-woman", "trekker", "schoolgirl", "elder"]) });
  });
  const figMat = M({ vertexColors: true, roughness: 0.75 });
  const crowd = makeCrowd(figMat, NPC);
  crowd.meshes.forEach((m) => stage.add(m));
  crowd.geometries.forEach((g) => stage.trackGeometry(g));

  // pigeons and monkeys (blocky too)
  const BIRDS = [];
  [[2, 14, 14, 40], [215, -80, 48, 40], [55, 150, 20, 24], [360, 98, 14, 20]].forEach((f) => {
    for (let i = 0; i < f[3]; i += 1) {
      const a = rnd() * 6.28, d = rr(f[0] === 215 ? 40 : 2, f[2] + (f[0] === 215 ? 10 : 0));
      BIRDS.push({ cx: f[0], cz: f[1], R: f[2], x: f[0] + Math.cos(a) * d, z: f[1] + Math.sin(a) * d, y: 0, vy: 0, fly: 0, yaw: rnd() * 6, ph: rnd() * 6 });
    }
  });
  const birdIM = new THREE.InstancedMesh(stage.trackGeometry(new THREE.BoxGeometry(0.22, 0.2, 0.36)), M({ color: "#7d8794", roughness: 0.8 }), BIRDS.length);
  birdIM.castShadow = true;
  stage.add(birdIM);
  const MONK = [];
  for (let i = 0; i < 16; i += 1) { const a = rnd() * 6.28, d = rr(13, 42); MONK.push({ x: PL.sw.x + Math.cos(a) * d, z: PL.sw.z + Math.sin(a) * d, tx: 0, tz: 0, wait: rr(0, 5), yaw: 0, ph: rnd() * 6 }); }
  const monkB = new THREE.InstancedMesh(stage.trackGeometry(new THREE.BoxGeometry(0.5, 0.45, 0.75)), M({ color: "#5e503f", roughness: 0.95 }), MONK.length);
  const monkH = new THREE.InstancedMesh(stage.trackGeometry(new THREE.BoxGeometry(0.32, 0.3, 0.3)), M({ color: "#9a7a62", roughness: 0.9 }), MONK.length);
  monkB.castShadow = true;
  stage.add(monkB, monkH);
  const steam = [];
  steamSources.forEach((src) => {
    const m = track(new THREE.SpriteMaterial({ map: TX.cloud, transparent: true, depthWrite: false, opacity: 0.35 }));
    for (let i = 0; i < 6; i += 1) { const s = new THREE.Sprite(m); s.userData = { src, t: i / 6 }; s.scale.set(1, 0.6, 1); stage.add(s); steam.push(s); }
  });

  /* ---------- the player ---------- */
  const player = makeFigure(PLAYER_DESIGN, figMat);
  player.geometries.forEach((g) => stage.trackGeometry(g));
  stage.add(player.root);
  const st = { x: PL.ds.spawn[0], z: PL.ds.spawn[1], face: Math.PI, walk: 0, speed: 0, ready: false };

  /* ---------- time of day ---------- */
  const K = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
  const KEYS = [
    [-0.25, K(0.006, 0.01, 0.03), K(0.02, 0.03, 0.06), K(0, 0, 0)],
    [-0.03, K(0.06, 0.08, 0.2), K(0.7, 0.34, 0.18), K(1, 0.4, 0.15)],
    [0.1, K(0.18, 0.32, 0.62), K(0.95, 0.62, 0.38), K(1, 0.6, 0.3)],
    [0.32, K(0.13, 0.33, 0.75), K(0.62, 0.75, 0.9), K(1, 0.9, 0.7)],
    [1, K(0.08, 0.26, 0.7), K(0.58, 0.72, 0.9), K(1, 0.95, 0.85)],
  ];
  const samp = (y, i, out) => {
    for (let k = 0; k < KEYS.length - 1; k += 1) {
      if (y <= KEYS[k + 1][0] || k === KEYS.length - 2) {
        const t = Math.min(Math.max((y - KEYS[k][0]) / (KEYS[k + 1][0] - KEYS[k][0]), 0), 1);
        return out.copy(KEYS[k][i]).lerp(KEYS[k + 1][i], t);
      }
    }
    return out;
  };
  const TIMES = [["Morning", 24], ["Midday", 45], ["Golden hour", 79], ["Night", 100]];
  let timeIdx = 0;
  function setTime(v) {
    const t = v / 100, el = Math.sin(t * Math.PI) * 1.15 - 0.12, az = Math.PI * 0.15 + t * Math.PI * 0.95;
    sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el) * 0.7 + 0.3).normalize();
    const y = sunDir.y;
    samp(y, 1, skyU.zen.value); samp(y, 2, skyU.hor.value); samp(y, 3, skyU.glow.value);
    scene.fog.color.copy(skyU.hor.value);
    const day = ss(-0.05, 0.3, y), warm = 1 - ss(0.05, 0.42, y), night = 1 - ss(-0.12, 0.04, y);
    sun.intensity = 2.7 * Math.PI * ss(-0.03, 0.1, y);
    sun.color.setRGB(1, 0.7 + 0.3 * (1 - warm), 0.48 + 0.52 * (1 - warm));
    hemi.intensity = (0.32 + 0.45 * day) * Math.PI;
    hemi.color.copy(skyU.zen.value).lerp(new THREE.Color(1, 1, 1), 0.5);
    renderer.toneMappingExposure = 0.82 + 0.22 * day + 0.3 * night;
    stars.material.opacity = night * 0.9;
    lampIM.visible = night > 0.15 || y < 0.12;
    nightMats.forEach((m) => (m.emissiveIntensity = night * 1.1 + ss(0.1, -0.05, y) * 0.3));
  }
  setTime(TIMES[0][1]);

  /* ---------- on-screen controls (English / Chinese) ---------- */
  const STR = {
    en: {
      valley: "Kathmandu Valley", travel: "Travel", here: "you are here", km: "km", arriving: "Arriving at", learn: "Learn about",
      times: ["Morning", "Midday", "Golden hour", "Night"], langBtn: "中文", langLabel: "Switch to Chinese",
      hintTouch: "Left thumb to walk · drag to look · tap a beacon to read",
      hintDesk: "W A S D to walk · Shift to run · drag to look · E or click a beacon to read", map: "Valley map. Select to travel.",
    },
    zh: {
      valley: "加德满都谷地", travel: "前往", here: "你在这里", km: "公里", arriving: "抵达", learn: "了解",
      times: ["清晨", "正午", "黄昏", "夜晚"], langBtn: "EN", langLabel: "切换到英文",
      hintTouch: "左手拇指行走 · 拖动转换视角 · 点按光柱阅读",
      hintDesk: "W A S D 行走 · Shift 奔跑 · 拖动转换视角 · 按 E 或点击光柱阅读", map: "谷地地图，点击可前往各地。",
    },
  };
  let lang = manager.language === "zh" ? "zh" : "en";
  const tr = () => STR[lang];
  const placeName = (p) => (lang === "zh" ? p.zh : p.n);
  const placeSub = (p) => (lang === "zh" ? p.zh : p.np);
  const objectName = (id) => {
    const o = OBJECT_MAP[id];
    if (!o) return INTERACTIVE_POS[id]?.label || id;
    return o.names[manager.language] || o.names[lang] || o.names.en;
  };

  const worldPanel = document.querySelector('[data-view-panel="world"]') || manager.container;
  const css = document.createElement("style");
  css.id = "ktm-style";
  css.textContent = `
  .ktm-hud{position:absolute;top:calc(var(--ex-topbar-h,76px) + 16px);inset-inline-end:clamp(14px,3vw,44px);display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none;z-index:3}
  .ktm-hud>*{pointer-events:auto}
  .ktm-place{padding:8px 14px;border-radius:14px;background:var(--ex-panel,rgba(8,26,34,.78));border:1px solid var(--ex-border,rgba(232,205,151,.22));text-align:end;backdrop-filter:blur(8px)}
  .ktm-place b{display:block;font-family:var(--ex-serif,Georgia,serif);font-weight:600;font-size:15px;color:var(--ex-ink,#f8f0df)}
  .ktm-place span{font-size:12px;color:var(--ex-muted,#cfc6b3)}
  .ktm-map{display:block;width:176px;height:122px;border-radius:14px;border:1px solid var(--ex-border,rgba(232,205,151,.22));cursor:pointer}
  .ktm-row{display:flex;gap:6px}
  .ktm-btn{height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--ex-border-strong,rgba(232,205,151,.42));background:var(--ex-panel,rgba(8,26,34,.78));color:var(--ex-ink,#f8f0df);font:600 12px var(--ex-sans,system-ui);cursor:pointer;backdrop-filter:blur(8px)}
  .ktm-btn:hover{border-color:var(--ex-gold,#e6bc6a)}
  .ktm-btn--gold{background:var(--ex-gold,#e6bc6a);color:#1d1406;border-color:var(--ex-gold,#e6bc6a)}
  .ktm-menu{width:260px;max-height:min(60vh,420px);overflow:auto;padding:6px;border-radius:16px;background:var(--ex-panel-solid,#0c2530);border:1px solid var(--ex-border,rgba(232,205,151,.22))}
  .ktm-menu button{display:block;width:100%;text-align:start;padding:9px 12px;border:0;border-radius:10px;background:none;color:var(--ex-ink,#f8f0df);font:600 13px var(--ex-sans,system-ui);cursor:pointer}
  .ktm-menu button:hover,.ktm-menu button:focus-visible{background:var(--ex-gold-soft,rgba(230,188,106,.16))}
  .ktm-menu small{display:block;font-weight:400;font-size:11px;color:var(--ex-muted,#cfc6b3)}
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
  @media (max-width:760px){.ktm-hud{top:auto;bottom:74px;inset-inline-end:12px;gap:5px}.ktm-place{display:none}.ktm-map{display:block;width:112px;height:78px}.ktm-prompt{bottom:150px}.ktm-joy{bottom:84px;width:112px;height:112px}}
  `;
  document.head.appendChild(css);
  const hud = document.createElement("div");
  hud.className = "ktm-hud";
  hud.innerHTML = `<div class="ktm-place" aria-live="polite"><b id="ktm-place-en">Kathmandu Valley</b><span id="ktm-place-np">काठमाडौं उपत्यका</span></div>
    <canvas class="ktm-map" id="ktm-map" width="352" height="244" aria-label="Valley map. Select to travel."></canvas>
    <div class="ktm-row"><button type="button" class="ktm-btn" id="ktm-lang">中文</button><button type="button" class="ktm-btn" id="ktm-time">Morning</button><button type="button" class="ktm-btn ktm-btn--gold" id="ktm-travel" aria-expanded="false">Travel</button></div>
    <div class="ktm-menu" id="ktm-menu" hidden></div>`;
  worldPanel.appendChild(hud);
  const prompt = document.createElement("button");
  prompt.type = "button";
  prompt.className = "ktm-prompt";
  prompt.hidden = true;
  worldPanel.appendChild(prompt);
  const arrive = document.createElement("div");
  arrive.className = "ktm-arrive";
  arrive.style.opacity = "0";
  worldPanel.appendChild(arrive);
  const fade = document.createElement("div");
  fade.className = "ktm-fade";
  worldPanel.appendChild(fade);
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const joyEl = document.createElement("div");
  joyEl.className = "ktm-joy";
  joyEl.innerHTML = "<i></i>";
  joyEl.setAttribute("aria-hidden", "true");
  joyEl.hidden = !touch;
  worldPanel.appendChild(joyEl);
  const hintEl = document.querySelector("#world-hint [data-i18n='world.dragHint']");
  const savedHint = hintEl ? hintEl.textContent : null;

  const q = (id) => hud.querySelector("#" + id);
  const menu = q("ktm-menu"), travelBtn = q("ktm-travel"), timeBtn = q("ktm-time");
  function renderMenu() {
    menu.innerHTML = "";
    Object.keys(PL).forEach((k) => {
      const p = PL[k], b = document.createElement("button");
      b.type = "button";
      const d = Math.hypot(st.x - p.x, st.z - p.z);
      b.innerHTML = `<span></span><small></small>`;
      b.firstChild.textContent = placeName(p);
      b.lastChild.textContent = placeSub(p) + " · " + (d < p.r + 10 ? tr().here : "≈ " + (d * 0.035).toFixed(1) + " " + tr().km);
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
  q("ktm-map").addEventListener("click", () => toggleMenu(true));
  timeBtn.addEventListener("click", () => {
    timeIdx = (timeIdx + 1) % TIMES.length;
    timeBtn.textContent = tr().times[timeIdx];
    setTime(TIMES[timeIdx][1]);
  });
  const langBtn = q("ktm-lang");
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
  function applyLanguage() {
    lang = manager.language === "zh" ? "zh" : "en";
    const t = tr();
    langBtn.textContent = t.langBtn;
    langBtn.setAttribute("aria-label", t.langLabel);
    timeBtn.textContent = t.times[timeIdx];
    travelBtn.textContent = t.travel;
    q("ktm-map").setAttribute("aria-label", t.map);
    if (hintEl) hintEl.textContent = touch ? t.hintTouch : t.hintDesk;
    lastPlace = "";
    nearId = "__refresh__";
    if (!menu.hidden) renderMenu();
  }
  const timers = [];
  function lookAtPlace(p) {
    const yaw = Math.atan2(st.x - p.x, st.z - p.z);
    controls.theta = controls.desiredTheta = yaw;
  }
  function travelTo(k) {
    toggleMenu(false);
    if (typeof dismountRide === "function") dismountRide(true);
    const p = PL[k];
    fade.classList.add("on");
    timers.push(window.setTimeout(() => {
      st.x = p.spawn[0];
      st.z = p.spawn[1];
      lookAtPlace(p);
      if (k === "ng") controls.theta = controls.desiredTheta = 0.15;
      st.face = controls.theta + Math.PI;
      const tall = k === "bk" || k === "pa" || k === "pt";
      controls.phi = controls.desiredPhi = k === "ng" ? 1.42 : tall ? 1.38 : 1.18;
      controls.radius = controls.desiredRadius = k === "bo" || k === "ds" ? 16 : 13;
      arrive.innerHTML = "<small></small><strong></strong><span></span>";
      arrive.querySelector("small").textContent = tr().arriving;
      arrive.querySelector("strong").textContent = placeName(p);
      arrive.querySelector("span").textContent = placeSub(p);
      arrive.style.opacity = "1";
      timers.push(window.setTimeout(() => (arrive.style.opacity = "0"), 2200));
      fade.classList.remove("on");
    }, 480));
  }
  prompt.addEventListener("click", () => { if (riding) dismountRide(); else if (nearRide) mountRide(nearRide); else if (nearId) manager.onSelect(nearId); });

  /* minimap */
  const mapC = q("ktm-map"), mg = mapC.getContext("2d");
  const MAP = { x0: -240, x1: 600, z0: -230, z1: 300 };
  const mapBg = document.createElement("canvas");
  mapBg.width = mapC.width; mapBg.height = mapC.height;
  (function () {
    const g = mapBg.getContext("2d"), W = mapBg.width, H = mapBg.height, img = g.createImageData(W, H);
    for (let j = 0; j < H; j += 1) for (let i = 0; i < W; i += 1) {
      const x = MAP.x0 + ((MAP.x1 - MAP.x0) * i) / W, z = MAP.z0 + ((MAP.z1 - MAP.z0) * j) / H, h = hgt(x, z), e = valE(x, z);
      let r, gg, b;
      if (h < WATER + 0.2) { r = 70; gg = 110; b = 140; }
      else if (e > 0.97) { const k = Math.min(1, h / 160); r = 46 + k * 60; gg = 70 + k * 40; b = 44 + k * 40; }
      else { r = 150; gg = 140; b = 95; }
      const o = (j * W + i) * 4;
      img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = "rgba(60,50,40,.7)"; g.lineWidth = 2;
    ROADS.forEach((rd) => { g.beginPath(); rd.p.forEach((p, i) => { const X = ((p[0] - MAP.x0) / (MAP.x1 - MAP.x0)) * W, Y = ((p[1] - MAP.z0) / (MAP.z1 - MAP.z0)) * H; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke(); });
    Object.values(PL).forEach((p) => { const X = ((p.x - MAP.x0) / (MAP.x1 - MAP.x0)) * W, Y = ((p.z - MAP.z0) / (MAP.z1 - MAP.z0)) * H; g.fillStyle = "#fff3dc"; g.beginPath(); g.arc(X, Y, 5, 0, 7); g.fill(); g.strokeStyle = "#5a3b10"; g.lineWidth = 2; g.stroke(); });
  })();
  function drawMap() {
    const W = mapC.width, H = mapC.height;
    mg.drawImage(mapBg, 0, 0);
    Object.values(INTERACTIVE_POS).forEach((m) => {
      const X = ((m.x - MAP.x0) / (MAP.x1 - MAP.x0)) * W, Y = ((m.z - MAP.z0) / (MAP.z1 - MAP.z0)) * H;
      mg.fillStyle = "#e6bc6a"; mg.beginPath(); mg.arc(X, Y, 3, 0, 7); mg.fill();
    });
    RIDES.forEach((r) => {
      if (r === riding) return;
      const p = r.pos();
      drawRideIcon(mg, r.kind, ((p.x - MAP.x0) / (MAP.x1 - MAP.x0)) * W, ((p.z - MAP.z0) / (MAP.z1 - MAP.z0)) * H, r === nearRide);
    });
    const X = ((st.x - MAP.x0) / (MAP.x1 - MAP.x0)) * W, Y = ((st.z - MAP.z0) / (MAP.z1 - MAP.z0)) * H;
    mg.save(); mg.translate(X, Y); mg.rotate(-st.face + Math.PI);
    mg.fillStyle = "#fff"; mg.strokeStyle = "#c8462e"; mg.lineWidth = 3;
    mg.beginPath(); mg.moveTo(0, -11); mg.lineTo(7, 8); mg.lineTo(0, 4); mg.lineTo(-7, 8); mg.closePath(); mg.stroke(); mg.fill();
    mg.restore();
  }

  /* ---------- input ---------- */
  const keys = {};
  const typing = (t) => t && (t.matches?.("input, textarea, select") || t.isContentEditable);
  const worldVisible = () => !worldPanel.classList || worldPanel.classList.contains("is-active") || worldPanel === manager.container;
  const onKeyDown = (e) => {
    if (typing(e.target) || document.querySelector("dialog[open]")) return;
    keys[e.code] = true;
    if (e.code === "KeyE" && nearId && worldVisible()) manager.onSelect(nearId);
    if (e.code === "KeyF" && worldVisible()) { if (riding) dismountRide(); else if (nearRide) mountRide(nearRide); }
  };
  const onKeyUp = (e) => { keys[e.code] = false; };
  const onBlur = () => { Object.keys(keys).forEach((k) => (keys[k] = false)); };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  const joy = { id: null, x: 0, y: 0, dx: 0, dy: 0 };
  const knob = joyEl.querySelector("i");
  const joyDown = (e) => {
    joy.id = e.pointerId;
    const r = joyEl.getBoundingClientRect();
    joy.x = r.left + r.width / 2; joy.y = r.top + r.height / 2;
    joyEl.setPointerCapture(e.pointerId);
    joyMove(e);
    e.preventDefault();
  };
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
  joyEl.addEventListener("pointerdown", joyDown);
  joyEl.addEventListener("pointermove", joyMove);
  joyEl.addEventListener("pointerup", joyUp);
  joyEl.addEventListener("pointercancel", joyUp);

  /* ---------- movement and camera ---------- */
  function groundY(x, z) {
    const h = hgt(x, z), ri = roadInfo(x, z);
    return ri.d < 2.8 ? Math.max(h, ri.y - 0.07) : h;
  }
  function canStand(x, z) {
    if (valE(x, z) > 1.75 || blocked(x, z, 0.45)) return false;
    if (riverDist(x, z) < 14 && hgt(x, z) < WATER + 0.25 && roadInfo(x, z).d > 2.6) return false;
    return true;
  }
  // keep the orbit camera above ground and in front of buildings
  const camDir = new THREE.Vector3();
  controls.updateCamera = function patchedUpdateCamera() {
    saved.updateCamera.call(this);
    const t = this.target;
    camDir.copy(camera.position).sub(t);
    const dist = camDir.length();
    camDir.normalize();
    let allowed = dist;
    for (let s = 1.6; s <= dist; s += 0.5) {
      if (blocked(t.x + camDir.x * s, t.z + camDir.z * s, 0.35)) { allowed = Math.max(1.6, s - 0.7); break; }
    }
    st.camD = st.camD == null ? allowed : st.camD + (allowed - st.camD) * (allowed < st.camD ? 0.5 : 0.08);
    /* Deliberate zoom overrides the building-clearance cap so zoom-in/out
       works everywhere; ordinary follow still avoids clipping. */
    const d = this.zoomOverride ? dist : Math.min(dist, st.camD);
    camera.position.copy(t).addScaledVector(camDir, d);
    const gy = hgt(camera.position.x, camera.position.z) + 0.8;
    if (camera.position.y < gy) camera.position.y = gy;
    camera.lookAt(t);
  };
  let nearId = null;
  let frame = 0;
  let lastPlace = "";
  const nearPlace = () => {
    let best = null, bd = 1e9;
    for (const k in PL) { const p = PL[k], d = Math.hypot(st.x - p.x, st.z - p.z); if (d < p.r + 55 && d < bd) { bd = d; best = p; } }
    return best;
  };

  /* ---------- animals and the rickshaw (fauna.js through a small adapter) ---------- */
  const RIDES = [], DYN = [], INFO = [], extra = [];
  let riding = null, nearRide = null;
  const RIDE_T = { en: { ride: "Ride", off: "Get off", shore: "Find open ground to get off" }, zh: { ride: "乘坐", off: "下来", shore: "找一块空地再下来" } };
  function mountRide(r) { if (riding || !r) return; riding = r; r.mount(); st.rideR = controls.desiredRadius; controls.desiredRadius = r.camDist || 14; nearId = "__refresh__"; }
  function dismountRide(force = false) {
    if (!riding) return;
    let spot = riding.dismount();
    if (!spot && !force) return;
    if (!spot) spot = [st.x, st.z];
    const r = riding; riding = null;
    if (force && r.reset) r.reset();
    st.x = spot[0]; st.z = spot[1];
    controls.desiredRadius = st.rideR || 15;
    if (r.dismounted) r.dismounted();
    nearId = "__refresh__";
  }
  const shimW = {
    st, NPC, RIDES, POS: {},
    addRideable: (r) => {
      RIDES.push(r);
      const c = document.createElement("canvas"); c.width = c.height = 64;
      const g2 = c.getContext("2d"); g2.scale(3.6, 3.6); drawRideIcon(g2, r.kind, 8.9, 8.9);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; stage.trackTexture(t);
      const m = new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }); stage.materials.add(m);
      r.badge = new THREE.Sprite(m); r.badge.renderOrder = 11; stage.add(r.badge);
      return r;
    },
    addBlocker: (b) => { DYN.push(b); return b; },
    addInfoTarget: (id, object, h = 2.6) => {
      if (!infoTex) {
        const c = document.createElement("canvas"); c.width = c.height = 64; const g2 = c.getContext("2d");
        g2.fillStyle = "rgba(8,26,34,.88)"; g2.beginPath(); g2.arc(32, 32, 28, 0, Math.PI * 2); g2.fill();
        g2.lineWidth = 4; g2.strokeStyle = "#f2c76b"; g2.stroke();
        g2.fillStyle = "#f2c76b"; g2.font = "bold 38px Georgia,serif"; g2.textAlign = "center"; g2.textBaseline = "middle"; g2.fillText("i", 32, 34);
        infoTex = new THREE.CanvasTexture(c); infoTex.colorSpace = THREE.SRGBColorSpace; stage.trackTexture(infoTex);
      }
      const m = new THREE.SpriteMaterial({ map: infoTex, depthTest: false, transparent: true });
      stage.materials.add(m);
      const sp = new THREE.Sprite(m); sp.renderOrder = 10; sp.scale.setScalar(0.9);
      stage.add(sp);
      INFO.push({ id, object, h, sprite: sp });
    },
    onUpdate: (fn) => extra.push(fn),
    isRiding: () => riding,
    dismount: () => dismountRide(),
    mount: (r) => mountRide(r),
  };
  let infoTex = null;
  const fauna = createFauna({ W: shimW, stage, kit: { blocked, resolve: (x, z) => [x, z] }, hgt, groundY, canStand });
  {
    const id = (k) => animalId("kathmandu", k);
    const near = (x, z, r = 16) => {
      for (let d = 0; d <= r; d += 2) for (let k = 0; k < 12; k += 1) {
        const px = x + Math.cos(k * 0.52) * d, pz = z + Math.sin(k * 0.52) * d;
        if (canStand(px, pz) && !blocked(px, pz, 1.0)) return [px, pz];
      }
      return [x, z];
    };
    { const [x, z] = near(12, 44); fauna.rideRickshaw({ x, z, yaw: Math.PI, label: { en: "a cycle rickshaw", zh: "人力三轮车" } }); }
    { const [x, z] = near(8, 12); fauna.herd({ id: id("zebu"), kind: "zebu", count: 3, cx: x, cz: z, R: 10, speed: 0.3, opts: (i) => ({ color: ["#e2dccf", "#c8b8a0", "#8a6a4a"][i % 3] }) }); }
    { const [x, z] = near(-6, 22); fauna.herd({ id: id("dog"), kind: "dog", count: 4, cx: x, cz: z, R: 14, speed: 0.9, opts: (i) => ({ color: ["#b08a5a", "#2a2420", "#d8c8a8", "#8a6a48"][i % 4] }) }); }
    { const [x, z] = near(-94, -52); fauna.herd({ id: id("monkey"), kind: "monkey", count: 5, cx: x, cz: z, R: 6, speed: 1.2, wild: true, flee: 3 }); }
    { const [x, z] = near(340, 70); fauna.herd({ id: id("goat"), kind: "goat", count: 5, cx: x, cz: z, R: 8, speed: 0.7, opts: (i) => ({ color: ["#2a2420", "#6b5644", "#d8d0c4"][i % 3] }) }); }
    { const [x, z] = near(330, 120); fauna.herd({ id: id("buffalo"), kind: "buffalo", count: 3, cx: x, cz: z, R: 8, speed: 0.4 }); }
  }
  const _ip = new THREE.Vector3();
  function pushDyn(x, z) {
    for (const r of RIDES) {
      if (r === riding || !r.blockR) continue;
      const p = r.pos(), dx = x - p.x, dz = z - p.z, R = r.blockR + 0.45, d = Math.hypot(dx, dz);
      if (d < R && d > 1e-5) { x = p.x + (dx / d) * R; z = p.z + (dz / d) * R; }
    }
    for (const b of DYN) {
      const p = b.pos(), dx = x - p.x, dz = z - p.z, R = b.r + 0.45, d = Math.hypot(dx, dz);
      if (d < R && d > 1e-5) { x = p.x + (dx / d) * R; z = p.z + (dz / d) * R; }
    }
    return [x, z];
  }

  stage.animate((time, delta) => {
    frame += 1;
    const dt = Math.min(delta || 0.016, 0.05);
    if (!st.ready) {
      st.ready = true;
      applyLanguage();
      lookAtPlace(PL.ds);
      controls.radius = controls.desiredRadius = 15;
      controls.phi = controls.desiredPhi = 1.2;
      controls.autoRotate = false;
      st.face = controls.theta + Math.PI;
    }
    controls.autoRotate = false;
    // ignore orbit fly-to transitions: the camera stays with the walker
    if (controls.transition) {
      const to = controls.transition.to;
      if (to.target && to.target.distanceTo(controls.home.target) < 0.01) {
        controls.desiredRadius = 15;
        controls.desiredPhi = 1.2;
      }
      controls.transition = null;
    }
    let ix = 0, iz = 0, run = false;
    if (keys.KeyW) iz += 1;
    if (keys.KeyS) iz -= 1;
    if (keys.KeyA) ix -= 1;
    if (keys.KeyD) ix += 1;
    run = keys.ShiftLeft || keys.ShiftRight;
    if (joy.id !== null) { ix += joy.dx; iz -= joy.dy; run = run || Math.hypot(joy.dx, joy.dy) > 0.92; }
    const L = Math.hypot(ix, iz);
    let moving = false;
    let rideY;
    if (riding) {
      let mx = 0, mz = 0, n = 0;
      if (L > 0.08 && worldVisible()) {
        n = Math.min(1, L);
        const th = controls.theta, ux = ix / L, uz = iz / L;
        mx = -Math.sin(th) * uz + Math.cos(th) * ux;
        mz = -Math.cos(th) * uz - Math.sin(th) * ux;
      }
      const seat = riding.step(dt, { mx, mz, n, run, reduced: stage.reducedMotion, time });
      st.x = seat.x; st.z = seat.z; st.face = seat.face; st.speed = 0; rideY = seat.y;
    } else if (L > 0.08 && worldVisible()) {
      const n = Math.min(1, L);
      ix /= L; iz /= L;
      const th = controls.theta;
      const fx = -Math.sin(th), fz = -Math.cos(th), rx = Math.cos(th), rz = -Math.sin(th);
      const mx = fx * iz + rx * ix, mz = fz * iz + rz * ix, sp = (run ? 10.5 : 4.6) * n;
      const nx = st.x + mx * sp * dt, nz = st.z + mz * sp * dt;
      if (canStand(nx, nz)) { st.x = nx; st.z = nz; }
      else if (canStand(nx, st.z)) st.x = nx;
      else if (canStand(st.x, nz)) st.z = nz;
      { const [px, pz] = pushDyn(st.x, st.z); if (canStand(px, pz)) { st.x = px; st.z = pz; } }
      let df = Math.atan2(mx, mz) - st.face;
      df = Math.atan2(Math.sin(df), Math.cos(df));
      st.face += df * Math.min(1, dt * 10);
      st.walk += dt * sp * 1.5;
      st.speed = sp;
      moving = true;
    } else st.speed = 0;
    const gy = rideY !== undefined ? rideY : groundY(st.x, st.z);
    player.root.position.set(st.x, gy, st.z);
    player.inner.rotation.y = st.face;
    if (riding) (riding.pose === "straddle" ? player.straddle() : riding.pose === "stand" ? player.pose(0) : player.sit());
    else player.pose(moving ? Math.sin(st.walk) * Math.min(0.75, st.speed * 0.09) : 0);
    extra.forEach((fn) => fn(time, stage.reducedMotion ? 0 : dt, st));
    player.inner.position.y = moving ? Math.abs(Math.cos(st.walk)) * 0.05 : 0;
    controls.target.set(st.x, gy + 1.6, st.z);
    controls.desiredTarget.copy(controls.target);
    sun.position.set(st.x + sunDir.x * 200, gy + sunDir.y * 200, st.z + sunDir.z * 200);
    sun.target.position.set(st.x, gy, st.z);
    sun.target.updateMatrixWorld();

    const reduced = stage.reducedMotion;
    if (!reduced && frame % 2 === 0) {
      for (let i = 0; i < FLAGS.length; i += 1) {
        const f = FLAGS[i];
        if (Math.abs(f.x - st.x) > 140 || Math.abs(f.z - st.z) > 140) continue;
        _o.position.set(f.x, f.y, f.z); _o.rotation.set(Math.sin(time * 3.2 + f.ph) * 0.38, f.yaw, 0); _o.scale.set(1, 1, 1); _o.updateMatrix();
        flagIM.setMatrixAt(i, _o.matrix);
      }
      flagIM.instanceMatrix.needsUpdate = true;
    }
    if (!reduced && Math.hypot(st.x - PL.bo.x, st.z - PL.bo.z) < 120) {
      WHEELS.forEach((w, i) => { _o.position.set(w[0], w[1], w[2]); _o.rotation.set(0, time * 1.6 + i, 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); wheelIM.setMatrixAt(i, _o.matrix); });
      wheelIM.instanceMatrix.needsUpdate = true;
    }
    // people
    NPC.forEach((n) => {
      let mov = true;
      if (n.kind === "kora") {
        if (!reduced) n.a += (dt * n.sp) / n.r;
        n.x = n.cx + Math.cos(n.a) * n.r; n.z = n.cz + Math.sin(n.a) * n.r; n.yaw = -n.a;
      } else if (n.kind === "road") {
        const pts = n.pts, L2 = pts.length - 1;
        if (!reduced) n.t += (n.dir * dt * n.sp * 1.1) / (L2 * 2);
        if (n.t > 1) { n.t = 1; n.dir = -1; } else if (n.t < 0) { n.t = 0; n.dir = 1; }
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
            const a = rnd() * 6.28, r = rr(2, n.R || 4);
            n.tx = n.cx + Math.cos(a) * r; n.tz = n.cz + Math.sin(a) * r; n.wait = rr(1, 6);
          } else if (!reduced) {
            const nx2 = n.x + (dx / d) * dt * n.sp, nz2 = n.z + (dz / d) * dt * n.sp;
            if (blocked(nx2, nz2, 0.4)) { n.tx = 0; n.wait = rr(0.5, 2); }
            else { n.x = nx2; n.z = nz2; n.yaw = Math.atan2(dx, dz); }
          }
        }
      }
      n.y = groundY(n.x, n.z);
      const walkPh = time * 6 * n.sp + n.ph;
      n.swing = mov && !reduced ? Math.sin(walkPh) * 0.55 : 0;
      n.bob = mov && !reduced ? Math.abs(Math.cos(walkPh)) * 0.04 : 0;
    });
    crowd.update();
    BIRDS.forEach((b, i) => {
      const dp = Math.hypot(b.x - st.x, b.z - st.z);
      if (b.fly <= 0 && dp < 5 && st.speed > 0) { b.fly = rr(2.2, 3.6); b.vy = rr(4, 6); b.yaw = rnd() * 6.28; }
      if (b.fly > 0) {
        b.fly -= dt; b.x += Math.sin(b.yaw) * dt * 7; b.z += Math.cos(b.yaw) * dt * 7; b.y += b.vy * dt; b.vy -= dt * 2.4;
        if (b.fly <= 0) { const a = rnd() * 6.28, d = rr(2, b.R); b.x = b.cx + Math.cos(a) * d; b.z = b.cz + Math.sin(a) * d; b.y = 0; }
      }
      const g2 = groundY(b.x, b.z), y = b.fly > 0 ? g2 + Math.max(0.2, b.y) : g2 + 0.12 + Math.max(0, Math.sin(time * 5 + b.ph)) * 0.05;
      _o.position.set(b.x, y, b.z); _o.rotation.set(b.fly > 0 ? 0 : Math.sin(time * 4 + b.ph) * 0.3, b.yaw, 0); _o.scale.set(b.fly > 0 ? 1.8 : 1, 1, 1); _o.updateMatrix();
      birdIM.setMatrixAt(i, _o.matrix);
    });
    birdIM.instanceMatrix.needsUpdate = true;
    MONK.forEach((m, i) => {
      if (m.wait > 0) m.wait -= dt;
      else {
        if (!m.tx) { const a = rnd() * 6.28, d = rr(13, 44); m.tx = PL.sw.x + Math.cos(a) * d; m.tz = PL.sw.z + Math.sin(a) * d; }
        const dx = m.tx - m.x, dz = m.tz - m.z, d = Math.hypot(dx, dz);
        if (d < 0.3) { m.tx = 0; m.wait = rr(2, 8); } else { m.x += (dx / d) * dt * 1.6; m.z += (dz / d) * dt * 1.6; m.yaw = Math.atan2(dx, dz); }
      }
      const y = hgt(m.x, m.z);
      _o.position.set(m.x, y + 0.3 + (m.wait > 0 ? 0 : Math.abs(Math.sin(time * 9 + m.ph)) * 0.06), m.z); _o.rotation.set(0, m.yaw, 0); _o.scale.set(1, 1, 1); _o.updateMatrix();
      monkB.setMatrixAt(i, _o.matrix);
      _o.position.set(m.x + Math.sin(m.yaw) * 0.45, y + 0.6, m.z + Math.cos(m.yaw) * 0.45); _o.updateMatrix();
      monkH.setMatrixAt(i, _o.matrix);
    });
    monkB.instanceMatrix.needsUpdate = monkH.instanceMatrix.needsUpdate = true;
    steam.forEach((s) => {
      s.userData.t += dt * 0.35; if (s.userData.t > 1) s.userData.t -= 1;
      const u = s.userData.t;
      s.position.set(s.userData.src.x + Math.sin(u * 6) * 0.2, s.userData.src.y + u * 2.2, s.userData.src.z);
      const k = 0.6 + u * 1.4; s.scale.set(k, k * 0.7, 1); s.material.opacity = 0.3 * (1 - u);
    });
    TX.water.offset.y -= dt * 0.04;
    clouds.forEach((c, i) => { c.position.x += dt * (1.5 + (i % 3)); });
    // beacons: show labels near the walker, find the nearest one
    let best = null, bd = 10;
    stage.interactives.forEach((entry) => {
      const p = INTERACTIVE_POS[entry.id];
      if (!p) return;
      const d = Math.hypot(p.x - st.x, p.z - st.z);
      entry.label.sprite.visible = d < 90;
      const s = d > 40 ? Math.min(3.2, d / 40) : 1;
      entry.label.sprite.scale.set((entry.label.sprite.scale.x / entry.label.sprite.scale.y) * 0.95 * s, 0.95 * s, 1);
      entry.beacon.group.scale.setScalar(1.6 * Math.max(1, d / 50));
      if (d < bd) { bd = d; best = entry.id; }
    });
    /* animal info badges: follow the animal; nearest one counts as a discovery nearby */
    let bi = 1e9;
    INFO.forEach((t) => {
      t.object.getWorldPosition(_ip);
      const d = Math.hypot(_ip.x - st.x, _ip.z - st.z);
      t.sprite.visible = d < 46;
      t.sprite.position.set(_ip.x, _ip.y + t.h * (t.object.scale.y || 1), _ip.z);
      t.sprite.scale.setScalar(0.9 * Math.max(1, d / 18));
      if (!best && d < 7 && d < bi) { bi = d; best = t.id; }
    });
    RIDES.forEach((r) => {
      const p = r.pos(), d = Math.hypot(p.x - st.x, p.z - st.z);
      r.badge.visible = r !== riding && d < 90;
      r.badge.position.set(p.x, groundY(p.x, p.z) + (r.iconH || 3.6) + Math.sin(time * 2.4) * 0.1, p.z);
      r.badge.scale.setScalar(0.8 + Math.min(2.2, d / 22));
    });
    nearRide = null;
    if (!riding) {
      let rd = 1e9;
      RIDES.forEach((r) => { const p = r.pos(), d = Math.hypot(p.x - st.x, p.z - st.z); if (d < r.radius && d < rd) { rd = d; nearRide = r; } });
      if (nearRide && bi < 1e9 && !stage.interactives.some((e) => e.id === best)) best = null;
    }
    const pk = (riding ? "off" : nearRide ? "ride" + RIDES.indexOf(nearRide) : best || "") + lang;
    if (pk !== st.promptKey || best !== nearId) {
      st.promptKey = pk;
      nearId = best;
      if (riding || nearRide) {
        const R2 = RIDE_T[lang] || RIDE_T.en, r = riding || nearRide;
        prompt.innerHTML = `<span></span><kbd>${touch ? "Tap" : "F"}</kbd>`;
        prompt.firstChild.textContent = (riding ? R2.off + " · " : R2.ride + " ") + (r.label ? r.label[lang] || r.label.en : "");
        prompt.hidden = false;
      } else if (best) {
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
        q("ktm-place-en").textContent = k;
        q("ktm-place-np").textContent = p ? placeSub(p) : lang === "zh" ? "Kathmandu Valley" : "काठमाडौं उपत्यका";
      }
    }
    if (frame % 4 === 0) drawMap();
  });

  /* ---------- clean up when another world loads ---------- */
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
    baseDispose();
  };

  if (typeof window !== "undefined") window.__ktm = { travelTo, st, RIDES, places: PL, ipos: INTERACTIVE_POS, INFO, mount: (r) => mountRide(r), dismount: dismountRide, isRiding: () => riding, setTimeIdx: (i) => { timeIdx = i; timeBtn.textContent = TIMES[i][0]; setTime(TIMES[i][1]); } };
  return { objectId: "kathmandu" };
}
