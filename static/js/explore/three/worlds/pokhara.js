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

function stupa(stage, x, y, z, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  const white = stage.material("#efe9dc", { roughness: 0.9 });
  const gold = stage.material("#d8a541", { metalness: 0.4, roughness: 0.32 });
  group.add(cylinder(stage, 2.8, 3.4, 0.9, 18, white, 0, 0.45, 0));
  const dome = mesh(stage, new THREE.SphereGeometry(2.4, 18, 12), white, 0, 1.65, 0);
  dome.scale.y = 0.72;
  group.add(dome);
  group.add(box(stage, 1.15, 0.9, 1.15, white, 0, 3.1, 0));
  group.add(cylinder(stage, 0.26, 0.34, 2.5, 10, gold, 0, 4.7, 0));
  for (let i = 0; i < 4; i += 1) {
    group.add(cylinder(stage, 0.52 - i * 0.07, 0.52 - i * 0.07, 0.1, 12, gold, 0, 3.8 + i * 0.45, 0));
  }
  group.add(mesh(stage, new THREE.ConeGeometry(0.28, 0.8, 8), gold, 0, 6.3, 0));
  return group;
}

function boat(stage, x, z, color, rot = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0.66, z);
  group.rotation.y = rot;
  const hull = stage.material(color, { roughness: 0.7 });
  group.add(box(stage, 2.6, 0.34, 0.95, hull, 0, 0, 0));
  const bow = mesh(stage, new THREE.ConeGeometry(0.48, 1.0, 4), hull, 1.3, 0, 0);
  bow.rotation.z = -Math.PI / 2;
  group.add(bow);
  group.add(box(stage, 0.9, 0.2, 0.6, stage.material("#d9c7a3", { roughness: 0.8 }), -0.35, 0.25, 0));
  return group;
}

function paraglider(stage) {
  const group = new THREE.Group();
  group.position.set(-8, 17, -7);
  const palette = ["#e05b3a", "#f2c14e", "#2f8fa3", "#e8e2d2"];
  for (let i = 0; i < 5; i += 1) {
    const canopy = box(stage, 1.6, 0.16, 0.95, stage.material(palette[i % palette.length], { roughness: 0.85 }), (i - 2) * 1.45, Math.abs(i - 2) * -0.2, 0);
    canopy.rotation.z = (i - 2) * 0.08;
    group.add(canopy);
  }
  const lineMat = stage.material("#3c3a33", { roughness: 0.8 });
  const pilot = new THREE.Group();
  pilot.position.set(0, -3.1, 0);
  pilot.add(box(stage, 0.35, 0.8, 0.3, stage.material("#5a4a3a", { roughness: 0.9 }), 0, 0, 0));
  pilot.add(sphere(stage, 0.18, stage.material("#b98a63", { roughness: 0.8 }), 0, 0.56, 0));
  group.add(pilot);
  for (let i = 0; i < 4; i += 1) {
    const line = cylinder(stage, 0.02, 0.02, 3.1, 4, lineMat, (i - 1.5) * 0.9, -1.55, 0);
    line.rotation.z = (i - 1.5) * 0.18;
    group.add(line);
  }
  return group;
}

function viewpoint(stage, x, z, rot = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0.3, z);
  group.rotation.y = rot;
  const wood = stage.material("#6a4a31", { roughness: 0.9 });
  const stone = stage.material("#847b6b", { roughness: 1 });
  group.add(box(stage, 6.4, 0.5, 4.2, stone, 0, 0.25, 0));
  for (let i = 0; i < 5; i += 1) {
    group.add(box(stage, 0.12, 1.0, 0.12, wood, -2.6 + i * 1.3, 1.0, 1.9));
  }
  group.add(box(stage, 5.8, 0.1, 0.1, wood, 0, 1.5, 1.9));
  group.add(box(stage, 5.8, 0.1, 0.1, wood, 0, 1.0, 1.9));
  const scope = new THREE.Group();
  scope.position.set(0.8, 1.2, 0.9);
  scope.add(box(stage, 0.14, 1.6, 0.14, wood, 0, 0.8, 0));
  const tube = cylinder(stage, 0.18, 0.22, 0.85, 10, stage.material("#3e4a4e", { metalness: 0.3, roughness: 0.45 }), 0, 1.7, 0.2);
  tube.rotation.x = Math.PI / 2.6;
  scope.add(tube);
  group.add(scope);
  return group;
}

