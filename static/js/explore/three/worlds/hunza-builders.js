import * as THREE from "three";
import { colors } from "../helpers.js";

export function mesh(stage, geometry, material, x = 0, y = 0, z = 0) {
  stage.trackGeometry(geometry);
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

export function box(stage, w, h, d, material, x, y, z) {
  return mesh(stage, new THREE.BoxGeometry(w, h, d), material, x, y, z);
}

export function cylinder(stage, rt, rb, h, segments, material, x, y, z) {
  return mesh(stage, new THREE.CylinderGeometry(rt, rb, h, segments), material, x, y, z);
}

export function sphere(stage, radius, mat, x, y, z, detail = 1) {
  return mesh(stage, new THREE.IcosahedronGeometry(radius, detail), mat, x, y, z);
}

export function person(stage, x, z, jacketColor, pantsColor, scale = 1, phase = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const jacket = stage.material(jacketColor, { roughness: 0.92 });
  const pants = stage.material(pantsColor, { roughness: 0.95 });
  const skin = stage.material("#b97b55", { roughness: 0.9 });
  const body = mesh(stage, new THREE.CapsuleGeometry(0.24 * scale, 0.62 * scale, 3, 8), jacket, 0, 0.9 * scale, 0);
  body.scale.z = 0.72;
  group.add(body);
  group.add(mesh(stage, new THREE.CylinderGeometry(0.16 * scale, 0.13 * scale, 0.72 * scale, 6), pants, 0, 0.4 * scale, 0));
  group.add(mesh(stage, new THREE.SphereGeometry(0.21 * scale, 10, 8), skin, 0, 1.46 * scale, 0));
  const cap = mesh(stage, new THREE.CylinderGeometry(0.22 * scale, 0.27 * scale, 0.2 * scale, 10), jacket, 0, 1.63 * scale, 0);
  group.add(cap);
  stage.animate((time) => {
    if (stage.reducedMotion) return;
    group.position.y = Math.sin(time * 1.05 + phase) * 0.018;
    cap.rotation.z = Math.sin(time * 0.3 + phase) * 0.04;
  });
  return group;
}

export function hamletHouse(stage, x, z, stoneMap, timberMap, scale = 0.8) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const stone = stage.material("#ffffff", { map: stoneMap, roughness: 1 });
  const timber = stage.material("#ffffff", { map: timberMap, roughness: 0.92 });
  const dark = stage.material("#2d231c", { roughness: 0.9 });
  group.add(box(stage, 3.2 * scale, 2.0 * scale, 2.7 * scale, stone, 0, 1.0 * scale, 0));
  group.add(box(stage, 3.5 * scale, 0.16, 3.0 * scale, timber, 0, 2.05 * scale, 0));
  group.add(box(stage, 0.7 * scale, 1.35 * scale, 0.1, dark, -0.7 * scale, 0.68 * scale, 1.38 * scale));
  group.add(box(stage, 0.6 * scale, 0.55 * scale, 0.1, dark, 0.7 * scale, 1.2 * scale, 1.38 * scale));
  group.add(box(stage, 0.8 * scale, 0.7 * scale, 0.08, timber, 0.7 * scale, 1.2 * scale, 1.33 * scale));
  group.add(box(stage, 0.9 * scale, 0.25 * scale, 0.6 * scale, timber, 0, 2.0 * scale, 1.2 * scale));
  return group;
}

