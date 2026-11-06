import * as THREE from "three";
import {
  brickTexture,
  colors,
  makeCanvasTexture,
  pavingTexture,
  tileTexture,
  tree,
  woodTexture,
} from "../helpers.js";
import { buildWalkableTown } from "./walk-town.js";
import { fbm, ss, lerp } from "./walk-engine.js";
import { SKY_PRESETS } from "./yunnan-fx.js";
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

function sphere(stage, radius, mat, x, y, z, detail = 1) {
  return mesh(stage, new THREE.IcosahedronGeometry(radius, detail), mat, x, y, z);
}

function person(stage, x, z, robeColor, capColor, scale = 1, phase = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const robe = stage.material(robeColor, { roughness: 0.95 });
  const skin = stage.material("#b97b55", { roughness: 0.9 });
  const body = mesh(stage, new THREE.CapsuleGeometry(0.24 * scale, 0.8 * scale, 3, 8), robe, 0, 0.95 * scale, 0);
  body.scale.z = 0.72;
  group.add(body);
  group.add(mesh(stage, new THREE.CylinderGeometry(0.15 * scale, 0.12 * scale, 0.7 * scale, 6), stage.material("#3d4b53", { roughness: 1 }), 0, 0.4 * scale, 0));
  group.add(mesh(stage, new THREE.SphereGeometry(0.21 * scale, 10, 8), skin, 0, 1.52 * scale, 0));
  const cap = box(stage, 0.4 * scale, 0.17 * scale, 0.4 * scale, stage.material(capColor, { roughness: 0.95 }), 0, 1.72 * scale, 0);
  group.add(cap);
  stage.animate((time) => {
    if (stage.reducedMotion) return;
    group.position.y = Math.sin(time * 1.1 + phase) * 0.016;
    cap.rotation.y = Math.sin(time * 0.28 + phase) * 0.04;
  });
  return group;
}

