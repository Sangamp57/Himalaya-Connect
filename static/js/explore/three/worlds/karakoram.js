import * as THREE from "three";
import {
  addLighting,
  addSun,
  bird,
  cloud,
  colors,
  createSky,
  makeCanvasTexture,
  mountain,
  pine,
  stoneTexture,
  tree,
  woodTexture,
} from "../helpers.js";
import { createKit, createWalker, fbm, hs, lerp, ss, col } from "./walk-engine.js";

/* Karakoram Highway — a walkable world from Chilas to Tashkurgan.
   The stalls, gate, village and monuments below are the original
   Himalaya Connect builders; the route, terrain, player and crowd follow. */

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

function person(stage, x, z, jacketColor, pantsColor, scale = 1, phase = 0, backpack = false) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const jacket = stage.material(jacketColor, { roughness: 0.92 });
  const pants = stage.material(pantsColor, { roughness: 0.95 });
  const skin = stage.material("#b97b55", { roughness: 0.9 });
  const body = mesh(stage, new THREE.CapsuleGeometry(0.24 * scale, 0.68 * scale, 3, 8), jacket, 0, 0.92 * scale, 0);
  body.scale.z = 0.72;
  group.add(body);
  group.add(mesh(stage, new THREE.CylinderGeometry(0.16 * scale, 0.13 * scale, 0.72 * scale, 6), pants, 0, 0.4 * scale, 0));
  group.add(mesh(stage, new THREE.SphereGeometry(0.21 * scale, 10, 8), skin, 0, 1.47 * scale, 0));
  group.add(mesh(stage, new THREE.CylinderGeometry(0.22 * scale, 0.26 * scale, 0.18 * scale, 8), jacket, 0, 1.64 * scale, 0));
  if (backpack) {
    const pack = box(stage, 0.5 * scale, 0.75 * scale, 0.25 * scale, stage.material("#8b5b39", { roughness: 0.95 }), 0, 1.0 * scale, -0.3 * scale);
    group.add(pack);
  }
  stage.animate((time) => {
    if (stage.reducedMotion) return;
    group.position.y = Math.sin(time * 1.04 + phase) * 0.016;
  });
  return group;
}

function buildRoad(stage, points, width = 3.4) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const segments = 120;
  const positions = [];
  const uvs = [];
  const indices = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize().multiplyScalar(width / 2);
    positions.push(point.x - side.x, point.y + 0.07, point.z - side.z);
    positions.push(point.x + side.x, point.y + 0.07, point.z + side.z);
    uvs.push(0, t * 10, 1, t * 10);
    if (index < segments) {
      const a = index * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  stage.trackGeometry(geometry);
  const road = new THREE.Mesh(geometry, stage.material("#474441", { roughness: 0.98 }));
  road.receiveShadow = true;
  stage.add(road);

  // Road edge stones and centre dashes.
  const dashMaterial = stage.material("#d9c792", { roughness: 0.85 });
  const stoneMaterial = stage.material("#7f7769", { roughness: 1 });
  for (let index = 0; index < 46; index += 1) {
    const t = index / 46;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const dash = box(stage, 0.12, 0.03, 0.75, dashMaterial, point.x, point.y + 0.12, point.z);
    dash.rotation.y = Math.atan2(tangent.x, tangent.z);
    stage.add(dash);
    if (index % 3 === 0) {
      [-1, 1].forEach((direction) => {
        const rock = mesh(stage, new THREE.DodecahedronGeometry(0.26, 0), stoneMaterial, point.x + side.x * direction * (width / 2 + 0.4), point.y + 0.18, point.z + side.z * direction * (width / 2 + 0.4));
        rock.scale.y = 0.7;
        stage.add(rock);
      });
    }
  }
  return curve;
}

function buildPassGate(stage, stoneMap, timberMap) {
  const group = new THREE.Group();
  group.position.set(2.4, 1.1, -16.0);
  const stone = stage.material("#ffffff", { map: stoneMap, roughness: 1 });
  const timber = stage.material("#ffffff", { map: timberMap, roughness: 0.92 });
  const dark = stage.material("#3d332a", { roughness: 0.95 });
  group.add(box(stage, 8.2, 0.6, 5.4, stone, 0, 0.3, 0));
  [-3.2, 3.2].forEach((x) => {
    group.add(box(stage, 1.15, 4.6, 1.15, stone, x, 2.9, 0));
    group.add(box(stage, 1.4, 0.35, 1.4, dark, x, 5.25, 0));
  });
  group.add(box(stage, 7.5, 1.1, 0.6, timber, 0, 4.35, 0));
  const signTexture = makeCanvasTexture(
    800,
    150,
    (ctx, w, h) => {
      ctx.fillStyle = "#1d3a3d";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#d8b061";
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = "#fff4d8";
      ctx.font = "700 54px Manrope, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("KHUNJERAB PASS · 4,693 m", w / 2, h / 2 - 8);
      ctx.fillStyle = "#d8b061";
      ctx.font = "600 22px Manrope, sans-serif";
      ctx.fillText("KARAKORAM · PAKISTAN–CHINA BORDER", w / 2, h / 2 + 42);
    },
    { repeat: [1, 1] }
  );
  stage.trackTexture(signTexture);
  const sign = box(stage, 5.8, 1.1, 0.12, stage.material("#ffffff", { map: signTexture, roughness: 0.8 }), 0, 4.35, 0.38);
  group.add(sign);
  const flagPole = box(stage, 0.08, 5.4, 0.08, timber, 4.4, 3.2, 1.2);
  group.add(flagPole);
  const flag = mesh(stage, new THREE.PlaneGeometry(1.55, 0.9), stage.material("#e0b153", { side: THREE.DoubleSide, roughness: 0.9 }), 5.15, 5.4, 1.2);
  group.add(flag);
  stage.animate((time) => {
    if (!stage.reducedMotion) flag.rotation.y = 0.2 + Math.sin(time * 1.8) * 0.18;
  });
  return group;
}

function stoneHouse(stage, { x, z, rotation = 0, width = 4.2, depth = 3.5, height = 2.9, stoneMap, timberMap, accent = "#7a6e5e" }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const stone = stage.material("#ffffff", { map: stoneMap, roughness: 1 });
  const timber = stage.material("#ffffff", { map: timberMap, roughness: 0.9 });
  const dark = stage.material("#2a211b", { roughness: 0.9 });
  group.add(box(stage, width, height, depth, stone, 0, height / 2, 0));
  group.add(box(stage, width + 0.45, 0.25, depth + 0.45, timber, 0, height + 0.1, 0));
  for (let index = 0; index < 4; index += 1) {
    group.add(box(stage, 0.12, 0.12, depth + 0.6, timber, -width / 2 + 0.5 + index * ((width - 1) / 3), height + 0.02, 0));
  }
  group.add(box(stage, 1.0, 1.7, 0.12, dark, -width * 0.18, 0.85, depth / 2 + 0.08));
  group.add(box(stage, 0.65, 0.6, 0.12, dark, width * 0.24, 1.5, depth / 2 + 0.08));
  group.add(box(stage, 0.88, 0.82, 0.1, timber, width * 0.24, 1.5, depth / 2 + 0.04));
  group.add(box(stage, 1.25, 0.2, 0.7, timber, width * 0.24, 2.6, depth / 2 + 0.2));
  return group;
}

function buildVillage(stage, stoneMap, timberMap) {
  const group = new THREE.Group();
  group.position.set(-8.6, 0, -4.8);
  const terrain = box(stage, 11, 1.2, 9, stage.material("#746d5d", { roughness: 1 }), 0, 0.6, 0);
  group.add(terrain);
  const terraceTop = box(stage, 10.6, 0.18, 8.5, stage.material("#6e8058", { roughness: 1 }), 0, 1.27, 0);
  group.add(terraceTop);
  const houseA = stoneHouse(stage, { x: -2.4, z: -1.1, rotation: 0.22, width: 4.1, depth: 3.3, height: 2.9, stoneMap, timberMap });
  const houseB = stoneHouse(stage, { x: 2.1, z: 0.2, rotation: -0.3, width: 3.6, depth: 3.2, height: 2.5, stoneMap, timberMap });
  const houseC = stoneHouse(stage, { x: -0.5, z: -2.9, rotation: 0.04, width: 3.3, depth: 2.8, height: 2.4, stoneMap, timberMap });
  group.add(houseA, houseB, houseC);
  for (let index = 0; index < 3; index += 1) {
    group.add(box(stage, 2.4, 0.09, 0.8, stage.material("#5a3f2c", { roughness: 0.9 }), -3.4 + index * 0.2, 3.0, 1.4 + index * 0.5));
  }
  group.add(tree(-4.4, 2.5, 0.7, "#4f7050", "#ead3c3"));
  group.add(tree(4.0, 2.7, 0.52, "#4f7050", "#e9c5b8"));
  group.add(box(stage, 3.2, 0.5, 1.0, stage.material("#8a7a5e", { roughness: 1 }), 1.8, 1.55, 3.3));
  return group;
}

