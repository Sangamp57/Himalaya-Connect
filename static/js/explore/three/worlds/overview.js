import * as THREE from "three";
import {
  addLighting,
  addSun,
  bird,
  cloud,
  colors,
  createSky,
  mountain,
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

function island(stage, x, z, radius, topColor) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const rock = mesh(stage, new THREE.CylinderGeometry(radius, radius * 0.32, 3.4, 9), stage.material("#655d55", { roughness: 1 }), 0, -1.7, 0);
  rock.scale.y = 1.1;
  group.add(rock);
  const grass = mesh(stage, new THREE.CylinderGeometry(radius, radius, 0.45, 9), stage.material(topColor, { roughness: 1 }), 0, 0.22, 0);
  group.add(grass);
  const rim = mesh(stage, new THREE.TorusGeometry(radius * 0.98, 0.06, 5, 40), stage.material("#d8b061", { roughness: 0.6, metalness: 0.2 }), 0, 0.44, 0);
  rim.rotation.x = -Math.PI / 2;
  group.add(rim);
  return group;
}

function miniPagoda(stage, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const brick = stage.material("#9c4332", { roughness: 0.94 });
  const dark = stage.material("#5a3020", { roughness: 0.9 });
  const roofMat = stage.material("#b85c37", { roughness: 0.85 });
  const gold = stage.material("#d8a541", { metalness: 0.4, roughness: 0.35 });
  group.add(box(stage, 2.8, 0.3, 2.8, dark, 0, 0.15, 0));
  group.add(box(stage, 2.2, 1.15, 2.2, brick, 0, 0.88, 0));
  let roofY = 1.6;
  [1.9, 1.55, 1.15].forEach((radius) => {
    const roof = mesh(stage, new THREE.ConeGeometry(radius, 0.55, 4), roofMat, 0, roofY, 0);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
    group.add(box(stage, radius * 0.7, 0.28, radius * 0.7, dark, 0, roofY - 0.18, 0));
    roofY += 0.48;
  });
  group.add(mesh(stage, new THREE.ConeGeometry(0.12, 0.7, 6), gold, 0, roofY + 0.2, 0));
  group.add(box(stage, 1.0, 0.5, 0.3, dark, 0, 0.5, 1.15));
  const house = box(stage, 1.7, 1.0, 1.4, brick, 1.5, 0.8, 0.8);
  group.add(house);
  const houseRoof = mesh(stage, new THREE.ConeGeometry(1.27, 0.55, 4), roofMat, 1.5, 1.55, 0.8);
  houseRoof.rotation.y = Math.PI / 4;
  group.add(houseRoof);
  group.add(tree(-1.65, 0.9, 0.38, "#4e7755", "#e5aaa1"));
  return group;
}

function miniFort(stage, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const stone = stage.material("#8a8172", { roughness: 1 });
  const dark = stage.material("#5a5045", { roughness: 1 });
  const wood = stage.material("#5f3d26", { roughness: 0.9 });
  group.add(box(stage, 2.6, 1.15, 2.1, stone, 0, 0.58, 0));
  group.add(box(stage, 1.8, 1.0, 1.55, stone, -0.2, 1.65, -0.15));
  group.add(box(stage, 0.9, 1.6, 0.9, dark, 0.95, 1.45, -0.5));
  group.add(box(stage, 2.9, 0.2, 2.3, wood, 0, 1.23, 0));
  group.add(box(stage, 2.0, 0.18, 1.7, wood, -0.2, 2.23, -0.15));
  for (let index = 0; index < 3; index += 1) {
    group.add(box(stage, 0.08, 0.7, 0.08, wood, -1.1 + index * 1.1, 1.6, 0.92));
  }
  group.add(box(stage, 2.5, 0.08, 0.08, wood, 0, 1.98, 0.92));
  const peak = mountain(3.0, 2.4, "#5a6b79", "#f5f1e7", 0.36, 5);
  peak.position.set(-2.2, 0, -1.4);
  group.add(peak);
  group.add(tree(1.8, 1.5, 0.35, "#557550", "#e7b8ae"));
  return group;
}

