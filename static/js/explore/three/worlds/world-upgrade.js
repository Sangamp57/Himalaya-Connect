import * as THREE from "three";
import { createFx } from "./yunnan-fx.js";
import { createFauna } from "./fauna.js";

/* Shared upgrade for the older walkable worlds (Dunhuang, Turpan, Kashgar, the
   Great Journey, Karakoram, Pokhara, Skardu, Hunza):
   - solid objects: every building, wall, post, rock and tree trunk gets a box or
     circle collider generated from its mesh, so the visitor slides round it
     instead of walking through;
   - surfaces: flat-coloured materials get matching PBR textures (plaster, mud
     brick, wood, stone, cloth) with world-scaled UVs;
   - atmosphere: cloud dome, contact shadows, wind grass and a light post grade;
   - animals and rides via createFauna (fauna.js).
   ctx = { W, stage, manager, kit, hgt, groundY, canStand, bounds, since, protect, ... } */

const PRIMS = new Set(["BoxGeometry", "CylinderGeometry", "ConeGeometry", "SphereGeometry", "IcosahedronGeometry", "DodecahedronGeometry", "OctahedronGeometry", "LatheGeometry", "CapsuleGeometry", "ExtrudeGeometry"]);
const ROUND = new Set(["CylinderGeometry", "ConeGeometry", "SphereGeometry", "IcosahedronGeometry", "DodecahedronGeometry", "OctahedronGeometry", "LatheGeometry", "CapsuleGeometry"]);
const BLOBS = new Set(["SphereGeometry", "IcosahedronGeometry", "DodecahedronGeometry", "OctahedronGeometry"]);

const _v = new THREE.Vector3(), _hsl = { h: 0, s: 0, l: 0 };

function skipSet(stage, W) {
  const skip = new Set();
  (stage.interactives || []).forEach((e) => {
    if (e.beacon && e.beacon.group) skip.add(e.beacon.group);
    if (e.label && e.label.sprite) skip.add(e.label.sprite);
  });
  if (W && W.player) skip.add(W.player.root);
  return skip;
}
function walk(obj, skip, fn) {
  if (skip.has(obj) || (obj.userData && obj.userData.noCollide) || obj.visible === false) return;
  fn(obj);
  for (const c of obj.children) walk(c, skip, fn);
}
function solidMaterial(m) {
  if (!m) return false;
  if (Array.isArray(m)) return m.some(solidMaterial);
  if (m.transparent && (m.opacity ?? 1) < 0.9) return false;
  if (m.depthWrite === false || m.visible === false) return false;
  if (m.isShaderMaterial || m.isPointsMaterial || m.isSpriteMaterial || m.isLineBasicMaterial) return false;
  return true;
}