function buildRoadsideMarket(stage) {
  const group = new THREE.Group();
  group.position.set(-6.6, 0, 7.8);
  group.rotation.y = 0.2;
  const wood = stage.material("#68482f", { roughness: 0.92 });
  const tarp = stage.material("#a84d3b", { roughness: 0.9 });
  group.add(box(stage, 3.5, 0.85, 1.3, wood, 0, 0.42, 0));
  group.add(box(stage, 3.7, 0.12, 1.55, stage.material("#c7ae83", { roughness: 0.94 }), 0, 0.9, 0));
  [-1.6, 1.6].forEach((x) => {
    group.add(box(stage, 0.1, 2.8, 0.1, wood, x, 1.4, -0.5));
    group.add(box(stage, 0.1, 2.8, 0.1, wood, x, 1.4, 0.5));
  });
  const roof = box(stage, 3.8, 0.1, 2.0, tarp, 0, 2.9, 0);
  group.add(roof);
  const items = [
    ["#d59b42", "sack"],
    ["#8d3f36", "sack"],
    ["#e1c27f", "crate"],
    ["#a86136", "crate"],
  ];
  items.forEach(([color, type], index) => {
    const x = -1.25 + index * 0.8;
    const item = type === "sack"
      ? mesh(stage, new THREE.DodecahedronGeometry(0.34, 0), stage.material(color, { roughness: 0.98 }), x, 1.15, 0.1)
      : box(stage, 0.65, 0.55, 0.55, stage.material(color, { roughness: 0.95 }), x, 1.2, 0.1);
    group.add(item);
  });
  const teaPot = cylinder(stage, 0.2, 0.16, 0.28, 8, stage.material("#b58c4d", { metalness: 0.2, roughness: 0.45 }), 1.15, 1.18, 0.38);
  group.add(teaPot);
  for (let index = 0; index < 3; index += 1) {
    const cup = cylinder(stage, 0.07, 0.05, 0.1, 8, stage.material("#e6d4b5", { roughness: 0.8 }), 0.8 + index * 0.22, 1.08, 0.3);
    group.add(cup);
  }
  const fuel = cylinder(stage, 0.22, 0.22, 0.6, 8, stage.material("#47605e", { metalness: 0.2, roughness: 0.6 }), 1.35, 0.4, 0.9);
  group.add(fuel);
  return group;
}

function buildHandicraftStall(stage) {
  const group = new THREE.Group();
  group.position.set(7.2, 0, 3.2);
  group.rotation.y = -0.25;
  const wood = stage.material("#66462e", { roughness: 0.92 });
  group.add(box(stage, 3.2, 0.85, 1.2, wood, 0, 0.42, 0));
  group.add(box(stage, 3.4, 0.12, 1.45, stage.material("#c9ae82", { roughness: 0.94 }), 0, 0.9, 0));
  [-1.4, 1.4].forEach((x) => group.add(box(stage, 0.1, 2.7, 0.1, wood, x, 1.35, -0.5)));
  group.add(box(stage, 3.6, 0.1, 1.8, stage.material("#315d6a", { roughness: 0.9 }), 0, 2.8, 0.1));
  const woolColors = ["#c7b08a", "#8c4039", "#3f6b5b", "#d6a543"];
  woolColors.forEach((color, index) => {
    const shawl = box(stage, 0.6, 1.5, 0.04, stage.material(color, { roughness: 0.94 }), -1.05 + index * 0.7, 2.0, 0.8);
    group.add(shawl);
    for (let stripe = 0; stripe < 3; stripe += 1) {
      group.add(box(stage, 0.6, 0.05, 0.035, stage.material("#eee0c5", { roughness: 0.9 }), -1.05 + index * 0.7, 1.55 + stripe * 0.42, 0.83));
    }
  });
  for (let index = 0; index < 3; index += 1) {
    const ball = sphere(stage, 0.24, stage.material(woolColors[index], { roughness: 1 }), -0.8 + index * 0.65, 1.12, 0.18, 0);
    group.add(ball);
  }
  group.add(box(stage, 0.9, 0.7, 0.12, stage.material("#d6c3a1", { roughness: 0.9 }), 0, 1.7, 0.72));
  return group;
}

function buildExchangeStation(stage) {
  const group = new THREE.Group();
  group.position.set(-7.4, 0, -9.8);
  group.rotation.y = 0.4;
  const wood = stage.material("#6a4a31", { roughness: 0.92 });
  const canvas = stage.material("#d6c09b", { roughness: 0.95, side: THREE.DoubleSide });
  const carpet = stage.material("#8e3b3e", { roughness: 0.95 });
  group.add(box(stage, 4.4, 0.12, 4.0, stage.material("#8a7a61", { roughness: 1 }), 0, 0.06, 0));
  group.add(box(stage, 4.0, 0.05, 3.6, carpet, 0, 0.15, 0));
  [-2.0, 2.0].forEach((x) => {
    group.add(box(stage, 0.12, 2.4, 0.12, wood, x, 1.2, -1.6));
  });
  group.add(box(stage, 4.2, 0.1, 3.4, canvas, 0, 2.45, 0.1));
  const backPanel = mesh(stage, new THREE.PlaneGeometry(4.0, 2.2), canvas, 0, 1.4, -1.75);
  group.add(backPanel);
  const lowTable = box(stage, 1.8, 0.18, 1.0, wood, 0, 0.55, 0.1);
  group.add(lowTable);
  const pot = cylinder(stage, 0.2, 0.24, 0.32, 8, stage.material("#b28245", { metalness: 0.2, roughness: 0.4 }), 0.1, 0.8, 0.1);
  group.add(pot);
  const steam = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshBasicMaterial({ color: "#fff6e8", transparent: true, opacity: 0.24, depthWrite: false }));
  steam.position.set(0.1, 1.1, 0.1);
  stage.trackGeometry(steam.geometry);
  group.add(steam);
  stage.animate((time) => {
    if (stage.reducedMotion) return;
    steam.position.y = 1.1 + ((time * 0.25) % 0.55);
  });
  [-1.0, 1.0].forEach((x) => {
    const cushion = box(stage, 0.7, 0.22, 0.7, stage.material(x < 0 ? "#416f64" : "#b88a48", { roughness: 0.95 }), x, 0.2, 0.8);
    group.add(cushion);
    group.add(box(stage, 0.5, 0.45, 0.5, wood, x, 0.38, 0.8));
  });
  for (let index = 0; index < 3; index += 1) {
    const cup = cylinder(stage, 0.08, 0.06, 0.12, 8, stage.material("#ede0c7", { roughness: 0.8 }), -0.2 + index * 0.2, 0.7, 0.1);
    group.add(cup);
  }
  return group;
}

function buildViewpoint(stage) {
  const group = new THREE.Group();
  group.position.set(3.8, 0, -5.0);
  group.rotation.y = -0.55;
  const stone = stage.material("#7d776a", { roughness: 1 });
  const wood = stage.material("#6a4a31", { roughness: 0.92 });
  group.add(box(stage, 6.0, 0.5, 4.2, stone, 0, 1.55, 0));
  for (let index = 0; index < 3; index += 1) {
    group.add(box(stage, 5.6, 0.2, 1.2, stone, 0, 0.4 + index * 0.4, 1.5 - index * 0.42));
  }
  for (let index = 0; index < 5; index += 1) {
    group.add(box(stage, 0.12, 1.0, 0.12, wood, -2.6 + index * 1.3, 2.3, 2.0));
  }
  group.add(box(stage, 5.8, 0.1, 0.1, wood, 0, 2.8, 2.0));
  group.add(box(stage, 5.8, 0.1, 0.1, wood, 0, 2.3, 2.0));
  const scope = new THREE.Group();
  scope.position.set(1.1, 1.8, 1.4);
  scope.add(box(stage, 0.14, 1.6, 0.14, wood, 0, 0.8, 0));
  const tube = cylinder(stage, 0.14, 0.18, 0.75, 10, stage.material("#364348", { metalness: 0.3, roughness: 0.45 }), 0, 1.58, 0.2);
  tube.rotation.x = Math.PI / 2.5;
  scope.add(tube);
  group.add(scope);
  group.add(box(stage, 2.1, 0.18, 0.6, wood, -1.55, 2.05, 0.75));
  return group;
}

function buildMonument(stage, stoneMap) {
  const group = new THREE.Group();
  group.position.set(7.0, 0, 11.8);
  const stone = stage.material("#ffffff", { map: stoneMap, roughness: 1 });
  const dark = stage.material("#5f594e", { roughness: 1 });
  const brass = stage.material("#c9a053", { metalness: 0.45, roughness: 0.4 });
  group.add(box(stage, 3.0, 0.35, 3.0, dark, 0, 0.18, 0));
  group.add(box(stage, 2.3, 0.35, 2.3, stone, 0, 0.53, 0));
  group.add(box(stage, 1.1, 5.4, 1.1, stone, 0, 3.2, 0));
  const top = mesh(stage, new THREE.ConeGeometry(0.85, 1.2, 4), dark, 0, 6.3, 0);
  top.rotation.y = Math.PI / 4;
  group.add(top);
  const plaque = box(stage, 1.4, 1.1, 0.08, brass, 0, 3.0, 0.59);
  group.add(plaque);
  for (let index = 0; index < 3; index += 1) {
    group.add(box(stage, 1.1, 0.07, 0.05, stage.material("#f3e5c5", { roughness: 0.8 }), 0, 3.3 - index * 0.22, 0.64));
  }
  const ring = mesh(stage, new THREE.TorusGeometry(2.1, 0.05, 6, 30), stage.material("#86765b", { roughness: 0.8 }), 0, 0.06, 0);
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);
  return group;
}

