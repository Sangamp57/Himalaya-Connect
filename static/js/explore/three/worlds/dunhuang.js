import * as THREE from "three";
import { bird, cloud, mountain, pine, tree } from "../helpers.js";
import { buildWalkableTown } from "./walk-town.js";
import { fbm, ss, lerp } from "./walk-engine.js";

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

export default function buildDunhuang({ scene, stage, manager }) {
  const LAKE = { x: -45, z: 25, rx: 14, rz: 9, level: 0.8 };
  const lakeD = (x, z) => Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);

  function heightFn(x, z) {
    let h = 4.0 + fbm(x * 0.028, z * 0.028, 4) * 2.6;
    h += 24 * Math.exp(-(((x + 45) ** 2 + (z - 25) ** 2) / (2 * 30 * 30)));
    h += 20 * Math.exp(-(((x - 55) ** 2 + (z + 45) ** 2) / (2 * 34 * 34)));
    const pads = [
      [0, 0, 42, 24, 4.3],
      [20, 45, 25, 14, 4.5],
      [55, -45, 20, 12, 9.0],
    ];
    for (const [cx, cz, outer, inner, target] of pads) {
      const d = Math.hypot(x - cx, z - cz);
      if (d < outer) h = lerp(h, target, ss(outer, inner, d));
    }
    const d = lakeD(x, z);
    if (d < 1.18) h = lerp(h, -2.0, 1 - ss(0.7, 1.12, d));
    return h;
  }

  function colorFn(x, z, h) {
    const d = lakeD(x, z);
    if (d < 1.0 && h < 1.0) return new THREE.Color("#2f8fa3");
    if (d < 1.16 && h < 2.4) return new THREE.Color("#c8ab7c");
    const green = Math.max(
      1 - Math.hypot(x, z) / 48,
      1 - Math.hypot(x - 20, z - 45) / 32
    );
    if (green > 0.38) return new THREE.Color("#6f8a4e").lerp(new THREE.Color("#93a95e"), fbm(x * 0.06, z * 0.06, 3));
    if (h > 16) return new THREE.Color("#a46b45").lerp(new THREE.Color("#c18b5c"), fbm(x * 0.05, z * 0.05, 3));
    return new THREE.Color("#c1a173").lerp(new THREE.Color("#d6ba8e"), fbm(x * 0.05, z * 0.05, 3));
  }

  return buildWalkableTown({
    scene,
    stage,
    manager,
    seed: 20261115,
    terrain: { heightFn, colorFn, segments: 170 },
    places: {
      oasis: {
        n: "Dunhuang Oasis",
        zh: "敦煌绿洲",
        sub: "敦煌绿洲",
        x: 0,
        z: 0,
        r: 34,
        spawn: [0, 14],
        look: [0, -12],
        pitch: 1.32,
        dist: 15,
      },
      crescent: {
        n: "Crescent Lake",
        zh: "月牙泉",
        sub: "月牙泉",
        x: -45,
        z: 25,
        r: 28,
        spawn: [-32, 14],
        look: [-52, 34],
        pitch: 1.34,
        dist: 16,
      },
      mogao: {
        n: "Mogao Caves",
        zh: "莫高窟",
        sub: "莫高窟",
        x: 55,
        z: -45,
        r: 30,
        spawn: [42, -28],
        look: [68, -58],
        pitch: 1.32,
        dist: 17,
      },
      market: {
        n: "Night Market",
        zh: "敦煌夜市",
        sub: "沙州夜市",
        x: 20,
        z: 45,
        r: 27,
        spawn: [12, 32],
        look: [30, 56],
        pitch: 1.32,
        dist: 15,
      },
    },
    startPlace: "oasis",
    worldName: { en: "Dunhuang", zh: "敦煌", sub: "敦煌" },
    mapBounds: { x0: -100, x1: 100, z0: -100, z1: 100 },
    mapLines: [
      [[0, 0], [-20, 8], [-38, 18], [-45, 25]],
      [[0, 0], [24, -14], [42, -28], [55, -45]],
      [[0, 0], [12, 20], [20, 34], [20, 45]],
    ],
    mapColor: (x, z) => {
      const d = lakeD(x, z);
      if (d < 1.0) return [47, 143, 163];
      const h = heightFn(x, z);
      if (h > 16) return [164, 107, 69];
      if (Math.hypot(x, z) < 46 || Math.hypot(x - 20, z - 45) < 32) return [111, 138, 78];
      return [193, 161, 115];
    },
    waterMask: (x, z, h) => lakeD(x, z) < 1.0 && h < 1.2,
    fogDensity: 0.0005,
    exposureScale: 0.95,
    build: ({ kit, W, stage, hgt, makePath }) => {
      // Crescent Lake.
      const lake = mesh(stage, new THREE.CircleGeometry(1, 48), stage.material("#2f8fa3", { roughness: 0.14, metalness: 0.18, transparent: true, opacity: 0.95 }), LAKE.x, LAKE.level, LAKE.z);
      lake.rotation.x = -Math.PI / 2;
      lake.scale.set(LAKE.rx, LAKE.rz, 1);
      stage.add(lake);
      const shore = mesh(stage, new THREE.TorusGeometry(1, 0.035, 5, 64), stage.material("#d1b484", { roughness: 1 }), LAKE.x, LAKE.level + 0.03, LAKE.z);
      shore.rotation.x = -Math.PI / 2;
      shore.scale.set(LAKE.rx, LAKE.rz, 1);
      stage.add(shore);
      const crescent = new THREE.Group();
      crescent.position.set(LAKE.x, 0, LAKE.z);
      const sandbar = sphere(stage, 2.2, stage.material("#cdb183", { roughness: 1 }), -3, 0.35, 3);
      sandbar.scale.set(1.7, 0.25, 0.8);
      crescent.add(sandbar);
      crescent.add(box(stage, 5.0, 0.45, 3.2, stage.material("#8c806b", { roughness: 1 }), 7, 0.3, -3));
      for (let i = 0; i < 4; i += 1) {
        crescent.add(box(stage, 0.12, 1.0, 0.12, stage.material("#5f3d26", { roughness: 0.9 }), 5.2 + i * 1.2, 1.0, -1.6));
      }
      crescent.add(box(stage, 4.4, 0.1, 0.1, stage.material("#5f3d26", { roughness: 0.9 }), 7, 1.5, -1.6));
      stage.add(crescent);

      // Mogao cliff and cave façades.
      const cliff = new THREE.Group();
      cliff.position.set(55, hgt(55, -45), -45);
      const rock = stage.material("#9b6847", { roughness: 1 });
      const dark = stage.material("#2a1c15", { roughness: 0.95 });
      const ochre = stage.material("#c18b5c", { roughness: 0.96 });
      cliff.add(box(stage, 34, 22, 12, rock, 0, 10, 0));
      cliff.add(box(stage, 35, 1.0, 13, ochre, 0, 21, 0));
      for (let row = 0; row < 3; row += 1) {
        for (let i = 0; i < 5; i += 1) {
          const x = -13 + i * 6.5;
          const y = 3 + row * 5.2;
          const opening = box(stage, 2.6, 3.4, 0.5, dark, x, y, 6.2);
          cliff.add(opening);
          const arch = mesh(stage, new THREE.CircleGeometry(1.3, 14, 0, Math.PI), dark, x, y + 1.7, 6.45);
          cliff.add(arch);
          cliff.add(box(stage, 3.2, 0.2, 0.4, ochre, x, y + 2.0, 6.4));
        }
      }
      cliff.add(box(stage, 4.0, 4.2, 1.2, ochre, 0, 2.1, 6.6));
      cliff.add(box(stage, 2.4, 3.0, 0.4, dark, 0, 1.5, 7.3));
      stage.add(cliff);
      kit.blockRect(55, -45, 34, 14, 0);

      // Night market.
      const market = new THREE.Group();
      market.position.set(20, hgt(20, 45), 45);
      const wood = stage.material("#6a4a31", { roughness: 0.9 });
      const cloth = stage.material("#a83e32", { roughness: 0.9 });
      const gold = stage.material("#d7a544", { metalness: 0.25, roughness: 0.5 });
      market.add(box(stage, 16, 0.25, 8, stage.material("#b79a6e", { roughness: 1 }), 0, 0.12, 0));
      market.add(box(stage, 8, 5.2, 1.0, wood, 0, 2.6, -4.4));
      market.add(box(stage, 6, 4.2, 0.4, cloth, 0, 2.1, -4.9));
      for (let i = 0; i < 4; i += 1) {
        const x = -6 + i * 4;
        market.add(box(stage, 3.0, 1.0, 1.6, wood, x, 0.55, 1.2));
        market.add(box(stage, 3.2, 0.08, 1.8, i % 2 ? cloth : gold, x, 1.08, 1.2));
        market.add(box(stage, 0.12, 2.4, 0.12, wood, x - 1.3, 1.2, 0.3));
        market.add(box(stage, 0.12, 2.4, 0.12, wood, x + 1.3, 1.2, 0.3));
        market.add(box(stage, 3.3, 0.1, 1.9, cloth, x, 2.45, 0.3));
        const lantern = sphere(stage, 0.18, stage.material("#f0b95d", { emissive: new THREE.Color("#b05d1e"), emissiveIntensity: 0.8 }), x, 2.0, 1.4, 0);
        market.add(lantern);
      }
      for (let i = 0; i < 5; i += 1) {
        const post = box(stage, 0.1, 3.2, 0.1, wood, -8 + i * 4, 1.6, 4.0);
        market.add(post);
        market.add(box(stage, 1.6, 0.2, 0.2, wood, -8 + i * 4, 3.2, 4.0));
        const flag = box(stage, 1.3, 0.5, 0.04, i % 2 ? cloth : gold, -8 + i * 4, 2.9, 4.08);
        market.add(flag);
      }
      stage.add(market);

      // Oasis houses.
      const wall = stage.material("#c9a678", { roughness: 0.96 });
      const roof = stage.material("#6f4a32", { roughness: 0.9 });
      for (let i = 0; i < 6; i += 1) {
        const x = -16 + (i % 3) * 15;
        const z = -10 + Math.floor(i / 3) * 13;
        const h = 3.0 + (i % 2) * 0.5;
        stage.add(box(stage, 4.6, h, 3.8, wall, x, hgt(x, z) + h / 2, z));
        stage.add(box(stage, 5.0, 0.25, 4.2, roof, x, hgt(x, z) + h + 0.15, z));
        stage.add(box(stage, 0.9, 1.8, 0.1, stage.material("#3a2a1c", { roughness: 0.9 }), x - 0.7, hgt(x, z) + 0.9, z + 1.95));
      }

      // Dunes around the lake.
      for (let i = 0; i < 10; i += 1) {
        const x = -70 + (i % 5) * 10;
        const z = 6 + Math.floor(i / 5) * 16;
        const dune = sphere(stage, 5.2 + (i % 3), stage.material("#cfb07c", { roughness: 1 }), x, hgt(x, z) + 0.4, z, 1);
        dune.scale.set(1.7, 0.35, 1.0);
        dune.rotation.y = i * 0.7;
        stage.add(dune);
      }

      // Paths.
      makePath([[0, 14], [-14, 10], [-30, 12], [-32, 14]], 3.0);
      makePath([[0, 0], [20, -10], [34, -20], [42, -28]], 3.0);
      makePath([[0, 0], [8, 18], [12, 32]], 3.0);

      // Poplars and pines.
      const treeSpots = [
        [-12, 12], [12, 12], [-24, 18], [24, 20], [-34, 6], [34, -4],
        [10, 28], [-8, 34], [42, -18], [68, -30],
      ];
      treeSpots.forEach(([x, z], i) => {
        const t = i % 3 === 0 ? pine(x, z, 0.8, "#315b4c") : tree(x, z, 0.8 + (i % 2) * 0.1, "#557550", i % 4 === 0 ? "#e7b4ac" : null);
        t.position.y = hgt(x, z);
        stage.add(t);
      });

      // Caravan silhouettes near the dunes.
      for (let i = 0; i < 3; i += 1) {
        const camel = new THREE.Group();
        camel.position.set(-24 + i * 5, hgt(-24 + i * 5, 44), 44 + (i % 2) * 2);
        camel.add(sphere(stage, 0.9, stage.material("#8a6a45", { roughness: 1 }), 0, 1.0, 0));
        camel.add(box(stage, 0.25, 1.4, 0.25, stage.material("#8a6a45", { roughness: 1 }), 0.9, 1.7, 0));
        camel.add(box(stage, 0.8, 0.35, 0.35, stage.material("#8a6a45", { roughness: 1 }), 1.2, 2.4, 0));
        for (let leg = 0; leg < 4; leg += 1) {
          camel.add(box(stage, 0.12, 1.0, 0.12, stage.material("#6f5438", { roughness: 1 }), (leg % 2 ? 0.45 : -0.45), 0.5, leg < 2 ? 0.35 : -0.35));
        }
        stage.add(camel);
      }

      // Distant mountains.
      const peaks = [
        [-56, -82, 30, 28, "#8a5a45", 0],
        [-20, -88, 42, 34, "#7a4c3d", 0],
        [20, -86, 36, 30, "#8f5d47", 0],
        [58, -80, 28, 26, "#9a6850", 0],
      ];
      peaks.forEach(([x, z, h, r, color, snow], i) => {
        const peak = mountain(h, r, color, "#f5e6d2", snow, 7);
        peak.position.set(x, 0, z);
        peak.rotation.y = i * 0.6;
        stage.add(peak);
      });

      const clouds = [];
      for (let i = 0; i < 4; i += 1) {
        const c = cloud(1.5 + (i % 3) * 0.4);
        c.position.set(-40 + i * 24, 22 + (i % 2) * 3, -60 - (i % 2) * 8);
        stage.add(c);
        clouds.push({ mesh: c, speed: 0.14 + i * 0.03 });
      }
      for (let i = 0; i < 5; i += 1) stage.add(bird(-30 + i * 15, 18 + i * 0.7, -24 - i * 4));
      stage.animate((time, delta) => {
        if (stage.reducedMotion) return;
        clouds.forEach((c) => {
          c.mesh.position.x += c.speed * delta;
          if (c.mesh.position.x > 100) c.mesh.position.x = -100;
        });
      });

      W.interactive("cn-crescent", crescent, "Crescent Lake", [-42, 21], { radius: 18, labelOffset: 1.4 });
      W.interactive("cn-mogao", cliff, "Mogao Caves", [50, -38], { radius: 20, labelOffset: 1.7 });
      W.interactive("cn-silkroad", market, "Dunhuang night market", [20, 42], { radius: 17, labelOffset: 1.4 });
    },
    people: (W) => {
      const mix = ["trekker", "porter", "elder", "schoolgirl", "hunza-man", "hunza-woman"];
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
      add(0, 0, 20, 10);
      add(-45, 25, 12, 4);
      add(20, 45, 12, 5);
      add(55, -45, 10, 3);
    },
  });
}
