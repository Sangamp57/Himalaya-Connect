import * as THREE from "three";
import { mountain, pine, tree } from "../helpers.js";
import { buildWalkableTown } from "./walk-town.js";
import { placeShop } from "./shops.js";
import { fbm, ss, lerp } from "./walk-engine.js";
import { SKY_PRESETS, mergeGeometries, tint } from "./yunnan-fx.js";
import { animalId } from "../../wildlife-data.js";

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

function sphere(stage, radius, material, x, y, z, detail = 1) {
  return mesh(stage, new THREE.IcosahedronGeometry(radius, detail), material, x, y, z);
}

function minaret(stage, brickTex) {
  const group = new THREE.Group();
  group.position.set(-10, 0.45, -4);
  const brick = stage.material("#b58a5c", { roughness: 0.96 });
  const dark = stage.material("#5a3c28", { roughness: 0.9 });
  const tile = stage.material("#3f7a76", { roughness: 0.85 });
  const gold = stage.material("#d8a541", { metalness: 0.4, roughness: 0.35 });

  group.add(box(stage, 7.0, 1.4, 7.0, brick, 0, 0.7, 0));
  group.add(cylinder(stage, 2.3, 2.9, 1.2, 18, brick, 0, 1.8, 0));
  /* Emin Minaret: a tapering brick tower, about 44 m in reality, with bands of geometric brickwork */
  const shaft = cylinder(stage, 1.45, 2.15, 12.5, 22, brickTex || brick, 0, 8.7, 0);
  group.add(shaft);
  for (let i = 0; i < 5; i += 1) {
    group.add(cylinder(stage, 1.55 - i * 0.1, 1.55 - i * 0.1, 0.18, 22, dark, 0, 3.6 + i * 2.0, 0));
  }
  group.add(cylinder(stage, 2.0, 2.0, 0.35, 22, tile, 0, 14.9, 0));
  const dome = mesh(stage, new THREE.SphereGeometry(1.8, 16, 10), brick, 0, 15.9, 0);
  dome.scale.y = 0.75;
  group.add(dome);
  group.add(cylinder(stage, 0.18, 0.24, 1.3, 8, gold, 0, 17.2, 0));
  group.add(mesh(stage, new THREE.ConeGeometry(0.22, 0.7, 8), gold, 0, 18.1, 0));

  // Arched niches around the base.
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 2.55;
    const z = Math.sin(a) * 2.55;
    const niche = box(stage, 0.5, 1.1, 0.5, dark, x, 1.9, z);
    niche.rotation.y = -a;
    group.add(niche);
  }

  // Mosque hall and courtyard wall.
  group.add(box(stage, 8.4, 3.0, 5.2, brick, 6.8, 1.9, 1.2));
  const hallDome = mesh(stage, new THREE.SphereGeometry(2.0, 16, 10), tile, 6.8, 4.1, 1.2);
  hallDome.scale.y = 0.72;
  group.add(hallDome);
  group.add(box(stage, 3.0, 2.3, 0.25, dark, 6.8, 1.4, 3.9));
  group.add(box(stage, 1.5, 1.8, 0.2, stage.material("#6b4327", { roughness: 0.9 }), 6.8, 1.1, 4.05));
  return group;
}

