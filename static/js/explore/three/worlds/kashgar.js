import * as THREE from "three";
import {
  addLighting,
  addSun,
  bird,
  brickTexture,
  cloud,
  colors,
  createSky,
  makeCanvasTexture,
  pavingTexture,
  tileTexture,
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

export default function buildKashgar({ scene, stage }) {
  const detail = stage.quality !== "low";
  createSky(scene, {
    top: "#17324e",
    bottom: "#efb873",
    fog: "#cdac80",
    near: 42,
    far: 105,
  });
  addLighting(scene, { shadows: detail, sun: [20, 25, 16], color: "#ffca88", intensity: 2.4, ambient: 1.35 });
  addSun(scene, { position: [34, 23, -34], size: 5.2, color: "#ffcf8f" });

  const wallMap = stage.trackTexture(brickTexture("#b58a5c", "#8b6642", [3, 3]));
  const timberMap = stage.trackTexture(woodTexture("#67422a", "#3c2416", [2, 2]));
  const roofMap = stage.trackTexture(tileTexture("#a06e45", "#735035", [3, 3]));
  const pavingMap = stage.trackTexture(pavingTexture("#b39a77", "#81684b", [8, 8]));
  const atlasMap = stage.trackTexture(atlasTexture());

  const ground = box(stage, 42, 0.8, 34, stage.material("#ffffff", { map: pavingMap, roughness: 0.98 }), 0, -0.4, 0);
  ground.receiveShadow = true;
  stage.add(ground);
  const street = box(stage, 8.5, 0.07, 30, stage.material("#a28665", { roughness: 1 }), 0, 0.02, 2.5);
  stage.add(street);
  const gutter = box(stage, 0.5, 0.06, 30, stage.material("#6f5843", { roughness: 1 }), 4.4, 0.03, 2.5);
  stage.add(gutter);
  const gutterB = gutter.clone();
  gutterB.position.x = -4.4;
  stage.add(gutterB);

  // Arched gateway in the distance.
  const gate = new THREE.Group();
  gate.position.set(0, 0, -13.5);
  const gateWall = box(stage, 12, 8, 1.2, stage.material("#ffffff", { map: wallMap, roughness: 0.97 }), 0, 4, 0);
  gate.add(gateWall);
  const gateOpening = box(stage, 4.3, 5.6, 0.2, stage.material("#251c17", { roughness: 0.9 }), 0, 2.8, 0.7);
  gate.add(gateOpening);
  const gateArch = mesh(stage, new THREE.CircleGeometry(2.15, 18, 0, Math.PI), stage.material("#251c17", { roughness: 0.9 }), 0, 5.6, 0.72);
  gate.add(gateArch);
  const gateTrim = box(stage, 5.4, 6.2, 0.25, stage.material("#bf8449", { roughness: 0.9 }), 0, 3.1, 0.57);
  gate.add(gateTrim);
  const gateInner = box(stage, 4.3, 5.6, 0.25, stage.material("#251c17", { roughness: 0.9 }), 0, 2.8, 0.79);
  gate.add(gateInner);
  const gateArch2 = mesh(stage, new THREE.CircleGeometry(2.15, 18, 0, Math.PI), stage.material("#251c17", { roughness: 0.9 }), 0, 5.6, 0.8);
  gate.add(gateArch2);
  for (let index = 0; index < 4; index += 1) {
    const miniWindow = box(stage, 0.8, 1.2, 0.1, stage.material("#2b2019", { roughness: 0.9 }), -4.6 + index * 3.05, 6.5, 0.68);
    gate.add(miniWindow);
  }
  stage.add(gate);

  const housesLeft = [
    { x: -12.3, z: -5, rotation: Math.PI / 2, width: 5.0, depth: 4.2, height: 5.2, accent: "#a86c3b" },
    { x: -12.6, z: 1.6, rotation: Math.PI / 2, width: 4.8, depth: 4.0, height: 4.2, accent: "#985936" },
    { x: -12.2, z: 8.5, rotation: Math.PI / 2, width: 5.4, depth: 4.5, height: 5.6, accent: "#b27b46" },
    { x: 12.5, z: -5.6, rotation: -Math.PI / 2, width: 5.2, depth: 4.4, height: 4.8, accent: "#a0613b" },
    { x: 12.8, z: 1.8, rotation: -Math.PI / 2, width: 5.0, depth: 4.2, height: 5.4, accent: "#b77a43" },
    { x: 12.4, z: 9.0, rotation: -Math.PI / 2, width: 5.6, depth: 4.4, height: 4.4, accent: "#955a36" },
  ];
  housesLeft.forEach((spec) => stage.add(buildHouse(stage, { ...spec, wallMap, timberMap, roofMap })));

  const copper = buildCopperWorkshop(stage, wallMap, timberMap);
  stage.add(copper);
  stage.addInteractive("cn-copper", copper, {
    label: "Copper workshop",
    accent: "#e6bc6a",
    focus: [-8.9, 1.7, -1.4],
    radius: 8.3,
    beaconPosition: [-7.9, 0.12, 0.1],
  });

  const food = buildFoodStall(stage);
  stage.add(food);
  stage.addInteractive("cn-food", food, {
    label: "Naan & polo",
    accent: "#e6bc6a",
    focus: [3.2, 1.7, 5.9],
    radius: 8.4,
    beaconPosition: [3.2, 0.1, 7.4],
  });

  const rawap = buildRawapShop(stage, wallMap, timberMap);
  stage.add(rawap);
  stage.addInteractive("cn-rawap", rawap, {
    label: "Rawap",
    accent: "#e6bc6a",
    focus: [9.4, 1.9, -3.2],
    radius: 8.3,
    beaconPosition: [8.1, 0.12, -2.1],
  });

  const atlas = buildAtlasWorkshop(stage, atlasMap, wallMap, timberMap);
  stage.add(atlas);
  stage.addInteractive("cn-atlas", atlas, {
    label: "Atlas silk",
    accent: "#e6bc6a",
    focus: [-8.6, 1.9, 6.3],
    radius: 8.7,
    beaconPosition: [-7.5, 0.12, 7.7],
  });

  const courtyard = buildCourtyardHouse(stage, wallMap, timberMap, roofMap);
  stage.add(courtyard);
  stage.addInteractive("cn-courtyard", courtyard, {
    label: "Courtyard house",
    accent: "#e6bc6a",
    focus: [9.6, 2.7, 3.8],
    radius: 18,
    beaconPosition: [8.1, 0.15, 5.8],
    labelOffset: 1.1,
  });

  const doppa = buildDoppaStall(stage);
  stage.add(doppa);
  stage.addInteractive("cn-doppa", doppa, {
    label: "Doppa",
    accent: "#e6bc6a",
    focus: [2.8, 1.3, -5.2],
    radius: 7.5,
    beaconPosition: [2.8, 0.1, -3.7],
  });

  const door = buildCarvedDoor(stage, wallMap, timberMap);
  stage.add(door);
  stage.addInteractive("cn-door", door, {
    label: "Carved door",
    accent: "#e6bc6a",
    focus: [-10.2, 1.7, 10.2],
    radius: 8.1,
    beaconPosition: [-8.8, 0.12, 11.4],
  });

  const trading = buildTradingStation(stage);
  stage.add(trading);
  stage.addInteractive("cn-market", trading, {
    label: "Grand Bazaar",
    accent: "#e6bc6a",
    focus: [-2.8, 1.5, 9.8],
    radius: 9.4,
    beaconPosition: [-2.8, 0.12, 11.4],
    labelOffset: 1.0,
  });

  // Awnings, textiles, lanterns and market clutter.
  const awningColors = ["#9d3e30", "#c4973c", "#2f6a58", "#7b4a6f"];
  const awnings = [
    [-5.5, -0.5, 4.8, 0.1, 0],
    [5.9, 5.1, 4.2, -0.15, 1],
    [-5.2, 8.7, 3.8, 0.12, 2],
    [5.0, 10.9, 4.4, 0.08, 3],
  ];
  awnings.forEach(([x, z, width, rotation, index]) => {
    const awning = box(stage, width, 0.1, 2.5, stage.material(awningColors[index], { roughness: 0.92 }), x, 3.0, z);
    awning.rotation.z = rotation;
    stage.add(awning);
    for (let stripe = 0; stripe < Math.floor(width / 0.55); stripe += 1) {
      const trim = box(stage, 0.5, 0.02, 2.5, stage.material("#f1dfba", { roughness: 0.9 }), x - width / 2 + 0.4 + stripe * 0.55, 3.06, z);
      trim.rotation.z = rotation;
      stage.add(trim);
    }
  });

  const lanternMaterial = stage.material("#f3b94f", { emissive: new THREE.Color("#b95e19"), emissiveIntensity: 0.8 });
  for (let index = 0; index < 8; index += 1) {
    const x = -5.2 + (index % 4) * 3.45;
    const z = index < 4 ? -2.5 : 6.5;
    const cable = box(stage, 4.0, 0.025, 0.025, stage.material("#4d3827", { roughness: 0.8 }), x + 1.7, 6.0, z);
    stage.add(cable);
    const lantern = cylinder(stage, 0.2, 0.28, 0.55, 8, lanternMaterial, x, 5.55, z);
    stage.add(lantern);
    const cap = mesh(stage, new THREE.ConeGeometry(0.28, 0.2, 8), stage.material("#75422a", { metalness: 0.2, roughness: 0.6 }), x, 5.9, z);
    stage.add(cap);
  }

  const rugMaterial = stage.material("#a34a37", { roughness: 0.94, side: THREE.DoubleSide });
  const rug = mesh(stage, new THREE.PlaneGeometry(2.2, 3.0), rugMaterial, 10.9, 4.0, 7.2);
  rug.rotation.y = -Math.PI / 2;
  stage.add(rug);
  for (let index = 0; index < 3; index += 1) {
    const stripe = mesh(stage, new THREE.PlaneGeometry(2.0, 0.08), stage.material(["#d4aa51", "#eddfbd", "#3b6f5d"][index], { roughness: 0.9, side: THREE.DoubleSide }), 10.89, 3.2 + index * 0.55, 7.2);
    stripe.rotation.y = -Math.PI / 2;
    stage.add(stripe);
  }

  const crateMaterial = stage.material("#755033", { roughness: 0.95 });
  for (let index = 0; index < 5; index += 1) {
    const crate = box(stage, 1.05, 0.85, 0.9, crateMaterial, -9.8 + index * 0.5, 0.42, 12.4);
    stage.add(crate);
    stage.add(box(stage, 1.05, 0.08, 0.9, stage.material("#9e6b3c", { roughness: 0.9 }), -9.8 + index * 0.5, 0.88, 12.4));
  }
  const spiceColors = ["#d9852e", "#b23c27", "#c8a343", "#7b5e35"];
  for (let index = 0; index < 4; index += 1) {
    const basket = cylinder(stage, 0.45, 0.32, 0.45, 12, stage.material("#a97b4a", { roughness: 0.98 }), 6.2 + index * 0.9, 0.23, 12.3);
    stage.add(basket);
    const spice = mesh(stage, new THREE.ConeGeometry(0.42, 0.45, 12), stage.material(spiceColors[index], { roughness: 0.9 }), 6.2 + index * 0.9, 0.65, 12.3);
    stage.add(spice);
  }

  const people = [
    person(stage, 0.6, 3.8, "#6d4b3c", "#a9473d", 0.9, 0.4),
    person(stage, -5.2, 5.4, "#345e58", "#d0a44d", 0.84, 1.2),
    person(stage, 7.2, 1.8, "#7b3f65", "#324a55", 0.88, 2.3),
    person(stage, 4.7, 9.0, "#9a5f35", "#b7463a", 0.8, 3.5),
  ];
  people.forEach((figure) => stage.add(figure));

  const clouds = [];
  for (let index = 0; index < (detail ? 4 : 2); index += 1) {
    const cloudGroup = cloud(1.1 + (index % 2) * 0.35);
    cloudGroup.position.set(-20 + index * 12, 12 + (index % 2) * 2, -28 - index * 3);
    stage.add(cloudGroup);
    clouds.push({ mesh: cloudGroup, speed: 0.1 + index * 0.03 });
  }
  stage.animate((time, delta) => {
    if (stage.reducedMotion) return;
    clouds.forEach((item) => {
      item.mesh.position.x += item.speed * delta;
      if (item.mesh.position.x > 26) item.mesh.position.x = -28;
    });
  });

  // Warm market dust.
  if (detail) {
    const count = 50;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 24;
      positions[index * 3 + 1] = 0.5 + Math.random() * 7;
      positions[index * 3 + 2] = -8 + Math.random() * 20;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const dust = new THREE.Points(geometry, new THREE.PointsMaterial({ color: "#f5d59e", size: 0.08, transparent: true, opacity: 0.55, depthWrite: false }));
    stage.trackGeometry(geometry);
    stage.add(dust);
    stage.animate((time) => {
      if (stage.reducedMotion) return;
      dust.rotation.y = time * 0.008;
    });
  }

  for (let index = 0; index < 2; index += 1) {
    const flying = bird(-8 + index * 9, 15 + index * 1.2, -20 - index * 2, "#3d2f25");
    stage.add(flying);
    stage.animate((time, delta) => {
      if (stage.reducedMotion) return;
      flying.position.x += delta * (0.7 + index * 0.1);
      flying.position.y = 15 + Math.sin(time * 0.5 + index) * 0.3;
      if (flying.position.x > 24) flying.position.x = -24;
    });
  }

  return { objectId: "kashgar" };
}