function buildMilestone(stage) {
  const group = new THREE.Group();
  group.position.set(-3.6, 0, 13.2);
  const stone = stage.material("#99917f", { roughness: 1 });
  const paint = stage.material("#e9d7b2", { roughness: 0.82 });
  group.add(box(stage, 1.2, 2.2, 0.7, stone, 0, 1.1, 0));
  group.add(box(stage, 1.0, 0.7, 0.08, paint, 0, 1.55, 0.36));
  group.add(box(stage, 0.8, 0.06, 0.06, stage.material("#a64d36", { roughness: 0.85 }), 0, 1.7, 0.42));
  group.add(box(stage, 0.6, 0.06, 0.06, stage.material("#3c6b5a", { roughness: 0.85 }), 0, 1.5, 0.42));
  const base = box(stage, 1.8, 0.25, 1.2, stage.material("#7a7264", { roughness: 1 }), 0, 0.13, 0);
  group.add(base);
  return group;
}

function buildBridge(stage) {
  const group = new THREE.Group();
  group.position.set(-10.5, 0.05, 3.0);
  group.rotation.y = Math.PI / 2;
  const wood = stage.material("#6e4d30", { roughness: 0.95 });
  for (let index = 0; index < 8; index += 1) {
    const plank = box(stage, 2.2, 0.12, 0.4, wood, 0, 0.42 + Math.sin((index / 7) * Math.PI) * 0.42, -1.5 + index * 0.4);
    group.add(plank);
  }
  [-1.15, 1.15].forEach((x) => {
    for (let index = 0; index < 4; index += 1) {
      group.add(box(stage, 0.12, 1.4, 0.12, wood, x, 0.9, -1.4 + index * 0.9));
    }
    const rope = mesh(stage, new THREE.CylinderGeometry(0.025, 0.025, 3.6, 4), stage.material("#b09665", { roughness: 0.9 }), x, 1.55, 0);
    rope.rotation.x = Math.PI / 2;
    group.add(rope);
  });
  return group;
}


/* ------------------------------------------------------------------
   The walkable Karakoram Highway: Chilas to Tashkurgan.
   The road follows one long valley northwards. Places keep their
   real order along the highway; distances are compressed.
   ------------------------------------------------------------------ */