function karez(stage) {
  const group = new THREE.Group();
  group.position.set(13, 0.45, 7);
  const earth = stage.material("#9a7a54", { roughness: 1 });
  const stone = stage.material("#7c6a52", { roughness: 1 });
  const water = stage.material("#2f8fa3", { roughness: 0.18, metalness: 0.15, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 4; i += 1) {
    const x = -7 + i * 4.6;
    group.add(cylinder(stage, 1.25, 1.35, 0.7, 14, stone, x, 0.35, 0));
    group.add(cylinder(stage, 0.85, 0.85, 0.15, 14, stage.material("#1f2a2b", { roughness: 0.8 }), x, 0.75, 0));
    group.add(box(stage, 2.8, 0.28, 1.1, earth, x + 2.3, 0.2, 0));
  }
  group.add(box(stage, 21.0, 0.18, 0.75, water, 0, 0.16, 0.2));
  group.add(box(stage, 5.4, 0.35, 3.4, stone, 8.2, 0.2, -3.2));
  group.add(box(stage, 0.1, 2.0, 0.1, stage.material("#4a3424", { roughness: 0.9 }), 10.0, 1.4, -4.2));
  group.add(box(stage, 2.0, 0.7, 0.08, stage.material("#6b4327", { roughness: 0.9 }), 10.0, 2.2, -4.2));
  return group;
}

function vineyard(stage) {
  const group = new THREE.Group();
  group.position.set(-9, 0.45, 11);
  const wood = stage.material("#6b4a30", { roughness: 0.9 });
  const vine = stage.material("#4f7d3d", { roughness: 0.95 });
  const grape = stage.material("#6d3f72", { roughness: 0.7 });
  for (let row = 0; row < 4; row += 1) {
    const z = row * 2.4;
    for (let i = 0; i < 6; i += 1) {
      group.add(box(stage, 0.12, 2.0, 0.12, wood, -5 + i * 2, 1.0, z));
    }
    group.add(box(stage, 10.4, 0.1, 0.1, wood, 0, 2.0, z));
    group.add(box(stage, 10.2, 0.25, 1.1, vine, 0, 2.15, z));
    for (let i = 0; i < 5; i += 1) {
      group.add(sphere(stage, 0.18, grape, -4.2 + i * 2.1, 1.9, z + 0.3));
    }
  }
  group.add(box(stage, 6.4, 0.35, 4.0, stage.material("#7c6a52", { roughness: 1 }), 0, 0.18, 5.4));
  group.add(box(stage, 0.1, 1.8, 0.1, wood, 2.8, 1.2, 5.4));
  group.add(box(stage, 1.8, 0.6, 0.08, stage.material("#6b4327", { roughness: 0.9 }), 2.8, 2.0, 5.4));
  return group;
}

/* The Flaming Mountains: a long red sandstone ridge cut by vertical gullies. */
function flamingMask(x, z) {
  return ss(-78, -98, z + Math.sin(x * 0.03) * 6);
}
function flaming(x, z) {
  const m = flamingMask(x, z);
  if (m <= 0) return 0;
  const w = fbm(x * 0.03, z * 0.03, 3);
  const gully = Math.pow(Math.abs(Math.sin(x * 0.32 + w * 2.6)), 0.6);
  return m * (16 + 14 * fbm(x * 0.012 + 4, z * 0.02, 3)) * (0.72 + 0.28 * gully);
}

export default function buildTurpan({ scene, stage, manager }) {
  const pads = [
    [0, 0, 38],
    [-45, -25, 18],
    [50, 30, 18],
    [-55, 35, 18],
    [70, -50, 30],
  ];

  function heightFn(x, z) {
    let h = 3.0 + fbm(x * 0.025, z * 0.025, 4) * 2.4;
    h += 10 * Math.exp(-(((x - 75) ** 2 + (z + 55) ** 2) / (2 * 34 * 34)));
    h += flaming(x, z);
    h += 6 * Math.exp(-(((x + 45) ** 2 + (z - 25) ** 2) / (2 * 30 * 30)));
    for (const [cx, cz, r] of pads) {
      const d = Math.hypot(x - cx, z - cz);
      if (d < r + 12) h = lerp(h, 4.1, ss(r + 12, r, d));
    }
    return h;
  }

  function colorFn(x, z, h) {
    const n = fbm(x * 0.05, z * 0.05, 3);
    const oasis = Math.max(
      1 - Math.hypot(x - 0, z - 0) / 55,
      1 - Math.hypot(x + 55, z - 35) / 32,
      1 - Math.hypot(x - 50, z - 30) / 32
    );
    if (oasis > 0.35) return new THREE.Color("#6f8a4e").lerp(new THREE.Color("#8fa04a"), n);
    const fm = flamingMask(x, z);
    if (fm > 0.2) return new THREE.Color("#a8442a").lerp(new THREE.Color("#d0703e"), Math.min(1, n * 0.8 + Math.max(0, h - 14) / 30)).lerp(new THREE.Color("#7a3020"), Math.max(0, 0.4 - fm));
    if (h > 8) return new THREE.Color("#9a6a4c").lerp(new THREE.Color("#b9825c"), n);
    return new THREE.Color("#b79a6e").lerp(new THREE.Color("#c9b08a"), n);
  }

  return buildWalkableTown({
    scene,
    stage,
    manager,
    seed: 20261112,
    terrain: {
      heightFn,
      colorFn,
      segments: 200,
      material: (M, fx) => (fx ? fx.pbr("plaster", { color: "#ffffff", color2: "#e6e0d6", color3: "#c8bcaa", stains: 0.4, seed: 81, bump: 1.2, repeat: [40, 40] }, { vertexColors: true }) : M({ vertexColors: true, roughness: 0.98 })),
    },
    places: {
      bazaar: {
        n: "Turpan Bazaar",
        zh: "吐鲁番集市",
        sub: "吐鲁番集市",
        x: 0,
        z: 0,
        r: 32,
        spawn: [0, -14],
        look: [0, 20],
        pitch: 1.3,
        dist: 14,
      },
      emin: {
        n: "Emin Minaret",
        zh: "额敏塔",
        sub: "额敏塔",
        x: -45,
        z: -25,
        r: 26,
        spawn: [-28, -8],
        look: [-45, -25],
        pitch: 1.3,
        dist: 16,
      },
      karez: {
        n: "Karez Wells",
        zh: "坎儿井",
        sub: "坎儿井",
        x: 50,
        z: 30,
        r: 26,
        spawn: [38, 22],
        look: [50, 30],
        pitch: 1.34,
        dist: 15,
      },
      vineyard: {
        n: "Turpan Vineyards",
        zh: "吐鲁番葡萄园",
        sub: "吐鲁番葡萄园",
        x: -55,
        z: 35,
        r: 26,
        spawn: [-42, 28],
        look: [-55, 35],
        pitch: 1.34,
        dist: 15,
      },
      flaming: {
        n: "Flaming Mountains Viewpoint",
        zh: "火焰山观景点",
        sub: "火焰山观景点",
        x: 70,
        z: -55,
        r: 24,
        spawn: [70, -45],
        look: [60, -120],
        pitch: 1.36,
        dist: 16,
      },
    },
    startPlace: "bazaar",
    worldName: { en: "Turpan", zh: "吐鲁番", sub: "吐鲁番" },
    mapBounds: { x0: -120, x1: 120, z0: -120, z1: 120 },
    mapLines: [
      [[0, 0], [-16, -12], [-32, -12], [-45, -25]],
      [[0, 0], [18, 12], [38, 22], [50, 30]],
      [[0, 0], [-18, 14], [-42, 28], [-55, 35]],
      [[0, 0], [20, -14], [48, -30], [64, -42], [70, -45], [70, -65]],
    ],
    mapColor: (x, z) => {
      const h = heightFn(x, z);
      const oasis = Math.max(
        1 - Math.hypot(x, z) / 55,
        1 - Math.hypot(x + 55, z - 35) / 32,
        1 - Math.hypot(x - 50, z - 30) / 32
      );
      if (oasis > 0.35) return [111, 138, 78];
      if (h > 8) return [154, 106, 76];
      return [183, 154, 110];
    },
    fogDensity: 0.0005,
    exposureScale: 0.95,
    walker: { collision: "slide", skyKeys: SKY_PRESETS.desert },
    build: ({ kit, W, stage, hgt, makePath, fx }) => {
      const F = fx;
      const brick = F.pbr("brick", { color: "#c9a072", color2: "#ad8458", color3: "#dccaa6", rows: 16, cols: 6, seed: 82 }, { roughness: 1 });
      brick.map.repeat.set(4, 6); brick.normalMap.repeat.set(4, 6); brick.roughnessMap.repeat.set(4, 6);

      // Emin Minaret and mosque.
      const emin = minaret(stage, brick);
      emin.position.set(-45, hgt(-45, -25), -25);
      emin.rotation.y = 0.4;
      stage.add(emin);
      kit.blockRect(-45, -25, 18, 16, 0.4);

      // Karez wells.
      const wells = karez(stage);
      wells.position.set(50, hgt(50, 30), 30);
      wells.rotation.y = -0.3;
      wells.scale.setScalar(1.1);
      stage.add(wells);
      kit.blockRect(50, 30, 16, 10, -0.3);

      // Vineyards.
      const vines = vineyard(stage);
      vines.position.set(-55, hgt(-55, 35), 35);
      vines.rotation.y = 0.2;
      vines.scale.setScalar(1.1);
      stage.add(vines);

      // Bazaar houses and stalls.
      const wall = stage.material("#c49a6c", { roughness: 0.97 });
      const dark = stage.material("#5a3c28", { roughness: 0.9 });
      for (let i = 0; i < 8; i += 1) {
        const x = i < 6 ? (i % 2 ? 26 : -26) : (i === 6 ? -10 : 10);
        const z = i < 6 ? 8 + Math.floor(i / 2) * 12 : 40;
        const w = 4.4 + (i % 2) * 0.6;
        const h = 3.0 + (i % 2) * 0.4;
        stage.add(box(stage, w, h, 3.8, wall, x, hgt(x, z) + h / 2, z));
        stage.add(box(stage, w + 0.4, 0.25, 4.2, dark, x, hgt(x, z) + h + 0.15, z));
        stage.add(box(stage, 0.9, 1.8, 0.12, dark, x - 0.7, hgt(x, z) + 0.9, z + 1.95));
        const dome = mesh(stage, new THREE.SphereGeometry(1.2, 12, 8), wall, x + 1.1, hgt(x, z) + h + 0.4, z);
        dome.scale.y = 0.55;
        stage.add(dome);
      }
      for (let i = 0; i < 5; i += 1) {
        const x = -8 + i * 4.2;
        const z = 0;
        stage.add(box(stage, 2.4, 0.8, 1.4, stage.material("#6a4a31", { roughness: 0.9 }), x, hgt(x, z) + 0.4, z));
        stage.add(box(stage, 2.6, 0.08, 1.6, stage.material(i % 2 ? "#9c3f36" : "#2d6a58", { roughness: 0.9 }), x, hgt(x, z) + 0.86, z));
        stage.add(box(stage, 0.1, 2.2, 0.1, dark, x - 1.0, hgt(x, z) + 1.1, z - 0.5));
        stage.add(box(stage, 0.1, 2.2, 0.1, dark, x + 1.0, hgt(x, z) + 1.1, z - 0.5));
        stage.add(box(stage, 2.7, 0.1, 1.5, dark, x, hgt(x, z) + 2.2, z));
      }

      makePath([[0, -24], [0, 0], [0, 24], [0, 44]], 4.2);
      makePath([[0, 0], [-16, -12], [-28, -8]], 3.0);
      makePath([[0, 0], [18, 12], [38, 22]], 3.0);
      makePath([[0, 0], [-18, 14], [-42, 28]], 3.0);
      makePath([[0, 0], [20, -14], [48, -30], [64, -42], [70, -50], [70, -62]], 2.8);

      // Flaming Mountains viewpoint.
      const deck = new THREE.Group();
      const dy = hgt(70, -65);
      deck.position.set(70, dy, -65);
      deck.add(box(stage, 5.4, 0.5, 4.0, stage.material("#847b6b", { roughness: 1 }), 0, 0.25, 0));
      for (let i = 0; i < 4; i += 1) {
        deck.add(box(stage, 0.12, 1.0, 0.12, dark, -2.2 + i * 1.5, 1.0, 1.8));
      }
      deck.add(box(stage, 5.0, 0.1, 0.1, dark, 0, 1.5, 1.8));
      stage.add(deck);

      // Poplars.
      const treeSpots = [
        [-20, 22], [-8, 26], [8, 22], [20, 26], [-30, 8], [30, 8],
        [-50, 18], [-62, 28], [40, 20], [56, 18], [66, -40], [84, -48],
      ];
      treeSpots.forEach(([x, z], i) => {
        const t = tree(x, z, 0.8 + (i % 3) * 0.1, "#4f7650", null);
        t.position.y = hgt(x, z);
        t.scale.y = 1.3;
        stage.add(t);
      });
      for (let i = 0; i < 7; i += 1) {
        const p = pine(-88 + i * 10, -72 - (i % 2) * 4, 0.7, "#315b4c");
        p.position.y = hgt(-88 + i * 10, -72 - (i % 2) * 4);
        stage.add(p);
      }



      /* ---------------- Grape drying houses (晾房): ventilated brick lattice rooms on the slope */
      const lattice = (w, h, d) => {
        const geos = [], br = 0.42, bh = 0.2, gap = 0.18;
        const wall = (len, rot, ox, oz) => {
          const rows = Math.floor(h / bh), cols = Math.floor(len / (br + gap));
          for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
            const solid = r % 2 === 0 || r < 2 || r > rows - 3;
            const off = solid ? 0 : (c + (r >> 1)) % 2 ? 0 : 1;
            if (!solid && !off) continue;
            const g = new THREE.BoxGeometry(solid ? br + gap : br, bh * 0.94, 0.36);
            const lx = -len / 2 + (c + 0.5) * (br + gap);
            g.translate(lx, r * bh + bh / 2, 0);
            g.rotateY(rot);
            g.translate(ox, 0, oz);
            geos.push(tint(g, (r + c) % 5 ? "#c4996a" : "#b08458"));
          }
        };
        wall(w, 0, 0, d / 2); wall(w, 0, 0, -d / 2); wall(d, Math.PI / 2, w / 2, 0); wall(d, Math.PI / 2, -w / 2, 0);
        const roof = new THREE.BoxGeometry(w + 0.5, 0.3, d + 0.5); roof.translate(0, h + 0.15, 0);
        geos.push(tint(roof, "#9a7a54"));
        const g = mergeGeometries(geos); geos.forEach((q) => q.dispose());
        return g;
      };
      const dryMat = stage.material("#ffffff", { vertexColors: true, roughness: 0.95 });
      const drying = new THREE.Group();
      drying.position.set(-74, hgt(-74, 52), 52);
      [[0, 0, 0.2], [9, -3, 0.25], [-2, 9, 0.1]].forEach(([dx, dz, ry], i) => {
        const w = 7 + (i % 2), d = 4.6, h = 3.4;
        const m = mesh(stage, lattice(w, h, d), dryMat, dx, hgt(-74 + dx, 52 + dz) - drying.position.y, dz);
        m.rotation.y = ry;
        drying.add(m);
        /* drying racks of grapes inside */
        for (let k = 0; k < 3; k += 1) {
          const rack = box(stage, w - 1, 0.12, 0.2, stage.material("#5a3c28"), dx, m.position.y + 1.2 + k * 0.7, dz);
          rack.rotation.y = ry;
          drying.add(rack);
        }
      });
      stage.add(drying);
      [[0, 0, 0.2, 8, 4.6], [9, -3, 0.25, 7, 4.6], [-2, 9, 0.1, 8, 4.6]].forEach(([dx, dz, ry, w, d]) => kit.blockBox(-74 + dx, 52 + dz, w, d, ry));

      /* ---------------- Grape-trellis lane over the bazaar street (葡萄长廊) */
      {
        const post = stage.material("#5a3c28", { roughness: 0.9 });
        const leaf = stage.material("#5d8a3e", { roughness: 0.9, flatShading: true });
        const grapes = stage.material("#5e2f63", { roughness: 0.5 });
        for (let i = 0; i < 11; i += 1) {
          const z = 6 + i * 3.4;
          for (const x of [-2.9, 2.9]) stage.add(box(stage, 0.16, 3.2, 0.16, post, x, hgt(x, z) + 1.6, z));
          stage.add(box(stage, 6.0, 0.12, 0.12, post, 0, hgt(0, z) + 3.2, z));
          const canopy = box(stage, 6.6, 0.32, 3.2, leaf, 0, hgt(0, z) + 3.4, z);
          canopy.userData.noCollide = true;
          stage.add(canopy);
          for (let k = 0; k < 4; k += 1) {
            const b = mesh(stage, new THREE.IcosahedronGeometry(0.16, 0), grapes, -2.2 + k * 1.5 + (i % 2) * 0.4, hgt(0, z) + 3.0, z + (k % 2 ? 0.6 : -0.5));
            b.scale.y = 1.6;
            b.userData.noCollide = true;
            stage.add(b);
          }
        }
      }

      /* ---------------- Naan bakery with a tonur clay oven */
      const bakery = new THREE.Group();
      bakery.position.set(-12, hgt(-12, -10), -10);
      bakery.add(cylinder(stage, 0.9, 1.15, 1.2, 14, stage.material("#c9a57a"), 0, 0.6, 0));
      bakery.add(cylinder(stage, 0.45, 0.45, 0.06, 14, stage.material("#2a1a10"), 0, 1.22, 0));
      bakery.add(box(stage, 2.2, 0.8, 1.0, stage.material("#6a4a31"), 2.1, 0.4, 0));
      for (let k = 0; k < 5; k += 1) {
        const nan = mesh(stage, new THREE.CylinderGeometry(0.28, 0.28, 0.06, 14), stage.material("#d9a65a"), 1.4 + k * 0.35, 0.84, (k % 2) * 0.2 - 0.1);
        bakery.add(nan);
      }
      stage.add(bakery);
      const smoke = F.particles({ max: 160, color: "#d8d2c8", opacity: 0.35, size: 0.5, type: "steam" });
      let sm = 0;
      W.onUpdate((t, dt) => {
        if (stage.reducedMotion || !smoke || !smoke.emit) return;
        sm += dt;
        if (sm > 0.25) { sm = 0; smoke.emit(-12, bakery.position.y + 1.3, -10, 0, 0.9, 0, 2, 0.3, 4); }
      });

      placeShop({ W, kit, stage, hgt }, { x: -9.5, z: 12, ry: Math.PI / 2, goods: "raisins", sign: "葡萄干 · RAISINS", id: "cn-raisins", label: "Raisin stall", seller: "hunza-man", cloth: "#2d6a58", cloth2: "#e8e0c8" });
      W.interactive("cn-liangfang", drying, "Grape drying houses", [-62, 46], { radius: 16, labelOffset: 1.4 });
      W.interactive("cn-emin", emin, "Emin Minaret", [-36, -14], { radius: 20, labelOffset: 1.8 });
      W.interactive("cn-karez", wells, "Karez wells", [42, 26], { radius: 18, labelOffset: 1.4 });
      W.interactive("cn-grapes", vines, "Turpan vineyards", [-46, 30], { radius: 18, labelOffset: 1.4 });
    },
    upgrade: {
      grass: { density: (x, z) => Math.max(0, Math.min(1, (Math.max(1 - Math.hypot(x, z) / 55, 1 - Math.hypot(x + 55, z - 35) / 32, 1 - Math.hypot(x - 50, z - 30) / 32) - 0.3) * 2.2)) * (Math.abs(x) < 4 && z > -26 && z < 46 ? 0.1 : 1), colors: ["#4a5a2a", "#9aa45a"], count: 2400 },
      clouds: { coverage: 0.72, scale: 1.1, speed: 0.004 },
      post: { grade: { tint: "#fff1de", contrast: 1.07, saturation: 1.06, vignette: 0.28 } },
      animals: (fa) => {
        const id = (k) => animalId("turpan", k);
        fa.rideCart({ x: 3.2, z: -20, yaw: 0, label: { en: "a donkey cart", zh: "毛驴车" }, id: id("donkey") });
        fa.herd({ id: id("donkey"), kind: "donkey", count: 3, cx: -38, cz: 44, R: 6, speed: 0.8 });
        fa.herd({ id: id("camel"), kind: "camel", count: 3, cx: 58, cz: -36, R: 8, speed: 0.6 });
        fa.rideAnimal({ kind: "camel", x: 66, z: -40, yaw: 3.0, label: { en: "a Bactrian camel", zh: "骆驼" }, id: id("camel") });
        fa.herd({ id: id("sheep"), kind: "sheep", count: 9, cx: 64, cz: 48, R: 10, speed: 0.6 });
        fa.herd({ id: id("goat"), kind: "goat", count: 5, cx: -26, cz: -44, R: 8, speed: 0.8 });
        fa.soar({ id: id("eagle"), kind: "eagle", count: 2, cx: 10, cz: -96, R: 40, h: 58 });
      },
    },
    people: (W) => {
      const mix = ["hunza-man", "hunza-woman", "elder", "schoolgirl", "porter", "trekker"];
      const add = (cx, cz, radius, count) => {
        for (let i = 0; i < count; i += 1) {
          const a = Math.random() * Math.PI * 2;
          const d = 4 + Math.random() * radius;
          W.addNpc({
            kind: Math.random() < 0.4 ? "idle" : "wander",
            cx,
            cz,
            R: radius,
            x: cx + Math.cos(a) * d,
            z: cz + Math.sin(a) * d,
            tx: 0,
            tz: 0,
            wait: Math.random() * 4,
            design: W.pick(mix),
          });
        }
      };
      add(0, 16, 18, 14);
      add(-45, -20, 10, 5);
      add(50, 30, 10, 4);
      add(-55, 35, 10, 4);
    },
  });
}