export function goat(stage, x, z, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const fur = stage.material("#d8cdb8", { roughness: 1 });
  const dark = stage.material("#5e5146", { roughness: 1 });
  const body = sphere(stage, 0.52 * scale, fur, 0, 0.75 * scale, 0);
  body.scale.set(1.3, 0.85, 0.72);
  group.add(body);
  const head = sphere(stage, 0.28 * scale, fur, 0.72 * scale, 1.02 * scale, 0);
  head.scale.set(1, 0.9, 0.8);
  group.add(head);
  [-0.35, 0.35].forEach((offset) => {
    const leg = cylinder(stage, 0.07 * scale, 0.05 * scale, 0.7 * scale, 5, dark, offset * scale, 0.35 * scale, 0.22 * scale);
    group.add(leg);
    const legB = leg.clone();
    legB.position.z = -0.22 * scale;
    group.add(legB);
  });
  const horn = mesh(stage, new THREE.ConeGeometry(0.06 * scale, 0.35 * scale, 5), dark, 0.72 * scale, 1.3 * scale, 0);
  horn.rotation.z = -0.4;
  group.add(horn);
  stage.animate((time) => {
    if (!stage.reducedMotion) head.rotation.y = Math.sin(time * 0.7 + x) * 0.18;
  });
  return group;
}

export function buildFort(stage, x, z, stoneMap, timberMap) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const stone = stage.material("#ffffff", { map: stoneMap, roughness: 0.98 });
  const darkStone = stage.material("#83776a", { roughness: 1 });
  const timber = stage.material("#ffffff", { map: timberMap, roughness: 0.92 });
  const darkTimber = stage.material("#4c3020", { roughness: 0.95 });
  const glass = stage.material("#1b2529", { roughness: 0.45 });

  const hill = mesh(stage, new THREE.CylinderGeometry(8.2, 11.8, 4.2, 9), stage.material("#726b5d", { roughness: 1 }), 0, 2.1, 0);
  hill.receiveShadow = true;
  group.add(hill);
  const hillTop = mesh(stage, new THREE.CylinderGeometry(7.8, 8.2, 0.5, 9), stage.material("#7f7a63", { roughness: 1 }), 0, 4.35, 0);
  group.add(hillTop);

  const base = box(stage, 9, 3.1, 7.2, stone, 0, 6.0, 0);
  group.add(base);
  const upper = box(stage, 6.4, 3.0, 5.4, stone, -0.6, 9.0, -0.2);
  group.add(upper);
  const tower = box(stage, 2.8, 5.1, 2.8, stone, 2.9, 10.1, -1.3);
  group.add(tower);
  const towerTop = mesh(stage, new THREE.ConeGeometry(2.2, 1.4, 4), darkStone, 2.9, 13.2, -1.3);
  towerTop.rotation.y = Math.PI / 4;
  group.add(towerTop);
  const roof = box(stage, 9.5, 0.4, 7.7, darkTimber, 0, 7.65, 0);
  group.add(roof);
  const roofUpper = box(stage, 6.8, 0.35, 5.8, darkTimber, -0.6, 10.55, -0.2);
  group.add(roofUpper);

  for (let index = 0; index < 7; index += 1) {
    const beam = box(stage, 0.18, 0.18, 7.7, timber, -3.6 + index * 1.2, 7.3, 0);
    group.add(beam);
  }

  // Wooden balcony and windows.
  const balcony = box(stage, 6.8, 0.25, 1.1, timber, -0.6, 8.1, 2.95);
  group.add(balcony);
  for (let index = 0; index < 5; index += 1) {
    group.add(box(stage, 0.12, 1.0, 0.12, darkTimber, -3.4 + index * 1.4, 8.7, 3.42));
  }
  group.add(box(stage, 6.8, 0.12, 0.12, darkTimber, -0.6, 9.2, 3.42));
  [-2.1, 0.4, 2.4].forEach((wx) => {
    group.add(box(stage, 0.75, 1.0, 0.16, glass, wx, 9.0, 2.5));
    group.add(box(stage, 0.98, 1.22, 0.12, timber, wx, 9.0, 2.42));
  });
  const door = box(stage, 1.45, 2.1, 0.2, darkTimber, 0.6, 5.15, 3.6);
  group.add(door);
  const doorArch = mesh(stage, new THREE.CircleGeometry(0.72, 12), darkTimber, 0.6, 6.2, 3.62);
  group.add(doorArch);

  // Small flags and lamps.
  const flagMaterial = stage.material("#c6a14e", { roughness: 0.8, side: THREE.DoubleSide });
  const flagPole = box(stage, 0.08, 3.6, 0.08, darkTimber, 4.4, 8.8, 1.0);
  group.add(flagPole);
  const flag = mesh(stage, new THREE.PlaneGeometry(1.25, 0.7), flagMaterial, 5.0, 10.2, 1.0);
  group.add(flag);
  stage.animate((time) => {
    if (!stage.reducedMotion) flag.rotation.y = 0.15 + Math.sin(time * 1.6) * 0.12;
  });
  [-2.5, 2.6].forEach((lx) => {
    const lamp = sphere(stage, 0.16, stage.material("#f1bd63", { emissive: new THREE.Color("#b86e20"), emissiveIntensity: 0.8 }), lx, 8.0, 3.45);
    group.add(lamp);
  });
  return group;
}

