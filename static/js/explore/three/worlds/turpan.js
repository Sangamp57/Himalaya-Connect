import * as THREE from "three";
import {
  addLighting,
  addSun,
  bird,
  cloud,
  createSky,
  mountain,
  pine,
  tree,
} from "../helpers.js";

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

function minaret(stage) {
  const group = new THREE.Group();
  group.position.set(-10, 0.45, -4);
  const brick = stage.material("#b58a5c", { roughness: 0.96 });
  const dark = stage.material("#5a3c28", { roughness: 0.9 });
  const tile = stage.material("#3f7a76", { roughness: 0.85 });
  const gold = stage.material("#d8a541", { metalness: 0.4, roughness: 0.35 });

  group.add(box(stage, 7.0, 1.4, 7.0, brick, 0, 0.7, 0));
  group.add(cylinder(stage, 2.3, 2.9, 1.2, 18, brick, 0, 1.8, 0));
  const shaft = cylinder(stage, 1.45, 2.15, 12.5, 22, brick, 0, 8.7, 0);
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

export default function buildTurpan({ scene, stage }) {
  const detail = stage.quality !== "low";
  createSky(scene, {
    top: "#3f5d72",
    bottom: "#e7b57e",
    fog: "#d1ae83",
    near: 60,
    far: 160,
  });
  addLighting(scene, { shadows: detail, sun: [24, 30, 18], color: "#ffd09a", intensity: 2.7, ambient: 1.3 });
  addSun(scene, { position: [-30, 26, -42], size: 5.2, color: "#ffd3a0" });

  const sand = stage.material("#b79a6e", { roughness: 1 });
  const earth = stage.material("#8d6d4b", { roughness: 1 });
  const oasis = stage.material("#6f8a4e", { roughness: 1 });
  const rock = stage.material("#7a5944", { roughness: 1 });

  stage.add(cylinder(stage, 35, 29, 3.2, 18, rock, 0, -1.6, 0));
  stage.add(cylinder(stage, 34, 34, 0.45, 18, sand, 0, 0.22, 0));

  // Oasis fields.
  const fields = [
    [-10, 10, 17, 12],
    [12, 6, 15, 10],
    [-2, -4, 10, 8],
  ];
  fields.forEach(([x, z, w, d]) => {
    stage.add(box(stage, w, 0.18, d, oasis, x, 0.48, z));
    for (let i = 0; i < 4; i += 1) {
      stage.add(box(stage, w * 0.85, 0.05, 0.18, stage.material("#55733d", { roughness: 1 }), x, 0.6, z - d * 0.3 + i * (d * 0.2)));
    }
  });

  const emin = minaret(stage);
  stage.add(emin);
  const wells = karez(stage);
  stage.add(wells);
  const vines = vineyard(stage);
  stage.add(vines);

  // Mud-brick houses.
  const wall = stage.material("#c49a6c", { roughness: 0.97 });
  const dark = stage.material("#5a3c28", { roughness: 0.9 });
  for (let i = 0; i < 5; i += 1) {
    const x = -20 + i * 9;
    const z = -7 + (i % 2) * 5;
    const w = 4.2 + (i % 3) * 0.5;
    const h = 2.8 + (i % 2) * 0.5;
    stage.add(box(stage, w, h, 3.8, wall, x, h / 2 + 0.45, z));
    stage.add(box(stage, w + 0.4, 0.25, 4.2, dark, x, h + 0.55, z));
    stage.add(box(stage, 0.9, 1.8, 0.12, dark, x - 0.7, 1.35, z + 1.95));
    const dome = mesh(stage, new THREE.SphereGeometry(1.3, 14, 8), wall, x + 1.2, h + 0.8, z);
    dome.scale.y = 0.55;
    stage.add(dome);
  }

  // Poplars.
  for (let i = 0; i < 12; i += 1) {
    const x = -24 + (i % 6) * 8.5;
    const z = 14 - Math.floor(i / 6) * 5;
    const t = tree(x, z, 0.9 + (i % 3) * 0.1, "#4f7650", null);
    t.position.y = 0.5;
    t.scale.y = 1.35;
    stage.add(t);
  }
  for (let i = 0; i < (detail ? 7 : 3); i += 1) {
    const p = pine(-28 + i * 8, -16 - (i % 2) * 4, 0.7, "#315b4c");
    p.position.y = 0.5;
    stage.add(p);
  }

  // Flaming Mountains.
  const peaks = [
    [-26, -30, 22, 12, "#8a3f2e", 0.95],
    [-10, -34, 28, 15, "#7a3628", 0.95],
    [8, -32, 24, 13, "#9a4b35", 0.95],
    [25, -27, 18, 10, "#8a4432", 0.95],
  ];
  peaks.forEach(([x, z, h, r, color, snow], i) => {
    const peak = mountain(h, r, color, "#e4b07a", snow, detail ? 7 : 5);
    peak.position.set(x, 0.2, z);
    peak.rotation.y = i * 0.7;
    stage.add(peak);
  });

  for (let i = 0; i < 6; i += 1) {
    stage.add(bird(-12 + i * 5, 13 + i * 0.7, -10 - i * 2));
  }
  const clouds = [];
  for (let i = 0; i < (detail ? 5 : 3); i += 1) {
    const c = cloud(1.6 + (i % 3) * 0.5);
    c.position.set(-26 + i * 11, 9 + (i % 3) * 2, -24 - (i % 2) * 6);
    stage.add(c);
    clouds.push({ mesh: c, speed: 0.18 + i * 0.03 });
  }

  stage.addInteractive("cn-emin", emin, {
    label: "Emin Minaret",
    accent: "#e6bc6a",
    focus: [-10, 7, -4],
    radius: 20,
    beaconPosition: [-6.5, 2.0, 2.2],
    labelOffset: 1.8,
  });
  stage.addInteractive("cn-karez", wells, {
    label: "Karez wells",
    accent: "#e6bc6a",
    focus: [13, 1, 7],
    radius: 16,
    beaconPosition: [13, 1.0, 10.5],
    labelOffset: 1.2,
  });
  stage.addInteractive("cn-grapes", vines, {
    label: "Turpan vineyard",
    accent: "#e6bc6a",
    focus: [-9, 1.5, 11],
    radius: 15,
    beaconPosition: [-9, 1.0, 14.5],
    labelOffset: 1.2,
  });

  stage.animate((time, delta) => {
    if (stage.reducedMotion) return;
    clouds.forEach((c) => {
      c.mesh.position.x += c.speed * delta;
      if (c.mesh.position.x > 34) c.mesh.position.x = -34;
    });
  });

  return { objectId: "turpan" };
}
