import * as THREE from "three";
import { mountain } from "../helpers.js";
import { buildWalkableTown } from "./walk-town.js";
import { placeShop } from "./shops.js";
import { fbm, ss, lerp } from "./walk-engine.js";
import { SKY_PRESETS, mergeGeometries, tint } from "./yunnan-fx.js";
import { roofGeometry } from "./yunnan-props.js";
import { animalId } from "../../wildlife-data.js";

/* Dunhuang: the oasis town, Crescent Lake in the Mingsha (singing sand) dunes,
   the Mogao cliff with its nine-storey hall, and the night market.
   Ride a Bactrian camel, sled down the dunes, and meet the desert animals. */

function mesh(stage, geometry, material, x = 0, y = 0, z = 0) {
  stage.trackGeometry(geometry);
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}
const box = (stage, w, h, d, material, x, y, z) => mesh(stage, new THREE.BoxGeometry(w, h, d), material, x, y, z);
const cylinder = (stage, rt, rb, h, seg, material, x, y, z) => mesh(stage, new THREE.CylinderGeometry(rt, rb, h, seg), material, x, y, z);

export default function buildDunhuang({ scene, stage, manager }) {
  const LAKE = { x: -45, z: 25, rx: 14, rz: 9, level: 0.8 };
  const lakeD = (x, z) => Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);
  const PAV = { x: -47, z: 39 };

  /* dune field: west and south-west of the oasis, ringing the lake */
  function duneMask(x, z) {
    let m = Math.max(ss(-14, -46, x), ss(58, 88, z) * ss(10, -20, x));
    m *= ss(1.45, 2.5, lakeD(x, z));
    m *= ss(5, 13, Math.hypot(x - PAV.x, z - PAV.z));
    return m;
  }
  function duneH(x, z) {
    const m = duneMask(x, z);
    if (m <= 0) return 0;
    const w = fbm(x * 0.015, z * 0.015, 3);
    const crest = 1 - Math.abs(Math.sin(x * 0.048 + z * 0.072 + w * 3.2));
    const ridge = Math.pow(crest, 1.7);
    const amp = 7 + 17 * fbm(x * 0.011 + 3.1, z * 0.011 - 1.7, 3);
    const massif = 12 * Math.exp(-(((x + 72) ** 2 + (z - 32) ** 2) / (2 * 26 * 26)));
    return m * (amp * (0.32 + 0.68 * ridge) + massif);
  }
  function heightFn(x, z) {
    let h = 4.0 + fbm(x * 0.028, z * 0.028, 4) * 1.6;
    h += duneH(x, z);
    h += 20 * Math.exp(-(((x - 55) ** 2 + (z + 45) ** 2) / (2 * 34 * 34)));
    const pads = [
      [0, 0, 42, 26, 4.3],
      [20, 45, 25, 14, 4.5],
      [55, -45, 20, 12, 9.0],
      [PAV.x, PAV.z, 9, 6, 3.7],
    ];
    for (const [cx, cz, outer, inner, target] of pads) {
      const d = Math.hypot(x - cx, z - cz);
      if (d < outer) h = lerp(h, target, ss(outer, inner, d));
    }
    const d = lakeD(x, z);
    h = lerp(h, 3.6, 1 - ss(1.3, 1.6, d));
    if (d < 1.18) h = lerp(h, -2.0, 1 - ss(0.7, 1.12, d));
    return h;
  }
  const green = (x, z) => Math.max(1 - Math.hypot(x, z + 2) / 46, 1 - Math.hypot(x - 20, z - 45) / 30, 1 - lakeD(x, z) / 1.5);

  function colorFn(x, z, h) {
    const d = lakeD(x, z);
    if (d < 1.0 && h < 1.0) return new THREE.Color("#4d7c74");
    if (d < 1.18 && h < 2.4) return new THREE.Color("#b49a72");
    const g = green(x, z);
    const m = duneMask(x, z);
    const n = fbm(x * 0.05, z * 0.05, 3);
    if (g > 0.42 && m < 0.3) return new THREE.Color("#6f8a4e").lerp(new THREE.Color("#a3aa68"), n).lerp(new THREE.Color("#c8ad80"), Math.max(0, 0.6 - g));
    if (h > 14 && m < 0.2) return new THREE.Color("#a46b45").lerp(new THREE.Color("#c18b5c"), n);
    /* sand: golden on crests, a little redder in the troughs */
    const crest = Math.min(1, Math.max(0, (h - 6) / 18));
    return new THREE.Color("#c99a62").lerp(new THREE.Color("#e3bf86"), crest * 0.7 + n * 0.3).lerp(new THREE.Color("#d8b98e"), Math.max(0, 0.5 - m) * 0.4);
  }

  return buildWalkableTown({
    scene,
    stage,
    manager,
    seed: 20261115,
    terrain: {
      heightFn,
      colorFn,
      segments: 200,
      /* sand ripples: a fine layered texture tinted by the vertex colours */
      material: (M, fx) => (fx ? fx.pbr("earth", { color: "#ffffff", color2: "#ece6dc", color3: "#cfc4b4", layers: 34, seed: 71, bump: 0.6, repeat: [46, 46] }, { vertexColors: true }) : M({ vertexColors: true, roughness: 0.98 })),
    },
    places: {
      oasis: { n: "Dunhuang Oasis", zh: "敦煌绿洲", sub: "敦煌绿洲", x: 0, z: 0, r: 34, spawn: [0, 14], look: [0, -12], pitch: 1.32, dist: 15 },
      crescent: { n: "Crescent Lake", zh: "月牙泉", sub: "月牙泉", x: -45, z: 25, r: 28, spawn: [-32, 14], look: [-52, 34], pitch: 1.34, dist: 16 },
      mogao: { n: "Mogao Caves", zh: "莫高窟", sub: "莫高窟", x: 55, z: -45, r: 30, spawn: [42, -26], look: [56, -40], pitch: 1.3, dist: 18 },
      market: { n: "Night Market", zh: "敦煌夜市", sub: "沙州夜市", x: 20, z: 45, r: 27, spawn: [12, 32], look: [30, 56], pitch: 1.32, dist: 15 },
      dunes: { n: "Camel station · Mingsha dunes", zh: "鸣沙山驼队", sub: "鸣沙山", x: -30, z: 52, r: 22, spawn: [-22, 46], look: [-40, 56], pitch: 1.3, dist: 15 },
    },
    startPlace: "oasis",
    worldName: { en: "Dunhuang", zh: "敦煌", sub: "敦煌" },
    mapBounds: { x0: -100, x1: 100, z0: -100, z1: 100 },
    mapLines: [
      [[0, 0], [-20, 8], [-38, 18], [-45, 25]],
      [[0, 0], [24, -14], [42, -28], [55, -45]],
      [[0, 0], [12, 20], [20, 34], [20, 45]],
      [[-32, 14], [-26, 30], [-22, 46]],
    ],
    mapColor: (x, z) => {
      const d = lakeD(x, z);
      if (d < 1.0) return [47, 143, 163];
      const h = heightFn(x, z);
      if (duneMask(x, z) > 0.4) return h > 14 ? [222, 186, 128] : [205, 166, 112];
      if (h > 14) return [164, 107, 69];
      if (green(x, z) > 0.42) return [111, 138, 78];
      return [193, 161, 115];
    },
    waterMask: (x, z, h) => lakeD(x, z) < 1.0 && h < 1.2,
    fogDensity: 0.0006,
    exposureScale: 0.95,
    walker: { collision: "slide", skyKeys: SKY_PRESETS.desert },
    build: ({ kit, W, stage, hgt, makePath, fx }) => {
      const F = fx;
      const mat = (c, o = {}) => stage.material(c, Object.assign({ roughness: 0.95 }, o));
      const tileMat = F.pbr("tiles", { color: "#5f5a52", color2: "#4a453f", color3: "#2b2724", seed: 72 }, { side: THREE.DoubleSide });
      const redWood = mat("#8a2e22", { roughness: 0.8 });
      const darkWood = mat("#4a2e1c", { roughness: 0.85 });
      const ochre = mat("#c18b5c");
      const adobe = mat("#c9a678");
      const roofEdge = mat("#6f4a32", { roughness: 0.9 });
      const leafMat = mat("#5c7a45", { roughness: 0.9, flatShading: true });
      const poplarMat = mat("#7a9a4f", { roughness: 0.9, flatShading: true });
      const bark = mat("#9a9488", { roughness: 1 });
      function roof(group, w, d, h, y, o = {}) {
        const R = roofGeometry(Object.assign({ w, d, h, oh: 0.9, type: "hip", curve: 1.4, upturn: 0.55, tile: 1 }, o));
        group.add(mesh(stage, R.roof, tileMat, 0, y, o.z || 0));
        if (R.trim) group.add(mesh(stage, R.trim, darkWood, 0, y, o.z || 0));
        if (R.gableWall) group.add(mesh(stage, R.gableWall, redWood, 0, y, o.z || 0));
      }

      /* ---------------- Crescent Lake: water, reeds and the Yueya pavilion */
      const water = F.waterMaterial({ color: "#2f6f72", opacity: 0.9, repeat: [5, 3], flow: [0.004, 0.006], flow2: [-0.005, 0.003] });
      const lake = mesh(stage, new THREE.CircleGeometry(1, 64), water, LAKE.x, LAKE.level, LAKE.z);
      lake.rotation.x = -Math.PI / 2;
      lake.scale.set(LAKE.rx * 1.03, LAKE.rz * 1.03, 1);
      lake.receiveShadow = true;
      lake.castShadow = false;
      stage.add(lake);
      /* reeds along the shore (merged, not solid) */
      {
        const geos = [];
        for (let i = 0; i < 260; i += 1) {
          const a = Math.random() * Math.PI * 2, d = 0.94 + Math.random() * 0.14;
          const x = LAKE.x + Math.cos(a) * LAKE.rx * d, z = LAKE.z + Math.sin(a) * LAKE.rz * d;
          const h = 0.8 + Math.random() * 1.1;
          const g = new THREE.ConeGeometry(0.035, h, 3);
          g.rotateZ((Math.random() - 0.5) * 0.4); g.rotateX((Math.random() - 0.5) * 0.4);
          g.translate(x, Math.max(LAKE.level, hgt(x, z)) + h / 2 - 0.05, z);
          geos.push(tint(g, Math.random() < 0.5 ? "#8a8a4a" : "#6e7a3c", "#4a5a2a", -0.5, 0.5));
        }
        const g = mergeGeometries(geos); geos.forEach((q) => q.dispose());
        const reeds = mesh(stage, g, stage.material("#ffffff", { vertexColors: true, roughness: 0.9 }));
        reeds.userData.noCollide = true;
        stage.add(reeds);
      }
      const crescent = new THREE.Group();
      crescent.position.set(PAV.x, hgt(PAV.x, PAV.z), PAV.z);
      crescent.rotation.y = Math.PI;
      {
        const g = crescent;
        g.add(box(stage, 10, 0.7, 7.5, mat("#a89a86"), 0, 0.35, 0));
        g.add(box(stage, 3.2, 0.35, 1.6, mat("#a89a86"), 0, 0.18, -4.4));
        /* ground floor: red columns and lattice walls */
        for (const [cx, cz] of [[-4, -3], [-1.33, -3], [1.33, -3], [4, -3], [-4, 3], [-1.33, 3], [1.33, 3], [4, 3], [-4, 0], [4, 0]]) g.add(cylinder(stage, 0.2, 0.22, 3.4, 10, redWood, cx, 2.4, cz));
        g.add(box(stage, 7.4, 3.2, 5.2, mat("#d9c6a0"), 0, 2.3, 0.4));
        g.add(box(stage, 1.4, 2.4, 0.12, darkWood, 0, 1.9, -2.24));
        g.add(box(stage, 8.6, 0.35, 6.6, redWood, 0, 4.15, 0));
        roof(g, 8.6, 6.6, 1.3, 4.3, { oh: 1.3, upturn: 0.7 });
        /* upper floor */
        g.add(box(stage, 5.6, 2.4, 4.2, mat("#d9c6a0"), 0, 6.2, 0));
        for (const [cx, cz] of [[-2.8, -2.1], [2.8, -2.1], [-2.8, 2.1], [2.8, 2.1]]) g.add(cylinder(stage, 0.16, 0.16, 2.6, 8, redWood, cx, 6.3, cz));
        g.add(box(stage, 6.4, 0.12, 0.12, redWood, 0, 5.75, -2.6));
        roof(g, 6.2, 4.8, 2.4, 7.5, { type: "xieshan", oh: 1.3, upturn: 0.9, skirt: 0.4 });
        /* name board */
        g.add(box(stage, 2.4, 0.6, 0.08, mat("#2a1a10"), 0, 5.4, -2.62));
        g.add(box(stage, 2.0, 0.36, 0.1, mat("#d7a544", { metalness: 0.3, roughness: 0.5 }), 0, 5.4, -2.64));
      }
      stage.add(crescent);

      /* ---------------- Mogao cliff, cave rows, galleries and the nine-storey hall */
      const cliff = new THREE.Group();
      cliff.position.set(55, hgt(55, -45), -45);
      const rock = mat("#9b6847", { roughness: 1 });
      const dark = mat("#22160f", { roughness: 0.95 });
      cliff.add(box(stage, 40, 22, 12, rock, 0, 10, 0));
      cliff.add(box(stage, 41, 1.6, 13, mat("#b07a52", { roughness: 1 }), 0, 21.2, -0.4));
      for (let k = 0; k < 6; k += 1) cliff.add(box(stage, 6 + (k % 3) * 2, 6 + (k % 2) * 5, 3, rock, -18 + k * 7.4, 3 + (k % 2) * 2.5, 5.2 + (k % 3) * 0.4));
      for (let row = 0; row < 3; row += 1) {
        for (let i = 0; i < 7; i += 1) {
          const x = -17 + i * 5.6;
          if (Math.abs(x) < 6.5) continue;
          const y = 2.6 + row * 5.6;
          cliff.add(box(stage, 2.2, 3.0, 0.5, dark, x, y, 7.1));
          const arch = mesh(stage, new THREE.CircleGeometry(1.1, 14, 0, Math.PI), dark, x, y + 1.5, 7.37);
          cliff.add(arch);
          cliff.add(box(stage, 2.8, 0.2, 0.4, ochre, x, y + 1.85, 7.3));
        }
        /* wooden gallery walk in front of each row */
        if (row > 0) {
          const y = 2.6 + row * 5.6 - 1.7;
          cliff.add(box(stage, 34, 0.18, 1.4, darkWood, 0, y, 7.9));
          for (let i = 0; i < 18; i += 1) cliff.add(box(stage, 0.08, 0.9, 0.08, darkWood, -17 + i * 2, y + 0.5, 8.55));
          cliff.add(box(stage, 34, 0.08, 0.08, darkWood, 0, y + 0.95, 8.55));
        }
      }
      /* nine-storey hall (Building 96): red timber façade with tiered eaves */
      for (let i = 0; i < 9; i += 1) {
        const w = 10 - i * 0.55, d = 4.6 - i * 0.12, y = i * 2.3;
        cliff.add(box(stage, w, 2.3, d, i % 2 ? redWood : mat("#9c3428", { roughness: 0.8 }), 0, y + 1.15, 7.3 + d / 2));
        for (let k = -2; k <= 2; k += 1) cliff.add(box(stage, 0.9, 0.9, 0.06, mat("#e8d6a8"), k * (w / 5.4), y + 1.35, 7.32 + d));
        roof(cliff, w + 0.2, d + 0.6, i === 8 ? 2.0 : 0.75, y + 2.05, { z: 7.2 + d / 2, oh: 1.1, upturn: 0.65, type: i === 8 ? "xieshan" : "hip" });
      }
      cliff.add(box(stage, 2.6, 2.8, 0.2, dark, 0, 1.4, 12.0));
      stage.add(cliff);
      /* stone stelae and the Mogao gate-way on the approach */
      const gate = new THREE.Group();
      gate.position.set(46, hgt(46, -29), -29);
      gate.rotation.y = 0.35;
      for (const sx of [-3, 3]) gate.add(box(stage, 0.8, 4.2, 0.8, redWood, sx, 2.1, 0));
      gate.add(box(stage, 8, 0.6, 0.9, redWood, 0, 4.3, 0));
      roof(gate, 7.6, 1.6, 1.0, 4.6, { oh: 0.8, upturn: 0.8, type: "gable" });
      gate.add(box(stage, 2.6, 0.7, 0.1, mat("#1f3a5a"), 0, 3.6, 0.48));
      stage.add(gate);

      /* ---------------- Night market */
      const market = new THREE.Group();
      market.position.set(20, hgt(20, 45), 45);
      {
        const wood = mat("#6a4a31", { roughness: 0.9 });
        const cloth = mat("#a83e32", { roughness: 0.9 });
        const gold = mat("#d7a544", { metalness: 0.25, roughness: 0.5 });
        market.add(box(stage, 16, 0.25, 8, mat("#b79a6e", { roughness: 1 }), 0, 0.12, 0));
        market.add(box(stage, 9, 5.6, 1.0, adobe, 0, 2.8, -4.4));
        market.add(box(stage, 6, 3.6, 0.3, cloth, 0, 2.4, -3.8));
        roof(market, 9.5, 2.0, 0.9, 5.6, { z: -4.4, type: "gable", oh: 0.6 });
        const lampM = mat("#f0b95d", { emissive: new THREE.Color("#b05d1e"), emissiveIntensity: 0.9 });
        for (let i = 0; i < 4; i += 1) {
          const x = -6 + i * 4;
          market.add(box(stage, 3.0, 1.0, 1.6, wood, x, 0.55, 1.2));
          market.add(box(stage, 3.2, 0.08, 1.8, i % 2 ? cloth : gold, x, 1.08, 1.2));
          for (const px of [-1.3, 1.3]) for (const pz of [0.3, 2.1]) market.add(box(stage, 0.12, 2.6, 0.12, wood, x + px, 1.3, pz));
          market.add(box(stage, 3.4, 0.1, 2.2, i % 2 ? gold : cloth, x, 2.62, 1.2));
          /* goods: apricots, melons, dried fruit */
          for (let k = 0; k < 6; k += 1) market.add(mesh(stage, new THREE.IcosahedronGeometry(0.16, 1), mat(["#e89a3a", "#d7c35a", "#8a3a2a"][i % 3]), x - 1 + (k % 3) * 0.6, 1.25, 0.8 + Math.floor(k / 3) * 0.6));
          const lantern = mesh(stage, new THREE.SphereGeometry(0.28, 12, 8), lampM, x, 2.2, 1.9);
          lantern.scale.y = 1.25;
          market.add(lantern);
        }
        for (let i = 0; i < 5; i += 1) {
          market.add(box(stage, 0.1, 3.4, 0.1, wood, -8 + i * 4, 1.7, 4.0));
          market.add(box(stage, 1.3, 0.55, 0.04, i % 2 ? cloth : gold, -8 + i * 4, 3.0, 4.08));
        }
        /* string of lanterns over the lane */
        for (let i = 0; i < 9; i += 1) {
          const l = mesh(stage, new THREE.SphereGeometry(0.22, 10, 8), lampM, -8 + i * 2, 3.35 - Math.sin((i / 8) * Math.PI) * 0.4, 4.0);
          l.scale.y = 1.3;
          market.add(l);
        }
      }
      stage.add(market);

      /* ---------------- Oasis courtyard houses (adobe, flat roofs, wooden gates) */
      const houses = [[-14, -6, 0.15], [-27, -4, -0.1], [-4, -18, 0.05], [16, 6, -0.2], [28, -3, 0.1], [-12, 25, 0.3]];
      houses.forEach(([hx, hz, ry], i) => {
        const g = new THREE.Group();
        g.position.set(hx, hgt(hx, hz) - 0.1, hz);
        g.rotation.y = ry + (i === 5 ? Math.PI : 0);
        const H = 3.2 + (i % 2) * 0.4;
        g.add(box(stage, 9, H, 3.6, adobe, 0, H / 2, -2.7));
        g.add(box(stage, 9.3, 0.3, 3.9, roofEdge, 0, H + 0.15, -2.7));
        g.add(box(stage, 9.3, 0.5, 0.2, adobe, 0, H + 0.5, -0.85));
        for (const sx of [-4.3, 4.3]) g.add(box(stage, 0.4, 2.4, 5.4, adobe, sx, 1.2, 1.8));
        for (const sx of [-2.85, 2.85]) g.add(box(stage, 3.3, 2.4, 0.4, adobe, sx, 1.2, 4.5));
        g.add(box(stage, 2.6, 0.5, 0.5, roofEdge, 0, 2.65, 4.5));
        g.add(box(stage, 0.9, 2.0, 0.08, darkWood, -0.55, 1.0, 4.62).rotateY(0.6));
        g.add(box(stage, 0.9, 2.0, 0.08, darkWood, 0.55, 1.0, 4.62).rotateY(-0.6));
        g.add(box(stage, 1.0, 1.9, 0.08, mat("#3a2a1c"), 0, 0.95, -0.88));
        for (const wx of [-3, 3]) g.add(box(stage, 1.0, 0.8, 0.08, mat("#2e4a5a", { roughness: 0.4 }), wx, 1.9, -0.88));
        /* grape trellis in the courtyard */
        for (const [tx, tz] of [[-2.6, 0.6], [2.6, 0.6], [-2.6, 3.4], [2.6, 3.4]]) g.add(box(stage, 0.1, 2.6, 0.1, darkWood, tx, 1.3, tz));
        const vine = box(stage, 5.6, 0.25, 3.2, leafMat, 0, 2.7, 2);
        vine.userData.noCollide = true;
        g.add(vine);
        stage.add(g);
      });

      /* ---------------- Paths */
      makePath([[0, 14], [-14, 10], [-30, 12], [-32, 14]], 3.0);
      makePath([[0, 0], [20, -10], [34, -20], [44, -28]], 3.0);
      makePath([[0, 0], [8, 18], [12, 32]], 3.0);
      makePath([[-32, 14], [-28, 30], [-22, 46]], 2.6);

      /* ---------------- Poplars along the paths and round the oasis, a few elms */
      const poplar = (x, z, s) => {
        const g = new THREE.Group();
        g.position.set(x, hgt(x, z), z);
        g.add(cylinder(stage, 0.12 * s, 0.2 * s, 2.6 * s, 7, bark, 0, 1.3 * s, 0));
        const c = mesh(stage, new THREE.IcosahedronGeometry(1, 1), poplarMat, 0, 4.4 * s, 0);
        c.scale.set(0.78 * s, 2.9 * s, 0.78 * s);
        c.rotation.y = Math.random() * 3;
        g.add(c);
        stage.add(g);
      };
      const spots = [];
      for (let i = 0; i < 8; i += 1) spots.push([-4 - i * 3.4, 15.8 + Math.sin(i) * 0.4]);
      for (let i = 0; i < 6; i += 1) spots.push([6 + i * 4.6, -5.2 - i * 3.1]);
      for (let i = 0; i < 5; i += 1) spots.push([-1.6 + i * 2.6, 6 + i * 5.2]);
      for (let i = 0; i < 12; i += 1) { const a = i * 0.52 + 0.2; spots.push([Math.cos(a) * 38, Math.sin(a) * 34 - 2]); }
      spots.forEach(([x, z], i) => {
        if (lakeD(x, z) < 1.3 || duneMask(x, z) > 0.3) return;
        if (Math.abs(x - 20) < 10 && Math.abs(z - 45) < 6) return;
        poplar(x, z, 0.85 + (i % 3) * 0.12);
      });

      /* ---------------- Distant mountains (Sanwei Shan) */
      [[-56, -96, 30, 26, "#8a5a45"], [-18, -98, 40, 30, "#7a4c3d"], [22, -97, 34, 28, "#8f5d47"], [62, -94, 28, 24, "#9a6850"]].forEach(([x, z, h, r, color], i) => {
        const peak = mountain(h, r, color, "#f5e6d2", 0, 7);
        peak.position.set(x, 0, z - 30);
        peak.rotation.y = i * 0.6;
        peak.userData.noCollide = true;
        stage.add(peak);
      });

      /* ---------------- Camel station and sled rack below the dunes */
      const station = new THREE.Group();
      station.position.set(-30, hgt(-30, 50), 50);
      station.add(box(stage, 0.25, 2.4, 0.25, darkWood, -2, 1.2, 0));
      station.add(box(stage, 0.25, 2.4, 0.25, darkWood, 2, 1.2, 0));
      station.add(box(stage, 4.6, 0.2, 0.2, darkWood, 0, 2.2, 0));
      station.add(box(stage, 3.8, 1.0, 0.08, mat("#2a1a10"), 0, 1.6, 0.14));
      station.add(box(stage, 3.4, 0.6, 0.1, mat("#d7a544", { metalness: 0.3, roughness: 0.5 }), 0, 1.6, 0.17));
      for (let k = 0; k < 4; k += 1) {
        const sled = box(stage, 0.8, 0.12, 1.8, mat("#8a5a32"), 3.4 + k * 0.95, 0.8, 0.6);
        sled.rotation.x = -1.1;
        station.add(sled);
      }
      station.add(box(stage, 3.6, 0.06, 2.2, mat("#a83e32"), -4, 0.04, 2.2));
      /* the flags at the top of the dunes */
      stage.add(station);

      /* ---------------- Discoveries */
      placeShop({ W, kit, stage, hgt }, { x: 2, z: 48, ry: 2.0, goods: "paintings", sign: "飞天 · FEITIAN ART", id: "cn-feitian", label: "Feitian mural art shop", seller: "elder" });
      W.interactive("cn-crescent", crescent, "Crescent Lake", [-36, 36], { radius: 18, labelOffset: 1.4 });
      W.interactive("cn-mogao", cliff, "Mogao Caves", [44, -31], { radius: 20, labelOffset: 1.7 });
      W.interactive("cn-silkroad", market, "Dunhuang night market", [20, 40], { radius: 17, labelOffset: 1.4 });
      W.interactive("cn-mingsha", station, "Mingsha singing sands", [-26, 47], { radius: 14, labelOffset: 1.2 });

      return {};
    },
    upgrade: {
      grass: { density: (x, z) => Math.max(0, Math.min(1, (green(x, z) - 0.35) * 2.2)) * (lakeD(x, z) > 1.05 ? 1 : 0), colors: ["#4a5a2a", "#a3a45e"], count: 2200 },
      clouds: { coverage: 0.66, scale: 1.2, speed: 0.004 },
      post: { grade: { tint: "#fff3e2", contrast: 1.07, saturation: 1.05, vignette: 0.28 } },
      animals: (fa, { W, hgt }) => {
        const id = (k) => animalId("dunhuang", k);
        /* camel caravan resting by the station, plus a saddled camel to ride */
        fa.herd({ id: id("camel"), kind: "camel", count: 4, cx: -38, cz: 56, R: 8, speed: 0.7, scale: [0.95, 1.05] });
        fa.rideAnimal({ kind: "camel", x: -24, z: 50, yaw: -0.6, label: { en: "a Bactrian camel", zh: "骆驼" }, id: id("camel") });
        /* sand sled: waits at the rack and starts from the highest crest nearby */
        let best = [-60, 40], bh = -1;
        for (let x = -96; x <= -40; x += 4) for (let z = 20; z <= 90; z += 4) {
          const h = hgt(x, z);
          if (h > bh) { bh = h; best = [x, z]; }
        }
        /* face the steepest way down */
        let yaw = 0, drop = -1;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
          const d = bh - hgt(best[0] + Math.sin(a) * 12, best[1] + Math.cos(a) * 12);
          if (d > drop) { drop = d; yaw = a; }
        }
        const sled = fa.rideSled({ x: best[0], z: best[1], yaw, label: { en: "a sand sled (from the top of the dune)", zh: "滑沙（从沙丘顶出发）" }, id: "cn-mingsha" });
        sled.x = -25.5; sled.z = 53; sled.yaw = 1.2;
        /* donkeys by the market, sheep at the oasis edge, wild gazelles in the open desert */
        fa.herd({ id: id("donkey"), kind: "donkey", count: 3, cx: 30, cz: 56, R: 6, speed: 0.8 });
        fa.herd({ id: id("sheep"), kind: "sheep", count: 9, cx: 2, cz: -36, R: 10, speed: 0.6, scale: [0.85, 1.05] });
        fa.herd({ id: id("gazelle"), kind: "gazelle", count: 5, cx: 74, cz: 30, R: 16, speed: 1.4, wild: true, flee: 11, tag: 1 });
        fa.soar({ id: id("eagle"), kind: "eagle", count: 2, cx: 50, cz: -40, R: 34, h: 44 });
        /* ring the sled flag at the top so people can find it */
        const flag = new THREE.Group();
        flag.position.set(best[0], bh, best[1]);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 6), stage.material("#5a4028"));
        pole.position.y = 2; flag.add(pole);
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), stage.material("#c0302a", { side: THREE.DoubleSide }));
        cloth.position.set(0.7, 3.5, 0); flag.add(cloth);
        stage.trackGeometry(pole.geometry); stage.trackGeometry(cloth.geometry);
        stage.add(flag);
        W.onUpdate((t) => { if (!stage.reducedMotion) cloth.rotation.y = Math.sin(t * 2.3) * 0.25; });
      },
    },
    people: (W) => {
      const mix = ["trekker", "porter", "elder", "schoolgirl", "hunza-man", "hunza-woman"];
      const add = (cx, cz, radius, count) => {
        for (let i = 0; i < count; i += 1) {
          const a = Math.random() * Math.PI * 2;
          const d = 4 + Math.random() * radius;
          W.addNpc({ kind: Math.random() < 0.4 ? "idle" : "wander", cx, cz, R: radius, x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, tx: 0, tz: 0, wait: Math.random() * 4, design: W.pick(mix) });
        }
      };
      add(0, 4, 18, 10);
      add(-36, 34, 8, 4);
      add(20, 45, 10, 6);
      add(46, -30, 8, 3);
      add(-24, 46, 6, 3);
    },
  });
}
