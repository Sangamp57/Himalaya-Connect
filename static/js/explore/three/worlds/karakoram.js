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

export default function buildKarakoram({ scene, stage }) {
  const detail = stage.quality !== "low";
  createSky(scene, {
    top: "#12314f",
    bottom: "#ebcda6",
    fog: "#c6b7a3",
    near: 58,
    far: 155,
  });
  addLighting(scene, { shadows: detail, sun: [24, 32, 18], color: "#ffe0b5", intensity: 2.5, ambient: 1.55 });
  addSun(scene, { position: [38, 28, -48], size: 5.8, color: "#ffe0ac" });

  const stoneMap = stage.trackTexture(stoneTexture("#898174", "#605a50", [2, 3]));
  const timberMap = stage.trackTexture(woodTexture("#63412a", "#3b2316", [2, 2]));

  const ground = box(stage, 60, 0.8, 50, stage.material("#8d826d", { roughness: 1 }), 0, -0.4, 0);
  ground.receiveShadow = true;
  stage.add(ground);

  // Distant mountain giants.
  const peaks = [
    [-34, -33, 29, 20, 0],
    [-22, -38, 34, 22, 1],
    [-6, -42, 39, 25, 2],
    [12, -40, 35, 23, 0],
    [28, -34, 30, 19, 1],
    [46, -31, 24, 16, 2],
    [-43, -21, 21, 15, 2],
    [47, -23, 20, 14, 0],
  ];
  peaks.forEach(([x, z, height, radius, index], i) => {
    const peak = mountain(height, radius, ["#41566a", "#4c6275", "#597183"][index], "#f6f2e9", 0.52, detail ? 7 : 5);
    peak.position.set(x, 0.6, z);
    peak.rotation.y = i * 0.8;
    stage.add(peak);
  });

  // A higher snowy shoulder in the middle distance.
  const shoulder = mountain(19, 24, "#586b72", "#f1eee6", 0.52, detail ? 7 : 5);
  shoulder.position.set(-24, 0.5, 2);
  stage.add(shoulder);
  const shoulderB = mountain(14, 16, "#5e6d6f", "#f0ece1", 0.52, 5);
  shoulderB.position.set(40, 0.4, -17);
  stage.add(shoulderB);
  const horizonPeak = mountain(38, 25, "#526978", "#f7f4ec", 0.52, detail ? 7 : 5);
  horizonPeak.position.set(5, 0.4, -54);
  horizonPeak.rotation.y = 1.3;
  stage.add(horizonPeak);

  const roadCurve = buildRoad(
    stage,
    [
      [0.5, 0, 22],
      [1.5, 0, 13],
      [-1.4, 0, 5],
      [-1.8, 0, -3],
      [1.4, 0, -9],
      [2.8, 0, -17],
      [2.4, 0, -23],
    ],
    3.6
  );

  // River and lake.
  const riverMaterial = stage.material("#4b93a7", { roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.82 });
  const river = box(stage, 2.4, 0.07, 28, riverMaterial, -10.5, 0.03, 1.0);
  river.rotation.y = 0.18;
  stage.add(river);
  const lake = mesh(stage, new THREE.CircleGeometry(8.2, 48), riverMaterial, 15.5, 0.055, -9.0);
  lake.scale.set(1.55, 1.0, 1.0);
  lake.rotation.x = -Math.PI / 2;
  stage.add(lake);
  const lakeShore = mesh(stage, new THREE.RingGeometry(8.0, 8.8, 48), stage.material("#c7b373", { roughness: 1 }), 15.5, 0.045, -9.0);
  lakeShore.scale.set(1.55, 1.0, 1.0);
  lakeShore.rotation.x = -Math.PI / 2;
  stage.add(lakeShore);
  for (let index = 0; index < 10; index += 1) {
    const rock = mesh(stage, new THREE.DodecahedronGeometry(0.5 + (index % 3) * 0.2, 0), stage.material("#777163", { roughness: 1 }), 8 + (index % 5) * 2.4, 0.25, -3.4 - Math.floor(index / 5) * 2.0);
    stage.add(rock);
  }

  // Bridge across a tributary.
  stage.add(buildBridge(stage));

  // Instanced rocks on the valley floor.
  const rockCount = detail ? 70 : 30;
  const rockGeometry = new THREE.DodecahedronGeometry(0.4, 0);
  const rockMaterial = stage.material("#81796b", { roughness: 1 });
  const instancedRocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockCount);
  stage.trackGeometry(rockGeometry);
  const dummy = new THREE.Object3D();
  for (let index = 0; index < rockCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    dummy.position.set(side * (7 + (index % 8) * 2.4), 0.22, -5 + Math.floor(index / 8) * 4.2);
    const scale = 0.5 + ((index * 5) % 10) / 14;
    dummy.scale.set(scale, scale * 0.65, scale);
    dummy.rotation.set(index * 0.4, index * 0.7, index * 0.2);
    dummy.updateMatrix();
    instancedRocks.setMatrixAt(index, dummy.matrix);
  }
  instancedRocks.castShadow = detail;
  stage.add(instancedRocks);

  const village = buildVillage(stage, stoneMap, timberMap);
  stage.add(village);
  stage.addInteractive("kk-village", village, {
    label: "Passu village",
    accent: "#e6bc6a",
    focus: [-8.6, 2.0, -4.8],
    radius: 22,
    beaconPosition: [-6.2, 0.3, -2.4],
    labelOffset: 1.2,
  });

  const gateGroup = buildPassGate(stage, stoneMap, timberMap);
  stage.add(gateGroup);
  stage.addInteractive("kk-pass", gateGroup, {
    label: "Khunjerab Pass",
    accent: "#e6bc6a",
    focus: [2.4, 4.2, -16],
    radius: 22,
    beaconPosition: [2.4, 1.5, -12.3],
    labelOffset: 1.1,
  });

  const market = buildRoadsideMarket(stage);
  stage.add(market);
  stage.addInteractive("kk-market", market, {
    label: "Sost market",
    accent: "#e6bc6a",
    focus: [-6.6, 1.3, 7.8],
    radius: 7.6,
    beaconPosition: [-6.6, 0.1, 9.4],
  });

  const craft = buildHandicraftStall(stage);
  stage.add(craft);
  stage.addInteractive("kk-craft", craft, {
    label: "Handicraft stall",
    accent: "#e6bc6a",
    focus: [7.2, 1.5, 3.2],
    radius: 7.5,
    beaconPosition: [7.2, 0.1, 4.7],
  });

  const exchange = buildExchangeStation(stage);
  stage.add(exchange);
  stage.addInteractive("kk-exchange", exchange, {
    label: "Exchange station",
    accent: "#e6bc6a",
    focus: [-7.4, 1.2, -9.8],
    radius: 8.6,
    beaconPosition: [-6.0, 0.1, -8.4],
    labelOffset: 1.1,
  });

  const viewpoint = buildViewpoint(stage);
  stage.add(viewpoint);
  stage.addInteractive("kk-view", viewpoint, {
    label: "Attabad Lake",
    accent: "#e6bc6a",
    focus: [3.8, 2.4, -5.0],
    radius: 16,
    beaconPosition: [3.8, 0.2, -2.8],
    labelOffset: 1.2,
  });

  const monument = buildMonument(stage, stoneMap);
  stage.add(monument);
  stage.addInteractive("kk-monument", monument, {
    label: "Route history",
    accent: "#e6bc6a",
    focus: [7.0, 3.2, 11.8],
    radius: 14,
    beaconPosition: [7.0, 0.1, 13.1],
    labelOffset: 1.1,
  });

  const milestone = buildMilestone(stage);
  stage.add(milestone);
  stage.addInteractive("kk-marker", milestone, {
    label: "KKH marker",
    accent: "#e6bc6a",
    focus: [-3.6, 1.2, 13.2],
    radius: 6.8,
    beaconPosition: [-3.6, 0.1, 14.2],
  });

  // Vegetation, windbreaks and a few tiny fields.
  const trees = [
    [-15, 0.4, 0.6, "#3f6651", null],
    [10.6, -1.4, 0.5, "#446950", null],
    [-5.6, -12.0, 0.55, "#3c6250", null],
    [15.2, 6.0, 0.45, "#4b6d53", null],
    [22.0, -2.2, 0.4, "#4d7358", "#e0c4ac"],
    [8.4, -13.4, 0.38, "#406a52", null],
  ];
  trees.forEach(([x, z, scale, foliage, blossom]) => stage.add(tree(x, z, scale, foliage, blossom)));
  for (let index = 0; index < 3; index += 1) {
    stage.add(pine(-17 + index * 10, 1.8 - index * 2.1, 0.55, "#315c4d"));
  }

  // Tea-colored fields / terraces beside the village.
  for (let index = 0; index < 3; index += 1) {
    const field = box(stage, 3.6, 0.12, 2.4, stage.material(index % 2 ? "#6b8150" : "#7b8b57", { roughness: 1 }), -12.2, 0.25 + index * 0.17, 3.5 + index * 2.4);
    field.rotation.y = -0.12;
    stage.add(field);
    const wall = box(stage, 3.7, 0.5, 0.24, stage.material("#7f7462", { roughness: 1 }), -12.2, 0.25 + index * 0.17, 2.25 + index * 2.4);
    wall.rotation.y = -0.12;
    stage.add(wall);
  }

  // Low clouds and high-altitude haze.
  const clouds = [];
  for (let index = 0; index < (detail ? 9 : 4); index += 1) {
    const cloudGroup = cloud(1.3 + (index % 4) * 0.42);
    cloudGroup.position.set(-30 + index * 8.5, 7 + (index % 3) * 3.0, -26 - (index % 3) * 9);
    stage.add(cloudGroup);
    clouds.push({ mesh: cloudGroup, speed: 0.16 + index * 0.025 });
  }
  stage.animate((time, delta) => {
    if (stage.reducedMotion) return;
    clouds.forEach((item) => {
      item.mesh.position.x += item.speed * delta;
      if (item.mesh.position.x > 42) item.mesh.position.x = -40;
    });
  });

  const people = [
    person(stage, -3.4, 9.7, "#6c4c3a", "#344751", 0.9, 0.5, true),
    person(stage, 4.2, 7.4, "#365c55", "#5b4331", 0.85, 1.6),
    person(stage, -8.2, 4.8, "#9b4c3d", "#31434a", 0.8, 2.3),
    person(stage, 0.6, -7.2, "#58616a", "#44372d", 0.82, 3.1, true),
  ];
  people.forEach((figure) => stage.add(figure));

  for (let index = 0; index < 3; index += 1) {
    const flying = bird(-15 + index * 10, 22 + index * 1.5, -22 - index * 4, "#302f2f");
    stage.add(flying);
    stage.animate((time, delta) => {
      if (stage.reducedMotion) return;
      flying.position.x += delta * (0.8 + index * 0.2);
      flying.position.y = 22 + Math.sin(time * 0.55 + index) * 0.4;
      if (flying.position.x > 32) flying.position.x = -32;
    });
  }

  // Wind-blown dust and snow flecks.
  if (detail) {
    const count = 100;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 44;
      positions[index * 3 + 1] = 1 + Math.random() * 18;
      positions[index * 3 + 2] = -22 + Math.random() * 36;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const flakes = new THREE.Points(geometry, new THREE.PointsMaterial({ color: "#f3e7d2", size: 0.12, transparent: true, opacity: 0.55, depthWrite: false }));
    stage.trackGeometry(geometry);
    stage.add(flakes);
    stage.animate((time, delta) => {
      if (stage.reducedMotion) return;
      const array = flakes.geometry.attributes.position.array;
      for (let index = 0; index < count; index += 1) {
        array[index * 3] += delta * 0.4;
        array[index * 3 + 1] -= delta * 0.07;
        if (array[index * 3] > 24) array[index * 3] = -24;
        if (array[index * 3 + 1] < 0.5) array[index * 3 + 1] = 18;
      }
      flakes.geometry.attributes.position.needsUpdate = true;
    });
  }

  return { objectId: "karakoram", roadCurve };
}
