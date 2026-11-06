import * as THREE from "three";
import { mergeGeometries, tint } from "./yunnan-fx.js";
import { makeAnimal as yunnanAnimal } from "./yunnan-props.js";

/* Animals and rides for the walkable worlds.
   - buildAnimal(kind): blocky animals in the same style as the people.
   - createFauna(ctx): herds that wander and graze, soaring birds, info badges
     (ⓘ) that open a wildlife card, and rideables: animals (camel, horse, yak,
     donkey...), a donkey cart, a jeep, a paraglider and a boat.
   ctx = { W, stage, kit, hgt, groundY, canStand, bounds?, fx? } */

const _o = new THREE.Object3D();
/* [w, h, d, x, y, z, color, rx, ry, rz] -> tinted box geometry */
function bx(p) {
  const [w, h, d, x, y, z, c, rx = 0, ry = 0, rz = 0] = p;
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx || ry || rz) {
    _o.rotation.set(rx, ry, rz);
    _o.position.set(0, 0, 0);
    _o.scale.set(1, 1, 1);
    _o.updateMatrix();
    g.applyMatrix4(_o.matrix);
  }
  g.translate(x, y, z);
  return tint(g, c);
}

/* ---------------------------------------------------------------- species definitions */
const DEF = {};
DEF.camel = (o = {}) => {
  const C = o.color || "#b38a5a", C2 = "#9c7448", C3 = "#6f5236", F = "#5a4632";
  return {
    body: [
      [0.95, 0.9, 2.1, 0, 1.85, 0, C], [0.86, 0.82, 0.5, 0, 1.8, 1.05, C], [0.8, 0.26, 1.4, 0, 1.32, 0.1, C3],
      [0.72, 0.55, 0.62, 0, 2.45, 0.52, C2], [0.52, 0.3, 0.44, 0, 2.8, 0.52, C3], [0.72, 0.55, 0.62, 0, 2.45, -0.48, C2], [0.5, 0.3, 0.42, 0, 2.8, -0.48, C3],
      [0.36, 0.95, 0.42, 0, 1.98, 1.48, C, -0.95], [0.42, 0.55, 0.34, 0, 1.78, 1.5, C3, -0.9], [0.32, 0.85, 0.36, 0, 2.56, 1.92, C, -0.12],
    ],
    head: { pivot: [0, 2.95, 1.98], parts: [[0.34, 0.36, 0.78, 0, 0, 0.26, C], [0.28, 0.28, 0.3, 0, -0.05, 0.66, C2], [0.08, 0.14, 0.06, -0.13, 0.23, 0.0, C], [0.08, 0.14, 0.06, 0.13, 0.23, 0.0, C], [0.05, 0.06, 0.03, -0.17, 0.08, 0.3, "#111"], [0.05, 0.06, 0.03, 0.17, 0.08, 0.3, "#111"]], nod: 0.08 },
    legs: { y: 1.48, x: 0.3, z: [0.78, -0.78], parts: [[0.24, 0.8, 0.28, 0, -0.4, 0, C], [0.28, 0.16, 0.3, 0, -0.82, 0, C3], [0.18, 0.62, 0.2, 0, -1.16, 0, C], [0.32, 0.1, 0.38, 0, -1.43, 0.04, F]] },
    tail: { pivot: [0, 1.95, -1.05], parts: [[0.08, 0.7, 0.08, 0, -0.35, -0.04, C3]] },
    seat: 2.62, len: 1.3, r: 1.2, swing: 0.32, gait: 3.2, saddle: [0, 2.58, 0.02, 0.98, 0.16, 0.7],
  };
};
DEF.yak = (o = {}) => {
  const Y = o.color || "#2b2522", Y2 = o.color2 || "#1d1816", H = "#ddd4c2";
  return {
    body: [[1.1, 1.0, 1.7, 0, 1.3, 0, Y], [1.0, 0.42, 0.62, 0, 1.92, 0.5, Y], [1.22, 0.55, 1.82, 0, 0.86, 0, Y2], [1.02, 0.62, 0.42, 0, 0.98, 0.86, Y2], o.patch ? [0.9, 0.5, 0.6, 0, 1.4, -0.3, "#e8e2d6"] : [0.01, 0.01, 0.01, 0, 1, 0, Y]],
    head: { pivot: [0, 1.42, 1.02], parts: [[0.55, 0.5, 0.7, 0, -0.1, 0.3, Y], [0.42, 0.3, 0.3, 0, -0.22, 0.68, "#3a3430"], [0.5, 0.22, 0.3, 0, 0.2, 0.38, Y2],
      [0.12, 0.12, 0.45, -0.34, 0.2, 0.15, H, 0, 0.6, 0], [0.12, 0.12, 0.45, 0.34, 0.2, 0.15, H, 0, -0.6, 0], [0.08, 0.3, 0.08, -0.52, 0.38, 0.14, H, 0, 0, 0.4], [0.08, 0.3, 0.08, 0.52, 0.38, 0.14, H, 0, 0, -0.4]], nod: 0.1 },
    legs: { y: 0.86, x: 0.34, z: [0.56, -0.56], parts: [[0.27, 0.8, 0.29, 0, -0.4, 0, Y2], [0.29, 0.1, 0.31, 0, -0.82, 0.02, "#151210"]] },
    tail: { pivot: [0, 1.52, -0.88], parts: [[0.12, 0.8, 0.12, 0, -0.4, 0, Y2], [0.3, 0.42, 0.26, 0, -0.86, 0, Y2]] },
    seat: 1.98, len: 1.1, r: 1.0, swing: 0.3, gait: 3.6, saddle: [0, 1.86, 0.05, 1.12, 0.14, 0.8],
  };
};
DEF.sheep = (o = {}) => {
  const W = o.color || "#e8e0cc", K = o.face || "#2a2420";
  return {
    body: [[0.56, 0.5, 0.86, 0, 0.76, 0, W], [0.6, 0.42, 0.6, 0, 0.82, 0.05, W], [0.36, 0.34, 0.26, 0, 0.66, -0.48, W]],
    head: { pivot: [0, 0.95, 0.44], parts: [[0.22, 0.26, 0.36, 0, 0, 0.12, K], [0.2, 0.06, 0.08, -0.14, 0.05, 0.05, K, 0, 0, 0.3], [0.2, 0.06, 0.08, 0.14, 0.05, 0.05, K, 0, 0, -0.3]], nod: 0.35, graze: true },
    legs: { y: 0.5, x: 0.17, z: [0.28, -0.28], parts: [[0.1, 0.5, 0.1, 0, -0.25, 0, "#3a3430"]] },
    tail: null, len: 0.5, r: 0.45, swing: 0.45, gait: 7,
  };
};
DEF.goat = (o = {}) => {
  const G = o.color || "#6b5644", G2 = "#4a3a2e";
  return {
    body: [[0.42, 0.48, 0.86, 0, 0.85, 0, G], [0.44, 0.2, 0.7, 0, 1.1, -0.02, G2]],
    head: { pivot: [0, 1.05, 0.44], parts: [[0.2, 0.24, 0.4, 0, 0.04, 0.14, G], [0.08, 0.2, 0.08, 0, -0.14, 0.3, G2], [0.05, 0.28, 0.05, -0.07, 0.28, 0.02, "#2a2420", -0.6], [0.05, 0.28, 0.05, 0.07, 0.28, 0.02, "#2a2420", -0.6]], nod: 0.35, graze: true },
    legs: { y: 0.62, x: 0.14, z: [0.3, -0.3], parts: [[0.09, 0.62, 0.09, 0, -0.31, 0, G2]] },
    tail: { pivot: [0, 1.05, -0.43], parts: [[0.06, 0.16, 0.06, 0, 0.06, -0.02, G2, -0.5]] }, len: 0.5, r: 0.42, swing: 0.5, gait: 7,
  };
};
function arcHorn(side, n, step, sx, color, curl, out) {
  const parts = [];
  for (let k = 0; k < n; k += 1) {
    const a = k * curl;
    const y = 0.22 + Math.sin(a) * step * 2.4, z = -0.02 - (1 - Math.cos(a)) * step * 2.4;
    const s = 0.11 * (1 - k / (n * 1.25));
    parts.push([s, s, step * 1.15, side * (sx + k * out), y, z, color, -a + 0.4, 0, 0]);
  }
  return parts;
}
DEF.ibex = (o = {}) => {
  const C = o.color || "#8a6a48", L = "#d8c8a8", D = "#4a3626";
  return {
    body: [[0.5, 0.58, 1.1, 0, 1.05, 0, C], [0.46, 0.14, 0.9, 0, 0.78, 0, L], [0.08, 0.1, 1.0, 0, 1.36, 0, D]],
    head: { pivot: [0, 1.32, 0.58], parts: [[0.22, 0.26, 0.42, 0, 0, 0.15, C], [0.08, 0.22, 0.08, 0, -0.18, 0.28, D], ...arcHorn(-1, 7, 0.13, 0.07, "#6a5a48", 0.38, 0.004), ...arcHorn(1, 7, 0.13, 0.07, "#6a5a48", 0.38, 0.004)], nod: 0.3, graze: true },
    legs: { y: 0.78, x: 0.16, z: [0.4, -0.4], parts: [[0.1, 0.78, 0.1, 0, -0.39, 0, C], [0.11, 0.08, 0.12, 0, -0.78, 0.01, D]] },
    tail: { pivot: [0, 1.2, -0.55], parts: [[0.08, 0.16, 0.06, 0, 0.04, -0.02, D, -0.4]] }, len: 0.65, r: 0.5, swing: 0.5, gait: 6,
  };
};
DEF.markhor = (o = {}) => {
  const C = o.color || "#9a8a74", R = "#ece6da", D = "#4a3e32";
  const horn = (side) => {
    const parts = [];
    for (let k = 0; k < 9; k += 1) {
      const a = k * 1.1, r = 0.07 + k * 0.004;
      parts.push([0.09 - k * 0.006, 0.12, 0.09 - k * 0.006, side * (0.1 + Math.cos(a) * r + k * 0.015), 0.24 + k * 0.1, -0.02 + Math.sin(a) * r - k * 0.02, "#5a4a3a"]);
    }
    return parts;
  };
  return {
    body: [[0.52, 0.6, 1.1, 0, 1.08, 0, C], [0.54, 0.62, 0.42, 0, 0.92, 0.48, R], [0.46, 0.14, 0.9, 0, 0.8, 0, "#c8bba6"]],
    head: { pivot: [0, 1.36, 0.6], parts: [[0.22, 0.26, 0.42, 0, 0, 0.15, C], [0.16, 0.36, 0.16, 0, -0.26, 0.2, R], ...horn(-1), ...horn(1)], nod: 0.28, graze: true },
    legs: { y: 0.8, x: 0.16, z: [0.4, -0.4], parts: [[0.1, 0.8, 0.1, 0, -0.4, 0, D]] },
    tail: { pivot: [0, 1.22, -0.55], parts: [[0.08, 0.18, 0.06, 0, 0.04, -0.02, D, -0.4]] }, len: 0.65, r: 0.5, swing: 0.5, gait: 6,
  };
};
DEF.marcopolo = (o = {}) => {
  const C = o.color || "#b49a78", W = "#efe9dc";
  const horn = (side) => {
    const parts = [];
    for (let k = 0; k < 12; k += 1) {
      const a = k * 0.52;
      const s = 0.16 * (1 - k / 15);
      parts.push([s, s, 0.16, side * (0.12 + k * 0.045), 0.18 + Math.sin(a) * 0.32, -0.04 - (1 - Math.cos(a)) * 0.3, "#c8b79a", -a]);
    }
    return parts;
  };
  return {
    body: [[0.6, 0.62, 1.15, 0, 1.12, 0, C], [0.56, 0.2, 0.95, 0, 0.82, 0, W], [0.5, 0.5, 0.25, 0, 1.08, -0.56, W], [0.5, 0.5, 0.36, 0, 1.1, 0.56, "#d8cbb4"]],
    head: { pivot: [0, 1.4, 0.64], parts: [[0.24, 0.28, 0.44, 0, 0, 0.16, C], [0.2, 0.2, 0.18, 0, -0.06, 0.38, W], ...horn(-1), ...horn(1)], nod: 0.25, graze: true },
    legs: { y: 0.86, x: 0.18, z: [0.42, -0.42], parts: [[0.11, 0.86, 0.11, 0, -0.43, 0, "#e6dccb"]] },
    tail: null, len: 0.7, r: 0.55, swing: 0.5, gait: 6,
  };
};
DEF.snowleopard = (o = {}) => {
  const C = "#d6d2c6", S = "#4a4842";
  const body = [[0.46, 0.44, 1.25, 0, 0.72, 0, C], [0.42, 0.14, 1.1, 0, 0.5, 0, "#ece9e0"]];
  const R = (k) => ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1;
  for (let k = 0; k < 16; k += 1) body.push([0.08, 0.06, 0.08, (R(k) - 0.5) * 0.48, 0.72 + (R(k + 7) - 0.3) * 0.3, (R(k + 3) - 0.5) * 1.2, S]);
  return {
    body,
    head: { pivot: [0, 0.85, 0.66], parts: [[0.34, 0.3, 0.36, 0, 0, 0.12, C], [0.2, 0.14, 0.12, 0, -0.06, 0.34, "#e8e4da"], [0.08, 0.1, 0.05, -0.12, 0.18, 0.02, S], [0.08, 0.1, 0.05, 0.12, 0.18, 0.02, S], [0.05, 0.04, 0.03, -0.08, 0.04, 0.31, "#7aa04a"], [0.05, 0.04, 0.03, 0.08, 0.04, 0.31, "#7aa04a"]], nod: 0.15 },
    legs: { y: 0.55, x: 0.16, z: [0.45, -0.45], parts: [[0.14, 0.55, 0.15, 0, -0.27, 0, C], [0.17, 0.08, 0.2, 0, -0.53, 0.03, C]] },
    tail: { pivot: [0, 0.8, -0.62], parts: [[0.17, 0.17, 0.42, 0, -0.04, -0.2, C, 0.3], [0.17, 0.17, 0.42, 0, -0.18, -0.56, C, 0.1], [0.18, 0.18, 0.38, 0, -0.18, -0.92, S, -0.3]] },
    len: 0.7, r: 0.45, swing: 0.5, gait: 5,
  };
};
DEF.gazelle = (o = {}) => {
  const C = o.color || "#c4a074", W = "#f0e8da";
  return {
    body: [[0.36, 0.42, 0.9, 0, 0.95, 0, C], [0.32, 0.12, 0.75, 0, 0.75, 0, W], [0.3, 0.3, 0.12, 0, 0.95, -0.46, W]],
    head: { pivot: [0, 1.16, 0.48], parts: [[0.16, 0.2, 0.34, 0, 0.12, 0.12, C, -0.3], [0.04, 0.32, 0.04, -0.05, 0.38, 0.0, "#2a2420", -0.4], [0.04, 0.32, 0.04, 0.05, 0.38, 0.0, "#2a2420", -0.4]], nod: 0.3, graze: true },
    legs: { y: 0.74, x: 0.12, z: [0.34, -0.34], parts: [[0.06, 0.74, 0.06, 0, -0.37, 0, C]] },
    tail: { pivot: [0, 1.06, -0.46], parts: [[0.05, 0.16, 0.05, 0, -0.06, -0.02, "#2a2420"]] }, len: 0.5, r: 0.4, swing: 0.55, gait: 7,
  };
};
DEF.zebu = (o = {}) => {
  const Z = o.color || "#e2dccf", D = "#3a3430";
  return {
    body: [[0.75, 0.74, 1.5, 0, 1.25, 0, Z], [0.46, 0.4, 0.42, 0, 1.76, 0.52, Z], [0.2, 0.52, 0.6, 0, 0.86, 0.74, Z]],
    head: { pivot: [0, 1.42, 0.86], parts: [[0.34, 0.4, 0.6, 0, -0.06, 0.26, Z], [0.28, 0.2, 0.18, 0, -0.18, 0.6, "#b8a898"], [0.06, 0.36, 0.06, -0.2, 0.3, 0.06, D, 0, 0, 0.3], [0.06, 0.36, 0.06, 0.2, 0.3, 0.06, D, 0, 0, -0.3], [0.18, 0.06, 0.1, -0.24, 0.02, 0.1, Z], [0.18, 0.06, 0.1, 0.24, 0.02, 0.1, Z]], nod: 0.3, graze: true },
    legs: { y: 0.9, x: 0.24, z: [0.55, -0.55], parts: [[0.17, 0.86, 0.19, 0, -0.43, 0, Z], [0.19, 0.08, 0.21, 0, -0.86, 0.01, D]] },
    tail: { pivot: [0, 1.5, -0.76], parts: [[0.05, 0.9, 0.05, 0, -0.45, 0, Z], [0.1, 0.2, 0.1, 0, -0.95, 0, D]] }, len: 0.9, r: 0.75, swing: 0.32, gait: 4,
  };
};
DEF.bear = (o = {}) => {
  const C = o.color || "#5a3e28", D = "#3a2818";
  return {
    body: [[0.9, 0.86, 1.5, 0, 1.0, 0, C], [0.8, 0.34, 0.5, 0, 1.5, 0.45, C]],
    head: { pivot: [0, 1.14, 0.82], parts: [[0.5, 0.46, 0.5, 0, 0, 0.18, C], [0.28, 0.24, 0.3, 0, -0.08, 0.52, "#8a6a48"], [0.1, 0.06, 0.04, 0, -0.02, 0.68, "#111"], [0.14, 0.14, 0.08, -0.2, 0.26, 0.1, D], [0.14, 0.14, 0.08, 0.2, 0.26, 0.1, D]], nod: 0.2 },
    legs: { y: 0.66, x: 0.3, z: [0.52, -0.52], parts: [[0.28, 0.66, 0.3, 0, -0.33, 0, D], [0.32, 0.08, 0.38, 0, -0.64, 0.05, D]] },
    tail: null, len: 0.9, r: 0.8, swing: 0.35, gait: 4,
  };
};
DEF.monkey = (o = {}) => {
  const C = o.color || "#9a7f60", F = "#d88a7a";
  return {
    body: [[0.28, 0.34, 0.5, 0, 0.55, 0, C]],
    head: { pivot: [0, 0.72, 0.28], parts: [[0.24, 0.24, 0.22, 0, 0.04, 0.06, C], [0.16, 0.14, 0.04, 0, 0.02, 0.18, F]], nod: 0.2 },
    legs: { y: 0.42, x: 0.1, z: [0.18, -0.18], parts: [[0.07, 0.42, 0.07, 0, -0.21, 0, C]] },
    tail: { pivot: [0, 0.62, -0.25], parts: [[0.05, 0.05, 0.45, 0, 0.14, -0.18, C, -0.7]] }, len: 0.3, r: 0.25, swing: 0.6, gait: 8,
  };
};
DEF.dog = (o = {}) => {
  const C = o.color || "#b08a5a";
  return {
    body: [[0.3, 0.32, 0.74, 0, 0.6, 0, C]],
    head: { pivot: [0, 0.76, 0.38], parts: [[0.24, 0.24, 0.24, 0, 0.04, 0.06, C], [0.14, 0.12, 0.18, 0, -0.02, 0.24, "#8a6a48"], [0.08, 0.12, 0.04, -0.09, 0.2, 0.0, "#6a5034"], [0.08, 0.12, 0.04, 0.09, 0.2, 0.0, "#6a5034"]], nod: 0.25 },
    legs: { y: 0.46, x: 0.1, z: [0.26, -0.26], parts: [[0.08, 0.46, 0.08, 0, -0.23, 0, C]] },
    tail: { pivot: [0, 0.7, -0.36], parts: [[0.05, 0.05, 0.3, 0, 0.1, -0.12, C, -0.8]] }, len: 0.4, r: 0.3, swing: 0.6, gait: 8,
  };
};