function miniMarket(stage, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const wall = stage.material("#b8824c", { roughness: 0.96 });
  const dark = stage.material("#4d3323", { roughness: 0.9 });
  const gold = stage.material("#d2a447", { roughness: 0.4, metalness: 0.3 });
  const teal = stage.material("#357364", { roughness: 0.9 });
  group.add(box(stage, 3.0, 1.45, 2.2, wall, 0, 0.72, 0));
  group.add(box(stage, 3.2, 0.2, 2.4, dark, 0, 1.52, 0));
  const arch = mesh(stage, new THREE.CircleGeometry(0.6, 14, 0, Math.PI), dark, 0, 1.0, 1.12);
  group.add(arch);
  group.add(box(stage, 1.2, 1.0, 0.1, dark, 0, 0.5, 1.12));
  group.add(box(stage, 1.6, 1.2, 0.1, gold, 0, 0.7, 1.2));
  group.add(box(stage, 1.2, 1.0, 0.12, dark, 0, 0.5, 1.28));
  group.add(box(stage, 2.0, 0.4, 0.9, dark, 0.1, 1.8, 0));
  group.add(box(stage, 2.3, 0.06, 1.5, teal, 0.1, 2.04, 0.2));
  group.add(box(stage, 0.8, 1.1, 0.7, wall, -1.75, 0.55, 0.4));
  const canopy = mesh(stage, new THREE.ConeGeometry(1.0, 0.6, 4), teal, -1.75, 1.45, 0.4);
  canopy.rotation.y = Math.PI / 4;
  group.add(canopy);
  for (let index = 0; index < 3; index += 1) {
    const silk = box(stage, 0.3, 1.1, 0.04, stage.material(["#b54035", "#d4a041", "#3d796b"][index], { roughness: 0.85 }), -0.65 + index * 0.34, 1.25, 1.3);
    group.add(silk);
  }
  return group;
}

function miniKarakoram(stage, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const snow = stage.material("#f4efe4", { roughness: 0.85 });
  const rock = stage.material("#5b6c77", { roughness: 1 });
  const road = stage.material("#4b4743", { roughness: 0.95 });
  [-1.0, 0.1, 1.2].forEach((px, index) => {
    const peak = mountain(2.4 + index * 0.75, 1.25 + index * 0.25, index === 1 ? "#526573" : "#60727e", "#f3eee4", 0.36, 5);
    peak.position.set(px, 0, -0.8 + (index % 2) * 0.9);
    group.add(peak);
  });
  const roadMesh = box(stage, 0.45, 0.06, 3.4, road, 0, 0.23, 0.2);
  roadMesh.rotation.y = 0.3;
  group.add(roadMesh);
  group.add(box(stage, 1.0, 0.55, 0.8, rock, 0.8, 0.52, 1.0));
  group.add(box(stage, 0.7, 0.4, 0.6, rock, -0.85, 0.45, 1.15));
  const flag = box(stage, 0.03, 0.8, 0.03, stage.material("#e0b45f", { roughness: 0.8 }), 1.25, 1.1, 1.1);
  group.add(flag);
  const cloth = box(stage, 0.45, 0.3, 0.02, stage.material("#b94a37", { roughness: 0.9 }), 1.48, 1.35, 1.1);
  group.add(cloth);
  group.add(tree(-1.7, 1.2, 0.3, "#456852", null));
  return group;
}

function miniJourney(stage, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const road = stage.material("#4b4743", { roughness: 0.95 });
  const wood = stage.material("#5e3d24", { roughness: 0.9 });
  [-1.1, 0.2, 1.4].forEach((px, index) => {
    const peak = mountain(2.2 + index * 0.7, 1.2 + index * 0.22, index === 1 ? "#526573" : "#60727e", "#f3eee4", 0.35, 5);
    peak.position.set(px, 0, -1.0 + (index % 2) * 0.8);
    group.add(peak);
  });
  for (let index = 0; index < 4; index += 1) {
    const seg = box(stage, 0.5, 0.05, 1.4, road, -0.6 + index * 0.42, 0.2, -0.4 + index * 0.5);
    seg.rotation.y = Math.sin(index) * 0.4;
    group.add(seg);
  }
  group.add(box(stage, 0.08, 0.7, 0.08, wood, 0.5, 0.55, 0.6));
  group.add(box(stage, 0.7, 0.3, 0.04, wood, 0.5, 0.82, 0.6));
  group.add(tree(-1.7, 1.1, 0.3, "#456852", null));
  return group;
}

