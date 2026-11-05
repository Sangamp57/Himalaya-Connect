import * as THREE from "three";
import { bird, cloud, mountain, pine, stoneTexture, tree, woodTexture } from "../helpers.js";
import { buildFort, hamletHouse } from "./hunza-builders.js";
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

function bridge(stage, z) {
  const group = new THREE.Group();
  group.position.set(0, 0.4, z);
  const wood = stage.material("#6b4a30", { roughness: 0.9 });
  const dark = stage.material("#3d2c1d", { roughness: 0.92 });
  for (let i = 0; i < 15; i += 1) {
    const x = -7 + i;
    const y = 1.45 + Math.sin((i / 14) * Math.PI) * 0.5;
    group.add(box(stage, 0.9, 0.12, 3.2, wood, x, y, 0));
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i += 1) {
      const x = -7 + i * 2;
      const y = 1.45 + Math.sin((i / 7) * Math.PI) * 0.5;
      group.add(box(stage, 0.12, 1.2, 0.12, dark, x, y + 0.6, side * 1.45));
    }
    group.add(box(stage, 14.4, 0.1, 0.1, dark, 0, 2.3, side * 1.45));
  }
  for (const x of [-7.2, 7.2]) {
    group.add(box(stage, 0.8, 2.4, 3.6, stage.material("#8a8172", { roughness: 1 }), x, 0.9, 0));
  }
  return group;
}

