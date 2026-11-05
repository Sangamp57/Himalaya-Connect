import * as THREE from "three";
import { createKit, createWalker } from "./walk-engine.js";

/**
 * Shared terrain + walker setup for the compact walkable town worlds.
 *
 * The world supplies its height function, terrain colours, water, places,
 * map data and a build callback. The callback adds paths, buildings and
 * landmark beacons using the walker's interactive API.
 */
export function buildWalkableTown({
  scene,
  stage,
  manager,
  seed = 1,
  terrain,
  water = [],
  places,
  startPlace,
  worldName,
  mapBounds,
  mapLines,
  mapColor,
  kmPerUnit = 0.02,
  fogDensity = 0.0005,
  exposureScale = 0.92,
  far = 4200,
  waterMask = null,
  canStandExtra = null,
  nightMats = [],
  build,
  people,
  walker = {},
}) {
  const kit = createKit(stage, manager.renderer, seed);
  const { M } = kit;
  const { x0, x1, z0, z1 } = mapBounds;

  const HC = { x0: x0 - 40, z0: z0 - 40, c: 2 };
  HC.nx = Math.ceil((x1 - x0 + 80) / HC.c) + 1;
  HC.nz = Math.ceil((z1 - z0 + 80) / HC.c) + 1;
  const hcache = new Map();

  function hgt(x, z) {
    /* outside the cached grid (e.g. boats on a river that runs off the map) */
    if (x < HC.x0 + 2 || z < HC.z0 + 2 || x > x1 + 38 || z > z1 + 38) return (terrain.farHeightFn || terrain.heightFn)(x, z);
    const gx = (x - HC.x0) / HC.c;
    const gz = (z - HC.z0) / HC.c;
    const i = Math.floor(gx);
    const j = Math.floor(gz);
    const u = gx - i;
    const v = gz - j;
    const get = (a, b) => {
      const k = b * HC.nx + a;
      let h = hcache.get(k);
      if (h === undefined) {
        h = terrain.heightFn(HC.x0 + a * HC.c, HC.z0 + b * HC.c);
        hcache.set(k, h);
      }
      return h;
    };
    const h00 = get(i, j);
    const h10 = get(i + 1, j);
    const h01 = get(i, j + 1);
    const h11 = get(i + 1, j + 1);
    return h00 * (1 - u) * (1 - v) + h10 * u * (1 - v) + h01 * (1 - u) * v + h11 * u * v;
  }

  /* Terrain mesh with vertex colours. */
  (function buildTerrain() {
    const SX = x1 - x0;
    const SZ = z1 - z0;
    const NX = terrain.segments || 180;
    const NZ = terrain.segments || 180;
    const geometry = new THREE.PlaneGeometry(SX, SZ, NX, NZ);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const position = geometry.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const h = terrain.heightFn(x, z);
      position.setY(i, h);
      const value = terrain.colorFn(x, z, h);
      if (value && value.isColor) color.copy(value);
      else if (Array.isArray(value)) color.setRGB(value[0], value[1], value[2]);
      else color.set("#7d8760");
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.computeVertexNormals();
    const normals = geometry.attributes.normal;
    for (let i = 0; i < position.count; i += 1) {
      if (normals.getY(i) < 0.68) {
        color.setRGB(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]);
        color.lerp(new THREE.Color("#5b5145"), (0.68 - normals.getY(i)) * 0.9);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    stage.trackGeometry(geometry);
    /* terrain.material(M) lets a world supply a detailed ground material (optional) */
    const mesh = new THREE.Mesh(geometry, terrain.material ? terrain.material(M) : M({ vertexColors: true, roughness: 0.98 }));
    mesh.receiveShadow = true;
    stage.add(mesh);
  })();

  /* Water ribbons. */
  water.forEach((body, index) => {
    const points = body.curve
      ? new THREE.CatmullRomCurve3(body.points.map(([x, z]) => new THREE.Vector3(x, 0, z))).getSpacedPoints(body.curve)
      : body.points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const width = body.width;
    const y = body.y;
    kit.ribbon(
      points,
      width,
      (x, z, p) => (typeof y === "function" ? y(x, z) : y),
      body.material || M({ color: "#2f8fa3", roughness: 0.16, metalness: 0.18, transparent: true, opacity: 0.94 }),
      32
    );
  });

  /* Bridges supplied by the world. */
  const bridges = [];
  function addBridge(bridge) {
    bridges.push(bridge);
  }
  function bridgeY(x, z) {
    for (const b of bridges) {
      if (Math.abs(z - b.z) > b.width / 2) continue;
      if (x < b.x0 || x > b.x1) continue;
      const u = (x - b.x0) / (b.x1 - b.x0);
      return b.ya + (b.yb - b.ya) * u - Math.sin(u * Math.PI) * (b.sag || 0);
    }
    return null;
  }

  function groundY(x, z) {
    const by = bridgeY(x, z);
    return by !== null ? by : hgt(x, z);
  }

  function canStand(x, z) {
    if (bridgeY(x, z) !== null) return true;
    if (x < x0 || x > x1 || z < z0 || z > z1) return false;
    if (kit.blocked(x, z, 0.45)) return false;
    if (waterMask && waterMask(x, z, hgt(x, z))) return false;
    if (canStandExtra && !canStandExtra(x, z, hgt(x, z))) return false;
    return true;
  }

  const W = createWalker({
    scene,
    stage,
    manager,
    kit,
    places,
    startPlace,
    worldName,
    hgt,
    groundY,
    canStand,
    nightMats,
    kmPerUnit,
    fogDensity,
    exposureScale,
    far,
    mapBounds,
    mapLines,
    mapColor,
    /* extra createWalker options, e.g. { collision: "slide", skyKeys, onTime, runSpeed } */
    ...walker,
  });

  function makePath(points, width = 3.2, material = null) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const n = Math.max(20, Math.round(curve.getLength() / 4));
    const pts = curve.getSpacedPoints(n);
    const mat =
      material ||
      M({
        color: "#cbb89a",
        roughness: 0.98,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
    kit.ribbon(pts, width, (x, z) => hgt(x, z) + 0.09, mat, 4);
    return pts;
  }

  const built = build({ kit, W, stage, hgt, groundY, makePath, addBridge, M, canStand });
  if (people) people(W);
  W.start();
  if (built && typeof built.afterStart === "function") built.afterStart(W);
  return W;
}