function miniPokhara(stage, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const water = stage.material("#2f8fa3", { roughness: 0.18, metalness: 0.2, transparent: true, opacity: 0.95 });
  const lake = mesh(stage, new THREE.CircleGeometry(1.55, 24), water, 0.55, 0.04, 0.4);
  lake.rotation.x = -Math.PI / 2;
  lake.scale.set(1.4, 1, 0.9);
  group.add(lake);
  group.add(miniPagoda(stage, -0.9, 0, -0.6));
  group.add(box(stage, 0.8, 0.1, 0.3, stage.material("#c94d3b", { roughness: 0.8 }), 0.9, 0.15, 0.4));
  return group;
}

function miniSkardu(stage, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const water = stage.material("#2f7f8f", { roughness: 0.16, metalness: 0.2, transparent: true, opacity: 0.94 });
  group.add(box(stage, 3.4, 0.05, 1.05, water, 0, 0.08, 1.15));
  group.add(miniFort(stage, -0.5, 0, -0.6));
  const dune = mesh(stage, new THREE.SphereGeometry(0.8, 10, 6), stage.material("#c4a978", { roughness: 1 }), 1.35, 0.2, 0.75);
  dune.scale.set(1.25, 0.3, 0.8);
  group.add(dune);
  return group;
}

function miniTurpan(stage, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.add(miniMarket(stage, -0.6, 0, 0.2));
  const brick = stage.material("#b58a5c", { roughness: 0.96 });
  group.add(cylinder(stage, 0.35, 0.55, 1.9, 12, brick, 1.5, 0.95, 0.4));
  group.add(cylinder(stage, 0.55, 0.55, 0.15, 12, stage.material("#3f7a76", { roughness: 0.85 }), 1.5, 1.95, 0.4));
  group.add(mesh(stage, new THREE.ConeGeometry(0.3, 0.5, 8), stage.material("#d8a541", { metalness: 0.4, roughness: 0.35 }), 1.5, 2.3, 0.4));
  group.add(box(stage, 2.6, 0.04, 1.8, stage.material("#b79a6e", { roughness: 1 }), 0.6, 0.04, 1.2));
  return group;
}

/* Yunnan: terraced tea hill with a pavilion (Pu'er) */
function miniPuer(stage, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const soil = stage.material("#8d5a3a", { roughness: 1 });
  const tea = stage.material("#4f7f2c", { roughness: 0.9 });
  for (let i = 0; i < 5; i += 1) {
    const r = 2.1 - i * 0.38;
    group.add(cylinder(stage, r, r, 0.22, 20, soil, 0, 0.11 + i * 0.22, 0));
    const ring = mesh(stage, new THREE.TorusGeometry(r - 0.12, 0.09, 5, 24), tea, 0, 0.26 + i * 0.22, 0);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);
  }
  const red = stage.material("#9e2a20", { roughness: 0.7 });
  [[-0.2, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2]].forEach(([a, b]) => group.add(cylinder(stage, 0.03, 0.03, 0.4, 5, red, a, 1.3, b)));
  group.add(mesh(stage, new THREE.ConeGeometry(0.42, 0.3, 4), stage.material("#5f6366", { roughness: 0.8 }), 0, 1.62, 0));
  return group;
}

/* Yunnan: white pagoda, palm and stilt house (Xishuangbanna) */
function miniBanna(stage, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const white = stage.material("#f2eee4", { roughness: 0.8 });
  const gold = stage.material("#d9a93c", { metalness: 0.6, roughness: 0.35 });
  group.add(cylinder(stage, 0.9, 1.0, 0.25, 8, white, -0.6, 0.12, -0.3));
  group.add(mesh(stage, new THREE.LatheGeometry([[0.5, 0], [0.5, 0.3], [0.42, 0.6], [0.24, 1.0], [0.1, 1.3], [0.0, 1.7]].map(([r, h]) => new THREE.Vector2(r, h)), 16), white, -0.6, 0.25, -0.3));
  group.add(mesh(stage, new THREE.ConeGeometry(0.05, 0.4, 6), gold, -0.6, 2.1, -0.3));
  const wood = stage.material("#5a3a24", { roughness: 0.9 });
  [[0.6, 0.4], [1.4, 0.4], [0.6, 1.0], [1.4, 1.0]].forEach(([a, b]) => group.add(cylinder(stage, 0.04, 0.04, 0.45, 5, wood, a, 0.22, b)));
  group.add(box(stage, 1.0, 0.35, 0.8, stage.material("#cdb27a", { roughness: 0.9 }), 1.0, 0.62, 0.7));
  group.add(mesh(stage, new THREE.ConeGeometry(0.85, 0.6, 4), stage.material("#b5532c", { roughness: 0.8 }), 1.0, 1.08, 0.7));
  group.add(cylinder(stage, 0.05, 0.07, 1.6, 6, stage.material("#8f8576", { roughness: 0.9 }), -1.3, 0.8, 0.9));
  for (let i = 0; i < 6; i += 1) {
    const leaf = box(stage, 0.12, 0.03, 0.9, stage.material("#4d7a30", { roughness: 0.8 }), -1.3, 1.6, 0.9);
    leaf.rotation.y = (i / 6) * Math.PI * 2;
    leaf.rotation.x = 0.35;
    group.add(leaf);
  }
  const river = box(stage, 0.5, 0.04, 2.6, stage.material("#5d7a6c", { roughness: 0.2, metalness: 0.1 }), 2.0, 0.04, -0.2);
  group.add(river);
  return group;
}

