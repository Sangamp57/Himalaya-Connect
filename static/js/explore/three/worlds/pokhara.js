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

export default function buildPokhara({ scene, stage }) {
  const detail = stage.quality !== "low";
  createSky(scene, {
    top: "#20445f",
    bottom: "#e8c08b",
    fog: "#cdb18c",
    near: 60,
    far: 160,
  });
  addLighting(scene, { shadows: detail, sun: [24, 32, 18], color: "#ffd6a4", intensity: 2.5, ambient: 1.5 });
  addSun(scene, { position: [-32, 28, -46], size: 5.0, color: "#ffd7a8" });

  const grass = stage.material("#6f8a5a", { roughness: 1 });
  const rock = stage.material("#5d5951", { roughness: 1 });
  const sand = stage.material("#b9a47c", { roughness: 1 });
  const water = stage.material("#2f8fa3", { roughness: 0.16, metalness: 0.18, transparent: true, opacity: 0.95 });

  const island = cylinder(stage, 34, 29, 3.4, 18, rock, 0, -1.7, 0);
  island.scale.y = 1.05;
  stage.add(island);
  stage.add(cylinder(stage, 33, 33, 0.45, 18, grass, 0, 0.22, 0));

  // Phewa Lake.
  const lake = mesh(stage, new THREE.CircleGeometry(14.5, 44), water, -4, 0.5, 2);
  lake.rotation.x = -Math.PI / 2;
  lake.scale.set(1.5, 1, 0.95);
  stage.add(lake);
  const shore = mesh(stage, new THREE.TorusGeometry(14.6, 0.55, 6, 48), sand, -4, 0.46, 2);
  shore.rotation.x = -Math.PI / 2;
  shore.scale.set(1.5, 1, 0.95);
  stage.add(shore);

  // Green hills and the World Peace Pagoda.
  const hill = mesh(stage, new THREE.ConeGeometry(8.4, 7.5, 12), stage.material("#58744d", { roughness: 1 }), 14, 3.7, -5);
  stage.add(hill);
  const pagoda = stupa(stage, 14, 7.2, -5, 1.15);
  stage.add(pagoda);

  // Lakeside houses and a small market.
  const houseWall = stage.material("#d8c8aa", { roughness: 0.95 });
  const roofMat = stage.material("#7a4a32", { roughness: 0.9 });
  for (let i = 0; i < 5; i += 1) {
    const x = -20 + i * 7;
    const z = 13 + (i % 2) * 3;
    const w = 4.2 + (i % 2) * 0.8;
    const h = 2.6 + (i % 3) * 0.3;
    stage.add(box(stage, w, h, 3.4, houseWall, x, h / 2, z));
    const roof = mesh(stage, new THREE.ConeGeometry(w * 0.8, 1.4, 4), roofMat, x, h + 0.7, z);
    roof.rotation.y = Math.PI / 4;
    stage.add(roof);
    stage.add(box(stage, 0.9, 1.6, 0.12, stage.material("#3b2a1c", { roughness: 0.9 }), x - 0.8, 0.8, z + 1.7));
  }

  // Boats on the lake.
  const boats = [];
  ["#c94d3b", "#2f7f8f", "#d4a33c", "#4a6b9a"].forEach((color, i) => {
    const b = boat(stage, -10 + i * 5.5, 1 + (i % 2) * 3.5, color, 0.5 + i * 0.7);
    stage.add(b);
    boats.push({ mesh: b, baseY: b.position.y, phase: i * 1.3 });
  });

  // Paraglider drifting above the valley.
  const glider = paraglider(stage);
  stage.add(glider);

  // Annapurna and surrounding peaks.
  const peaks = [
    [-24, -30, 28, 13, "#526b7c", 0.42],
    [-11, -34, 34, 15, "#4d6272", 0.4],
    [4, -36, 31, 14, "#586f80", 0.43],
    [18, -31, 25, 12, "#526878", 0.45],
    [29, -25, 20, 10, "#5d7382", 0.46],
  ];
  peaks.forEach(([x, z, h, r, color, snow], i) => {
    const peak = mountain(h, r, color, "#f6f2e8", snow, detail ? 7 : 5);
    peak.position.set(x, 0.2, z);
    peak.rotation.y = i * 0.7;
    stage.add(peak);
  });

  // Trees and birds.
  const treeSpots = [
    [-24, 8], [-17, 16], [-10, 18], [2, 17], [8, 14],
    [22, 9], [25, 2], [19, 12], [-26, -3], [-19, -8],
    [7, 9], [-6, 10],
  ];
  treeSpots.forEach(([x, z], i) => {
    const t = tree(x, z, 0.8 + (i % 3) * 0.12, "#4f7650", i % 4 === 0 ? "#e7b4ac" : null);
    t.position.y = 0.4;
    stage.add(t);
  });
  for (let i = 0; i < (detail ? 10 : 4); i += 1) {
    const p = pine(-28 + i * 6, -14 - (i % 2) * 3, 0.7 + (i % 3) * 0.1, "#315b4c");
    p.position.y = 0.4;
    stage.add(p);
  }
  for (let i = 0; i < 6; i += 1) {
    stage.add(bird(-12 + i * 5, 13 + i * 0.6, -8 - i * 2));
  }

  const clouds = [];
  for (let i = 0; i < (detail ? 6 : 3); i += 1) {
    const c = cloud(1.6 + (i % 3) * 0.5);
    c.position.set(-26 + i * 10, 9 + (i % 3) * 2, -22 - (i % 2) * 6);
    stage.add(c);
    clouds.push({ mesh: c, speed: 0.18 + i * 0.03 });
  }

  // Interactive landmarks.
  const phewaGroup = boats[0].mesh;
  stage.addInteractive("np-phewa", phewaGroup, {
    label: "Phewa Lake",
    accent: "#e6bc6a",
    focus: [-10, 1, 1],
    radius: 15,
    beaconPosition: [-10, 0.9, 4],
    labelOffset: 1.2,
  });

  const annapurna = viewpoint(stage, -18, -10, 0.5);
  stage.add(annapurna);
  stage.addInteractive("np-annapurna", annapurna, {
    label: "Annapurna viewpoint",
    accent: "#e6bc6a",
    focus: [-18, 1.2, -10],
    radius: 14,
    beaconPosition: [-18, 0.8, -7],
    labelOffset: 1.2,
  });

  const launch = viewpoint(stage, 23, 8, -0.8);
  stage.add(launch);
  stage.addInteractive("np-sarangkot", launch, {
    label: "Sarangkot launch",
    accent: "#e6bc6a",
    focus: [23, 1.2, 8],
    radius: 14,
    beaconPosition: [23, 0.8, 11],
    labelOffset: 1.2,
  });

  stage.animate((time, delta) => {
    if (stage.reducedMotion) return;
    boats.forEach((b) => {
      b.mesh.position.y = b.baseY + Math.sin(time * 0.7 + b.phase) * 0.05;
    });
    glider.position.x += delta * 0.55;
    glider.position.y = 17 + Math.sin(time * 0.4) * 0.5;
    if (glider.position.x > 20) glider.position.x = -22;
    clouds.forEach((c) => {
      c.mesh.position.x += c.speed * delta;
      if (c.mesh.position.x > 34) c.mesh.position.x = -34;
    });
  });

  return { objectId: "pokhara" };
}
