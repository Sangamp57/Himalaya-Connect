import * as THREE from "three";
import {
  addLighting,
  addSun,
  bird,
  cloud,
  createSky,
  mountain,
  pine,
  stoneTexture,
  tree,
  woodTexture,
} from "../helpers.js";
import { buildFort, hamletHouse } from "./hunza-builders.js";

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

export default function buildSkardu({ scene, stage }) {
  const detail = stage.quality !== "low";
  createSky(scene, {
    top: "#24445f",
    bottom: "#dfb98a",
    fog: "#c9b08c",
    near: 60,
    far: 165,
  });
  addLighting(scene, { shadows: detail, sun: [22, 30, 16], color: "#ffd3a0", intensity: 2.6, ambient: 1.35 });
  addSun(scene, { position: [-28, 26, -42], size: 5.0, color: "#ffd4a0" });

  const stoneMap = stage.trackTexture(stoneTexture("#8c8475", "#605b51", [3, 3]));
  const timberMap = stage.trackTexture(woodTexture("#65402a", "#3c2415", [2, 2]));

  const rock = stage.material("#6f6659", { roughness: 1 });
  const sand = stage.material("#b9a47c", { roughness: 1 });
  const grass = stage.material("#6c7f50", { roughness: 1 });
  const water = stage.material("#2f7f8f", { roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.94 });

  stage.add(cylinder(stage, 35, 29, 3.4, 18, rock, 0, -1.7, 0));
  stage.add(cylinder(stage, 34, 34, 0.45, 18, sand, 0, 0.22, 0));

  // The Indus, running across the valley.
  const river = mesh(stage, new THREE.PlaneGeometry(58, 12, 1, 1), water, 0, 0.52, 11);
  river.rotation.x = -Math.PI / 2;
  stage.add(river);
  stage.add(box(stage, 58, 0.55, 1.2, stage.material("#8c806b", { roughness: 1 }), 0, 0.45, 4.6));
  stage.add(box(stage, 58, 0.55, 1.2, stage.material("#8c806b", { roughness: 1 }), 0, 0.45, 17.4));

  // Shigar Fort on its rock above the village.
  const fortHill = mesh(stage, new THREE.ConeGeometry(10, 6.5, 12), stage.material("#736a5b", { roughness: 1 }), -12, 3.2, -6);
  stage.add(fortHill);
  const fort = buildFort(stage, 0, 0, stoneMap, timberMap);
  fort.position.set(-12, 6.1, -6);
  fort.rotation.y = 0.55;
  fort.scale.setScalar(0.82);
  stage.add(fort);
  const houseA = hamletHouse(stage, 0, 0, stoneMap, timberMap, 0.85);
  houseA.position.set(-18, 0.45, 3);
  stage.add(houseA);
  const houseB = hamletHouse(stage, 0, 0, stoneMap, timberMap, 0.75);
  houseB.position.set(-7, 0.45, 1);
  stage.add(houseB);
  const houseC = hamletHouse(stage, 0, 0, stoneMap, timberMap, 0.7);
  houseC.position.set(3, 0.45, -3);
  stage.add(houseC);

  // Katpana cold desert dunes.
  const dunes = new THREE.Group();
  dunes.position.set(16, 0.4, 3);
  for (let i = 0; i < 6; i += 1) {
    const dune = sphere(stage, 2.6 + (i % 3) * 0.5, sand, (i % 3) * 4 - 3, 0.2, Math.floor(i / 3) * 3.5 - 2, 1);
    dune.scale.set(1.5, 0.42, 1.0);
    dune.rotation.y = i * 0.6;
    dunes.add(dune);
  }
  const deck = box(stage, 4.8, 0.5, 3.4, stage.material("#847b6b", { roughness: 1 }), 0, 0.55, 4);
  dunes.add(deck);
  for (let i = 0; i < 4; i += 1) {
    dunes.add(box(stage, 0.12, 1.0, 0.12, stage.material("#5f3d26", { roughness: 0.9 }), -2 + i * 1.3, 1.0, 5.6));
  }
  dunes.add(box(stage, 4.2, 0.1, 0.1, stage.material("#5f3d26", { roughness: 0.9 }), 0, 1.5, 5.6));
  const pole = box(stage, 0.08, 2.2, 0.08, stage.material("#4a3424", { roughness: 0.9 }), 2.0, 1.6, 4.2);
  dunes.add(pole);
  const flag = box(stage, 0.7, 0.45, 0.03, stage.material("#b94a37", { roughness: 0.9 }), 2.4, 2.4, 4.2);
  dunes.add(flag);
  stage.add(dunes);

  // The bridge over the Indus.
  const crossing = bridge(stage, 11);
  stage.add(crossing);

  // Karakoram backdrop.
  const peaks = [
    [-26, -31, 34, 15, "#4c6070", 0.36],
    [-10, -36, 40, 18, "#465a6b", 0.34],
    [8, -34, 36, 16, "#526777", 0.38],
    [25, -28, 29, 13, "#5a6f7f", 0.4],
    [-38, -20, 22, 10, "#617482", 0.45],
  ];
  peaks.forEach(([x, z, h, r, color, snow], i) => {
    const peak = mountain(h, r, color, "#f5f1e6", snow, detail ? 7 : 5);
    peak.position.set(x, 0.2, z);
    peak.rotation.y = i * 0.7;
    stage.add(peak);
  });

  // Poplars, apricots and pines.
  const trees = [
    [-23, 8], [-20, 12], [-14, 9], [-8, 8], [-3, 9], [4, 7],
    [8, 4], [24, 10], [27, 5], [21, 13], [-26, -2], [-17, -12],
  ];
  trees.forEach(([x, z], i) => {
    const t = tree(x, z, 0.8 + (i % 3) * 0.12, "#557550", i % 3 === 0 ? "#e7b4ac" : null);
    t.position.y = 0.45;
    stage.add(t);
  });
  for (let i = 0; i < (detail ? 9 : 4); i += 1) {
    const p = pine(-30 + i * 7, -18 - (i % 2) * 4, 0.7 + (i % 3) * 0.12, "#315b4c");
    p.position.y = 0.45;
    stage.add(p);
  }
  for (let i = 0; i < 6; i += 1) {
    stage.add(bird(-14 + i * 6, 14 + i * 0.7, -10 - i * 2));
  }

  const clouds = [];
  for (let i = 0; i < (detail ? 6 : 3); i += 1) {
    const c = cloud(1.7 + (i % 3) * 0.5);
    c.position.set(-26 + i * 10, 10 + (i % 3) * 2, -24 - (i % 2) * 6);
    stage.add(c);
    clouds.push({ mesh: c, speed: 0.16 + i * 0.03 });
  }

  stage.addInteractive("pk-shigar", fort, {
    label: "Shigar Fort",
    accent: "#e6bc6a",
    focus: [-12, 10, -6],
    radius: 22,
    beaconPosition: [-8, 7.2, -1],
    labelOffset: 1.8,
  });
  stage.addInteractive("pk-indus", crossing, {
    label: "Indus River",
    accent: "#e6bc6a",
    focus: [0, 1.4, 11],
    radius: 15,
    beaconPosition: [0, 1.8, 11],
    labelOffset: 1.2,
  });
  stage.addInteractive("pk-katpana", dunes, {
    label: "Katpana cold desert",
    accent: "#e6bc6a",
    focus: [16, 1, 3],
    radius: 18,
    beaconPosition: [16, 0.9, 7],
    labelOffset: 1.2,
  });

  stage.animate((time, delta) => {
    if (stage.reducedMotion) return;
    clouds.forEach((c) => {
      c.mesh.position.x += c.speed * delta;
      if (c.mesh.position.x > 34) c.mesh.position.x = -34;
    });
  });

  return { objectId: "skardu" };
}