export default function buildOverview({ scene, stage }) {
  const detail = stage.quality !== "low";
  createSky(scene, {
    top: "#0b2340",
    bottom: "#e2aa65",
    fog: "#17324d",
    near: 30,
    far: 92,
  });
  addLighting(scene, { shadows: detail, sun: [12, 22, 12], color: "#ffd39e", intensity: 2.5, ambient: 1.3 });
  addSun(scene, { position: [-24, 18, -34], size: 3.4, color: "#ffd9a7" });

  // A loose ring of floating miniature worlds.
  const nepal = island(stage, -7.2, 2.0, 3.6, "#6b8558");
  const pakistan = island(stage, 5.8, 3.3, 3.8, "#7e865a");
  const china = island(stage, 6.4, -5.0, 3.5, "#8b885a");
  const karakoram = island(stage, -5.4, -6.2, 3.4, "#708060");
  const journey = island(stage, 0.4, 6.4, 3.2, "#8a7d5a");
  const pokhara = island(stage, -13.4, 5.4, 2.8, "#6f8a70");
  const skardu = island(stage, -12.6, -7.6, 2.8, "#8b7f5c");
  const turpan = island(stage, 13.4, -0.6, 2.8, "#9a8552");
  const puer = island(stage, 12.6, -8.6, 2.8, "#6f8a50");
  const xishuangbanna = island(stage, 2.0, -11.8, 2.8, "#5f8a4a");
  [nepal, pakistan, china, karakoram, journey, pokhara, skardu, turpan, puer, xishuangbanna].forEach((item) => stage.add(item));
  nepal.add(miniPagoda(stage, 0, 0.42, 0));
  pakistan.add(miniFort(stage, 0, 0.42, 0));
  china.add(miniMarket(stage, 0, 0.42, 0));
  karakoram.add(miniKarakoram(stage, 0, 0.42, 0));
  journey.add(miniJourney(stage, 0, 0.42, 0));
  pokhara.add(miniPokhara(stage, 0, 0.42, 0));
  skardu.add(miniSkardu(stage, 0, 0.42, 0));
  turpan.add(miniTurpan(stage, 0, 0.42, 0));
  puer.add(miniPuer(stage, 0, 0.42, 0));
  xishuangbanna.add(miniBanna(stage, 0, 0.42, 0));

  stage.addInteractive("overview:kathmandu", nepal, {
    label: "Nepal",
    hideLabel: true,
    accent: "#e6bc6a",
    focus: [-7.2, 0.8, 2.0],
    radius: 10.5,
    beaconPosition: [-7.2, 0.7, 5.4],
    labelOffset: 1.0,
  });
  stage.addInteractive("overview:hunza", pakistan, {
    label: "Pakistan",
    hideLabel: true,
    accent: "#e6bc6a",
    focus: [5.8, 0.8, 3.3],
    radius: 10.8,
    beaconPosition: [5.8, 0.7, 6.8],
    labelOffset: 1.0,
  });
  stage.addInteractive("overview:kashgar", china, {
    label: "China",
    hideLabel: true,
    accent: "#e6bc6a",
    focus: [6.4, 0.8, -5.0],
    radius: 10.5,
    beaconPosition: [6.4, 0.7, -1.7],
    labelOffset: 1.0,
  });
  stage.addInteractive("overview:karakoram", karakoram, {
    label: "Karakoram",
    hideLabel: true,
    accent: "#e6bc6a",
    focus: [-5.4, 0.8, -6.2],
    radius: 10.2,
    beaconPosition: [-5.4, 0.7, -3.0],
    labelOffset: 1.0,
  });
  stage.addInteractive("overview:journey", journey, {
    label: "Journey",
    hideLabel: true,
    accent: "#e6bc6a",
    focus: [0.4, 0.8, 6.4],
    radius: 10.2,
    beaconPosition: [0.4, 0.7, 9.6],
    labelOffset: 1.0,
  });
  stage.addInteractive("overview:pokhara", pokhara, {
    label: "Pokhara",
    hideLabel: true,
    accent: "#e6bc6a",
    focus: [-13.4, 0.8, 5.4],
    radius: 9.2,
    beaconPosition: [-13.4, 0.7, 8.2],
    labelOffset: 1.0,
  });
  stage.addInteractive("overview:skardu", skardu, {
    label: "Skardu",
    hideLabel: true,
    accent: "#e6bc6a",
    focus: [-12.6, 0.8, -7.6],
    radius: 9.2,
    beaconPosition: [-12.6, 0.7, -4.8],
    labelOffset: 1.0,
  });
  stage.addInteractive("overview:turpan", turpan, {
    label: "Turpan",
    hideLabel: true,
    accent: "#e6bc6a",
    focus: [13.4, 0.8, -0.6],
    radius: 9.2,
    beaconPosition: [13.4, 0.7, 2.2],
    labelOffset: 1.0,
  });

  stage.addInteractive("overview:puer", puer, {
    label: "Pu'er",
    hideLabel: true,
    accent: "#e6bc6a",
    focus: [12.6, 0.8, -8.6],
    radius: 9.2,
    beaconPosition: [12.6, 0.7, -5.8],
    labelOffset: 1.0,
  });
  stage.addInteractive("overview:xishuangbanna", xishuangbanna, {
    label: "Xishuangbanna",
    hideLabel: true,
    accent: "#e6bc6a",
    focus: [2.0, 0.8, -11.8],
    radius: 9.2,
    beaconPosition: [2.0, 0.7, -9.0],
    labelOffset: 1.0,
  });

  const clouds = [];
  for (let index = 0; index < (detail ? 10 : 4); index += 1) {
    const cloudGroup = cloud(1.0 + (index % 4) * 0.3);
    cloudGroup.position.set(-20 + index * 4.8, -3.4 + (index % 3) * 1.3, -14 + (index % 4) * 6);
    cloudGroup.children.forEach((part) => {
      part.material = new THREE.MeshBasicMaterial({
        color: index % 2 ? "#f7e1c8" : "#e6d6c7",
        transparent: true,
        opacity: 0.27,
        depthWrite: false,
      });
    });
    stage.add(cloudGroup);
    clouds.push({ mesh: cloudGroup, speed: 0.25 + index * 0.04, baseY: cloudGroup.position.y, phase: index });
  }
  stage.animate((time, delta) => {
    if (stage.reducedMotion) return;
    clouds.forEach((item) => {
      item.mesh.position.x += item.speed * delta;
      item.mesh.position.y = item.baseY + Math.sin(time * 0.18 + item.phase) * 0.2;
      if (item.mesh.position.x > 26) item.mesh.position.x = -26;
    });
  });

  // Floating dust and a few distant birds.
  if (detail) {
    const count = 90;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 36;
      positions[index * 3 + 1] = -3 + Math.random() * 14;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const dust = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: "#f5dfb4", size: 0.07, transparent: true, opacity: 0.6, depthWrite: false })
    );
    stage.trackGeometry(geometry);
    stage.add(dust);
    stage.animate((time) => {
      if (stage.reducedMotion) return;
      dust.rotation.y = time * 0.006;
      dust.position.y = Math.sin(time * 0.13) * 0.3;
    });
  }

  for (let index = 0; index < 2; index += 1) {
    const flying = bird(-8 + index * 15, 8 + index, -10 + index * 5, "#2b2b2b");
    stage.add(flying);
    stage.animate((time, delta) => {
      if (stage.reducedMotion) return;
      flying.position.x += delta * 0.6;
      flying.position.y = 8 + Math.sin(time * 0.7 + index) * 0.35;
      if (flying.position.x > 18) flying.position.x = -18;
    });
  }

  const halo = new THREE.PointLight("#ffbd75", 2.2, 26, 2);
  halo.position.set(0, 5, 4);
  scene.add(halo);

  return { objectId: "overview" };
}