function atlasTexture() {
  return makeCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = "#c23b2f";
      ctx.fillRect(0, 0, w, h);
      const colorsList = ["#f0c85b", "#368168", "#ece4cd", "#833c67", "#e2763d"];
      for (let band = 0; band < 6; band += 1) {
        ctx.strokeStyle = colorsList[band % colorsList.length];
        ctx.lineWidth = 12 + (band % 3) * 5;
        ctx.beginPath();
        for (let y = -20; y < h + 20; y += 8) {
          const x = band * 44 + Math.sin(y * 0.035 + band) * 17;
          if (y === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#fff4d2";
      for (let index = 0; index < 70; index += 1) {
        ctx.fillRect((index * 37) % w, (index * 83) % h, 3, 3);
      }
      ctx.globalAlpha = 1;
    },
    { repeat: [1, 2] }
  );
}

function buildHouse(stage, { x, z, rotation = 0, width = 5.4, depth = 4.4, height = 4.5, wallMap, timberMap, roofMap, accent = "#a96e3c" }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const wall = stage.material("#ffffff", { map: wallMap, roughness: 0.96 });
  const trim = stage.material(accent, { roughness: 0.92 });
  const timber = stage.material("#ffffff", { map: timberMap, roughness: 0.9 });
  const dark = stage.material("#281c16", { roughness: 0.86 });
  const roof = stage.material("#ffffff", { map: roofMap, roughness: 0.92 });
  const body = box(stage, width, height, depth, wall, 0, height / 2, 0);
  group.add(body);
  const parapet = box(stage, width + 0.35, 0.38, depth + 0.35, trim, 0, height + 0.1, 0);
  group.add(parapet);
  const roofTop = box(stage, width - 0.3, 0.18, depth - 0.3, roof, 0, height + 0.25, 0);
  group.add(roofTop);
  const band = box(stage, width + 0.1, 0.22, 0.16, trim, 0, height * 0.64, depth / 2 + 0.03);
  group.add(band);
  for (let index = 0; index < 4; index += 1) {
    const beam = box(stage, 0.16, 0.16, depth + 0.5, timber, -width / 2 + 0.8 + index * ((width - 1.6) / 3), height + 0.13, 0);
    group.add(beam);
  }
  const door = box(stage, 1.15, 1.85, 0.12, dark, -width * 0.2, 0.95, depth / 2 + 0.08);
  group.add(door);
  const arch = mesh(stage, new THREE.CircleGeometry(0.58, 14, 0, Math.PI), dark, -width * 0.2, 1.88, depth / 2 + 0.09);
  group.add(arch);
  const doorFrame = box(stage, 1.55, 2.3, 0.14, timber, -width * 0.2, 1.15, depth / 2 + 0.05);
  group.add(doorFrame);
  const doorInner = box(stage, 1.15, 1.88, 0.16, dark, -width * 0.2, 0.96, depth / 2 + 0.15);
  group.add(doorInner);
  const windowDark = box(stage, 1.6, 1.1, 0.13, dark, width * 0.22, height * 0.5, depth / 2 + 0.08);
  group.add(windowDark);
  const lattice = box(stage, 1.82, 1.3, 0.1, timber, width * 0.22, height * 0.5, depth / 2 + 0.13);
  group.add(lattice);
  for (let index = 0; index < 4; index += 1) {
    group.add(box(stage, 0.07, 1.0, 0.08, trim, width * 0.22 - 0.6 + index * 0.4, height * 0.5, depth / 2 + 0.2));
  }
  if (height > 4.1) {
    const balcony = box(stage, width * 0.62, 0.2, 0.9, timber, 0.2, height * 0.76, depth / 2 + 0.45);
    group.add(balcony);
    group.add(box(stage, width * 0.62, 0.08, 0.08, trim, 0.2, height * 0.76 + 0.52, depth / 2 + 0.87));
    for (let index = 0; index < 4; index += 1) {
      group.add(box(stage, 0.07, 0.48, 0.07, trim, -width * 0.26 + index * (width * 0.18), height * 0.76 + 0.28, depth / 2 + 0.87));
    }
  }
  return group;
}

function buildCopperWorkshop(stage, wallMap, timberMap) {
  const group = new THREE.Group();
  group.position.set(-8.9, 0, -1.4);
  group.rotation.y = 1.0;
  const wall = stage.material("#ffffff", { map: wallMap, roughness: 0.97 });
  const wood = stage.material("#ffffff", { map: timberMap, roughness: 0.9 });
  const dark = stage.material("#251b16", { roughness: 0.9 });
  const copper = stage.material("#b86d3a", { metalness: 0.72, roughness: 0.28 });
  const brass = stage.material("#d2a24b", { metalness: 0.55, roughness: 0.35 });
  group.add(box(stage, 4.6, 3.2, 3.4, wall, 0, 1.6, 0));
  group.add(box(stage, 4.9, 0.22, 3.7, wood, 0, 3.25, 0));
  const opening = box(stage, 2.5, 1.8, 0.18, dark, 0, 1.55, 1.72);
  group.add(opening);
  group.add(box(stage, 2.8, 2.05, 0.14, wood, 0, 1.55, 1.68));
  group.add(box(stage, 2.45, 1.75, 0.14, dark, 0, 1.5, 1.74));
  const arch = mesh(stage, new THREE.CircleGeometry(1.22, 16, 0, Math.PI), dark, 0, 2.4, 1.75);
  group.add(arch);
  const workTop = box(stage, 2.8, 0.16, 0.8, wood, 0, 1.26, 2.0);
  group.add(workTop);
  for (let index = 0; index < 4; index += 1) {
    const pot = mesh(stage, new THREE.SphereGeometry(0.18 + index * 0.03, 10, 8), index % 2 ? copper : brass, -1.15 + index * 0.55, 1.06, 2.0);
    pot.scale.y = 1.25;
    group.add(pot);
  }
  const potBig = mesh(stage, new THREE.SphereGeometry(0.52, 14, 10), copper, 0.7, 0.55, 2.45);
  potBig.scale.y = 1.2;
  group.add(potBig);
  group.add(cylinder(stage, 0.18, 0.22, 0.3, 8, brass, 0.7, 1.18, 2.45));
  for (let index = 0; index < 3; index += 1) {
    const plate = cylinder(stage, 0.28 + index * 0.06, 0.28 + index * 0.06, 0.04, 14, index % 2 ? copper : brass, -1.25, 1.35 + index * 0.1, 1.9);
    plate.rotation.x = Math.PI / 2.2;
    group.add(plate);
  }
  group.add(box(stage, 0.7, 0.4, 0.45, dark, 1.45, 0.2, 2.3));
  group.add(box(stage, 0.35, 0.16, 0.16, brass, 1.45, 0.6, 2.3));
  for (let index = 0; index < 2; index += 1) {
    const lamp = sphere(stage, 0.16, stage.material("#f0b95d", { emissive: new THREE.Color("#b05d1e"), emissiveIntensity: 0.7 }), -1.6 + index * 3.2, 2.6, 2.05, 0);
    group.add(lamp);
  }
  return group;
}

function buildFoodStall(stage) {
  const group = new THREE.Group();
  group.position.set(3.2, 0, 5.9);
  group.rotation.y = -0.2;
  const wood = stage.material("#6d482d", { roughness: 0.9 });
  const clay = stage.material("#a7613d", { roughness: 0.98 });
  const cloth = stage.material("#c79a3f", { roughness: 0.9 });
  group.add(box(stage, 4.0, 0.92, 1.5, wood, 0, 0.46, 0));
  group.add(box(stage, 4.2, 0.16, 1.7, stage.material("#d5b783", { roughness: 0.92 }), 0, 0.94, 0));
  const oven = cylinder(stage, 1.05, 1.25, 1.2, 14, clay, -1.1, 1.55, 0.15);
  group.add(oven);
  const ovenTop = cylinder(stage, 1.02, 1.05, 0.18, 14, stage.material("#c6885c", { roughness: 0.96 }), -1.1, 2.2, 0.15);
  group.add(ovenTop);
  const mouth = mesh(stage, new THREE.CircleGeometry(0.34, 12), stage.material("#2b1a14", { roughness: 0.9 }), -1.1, 1.7, 1.31);
  group.add(mouth);
  for (let naan = 0; naan < 4; naan += 1) {
    const bread = cylinder(stage, 0.23, 0.23, 0.06, 12, stage.material("#d9a255", { roughness: 0.9 }), -0.15 + naan * 0.35, 1.33, 0.5);
    group.add(bread);
  }
  const pot = cylinder(stage, 0.45, 0.58, 0.55, 14, stage.material("#66503b", { metalness: 0.2, roughness: 0.65 }), 1.2, 1.25, 0.1);
  group.add(pot);
  group.add(cylinder(stage, 0.48, 0.48, 0.08, 14, stage.material("#3d2e22", { metalness: 0.2, roughness: 0.6 }), 1.2, 1.57, 0.1));
  for (let index = 0; index < 4; index += 1) {
    const steam = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: "#fff3dd", transparent: true, opacity: 0.22, depthWrite: false })
    );
    steam.position.set(-1.1 + (index % 2) * 0.2, 2.35 + index * 0.12, 0.1);
    stage.trackGeometry(steam.geometry);
    group.add(steam);
    stage.animate((time) => {
      if (!stage.reducedMotion) steam.position.y = 2.35 + ((time * 0.3 + index * 0.32) % 1.6);
    });
  }
  [-1.8, 1.8].forEach((x) => group.add(box(stage, 0.11, 2.8, 0.11, wood, x, 1.4, -0.6)));
  group.add(box(stage, 4.3, 0.12, 2.2, cloth, 0, 2.82, 0.18));
  for (let index = 0; index < 5; index += 1) {
    group.add(box(stage, 0.42, 0.02, 1.32, stage.material("#9f3c2d", { roughness: 0.92 }), -1.6 + index * 0.8, 2.89, 0.18));
  }
  group.add(box(stage, 1.3, 0.45, 0.08, stage.material("#f1e2c2", { roughness: 0.86 }), 0, 2.3, 1.55));
  return group;
}

