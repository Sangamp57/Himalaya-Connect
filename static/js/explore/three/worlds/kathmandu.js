import * as THREE from "three";
import {
  addLighting,
  addSun,
  bird,
  brickTexture,
  cloud,
  colors,
  createSky,
  mountain,
  pavingTexture,
  pine,
  tileTexture,
  tree,
  woodTexture,
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

function roof(stage, radius, height, material, x, y, z, rotation = Math.PI / 4) {
  const cone = mesh(stage, new THREE.ConeGeometry(radius, height, 4), material, x, y, z);
  cone.rotation.y = rotation;
  return cone;
}

function person(stage, x, z, jacketColor, pantsColor, scale = 1, phase = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const jacket = stage.material(jacketColor, { roughness: 0.92 });
  const pants = stage.material(pantsColor, { roughness: 0.95 });
  const skin = stage.material("#b97b55", { roughness: 0.9 });
  const body = mesh(stage, new THREE.CapsuleGeometry(0.24 * scale, 0.62 * scale, 3, 8), jacket, 0, 0.9 * scale, 0);
  body.scale.z = 0.72;
  group.add(body);
  const legs = mesh(stage, new THREE.CylinderGeometry(0.16 * scale, 0.13 * scale, 0.72 * scale, 6), pants, 0, 0.4 * scale, 0);
  group.add(legs);
  const head = mesh(stage, new THREE.SphereGeometry(0.21 * scale, 10, 8), skin, 0, 1.46 * scale, 0);
  group.add(head);
  const cap = mesh(stage, new THREE.CylinderGeometry(0.2 * scale, 0.22 * scale, 0.16 * scale, 10), jacket, 0, 1.64 * scale, 0);
  group.add(cap);
  stage.animate((time) => {
    if (stage.reducedMotion) return;
    group.position.y = Math.sin(time * 1.1 + phase) * 0.018;
    head.rotation.y = Math.sin(time * 0.35 + phase) * 0.22;
  });
  return group;
}

function newariHouse(stage, { x, z, rotation, width = 5, depth = 4.4, floors = 3, brickMap, timberMap, roofMap, accent = "#8a3a29" }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const floorHeight = 2.55;
  const bodyHeight = floorHeight * floors;
  const wallMaterial = stage.material("#ffffff", { map: brickMap, roughness: 0.95 });
  const sideMaterial = stage.material(accent, { roughness: 0.98 });
  const timber = stage.material("#ffffff", { map: timberMap, roughness: 0.9 });
  const darkTimber = stage.material(colors.timber, { roughness: 0.92 });
  const glass = stage.material("#1d2c2e", { roughness: 0.35, metalness: 0.05 });
  const roofMaterial = stage.material("#ffffff", { map: roofMap, roughness: 0.9 });
  const body = mesh(stage, new THREE.BoxGeometry(width, bodyHeight, depth), wallMaterial, 0, bodyHeight / 2, 0);
  group.add(body);
  const plinth = mesh(stage, new THREE.BoxGeometry(width + 0.55, 0.55, depth + 0.35), stage.material("#7f6d5f", { roughness: 1 }), 0, 0.28, 0);
  group.add(plinth);

  for (let floor = 0; floor < floors; floor += 1) {
    const y = floor * floorHeight;
    const beam = mesh(stage, new THREE.BoxGeometry(width + 0.35, 0.2, 0.2), timber, 0, y + 0.22, depth / 2 + 0.1);
    group.add(beam);
    const beamBack = beam.clone();
    beamBack.position.z = -depth / 2 - 0.1;
    group.add(beamBack);
    const frontWindow = mesh(stage, new THREE.BoxGeometry(1.2, 1.15, 0.12), glass, -width * 0.24, y + 1.42, depth / 2 + 0.04);
    group.add(frontWindow);
    const windowFrame = mesh(stage, new THREE.BoxGeometry(1.48, 1.4, 0.1), timber, -width * 0.24, y + 1.42, depth / 2 + 0.09);
    group.add(windowFrame);
    const inner = mesh(stage, new THREE.BoxGeometry(1.18, 1.12, 0.12), glass, -width * 0.24, y + 1.42, depth / 2 + 0.15);
    group.add(inner);
    if (floor > 0) {
      const upperWindow = mesh(stage, new THREE.BoxGeometry(1.1, 1.1, 0.18), glass, width * 0.25, y + 1.4, depth / 2 + 0.08);
      group.add(upperWindow);
      group.add(
        mesh(stage, new THREE.BoxGeometry(1.05, 1.05, 0.1), stage.material(colors.timberLight, { roughness: 0.9 }), width * 0.25, y + 1.4, depth / 2 + 0.22)
      );
      group.add(
        mesh(stage, new THREE.BoxGeometry(0.82, 0.82, 0.12), glass, width * 0.25, y + 1.4, depth / 2 + 0.3)
      );
    }
    const sill = mesh(stage, new THREE.BoxGeometry(width * 0.7, 0.12, 0.3), darkTimber, 0, y + 0.66, depth / 2 + 0.11);
    group.add(sill);
  }

  const roofMesh = mesh(stage, new THREE.ConeGeometry(Math.max(width, depth) * 0.82, 1.75, 4), roofMaterial, 0, bodyHeight + 0.7, 0);
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.scale.z = depth / width;
  group.add(roofMesh);
  const roofRidge = mesh(stage, new THREE.BoxGeometry(0.3, 0.35, depth * 0.62), stage.material(colors.gold, { metalness: 0.2, roughness: 0.55 }), 0, bodyHeight + 1.35, 0);
  group.add(roofRidge);
  for (let index = 0; index < 3; index += 1) {
    const beam = mesh(stage, new THREE.BoxGeometry(0.18, 0.18, depth + 0.4), timber, -width * 0.35 + index * 1.1, bodyHeight - 0.05, 0);
    group.add(beam);
  }
  return group;
}

function buildTemple(stage, x, z, tileMap) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const stone = stage.material("#8d7560", { roughness: 0.98 });
  const stoneDark = stage.material("#6f5b4a", { roughness: 1 });
  const brick = stage.material(colors.brick, { roughness: 0.95 });
  const timber = stage.material(colors.timber, { roughness: 0.9 });
  const roofMaterial = stage.material("#ffffff", { map: tileMap, roughness: 0.86 });
  const gold = stage.material("#d5a03d", { metalness: 0.45, roughness: 0.35, flatShading: true });
  const widths = [8.6, 7.6, 6.6, 5.5, 4.4];
  widths.forEach((width, index) => {
    const platform = mesh(stage, new THREE.BoxGeometry(width, 0.7, width), index % 2 ? stone : stoneDark, 0, 0.35 + index * 0.7, 0);
    group.add(platform);
  });
  const stair = mesh(stage, new THREE.BoxGeometry(2.3, 0.28, 6.8), stone, 0, 0.22, 4.4);
  group.add(stair);
  for (let step = 0; step < 8; step += 1) {
    const stairStep = mesh(stage, new THREE.BoxGeometry(2.2, 0.16, 0.76), stoneDark, 0, 0.36 + step * 0.48, 7.2 - step * 0.42);
    group.add(stairStep);
  }
  const guardianPositions = [-3.5, -2.2, 2.2, 3.5];
  guardianPositions.forEach((gx, index) => {
    const guardian = new THREE.Group();
    const body = mesh(stage, new THREE.BoxGeometry(0.55, 0.8, 0.55), stone, 0, 0.4, 0);
    guardian.add(body);
    const head = mesh(stage, new THREE.SphereGeometry(0.26, 8, 6), stoneDark, 0, 0.95, 0);
    guardian.add(head);
    guardian.position.set(gx, 1.3, 4.9 - (index > 1 ? 0.7 : 0));
    group.add(guardian);
  });
  const bodyHeight = 5.6;
  const core = mesh(stage, new THREE.BoxGeometry(3.6, bodyHeight, 3.6), brick, 0, 4.2 + bodyHeight / 2, 0);
  group.add(core);
  for (let index = 0; index < 4; index += 1) {
    const pillar = mesh(stage, new THREE.CylinderGeometry(0.2, 0.24, 3.2, 8), timber, -1.35 + index * 0.9, 7.7, 2.2);
    group.add(pillar);
  }
  let y = 8.95;
  [7.8, 6.4, 5.1, 3.8, 2.7].forEach((radius, index) => {
    const roofMesh = mesh(stage, new THREE.ConeGeometry(radius, 1.75 - index * 0.12, 4), roofMaterial, 0, y, 0);
    roofMesh.rotation.y = Math.PI / 4;
    group.add(roofMesh);
    const eave = mesh(stage, new THREE.BoxGeometry(radius * 1.42, 0.13, radius * 1.42), timber, 0, y - 0.8, 0);
    group.add(eave);
    y += 0.9;
  });
  const finial = mesh(stage, new THREE.ConeGeometry(0.23, 1.6, 8), gold, 0, 14.25, 0);
  group.add(finial);
  const finialBall = mesh(stage, new THREE.SphereGeometry(0.3, 10, 8), gold, 0, 15.02, 0);
  group.add(finialBall);
  return group;
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

export default function buildKathmandu({ scene, stage }) {
  const detail = stage.quality !== "low";
  createSky(scene, {
    top: "#183a5a",
    bottom: "#f1c382",
    fog: "#d9bc94",
    near: 40,
    far: 108,
  });
  addLighting(scene, { shadows: detail, sun: [16, 26, 12], intensity: 2.4, ambient: 1.4 });
  addSun(scene, { position: [-34, 24, -42], size: 4.8, color: "#ffd9a1" });

  const brickMap = stage.trackTexture(brickTexture("#a44f37", "#71392d", [3, 3]));
  const timberMap = stage.trackTexture(woodTexture("#69402a", "#3e2416", [2, 3]));
  const tileMap = stage.trackTexture(tileTexture("#a04c35", "#71372b", [4, 4]));
  const pavingMap = stage.trackTexture(pavingTexture("#a89273", "#786650", [7, 7]));

  const groundMaterial = stage.material("#ffffff", { map: pavingMap, roughness: 0.96 });
  const ground = box(stage, 44, 0.8, 38, groundMaterial, 0, -0.4, 0);
  ground.receiveShadow = true;
  stage.add(ground);

  const street = box(stage, 8.2, 0.06, 33, stage.material("#907c63", { roughness: 0.98 }), 0, 0.02, 2);
  stage.add(street);
  const streetEdge = box(stage, 1.2, 0.08, 33, stage.material("#6d5641", { roughness: 1 }), -4.9, 0.02, 2);
  stage.add(streetEdge);
  const streetEdgeRight = streetEdge.clone();
  streetEdgeRight.position.x = 4.9;
  stage.add(streetEdgeRight);

  const hillMaterial = stage.material("#6c6b5e", { roughness: 1 });
  const backHill = box(stage, 52, 2.4, 11, hillMaterial, 0, -0.6, -22);
  stage.add(backHill);

  const mountainPalette = ["#415a70", "#506a7d", "#5d7487"];
  const ranges = [
    [-22, -29, 13, 15, 0],
    [-12, -32, 19, 17, 1],
    [2, -34, 22, 20, 2],
    [15, -31, 16, 14, 0],
    [26, -29, 12, 12, 1],
  ];
  ranges.forEach(([x, z, height, radius, paletteIndex], index) => {
    const peak = mountain(height, radius, mountainPalette[paletteIndex], "#f2eee4", 0.3, detail ? 7 : 5);
    peak.position.set(x, 0.5, z);
    peak.rotation.y = index * 0.8;
    stage.add(peak);
  });

  const houseSpecs = [
    { x: -11.5, z: -10, rotation: Math.PI / 2, width: 5.6, depth: 4.6, floors: 3, accent: "#81372a" },
    { x: -11.4, z: -3.2, rotation: Math.PI / 2, width: 5.2, depth: 4.2, floors: 2, accent: "#9a4b33" },
    { x: -11.7, z: 8.7, rotation: Math.PI / 2, width: 5.4, depth: 4.4, floors: 3, accent: "#74382e" },
    { x: 11.6, z: -9.6, rotation: -Math.PI / 2, width: 5.4, depth: 4.4, floors: 3, accent: "#8d4230" },
    { x: 11.4, z: -2.8, rotation: -Math.PI / 2, width: 5.0, depth: 4.0, floors: 2, accent: "#78362a" },
    { x: 11.8, z: 10.4, rotation: -Math.PI / 2, width: 5.8, depth: 4.6, floors: 3, accent: "#9b4a35" },
  ];
  houseSpecs.forEach((spec) => {
    stage.add(newariHouse(stage, { ...spec, brickMap, timberMap, roofMap: tileMap }));
  });

  const backHouses = [
    { x: -8, z: -15.5, rotation: 0, width: 6, depth: 4.5, floors: 2, accent: "#8d4a35" },
    { x: 8, z: -15.5, rotation: 0, width: 6.2, depth: 4.6, floors: 3, accent: "#743b2d" },
  ];
  backHouses.forEach((spec) => stage.add(newariHouse(stage, { ...spec, brickMap, timberMap, roofMap: tileMap })));

  const temple = buildTemple(stage, 0, -12.2, tileMap);
  stage.add(temple);
  stage.addInteractive("ne-temple", temple, {
    label: "Nyatapola",
    accent: "#e6bc6a",
    focus: [0, 6.4, -10.4],
    radius: 31,
    beaconPosition: [0, 0.2, -6.7],
    labelOffset: 1.1,
  });

  const momo = buildMomoStall(stage);
  stage.add(momo);
  stage.addInteractive("ne-momo", momo, {
    label: "Momo",
    accent: "#e6bc6a",
    focus: [9.5, 1.3, 5.8],
    radius: 8.2,
    beaconPosition: [9.5, 0.15, 7.25],
  });

  const topi = buildTopiStall(stage);
  stage.add(topi);
  stage.addInteractive("ne-topi", topi, {
    label: "Dhaka topi",
    accent: "#e6bc6a",
    focus: [-9.8, 1.4, 2.2],
    radius: 8.0,
    beaconPosition: [-8.9, 0.15, 3.8],
  });

  const madal = buildMadalSpot(stage);
  stage.add(madal);
  stage.addInteractive("ne-madal", madal, {
    label: "Madal",
    accent: "#e6bc6a",
    focus: [3.6, 0.9, 2.6],
    radius: 7.3,
    beaconPosition: [3.6, 0.12, 3.7],
  });

  const garland = buildGarlandStall(stage);
  stage.add(garland);
  stage.addInteractive("ne-marigold", garland, {
    label: "Marigold",
    accent: "#e6bc6a",
    focus: [-4.5, 1.4, 6.6],
    radius: 7.5,
    beaconPosition: [-4.5, 0.1, 8.0],
  });

  const lokta = buildLoktaWorkshop(stage);
  stage.add(lokta);
  stage.addInteractive("ne-lokta", lokta, {
    label: "Lokta paper",
    accent: "#e6bc6a",
    focus: [9.2, 1.5, -2.4],
    radius: 8.0,
    beaconPosition: [8.0, 0.12, -1.3],
  });

  const hiti = buildHiti(stage);
  stage.add(hiti);
  stage.addInteractive("ne-hiti", hiti, {
    label: "Hiti",
    accent: "#e6bc6a",
    focus: [-5.4, 1.0, -4.4],
    radius: 7.2,
    beaconPosition: [-5.4, 0.1, -2.9],
    labelOffset: 1.2,
  });

  // The carved window is mounted on the façade of the left row.
  const windowGroup = new THREE.Group();
  windowGroup.position.set(-8.85, 3.2, -3.2);
  windowGroup.rotation.y = Math.PI / 2;
  const windowWood = stage.material("#5e3622", { roughness: 0.85 });
  const windowLight = stage.material("#8d5a33", { roughness: 0.9 });
  const windowDark = stage.material("#241b17", { roughness: 0.8 });
  const windowFrameGroup = new THREE.Group();
  windowFrameGroup.add(
    (() => {
      const backPanel = box(stage, 3.5, 2.6, 0.22, windowDark, 0, 0, 0);
      return backPanel;
    })()
  );
  windowGroup.add(windowFrameGroup);
  const frame = box(stage, 3.8, 2.9, 0.24, windowWood, 0, 0, 0);
  windowGroup.add(frame);
  const innerFrame = box(stage, 3.15, 2.25, 0.2, windowLight, 0, 0, 0.18);
  windowGroup.add(innerFrame);
  const latticeMaterial = stage.material("#d5a04d", { roughness: 0.75 });
  for (let index = 0; index < 5; index += 1) {
    windowGroup.add(box(stage, 0.07, 2.0, 0.12, latticeMaterial, -1.1 + index * 0.55, 0, 0.33));
  }
  for (let index = 0; index < 3; index += 1) {
    windowGroup.add(box(stage, 2.6, 0.07, 0.12, latticeMaterial, 0, -0.68 + index * 0.68, 0.33));
  }
  const carve = box(stage, 0.85, 2.2, 0.16, windowWood, -1.7, 0, 0.28);
  carve.rotation.z = 0.08;
  windowGroup.add(carve);
  const peacock = mesh(stage, new THREE.SphereGeometry(0.3, 8, 6), latticeMaterial, 1.35, 0.95, 0.35);
  peacock.scale.set(1, 1.3, 0.25);
  windowGroup.add(peacock);
  stage.add(windowGroup);
  stage.addInteractive("ne-window", windowGroup, {
    label: "Carved window",
    accent: "#e6bc6a",
    focus: [-8.5, 3.4, -3.2],
    radius: 6.9,
    beaconPosition: [-8.0, 0.14, -3.2],
    labelOffset: 0.45,
  });

  // Market clutter and daily life.
  const sackMaterial = stage.material("#b48a53", { roughness: 0.98 });
  const potMaterial = stage.material("#8c5432", { roughness: 0.9 });
  const brassMaterial = stage.material("#b28337", { metalness: 0.25, roughness: 0.5 });
  for (let index = 0; index < 8; index += 1) {
    const x = index < 4 ? -7.2 + (index % 2) * 0.9 : 6.2 + (index % 2) * 0.8;
    const z = 12.4 - Math.floor(index / 2) * 1.1;
    const sack = mesh(stage, new THREE.DodecahedronGeometry(0.38, 0), sackMaterial, x, 0.38, z);
    sack.scale.y = 0.8;
    stage.add(sack);
  }
  for (let index = 0; index < 4; index += 1) {
    const pot = mesh(stage, new THREE.SphereGeometry(0.25, 10, 8), potMaterial, -7.8, 0.45, 3.4 - index * 0.55);
    pot.scale.y = 1.2;
    stage.add(pot);
  }
  const brassPot = mesh(stage, new THREE.SphereGeometry(0.34, 12, 8), brassMaterial, 7.2, 0.55, 1.0);
  brassPot.scale.y = 1.25;
  stage.add(brassPot);

  const treeA = tree(-6.2, -8.2, 1.15, "#4f7757", "#e7a9a0");
  const treeB = tree(7.2, -7.1, 0.92, "#547655", "#e6b7b0");
  const treeC = pine(-14.2, 3.8, 0.78, "#385d50");
  stage.add(treeA, treeB, treeC);

  // Prayer flag strings across the lane.
  const flagColors = ["#bd3e32", "#d4a03c", "#2e7762", "#4b88a6", "#e7d7ad"];
  for (let line = 0; line < 2; line += 1) {
    const lineGroup = new THREE.Group();
    const z = -1 + line * 9;
    const start = new THREE.Vector3(-9.2, 6.7, z);
    const end = new THREE.Vector3(9.2, 6.1, z + 1.2);
    for (let index = 0; index < 11; index += 1) {
      const t = index / 10;
      const point = start.clone().lerp(end, t);
      point.y -= Math.sin(t * Math.PI) * 0.55;
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.58, 0.75),
        new THREE.MeshStandardMaterial({
          color: flagColors[index % flagColors.length],
          side: THREE.DoubleSide,
          roughness: 0.9,
        })
      );
      stage.trackGeometry(flag.geometry);
      flag.position.copy(point);
      flag.rotation.y = 0.2;
      lineGroup.add(flag);
      stage.animate((time) => {
        if (!stage.reducedMotion) flag.rotation.z = Math.sin(time * 1.8 + index) * 0.09;
      });
    }
    stage.add(lineGroup);
  }

  const people = [
    person(stage, 2.8, 8.0, "#b03d2f", "#293c46", 0.95, 0.2),
    person(stage, -2.3, 5.0, "#296b57", "#60462e", 0.86, 1.3),
    person(stage, 7.8, 3.3, "#d2a243", "#3e4b55", 0.9, 2.4),
    person(stage, -7.0, 11.0, "#7f3f77", "#33434a", 0.8, 3.2),
  ];
  people.forEach((figure) => stage.add(figure));

  const clouds = [];
  for (let index = 0; index < (detail ? 6 : 3); index += 1) {
    const cloudGroup = cloud(1.2 + (index % 3) * 0.4);
    cloudGroup.position.set(-22 + index * 9, 12 + (index % 3) * 1.7, -34 - (index % 2) * 8);
    stage.add(cloudGroup);
    clouds.push({ mesh: cloudGroup, speed: 0.12 + index * 0.025, x: cloudGroup.position.x });
  }
  stage.animate((time, delta) => {
    if (stage.reducedMotion) return;
    clouds.forEach((item) => {
      item.mesh.position.x += item.speed * delta;
      if (item.mesh.position.x > 30) item.mesh.position.x = -34;
    });
  });

  for (let index = 0; index < (detail ? 3 : 1); index += 1) {
    const flying = bird(-8 + index * 7, 13 + index, -16 + index * 4);
    stage.add(flying);
    stage.animate((time, delta) => {
      if (stage.reducedMotion) return;
      flying.position.x += delta * (0.6 + index * 0.15);
      flying.position.y = 13 + Math.sin(time * 0.7 + index) * 0.35;
      if (flying.position.x > 24) flying.position.x = -24;
    });
  }

  const haze = new THREE.PointLight("#ffbd72", 3, 18, 2);
  haze.position.set(0, 3, 9);
  scene.add(haze);

  return { objectId: "kathmandu" };
}