export function buildEmbroideredStall(stage) {
  const group = new THREE.Group();
  group.position.set(-5.4, 0, 6.6);
  group.rotation.y = 0.2;
  const wood = stage.material("#60442f", { roughness: 0.9 });
  group.add(box(stage, 3.1, 0.9, 1.2, wood, 0, 0.45, 0));
  group.add(box(stage, 3.3, 0.12, 1.5, stage.material("#cdb384", { roughness: 0.9 }), 0, 0.94, 0));
  [-1.45, 1.45].forEach((x) => group.add(box(stage, 0.1, 3.2, 0.1, wood, x, 1.6, -0.55)));
  group.add(box(stage, 3.4, 0.12, 1.6, stage.material("#7a3d2e", { roughness: 0.9 }), 0, 3.2, 0.15));
  const cloths = [
    ["#9c3f36", "#e2b35b"],
    ["#2d6a58", "#e3d6bf"],
    ["#485d86", "#d99a58"],
    ["#8a4f82", "#e9d7b0"],
  ];
  cloths.forEach(([base, trim], index) => {
    const cloth = box(stage, 0.62, 1.8, 0.05, stage.material(base, { roughness: 0.92 }), -1.05 + index * 0.7, 2.15, 0.9);
    group.add(cloth);
    for (let stripe = 0; stripe < 3; stripe += 1) {
      const trimMesh = box(stage, 0.62, 0.055, 0.045, stage.material(trim, { roughness: 0.85 }), -1.05 + index * 0.7, 1.45 + stripe * 0.55, 0.94);
      group.add(trimMesh);
    }
  });
  for (let index = 0; index < 3; index += 1) {
    const folded = box(stage, 0.7, 0.14, 0.55, stage.material(cloths[index][0], { roughness: 0.9 }), -0.8 + index * 0.8, 1.05, 0.25);
    group.add(folded);
  }
  const mannequin = new THREE.Group();
  mannequin.position.set(0.8, 1.0, -0.2);
  mannequin.add(mesh(stage, new THREE.CylinderGeometry(0.18, 0.32, 1.1, 8), stage.material("#b14b3e", { roughness: 0.9 }), 0, 0.8, 0));
  mannequin.add(mesh(stage, new THREE.SphereGeometry(0.19, 8, 6), stage.material("#d7b18d", { roughness: 0.9 }), 0, 1.5, 0));
  group.add(mannequin);
  return group;
}