function buildRawapShop(stage, wallMap, timberMap) {
  const group = new THREE.Group();
  group.position.set(9.4, 0, -3.2);
  group.rotation.y = -1.0;
  const wall = stage.material("#ffffff", { map: wallMap, roughness: 0.96 });
  const wood = stage.material("#ffffff", { map: timberMap, roughness: 0.88 });
  const dark = stage.material("#251b16", { roughness: 0.9 });
  const brass = stage.material("#cf9e46", { metalness: 0.4, roughness: 0.4 });
  group.add(box(stage, 4.2, 3.5, 3.2, wall, 0, 1.75, 0));
  group.add(box(stage, 4.5, 0.22, 3.5, wood, 0, 3.56, 0));
  group.add(box(stage, 2.3, 2.4, 0.16, dark, 0, 1.7, 1.64));
  group.add(box(stage, 2.8, 2.7, 0.12, wood, 0, 1.75, 1.58));
  group.add(box(stage, 2.45, 2.35, 0.15, dark, 0, 1.7, 1.66));
  const bodyMat = stage.material("#7a4a28", { roughness: 0.7 });
  const skinMat = stage.material("#d6b78f", { roughness: 0.8 });
  for (let index = 0; index < 3; index += 1) {
    const instrument = new THREE.Group();
    instrument.position.set(-1.0 + index * 1.0, 1.9, 1.78);
    instrument.rotation.z = -0.28 + index * 0.27;
    const body = mesh(stage, new THREE.SphereGeometry(0.34, 10, 8), bodyMat, 0, 0, 0);
    body.scale.set(0.85, 1.1, 0.38);
    instrument.add(body);
    instrument.add(mesh(stage, new THREE.CircleGeometry(0.26, 12), skinMat, 0, 0, 0.14));
    instrument.add(mesh(stage, new THREE.CylinderGeometry(0.055, 0.09, 1.55, 6), bodyMat, 0, 0.86, 0));
    instrument.add(box(stage, 0.2, 0.38, 0.1, brass, 0, 1.68, 0));
    group.add(instrument);
  }
  group.add(box(stage, 2.9, 0.16, 0.75, wood, 0, 1.2, 2.1));
  group.add(box(stage, 0.55, 0.6, 0.5, dark, 0.9, 0.3, 2.2));
  for (let index = 0; index < 3; index += 1) {
    const stool = cylinder(stage, 0.3, 0.36, 0.5, 8, stage.material("#6f4c31", { roughness: 0.9 }), -1.15 + index * 1.15, 0.26, 2.65);
    group.add(stool);
  }
  const lamp = sphere(stage, 0.18, stage.material("#f0b95d", { emissive: new THREE.Color("#b05d1e"), emissiveIntensity: 0.8 }), 1.55, 2.7, 2.05, 0);
  group.add(lamp);
  return group;
}

function buildAtlasWorkshop(stage, atlasMap, wallMap, timberMap) {
  const group = new THREE.Group();
  group.position.set(-8.6, 0, 6.3);
  group.rotation.y = 0.92;
  const wall = stage.material("#ffffff", { map: wallMap, roughness: 0.96 });
  const wood = stage.material("#ffffff", { map: timberMap, roughness: 0.9 });
  const dark = stage.material("#261b16", { roughness: 0.9 });
  group.add(box(stage, 5, 3.4, 3.6, wall, 0, 1.7, 0));
  group.add(box(stage, 5.3, 0.22, 3.9, wood, 0, 3.38, 0));
  group.add(box(stage, 2.4, 2.2, 0.18, dark, 0, 1.65, 1.82));
  group.add(box(stage, 2.8, 2.5, 0.12, wood, 0, 1.7, 1.75));
  group.add(box(stage, 2.55, 2.25, 0.15, dark, 0, 1.65, 1.83));
  const silkMaterial = stage.material("#ffffff", { map: atlasMap, roughness: 0.72, side: THREE.DoubleSide });
  [-1.35, -0.45, 0.45, 1.35].forEach((x, index) => {
    const silk = box(stage, 0.78, 2.3, 0.04, silkMaterial, x, 2.4, 2.0);
    silk.rotation.z = index % 2 ? 0.04 : -0.03;
    group.add(silk);
  });
  group.add(box(stage, 3.6, 0.1, 0.1, wood, 0, 3.58, 2.0));
  group.add(box(stage, 2.8, 0.16, 0.9, wood, 0, 1.22, 2.25));
  const loom = new THREE.Group();
  loom.position.set(1.0, 0, 2.4);
  loom.add(box(stage, 1.6, 0.12, 0.1, wood, 0, 1.8, 0));
  loom.add(box(stage, 0.12, 1.8, 0.1, wood, -0.7, 0.9, 0));
  loom.add(box(stage, 0.12, 1.8, 0.1, wood, 0.7, 0.9, 0));
  loom.add(box(stage, 1.3, 0.07, 0.7, silkMaterial, 0, 1.6, 0.1));
  group.add(loom);
  return group;
}

function buildCourtyardHouse(stage, wallMap, timberMap, roofMap) {
  const group = new THREE.Group();
  group.position.set(9.6, 0, 3.8);
  group.rotation.y = -0.3;
  const wall = stage.material("#ffffff", { map: wallMap, roughness: 0.97 });
  const wood = stage.material("#ffffff", { map: timberMap, roughness: 0.9 });
  const dark = stage.material("#241a15", { roughness: 0.9 });
  const trim = stage.material("#9f5d34", { roughness: 0.92 });
  const roof = stage.material("#ffffff", { map: roofMap, roughness: 0.94 });
  group.add(box(stage, 8.2, 5.4, 6.6, wall, 0, 2.7, 0));
  group.add(box(stage, 8.6, 0.4, 7.0, trim, 0, 5.55, 0));
  group.add(box(stage, 7.8, 0.22, 6.2, roof, 0, 5.78, 0));
  const gate = new THREE.Group();
  gate.position.set(0, 0, 3.38);
  gate.add(box(stage, 2.0, 2.7, 0.2, dark, 0, 1.35, 0));
  const gateArch = mesh(stage, new THREE.CircleGeometry(1.0, 16, 0, Math.PI), dark, 0, 2.7, 0.08);
  gate.add(gateArch);
  gate.add(box(stage, 2.45, 3.1, 0.16, wood, 0, 1.55, -0.08));
  gate.add(box(stage, 2.0, 2.7, 0.18, dark, 0, 1.35, 0.02));
  for (let index = 0; index < 2; index += 1) {
    gate.add(box(stage, 0.07, 2.2, 0.08, trim, -0.35 + index * 0.7, 1.3, 0.18));
  }
  gate.add(sphere(stage, 0.07, stage.material("#d2a14a", { metalness: 0.5, roughness: 0.35 }), 0.2, 1.3, 0.2, 0));
  group.add(gate);
  [-2.7, 2.7].forEach((wx) => {
    const windowMesh = box(stage, 1.35, 1.6, 0.12, dark, wx, 3.2, 3.34);
    group.add(windowMesh);
    const frame = box(stage, 1.62, 1.9, 0.1, wood, wx, 3.2, 3.3);
    group.add(frame);
    const lattice = box(stage, 1.35, 1.6, 0.14, dark, wx, 3.2, 3.36);
    group.add(lattice);
    for (let index = 0; index < 3; index += 1) {
      group.add(box(stage, 0.06, 1.4, 0.08, trim, wx - 0.45 + index * 0.45, 3.2, 3.44));
    }
  });
  const balcony = box(stage, 6.2, 0.24, 1.1, wood, 0, 4.25, 3.6);
  group.add(balcony);
  for (let index = 0; index < 6; index += 1) {
    group.add(box(stage, 0.07, 0.85, 0.07, trim, -2.7 + index * 1.08, 4.75, 4.08));
  }
  group.add(box(stage, 6.2, 0.1, 0.1, trim, 0, 5.18, 4.08));
  const pot = mesh(stage, new THREE.SphereGeometry(0.35, 10, 8), stage.material("#8f5538", { roughness: 0.98 }), -3.4, 0.45, 3.6);
  group.add(pot);
  const plant = sphere(stage, 0.38, stage.material("#3d6d4f", { roughness: 1 }), -3.4, 0.95, 3.6, 0);
  plant.scale.y = 0.9;
  group.add(plant);
  return group;
}