/* Assemble a definition into animated meshes. */
function assemble(def, material, track) {
  const root = new THREE.Group(), inner = new THREE.Group();
  root.add(inner);
  const meshOf = (list, parent) => {
    const geos = list.map(bx);
    const g = mergeGeometries(geos);
    geos.forEach((q) => q.dispose());
    track(g);
    const m = new THREE.Mesh(g, material);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  meshOf(def.body, inner);
  const head = new THREE.Group();
  head.position.set(...def.head.pivot);
  inner.add(head);
  meshOf(def.head.parts, head);
  const legs = [];
  const L = def.legs;
  for (const z of L.z) for (const sx of [-1, 1]) {
    const pv = new THREE.Group();
    pv.position.set(sx * L.x, L.y, z);
    inner.add(pv);
    meshOf(L.parts, pv);
    legs.push(pv);
  }
  let tail = null;
  if (def.tail) {
    tail = new THREE.Group();
    tail.position.set(...def.tail.pivot);
    inner.add(tail);
    meshOf(def.tail.parts, tail);
  }
  let ph = Math.random() * 6, graze = 0;
  return {
    root, inner, head, def,
    seat: def.seat, len: def.len, r: def.r,
    update(time, moving, speed = 1, reduced = false, grazing = false) {
      if (reduced) return;
      if (moving) ph += 0.016 * def.gait * Math.max(0.5, speed);
      const a = moving ? Math.sin(ph) * def.swing : 0;
      /* diagonal gait: front-left with back-right */
      if (legs.length === 4) { legs[0].rotation.x = a; legs[3].rotation.x = a; legs[1].rotation.x = -a; legs[2].rotation.x = -a; }
      inner.position.y = moving ? Math.abs(Math.cos(ph)) * 0.035 : 0;
      graze += ((grazing && def.head.graze ? 1 : 0) - graze) * 0.05;
      head.rotation.x = Math.sin(time * 1.3 + ph) * def.head.nod * 0.3 + graze * 0.9 + (moving ? Math.sin(ph * 2) * 0.04 : 0);
      if (tail) tail.rotation.z = Math.sin(time * 2.2 + ph) * 0.3;
    },
  };
}

/* Wrap the older Yunnan models (horse, mule, elephant, buffalo) in the same interface. */
function legacy(kind, material, track, o = {}) {
  const map = { horse: "horse", mule: "mule", donkey: "mule", elephant: "elephant", calf: "calf", buffalo: "buffalo" };
  const a = yunnanAnimal(map[kind], material, track, Object.assign({}, o, kind === "donkey" ? { color: o.color || "#8d8780", muzzle: "#d8d2c8" } : {}));
  if (kind === "donkey") a.inner.scale.setScalar(0.82);
  const seat = { horse: 1.62, mule: 1.55, donkey: 1.3, elephant: 4.07, calf: 2.2, buffalo: 2.0 }[kind];
  const r = { horse: 0.8, mule: 0.75, donkey: 0.6, elephant: 1.9, calf: 1.1, buffalo: 1.0 }[kind];
  return {
    root: a.root, inner: a.inner, head: null, def: null, seat, len: r * 1.3, r,
    update(time, moving, speed = 1, reduced = false) { a.update(time, moving, speed, reduced); },
  };
}

export function buildAnimal(kind, material, track, o = {}) {
  if (DEF[kind]) return assemble(DEF[kind](o), material, track);
  return legacy(kind, material, track, o);
}

/* Soaring bird (golden eagle, Himalayan griffon vulture, lammergeier...). */
function buildBird(kind, material, track) {
  const eagle = kind !== "vulture";
  const C = eagle ? "#4a3420" : "#9a8466", W = eagle ? "#3a2818" : "#4a3828", H = eagle ? "#8a6a3a" : "#e8dcc4";
  const span = eagle ? 1.1 : 1.35;
  const root = new THREE.Group();
  const mk = (list, parent) => { const geos = list.map(bx); const g = mergeGeometries(geos); geos.forEach((q) => q.dispose()); track(g); const m = new THREE.Mesh(g, material); m.castShadow = true; parent.add(m); return m; };
  mk([[0.24, 0.2, 0.8, 0, 0, 0, C], [0.18, 0.18, 0.22, 0, 0.04, 0.48, H], [0.08, 0.06, 0.12, 0, 0.0, 0.62, "#e0b030"], [0.34, 0.04, 0.34, 0, 0, -0.52, W]], root);
  const wings = [-1, 1].map((sd) => {
    const pv = new THREE.Group();
    pv.position.set(sd * 0.1, 0.03, 0.05);
    root.add(pv);
    mk([[span, 0.04, 0.42, sd * span * 0.5, 0, 0, C], [span * 0.55, 0.035, 0.34, sd * span * 1.2, 0, -0.04, W]], pv);
    return { pv, sd };
  });
  return { root, wings };
}

/* ---------------------------------------------------------------- vehicles */
function buildJeep(material, track, color = "#d8d2c4") {
  const root = new THREE.Group(), inner = new THREE.Group();
  root.add(inner);
  const geos = [
    /* open-top Willys-style jeep, the classic ride of Hunza, Skardu and the KKH */
    bx([1.9, 0.7, 4.0, 0, 0.95, 0, color]), bx([1.7, 0.08, 2.6, 0, 1.3, -0.6, "#3a3028"]),
    bx([1.7, 0.75, 0.06, 0, 1.68, 0.62, "#3a5868", -0.2]), bx([1.8, 0.08, 0.1, 0, 2.06, 0.55, "#2a2a2a"]),
    bx([0.6, 0.12, 0.6, -0.42, 1.36, 0.0, "#5a3a28"]), bx([0.6, 0.6, 0.12, -0.42, 1.66, -0.3, "#5a3a28"]),
    bx([0.6, 0.12, 0.6, 0.42, 1.36, 0.0, "#5a3a28"]), bx([0.6, 0.6, 0.12, 0.42, 1.66, -0.3, "#5a3a28"]),
    bx([1.5, 0.12, 0.6, 0, 1.36, -1.2, "#5a3a28"]), bx([1.5, 0.5, 0.12, 0, 1.62, -1.5, "#5a3a28"]),
    bx([0.08, 1.0, 0.08, -0.86, 1.8, -0.9, "#2a2a2a"]), bx([0.08, 1.0, 0.08, 0.86, 1.8, -0.9, "#2a2a2a"]), bx([1.8, 0.08, 0.08, 0, 2.3, -0.9, "#2a2a2a"]),
    bx([0.36, 0.08, 0.36, -0.42, 1.6, 0.42, "#1a1a1a", -0.9]),
    bx([1.95, 0.25, 0.12, 0, 0.75, 2.02, "#2a2a2a"]), bx([0.3, 0.18, 0.06, -0.62, 1.05, 2.0, "#fff6d0"]), bx([0.3, 0.18, 0.06, 0.62, 1.05, 2.0, "#fff6d0"]),
    bx([1.95, 0.25, 0.12, 0, 0.75, -2.02, "#2a2a2a"]), bx([0.3, 0.14, 0.06, -0.7, 1.0, -2.0, "#c0302a"]), bx([0.3, 0.14, 0.06, 0.7, 1.0, -2.0, "#c0302a"]),
    bx([1.2, 0.4, 0.8, 0, 1.6, -1.7, "#8a6a44"]),
  ];
  const g = mergeGeometries(geos); geos.forEach((q) => q.dispose()); track(g);
  const body = new THREE.Mesh(g, material); body.castShadow = true; inner.add(body);
  const wheels = [];
  const wg = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 14); wg.rotateZ(Math.PI / 2); track(wg);
  const tm = new THREE.MeshStandardMaterial({ color: "#1d1d1d", roughness: 0.9 });
  [[-0.95, 1.3], [0.95, 1.3], [-0.95, -1.3], [0.95, -1.3]].forEach(([x, z]) => { const w = new THREE.Mesh(wg, tm); w.position.set(x, 0.42, z); w.castShadow = true; inner.add(w); wheels.push(w); });
  const spare = new THREE.Mesh(wg, tm); spare.rotation.y = Math.PI / 2; spare.position.set(0, 1.25, -2.15); inner.add(spare);
  return { root, inner, wheels, tm };
}
function buildCart(material, track) {
  const root = new THREE.Group();
  const geos = [bx([1.3, 0.12, 1.6, 0, 0.75, 0, "#7a5a3a"]), bx([0.08, 0.35, 1.6, -0.62, 0.92, 0, "#5a4028"]), bx([0.08, 0.35, 1.6, 0.62, 0.92, 0, "#5a4028"]), bx([1.3, 0.35, 0.08, 0, 0.92, -0.78, "#5a4028"]),
    bx([0.06, 0.06, 2.0, -0.4, 0.72, 1.6, "#5a4028"]), bx([0.06, 0.06, 2.0, 0.4, 0.72, 1.6, "#5a4028"]), bx([1.15, 0.1, 1.3, 0, 0.86, -0.05, "#b3261e"]), bx([1.0, 0.06, 1.1, 0, 0.92, -0.05, "#e0b347"])];
  const g = mergeGeometries(geos); geos.forEach((q) => q.dispose()); track(g);
  const m = new THREE.Mesh(g, material); m.castShadow = true; root.add(m);
  const wg = new THREE.CylinderGeometry(0.55, 0.55, 0.1, 12); wg.rotateZ(Math.PI / 2); track(wg);
  const wheels = [-0.75, 0.75].map((x) => { const w = new THREE.Mesh(wg, material); w.position.set(x, 0.55, -0.1); root.add(w); return w; });
  return { root, wheels };
}
function buildGlider(track, color1 = "#e6402a", color2 = "#f2c230") {
  const root = new THREE.Group();
  const parts = [];
  for (let i = 0; i < 9; i += 1) {
    const a = (i - 4) * 0.2;
    const g = new THREE.BoxGeometry(0.98, 0.08, 1.5);
    g.rotateZ(a);
    g.translate(Math.sin(a) * 4.8, Math.cos(a) * 4.8 - 0.6, 0);
    parts.push(tint(g, i % 2 ? color1 : color2));
  }
  const lines = [];
  for (let i = 0; i < 9; i += 2) {
    const a = (i - 4) * 0.2, top = new THREE.Vector3(Math.sin(a) * 4.8, Math.cos(a) * 4.8 - 0.6, 0);
    const L = top.length(), g = new THREE.CylinderGeometry(0.012, 0.012, L, 3);
    g.translate(0, L / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().normalize()));
    lines.push(tint(g, "#e8e8e8"));
  }
  const g = mergeGeometries([...parts, ...lines]); parts.concat(lines).forEach((q) => q.dispose()); track(g);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide });
  const m = new THREE.Mesh(g, mat); m.castShadow = true; root.add(m);
  return { root, mat };
}