export function buildApricotStall(stage) {
  const group = new THREE.Group();
  group.position.set(2.1, 0, 8.6);
  group.rotation.y = -0.18;
  const wood = stage.material("#684a32", { roughness: 0.92 });
  group.add(box(stage, 2.9, 0.85, 1.2, wood, 0, 0.42, 0));
  group.add(box(stage, 3.1, 0.12, 1.45, stage.material("#c6aa75", { roughness: 0.9 }), 0, 0.9, 0));
  [-1.3, 1.3].forEach((x) => group.add(box(stage, 0.1, 2.6, 0.1, wood, x, 1.3, -0.5)));
  group.add(box(stage, 3.2, 0.1, 1.5, stage.material("#3d6e58", { roughness: 0.9 }), 0, 2.6, 0));
  const apricot = stage.material("#e49a36", { roughness: 0.72 });
  const apricotDeep = stage.material("#c25f2e", { roughness: 0.72 });
  for (let basket = 0; basket < 4; basket += 1) {
    const bx = -1.0 + basket * 0.68;
    const basketMesh = cylinder(stage, 0.3, 0.24, 0.24, 10, stage.material("#9e7546", { roughness: 0.98 }), bx, 1.1, 0.1);
    group.add(basketMesh);
    for (let fruit = 0; fruit < 5; fruit += 1) {
      group.add(sphere(stage, 0.1, fruit % 2 ? apricot : apricotDeep, bx + (fruit - 2) * 0.07, 1.27 + (fruit % 2) * 0.03, 0.1 + (fruit % 2) * 0.08, 0));
    }
  }
  const tray = box(stage, 1.5, 0.08, 0.8, stage.material("#d4b479", { roughness: 0.95 }), 0.4, 1.18, 0.0);
  group.add(tray);
  for (let index = 0; index < 12; index += 1) {
    const half = sphere(stage, 0.07, index % 3 === 0 ? apricotDeep : apricot, -0.2 + (index % 4) * 0.24, 1.25, -0.23 + Math.floor(index / 4) * 0.22, 0);
    half.scale.y = 0.5;
    group.add(half);
  }
  group.add(box(stage, 0.85, 0.5, 0.08, stage.material("#e6d1a4", { roughness: 0.9 }), -0.3, 1.35, 0.72));
  return group;
}

export function buildCraftWorkshop(stage) {
  const group = new THREE.Group();
  group.position.set(8.4, 0, 1.6);
  group.rotation.y = -0.7;
  const wood = stage.material("#66442e", { roughness: 0.92 });
  const stone = stage.material("#81776a", { roughness: 1 });
  group.add(box(stage, 4.2, 2.9, 3.3, stone, 0, 1.45, 0));
  group.add(box(stage, 4.5, 0.3, 3.6, wood, 0, 3.05, 0));
  const door = box(stage, 1.2, 2.0, 0.14, stage.material("#2b211b", { roughness: 0.9 }), 0, 1.0, 1.69);
  group.add(door);
  group.add(box(stage, 3.9, 0.18, 1.0, wood, 0, 1.15, 2.1));
  const loom = new THREE.Group();
  loom.position.set(0.7, 0, 2.35);
  loom.add(box(stage, 1.5, 0.14, 0.1, wood, 0, 1.5, 0));
  loom.add(box(stage, 0.14, 0.1, 1.1, wood, -0.75, 1.5, 0));
  loom.add(box(stage, 0.14, 0.1, 1.1, wood, 0.75, 1.5, 0));
  loom.add(box(stage, 1.2, 0.06, 0.7, stage.material("#b99055", { roughness: 0.9 }), 0, 1.32, 0));
  group.add(loom);
  for (let index = 0; index < 4; index += 1) {
    const wool = sphere(stage, 0.3, stage.material(["#d7c6a4", "#8d6548", "#3e6b58", "#a2473a"][index], { roughness: 1 }), -1.55 + (index % 2) * 0.55, 0.34, 2.45 - Math.floor(index / 2) * 0.55, 0);
    group.add(wool);
  }
  group.add(box(stage, 3.9, 0.08, 0.8, stage.material("#5d3f2a", { roughness: 0.9 }), 0, 2.65, 1.75));
  return group;
}