function buildDoppaStall(stage) {
  const group = new THREE.Group();
  group.position.set(2.8, 0, -5.2);
  group.rotation.y = 0.25;
  const wood = stage.material("#6c492e", { roughness: 0.9 });
  const cloth = stage.material("#c79c43", { roughness: 0.9 });
  group.add(box(stage, 3.2, 0.9, 1.3, wood, 0, 0.45, 0));
  group.add(box(stage, 3.4, 0.14, 1.55, stage.material("#d4b37e", { roughness: 0.9 }), 0, 0.95, 0));
  [-1.5, 1.5].forEach((x) => group.add(box(stage, 0.1, 2.8, 0.1, wood, x, 1.4, -0.55)));
  group.add(box(stage, 3.5, 0.1, 1.7, cloth, 0, 2.8, 0.15));
  [-1.1, 0, 1.1].forEach((x, shelfIndex) => {
    group.add(box(stage, 0.95, 0.1, 0.5, wood, x, 1.35, -0.15));
    for (let index = 0; index < 3; index += 1) {
      const cap = box(stage, 0.42, 0.18, 0.42, stage.material(["#8f3b38", "#2d6a58", "#d2a147"][(index + shelfIndex) % 3], { roughness: 0.95 }), x - 0.25 + index * 0.25, 1.52, -0.15);
      group.add(cap);
      group.add(box(stage, 0.28, 0.04, 0.28, stage.material("#f0e4c8", { roughness: 0.85 }), x - 0.25 + index * 0.25, 1.63, -0.15));
    }
  });
  const bowl = cylinder(stage, 0.34, 0.26, 0.24, 10, stage.material("#d2ab6c", { roughness: 0.9 }), 1.05, 1.14, 0.5);
  group.add(bowl);
  return group;
}

function buildCarvedDoor(stage, wallMap, timberMap) {
  const group = new THREE.Group();
  group.position.set(-10.2, 0, 10.2);
  group.rotation.y = 1.1;
  const wall = stage.material("#ffffff", { map: wallMap, roughness: 0.97 });
  const wood = stage.material("#ffffff", { map: timberMap, roughness: 0.9 });
  const dark = stage.material("#211713", { roughness: 0.9 });
  const brass = stage.material("#c99b4d", { metalness: 0.55, roughness: 0.32 });
  group.add(box(stage, 5.2, 4.2, 3.2, wall, 0, 2.1, 0));
  group.add(box(stage, 5.4, 0.2, 3.4, wood, 0, 4.2, 0));
  const frame = box(stage, 2.5, 3.2, 0.22, wood, 0, 1.6, 1.67);
  group.add(frame);
  const door = box(stage, 1.9, 2.85, 0.18, dark, 0, 1.42, 1.76);
  group.add(door);
  for (let index = 0; index < 5; index += 1) {
    group.add(box(stage, 1.85, 0.07, 0.12, brass, 0, 0.42 + index * 0.55, 1.87));
  }
  for (let index = 0; index < 3; index += 1) {
    group.add(box(stage, 0.07, 2.8, 0.12, brass, -0.6 + index * 0.6, 1.42, 1.87));
  }
  const knocker = mesh(stage, new THREE.TorusGeometry(0.16, 0.035, 6, 12), brass, 0.45, 1.45, 1.9);
  group.add(knocker);
  group.add(box(stage, 3.4, 0.25, 0.6, wood, 0, 3.6, 1.85));
  for (let index = 0; index < 6; index += 1) {
    group.add(box(stage, 0.12, 0.45, 0.12, wood, -1.5 + index * 0.6, 3.35, 1.95));
  }
  return group;
}