export default function buildPokhara({ scene, stage, manager }) {
  const LAKE = { x: -20, z: 25, rx: 38, rz: 28, level: 0.9 };
  const lakeD = (x, z) => Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);

  function heightFn(x, z) {
    let h = 3.2 + fbm(x * 0.03, z * 0.03, 4) * 2.6;
    h += 54 * Math.exp(-(((x - 82) ** 2 + (z + 48) ** 2) / (2 * 42 * 42)));
    h += 26 * Math.exp(-(((x - 44) ** 2 + (z - 64) ** 2) / (2 * 26 * 26)));
    h += 30 * Math.exp(-(((x + 82) ** 2 + (z + 44) ** 2) / (2 * 34 * 34)));
    const pad = Math.hypot(x - 36, z - 20);
    if (pad < 46) h = lerp(h, 4.1, ss(46, 22, pad));
    const viewPads = [
      [44, 64, 10, 30.5],
      [82, -58, 12, 58.0],
      [-82, -58, 12, 32.0],
    ];
    for (const [cx, cz, r, target] of viewPads) {
      const d = Math.hypot(x - cx, z - cz);
      if (d < r + 8) h = lerp(h, target, ss(r + 8, r, d));
    }
    const d = lakeD(x, z);
    if (d < 1.16) h = lerp(h, -2.6, 1 - ss(0.72, 1.12, d));
    return h;
  }

  function colorFn(x, z, h) {
    const d = lakeD(x, z);
    if (d < 1.0 && h < 1.0) return new THREE.Color("#2f8fa3");
    if (d < 1.12 && h < 2.6) return new THREE.Color("#b9a47c");
    const n = fbm(x * 0.05, z * 0.05, 3);
    if (h > 30) return new THREE.Color("#5d6b58").lerp(new THREE.Color("#7d8a6a"), n);
    return new THREE.Color("#6f8a5a").lerp(new THREE.Color("#8fa04a"), n);
  }

  return buildWalkableTown({
    scene,
    stage,
    manager,
    seed: 20261110,
    terrain: { heightFn, colorFn, segments: 170 },
    places: {
      lakeside: {
        n: "Lakeside",
        zh: "湖畔区",
        sub: "جھیل کنارہ",
        x: 36,
        z: 20,
        r: 34,
        spawn: [34, 28],
        look: [10, 45],
        pitch: 1.3,
        dist: 14,
      },
      phewa: {
        n: "Phewa Lake",
        zh: "费瓦湖",
        sub: "پیوا جھیل",
        x: -20,
        z: 25,
        r: 40,
        spawn: [8, 52],
        look: [-20, 25],
        pitch: 1.32,
        dist: 16,
      },
      sarangkot: {
        n: "Sarangkot",
        zh: "萨朗科特",
        sub: "سرانکوٹ",
        x: 82,
        z: -58,
        r: 26,
        spawn: [82, -54],
        look: [20, -120],
        pitch: 1.36,
        dist: 16,
      },
      peace: {
        n: "World Peace Pagoda",
        zh: "世界和平塔",
        sub: "عالمی امن پگوڈا",
        x: 44,
        z: 64,
        r: 24,
        spawn: [44, 75],
        look: [44, 64],
        pitch: 1.34,
        dist: 18,
      },
      annapurna: {
        n: "Annapurna Viewpoint",
        zh: "安纳普尔纳观景点",
        sub: "اناپورنا نظارہ گاہ",
        x: -82,
        z: -58,
        r: 26,
        spawn: [-82, -54],
        look: [10, -120],
        pitch: 1.36,
        dist: 16,
      },
    },
    startPlace: "lakeside",
    worldName: { en: "Pokhara", zh: "博卡拉", sub: "پوکھرا" },
    mapBounds: { x0: -120, x1: 120, z0: -120, z1: 120 },
    mapLines: [
      [[-120, 25], [-20, 25], [80, 25]],
      [[36, 20], [10, 52], [-40, 66], [-82, 20], [-82, -58]],
      [[36, 20], [56, -8], [70, -36], [82, -58]],
    ],
    mapColor: (x, z) => {
      const d = lakeD(x, z);
      if (d < 1.0) return [47, 143, 163];
      const h = heightFn(x, z);
      if (h > 34) return [104, 112, 92];
      return [111, 138, 90];
    },
    waterMask: (x, z, h) => lakeD(x, z) < 1.0 && h < 1.2,
    fogDensity: 0.00055,
    exposureScale: 0.95,
    build: ({ kit, W, stage, hgt, makePath }) => {
      const water = stage.material("#2f8fa3", { roughness: 0.16, metalness: 0.18, transparent: true, opacity: 0.95 });
      const lake = mesh(stage, new THREE.CircleGeometry(1, 48), water, LAKE.x, LAKE.level, LAKE.z);
      lake.rotation.x = -Math.PI / 2;
      lake.scale.set(LAKE.rx, LAKE.rz, 1);
      stage.add(lake);
      const shore = mesh(stage, new THREE.TorusGeometry(1, 0.035, 5, 64), stage.material("#b9a47c", { roughness: 1 }), LAKE.x, LAKE.level + 0.03, LAKE.z);
      shore.rotation.x = -Math.PI / 2;
      shore.scale.set(LAKE.rx, LAKE.rz, 1);
      stage.add(shore);

      // Lakeside houses.
      const wall = stage.material("#d8c8aa", { roughness: 0.95 });
      const roof = stage.material("#7a4a32", { roughness: 0.9 });
      for (let i = 0; i < 6; i += 1) {
        const x = 50 + (i % 3) * 8;
        const z = 4 + Math.floor(i / 3) * 10;
        const w = 4.2 + (i % 2) * 0.7;
        const h = 2.8;
        stage.add(box(stage, w, h, 3.5, wall, x, hgt(x, z) + h / 2, z));
        const r = mesh(stage, new THREE.ConeGeometry(w * 0.8, 1.3, 4), roof, x, hgt(x, z) + h + 0.65, z);
        r.rotation.y = Math.PI / 4;
        stage.add(r);
      }

      // Boats and the lake beacon.
      const boatGroup = boat(stage, 8, 50, "#c94d3b", 0.4);
      boatGroup.position.y = LAKE.level + 0.12;
      stage.add(boatGroup);
      for (let i = 0; i < 3; i += 1) {
        const b = boat(stage, -18 + i * 12, 34 - i * 6, ["#2f7f8f", "#d4a33c", "#4a6b9a"][i], 0.7 + i * 0.4);
        b.position.y = LAKE.level + 0.12;
        stage.add(b);
      }

      // Peace Pagoda.
      const pagoda = stupa(stage, 44, hgt(44, 64), 64, 1.05);
      stage.add(pagoda);

      // Sarangkot and Annapurna viewpoints.
      const sarangkot = viewpoint(stage, 82, -58, -0.8);
      sarangkot.position.y = hgt(82, -58);
      stage.add(sarangkot);
      const annapurna = viewpoint(stage, -82, -58, 0.8);
      annapurna.position.y = hgt(-82, -58);
      stage.add(annapurna);

      // Paraglider above the ridge.
      const glider = paraglider(stage);
      glider.position.set(72, 24, -38);
      stage.add(glider);
      stage.animate((time, delta) => {
        if (stage.reducedMotion) return;
        glider.position.x += delta * 0.45;
        glider.position.y = 24 + Math.sin(time * 0.4) * 0.5;
        if (glider.position.x > 110) glider.position.x = 35;
      });

      // Paths.
      makePath([[36, 20], [24, 38], [12, 50], [8, 52]], 3.0);
      makePath([[36, 20], [50, 2], [64, -22], [74, -42], [82, -54]], 2.8);
      makePath([[36, 20], [36, 38], [42, 54], [44, 62], [44, 75]], 2.6);
      makePath([[8, 52], [-24, 68], [-58, 56], [-78, 18], [-82, -20], [-82, -54]], 2.8);

      // Trees.
      const treeSpots = [
        [20, 36], [28, 44], [50, 36], [58, 30], [16, 58], [60, 58],
        [4, 64], [-20, 72], [-46, 62], [-64, 36], [-70, 4], [-56, -18],
        [70, -20], [90, -34], [62, -50], [30, 70],
      ];
      treeSpots.forEach(([x, z], i) => {
        const t = tree(x, z, 0.75 + (i % 3) * 0.12, "#4f7650", i % 4 === 0 ? "#e7b4ac" : null);
        t.position.y = hgt(x, z);
        stage.add(t);
      });
      for (let i = 0; i < 8; i += 1) {
        const p = pine(-92 + i * 8, -70 - (i % 2) * 4, 0.8 + (i % 3) * 0.12, "#315b4c");
        p.position.y = hgt(-92 + i * 8, -70 - (i % 2) * 4);
        stage.add(p);
      }

      // Annapurna range behind the valley.
      const peaks = [
        [-46, -116, 64, 34, "#526b7c", 0.4],
        [-24, -122, 82, 42, "#4d6272", 0.38],
        [-2, -124, 76, 38, "#586f80", 0.42],
        [22, -120, 68, 34, "#526878", 0.44],
        [48, -114, 56, 30, "#5d7382", 0.46],
        [68, -108, 46, 24, "#617482", 0.48],
      ];
      peaks.forEach(([x, z, h, r, color, snow], i) => {
        const peak = mountain(h, r, color, "#f6f2e8", snow, 7);
        peak.position.set(x, 0, z);
        peak.rotation.y = i * 0.7;
        stage.add(peak);
      });

      const clouds = [];
      for (let i = 0; i < 5; i += 1) {
        const c = cloud(1.8 + (i % 3) * 0.5);
        c.position.set(-60 + i * 28, 24 + (i % 3) * 3, -70 - (i % 2) * 8);
        stage.add(c);
        clouds.push({ mesh: c, speed: 0.18 + i * 0.03 });
      }
      for (let i = 0; i < 6; i += 1) {
        stage.add(bird(-40 + i * 18, 22 + i * 0.8, -20 - i * 4));
      }
      stage.animate((time, delta) => {
        if (stage.reducedMotion) return;
        clouds.forEach((c) => {
          c.mesh.position.x += c.speed * delta;
          if (c.mesh.position.x > 120) c.mesh.position.x = -120;
        });
      });

      W.interactive("np-phewa", boatGroup, "Phewa Lake", [8, 52], { radius: 18, labelOffset: 1.4 });
      W.interactive("np-annapurna", annapurna, "Annapurna viewpoint", [-80, -56], { radius: 18, labelOffset: 1.6 });
      W.interactive("np-sarangkot", sarangkot, "Sarangkot launch", [80, -56], { radius: 18, labelOffset: 1.6 });
    },
    people: (W) => {
      const mix = ["trekker", "hunza-woman", "hunza-man", "schoolgirl", "elder", "porter"];
      const add = (cx, cz, radius, count) => {
        for (let i = 0; i < count; i += 1) {
          const a = W.stage.quality === "low" ? i * 1.7 : Math.random() * Math.PI * 2;
          const d = 4 + Math.random() * radius;
          const x = cx + Math.cos(a) * d;
          const z = cz + Math.sin(a) * d;
          W.addNpc({
            kind: Math.random() < 0.4 ? "idle" : "wander",
            cx,
            cz,
            R: radius,
            x,
            z,
            tx: 0,
            tz: 0,
            wait: Math.random() * 4,
            design: W.pick(mix),
          });
        }
      };
      add(36, 20, 16, 16);
      add(10, 58, 4, 6);
      add(82, -54, 8, 4);
      add(-82, -54, 8, 3);
    },
  });
}