/** Generate colliders from the meshes added since `since` (index into stage.root.children). */
export function autoColliders({ stage, W, kit, hgt, since = 0, protect = [], maxSize = 70, minHeight = 0.8, lift = 1.3, roots = null, extraSkip = [] }) {
  const skip = skipSet(stage, W);
  extraSkip.forEach((o) => skip.add(o));
  stage.root.updateMatrixWorld(true);
  const list = roots || stage.root.children.slice(since);
  const made = [];
  const corners = [];
  for (let i = 0; i < 8; i += 1) corners.push(new THREE.Vector3());
  for (const root of list) walk(root, skip, (o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.walkable) return;
    const g = o.geometry;
    if (!g || !PRIMS.has(g.type) || !solidMaterial(o.material)) return;
    if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox;
    const e = o.matrixWorld.elements;
    /* yaw of the object: from its x axis, or its z axis when the x axis is tipped up */
    let yaw;
    if (Math.hypot(e[0], e[2]) > 0.3) yaw = Math.atan2(-e[2], e[0]);
    else yaw = Math.atan2(e[8], e[10]);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    let k = 0, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
      const p = corners[k++].set(x, y, z).applyMatrix4(o.matrixWorld);
      const lx = p.x * c - p.z * s, lz = p.x * s + p.z * c;
      minX = Math.min(minX, lx); maxX = Math.max(maxX, lx); minZ = Math.min(minZ, lz); maxZ = Math.max(maxZ, lz);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const w = maxX - minX, d = maxZ - minZ;
    if (w > maxSize || d > maxSize || w < 0.04 || d < 0.04) return;
    const mlx = (minX + maxX) / 2, mlz = (minZ + maxZ) / 2;
    const cx = mlx * c + mlz * s, cz = -mlx * s + mlz * c;
    /* ground under the footprint (lowest of centre and corners) */
    let gy = hgt(cx, cz);
    for (const [ax, az] of [[minX, minZ], [maxX, minZ], [minX, maxZ], [maxX, maxZ]]) {
      const qx = ax * c + az * s, qz = -ax * s + az * c;
      gy = Math.min(gy, hgt(qx, qz));
    }
    if (maxY < gy + minHeight) return; /* low: kerbs, rugs, platforms */
    if (minY > gy + lift) return; /* overhead: roofs, signs, canopies, bridge decks */
    if (BLOBS.has(g.type) && maxY - Math.max(minY, gy) < 0.45 * Math.min(w, d)) return; /* walkable mounds and dunes */
    const pad = 0.0;
    let item;
    const round = ROUND.has(g.type) && Math.max(w, d) / Math.min(w, d) < 1.6;
    const r = (Math.min(w, d) / 2) * (BLOBS.has(g.type) ? 0.82 : 0.95);
    const hits = (px, pz, pr) => {
      if (round) return Math.hypot(px - cx, pz - cz) < r + pr;
      const dx = px - cx, dz = pz - cz, lx = dx * c - dz * s, lz = dx * s + dz * c;
      return Math.abs(lx) < w / 2 + pr && Math.abs(lz) < d / 2 + pr;
    };
    if (protect.some((p) => hits(p[0], p[1], p[2] ?? 0.9))) return;
    if (round) { kit.block(cx, cz, r); item = { x: cx, z: cz, r }; }
    else item = kit.blockBox(cx, cz, w + pad, d + pad, yaw);
    made.push(item);
  });
  return made;
}

/* World-scaled UVs (box projection by dominant normal), so textures keep a real size. */
function worldUV(g, scale, tile) {
  if (g.userData.wuv) return;
  g.userData.wuv = true;
  const p = g.attributes.position, n = g.attributes.normal;
  if (!p || !n) return;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i) * scale.x, y = p.getY(i) * scale.y, z = p.getZ(i) * scale.z;
    const ax = Math.abs(n.getX(i) * scale.y * scale.z), ay = Math.abs(n.getY(i) * scale.x * scale.z), az = Math.abs(n.getZ(i) * scale.x * scale.y);
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