function buildTradingStation(stage) {
  const group = new THREE.Group();
  group.position.set(-2.8, 0, 9.8);
  group.rotation.y = 0.1;
  const wood = stage.material("#65432c", { roughness: 0.9 });
  const cloth = stage.material("#9e3e2f", { roughness: 0.9 });
  group.add(box(stage, 5.6, 0.9, 2.2, wood, 0, 0.45, 0));
  group.add(box(stage, 5.9, 0.14, 2.5, stage.material("#c9a774", { roughness: 0.9 }), 0, 0.95, 0));
  [-2.6, 2.6].forEach((x) => {
    group.add(box(stage, 0.12, 3.4, 0.12, wood, x, 1.7, -0.8));
    group.add(box(stage, 0.12, 3.4, 0.12, wood, x, 1.7, 0.8));
  });
  group.add(box(stage, 5.7, 0.1, 2.8, cloth, 0, 3.3, 0));
  for (let index = 0; index < 4; index += 1) {
    group.add(box(stage, 1.35, 0.04, 2.0, stage.material(index % 2 ? "#d7b467" : "#c34a34", { roughness: 0.9 }), -2.0 + index * 1.35, 3.37, 0));
  }
  const basketColors = ["#a45d33", "#d39a3f", "#8c3f36"];
  for (let index = 0; index < 3; index += 1) {
    const basket = cylinder(stage, 0.38, 0.3, 0.55, 10, stage.material("#9e7546", { roughness: 0.98 }), -1.8 + index * 1.4, 1.27, 0.15);
    group.add(basket);
    for (let item = 0; item < 7; item += 1) {
      group.add(sphere(stage, 0.09, stage.material(basketColors[item % 3], { roughness: 0.85 }), -1.9 + index * 1.4 + (item % 3) * 0.08, 1.58, 0.1 + Math.floor(item / 3) * 0.08, 0));
    }
  }
  const scaleBase = cylinder(stage, 0.38, 0.38, 0.1, 12, stage.material("#876c43", { metalness: 0.2, roughness: 0.55 }), 1.5, 1.08, 0.1);
  group.add(scaleBase);
  group.add(box(stage, 0.1, 1.2, 0.1, stage.material("#9b7b49", { metalness: 0.2, roughness: 0.6 }), 1.5, 1.7, 0.1));
  group.add(box(stage, 1.5, 0.08, 0.25, stage.material("#c19a54", { metalness: 0.2, roughness: 0.55 }), 1.5, 2.3, 0.1));
  [-0.62, 0.62].forEach((x) => {
    group.add(cylinder(stage, 0.17, 0.23, 0.1, 10, stage.material("#b18a4d", { metalness: 0.2, roughness: 0.55 }), 1.5 + x, 2.2, 0.1));
  });
  group.add(box(stage, 0.9, 0.06, 0.65, stage.material("#eee0c4", { roughness: 0.82 }), -2.1, 1.06, 0.55));
  group.add(box(stage, 0.08, 0.02, 0.5, stage.material("#6b4a31", { roughness: 0.8 }), -2.3, 1.11, 0.55));
  return group;
}

function kashgarMosque(stage, wallMap, timberMap) {
  /* Id Kah Mosque: an ochre-yellow facade with a tall pointed iwan, two slim minarets
     with lantern pavilions, a walled garden court and a low prayer hall behind. */
  const group = new THREE.Group();
  group.position.set(38, 0, -30);
  const ochre = stage.material("#dcae66", { roughness: 0.92 });
  const trim = stage.material("#f2e6cc", { roughness: 0.9 });
  const brick = stage.material("#ffffff", { map: wallMap, roughness: 0.97 });
  const dark = stage.material("#2a1e17", { roughness: 0.9 });
  const green = stage.material("#3f8a6a", { roughness: 0.6, metalness: 0.1 });
  const gold = stage.material("#d8a541", { metalness: 0.4, roughness: 0.35 });
  const FZ = 6;
  group.add(box(stage, 30, 0.6, 26, stage.material("#b39a77", { roughness: 1 }), 0, 0.3, -2));
  /* garden court walls (the facade closes the front) */
  group.add(box(stage, 0.8, 3.0, 22, brick, -14.6, 2.1, -5));
  group.add(box(stage, 0.8, 3.0, 22, brick, 14.6, 2.1, -5));
  group.add(box(stage, 30, 3.0, 0.8, brick, 0, 2.1, -16));
  /* facade: side wings and the iwan frame */
  for (const sx of [-1, 1]) {
    group.add(box(stage, 8.4, 7.2, 1.6, ochre, sx * 6.9, 4.2, FZ));
    group.add(box(stage, 8.6, 0.4, 1.8, trim, sx * 6.9, 7.9, FZ));
    for (let k = 0; k < 3; k += 1) {
      group.add(box(stage, 1.2, 2.6, 0.12, dark, sx * (4.2 + k * 2.4), 3.0, FZ + 0.82));
      group.add(mesh(stage, new THREE.CircleGeometry(0.6, 10, 0, Math.PI), dark, sx * (4.2 + k * 2.4), 4.3, FZ + 0.83));
    }
  }
  /* iwan: tall frame with a pointed-arch recess */
  group.add(box(stage, 1.1, 11, 2.2, ochre, -2.8, 6.1, FZ + 0.2));
  group.add(box(stage, 1.1, 11, 2.2, ochre, 2.8, 6.1, FZ + 0.2));
  group.add(box(stage, 6.7, 2.2, 2.2, ochre, 0, 10.5, FZ + 0.2));
  group.add(box(stage, 7.0, 0.4, 2.4, trim, 0, 11.7, FZ + 0.2));
  const arch = new THREE.Shape();
  arch.moveTo(-2.25, 0); arch.lineTo(-2.25, 6.2); arch.quadraticCurveTo(-2.1, 8.6, 0, 9.4); arch.quadraticCurveTo(2.1, 8.6, 2.25, 6.2); arch.lineTo(2.25, 0); arch.lineTo(-2.25, 0);
  group.add(mesh(stage, new THREE.ShapeGeometry(arch, 12), dark, 0, 0.6, FZ - 0.3));
  const archTrim = mesh(stage, new THREE.ShapeGeometry(arch, 12), trim, 0, 0.6, FZ - 0.34);
  archTrim.scale.set(1.14, 1.05, 1);
  group.add(archTrim);
  group.add(box(stage, 2.4, 3.6, 0.2, stage.material("#6b4327", { roughness: 0.85 }), 0, 2.4, FZ - 0.2));
  /* minarets at the facade ends */
  for (const sx of [-1, 1]) {
    const x = sx * 12.2;
    group.add(cylinder(stage, 1.0, 1.35, 15, 16, ochre, x, 8.1, FZ));
    for (let k = 0; k < 4; k += 1) group.add(cylinder(stage, 1.12 - k * 0.04, 1.12 - k * 0.04, 0.22, 16, trim, x, 3.5 + k * 3.2, FZ));
    group.add(cylinder(stage, 1.4, 1.4, 0.3, 16, trim, x, 15.7, FZ));
    for (let k = 0; k < 6; k += 1) { const a = (k / 6) * Math.PI * 2; group.add(box(stage, 0.16, 1.6, 0.16, trim, x + Math.cos(a) * 1.1, 16.6, FZ + Math.sin(a) * 1.1)); }
    const cap = mesh(stage, new THREE.SphereGeometry(1.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), green, x, 17.4, FZ);
    group.add(cap);
    group.add(cylinder(stage, 0.06, 0.06, 1.2, 6, gold, x, 19.2, FZ));
    group.add(mesh(stage, new THREE.TorusGeometry(0.28, 0.06, 6, 14, Math.PI * 1.4), gold, x, 19.9, FZ));
  }
  /* prayer hall: long flat-roofed hall with a small green dome over the entrance court */
  group.add(box(stage, 26, 4.2, 6, brick, 0, 2.7, -12));
  group.add(box(stage, 26.4, 0.4, 6.4, trim, 0, 4.9, -12));
  for (let k = 0; k < 10; k += 1) group.add(box(stage, 0.36, 3.8, 0.36, trim, -11.7 + k * 2.6, 2.5, -8.8));
  const dome = mesh(stage, new THREE.SphereGeometry(2.6, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), green, 0, 7.6, 1.5);
  group.add(box(stage, 5.6, 6.6, 5.6, ochre, 0, 3.9, 1.5));
  group.add(dome);
  /* garden: poplars and paths inside the court */
  for (const [px, pz] of [[-8, -3], [8, -3], [-8, 2], [8, 2], [-4, -6], [4, -6]]) {
    group.add(cylinder(stage, 0.12, 0.18, 2.4, 6, stage.material("#9a9488"), px, 1.8, pz));
    const c = mesh(stage, new THREE.IcosahedronGeometry(1, 1), stage.material("#6f9447", { flatShading: true }), px, 4.6, pz);
    c.scale.set(0.8, 2.6, 0.8);
    group.add(c);
  }
  return group;
}