export default function buildSkardu({ scene, stage, manager }) {
  const riverX = 25;
  const riverD = (x) => Math.abs(x - riverX);

  function heightFn(x, z) {
    let h = 3.4 + fbm(x * 0.025, z * 0.025, 4) * 3.0;
    h += 48 * Math.exp(-(((x - 65) ** 2 + (z + 65) ** 2) / (2 * 40 * 40)));
    h += 16 * Math.exp(-(((x - 65) ** 2 + (z - 45) ** 2) / (2 * 38 * 38)));
    const pad = Math.hypot(x, z);
    if (pad < 44) h = lerp(h, 4.2, ss(44, 22, pad));
    const pads = [
      [55, -70, 18, 10, 52],
      [65, 45, 22, 12, 20],
    ];
    for (const [cx, cz, outer, inner, target] of pads) {
      const d = Math.hypot(x - cx, z - cz);
      if (d < outer) h = lerp(h, target, ss(outer, inner, d));
    }
    const d = riverD(x);
    if (d < 20) h = lerp(h, -2.4, 1 - ss(7, 20, d));
    return h;
  }

  function colorFn(x, z, h) {
    const d = riverD(x);
    if (d < 12 && h < 1.0) return new THREE.Color("#2f7f8f");
    if (d < 20 && h < 2.4) return new THREE.Color("#8c806b");
    const n = fbm(x * 0.05, z * 0.05, 3);
    if (h > 28) return new THREE.Color("#6f6659").lerp(new THREE.Color("#8a7b66"), n);
    return new THREE.Color("#b9a47c").lerp(new THREE.Color("#8f8a5c"), n);
  }

  return buildWalkableTown({
    scene,
    stage,
    manager,
    seed: 20261111,
    terrain: { heightFn, colorFn, segments: 170 },
    places: {
      bazaar: {
        n: "Skardu Bazaar",
        zh: "斯卡杜集市",
        sub: "سکردو بازار",
        x: 0,
        z: 0,
        r: 30,
        spawn: [0, 16],
        look: [0, -12],
        pitch: 1.3,
        dist: 14,
      },
      shigar: {
        n: "Shigar Fort",
        zh: "希加尔堡",
        sub: "شگر قلعہ",
        x: -55,
        z: -35,
        r: 28,
        spawn: [-35, -10],
        look: [-55, -35],
        pitch: 1.38,
        dist: 22,
      },
      indus: {
        n: "Indus Bridge",
        zh: "印度河桥",
        sub: "سندھ پل",
        x: 25,
        z: 20,
        r: 26,
        spawn: [6, 20],
        look: [25, 20],
        pitch: 1.34,
        dist: 15,
      },
      katpana: {
        n: "Katpana Desert",
        zh: "卡特帕纳寒漠",
        sub: "کٹپنا صحرا",
        x: 65,
        z: 45,
        r: 30,
        spawn: [54, 36],
        look: [70, 52],
        pitch: 1.36,
        dist: 16,
      },
      kharpocho: {
        n: "Kharpocho Viewpoint",
        zh: "卡尔波乔观景点",
        sub: "کھرپوچو",
        x: 55,
        z: -70,
        r: 26,
        spawn: [56, -58],
        look: [30, -120],
        pitch: 1.36,
        dist: 16,
      },
    },
    startPlace: "bazaar",
    worldName: { en: "Skardu", zh: "斯卡杜", sub: "سکردو" },
    mapBounds: { x0: -120, x1: 120, z0: -120, z1: 120 },
    mapLines: [
      [[25, -120], [25, 120]],
      [[0, 0], [-20, -16], [-35, -10], [-46, -18], [-55, -35]],
      [[0, 0], [6, 20], [25, 20], [42, 20], [54, 36], [65, 45]],
      [[42.5, 20], [50, 0], [54, -26], [56, -58], [55, -70]],
    ],
    mapColor: (x, z) => {
      const d = riverD(x);
      if (d < 12) return [47, 127, 143];
      const h = heightFn(x, z);
      if (h > 34) return [110, 100, 82];
      if (x > 48 && z > 24) return [180, 157, 112];
      return [155, 139, 104];
    },
    waterMask: (x, z, h) => riverD(x) < 12 && h < 1.2,
    fogDensity: 0.0005,
    exposureScale: 0.94,
    build: ({ kit, W, stage, hgt, makePath, addBridge }) => {
      const stoneMap = stage.trackTexture(stoneTexture("#8c8475", "#605b51", [3, 3]));
      const timberMap = stage.trackTexture(woodTexture("#65402a", "#3c2415", [2, 2]));

      // Indus River ribbon.
      const river = [];
      for (let z = -120; z <= 120; z += 4) river.push([riverX, z]);
      kit.ribbon(
        river.map(([x, z]) => new THREE.Vector3(x, 0, z)),
        24,
        () => 0.6,
        stage.material("#2f7f8f", { roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.94 }),
        30
      );

      // Shigar Fort and its village.
      const fort = buildFort(stage, 0, 0, stoneMap, timberMap);
      fort.position.set(-55, hgt(-55, -35), -35);
      fort.rotation.y = 0.55;
      fort.scale.setScalar(0.9);
      stage.add(fort);
      kit.blockRect(-55, -35, 18, 16, 0.55);

      const houses = [
        [-60, -10, 0.9],
        [-50, 8, 0.8],
        [-35, 12, 0.85],
        [12, -8, 0.8],
      ];
      houses.forEach(([x, z, scale]) => {
        const h = hamletHouse(stage, 0, 0, stoneMap, timberMap, scale);
        h.position.set(x, hgt(x, z), z);
        stage.add(h);
      });

      // Bazaar stalls.
      for (let i = 0; i < 5; i += 1) {
        const x = -10 + i * 5;
        const z = 6;
        const base = stage.material("#6a4a31", { roughness: 0.9 });
        stage.add(box(stage, 3.0, 0.8, 1.6, base, x, hgt(x, z) + 0.4, z));
        stage.add(box(stage, 3.2, 0.1, 1.9, stage.material(i % 2 ? "#9c3f36" : "#2d6a58", { roughness: 0.9 }), x, hgt(x, z) + 0.86, z));
        stage.add(box(stage, 0.1, 2.4, 0.1, base, x - 1.2, hgt(x, z) + 1.2, z - 0.6));
        stage.add(box(stage, 0.1, 2.4, 0.1, base, x + 1.2, hgt(x, z) + 1.2, z - 0.6));
        stage.add(box(stage, 3.2, 0.1, 1.8, base, x, hgt(x, z) + 2.4, z));
      }

      // Bridge across the Indus.
      const crossing = bridge(stage, 20);
      crossing.position.x = 25;
      crossing.scale.x = 2.5;
      stage.add(crossing);
      addBridge({ x0: 7.5, x1: 42.5, z: 20, width: 3.2, ya: 2.0, yb: 2.0, sag: 0.2 });

      // Katpana dunes and a small viewpoint.
      const dunes = new THREE.Group();
      dunes.position.set(65, hgt(65, 45), 45);
      for (let i = 0; i < 7; i += 1) {
        const dune = sphere(stage, 2.8 + (i % 3) * 0.5, stage.material("#c4a978", { roughness: 1 }), (i % 3) * 4 - 4, 0.4, Math.floor(i / 3) * 4 - 2, 1);
        dune.scale.set(1.6, 0.4, 1.0);
        dune.rotation.y = i * 0.6;
        dunes.add(dune);
      }
      dunes.add(box(stage, 5.0, 0.5, 3.4, stage.material("#847b6b", { roughness: 1 }), 0, 0.6, 5));
      for (let i = 0; i < 4; i += 1) {
        dunes.add(box(stage, 0.12, 1.0, 0.12, stage.material("#5f3d26", { roughness: 0.9 }), -2.1 + i * 1.4, 1.1, 6.6));
      }
      dunes.add(box(stage, 4.5, 0.1, 0.1, stage.material("#5f3d26", { roughness: 0.9 }), 0, 1.6, 6.6));
      stage.add(dunes);

      // Kharpocho viewpoint deck.
      const kharpocho = new THREE.Group();
      const deckY = hgt(55, -70);
      kharpocho.position.set(55, deckY, -70);
      kharpocho.add(box(stage, 5.4, 0.5, 4.0, stage.material("#847b6b", { roughness: 1 }), 0, 0.25, 0));
      for (let i = 0; i < 4; i += 1) {
        kharpocho.add(box(stage, 0.12, 1.0, 0.12, stage.material("#5f3d26", { roughness: 0.9 }), -2.2 + i * 1.5, 1.0, 1.8));
      }
      kharpocho.add(box(stage, 5.0, 0.1, 0.1, stage.material("#5f3d26", { roughness: 0.9 }), 0, 1.5, 1.8));
      stage.add(kharpocho);

      // Paths.
      makePath([[0, 12], [-10, 2], [-28, -10], [-35, -10], [-46, -18], [-55, -35]], 3.2);
      makePath([[0, 12], [6, 20], [7.5, 20]], 3.0);
      makePath([[42.5, 20], [52, 28], [54, 36]], 3.0);
      makePath([[42.5, 20], [50, 0], [54, -26], [56, -58]], 2.8);

      // Poplars, apricots and pines.
      const treeSpots = [
        [-32, 18], [-24, 24], [-16, 16], [-4, 24], [10, 18], [18, 8],
        [-42, 26], [-60, 6], [-30, -24], [44, 8], [50, 16], [58, 28],
      ];
      treeSpots.forEach(([x, z], i) => {
        const t = tree(x, z, 0.8 + (i % 3) * 0.12, "#557550", i % 3 === 0 ? "#e7b4ac" : null);
        t.position.y = hgt(x, z);
        stage.add(t);
      });
      for (let i = 0; i < 8; i += 1) {
        const p = pine(-92 + i * 9, -72 - (i % 2) * 4, 0.8, "#315b4c");
        p.position.y = hgt(-92 + i * 9, -72 - (i % 2) * 4);
        stage.add(p);
      }

      // Karakoram peaks.
      const peaks = [
        [-46, -116, 72, 36, "#4c6070", 0.36],
        [-20, -122, 90, 44, "#465a6b", 0.34],
        [4, -124, 82, 40, "#526777", 0.38],
        [30, -120, 72, 36, "#5a6f7f", 0.4],
        [56, -114, 60, 30, "#617482", 0.44],
        [78, -108, 48, 24, "#6b7d89", 0.48],
      ];
      peaks.forEach(([x, z, h, r, color, snow], i) => {
        const peak = mountain(h, r, color, "#f5f1e6", snow, 7);
        peak.position.set(x, 0, z);
        peak.rotation.y = i * 0.7;
        stage.add(peak);
      });

      const clouds = [];
      for (let i = 0; i < 5; i += 1) {
        const c = cloud(1.7 + (i % 3) * 0.5);
        c.position.set(-60 + i * 28, 22 + (i % 3) * 3, -70 - (i % 2) * 8);
        stage.add(c);
        clouds.push({ mesh: c, speed: 0.17 + i * 0.03 });
      }
      for (let i = 0; i < 6; i += 1) {
        stage.add(bird(-40 + i * 18, 20 + i * 0.8, -20 - i * 4));
      }
      stage.animate((time, delta) => {
        if (stage.reducedMotion) return;
        clouds.forEach((c) => {
          c.mesh.position.x += c.speed * delta;
          if (c.mesh.position.x > 120) c.mesh.position.x = -120;
        });
      });

      W.interactive("pk-shigar", fort, "Shigar Fort", [-40, -16], { radius: 20, labelOffset: 1.8 });
      W.interactive("pk-indus", crossing, "Indus River", [25, 20], { radius: 18, labelOffset: 1.4 });
      W.interactive("pk-katpana", dunes, "Katpana cold desert", [60, 42], { radius: 20, labelOffset: 1.4 });
    },
    people: (W) => {
      const mix = ["hunza-man", "hunza-woman", "elder", "porter", "schoolgirl", "trekker"];
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
      add(0, 16, 12, 14);
      add(-45, -10, 12, 6);
      add(6, 20, 3, 2);
      add(65, 45, 12, 4);
    },
  });
}