/** Give flat-coloured meshes PBR textures that match their colour. */
export function retexture({ stage, W, fx, since = 0, roots = null, rules = null }) {
  const skip = skipSet(stage, W);
  const cache = new Map();
  const list = roots || stage.root.children.slice(since);
  const scale = new THREE.Vector3();
  const classify = (m) => {
    if (rules) { const r = rules(m); if (r !== undefined) return r; }
    m.color.getHSL(_hsl, THREE.SRGBColorSpace);
    const { h, s, l } = _hsl;
    if (m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity ?? 1) > 0.05) return null;
    if (m.metalness > 0.3) return null;
    if (h > 0.18 && h < 0.48 && s > 0.15) return null; /* foliage, keep the soft look */
    if (h > 0.48 && h < 0.75 && s > 0.2) return s > 0.45 ? "weave" : null; /* blue paint and tiles */
    if (s < 0.12) return l > 0.55 ? "plaster" : l > 0.18 ? "stone" : null;
    if (s > 0.5 && l > 0.25 && l < 0.7) return "weave"; /* cloth, carpets, flags */
    if (l < 0.36) return "planks";
    if (l < 0.52 && s > 0.25) return "rock";
    return "plaster";
  };
  const make = (kind, src) => {
    const key = kind + src.color.getHexString() + Math.round((src.roughness ?? 1) * 10);
    if (cache.has(key)) return cache.get(key);
    const col = src.color.clone().multiplyScalar(kind === "planks" ? 1.25 : 1.08);
    let m;
    const extra = { color: col, side: src.side };
    if (kind === "plaster") m = fx.pbr("plaster", { color: "#ffffff", color2: "#e2ddd6", color3: "#a8a29a", stains: 0.5, seed: 31, bump: 1.4 }, extra);
    else if (kind === "rock") m = fx.pbr("earth", { color: "#f2f2f2", color2: "#cfcac2", color3: "#8e8880", layers: 7, seed: 37, bump: 1.2 }, extra);
    else if (kind === "stone") m = fx.pbr("flagstone", { color: "#f0f0f0", color2: "#c4c4c4", color3: "#7a7a7a", cells: 5, seed: 41, bump: 1.1 }, extra);
    else if (kind === "planks") m = fx.pbr("planks", { color: "#e8e2da", color2: "#b8afa4", color3: "#4a4440", boards: 5, seed: 43 }, extra);
    else m = fx.pbr("weave", { color: "#ffffff", color2: "#dcdcdc", color3: "#9a9a9a", cells: 16, seed: 47, bump: 0.6 }, extra);
    m.roughness = 1;
    cache.set(key, m);
    return m;
  };
  const tile = { plaster: 3, rock: 5, stone: 3.5, planks: 2.2, weave: 1.6 };
  for (const root of list) walk(root, skip, (o) => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    const m = o.material;
    if (!m || !m.isMeshStandardMaterial || m.map || m.vertexColors || m.transparent || m.userData.keep) return;
    const g = o.geometry;
    if (!g || !g.attributes.normal || !PRIMS.has(g.type)) return;
    const kind = classify(m);
    if (!kind) return;
    o.getWorldScale(scale);
    worldUV(g, scale, tile[kind]);
    o.material = make(kind, m);
  });
}

/** Everything at once. Returns { fx, fauna, colliders }. */
export function upgradeWorld(ctx) {
  const { W, stage, manager, kit, hgt } = ctx;
  const groundY = ctx.groundY || hgt;
  const fx = ctx.fx || createFx({ stage, manager });
  if (!ctx.fx) fx.attach(W);
  const protect = (ctx.protect || []).slice();
  Object.values(W.POS || {}).forEach((p) => protect.push([p.x, p.z, 1.6]));
  let colliders = [];
  if (ctx.retexture !== false) retexture({ stage, W, fx, since: ctx.since || 0, roots: ctx.roots, rules: ctx.textureRules });
  if (ctx.colliders !== false) colliders = autoColliders({ stage, W, kit, hgt, since: ctx.since || 0, roots: ctx.roots, protect, maxSize: ctx.maxSize || 70, extraSkip: ctx.noCollide || [] });
  if (ctx.clouds !== false) fx.cloudDome(Object.assign({ coverage: 0.56, scale: 1.3, speed: 0.005 }, ctx.clouds || {}));
  if (ctx.grass) fx.grass(Object.assign({ hgt, R: 30, count: 2600 }, ctx.grass));
  const fauna = createFauna({ W, stage, kit, hgt, groundY, canStand: ctx.canStand, bounds: ctx.bounds, fx });
  /* soft contact shadows under people, animals and rides */
  fx.contactShadows(() => {
    const st = W.st, out = fauna.shadows(st);
    for (const n of W.NPC) if (Math.abs(n.x - st.x) < 60 && Math.abs(n.z - st.z) < 60) out.push({ x: n.x, y: groundY(n.x, n.z), z: n.z, r: 0.42 });
    if (!W.isRiding()) out.push({ x: st.x, y: groundY(st.x, st.z), z: st.z, r: 0.45 });
    return out;
  }, { max: 160, opacity: 0.36 });
  if (ctx.post !== false) fx.post(Object.assign({ bloom: { strength: 0.22, radius: 0.55, threshold: 0.88 }, grade: { tint: "#fffaf2", contrast: 1.06, saturation: 1.06, vignette: 0.28 } }, ctx.post || {}));
  return { fx, fauna, colliders };
}