function kashgarTeaHouse(stage, wallMap, timberMap) {
  const group = new THREE.Group();
  group.position.set(0, 0, 42);
  const wall = stage.material("#ffffff", { map: wallMap, roughness: 0.97 });
  const timber = stage.material("#ffffff", { map: timberMap, roughness: 0.9 });
  const dark = stage.material("#3a2a1c", { roughness: 0.9 });
  group.add(box(stage, 10, 3.6, 8, wall, 0, 1.8, 0));
  group.add(box(stage, 10.6, 0.35, 8.6, timber, 0, 3.8, 0));
  group.add(box(stage, 8.6, 2.8, 0.3, dark, 0, 1.4, 4.05));
  group.add(box(stage, 4.4, 0.3, 3.2, timber, 0, 3.0, 5.4));
  for (const x of [-4.4, 4.4]) {
    group.add(box(stage, 0.16, 2.8, 0.16, timber, x, 1.4, 6.6));
  }
  for (let i = 0; i < 4; i += 1) {
    group.add(box(stage, 2.0, 0.5, 1.0, timber, -4 + (i % 2) * 8, 0.7, 5.6 + Math.floor(i / 2) * 2));
    group.add(box(stage, 1.8, 0.12, 0.8, dark, -4 + (i % 2) * 8, 1.0, 5.6 + Math.floor(i / 2) * 2));
  }
  group.add(box(stage, 0.1, 2.0, 0.1, timber, -5.0, 1.0, 4.8));
  group.add(box(stage, 2.0, 0.7, 0.08, timber, -5.0, 2.0, 4.8));
  return group;
}