const KEYS = (list) => (t) => {
  if (t <= list[0][0]) return list[0][1];
  for (let i = 0; i < list.length - 1; i += 1) {
    const a = list[i], b = list[i + 1];
    if (t <= b[0]) {
      const u = (t - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * u * u * (3 - 2 * u);
    }
  }
  return list[list.length - 1][1];
};
const FLOOR = KEYS([[0, 0], [0.22, 6], [0.3, 10], [0.45, 22], [0.62, 30], [0.76, 42], [0.84, 60], [0.92, 112], [0.95, 108], [1, 86]]);
const HALFW = KEYS([[0, 70], [0.1, 56], [0.2, 42], [0.3, 50], [0.45, 86], [0.56, 76], [0.62, 56], [0.7, 72], [0.78, 56], [0.86, 72], [0.92, 112], [1, 175]]);
const LAKE = [0.553, 0.607];

export default function buildKarakoram({ scene, stage, manager }) {
  const LOWQ = stage.quality === "low";
  const kit = createKit(stage, manager.renderer, 20261106);
  const { rnd, rr, M, ctex, noiseFill, mk, bx, cy, block, blockRect, blocked, _o } = kit;

  /* ---------- the route ---------- */
  const CTRL = [[0, 700], [40, 560], [-10, 420], [50, 280], [0, 140], [-50, 0], [0, -140], [70, -280], [40, -420], [-30, -560], [20, -700], [90, -840], [60, -980], [0, -1100], [-80, -1220], [-60, -1360]];
  const curve = new THREE.CatmullRomCurve3(CTRL.map((p) => new THREE.Vector3(p[0], 0, p[1])));
  const NS = 760;
  const RP = curve.getSpacedPoints(NS);
  const ROUTE_LEN = curve.getLength();
  const TAN = RP.map((p, i) => {
    const a = RP[Math.max(0, i - 1)], b = RP[Math.min(NS, i + 1)];
    const L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return [(b.x - a.x) / L, (b.z - a.z) / L];
  });
  const rOff = (t) => Math.min(HALFW(t) * 0.42, 28);
  const lakeLevel = FLOOR(LAKE[1]) - 2;
  const at = (t, side = 0) => {
    const i = Math.max(0, Math.min(NS, Math.round(t * NS)));
    const p = RP[i], n = [-TAN[i][1], TAN[i][0]];
    return [p.x + n[0] * side, p.z + n[1] * side];
  };

  /* nearest route sample via a coarse grid of candidate indices */
  const G = { x0: -1300, z0: -2000, c: 20 };
  G.nx = Math.ceil(2600 / G.c);
  G.nz = Math.ceil(3400 / G.c);
  const gridIdx = new Int16Array(G.nx * G.nz);
  for (let j = 0; j < G.nz; j += 1) for (let i = 0; i < G.nx; i += 1) {
    const x = G.x0 + (i + 0.5) * G.c, z = G.z0 + (j + 0.5) * G.c;
    let best = 0, bd = 1e12;
    for (let k = 0; k <= NS; k += 2) {
      const dx = x - RP[k].x, dz = z - RP[k].z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = k; }
    }
    gridIdx[j * G.nx + i] = best;
  }
  const near = { i: 0, t: 0, d: 0, sd: 0 };
  function nearest(x, z) {
    const gi = Math.min(G.nx - 1, Math.max(0, Math.floor((x - G.x0) / G.c)));
    const gj = Math.min(G.nz - 1, Math.max(0, Math.floor((z - G.z0) / G.c)));
    const c = gridIdx[gj * G.nx + gi];
    let best = c, bd = 1e12;
    for (let k = Math.max(0, c - 14); k <= Math.min(NS, c + 14); k += 1) {
      const dx = x - RP[k].x, dz = z - RP[k].z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = k; }
    }
    const p = RP[best], tn = TAN[best];
    const dx = x - p.x, dz = z - p.z;
    near.i = best;
    near.t = best / NS;
    near.sd = dx * -tn[1] + dz * tn[0];
    near.d = Math.abs(near.sd);
    return near;
  }

  /* massifs seen from the road */
  const NANGA = at(0.15, 470);
  const RAKA = at(0.47, 330);
  const CONES = [];
  for (let k = 0; k < 7; k += 1) {
    const p = at(0.69 + k * 0.006, 150 + (k % 2) * 20);
    CONES.push([p[0], p[1], 150 + (k % 3) * 40 + (k === 3 ? 70 : 0)]);
  }
  const ridged = (x, z) => {
    const r = 1 - Math.abs(fbm(x * 0.004 + 3, z * 0.004 + 7, 5) * 2 - 1);
    return r * r;
  };
  function terrainH(x, z) {
    const n = nearest(x, z);
    const t = n.t, f = FLOOR(t), w = HALFW(t);
    let h = f + fbm(x * 0.02, z * 0.02, 3) * 3 - 1;
    const wall = ss(w * 0.8, w * 0.8 + 150, n.d);
    const plateau = lerp(1, 0.5, ss(0.86, 0.95, t));
    h += wall * (90 + ridged(x, z) * 260 + fbm(x * 0.025, z * 0.025, 4) * 90) * plateau;
    h += 820 * ss(380, 30, Math.hypot(x - NANGA[0], z - NANGA[1])) * (0.75 + 0.25 * fbm(x * 0.01, z * 0.01, 3));
    h += 560 * ss(300, 30, Math.hypot(x - RAKA[0], z - RAKA[1])) * (0.75 + 0.25 * fbm(x * 0.012, z * 0.012, 3));
    for (const c of CONES) h += c[2] * Math.pow(ss(55, 0, Math.hypot(x - c[0], z - c[1])), 1.6);
    // river and Attabad Lake
    const inLake = t > LAKE[0] && t < LAKE[1];
    const half = inLake ? 26 : t < 0.3 ? 15 : 11;
    const rd = Math.abs(n.sd - rOff(t));
    const wl = inLake ? lakeLevel : f - 2;
    if (rd < half + 10) h += (Math.min(h, wl - 2.4) - h) * ss(half + 10, half - 4, rd);
    return h;
  }

  /* cache heights on a grid so walking and building stay fast */
  const HC = { x0: -1300, z0: -2000, c: 2 };
  HC.nx = Math.ceil(2600 / HC.c) + 1;
  HC.nz = Math.ceil(3400 / HC.c) + 1;
  const hcache = new Map();
  function hgt(x, z) {
    const gx = (x - HC.x0) / HC.c, gz = (z - HC.z0) / HC.c;
    const i = Math.floor(gx), j = Math.floor(gz), u = gx - i, v = gz - j;
    const get = (a, b) => {
      const k = b * HC.nx + a;
      let h = hcache.get(k);
      if (h === undefined) { h = terrainH(HC.x0 + a * HC.c, HC.z0 + b * HC.c); hcache.set(k, h); }
      return h;
    };
    const h00 = get(i, j), h10 = get(i + 1, j), h01 = get(i, j + 1), h11 = get(i + 1, j + 1);
    return h00 * (1 - u) * (1 - v) + h10 * u * (1 - v) + h01 * (1 - u) * v + h11 * u * v;
  }

  /* ---------- textures and materials ---------- */
  const TX = {};
  TX.road = ctex(128, 128, (g, w, h) => {
    g.fillStyle = "#4b4a48"; g.fillRect(0, 0, w, h);
    noiseFill(g, w, h, 3000, 0.25, 30, 120);
    g.fillStyle = "#e8e2d2"; g.fillRect(4, 0, 3, h); g.fillRect(w - 7, 0, 3, h);
    g.fillStyle = "#e3b23c"; for (let y = 0; y < h; y += 32) g.fillRect(w / 2 - 2, y, 4, 18);
  });
  TX.stone = ctex(256, 256, (g, w, h) => {
    g.fillStyle = "#6a6256"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 22) for (let x = -((y / 22) % 2) * 18; x < w; x += 36) {
      const v = Math.random() * 30 - 15;
      g.fillStyle = `rgb(${150 + v},${140 + v},${124 + v})`;
      g.fillRect(x + 2, y + 2, 32 + Math.random() * 6 - 3, 18);
    }
    noiseFill(g, w, h, 2500, 0.12, 30, 200);
  });
  TX.house = ctex(256, 192, (g, w, h) => {
    g.fillStyle = "#6a6256"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = -((y / 16) % 2) * 14; x < w; x += 28) {
      const v = Math.random() * 30 - 15;
      g.fillStyle = `rgb(${168 + v},${156 + v},${136 + v})`;
      g.fillRect(x + 1.5, y + 1.5, 25, 13);
    }
    g.fillStyle = "#4a3324"; g.fillRect(0, 34, w, 7); g.fillRect(0, 120, w, 7);
    [[40, 60], [180, 60]].forEach(([x, y]) => { g.fillStyle = "#3b2a1c"; g.fillRect(x - 4, y - 4, 44, 40); g.fillStyle = "#1d2530"; g.fillRect(x, y, 36, 32); });
    g.fillStyle = "#5a3a22"; g.fillRect(110, 112, 40, 80);
  });
  TX.houseEmi = ctex(256, 192, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffb35a"; g.fillRect(40, 60, 36, 32);
    if (Math.random() < 0.6) g.fillRect(180, 60, 36, 32);
  });
  TX.carving = ctex(256, 256, (g, w, h) => {
    g.fillStyle = "#3a2c22"; g.fillRect(0, 0, w, h);
    noiseFill(g, w, h, 5000, 0.2, 20, 90);
    g.strokeStyle = "rgba(214,190,150,.85)"; g.lineWidth = 3; g.lineCap = "round";
    const ibex = (x, y, s) => {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30 * s, y);
      g.moveTo(x + 4 * s, y); g.lineTo(x + 2 * s, y + 16 * s); g.moveTo(x + 26 * s, y); g.lineTo(x + 28 * s, y + 16 * s);
      g.moveTo(x + 30 * s, y); g.lineTo(x + 36 * s, y - 8 * s);
      g.moveTo(x + 34 * s, y - 8 * s); g.quadraticCurveTo(x + 22 * s, y - 30 * s, x + 14 * s, y - 14 * s); g.stroke();
    };
    ibex(30, 70, 1.2); ibex(150, 60, 0.9); ibex(120, 190, 1);
    g.beginPath(); g.arc(70, 180, 20, Math.PI, 0); g.moveTo(50, 180); g.lineTo(90, 180); g.moveTo(70, 160); g.lineTo(70, 130); g.moveTo(60, 140); g.lineTo(80, 140); g.stroke();
    g.font = "16px serif"; g.fillStyle = "rgba(214,190,150,.8)";
    for (let i = 0; i < 6; i += 1) g.fillText("𐨐𐨯𐨪𐨆", 140 + (i % 2) * 40, 110 + i * 12);
  });
  TX.truck = ctex(256, 128, (g, w, h) => {
    const cs = ["#e23b2e", "#1d6fd1", "#f2c230", "#2e9e52", "#e2569a", "#f08a24"];
    g.fillStyle = cs[(Math.random() * cs.length) | 0]; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i += 1) { g.fillStyle = cs[i % cs.length]; g.fillRect(i * 32, 0, 32, 14); g.fillRect(i * 32 + 16, h - 14, 32, 14); }
    for (let i = 0; i < 5; i += 1) {
      const x = 26 + i * 50, y = h / 2;
      for (let p = 0; p < 6; p += 1) { g.fillStyle = cs[(p + i) % cs.length]; g.beginPath(); g.ellipse(x + Math.cos(p) * 10, y + Math.sin(p) * 10, 8, 5, p, 0, 7); g.fill(); }
      g.fillStyle = "#fff4c8"; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill();
    }
    g.strokeStyle = "#f6e4a2"; g.lineWidth = 3; g.strokeRect(3, 16, w - 6, h - 32);
  });
  TX.cloud = ctex(256, 128, (g, w, h) => {
    for (let i = 0; i < 26; i += 1) {
      const x = w * 0.15 + Math.random() * w * 0.7, y = h * 0.4 + Math.random() * h * 0.3, r = 18 + Math.random() * 34;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  });
  TX.cloud.wrapS = TX.cloud.wrapT = THREE.ClampToEdgeWrapping;
  const MAT = {
    stone: M({ map: TX.stone, color: "#d9cfbd" }),
    white: M({ color: "#e9e4d8", roughness: 0.9 }),
    wood: M({ color: "#6b4a30", roughness: 0.9 }),
    dark: M({ color: "#2a2724", roughness: 0.7 }),
    steel: M({ color: "#8d949a", metalness: 0.6, roughness: 0.4 }),
    rock: M({ map: TX.carving, roughness: 0.95 }),
    sign: M({ color: "#1f5a3a", roughness: 0.6 }),
    yellow: M({ color: "#e3b23c", roughness: 0.6 }),
    mud: M({ color: "#9a8466", roughness: 1 }),
  };
  const stoneMap = stage.trackTexture(stoneTexture("#898174", "#605a50", [2, 3]));
  const timberMap = stage.trackTexture(woodTexture("#63412a", "#3b2316", [2, 2]));

  /* ---------- terrain mesh ---------- */
  (function terrain() {
    const SX = 2400, SZ = 3200, NX = LOWQ ? 220 : 300, NZ = LOWQ ? 320 : 460;
    const g = new THREE.PlaneGeometry(SX, SZ, NX, NZ);
    g.rotateX(-Math.PI / 2);
    g.translate(20, 0, -330);
    const p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
    const pal = {
      sand: col("#94805f"), dry: col("#7d6c52"), rock: col("#4a4036"), rock2: col("#6b5c4b"), snow: col("#eef1f5"), ice: col("#cfe0ea"),
      green: col("#6f8a3c"), terrace: col("#8fa04a"), gold: col("#c9a64a"), tundra: col("#8a8460"), grass: col("#9c9a5a"), bank: col("#8a8272"), silt: col("#5e5a4e"),
    };
    for (let i = 0; i < p.count; i += 1) {
      const x = p.getX(i), z = p.getZ(i), h = terrainH(x, z);
      p.setY(i, h);
      const n = nearest(x, z), t = n.t, f = FLOOR(t), rel = h - f, nz = fbm(x * 0.05, z * 0.05, 3);
      const snowLine = 300 + nz * 110 - ss(0.84, 0.95, t) * 90;
      if (h > snowLine) c.copy(pal.snow).lerp(pal.ice, nz * 0.4);
      else if (rel > 26 || n.d > HALFW(t) * 1.05) {
        const strata = 0.7 + 0.6 * fbm(x * 0.02 + h * 0.06, z * 0.02, 3);
        c.copy(pal.rock).lerp(pal.rock2, nz).multiplyScalar(strata).lerp(pal.snow, ss(snowLine - 40, snowLine, h) * 0.6);
      }
      else {
        if (t < 0.32) c.copy(pal.sand).lerp(pal.dry, nz);
        else if (t < 0.44) c.copy(pal.dry).lerp(pal.green, ss(0.36, 0.44, t) * 0.6);
        else if (t < 0.77) {
          const fx = Math.floor((x + nz * 8) / 12), fz = Math.floor((z + nz * 6) / 9), r = hs(fx, fz);
          c.copy(r < 0.4 ? pal.terrace : r < 0.7 ? pal.green : r < 0.88 ? pal.gold : pal.dry);
          c.lerp(pal.dry, ss(10, 24, rel));
          if (Math.sin(h * 2.2) > 0.7 && rel > 2) c.multiplyScalar(0.82);
        } else if (t < 0.88) c.copy(pal.dry).lerp(pal.tundra, nz);
        else if (t < 0.965) c.copy(pal.tundra).lerp(pal.snow, ss(0.6, 0.9, nz) * 0.5);
        else c.copy(pal.grass).lerp(pal.tundra, nz * 0.6);
      }
      const rd = Math.abs(n.sd - rOff(t));
      if (rd < 22) { c.lerp(pal.bank, ss(22, 12, rd)); if (rd < 10) c.copy(pal.silt); }
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    g.computeVertexNormals();
    const nrm = g.attributes.normal;
    for (let i = 0; i < p.count; i += 1) {
      const k = ss(0.78, 0.5, nrm.getY(i)) * 0.85;
      if (k > 0) {
        c.setRGB(cols[i * 3], cols[i * 3 + 1], cols[i * 3 + 2]).lerp(pal.rock.clone().multiplyScalar(0.6 + 0.6 * hs(i, 5)), k);
        cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
      }
    }
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    stage.trackGeometry(g);
    const m = new THREE.Mesh(g, M({ vertexColors: true, roughness: 0.97 }));
    m.receiveShadow = true;
    stage.add(m);
  })();

  /* ---------- river, lake and road ---------- */
  const riverPts = RP.map((p, i) => { const [x, z] = at(i / NS, rOff(i / NS)); return new THREE.Vector3(x, 0, z); });
  kit.ribbon(riverPts, (i) => (i / NS < 0.3 ? 30 : 22), (x, z, p, i) => {
    const t = i / NS;
    return t > LAKE[0] && t < LAKE[1] ? lakeLevel - 0.4 : FLOOR(t) - 2;
  }, M({ color: "#566a63", roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.95 }), 30);
  const lakePts = riverPts.slice(Math.floor(LAKE[0] * NS) - 4, Math.ceil(LAKE[1] * NS) + 1);
  kit.ribbon(lakePts, (i) => 52 * Math.sin(Math.min(1, (i + 2) / (lakePts.length + 2)) * Math.PI) + 8, () => lakeLevel, M({ color: "#2ba3ad", roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.95 }), 40);
  const roadY = (t, x, z) => Math.max(FLOOR(t) + 0.12, hgt(x, z) + 0.06);
  kit.ribbon(RP, 7, (x, z, p, i) => roadY(i / NS, p.x, p.z), M({ map: TX.road, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 7);

  /* ---------- places ---------- */
  const mkPlace = (n, zh, sub, t, r, spawnSide, lookSide, extra = {}) => {
    const [x, z] = at(t, 0);
    const sp = at(t + (extra.back ?? -0.012), spawnSide);
    const lk = at(t + (extra.lookAhead ?? 0.01), lookSide);
    return Object.assign({ n, zh, sub, x, z, r, t, spawn: sp, look: lk, pitch: 1.25, dist: 14 }, extra);
  };
  const PL = {
    chilas: mkPlace("Chilas rock carvings", "奇拉斯岩画", "چلاس", 0.05, 30, -2, -16),
    nanga: mkPlace("Nanga Parbat viewpoint", "南迦帕尔巴特峰观景点", "نانگا پربت", 0.15, 30, -6, 470, { pitch: 1.42, dist: 12, back: -0.004, lookAhead: 0 }),
    junction: mkPlace("Where three ranges meet", "三大山脉交汇点", "جگلوٹ", 0.26, 30, -3, -14),
    hunza: mkPlace("Karimabad, Hunza", "卡里马巴德（罕萨）", "کریم آباد", 0.47, 50, -4, -40, { pitch: 1.3 }),
    attabad: mkPlace("Attabad Lake", "阿塔巴德湖", "عطا آباد جھیل", 0.58, 40, -4, 40, { pitch: 1.35, back: -0.006, lookAhead: 0 }),
    hussaini: mkPlace("Hussaini Bridge", "侯赛尼吊桥", "حسینی پل", 0.645, 25, -3, 30, { back: -0.006, lookAhead: 0 }),
    passu: mkPlace("Passu", "帕苏", "پاسو", 0.7, 40, -4, 150, { pitch: 1.38, back: -0.01, lookAhead: 0 }),
    sost: mkPlace("Sost", "苏斯特", "سوست", 0.78, 35, -4, -12),
    khunjerab: mkPlace("Khunjerab Pass · 4,693 m", "红其拉甫山口 · 4693米", "خنجراب", 0.92, 35, -1.5, 0, { back: -0.009, lookAhead: 0, pitch: 1.42, dist: 15 }),
    tashkurgan: mkPlace("Tashkurgan", "塔什库尔干", "塔什库尔干", 0.985, 70, -10, -55, { back: -0.012, lookAhead: 0 }),
  };

  /* ---------- the walker and the engine ---------- */
  const nightMats = [];
  const isOnBridge = (x, z) => {
    if (!BRIDGE) return null;
    const ax = BRIDGE.a[0], az = BRIDGE.a[1], vx = BRIDGE.b[0] - ax, vz = BRIDGE.b[1] - az;
    const L2 = vx * vx + vz * vz;
    let u = ((x - ax) * vx + (z - az) * vz) / L2;
    if (u < 0 || u > 1) return null;
    const dx = x - (ax + vx * u), dz = z - (az + vz * u);
    if (dx * dx + dz * dz > 0.9 * 0.9) return null;
    return lerp(BRIDGE.ya, BRIDGE.yb, u) - Math.sin(u * Math.PI) * BRIDGE.sag;
  };
  let BRIDGE = null;
  function groundY(x, z) {
    const by = isOnBridge(x, z);
    if (by !== null) return by;
    const n = nearest(x, z);
    const h = hgt(x, z);
    return n.d < 3.6 ? Math.max(h, FLOOR(n.t) + 0.12) : h;
  }
  function canStand(x, z) {
    if (isOnBridge(x, z) !== null) return true;
    if (x < -700 || x > 740 || z < -1640 || z > 980) return false;
    if (blocked(x, z, 0.45)) return false;
    const n = nearest(x, z), t = n.t, h = hgt(x, z);
    const inLake = t > LAKE[0] && t < LAKE[1];
    const rd = Math.abs(n.sd - rOff(t));
    if (rd < (inLake ? 28 : 13) && h < (inLake ? lakeLevel : FLOOR(t) - 2) + 0.3) return false;
    if (h - FLOOR(t) > 45) return false;
    return true;
  }
  const W = createWalker({
    scene, stage, manager, kit, places: PL, startPlace: "chilas",
    worldName: { en: "Karakoram Highway", zh: "喀喇昆仑公路", sub: "شاہراہ قراقرم" },
    hgt, groundY, canStand, nightMats, kmPerUnit: 0.24, runSpeed: 14, exposureScale: 0.74, fogDensity: 0.00042, far: 5200,
    mapBounds: { x0: -1150, x1: 1150, z0: -1550, z1: 750 },
    mapLines: [RP.filter((p, i) => i % 8 === 0).map((p) => [p.x, p.z])],
    mapColor: (x, z) => {
      const n = nearest(x, z), h = hgt(x, z), t = n.t;
      if (Math.abs(n.sd - rOff(t)) < (t > LAKE[0] && t < LAKE[1] ? 24 : 9) && h < FLOOR(t)) return t > LAKE[0] && t < LAKE[1] ? [60, 170, 180] : [90, 120, 140];
      if (h > 330) return [235, 238, 242];
      const k = Math.min(1, Math.max(0, (h - FLOOR(t)) / 300));
      return [Math.round(160 - k * 60), Math.round(145 - k * 55), Math.round(110 - k * 35)];
    },
  });

  /* ---------- helpers for placing things beside the road ---------- */
  function site(t, side, extraYaw = 0, faceRoad = true) {
    const [x, z] = at(t, side);
    const g = new THREE.Group();
    const i = Math.round(t * NS);
    const roadYaw = Math.atan2(TAN[i][0], TAN[i][1]);
    g.position.set(x, hgt(x, z), z);
    g.rotation.y = (faceRoad ? roadYaw + (side < 0 ? Math.PI / 2 : -Math.PI / 2) : roadYaw) + extraYaw;
    g.updateMatrixWorld(true);
    return g;
  }
  const place = (group, t, side, extraYaw = 0) => {
    const [x, z] = at(t, side);
    const i = Math.round(t * NS);
    group.position.set(x, hgt(x, z), z);
    group.rotation.y = Math.atan2(TAN[i][0], TAN[i][1]) + (side < 0 ? Math.PI / 2 : -Math.PI / 2) + extraYaw;
    group.updateMatrixWorld(true);
    return group;
  };
  const beaconAt = (t, side) => at(t, side);

  /* ---------- Chilas rock carvings ---------- */
  (function () {
    const g = site(0.05, -16);
    for (let k = 0; k < 7; k += 1) {
      const r = mk(new THREE.DodecahedronGeometry(1.4 + (k % 3) * 0.6, 0), MAT.rock, -6 + k * 2.1, 1 + (k % 2) * 0.3, (k % 2) * 1.6, g);
      r.rotation.set(k * 0.7, k * 1.3, k * 0.4);
      r.scale.set(1.3, 0.9, 1);
    }
    const s = bx(2.6, 1.3, 0.12, MAT.sign, 0, 1.6, 3.6, g);
    cy(0.06, 0.06, 1.2, 6, MAT.steel, -1, 0.5, 3.6, g); cy(0.06, 0.06, 1.2, 6, MAT.steel, 1, 0.5, 3.6, g);
    s.castShadow = true;
    blockRect(...at(0.05, -16), 15, 4, g.rotation.y);
    W.interactive("kk-chilas", g, "Chilas rock carvings", beaconAt(0.05, -9));
    // scattered boulders along the dry Indus
    const bg = stage.trackGeometry(new THREE.DodecahedronGeometry(1, 0));
    const N = 160, im = new THREE.InstancedMesh(bg, M({ color: "#5a4a3a", roughness: 0.95 }), N);
    for (let k = 0; k < N; k += 1) {
      const t = rr(0, 0.3), side = rr(-HALFW(t) * 0.9, -6) * (rnd() < 0.85 ? 1 : -0.4);
      const [x, z] = at(t, side), s2 = rr(0.5, 2.4);
      _o.position.set(x, hgt(x, z) + s2 * 0.3, z); _o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); _o.scale.set(s2, s2 * 0.7, s2); _o.updateMatrix();
      im.setMatrixAt(k, _o.matrix);
      if (s2 > 1.2) block(x, z, s2 * 0.8);
    }
    im.castShadow = im.receiveShadow = true;
    stage.add(im);
  })();

  /* ---------- Nanga Parbat viewpoint ---------- */
  (function () {
    const g = site(0.15, -11);
    bx(6, 0.4, 4, MAT.stone, 0, 0.2, 0, g);
    for (let k = -1; k <= 1; k += 2) bx(0.12, 0.9, 4, MAT.wood, k * 3, 0.85, 0, g);
    const signTex = ctex(512, 160, (c, w, h) => {
      c.fillStyle = "#1f5a3a"; c.fillRect(0, 0, w, h);
      c.strokeStyle = "#f2eadb"; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16);
      c.fillStyle = "#f2eadb"; c.textAlign = "center"; c.font = "700 46px Manrope, sans-serif";
      c.fillText("NANGA PARBAT", w / 2, 72); c.font = "600 34px Manrope, sans-serif"; c.fillText("8,126 m", w / 2, 122);
    });
    bx(3.2, 1.1, 0.12, M({ map: signTex }), 0, 2.1, -1.9, g);
    cy(0.07, 0.07, 1.8, 6, MAT.steel, -1.2, 1.1, -1.9, g); cy(0.07, 0.07, 1.8, 6, MAT.steel, 1.2, 1.1, -1.9, g);
    bx(2.4, 0.45, 0.6, MAT.wood, 0, 0.45, 1.2, g);
    W.interactive("kk-nangaparbat", g, "Nanga Parbat", beaconAt(0.152, -6));
    blockRect(...at(0.15, -11), 6, 4, g.rotation.y);
  })();

  /* ---------- junction of three ranges + route monument ---------- */
  (function () {
    const g = site(0.26, -14);
    bx(5, 0.5, 5, MAT.stone, 0, 0.25, 0, g);
    const tri = mk(new THREE.CylinderGeometry(0.6, 1.6, 7, 3), MAT.white, 0, 4, 0, g);
    tri.rotation.y = Math.PI / 6;
    ["#2d6a8a", "#8a5a2d", "#4a7a3a"].forEach((cl, k) => {
      const a = (k / 3) * Math.PI * 2 + Math.PI / 2;
      const p = bx(1.1, 1.2, 0.1, M({ color: cl }), Math.cos(a) * 1.0, 2.2, Math.sin(a) * 1.0, g);
      p.rotation.y = -a + Math.PI / 2;
    });
    W.interactive("kk-junction", g, "Three ranges", beaconAt(0.262, -7));
    block(...at(0.26, -14), 3.4);
    const mon = place(buildMonument(stage, stoneMap), 0.28, -16);
    W.interactive("kk-monument", mon, "Route monument", beaconAt(0.28, -9));
    block(...at(0.28, -16), 3);
  })();

  /* ---------- Karimabad: fort, craft stall, tea stop ---------- */
  (function () {
    const g = site(0.475, -70);
    bx(14, 8, 10, MAT.white, 0, 4, 0, g);
    bx(9, 5, 7, MAT.white, -2, 10.5, 0, g);
    bx(4, 3.5, 4, MAT.white, 4.5, 9.7, 1, g);
    bx(14.4, 0.4, 10.4, MAT.wood, 0, 8.1, 0, g);
    bx(9.4, 0.4, 7.4, MAT.wood, -2, 13.1, 0, g);
    bx(3, 2, 3, MAT.wood, -2, 14.3, 0, g);
    for (let k = 0; k < 6; k += 1) bx(1.1, 1.3, 0.1, MAT.dark, -5.5 + k * 2.2, 5.5, 5.05, g);
    blockRect(...at(0.475, -70), 15, 11, g.rotation.y);
    stage.add(g);
    const craft = place(buildHandicraftStall(stage), 0.462, -11);
    W.interactive("kk-craft", craft, "Craft stall", beaconAt(0.462, -7));
    blockRect(...at(0.462, -11), 4.2, 2.2, craft.rotation.y);
    const ex = place(buildExchangeStation(stage), 0.482, -12);
    W.interactive("kk-exchange", ex, "Tea and exchange", beaconAt(0.482, -7.5));
    blockRect(...at(0.482, -12), 4, 3, ex.rotation.y);
  })();

  /* ---------- Attabad Lake viewpoint ---------- */
  (function () {
    const v = place(buildViewpoint(stage), 0.58, -6, Math.PI);
    W.interactive("kk-view", v, "Attabad Lake", beaconAt(0.58, -3.5));
    // boats on the lake
    for (let k = 0; k < 4; k += 1) {
      const [x, z] = at(0.565 + k * 0.01, rOff(0.58) + rr(-12, 12));
      const b = new THREE.Group();
      b.position.set(x, lakeLevel + 0.15, z);
      b.rotation.y = rr(0, 6.28);
      bx(1.6, 0.5, 4.6, M({ color: ["#c8382a", "#2f62c8", "#e8b82a", "#2e8e4a"][k] }), 0, 0, 0, b);
      bx(1.2, 0.5, 1.6, MAT.white, 0, 0.5, -0.6, b);
      stage.add(b);
      W.onUpdate((time) => { b.position.y = lakeLevel + 0.15 + Math.sin(time * 1.2 + k) * 0.06; b.rotation.z = Math.sin(time + k) * 0.03; });
    }
  })();

  /* ---------- Hussaini suspension bridge ---------- */
  (function () {
    const t = 0.645;
    const a = at(t, 4.5), b = at(t, rOff(t) + 15);
    const ya = hgt(a[0], a[1]) + 1.2, yb = hgt(b[0], b[1]) + 1.2;
    BRIDGE = { a, b, ya, yb, sag: 1.6 };
    const g = new THREE.Group();
    stage.add(g);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const n = Math.floor(len / 0.75);
    const plankG = stage.trackGeometry(new THREE.BoxGeometry(1.6, 0.08, 0.32));
    const planks = new THREE.InstancedMesh(plankG, MAT.wood, n);
    for (let k = 0; k < n; k += 1) {
      const u = (k + 0.5) / n;
      _o.position.set(a[0] + (b[0] - a[0]) * u, lerp(ya, yb, u) - Math.sin(u * Math.PI) * 1.6 - 0.05, a[1] + (b[1] - a[1]) * u);
      _o.rotation.set(rr(-0.08, 0.08), yaw, rr(-0.05, 0.05)); _o.scale.set(1, 1, 1); _o.updateMatrix();
      planks.setMatrixAt(k, _o.matrix);
    }
    planks.castShadow = true;
    g.add(planks);
    const lineMat = kit.track(new THREE.LineBasicMaterial({ color: 0x3a3a3a }));
    [-0.85, 0.85].forEach((off) => {
      [0, 1.1].forEach((dy) => {
        const pts = [];
        for (let k = 0; k <= 30; k += 1) {
          const u = k / 30, ox = Math.cos(yaw) * off, oz = -Math.sin(yaw) * off;
          pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * u + ox, lerp(ya, yb, u) - Math.sin(u * Math.PI) * 1.6 + dy, a[1] + (b[1] - a[1]) * u + oz));
        }
        g.add(new THREE.Line(stage.trackGeometry(new THREE.BufferGeometry().setFromPoints(pts)), lineMat));
      });
      [a, b].forEach((p, k) => {
        const ox = Math.cos(yaw) * off, oz = -Math.sin(yaw) * off;
        cy(0.18, 0.22, 3.4, 8, MAT.steel, p[0] + ox, (k ? yb : ya) + 0.5, p[1] + oz, g);
      });
    });
    W.interactive("kk-hussaini", g, "Hussaini Bridge", at(t - 0.003, 3));
  })();

  /* ---------- Passu village and milestone ---------- */
  (function () {
    const v = place(buildVillage(stage, stoneMap, timberMap), 0.7, -24);
    W.interactive("kk-village", v, "Passu", beaconAt(0.7, -12));
    blockRect(...at(0.7, -24), 14, 10, v.rotation.y);
    const ms = place(buildMilestone(stage), 0.742, -5.2);
    W.interactive("kk-marker", ms, "KKH marker", beaconAt(0.742, -3.2));
    block(...at(0.742, -5.2), 0.8);
  })();

  /* ---------- Sost market and customs ---------- */
  (function () {
    const m = place(buildRoadsideMarket(stage), 0.78, -12);
    W.interactive("kk-market", m, "Sost market", beaconAt(0.78, -7));
    blockRect(...at(0.78, -12), 5, 3, m.rotation.y);
    const c = site(0.792, -22);
    bx(20, 6, 9, MAT.white, 0, 3, 0, c);
    bx(20.6, 0.5, 9.6, MAT.sign, 0, 6.2, 0, c);
    for (let k = 0; k < 6; k += 1) bx(1.6, 1.4, 0.1, MAT.dark, -7.5 + k * 3, 3.4, 4.55, c);
    blockRect(...at(0.792, -22), 20, 9, c.rotation.y);
    stage.add(c);
  })();

  /* ---------- Khunjerab Pass ---------- */
  (function () {
    const gate = buildPassGate(stage, stoneMap, timberMap);
    const [x, z] = at(0.92, 0);
    const i = Math.round(0.92 * NS);
    gate.position.set(x, FLOOR(0.92) - 0.9, z);
    gate.rotation.y = Math.atan2(TAN[i][0], TAN[i][1]) + Math.PI / 2;
    gate.updateMatrixWorld(true);
    W.interactive("kk-pass", gate, "Khunjerab Pass", at(0.915, -4));
    const pR = new THREE.Vector3(3.2, 0, 0).applyEuler(gate.rotation), pL = new THREE.Vector3(-3.2, 0, 0).applyEuler(gate.rotation);
    block(x + pR.x, z + pR.z, 0.9);
    block(x + pL.x, z + pL.z, 0.9);
  })();

  /* ---------- Tashkurgan Stone City ---------- */
  (function () {
    const g = site(0.985, -60);
    const mound = mk(new THREE.CylinderGeometry(26, 34, 7, 24), MAT.mud, 0, 1.5, 0, g);
    mound.receiveShadow = true;
    const ruin = M({ color: "#b39b78", roughness: 1 });
    for (let k = 0; k < 14; k += 1) {
      const a = (k / 14) * Math.PI * 2, r = 22;
      if (k === 3) continue;
      const wall = bx(9.6, rr(2.5, 4.5), 1.6, ruin, Math.cos(a) * r, 6.5, Math.sin(a) * r, g);
      wall.rotation.y = -a + Math.PI / 2;
      if (k % 3 === 0) cy(2.2, 2.6, rr(5, 7), 10, ruin, Math.cos(a) * r, 7.5, Math.sin(a) * r, g);
    }
    for (let k = 0; k < 6; k += 1) bx(rr(3, 6), rr(1.2, 2.6), rr(3, 6), ruin, rr(-12, 12), 5.5, rr(-12, 12), g);
    block(...at(0.985, -60), 33);
    W.interactive("kk-tashkurgan", g, "Stone City", beaconAt(0.985, -22), { radius: 30, labelOffset: 2 });
  })();

  /* ---------- houses (flat-roofed stone, instanced) ---------- */
  const houses = [];
  function addVillage(tc, spread, n, sideMin, sideMax, hmin = 4, hmax = 7) {
    let made = 0;
    for (let k = 0; k < n * 10 && made < n; k += 1) {
      const t = Math.min(0.998, Math.max(0.002, tc + rr(-spread, spread))), side = rr(sideMin, sideMax);
      const [x, z] = at(t, side);
      const w = rr(5, 8), d = rr(5, 7), r = Math.max(w, d) / 2;
      const nn = nearest(x, z);
      if (nn.d < r + 5) continue;
      if (Math.abs(nn.sd - rOff(nn.t)) < r + 14) continue;
      if (blocked(x, z, r)) continue;
      const h0 = hgt(x, z);
      if (Math.abs(hgt(x + r, z) - h0) > 1.6 || Math.abs(hgt(x, z + r) - h0) > 1.6) continue;
      const i = Math.round(t * NS);
      const yaw = Math.atan2(TAN[i][0], TAN[i][1]) + (rnd() < 0.5 ? 0 : Math.PI / 2);
      houses.push({ x, z, w, d, h: rr(hmin, hmax), yaw, y: h0 });
      blockRect(x, z, w, d, yaw);
      made += 1;
    }
  }
  addVillage(0.05, 0.03, 22, -70, -14);
  addVillage(0.3, 0.02, 10, -50, -12);
  addVillage(0.47, 0.035, 60, -80, -14, 4, 9);
  addVillage(0.47, 0.02, 10, 44, 70);
  addVillage(0.7, 0.025, 26, -70, -16);
  addVillage(0.78, 0.02, 24, -55, -12, 4, 8);
  addVillage(0.985, 0.03, 34, -150, -16, 4, 6);

  /* ---------- house instancing ---------- */
  (function () {
    if (!houses.length) return;
    const mat = M({ map: TX.house, emissiveMap: TX.houseEmi, emissive: new THREE.Color(1, 0.75, 0.45), emissiveIntensity: 0, roughness: 0.92 });
    nightMats.push(mat);
    const boxG = stage.trackGeometry(new THREE.BoxGeometry(1, 1, 1));
    const walls = new THREE.InstancedMesh(boxG, mat, houses.length);
    const roofs = new THREE.InstancedMesh(boxG, MAT.wood, houses.length);
    const cc = new THREE.Color();
    houses.forEach((h, i) => {
      _o.position.set(h.x, h.y + h.h / 2 - 0.3, h.z); _o.rotation.set(0, h.yaw, 0); _o.scale.set(h.w, h.h, h.d); _o.updateMatrix();
      walls.setMatrixAt(i, _o.matrix);
      cc.setRGB(0.85 + rnd() * 0.15, 0.85 + rnd() * 0.12, 0.85 + rnd() * 0.1);
      walls.setColorAt(i, cc);
      _o.position.set(h.x, h.y + h.h - 0.15, h.z); _o.scale.set(h.w + 0.5, 0.35, h.d + 0.5); _o.updateMatrix();
      roofs.setMatrixAt(i, _o.matrix);
    });
    [walls, roofs].forEach((m) => { m.castShadow = m.receiveShadow = true; stage.add(m); });
  })();

  /* ---------- poplars, apricot trees, boulders ---------- */
  (function () {
    const pop = [], apr = [];
    for (let k = 0; k < 6000 && (pop.length < (LOWQ ? 500 : 800) || apr.length < (LOWQ ? 260 : 420)); k += 1) {
      const t = rr(0.3, 1), side = rr(-HALFW(t), HALFW(t));
      const [x, z] = at(t, side), nn = nearest(x, z), h = hgt(x, z);
      if (nn.d < 6 || Math.abs(nn.sd - rOff(nn.t)) < 15 || h - FLOOR(nn.t) > 20 || blocked(x, z, 2)) continue;
      const green = (t > 0.42 && t < 0.79) || t > 0.965;
      if (!green && rnd() > 0.06) continue;
      if (rnd() < 0.62) pop.push([x, h, z, rr(0.8, 1.3)]);
      else if (t < 0.8) apr.push([x, h, z, rr(0.8, 1.2)]);
    }
    const trunkG = stage.trackGeometry(new THREE.CylinderGeometry(0.12, 0.2, 1, 6));
    const trunkM = M({ color: "#5a4632", roughness: 1 });
    const coneG = stage.trackGeometry(new THREE.ConeGeometry(1, 1, 7));
    const leafM = M({ color: "#ffffff", roughness: 0.95 });
    const t1 = new THREE.InstancedMesh(trunkG, trunkM, pop.length), c1 = new THREE.InstancedMesh(coneG, leafM, pop.length);
    const cc = new THREE.Color();
    pop.forEach((p, i) => {
      const s = p[3];
      _o.rotation.set(0, 0, 0);
      _o.position.set(p[0], p[1] + 1.5 * s, p[2]); _o.scale.set(s, 3 * s, s); _o.updateMatrix(); t1.setMatrixAt(i, _o.matrix);
      _o.position.set(p[0], p[1] + 7.5 * s, p[2]); _o.scale.set(1.3 * s, 11 * s, 1.3 * s); _o.updateMatrix(); c1.setMatrixAt(i, _o.matrix);
      c1.setColorAt(i, cc.setHSL(0.12 + rnd() * 0.08, 0.7, 0.42 + rnd() * 0.1, THREE.SRGBColorSpace));
    });
    const icoG = stage.trackGeometry(new THREE.IcosahedronGeometry(1, 1));
    const t2 = new THREE.InstancedMesh(trunkG, trunkM, apr.length), c2 = new THREE.InstancedMesh(icoG, leafM, apr.length);
    apr.forEach((p, i) => {
      const s = p[3] * 1.6;
      _o.position.set(p[0], p[1] + 0.8 * s, p[2]); _o.scale.set(s, 1.6 * s, s); _o.updateMatrix(); t2.setMatrixAt(i, _o.matrix);
      _o.position.set(p[0], p[1] + 2 * s, p[2]); _o.scale.set(1.5 * s, 1.1 * s, 1.5 * s); _o.updateMatrix(); c2.setMatrixAt(i, _o.matrix);
      c2.setColorAt(i, cc.setHSL(0.06 + rnd() * 0.05, 0.75, 0.4 + rnd() * 0.08, THREE.SRGBColorSpace));
    });
    [t1, c1, t2, c2].forEach((m) => { m.castShadow = m.receiveShadow = true; stage.add(m); });
    // roadside kilometre stones every ~60 m
    const ks = [];
    for (let i = 10; i < NS; i += 20) ks.push(i);
    const kg = stage.trackGeometry(new THREE.BoxGeometry(0.5, 0.9, 0.25));
    const km = new THREE.InstancedMesh(kg, MAT.white, ks.length), kt = new THREE.InstancedMesh(kg, MAT.yellow, ks.length);
    ks.forEach((i, k) => {
      const [x, z] = at(i / NS, -4.4), y = Math.max(hgt(x, z), FLOOR(i / NS));
      const yaw = Math.atan2(TAN[i][0], TAN[i][1]);
      _o.position.set(x, y + 0.45, z); _o.rotation.set(0, yaw, 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); km.setMatrixAt(k, _o.matrix);
      _o.position.set(x, y + 0.98, z); _o.scale.set(1, 0.2, 1); _o.updateMatrix(); kt.setMatrixAt(k, _o.matrix);
    });
    stage.add(km, kt);
  })();

  /* ---------- painted trucks on the highway ---------- */
  const trucks = [];
  (function () {
    const n = LOWQ ? 8 : 14;
    for (let k = 0; k < n; k += 1) {
      const g = new THREE.Group();
      const art = TX.truck.clone();
      art.needsUpdate = true;
      stage.trackTexture(art);
      const artM = M({ map: art, roughness: 0.6 });
      const body = M({ color: ["#e23b2e", "#1d6fd1", "#f2c230", "#2e9e52", "#e2569a"][k % 5], roughness: 0.55 });
      bx(2.4, 0.35, 9, MAT.dark, 0, 0.75, 0, g);
      bx(2.4, 2.1, 2.2, body, 0, 1.95, 3.4, g);
      bx(2.2, 0.8, 0.05, M({ color: "#9fc4dd", metalness: 0.3, roughness: 0.2 }), 0, 2.4, 4.51, g);
      const cargo = bx(2.5, 2.7, 6.2, artM, 0, 2.3, -1.2, g);
      cargo.castShadow = true;
      const crown = bx(2.6, 1.2, 0.5, artM, 0, 3.6, 4.2, g);
      crown.rotation.x = -0.25;
      [-1.1, 1.1].forEach((sx) => [3.2, -1.2, -3.4].forEach((sz) => {
        const w = cy(0.55, 0.55, 0.4, 12, MAT.dark, sx, 0.55, sz, g);
        w.rotation.z = Math.PI / 2;
      }));
      stage.add(g);
      trucks.push({ g, t: rnd(), dir: rnd() < 0.5 ? 1 : -1, sp: rr(7, 10), wait: 0 });
    }
  })();
  W.onUpdate((time, dt, st) => {
    trucks.forEach((tk) => {
      const step = (tk.sp * dt) / ROUTE_LEN;
      const [px, pz] = at(tk.t + tk.dir * 0.004, tk.dir * -1.8);
      const blockedAhead = Math.hypot(px - st.x, pz - st.z) < 7;
      if (!blockedAhead && !stage.reducedMotion) tk.t += tk.dir * step;
      if (tk.t > 0.995) { tk.t = 0.995; tk.dir = -1; }
      if (tk.t < 0.005) { tk.t = 0.005; tk.dir = 1; }
      const i = Math.round(tk.t * NS);
      const [x, z] = at(tk.t, tk.dir * -1.8);
      tk.g.position.set(x, Math.max(FLOOR(tk.t) + 0.12, hgt(x, z)), z);
      tk.g.rotation.y = Math.atan2(TAN[i][0] * tk.dir, TAN[i][1] * tk.dir);
    });
  });

  /* ---------- yaks near the pass and at Tashkurgan ---------- */
  const YAKS = [];
  for (let k = 0; k < 26; k += 1) {
    const t = rnd() < 0.5 ? rr(0.86, 0.94) : rr(0.95, 1);
    const side = rr(-60, -12) * (rnd() < 0.5 ? 1 : -0.6);
    const [x, z] = at(t, side);
    YAKS.push({ x, z, yaw: rnd() * 6.28, ph: rnd() * 6, cx: x, cz: z, tx: 0, tz: 0, wait: rr(0, 6) });
  }
  const yakB = new THREE.InstancedMesh(stage.trackGeometry(new THREE.BoxGeometry(1.2, 1.1, 2.2)), M({ color: "#2b2420", roughness: 1 }), YAKS.length);
  const yakH = new THREE.InstancedMesh(stage.trackGeometry(new THREE.BoxGeometry(0.7, 0.7, 0.7)), M({ color: "#3a3028", roughness: 1 }), YAKS.length);
  const yakL = new THREE.InstancedMesh(stage.trackGeometry(new THREE.BoxGeometry(1.1, 0.7, 2)), M({ color: "#2b2420", roughness: 1 }), YAKS.length);
  [yakB, yakH, yakL].forEach((m) => { m.castShadow = true; stage.add(m); });
  W.onUpdate((time, dt) => {
    YAKS.forEach((y, i) => {
      if (y.wait > 0) y.wait -= dt;
      else {
        if (!y.tx) { y.tx = y.cx + rr(-10, 10); y.tz = y.cz + rr(-10, 10); }
        const dx = y.tx - y.x, dz = y.tz - y.z, d = Math.hypot(dx, dz);
        if (d < 0.3) { y.tx = 0; y.wait = rr(3, 10); } else { y.x += (dx / d) * dt * 0.8; y.z += (dz / d) * dt * 0.8; y.yaw = Math.atan2(dx, dz); }
      }
      const h = hgt(y.x, y.z);
      _o.position.set(y.x, h + 1.25, y.z); _o.rotation.set(0, y.yaw, 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); yakB.setMatrixAt(i, _o.matrix);
      _o.position.set(y.x + Math.sin(y.yaw) * 1.35, h + 1.25 - (y.wait > 0 ? 0.35 : 0), y.z + Math.cos(y.yaw) * 1.35); _o.updateMatrix(); yakH.setMatrixAt(i, _o.matrix);
      _o.position.set(y.x, h + 0.45, y.z); _o.updateMatrix(); yakL.setMatrixAt(i, _o.matrix);
    });
    yakB.instanceMatrix.needsUpdate = yakH.instanceMatrix.needsUpdate = yakL.instanceMatrix.needsUpdate = true;
  });

  /* ---------- clouds ---------- */
  (function () {
    const m = kit.track(new THREE.SpriteMaterial({ map: TX.cloud, transparent: true, depthWrite: false, opacity: 0.6 }));
    for (let k = 0; k < 18; k += 1) {
      const s = new THREE.Sprite(m);
      const [x, z] = at(rnd(), rr(-500, 500));
      s.position.set(x, rr(380, 560), z);
      const sc = rr(200, 360);
      s.scale.set(sc, sc * 0.45, 1);
      stage.add(s);
    }
  })();

  /* ---------- people ---------- */
  const mixes = {
    chilas: ["hunza-man", "daura-man", "elder", "porter", "trekker"],
    nanga: ["trekker", "trekker", "hunza-man"],
    junction: ["trekker", "hunza-man", "schoolgirl", "elder"],
    hunza: ["hunza-man", "hunza-woman", "hunza-woman", "schoolgirl", "elder", "trekker", "porter"],
    attabad: ["trekker", "hunza-man", "hunza-woman", "schoolgirl"],
    hussaini: ["trekker", "trekker", "hunza-man", "hunza-woman"],
    passu: ["hunza-man", "hunza-woman", "elder", "trekker", "schoolgirl"],
    sost: ["hunza-man", "daura-man", "porter", "trekker", "momo-vendor"],
    khunjerab: ["trekker", "trekker", "hunza-man", "tajik-woman"],
    tashkurgan: ["tajik-woman", "tajik-woman", "elder", "hunza-man", "trekker", "schoolgirl"],
  };
  Object.entries(PL).forEach(([k, p]) => {
    const count = k === "hunza" || k === "tashkurgan" ? 16 : 8;
    for (let n = 0; n < count; n += 1) {
      const side = rr(-p.r * 0.8, -4);
      const [x, z] = at(p.t + rr(-0.012, 0.012), side);
      if (!canStand(x, z)) continue;
      const idle = rnd() < 0.35;
      W.addNpc({ kind: idle ? "idle" : "wander", cx: x, cz: z, R: 10, x, z, tx: 0, tz: 0, wait: rr(0, 4), design: W.pick(mixes[k]) });
    }
    for (let n = 0; n < 2; n += 1) {
      const t0 = Math.max(0, p.t - 0.02), t1 = Math.min(1, p.t + 0.02);
      W.addNpc({ kind: "road", pts: RP, t: rr(t0, t1), t0, t1, len: ROUTE_LEN, dir: rnd() < 0.5 ? 1 : -1, off: rr(4.2, 5.2), design: W.pick(mixes[k]) });
    }
  });
  W.addNpc({ kind: "idle", x: at(0.78, -9.5)[0], z: at(0.78, -9.5)[1], yaw: 0, design: W.D["momo-vendor"] });

  W.start();
  return { objectId: "karakoram" };
}