export function buildVillageHome(stage, stoneMap, timberMap) {
  const group = new THREE.Group();
  group.position.set(-8.0, 0, 3.5);
  group.rotation.y = 0.3;
  const stone = stage.material("#ffffff", { map: stoneMap, roughness: 1 });
  const timber = stage.material("#ffffff", { map: timberMap, roughness: 0.94 });
  const dark = stage.material("#37261b", { roughness: 0.94 });
  group.add(box(stage, 5.4, 2.8, 4.2, stone, 0, 1.4, 0));
  group.add(box(stage, 5.8, 0.28, 4.6, timber, 0, 2.95, 0));
  for (let index = 0; index < 6; index += 1) {
    group.add(box(stage, 0.13, 0.13, 4.5, timber, -2.2 + index * 0.9, 2.75, 0));
  }
  const door = box(stage, 1.2, 2.0, 0.12, dark, 0.6, 1.0, 2.15);
  group.add(door);
  const doorFrame = box(stage, 1.55, 2.25, 0.12, timber, 0.6, 1.1, 2.13);
  group.add(doorFrame);
  const windowMesh = box(stage, 0.9, 0.8, 0.12, dark, -1.45, 1.65, 2.16);
  group.add(windowMesh);
  const windowFrame = box(stage, 1.15, 1.05, 0.11, timber, -1.45, 1.65, 2.15);
  group.add(windowFrame);
  group.add(box(stage, 2.4, 0.35, 0.9, stage.material("#7e5a34", { roughness: 1 }), -1.2, 3.25, 1.1));
  for (let index = 0; index < 8; index += 1) {
    group.add(sphere(stage, 0.07, stage.material(index % 3 === 0 ? "#d27a33" : "#e2a246", { roughness: 0.8 }), -2.0 + index * 0.2, 3.45, 0.9, 0));
  }
  const ladder = new THREE.Group();
  ladder.position.set(2.2, 0, 2.25);
  ladder.rotation.z = -0.18;
  ladder.add(box(stage, 0.12, 3.4, 0.12, timber, -0.25, 1.7, 0));
  ladder.add(box(stage, 0.12, 3.4, 0.12, timber, 0.25, 1.7, 0));
  for (let index = 0; index < 6; index += 1) {
    ladder.add(box(stage, 0.65, 0.07, 0.07, timber, 0, 0.45 + index * 0.52, 0));
  }
  group.add(ladder);
  group.add(cylinder(stage, 0.22, 0.28, 0.45, 8, stage.material("#8c5b39", { roughness: 1 }), -2.4, 0.23, 2.4));
  return group;
}

export function buildWaterChannel(stage) {
  const group = new THREE.Group();
  group.position.set(4.2, 0, -2.8);
  group.rotation.y = -0.18;
  const stone = stage.material("#6e675b", { roughness: 1 });
  const stoneLight = stage.material("#8b8272", { roughness: 1 });
  const water = stage.material("#4f9aac", { transparent: true, opacity: 0.82, roughness: 0.25, metalness: 0.05 });
  for (let index = 0; index < 7; index += 1) {
    group.add(box(stage, 1.15, 0.32, 1.65, index % 2 ? stone : stoneLight, 0, 0.16, -5 + index * 1.62));
    group.add(box(stage, 0.82, 0.08, 1.65, water, 0, 0.33, -5 + index * 1.62));
    [-0.62, 0.62].forEach((x) => {
      group.add(box(stage, 0.12, 0.48, 1.65, stone, x, 0.23, -5 + index * 1.62));
    });
  }
  const wheel = new THREE.Group();
  wheel.position.set(0.1, 1.2, 3.2);
  const wheelRim = mesh(stage, new THREE.TorusGeometry(0.9, 0.1, 6, 18), stage.material("#6f5b3c", { roughness: 0.9 }), 0, 0, 0);
  wheel.add(wheelRim);
  for (let index = 0; index < 6; index += 1) {
    const spoke = box(stage, 0.08, 1.55, 0.08, stage.material("#7d6644", { roughness: 0.9 }), 0, 0, 0);
    spoke.rotation.z = (index / 6) * Math.PI;
    wheel.add(spoke);
  }
  wheel.rotation.y = Math.PI / 2;
  group.add(wheel);
  stage.animate((time) => {
    if (!stage.reducedMotion) wheel.rotation.x = time * 0.6;
  });
  group.add(box(stage, 0.5, 2.1, 0.5, stone, 1.1, 1.05, -5.9));
  return group;
}