export default function buildKashgar({ scene, stage, manager }) {
  return buildWalkableTown({
    scene,
    stage,
    manager,
    seed: 20261113,
    terrain: {
      heightFn: (x, z) => 4.0 + fbm(x * 0.035, z * 0.035, 3) * 0.45,
      colorFn: (x, z) => {
        const n = fbm(x * 0.08, z * 0.08, 2);
        return new THREE.Color("#b39a77").lerp(new THREE.Color("#8c7858"), n * 0.5);
      },
      segments: 150,
      /* old-city brick paving, tinted by the vertex colours */
      material: (M, fx) => (fx ? fx.pbr("brick", { color: "#ffffff", color2: "#e2d6c4", color3: "#a89880", rows: 10, cols: 4, seed: 91, bump: 0.7, repeat: [70, 70] }, { vertexColors: true }) : M({ vertexColors: true, roughness: 0.98 })),
    },
    places: {
      oldcity: {
        n: "Old City",
        zh: "老城",
        sub: "老城",
        x: 0,
        z: 0,
        r: 36,
        spawn: [0, 14],
        look: [0, -10],
        pitch: 1.3,
        dist: 14,
      },
      bazaar: {
        n: "Grand Bazaar",
        zh: "大巴扎",
        sub: "大巴扎",
        x: -44,
        z: 10,
        r: 26,
        spawn: [-32, 10],
        look: [-44, 10],
        pitch: 1.34,
        dist: 15,
      },
      idkah: {
        n: "Id Kah Mosque",
        zh: "艾提尕尔清真寺",
        sub: "艾提尕尔清真寺",
        x: 38,
        z: 6,
        r: 24,
        spawn: [36, -12],
        look: [38, -30],
        pitch: 1.5,
        dist: 24,
      },
      teahouse: {
        n: "Tea House",
        zh: "茶馆",
        sub: "茶馆",
        x: 0,
        z: 52,
        r: 24,
        spawn: [0, 62],
        look: [0, 42],
        pitch: 1.5,
        dist: 20,
      },
      craftlane: {
        n: "Craft Lane",
        zh: "手工艺巷",
        sub: "手工艺巷",
        x: 40,
        z: 20,
        r: 26,
        spawn: [32, 20],
        look: [48, 20],
        pitch: 1.32,
        dist: 14,
      },
      livestock: { n: "Livestock Market", zh: "牲畜大巴扎", sub: "牲畜巴扎", x: -60, z: -30, r: 22, spawn: [-52, -14], look: [-62, -34], pitch: 1.3, dist: 16 },
    },
    startPlace: "oldcity",
    worldName: { en: "Kashgar", zh: "喀什", sub: "喀什" },
    mapBounds: { x0: -90, x1: 90, z0: -90, z1: 90 },
    mapLines: [
      [[-70, 0], [70, 0]],
      [[0, -60], [0, 60]],
      [[-44, 10], [-20, 6], [0, 0]],
      [[38, -30], [20, -12], [0, 0]],
      [[0, 42], [0, 20], [0, 0]],
      [[40, 20], [20, 16], [0, 0]],
    ],
    mapColor: (x, z) => {
      const n = fbm(x * 0.04, z * 0.04, 2);
      return [Math.round(159 + n * 20), Math.round(139 + n * 16), Math.round(107 + n * 12)];
    },
    fogDensity: 0.00045,
    exposureScale: 0.95,
    walker: { collision: "slide", skyKeys: SKY_PRESETS.desert },
    build: ({ kit, W, stage, hgt, makePath, fx }) => {
      const wallMap = stage.trackTexture(brickTexture("#b58a5c", "#8b6642", [3, 3]));
      const timberMap = stage.trackTexture(woodTexture("#67422a", "#3c2416", [2, 2]));
      const roofMap = stage.trackTexture(tileTexture("#a06e45", "#735035", [3, 3]));
      const pavingMap = stage.trackTexture(pavingTexture("#b39a77", "#81684b", [8, 8]));
      const atlasMap = stage.trackTexture(atlasTexture());

      // Paved old-city ground and lanes.
      makePath([[-70, 0], [-40, 0], [0, 0], [40, 0], [70, 0]], 7.0, stage.material("#a28665", { roughness: 1 }));
      makePath([[0, -60], [0, -20], [0, 0], [0, 20], [0, 60]], 6.0, stage.material("#a28665", { roughness: 1 }));
      makePath([[-44, 10], [-20, 6], [0, 0]], 4.0, stage.material("#a28665", { roughness: 1 }));
      makePath([[38, -30], [20, -12], [0, 0]], 4.0, stage.material("#a28665", { roughness: 1 }));
      makePath([[38, -30], [38, 16]], 4.0, stage.material("#a28665", { roughness: 1 }));
      makePath([[0, 42], [0, 20]], 4.0, stage.material("#a28665", { roughness: 1 }));
      makePath([[0, 42], [0, 62]], 4.0, stage.material("#a28665", { roughness: 1 }));
      makePath([[40, 20], [20, 16], [0, 0]], 4.0, stage.material("#a28665", { roughness: 1 }));

      // House rows along the lanes.
      const houses = [
        { x: -14, z: -26, rotation: Math.PI / 2, width: 5.2, depth: 4.4, height: 4.8, accent: "#a86c3b" },
        { x: -14, z: -14, rotation: Math.PI / 2, width: 4.8, depth: 4.2, height: 4.3, accent: "#985936" },
        { x: -14, z: 14, rotation: Math.PI / 2, width: 5.2, depth: 4.4, height: 5.2, accent: "#b27b46" },
        { x: -14, z: 26, rotation: Math.PI / 2, width: 4.6, depth: 4.0, height: 4.4, accent: "#a0613b" },
        { x: 14, z: -26, rotation: -Math.PI / 2, width: 5.0, depth: 4.4, height: 4.6, accent: "#b77a43" },
        { x: 14, z: -14, rotation: -Math.PI / 2, width: 4.8, depth: 4.2, height: 5.0, accent: "#955a36" },
        { x: 14, z: 26, rotation: -Math.PI / 2, width: 5.4, depth: 4.4, height: 4.5, accent: "#a86c3b" },
        { x: 14, z: 38, rotation: -Math.PI / 2, width: 4.8, depth: 4.0, height: 4.2, accent: "#b27b46" },
      ];
      houses.forEach((spec) => {
        const h = buildHouse(stage, { ...spec, wallMap, timberMap, roofMap });
        h.position.y = hgt(spec.x, spec.z);
        stage.add(h);
        kit.blockRect(spec.x, spec.z, spec.width, spec.depth, spec.rotation);
      });

      // Landmark groups, placed around the lanes.
      const copper = buildCopperWorkshop(stage, wallMap, timberMap);
      copper.position.set(-24, hgt(-24, -8), -8);
      copper.rotation.y = 0.8;
      stage.add(copper);

      const food = buildFoodStall(stage);
      food.position.set(8, hgt(8, 50), 50);
      stage.add(food);

      const rawap = buildRawapShop(stage, wallMap, timberMap);
      rawap.position.set(18, hgt(18, 4), 4);
      stage.add(rawap);

      const atlas = buildAtlasWorkshop(stage, atlasMap, wallMap, timberMap);
      atlas.position.set(-24, hgt(-24, 22), 22);
      stage.add(atlas);

      const courtyard = buildCourtyardHouse(stage, wallMap, timberMap, roofMap);
      courtyard.position.set(28, hgt(28, 18), 18);
      stage.add(courtyard);

      const doppa = buildDoppaStall(stage);
      doppa.position.set(-6, hgt(-6, -18), -18);
      stage.add(doppa);

      const door = buildCarvedDoor(stage, wallMap, timberMap);
      door.position.set(18, hgt(18, 32), 32);
      stage.add(door);

      const trading = buildTradingStation(stage);
      trading.position.set(-44, hgt(-44, 10), 10);
      stage.add(trading);

      // Id Kah Mosque and the tea house.
      const mosque = kashgarMosque(stage, wallMap, timberMap);
      mosque.position.y = hgt(38, -30);
      stage.add(mosque);
      kit.blockRect(38, -30, 26, 22, 0);

      const tea = kashgarTeaHouse(stage, wallMap, timberMap);
      tea.position.y = hgt(0, 42);
      stage.add(tea);
      kit.blockRect(0, 42, 10, 8, 0);

      // City gate: two brick towers with crenellations and a real opening to walk through.
      const gate = new THREE.Group();
      gate.position.set(0, hgt(0, -52), -52);
      {
        const gw = stage.material("#ffffff", { map: wallMap, roughness: 0.97 });
        const trimG = stage.material("#e8d6b0", { roughness: 0.9 });
        for (const sx of [-1, 1]) {
          gate.add(box(stage, 5.2, 9, 5, gw, sx * 5.1, 4.5, 0));
          for (let k = 0; k < 3; k += 1) gate.add(box(stage, 1.0, 0.9, 5.2, gw, sx * (3.1 + k * 2), 9.45, 0));
          gate.add(box(stage, 0.8, 1.6, 0.12, stage.material("#2a1e17"), sx * 5.1, 6.2, 2.56));
          /* long city walls running off from the gate */
          gate.add(box(stage, 30, 6, 2.2, gw, sx * 22.6, 3, 0));
          for (let k = 0; k < 10; k += 1) gate.add(box(stage, 1.2, 0.8, 2.3, gw, sx * (9.6 + k * 2.9), 6.4, 0));
        }
        gate.add(box(stage, 5.2, 2.2, 5, gw, 0, 7.9, 0));
        gate.add(box(stage, 5.4, 0.3, 5.2, trimG, 0, 6.65, 0));
        const ga = new THREE.Shape();
        ga.moveTo(-2.5, 0); ga.lineTo(2.5, 0); ga.lineTo(2.5, 1.2); ga.quadraticCurveTo(0, 2.4, -2.5, 1.2); ga.lineTo(-2.5, 0);
        const archFill = mesh(stage, new THREE.ShapeGeometry(ga, 10), gw, 0, 5.4, 2.52);
        gate.add(archFill);
      }
      stage.add(gate);

      // Plane trees and a few birds/clouds.
      const treeSpots = [
        [-28, -34], [-28, 34], [28, -38], [28, 42], [-58, -4], [58, 4],
        [10, -40], [-10, 46], [52, -20], [-52, 28],
      ];
      treeSpots.forEach(([x, z], i) => {
        const t = tree(x, z, 0.75 + (i % 3) * 0.1, "#557550", null);
        t.position.y = hgt(x, z);
        stage.add(t);
      });

      // Sunday livestock market (Mal Bazaar): fenced pens, tethering rails and a buyers' lane.
      const live = new THREE.Group();
      live.position.set(-60, hgt(-60, -34), -34);
      {
        const post = stage.material("#6b4a30", { roughness: 0.9 });
        const pole = (x, z) => live.add(box(stage, 0.18, 1.3, 0.18, post, x, 0.65, z));
        const rail = (x0, z0, x1, z1) => {
          const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
          for (const y of [0.55, 1.05]) { const r = box(stage, 0.08, 0.1, len, post, (x0 + x1) / 2, y, (z0 + z1) / 2); r.rotation.y = a; live.add(r); }
          const n = Math.max(1, Math.round(len / 2.2));
          for (let k = 0; k <= n; k += 1) pole(x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n);
        };
        /* sheep pen with a gap on the lane side, goat pen beside it */
        rail(-11, -7, 11, -7); rail(-11, -7, -11, 7); rail(11, -7, 11, 7); rail(-11, 7, -2, 7); rail(2, 7, 11, 7); rail(0, -7, 0, 3);
        /* horse tethering rail along the lane */
        rail(-10, 13, 10, 13);
        /* awning and trader's table */
        for (const [x, z] of [[14, -4], [18, -4], [14, 2], [18, 2]]) live.add(box(stage, 0.16, 2.6, 0.16, post, x, 1.3, z));
        live.add(box(stage, 5.2, 0.12, 7.2, stage.material("#b3261e"), 16, 2.65, -1));
        live.add(box(stage, 3.4, 0.9, 1.2, post, 16, 0.45, -1));
        live.add(box(stage, 0.8, 0.5, 0.8, stage.material("#b9a47c"), 14.6, 0.25, 1.6));
      }
      stage.add(live);
      makePath([[-44, 0], [-60, -18], [-60, -26]], 4.0, stage.material("#a28665", { roughness: 1 }));

      W.interactive("cn-livestock", live, "Sunday livestock market", [-60, -22], { radius: 16, labelOffset: 1.4 });
      W.interactive("cn-copper", copper, "Copper workshop", [-20, -4], { radius: 12, labelOffset: 1.4 });
      W.interactive("cn-food", food, "Naan & polo", [8, 52], { radius: 12, labelOffset: 1.4 });
      W.interactive("cn-rawap", rawap, "Rawap", [20, 8], { radius: 12, labelOffset: 1.4 });
      W.interactive("cn-atlas", atlas, "Atlas silk", [-22, 26], { radius: 12, labelOffset: 1.4 });
      W.interactive("cn-courtyard", courtyard, "Courtyard house", [26, 22], { radius: 15, labelOffset: 1.4 });
      W.interactive("cn-doppa", doppa, "Doppa", [-6, -14], { radius: 11, labelOffset: 1.4 });
      W.interactive("cn-door", door, "Carved door", [18, 36], { radius: 11, labelOffset: 1.4 });
      W.interactive("cn-market", trading, "Grand Bazaar", [-40, 14], { radius: 16, labelOffset: 1.4 });
    },
    upgrade: {
      grass: { density: (x, z) => (Math.abs(x) > 50 || Math.abs(z) > 56 ? 0.6 : 0) * (Math.abs(z) < 5 || Math.abs(x) < 5 ? 0 : 1), colors: ["#5a5a32", "#a39a5e"], count: 1600 },
      clouds: { coverage: 0.7, scale: 1.1, speed: 0.004 },
      post: { grade: { tint: "#fff3e4", contrast: 1.07, saturation: 1.05, vignette: 0.28 } },
      animals: (fa) => {
        const id = (k) => animalId("kashgar", k);
        const pen = (x, z) => x > -71 && x < -60.5 && z > -41 && z < -27;
        const pen2 = (x, z) => x > -59.5 && x < -49 && z > -41 && z < -27;
        fa.herd({ id: id("sheep"), kind: "sheep", count: 12, cx: -66, cz: -34, R: 5, speed: 0.5, area: pen, block: false });
        fa.herd({ id: id("goat"), kind: "goat", count: 6, cx: -54, cz: -34, R: 4, speed: 0.6, area: pen2, block: false });
        /* horses waiting at the rail; one is saddled for a test ride down the lane */
        fa.herd({ id: id("horse"), kind: "horse", count: 3, cx: -60, cz: -18, R: 2.5, speed: 0.3, opts: (i) => ({ color: ["#6a4a30", "#2a2420", "#b0a090"][i % 3] }) });
        fa.rideAnimal({ kind: "horse", x: -48, z: -16, yaw: 0.6, label: { en: "a horse", zh: "马" }, id: id("horse"), opts: { color: "#8a5a34" } });
        fa.herd({ id: id("camel"), kind: "camel", count: 2, cx: -76, cz: -14, R: 5, speed: 0.5 });
        fa.herd({ id: id("donkey"), kind: "donkey", count: 2, cx: -36, cz: -12, R: 4, speed: 0.6 });
        fa.rideCart({ x: -26, z: 3, yaw: Math.PI / 2, label: { en: "a donkey cart", zh: "毛驴车" }, id: id("donkey") });
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
      add(0, 0, 32, 18);
      add(-44, 10, 16, 6);
      add(0, 58, 6, 4);
      add(38, -20, 10, 5);
      add(40, 20, 14, 4);
      add(-56, -22, 8, 6);
    },
  });
}