/* ---------------------------------------------------------------- the fauna system */
export function createFauna(ctx) {
  const { W, stage, kit, hgt, canStand } = ctx;
  const groundY = ctx.groundY || hgt;
  const track = (g) => stage.trackGeometry(g);
  const mats = new Map();
  /* fur: vertex colours with a soft noise normal map when the realism kit is available */
  const furMat = (() => {
    if (ctx.fx) return ctx.fx.pbr("plaster", { color: "#ffffff", color2: "#e6e6e6", color3: "#c8c8c8", stains: 0, seed: 404, bump: 2.2, repeat: [2, 2] }, { vertexColors: true });
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    stage.materials.add(m);
    return m;
  })();
  const herds = [], birds = [], rides = [];
  const reduced = () => stage.reducedMotion;
  const inBounds = (x, z) => !ctx.bounds || (x > ctx.bounds.x0 + 4 && x < ctx.bounds.x1 - 4 && z > ctx.bounds.z0 + 4 && z < ctx.bounds.z1 - 4);
  const free = (x, z, r) => inBounds(x, z) && canStand(x, z) && !kit.blocked(x, z, r);

  /** A herd of animals wandering round (cx, cz) within radius R. */
  function herd({ id = null, kind, count = 5, cx, cz, R = 12, speed = 1, wild = false, flee = 6, scale = [0.9, 1.1], opts = {}, tag = 1, area = null, block = true }) {
    const list = [];
    for (let i = 0; i < count; i += 1) {
      const a = buildAnimal(kind, furMat, track, typeof opts === "function" ? opts(i) : opts);
      const s = scale[0] + Math.random() * (scale[1] - scale[0]);
      a.root.scale.setScalar(s);
      let x = cx, z = cz;
      for (let k = 0; k < 30; k += 1) {
        const q = Math.random() * Math.PI * 2, d = Math.random() * R;
        x = cx + Math.cos(q) * d; z = cz + Math.sin(q) * d;
        if (free(x, z, a.r) && (!area || area(x, z))) break;
      }
      a.root.position.set(x, groundY(x, z), z);
      a.root.rotation.y = Math.random() * Math.PI * 2;
      stage.add(a.root);
      const m = { a, x, z, yaw: a.root.rotation.y, tx: x, tz: z, wait: Math.random() * 5, v: 0, s, graze: false };
      list.push(m);
      if (id && i < tag) W.addInfoTarget(id, a.root, (a.seat || a.len * 1.6 + 0.8) * s + 0.9);
      if (block && a.r > 0.35) W.addBlocker({ pos: () => ({ x: m.x, z: m.z }), r: a.r * s * 0.85 });
    }
    herds.push({ list, cx, cz, R, speed, wild, flee, area });
    return list;
  }
  /** Birds soaring in circles. */
  function soar({ id = null, kind = "eagle", count = 2, cx, cz, R = 30, h = 30 }) {
    for (let i = 0; i < count; i += 1) {
      const b = buildBird(kind, furMat, track);
      stage.add(b.root);
      const o = { b, cx: cx + (Math.random() - 0.5) * 10, cz: cz + (Math.random() - 0.5) * 10, R: R * (0.7 + Math.random() * 0.5), h: h + Math.random() * 8, ph: Math.random() * 6, sp: (0.12 + Math.random() * 0.06) * (Math.random() < 0.5 ? 1 : -1) };
      birds.push(o);
      if (id && i === 0) W.addInfoTarget(id, b.root, 1.4);
    }
  }

  /* ------------------------------ rides */
  function landRide({ x, z, yaw = 0, vmax = 4, vrun = 8, turn = 1.4, radius = 1.0, slope = 1.4 }) {
    return (r, dt, inp) => {
      let target = 0;
      if (inp.n > 0.1) {
        let df = Math.atan2(inp.mx, inp.mz) - r.yaw;
        df = Math.atan2(Math.sin(df), Math.cos(df));
        const rate = turn * dt, t = Math.max(-rate, Math.min(rate, df));
        r.yaw += t;
        // Keep the sign so a rider can reverse out of a collider instead of
        // being forced to keep driving into it.
        target = inp.n * (inp.run ? vrun : vmax) * Math.cos(df);
      }
      r.v += (target - r.v) * Math.min(1, dt * 1.8);
      if (Math.abs(r.v) > 0.05) {
        // Sub-step fast rides so a road edge or small prop cannot trap the
        // vehicle after a single large frame-to-frame jump.
        const steps = Math.max(1, Math.ceil(Math.abs(r.v * dt) / 0.65));
        const step = r.v * dt / steps;
        for (let i = 0; i < steps; i += 1) {
          const nx = r.x + Math.sin(r.yaw) * step, nz = r.z + Math.cos(r.yaw) * step;
          const [qx, qz] = kit.resolve(nx, nz, radius);
          const direction = step >= 0 ? 1 : -1;
          const fx = qx + Math.sin(r.yaw) * radius * 1.2 * direction;
          const fz = qz + Math.cos(r.yaw) * radius * 1.2 * direction;
          const valid = inBounds(qx, qz) && canStand(qx, qz) && canStand(fx, fz)
            && Math.abs(groundY(fx, fz) - groundY(qx, qz)) < slope;
          if (valid) { r.x = qx; r.z = qz; continue; }

          // Try each axis independently so rides slide along walls and
          // recover from a shallow diagonal collision instead of freezing.
          const [sx, sz] = kit.resolve(r.x + Math.sin(r.yaw) * step, r.z, radius);
          if (inBounds(sx, sz) && canStand(sx, sz)) { r.x = sx; r.z = sz; continue; }
          const [tx, tz] = kit.resolve(r.x, r.z + Math.cos(r.yaw) * step, radius);
          if (inBounds(tx, tz) && canStand(tx, tz)) { r.x = tx; r.z = tz; continue; }
          r.v = 0;
          break;
        }
      }
    };
  }
  function sideSpot(r, dist = [2.4, 3.2, 4.2]) {
    for (const d of dist) for (const a of [Math.PI / 2, -Math.PI / 2, Math.PI, 0, 2.3, -2.3, 0.8, -0.8]) {
      const x = r.x + Math.sin(r.yaw + a) * d, z = r.z + Math.cos(r.yaw + a) * d;
      if (canStand(x, z) && !kit.blocked(x, z, 0.5)) return [x, z];
    }
    return null;
  }
  function register(r, { label, radius = 3.6, blockR = 1, pose = "straddle", camLift = 2.2, camDist = 16, id = null, tagH = 3, offNote = null }) {
    rides.push(r);
    W.addRideable({
      kind: r.kind, label, radius, blockR, pose, camLift, camDist, offNote, iconH: tagH + 1.2,
      pos: () => ({ x: r.x, z: r.z }),
      mount: () => { r.ridden = true; },
      dismounted: () => { r.ridden = false; r.v = 0; },
      reset: () => { r.ridden = false; [r.x, r.z, r.yaw] = r.home; r.v = 0; if (r.y0 != null) r.y = r.y0; },
      step: (dt, inp) => { r.step(r, dt, inp); return r.seat(); },
      dismount: () => r.dismount(),
      state: r,
    });
    if (id) W.addInfoTarget(id, r.root, tagH);
  }
  /** Ride an animal: camel, horse, yak, donkey, mule, elephant. */
  function rideAnimal({ kind, x, z, yaw = 0, label, id = null, vmax, vrun, saddle = "#b3261e", trim = "#e0b347", opts = {} }) {
    const a = buildAnimal(kind, furMat, track, opts);
    const seat = a.seat;
    /* saddle blanket and seat */
    const sd = a.def && a.def.saddle ? a.def.saddle : [0, seat - 0.08, 0, 0.9, 0.12, 0.8];
    const geos = [bx([sd[3], sd[4], sd[5], sd[0], sd[1], sd[2], saddle]), bx([sd[3] * 1.04, 0.05, sd[5] * 1.04, sd[0], sd[1] - 0.05, sd[2], trim]),
      bx([0.06, 0.4, 0.06, -sd[3] * 0.5 - 0.02, sd[1] - 0.3, sd[2], "#3a2a18"]), bx([0.06, 0.4, 0.06, sd[3] * 0.5 + 0.02, sd[1] - 0.3, sd[2], "#3a2a18"])];
    const g = mergeGeometries(geos); geos.forEach((q) => q.dispose()); track(g);
    const sm = new THREE.Mesh(g, furMat); sm.castShadow = true; a.inner.add(sm);
    a.root.position.set(x, groundY(x, z), z);
    a.root.rotation.y = yaw;
    stage.add(a.root);
    const spec = {
      camel: [3, 6.5], horse: [4.5, 11], yak: [2.8, 5.5], donkey: [3, 5.5], mule: [3.2, 6], elephant: [3.4, 6.5],
    }[kind] || [3.5, 7];
    const r = {
      kind, a, root: a.root, x, z, yaw, v: 0, home: [x, z, yaw], ridden: false,
      step: landRide({ vmax: vmax || spec[0], vrun: vrun || spec[1], radius: a.r, turn: kind === "horse" ? 2.0 : 1.4 }),
      seat: () => ({ x: r.x - Math.sin(r.yaw) * 0.05, y: groundY(r.x, r.z) + seat - 0.74 + a.inner.position.y, z: r.z - Math.cos(r.yaw) * 0.05, face: r.yaw }),
      dismount: () => sideSpot(r),
      update(time) { r.root.position.set(r.x, groundY(r.x, r.z), r.z); r.root.rotation.y = r.yaw; a.update(time, r.v > 0.2, Math.max(0.6, r.v * 0.5), reduced()); },
    };
    register(r, { label, radius: 3.4 + a.r, blockR: a.r * 0.9, pose: kind === "elephant" ? "sit" : "straddle", camLift: seat * 0.75 + 0.6, camDist: 14 + seat * 1.5, id, tagH: seat + 1.4 });
    return r;
  }
  /** Donkey cart: the player sits on the cart, a donkey pulls it. */
  function rideCart({ x, z, yaw = 0, label, id = null }) {
    const root = new THREE.Group();
    const d = buildAnimal("donkey", furMat, track);
    d.root.position.set(0, 0, 1.9);
    root.add(d.root);
    const c = buildCart(furMat, track);
    root.add(c.root);
    root.position.set(x, groundY(x, z), z);
    root.rotation.y = yaw;
    stage.add(root);
    let roll = 0;
    const r = {
      kind: "cart", root, x, z, yaw, v: 0, home: [x, z, yaw], ridden: false,
      step: landRide({ vmax: 3.2, vrun: 5.5, radius: 1.3, turn: 1.1 }),
      seat: () => ({ x: r.x - Math.sin(r.yaw) * 0.2, y: groundY(r.x, r.z) + 0.95 - 0.74, z: r.z - Math.cos(r.yaw) * 0.2, face: r.yaw }),
      dismount: () => sideSpot(r),
      update(time, dt) {
        root.position.set(r.x, groundY(r.x, r.z), r.z); root.rotation.y = r.yaw;
        roll += r.v * dt / 0.55; c.wheels.forEach((w) => (w.rotation.x = roll));
        d.update(time, r.v > 0.2, Math.max(0.6, r.v * 0.6), reduced());
      },
    };
    register(r, { label, radius: 4, blockR: 1.4, pose: "sit", camLift: 1.6, camDist: 15, id, tagH: 2.6 });
    return r;
  }
  /** A jeep or truck you can drive (Karakoram Highway). */
  function rideJeep({ x, z, yaw = 0, label, color, id = null, vmax = 14, vrun = 24 }) {
    const j = buildJeep(furMat, track, color);
    stage.add(j.root);
    stage.materials.add(j.tm);
    let roll = 0;
    const r = {
      kind: "jeep", root: j.root, x, z, yaw, v: 0, home: [x, z, yaw], ridden: false,
      step: (rr, dt, inp) => {
        let target = 0;
        if (inp.n > 0.1) {
          let df = Math.atan2(inp.mx, inp.mz) - rr.yaw;
          df = Math.atan2(Math.sin(df), Math.cos(df));
          const rate = (0.6 + Math.min(1, Math.abs(rr.v) / 6) * 1.4) * dt, t = Math.max(-rate, Math.min(rate, df));
          rr.yaw += t;
          // Negative cosine is reverse. The old minimum of 0.1 meant the
          // jeep could never back away from a bump or roadside collider.
          target = inp.n * (inp.run ? vrun : vmax) * Math.cos(df);
        }
        rr.v += (target - rr.v) * Math.min(1, dt * (target > rr.v ? 0.9 : 2.2));
        if (Math.abs(rr.v) > 0.05) {
          const steps = Math.max(1, Math.ceil(Math.abs(rr.v * dt) / 0.65));
          const step = rr.v * dt / steps;
          for (let i = 0; i < steps; i += 1) {
            const nx = rr.x + Math.sin(rr.yaw) * step, nz = rr.z + Math.cos(rr.yaw) * step;
            const [qx, qz] = kit.resolve(nx, nz, 1.4);
            const direction = step >= 0 ? 1 : -1;
            const fx = qx + Math.sin(rr.yaw) * 2.2 * direction, fz = qz + Math.cos(rr.yaw) * 2.2 * direction;
            if (inBounds(qx, qz) && canStand(qx, qz) && canStand(fx, fz) && Math.abs(groundY(fx, fz) - groundY(qx, qz)) < 1.6) { rr.x = qx; rr.z = qz; continue; }
            const [sx, sz] = kit.resolve(rr.x + Math.sin(rr.yaw) * step, rr.z, 1.4);
            if (inBounds(sx, sz) && canStand(sx, sz)) { rr.x = sx; rr.z = sz; continue; }
            const [tx, tz] = kit.resolve(rr.x, rr.z + Math.cos(rr.yaw) * step, 1.4);
            if (inBounds(tx, tz) && canStand(tx, tz)) { rr.x = tx; rr.z = tz; continue; }
            rr.v = 0;
            break;
          }
        }
      },
      seat: () => ({ x: r.x - Math.cos(r.yaw) * 0.42, y: groundY(r.x, r.z) + 1.42 - 0.74, z: r.z + Math.sin(r.yaw) * 0.42, face: r.yaw }),
      dismount: () => sideSpot(r, [2.6, 3.4, 4.5]),
      update(time, dt) {
        const gy = groundY(r.x, r.z);
        const fy = groundY(r.x + Math.sin(r.yaw) * 1.6, r.z + Math.cos(r.yaw) * 1.6), by = groundY(r.x - Math.sin(r.yaw) * 1.6, r.z - Math.cos(r.yaw) * 1.6);
        const ly = groundY(r.x + Math.cos(r.yaw) * 0.9, r.z - Math.sin(r.yaw) * 0.9), ry = groundY(r.x - Math.cos(r.yaw) * 0.9, r.z + Math.sin(r.yaw) * 0.9);
        j.root.position.set(r.x, gy, r.z);
        j.root.rotation.set(0, r.yaw, 0);
        j.inner.rotation.set(-Math.atan2(fy - by, 3.2), 0, Math.atan2(ly - ry, 1.8) * -1);
        roll += r.v * dt / 0.42; j.wheels.forEach((w) => (w.rotation.x = roll));
      },
    };
    register(r, { label, radius: 4.2, blockR: 2.0, pose: "sit", camLift: 1.5, camDist: 18, id, tagH: 3.0 });
    return r;
  }
  /** Paraglider: launch from a ridge, glide, ride thermals, land on open ground. */
  function rideGlider({ x, z, yaw = 0, label, thermals = [], id = null, sink = 0.9, speed = 9, ceiling = 140, water = () => false }) {
    const gl = buildGlider(track);
    stage.materials.add(gl.mat);
    stage.add(gl.root);
    const y0 = groundY(x, z) + 0.2;
    const r = {
      kind: "glider", root: gl.root, x, z, yaw, v: 0, y: y0, y0, home: [x, z, yaw], ridden: false, air: false, bank: 0,
      step: (rr, dt, inp) => {
        const gy = groundY(rr.x, rr.z);
        if (!rr.air) {
          /* on the launch slope: run forward to take off */
          if (inp.n > 0.1) { rr.air = true; rr.y = gy + 1.0; rr.v = speed; }
          return;
        }
        let df = 0;
        if (inp.n > 0.1) {
          df = Math.atan2(inp.mx, inp.mz) - rr.yaw;
          df = Math.atan2(Math.sin(df), Math.cos(df));
        }
        const t = Math.max(-0.9 * dt, Math.min(0.9 * dt, df));
        rr.yaw += t;
        rr.bank += (t / Math.max(dt, 1e-3) * 0.5 - rr.bank) * Math.min(1, dt * 2);
        const sp = inp.run ? speed * 1.35 : speed;
        rr.x += Math.sin(rr.yaw) * sp * dt; rr.z += Math.cos(rr.yaw) * sp * dt;
        /* stay over the map */
        if (ctx.bounds) {
          const b = ctx.bounds, m = 20;
          if (rr.x < b.x0 + m || rr.x > b.x1 - m || rr.z < b.z0 + m || rr.z > b.z1 - m) rr.yaw += dt * 1.2;
          rr.x = Math.max(b.x0 + 6, Math.min(b.x1 - 6, rr.x)); rr.z = Math.max(b.z0 + 6, Math.min(b.z1 - 6, rr.z));
        }
        let lift = -sink * (inp.run ? 1.6 : 1);
        for (const th of thermals) { const d = Math.hypot(rr.x - th.x, rr.z - th.z); if (d < th.r) lift += th.lift * (1 - d / th.r); }
        const g2 = groundY(rr.x, rr.z);
        if (water(rr.x, rr.z) && rr.y - g2 < 10) lift = Math.max(lift, 0.4);
        rr.y = Math.min(ceiling, rr.y + lift * dt);
        if (rr.y < g2 + 0.6) {
          rr.y = g2;
          rr.air = false;
          if (!water(rr.x, rr.z)) rr.autoOff = true;
        }
      },
      seat: () => ({ x: r.x, y: (r.air ? r.y : groundY(r.x, r.z) + 0.05) - 0.4, z: r.z, face: r.yaw }),
      dismount: () => (r.air ? null : sideSpot(r, [1.2, 2, 3])),
      update(time) {
        if (r.autoOff) { r.autoOff = false; if (r.ridden) W.dismount(); }
        if (r.ridden && r.air) {
          gl.root.position.set(r.x, r.y + 0.6, r.z);
          gl.root.rotation.set(0, r.yaw, 0);
          gl.root.rotateZ(-r.bank);
          gl.root.scale.setScalar(1);
        } else {
          /* folded on the launch: lie the wing on the ground behind the pilot */
          gl.root.position.set(r.x - Math.sin(r.yaw) * 3, groundY(r.x, r.z) - 4.0, r.z - Math.cos(r.yaw) * 3);
          gl.root.rotation.set(0, r.yaw + Math.PI / 2, Math.PI / 2 - 0.08);
        }
      },
    };
    const reg = { label, radius: 4.5, blockR: 0, pose: "stand", camLift: 1.2, camDist: 18, id, tagH: 2.4, offNote: { en: "Glide down and land on open ground first (Shift dives faster)", zh: "请先滑翔降落到空地上（Shift 加速下降）" } };
    register(r, reg);
    /* after landing, put the glider back on its launch next time it is mounted */
    const rd = W.RIDES[W.RIDES.length - 1];
    const m0 = rd.mount;
    rd.mount = () => { if (!r.air && Math.hypot(r.x - r.home[0], r.z - r.home[1]) > 30) { [r.x, r.z, r.yaw] = r.home; } m0(); };
    return r;
  }

  /** Sand sled (Mingsha dunes): starts on a crest, slides down the slope, steer left and right. */
  function rideSled({ x, z, yaw = 0, label, id = null }) {
    const root = new THREE.Group();
    const geos = [bx([0.9, 0.08, 1.9, 0, 0.18, 0, "#8a5a32"]), bx([0.08, 0.16, 2.0, -0.42, 0.08, 0, "#5a3a20"]), bx([0.08, 0.16, 2.0, 0.42, 0.08, 0, "#5a3a20"]),
      bx([0.9, 0.3, 0.08, 0, 0.3, 0.95, "#8a5a32", -0.5]), bx([0.7, 0.05, 1.2, 0, 0.24, -0.2, "#b3261e"]), bx([0.05, 0.05, 0.9, 0, 0.42, 0.9, "#d8c08a", 0, Math.PI / 2, 0])];
    const g = mergeGeometries(geos); geos.forEach((q) => q.dispose()); track(g);
    const m = new THREE.Mesh(g, furMat); m.castShadow = true; root.add(m);
    stage.add(root);
    let slow = 0;
    const slope = (px, pz, dx, dz) => (groundY(px + dx * 0.8, pz + dz * 0.8) - groundY(px - dx * 0.8, pz - dz * 0.8)) / 1.6;
    const r = {
      kind: "sled", root, x, z, yaw, v: 0, home: [x, z, yaw], ridden: false, moved: false, autoOff: false, pitch: 0,
      step: (b, dt, inp) => {
        if (inp.n > 0.1) {
          let df = Math.atan2(inp.mx, inp.mz) - b.yaw;
          df = Math.atan2(Math.sin(df), Math.cos(df));
          b.yaw += Math.max(-1.5 * dt, Math.min(1.5 * dt, df));
        }
        const fx2 = Math.sin(b.yaw), fz2 = Math.cos(b.yaw);
        const sl = slope(b.x, b.z, fx2, fz2);
        /* gravity along the slope, sand friction, a small push from the rider */
        b.v += (-sl * 9.8 * 0.75 - 1.1 - b.v * 0.06 + (inp.n > 0.1 && b.v < 2 ? 2.4 : 0)) * dt;
        b.v = Math.max(0, Math.min(15, b.v));
        if (b.v > 1) b.moved = true;
        const nx = b.x + fx2 * b.v * dt, nz = b.z + fz2 * b.v * dt;
        const [qx, qz] = kit.resolve(nx, nz, 0.7);
        if (inBounds(qx, qz) && canStand(qx, qz)) { b.x = qx; b.z = qz; } else b.v = 0;
        b.pitch += (Math.atan(sl) - b.pitch) * Math.min(1, dt * 6);
        if (b.moved && b.v < 0.3) slow += dt; else slow = 0;
        if (slow > 1.0) { slow = 0; b.autoOff = true; }
      },
      seat: () => ({ x: r.x, y: groundY(r.x, r.z) + 0.3 - 0.74, z: r.z, face: r.yaw }),
      dismount: () => sideSpot(r, [1.4, 2.2, 3]),
      update(time) {
        if (r.autoOff) { r.autoOff = false; if (r.ridden) W.dismount(); }
        root.position.set(r.x, groundY(r.x, r.z), r.z);
        root.rotation.set(0, r.yaw, 0);
        root.rotateX(-r.pitch);
      },
    };
    register(r, { label, radius: 3.4, blockR: 0, pose: "sit", camLift: 1.4, camDist: 13, id, tagH: 1.6 });
    const rd = W.RIDES[W.RIDES.length - 1];
    const m0 = rd.mount;
    rd.mount = () => { if (Math.hypot(r.x - r.home[0], r.z - r.home[1]) > 6) { [r.x, r.z, r.yaw] = r.home; } r.moved = false; r.v = 0; m0(); };
    return r;
  }

  /** Cycle rickshaw (Kathmandu): pedal it through the squares. */
  function rideRickshaw({ x, z, yaw = 0, label, id = null }) {
    const root = new THREE.Group(), inner = new THREE.Group();
    root.add(inner);
    const geos = [
      bx([0.08, 0.08, 1.9, 0, 0.62, 0.55, "#2a5a8a"]), bx([0.08, 0.7, 0.08, 0, 0.95, 1.35, "#2a5a8a", 0.3]), bx([0.7, 0.06, 0.06, 0, 1.32, 1.42, "#1a1a1a"]),
      bx([0.32, 0.08, 0.36, 0, 1.02, 0.6, "#1a1a1a"]), bx([0.06, 0.5, 0.06, 0, 0.78, 0.6, "#2a5a8a"]),
      bx([1.3, 0.1, 0.9, 0, 0.72, -0.55, "#2a5a8a"]), bx([1.2, 0.18, 0.7, 0, 0.92, -0.6, "#c0302a"]), bx([1.2, 0.6, 0.12, 0, 1.22, -0.95, "#c0302a"]),
      bx([0.05, 1.1, 0.05, -0.62, 1.4, -1.0, "#1a1a1a"]), bx([0.05, 1.1, 0.05, 0.62, 1.4, -1.0, "#1a1a1a"]), bx([0.05, 1.0, 0.05, -0.62, 1.4, -0.2, "#1a1a1a"]), bx([0.05, 1.0, 0.05, 0.62, 1.4, -0.2, "#1a1a1a"]),
      bx([1.4, 0.06, 1.1, 0, 1.95, -0.6, "#e8b830", -0.12]), bx([1.4, 0.24, 0.04, 0, 1.82, -0.04, "#2a8a5a"]),
    ];
    const g = mergeGeometries(geos); geos.forEach((q) => q.dispose()); track(g);
    const body = new THREE.Mesh(g, furMat); body.castShadow = true; inner.add(body);
    const wg = new THREE.TorusGeometry(0.34, 0.04, 6, 18); wg.rotateY(Math.PI / 2); track(wg);
    const wm = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.7 }); stage.materials.add(wm);
    const wheels = [[0, 1.35], [-0.66, -0.6], [0.66, -0.6]].map(([wx, wz]) => { const w = new THREE.Mesh(wg, wm); w.position.set(wx, 0.36, wz); inner.add(w); return w; });
    root.position.set(x, groundY(x, z), z);
    stage.add(root);
    let roll = 0;
    const r = {
      kind: "rickshaw", root, x, z, yaw, v: 0, home: [x, z, yaw], ridden: false,
      step: landRide({ vmax: 4.2, vrun: 7.5, radius: 0.9, turn: 1.6, slope: 1.2 }),
      seat: () => ({ x: r.x + Math.sin(r.yaw) * 0.5, y: groundY(r.x, r.z) + 1.08 - 0.74, z: r.z + Math.cos(r.yaw) * 0.5, face: r.yaw }),
      dismount: () => sideSpot(r, [1.6, 2.4, 3.2]),
      update(time, dt) {
        root.position.set(r.x, groundY(r.x, r.z), r.z); root.rotation.y = r.yaw;
        roll += r.v * dt / 0.34; wheels.forEach((w) => (w.rotation.x = roll));
      },
    };
    register(r, { label, radius: 3.4, blockR: 1.0, pose: "sit", camLift: 1.6, camDist: 13, id, tagH: 2.6 });
    return r;
  }
  /** A boat on a lake or river; water(x, z) says where it can go. */
  function rideBoat({ x, z, yaw = 0, label, water, waterY, color = "#2f6a8a", id = null, vmax = 6, vrun = 10, obstacles = [], raft = false }) {
    const root = new THREE.Group();
    if (raft) {
      /* Balti "zak": a frame of poles lashed over inflated goat skins */
      const geos = [];
      for (let k = 0; k < 6; k += 1) geos.push(bx([3.2, 0.1, 0.12, 0, 0.42, -1.2 + k * 0.48, "#8a6a44"]));
      for (const sx of [-1.4, 0, 1.4]) geos.push(bx([0.12, 0.12, 2.8, sx, 0.5, 0, "#6a4a30"]));
      const g0 = mergeGeometries(geos); geos.forEach((q) => q.dispose()); track(g0);
      const frame = new THREE.Mesh(g0, furMat); frame.castShadow = true; root.add(frame);
      const skin = new THREE.SphereGeometry(0.42, 10, 8); skin.scale(1.25, 0.8, 0.9); track(skin);
      const skinM = new THREE.MeshStandardMaterial({ color: "#6a4e36", roughness: 0.8 }); stage.materials.add(skinM);
      for (let a = 0; a < 3; a += 1) for (let b = 0; b < 3; b += 1) { const m = new THREE.Mesh(skin, skinM); m.position.set(-1.1 + a * 1.1, 0.12, -0.9 + b * 0.9); root.add(m); }
    }
    const hull = new THREE.CylinderGeometry(0.62, 0.62, 5.2, 12, 6, false, 0, Math.PI);
    hull.rotateZ(Math.PI / 2); hull.rotateX(Math.PI);
    const hp = hull.attributes.position;
    for (let i = 0; i < hp.count; i += 1) { const px = hp.getX(i), t = Math.abs(px) / 2.6, k = Math.sqrt(Math.max(0.05, 1 - t * t * t)); hp.setXYZ(i, px, hp.getY(i) * k * 0.8 + t * t * 0.5, hp.getZ(i) * k); }
    hull.computeVertexNormals();
    const geos = [tint(hull, "#7a5236"), bx([4.6, 0.1, 1.08, 0, 0.02, 0, color]), bx([0.9, 0.1, 1.0, -0.7, 0.16, 0, "#8a6a44"]), bx([0.9, 0.1, 1.0, 1.0, 0.16, 0, "#8a6a44"]),
      bx([0.06, 0.06, 2.4, 0, 0.5, 0, "#5a4028", 0.5, 0.3, 0]), bx([0.24, 0.04, 0.5, 0.95, 0.35, 0.95, "#5a4028", 0.5, 0.3, 0])];
    if (!raft) {
      const g = mergeGeometries(geos); geos.forEach((q) => q.dispose()); track(g);
      const m = new THREE.Mesh(g, furMat); m.castShadow = true; root.add(m);
    } else geos.forEach((q) => q.dispose());
    stage.add(root);
    const r = {
      kind: "boat", root, x, z, yaw, v: 0, home: [x, z, yaw], ridden: false, turn: 0,
      step: (b, dt, inp) => {
        let thrust = 0;
        if (inp.n > 0.1) {
          let df = Math.atan2(inp.mx, inp.mz) - b.yaw;
          df = Math.atan2(Math.sin(df), Math.cos(df));
          const rate = (0.8 + Math.min(1, Math.abs(b.v) / 5) * 0.5) * dt, t = Math.max(-rate, Math.min(rate, df));
          b.yaw += t;
          // Allow reverse thrust so a boat can back away from a bank, pier or
          // another boat instead of repeatedly colliding with it.
          thrust = inp.n * (inp.run ? vrun : vmax) * Math.cos(df);
        }
        b.v += (thrust - b.v) * Math.min(1, dt * 0.8);
        const hit = (px, pz) => !water(px, pz) || obstacles.some((o) => Math.hypot(px - o.x, pz - o.z) < o.r);
        const steps = Math.max(1, Math.ceil(Math.abs(b.v * dt) / 0.65));
        const step = b.v * dt / steps;
        for (let i = 0; i < steps; i += 1) {
          const nx = b.x + Math.sin(b.yaw) * step, nz = b.z + Math.cos(b.yaw) * step;
          if (!hit(nx, nz)) { b.x = nx; b.z = nz; }
          else if (!hit(nx, b.z)) b.x = nx;
          else if (!hit(b.x, nz)) b.z = nz;
          else { b.v = 0; break; }
        }
      },
      seat: () => ({ x: r.x - Math.sin(r.yaw) * 0.7, y: waterY - 0.08 + 0.26 - 0.72, z: r.z - Math.cos(r.yaw) * 0.7, face: r.yaw }),
      dismount: () => {
        for (const d of [2.4, 3.4, 5, 6.5, 8]) for (let k = 0; k < 16; k += 1) {
          const a = (k / 16) * Math.PI * 2, px = r.x + Math.cos(a) * d, pz = r.z + Math.sin(a) * d;
          if (canStand(px, pz) && !kit.blocked(px, pz, 0.5)) return [px, pz];
        }
        return null;
      },
      update(time) {
        root.position.set(r.x, waterY - 0.1 + (reduced() ? 0 : Math.sin(time * 1.6 + r.home[0]) * 0.05), r.z);
        root.rotation.set(reduced() ? 0 : Math.sin(time * 1.1 + r.home[1]) * 0.03, r.yaw - Math.PI / 2, 0);
      },
    };
    register(r, { label, radius: 4.4, blockR: 0, pose: "sit", camLift: 1.3, camDist: 16, id, tagH: 2.2 });
    return r;
  }

  /* ------------------------------ per frame */
  const tmp = { x: 0, z: 0 };
  W.onUpdate((time, dt, st) => {
    const red = reduced();
    for (const h of herds) for (const m of h.list) {
      const near = Math.abs(m.x - st.x) < 140 && Math.abs(m.z - st.z) < 140;
      if (!near) continue;
      let moving = false;
      if (!red) {
        const pd = Math.hypot(m.x - st.x, m.z - st.z);
        if (h.wild && pd < h.flee) {
          /* step away from the visitor */
          m.tx = m.x + ((m.x - st.x) / (pd || 1)) * 8; m.tz = m.z + ((m.z - st.z) / (pd || 1)) * 8; m.wait = 0;
        }
        if (!h.wild && pd < 3.2 && !W.isRiding()) {
          /* tame animals stop and turn to look at a visitor who walks up to them */
          m.wait = Math.max(m.wait, 1.5); m.tx = m.x; m.tz = m.z;
          let df = Math.atan2(st.x - m.x, st.z - m.z) - m.yaw;
          df = Math.atan2(Math.sin(df), Math.cos(df));
          m.yaw += df * Math.min(1, dt * 3);
          m.graze = false;
        } else if (m.wait > 0) { m.wait -= dt; m.graze = true; }
        else {
          const dx = m.tx - m.x, dz = m.tz - m.z, d = Math.hypot(dx, dz);
          if (d < 0.4) {
            for (let k = 0; k < 6; k += 1) {
              const q = Math.random() * Math.PI * 2, rr = Math.random() * h.R;
              tmp.x = h.cx + Math.cos(q) * rr; tmp.z = h.cz + Math.sin(q) * rr;
              if (free(tmp.x, tmp.z, m.a.r * 0.7) && (!h.area || h.area(tmp.x, tmp.z))) { m.tx = tmp.x; m.tz = tmp.z; break; }
            }
            m.wait = 3 + Math.random() * 9;
          } else {
            const sp = h.speed * (h.wild && pd < h.flee ? 2.6 : 1) * Math.min(1, d);
            const nx = m.x + (dx / d) * sp * dt, nz = m.z + (dz / d) * sp * dt;
            if (free(nx, nz, m.a.r * 0.6) && (!h.area || h.area(nx, nz))) { m.x = nx; m.z = nz; moving = true; }
            else { m.tx = m.x; m.tz = m.z; }
            let df = Math.atan2(dx, dz) - m.yaw;
            df = Math.atan2(Math.sin(df), Math.cos(df));
            m.yaw += df * Math.min(1, dt * 2.5);
            m.graze = false;
          }
        }
      }
      m.a.root.position.set(m.x, groundY(m.x, m.z), m.z);
      m.a.root.rotation.y = m.yaw;
      m.a.update(time, moving, h.speed, red, m.graze);
    }
    for (const o of birds) {
      if (!red) o.ph += dt * o.sp;
      const x = o.cx + Math.cos(o.ph) * o.R, z = o.cz + Math.sin(o.ph) * o.R, y = o.h + Math.sin(o.ph * 3) * 2;
      o.b.root.position.set(x, y, z);
      o.b.root.rotation.set(0, Math.atan2(-Math.sin(o.ph), Math.cos(o.ph)) * Math.sign(o.sp) + (o.sp > 0 ? 0 : Math.PI), 0);
      o.b.root.rotateZ(Math.sign(o.sp) * 0.35);
      const flap = red ? 0 : Math.max(0, Math.sin(time * 1.3 + o.R)) > 0.92 ? Math.sin(time * 14) * 0.5 : 0.06;
      o.b.wings.forEach((w) => (w.pv.rotation.z = w.sd * flap));
    }
    for (const r of rides) r.update(time, dt);
  });

  /** Positions for contact shadows. */
  function shadows(st) {
    const out = [];
    for (const h of herds) for (const m of h.list) if (Math.abs(m.x - st.x) < 80 && Math.abs(m.z - st.z) < 80) out.push({ x: m.x, y: groundY(m.x, m.z), z: m.z, r: m.a.r * m.s * 0.9, rz: m.a.len * m.s * 1.1, ry: m.yaw });
    for (const r of rides) if (r.kind !== "glider" && r.kind !== "boat" && r.kind !== "sled") out.push({ x: r.x, y: groundY(r.x, r.z), z: r.z, r: r.kind === "jeep" ? 1.2 : 0.8, rz: r.kind === "jeep" ? 2.2 : 1.3, ry: r.yaw });
    return out;
  }

  return { herd, soar, rideAnimal, rideCart, rideJeep, rideGlider, rideBoat, rideSled, rideRickshaw, shadows, herds, rides, furMat };
}