export function buildRubabCorner(stage) {
  const group = new THREE.Group();
  group.position.set(-2.4, 0, 1.0);
  group.rotation.y = 0.35;
  const carpet = box(stage, 3.1, 0.05, 2.5, stage.material("#7e3830", { roughness: 0.95 }), 0, 0.03, 0);
  group.add(carpet);
  [colors.gold, "#d5c19b", "#356d5d", "#a94d3d"].forEach((color, index) => {
    group.add(box(stage, 2.7, 0.035, 0.09, stage.material(color, { roughness: 0.9 }), 0, 0.07, -0.86 + index * 0.58));
  });
  const wood = stage.material("#744527", { roughness: 0.75 });
  const skin = stage.material("#d3b184", { roughness: 0.8 });
  const rubab = new THREE.Group();
  rubab.position.set(0.1, 0.55, 0.1);
  rubab.rotation.z = -0.5;
  const body = mesh(stage, new THREE.SphereGeometry(0.45, 12, 10), wood, 0, 0, 0);
  body.scale.set(0.82, 1.0, 0.42);
  rubab.add(body);
  const face = mesh(stage, new THREE.CircleGeometry(0.36, 14), skin, 0, 0.02, 0.18);
  rubab.add(face);
  rubab.add(mesh(stage, new THREE.CylinderGeometry(0.08, 0.12, 1.75, 7), wood, 0, 0.95, 0));
  const pegbox = box(stage, 0.24, 0.45, 0.13, wood, 0, 1.95, 0);
  rubab.add(pegbox);
  for (let index = 0; index < 3; index += 1) {
    const string = mesh(stage, new THREE.CylinderGeometry(0.008, 0.008, 2.3, 4), stage.material("#d8c8a8", { roughness: 0.4 }), -0.06 + index * 0.06, 0.9, 0.16);
    rubab.add(string);
  }
  group.add(rubab);
  const stool = cylinder(stage, 0.3, 0.38, 0.55, 8, wood, 1.1, 0.27, 0.4);
  group.add(stool);
  const musician = person(stage, 1.1, 0.4, "#6f3c6f", "#3d4b55", 0.9, 1.4);
  musician.rotation.y = -0.9;
  group.add(musician);
  return group;
}

export function buildViewpoint(stage) {
  const group = new THREE.Group();
  group.position.set(12.3, 0, -9.8);
  const stone = stage.material("#80796b", { roughness: 1 });
  const wood = stage.material("#6a4a31", { roughness: 0.9 });
  const deck = box(stage, 6.2, 0.6, 4.7, stone, 0, 2.1, 0);
  group.add(deck);
  for (let index = 0; index < 3; index += 1) {
    group.add(box(stage, 5.8, 0.22, 1.4, stone, 0, 0.55 + index * 0.55, 1.6 - index * 0.5));
  }
  for (let index = 0; index < 5; index += 1) {
    group.add(box(stage, 0.14, 1.1, 0.14, wood, -2.6 + index * 1.3, 2.95, 2.2));
  }
  group.add(box(stage, 5.9, 0.12, 0.12, wood, 0, 3.48, 2.2));
  group.add(box(stage, 5.9, 0.12, 0.12, wood, 0, 2.98, 2.2));
  const scope = new THREE.Group();
  scope.position.set(0.8, 3.1, 1.5);
  scope.add(box(stage, 0.16, 1.7, 0.16, wood, 0, 0.85, 0));
  const tube = cylinder(stage, 0.17, 0.22, 0.85, 10, stage.material("#3e4a4e", { metalness: 0.3, roughness: 0.45 }), 0, 1.8, 0.2);
  tube.rotation.x = Math.PI / 2.6;
  scope.add(tube);
  group.add(scope);
  const bench = box(stage, 2.4, 0.18, 0.65, wood, -1.5, 2.55, 0.8);
  group.add(bench);
  return group;
}
