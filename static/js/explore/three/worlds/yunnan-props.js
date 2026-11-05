import * as THREE from "three";
import { mergeGeometries, tint, lathe, limb, cardCluster } from "./yunnan-fx.js";

/* Shared building blocks for the Yunnan worlds: world-scaled box UVs,
   curved Chinese/Dai roofs, stilt houses, lanterns, lattice windows,
   signboards and simple animated animals (mule, elephant, peacock). */

/* Box with UVs in world units (so textures keep their scale on any size). */
export function boxUV(w, h, d, tile = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i += 1) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ax > 0.5) uv.setXY(i, z / tile, y / tile);
    else if (ay > 0.5) uv.setXY(i, x / tile, z / tile);
    else uv.setXY(i, x / tile, y / tile);
  }
  return g;
}
export function cylUV(rt, rb, h, seg, tile = 1, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  const uv = g.attributes.uv;
  const circ = (Math.PI * 2 * (rt + rb)) / 2;
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, (uv.getX(i) * circ) / tile, (uv.getY(i) * h) / tile);
  return g;
}

/* One curved roof face, bilinear between an eave edge (e0->e1) and a top edge
   (r0->r1). curve > 1 gives the concave Chinese profile; upturn lifts the corners. */
function slopeFace(e0, e1, r0, r1, { segS = 10, segT = 8, curve = 1.35, upturn = 0.5, tile = 1 } = {}) {
  const P = [], U = [], I = [];
  const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const eaveLen = e0.distanceTo(e1);
  const slopeLen = e0.clone().lerp(e1, 0.5).distanceTo(r0.clone().lerp(r1, 0.5));
  for (let j = 0; j <= segT; j += 1) {
    const t = j / segT;
    for (let i = 0; i <= segS; i += 1) {
      const s = i / segS;
      a.copy(e0).lerp(e1, s);
      b.copy(r0).lerp(r1, s);
      v.copy(a).lerp(b, t);
      /* concave profile: height follows t^curve between eave and top */
      const hy = a.y + (b.y - a.y) * Math.pow(t, curve);
      const edge = Math.pow(Math.abs(s * 2 - 1), 6);
      v.y = hy + upturn * edge * Math.pow(1 - t, 2.2);
      P.push(v.x, v.y, v.z);
      U.push((s * eaveLen) / tile, (t * slopeLen) / tile);
    }
  }
  for (let j = 0; j < segT; j += 1) for (let i = 0; i < segS; i += 1) {
    const k = j * (segS + 1) + i;
    I.push(k, k + 1, k + segS + 1, k + 1, k + segS + 2, k + segS + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

/**
 * Roof generator.
 *  type "gable": ridge along X.  type "hip": four slopes.  type "xieshan":
 *  Dai/Chinese half-hip: a hipped skirt with a steeper gable roof on top.
 * Returns { roof: geometry (tiles), trim: geometry (ridges / eave boards) }.
 */
export function roofGeometry({ w, d, h, oh = 0.8, type = "hip", curve = 1.4, upturn = 0.45, tile = 1, ridgeRatio = 0.45, skirt = 0.45, top = 0.9 }) {
  const W = w / 2 + oh, D = d / 2 + oh;
  const faces = [];
  const trims = [];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const ridgeBar = (x0, y0, z0, x1, y1, z1, r = 0.09) => {
    const A = V(x0, y0, z0), B = V(x1, y1, z1), L = A.distanceTo(B);
    if (L < 0.01) return;
    const g = new THREE.CylinderGeometry(r, r, L, 6);
    g.translate(0, L / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize());
    g.applyQuaternion(q);
    g.translate(A.x, A.y, A.z);
    trims.push(g);
  };
  if (type === "gable") {
    faces.push(slopeFace(V(-W, 0, D), V(W, 0, D), V(-W, h, 0), V(W, h, 0), { curve, upturn, tile }));
    faces.push(slopeFace(V(W, 0, -D), V(-W, 0, -D), V(W, h, 0), V(-W, h, 0), { curve, upturn, tile }));
    ridgeBar(-W - 0.1, h + 0.05, 0, W + 0.1, h + 0.05, 0, 0.14);
  } else if (type === "hip") {
    const rx = Math.max(W * 0.04, (W - D) * Math.min(1, ridgeRatio * 2.2));
    faces.push(slopeFace(V(-W, 0, D), V(W, 0, D), V(-rx, h, 0), V(rx, h, 0), { curve, upturn, tile }));
    faces.push(slopeFace(V(W, 0, -D), V(-W, 0, -D), V(rx, h, 0), V(-rx, h, 0), { curve, upturn, tile }));
    faces.push(slopeFace(V(W, 0, D), V(W, 0, -D), V(rx, h, 0), V(rx, h, 0), { curve, upturn, tile, segS: 8 }));
    faces.push(slopeFace(V(-W, 0, -D), V(-W, 0, D), V(-rx, h, 0), V(-rx, h, 0), { curve, upturn, tile, segS: 8 }));
    ridgeBar(-rx, h + 0.05, 0, rx, h + 0.05, 0, 0.12);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => ridgeBar(sx * rx, h, 0, sx * W, upturn * 0.9, sz * D, 0.08));
  } else {
    /* xieshan: skirt from the eaves to an inset rectangle, then a steep gable */
    const iw = W * (1 - skirt * (D / W)), idp = D * (1 - skirt);
    const hs = h * 0.42;
    faces.push(slopeFace(V(-W, 0, D), V(W, 0, D), V(-iw, hs, idp), V(iw, hs, idp), { curve: 1.15, upturn, tile, segT: 5 }));
    faces.push(slopeFace(V(W, 0, -D), V(-W, 0, -D), V(iw, hs, -idp), V(-iw, hs, -idp), { curve: 1.15, upturn, tile, segT: 5 }));
    faces.push(slopeFace(V(W, 0, D), V(W, 0, -D), V(iw, hs, idp), V(iw, hs, -idp), { curve: 1.15, upturn, tile, segT: 5, segS: 8 }));
    faces.push(slopeFace(V(-W, 0, -D), V(-W, 0, D), V(-iw, hs, -idp), V(-iw, hs, idp), { curve: 1.15, upturn, tile, segT: 5, segS: 8 }));
    const gw = iw * top, gd = idp + 0.25;
    faces.push(slopeFace(V(-gw, hs - 0.2, gd), V(gw, hs - 0.2, gd), V(-gw, h, 0), V(gw, h, 0), { curve: 1.25, upturn: upturn * 0.6, tile, segT: 7 }));
    faces.push(slopeFace(V(gw, hs - 0.2, -gd), V(-gw, hs - 0.2, -gd), V(gw, h, 0), V(-gw, h, 0), { curve: 1.25, upturn: upturn * 0.6, tile, segT: 7 }));
    ridgeBar(-gw - 0.15, h + 0.06, 0, gw + 0.15, h + 0.06, 0, 0.12);
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => ridgeBar(sx * iw, hs, sz * idp, sx * W, upturn * 0.9, sz * D, 0.07));
  }
  /* eave boards */
  [[-W, D, W, D], [W, -D, -W, -D]].forEach(([x0, z0, x1, z1]) => {
    const g = new THREE.BoxGeometry(Math.abs(x1 - x0), 0.16, 0.12);
    g.translate((x0 + x1) / 2, -0.04, z0);
    trims.push(g);
  });
  const roof = mergeGeometries(faces);
  faces.forEach((g) => g.dispose());
  const trim = trims.length ? mergeGeometries(trims) : null;
  trims.forEach((g) => g.dispose());
  return { roof, trim, gableWall: type === "xieshan" ? gableTriangle(W * (1 - skirt * (D / W)) * top, h * 0.42 - 0.2, h, D * (1 - skirt) + 0.25) : null };
}

/* The vertical triangle under a gable end (for xieshan roofs). */
function gableTriangle(gw, y0, y1, gd) {
  const g = new THREE.BufferGeometry();
  const P = [];
  for (const sx of [-1, 1]) {
    const x = sx * gw * 0.98;
    P.push(x, y0, -gd * 0.9, x, y0, gd * 0.9, x, y1 - 0.05, 0);
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 1, 1.4, 0, 0, 2, 0, 1, 1.4], 2));
  g.computeVertexNormals();
  return g;
}

/* Canvas lattice window texture (with optional warm emissive version for night). */
export function latticeTextures(fx, { color = "#5b3a22", gap = "#1a120c", glow = "#ffb766", pattern = "grid" } = {}) {
  const S = 256;
  const draw = (lit) => {
    const c = fx.canvas(S, S), g = c.getContext("2d");
    g.fillStyle = lit ? glow : gap; g.fillRect(0, 0, S, S);
    if (lit) { const gr = g.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S * 0.7); gr.addColorStop(0, "rgba(255,240,200,.9)"); gr.addColorStop(1, "rgba(160,80,20,.0)"); g.fillStyle = gr; g.fillRect(0, 0, S, S); }
    g.strokeStyle = lit ? "#000" : color;
    g.lineWidth = 9;
    g.strokeRect(5, 5, S - 10, S - 10);
    g.lineWidth = 5;
    if (pattern === "grid") {
      for (let i = 1; i < 6; i += 1) { g.beginPath(); g.moveTo((i * S) / 6, 0); g.lineTo((i * S) / 6, S); g.stroke(); g.beginPath(); g.moveTo(0, (i * S) / 6); g.lineTo(S, (i * S) / 6); g.stroke(); }
    } else {
      for (let i = -6; i < 12; i += 1) { g.beginPath(); g.moveTo((i * S) / 6, 0); g.lineTo(((i + 6) * S) / 6, S); g.stroke(); g.beginPath(); g.moveTo(((i + 6) * S) / 6, 0); g.lineTo((i * S) / 6, S); g.stroke(); }
    }
    return fx.toTex(c, { srgb: true });
  };
  return { map: draw(false), emissiveMap: draw(true) };
}

/* Simple carved signboard with Chinese text, painted to a canvas. */
export function signTexture(fx, text, { bg = "#2a1a10", fg = "#e8c26a", w = 512, h = 160, font = "bold 96px 'Noto Serif SC','Songti SC','SimSun',serif", border = "#b8893c" } = {}) {
  const c = fx.canvas(w, h), g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = border; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = fg; g.font = font; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + 4);
  return fx.toTex(c);
}

/* ---------------------------------------------------------------- blocky animals */

const box = (w, h, d, x, y, z, hex) => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return tint(g, hex);
};

/**
 * A blocky animal: body boxes + four pivoted legs (+ optional head/trunk parts).
 * kind: "mule" | "horse" | "elephant" | "calf" | "buffalo".
 * Returns { root, update(time, moving, speed) }.
 */
export function makeAnimal(kind, material, track, opts = {}) {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  const parts = [];
  const legs = [];
  let head = null, trunk = [], tail = null, ears = [];
  const add = (geos, parent = inner) => {
    const g = mergeGeometries(geos);
    geos.forEach((x) => x.dispose());
    track(g);
    const m = new THREE.Mesh(g, material);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    parts.push(m);
    return m;
  };
  if (kind === "mule" || kind === "horse") {
    const c = opts.color || (kind === "mule" ? "#5d4632" : "#7a5638"), dark = "#2a1f17";
    const L = kind === "horse" ? 1.1 : 1;
    add([box(0.62, 0.62, 1.5 * L, 0, 1.25, 0, c), box(0.58, 0.5, 0.4, 0, 1.3, -0.72 * L, c), box(0.6, 0.55, 0.4, 0, 1.28, 0.7 * L, c)]);
    const neck = new THREE.Group();
    neck.position.set(0, 1.45, 0.85 * L);
    neck.rotation.x = -0.75;
    inner.add(neck);
    add([box(0.34, 0.75, 0.42, 0, 0.35, 0, c), box(0.1, 0.65, 0.12, 0, 0.4, -0.2, dark)], neck);
    head = new THREE.Group();
    head.position.set(0, 0.72, 0.05);
    neck.add(head);
    add([box(0.3, 0.32, 0.62, 0, 0.05, 0.28, c), box(0.24, 0.2, 0.2, 0, -0.02, 0.62, opts.muzzle || "#3c2e22"),
      box(0.07, 0.07, 0.04, -0.15, 0.12, 0.38, "#0d0b09"), box(0.07, 0.07, 0.04, 0.15, 0.12, 0.38, "#0d0b09"),
      box(0.08, kind === "mule" ? 0.36 : 0.22, 0.06, -0.1, 0.32, 0.05, c), box(0.08, kind === "mule" ? 0.36 : 0.22, 0.06, 0.1, 0.32, 0.05, c)], head);
    /* tail */
    tail = new THREE.Group();
    tail.position.set(0, 1.45, -0.92 * L);
    inner.add(tail);
    add([box(0.1, 0.7, 0.1, 0, -0.35, -0.05, dark)], tail);
    [[-0.2, 0.55 * L], [0.2, 0.55 * L], [-0.2, -0.55 * L], [0.2, -0.55 * L]].forEach(([x, z]) => {
      const pv = new THREE.Group();
      pv.position.set(x, 0.98, z);
      inner.add(pv);
      add([box(0.16, 0.92, 0.18, 0, -0.46, 0, c), box(0.18, 0.12, 0.2, 0, -0.92, 0.02, dark)], pv);
      legs.push(pv);
    });
    if (opts.pack) {
      /* tea-caravan pack saddle with two bundles of bamboo-wrapped tea tongs */
      const pk = [box(0.72, 0.16, 0.8, 0, 1.62, 0, "#7a3b24"), box(0.8, 0.08, 0.9, 0, 1.56, 0, "#c8a24e")];
      add(pk);
      const bundle = (sx) => {
        const geos = [];
        [[0.46, 1.24], [0.46, 1.54], [0.66, 1.39]].forEach(([ox, oy], i) => {
          const cg = new THREE.CylinderGeometry(0.16, 0.16, 0.95, 10);
          cg.rotateX(Math.PI / 2);
          cg.translate(sx * ox, oy, -0.05);
          geos.push(tint(cg, i % 2 ? "#b49a5c" : "#c9b06c"));
        });
        geos.push(box(0.36, 0.06, 1.0, sx * 0.5, 1.08, 0, "#6b4a2a"));
        return geos;
      };
      add(bundle(-1));
      add(bundle(1));
      if (opts.bell) add([box(0.16, 0.16, 0.16, 0, 1.1, 0.95, "#c39a3a")]);
      if (opts.plume) add([box(0.1, 0.3, 0.1, 0, 1.0, 0.14, "#c8302a")], head);
    }
  } else if (kind === "elephant" || kind === "calf") {
    const s = kind === "calf" ? 0.55 : 1;
    const c = opts.color || "#6f6a66", dark = "#4c4744";
    inner.scale.setScalar(s * (opts.scale || 1));
    add([
      box(1.7, 1.6, 2.7, 0, 2.55, 0, c), box(1.5, 0.35, 2.4, 0, 3.45, -0.05, c), box(1.55, 1.3, 0.5, 0, 2.55, -1.45, c),
      box(1.45, 1.35, 0.4, 0, 2.6, 1.4, c), box(1.2, 0.3, 1.8, 0, 1.75, 0, dark),
    ]);
    head = new THREE.Group();
    head.position.set(0, 3.1, 1.6);
    inner.add(head);
    add([box(1.25, 1.25, 1.05, 0, 0, 0.35, c), box(1.05, 0.38, 0.95, 0, 0.72, 0.3, c), box(1.1, 0.25, 0.9, 0, 0.92, 0.18, c),
      box(0.1, 0.1, 0.04, -0.45, 0.15, 0.89, "#0c0a09"), box(0.1, 0.1, 0.04, 0.45, 0.15, 0.89, "#0c0a09")], head);
    if (kind === "elephant" && opts.tusks) add([box(0.1, 0.1, 0.55, -0.32, -0.45, 0.95, "#efe6d2", 0), box(0.1, 0.1, 0.55, 0.32, -0.45, 0.95, "#efe6d2")], head);
    /* ears (Asian elephants: smaller, rounded) */
    [-1, 1].forEach((sx) => {
      const ep = new THREE.Group();
      ep.position.set(sx * 0.62, 0.15, 0.15);
      head.add(ep);
      add([box(0.1, 0.95, 0.85, sx * 0.05, -0.15, -0.35, c), box(0.08, 0.6, 0.5, sx * 0.06, -0.62, -0.28, dark)], ep);
      ears.push({ g: ep, sx });
    });
    /* trunk: chain of pivoted segments */
    let parent = head, y = -0.35, w = 0.42;
    for (let i = 0; i < 5; i += 1) {
      const sg = new THREE.Group();
      sg.position.set(0, i === 0 ? y : -0.42, i === 0 ? 0.8 : 0);
      parent.add(sg);
      add([box(w, 0.46, w, 0, -0.21, 0, i % 2 ? c : dark)], sg);
      trunk.push(sg);
      parent = sg;
      w *= 0.84;
    }
    tail = new THREE.Group();
    tail.position.set(0, 3.0, -1.72);
    inner.add(tail);
    add([box(0.1, 1.1, 0.1, 0, -0.55, 0, dark), box(0.16, 0.22, 0.16, 0, -1.12, 0, "#2a2624")], tail);
    [[-0.52, 0.85], [0.52, 0.85], [-0.52, -0.85], [0.52, -0.85]].forEach(([x, z]) => {
      const pv = new THREE.Group();
      pv.position.set(x, 2.0, z);
      inner.add(pv);
      add([box(0.62, 2.0, 0.62, 0, -1.0, 0, c), box(0.7, 0.16, 0.7, 0, -1.95, 0.02, "#d8cfc0")], pv);
      legs.push(pv);
    });
  } else if (kind === "buffalo") {
    const c = "#2f2d2c";
    add([box(1.1, 1.0, 2.0, 0, 1.45, 0, c), box(1.15, 0.5, 0.6, 0, 1.95, 0.6, c)]);
    head = new THREE.Group();
    head.position.set(0, 1.55, 1.15);
    inner.add(head);
    add([box(0.6, 0.6, 0.7, 0, 0, 0.25, c), box(1.4, 0.12, 0.14, 0, 0.32, 0.1, "#bfb4a0"), box(0.12, 0.3, 0.12, -0.7, 0.45, 0.0, "#bfb4a0"), box(0.12, 0.3, 0.12, 0.7, 0.45, 0.0, "#bfb4a0")], head);
    [[-0.35, 0.65], [0.35, 0.65], [-0.35, -0.65], [0.35, -0.65]].forEach(([x, z]) => {
      const pv = new THREE.Group();
      pv.position.set(x, 1.05, z);
      inner.add(pv);
      add([box(0.26, 1.05, 0.28, 0, -0.52, 0, c)], pv);
      legs.push(pv);
    });
  }
  let ph = Math.random() * 6;
  return {
    root, inner, parts,
    update(time, moving, speed = 1, reduced = false) {
      if (reduced) return;
      if (moving) ph += speed * 0.016 * (kind === "elephant" || kind === "calf" ? 2.2 : 5.5);
      const a = moving ? Math.sin(ph) * (kind === "elephant" ? 0.28 : 0.45) : 0;
      if (legs.length === 4) {
        legs[0].rotation.x = a; legs[3].rotation.x = a;
        legs[1].rotation.x = -a; legs[2].rotation.x = -a;
      }
      inner.position.y = moving ? Math.abs(Math.cos(ph)) * 0.04 : 0;
      if (tail) tail.rotation.z = Math.sin(time * 2.3 + ph) * 0.25;
      if (head && kind !== "elephant" && kind !== "calf") head.rotation.x = Math.sin(time * 1.1 + ph) * 0.06 + (moving ? Math.sin(ph * 2) * 0.05 : 0.15);
      if (trunk.length) trunk.forEach((sg, i) => { sg.rotation.x = 0.12 + Math.sin(time * 0.9 + i * 0.6) * 0.12 + (i > 2 ? Math.sin(time * 0.7) * 0.18 : 0); });
      ears.forEach((e) => { e.g.rotation.y = e.sx * (0.15 + Math.sin(time * 1.6 + ph) * 0.18); });
    },
  };
}

/* A peacock: blocky body, crest and a tail that fans open from time to time. */
export function makePeacock(material, track) {
  const root = new THREE.Group();
  const mk = (geos, parent = root) => {
    const g = mergeGeometries(geos); geos.forEach((x) => x.dispose()); track(g);
    const m = new THREE.Mesh(g, material); m.castShadow = true; parent.add(m); return m;
  };
  mk([box(0.3, 0.32, 0.5, 0, 0.52, 0, "#1c4fa0"), box(0.12, 0.42, 0.12, 0, 0.82, 0.2, "#1d5db6"), box(0.14, 0.14, 0.2, 0, 1.06, 0.26, "#1f63c0"),
    box(0.05, 0.05, 0.1, 0, 1.04, 0.4, "#c9b071"), box(0.03, 0.14, 0.03, 0, 1.2, 0.24, "#2a8f6a"), box(0.06, 0.4, 0.06, -0.08, 0.2, 0, "#8a7a5a"), box(0.06, 0.4, 0.06, 0.08, 0.2, 0, "#8a7a5a")]);
  const tail = new THREE.Group();
  tail.position.set(0, 0.55, -0.22);
  root.add(tail);
  const feathers = [];
  for (let i = 0; i < 11; i += 1) {
    const f = new THREE.Group();
    tail.add(f);
    mk([box(0.08, 1.15, 0.02, 0, 0.58, 0, "#2b7a52"), box(0.16, 0.16, 0.025, 0, 1.08, 0, "#1f8a7a"), box(0.08, 0.08, 0.03, 0, 1.08, 0, "#16357e")], f);
    feathers.push({ f, a: (i - 5) / 5 });
  }
  let open = 0, target = 0, next = 3 + Math.random() * 6;
  return {
    root,
    update(time, dt, reduced) {
      if (reduced) return;
      next -= dt;
      if (next < 0) { target = target ? 0 : 1; next = target ? 4 + Math.random() * 4 : 6 + Math.random() * 8; }
      open += (target - open) * Math.min(1, dt * 2);
      tail.rotation.x = -1.35 + open * 1.2;
      feathers.forEach(({ f, a }) => { f.rotation.z = a * (0.12 + open * 1.25); });
    },
  };
}

/* Red silk lantern with gold caps; material emissive glows at night. */
export function lanternGeometry() {
  const parts = [
    tint(lathe([[0.02, -0.34], [0.2, -0.3], [0.3, -0.12], [0.32, 0], [0.3, 0.12], [0.2, 0.3], [0.02, 0.34]], 16), "#c8261e"),
  ];
  const caps = [tint(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 12).translate(0, 0.36, 0), "#d4a23a"), tint(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 12).translate(0, -0.36, 0), "#d4a23a"),
    tint(new THREE.CylinderGeometry(0.02, 0.06, 0.32, 6).translate(0, -0.55, 0), "#e2b545")];
  return { body: mergeGeometries(parts), caps: mergeGeometries(caps) };
}

/* ---------------------------------------------------------------- vegetation species */

/**
 * Build a few geometry variants of one plant species.
 * kind: canopy | pine | oldtea | bamboo | banana | palm | fern | banyan | shrub | fanpalm
 * Returns { variants: [{ trunk, leaves }], bark, leaf } (materials from fx).
 */
export function species(fx, kind, { variants = 3, seed = 1 } = {}) {
  let s = seed * 9973 + 17;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const out = [];
  let bark, leaf;
  const barkPbr = (o) => fx.pbr("bark", Object.assign({ color: "#6b5a48", color2: "#4a3d30", color3: "#2a2119", repeat: [1, 3] }, o), { vertexColors: true });
  if (kind === "canopy" || kind === "banyan") {
    bark = barkPbr(kind === "banyan" ? { color: "#8a8174", color2: "#6b6358", color3: "#3a352e", moss: true } : { moss: true });
    leaf = fx.leafMaterial(fx.leafTexture("broad", { colors: kind === "banyan" ? ["#2c5a24", "#3b6c2c", "#4f7d34", "#22451b"] : ["#33602a", "#46742f", "#5b8a3a", "#2a4d20"], seed: seed + 3 }), { wind: 0.0016 });
    for (let v = 0; v < variants; v += 1) {
      const H = kind === "banyan" ? 11 + rnd() * 3 : 15 + rnd() * 7, tg = [], lg = [];
      tg.push(tint(limb(V(0, -0.5, 0), V((rnd() - 0.5) * 1.5, H * 0.6, (rnd() - 0.5) * 1.5), kind === "banyan" ? 1.5 : 0.75, 0.45, 0.1, 8, 6, rnd), "#ffffff"));
      /* buttress roots */
      for (let b = 0; b < (kind === "banyan" ? 7 : 4); b += 1) {
        const a = (b / 5) * Math.PI * 2 + rnd();
        tg.push(tint(limb(V(Math.cos(a) * (kind === "banyan" ? 3.2 : 1.8), -0.3, Math.sin(a) * (kind === "banyan" ? 3.2 : 1.8)), V(0, kind === "banyan" ? 3.5 : 2.2, 0), 0.32, 0.5, 0.2, 5, 3, rnd), "#e8e2d8"));
      }
      const top = V(0, H * 0.6, 0);
      const nb = 4 + Math.floor(rnd() * 3);
      for (let b = 0; b < nb; b += 1) {
        const a = (b / nb) * Math.PI * 2 + rnd() * 0.8, r = (kind === "banyan" ? 6 : 4) + rnd() * 2.5, y = H * (0.75 + rnd() * 0.25);
        const tip = V(Math.cos(a) * r, y, Math.sin(a) * r);
        tg.push(tint(limb(top, tip, 0.42, 0.14, 0.25, 6, 4, rnd), "#ffffff"));
        lg.push(cardCluster({ n: fx.LOW ? 10 : 20, rx: 3.4, ry: 1.8, rz: 3.4, size: 2.4, cx: tip.x, cy: tip.y + 0.8, cz: tip.z, rnd }));
        if (kind === "banyan") {
          /* aerial roots hanging from branches */
          for (let k = 0; k < 4; k += 1) {
            const f = 0.35 + rnd() * 0.5, px = top.x + (tip.x - top.x) * f, pz = top.z + (tip.z - top.z) * f, py = top.y + (tip.y - top.y) * f;
            const g = new THREE.CylinderGeometry(0.05, 0.08, py, 4);
            g.translate(px, py / 2, pz);
            tg.push(tint(g, "#cfc6b5"));
          }
        }
      }
      lg.push(cardCluster({ n: fx.LOW ? 12 : 26, rx: 4.5, ry: 2.4, rz: 4.5, size: 2.6, cx: 0, cy: H * 0.95, cz: 0, rnd }));
      out.push({ trunk: mergeGeometries(tg), leaves: mergeGeometries(lg), h: H });
      tg.forEach((g) => g.dispose()); lg.forEach((g) => g.dispose());
    }
  } else if (kind === "pine") {
    bark = barkPbr({ color: "#7a5236", color2: "#5a3a26", color3: "#2a1a10" });
    leaf = fx.leafMaterial(fx.leafTexture("bamboo", { colors: ["#2b4a2a", "#355a30", "#40673a", "#223d22"], seed: seed + 5 }), { wind: 0.001 });
    for (let v = 0; v < variants; v += 1) {
      const H = 14 + rnd() * 8, tg = [], lg = [];
      tg.push(tint(limb(V(0, -0.4, 0), V((rnd() - 0.5) * 0.8, H, (rnd() - 0.5) * 0.8), 0.45, 0.12, 0.06, 7, 6, rnd), "#ffffff"));
      const whorls = 6 + Math.floor(rnd() * 3);
      for (let w = 0; w < whorls; w += 1) {
        const t = 0.42 + (w / whorls) * 0.58, y = H * t, rr = (1 - t) * 4.2 + 1.0;
        for (let k = 0; k < 3; k += 1) {
          const a = rnd() * Math.PI * 2;
          const tip = V(Math.cos(a) * rr, y + 0.6, Math.sin(a) * rr);
          tg.push(tint(limb(V(0, y, 0), tip, 0.12, 0.04, 0.2, 4, 2, rnd), "#ffffff"));
          lg.push(cardCluster({ n: fx.LOW ? 3 : 6, rx: 1.4, ry: 0.6, rz: 1.4, size: 1.6, cx: tip.x, cy: tip.y + 0.2, cz: tip.z, rnd, droop: 0.6 }));
        }
      }
      out.push({ trunk: mergeGeometries(tg), leaves: mergeGeometries(lg), h: H });
      tg.forEach((g) => g.dispose()); lg.forEach((g) => g.dispose());
    }
  } else if (kind === "oldtea") {
    /* ancient tea trees: several twisting mossy stems, sparse crowns */
    bark = barkPbr({ color: "#8c8270", color2: "#6c6656", color3: "#3a3428", moss: true });
    leaf = fx.leafMaterial(fx.leafTexture("tea", { colors: ["#2d4f22", "#3a6128", "#4b7330", "#263f1c"], seed: seed + 7 }), { wind: 0.004 });
    for (let v = 0; v < variants; v += 1) {
      const tg = [], lg = [];
      const stems = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < stems; k += 1) {
        const a = rnd() * Math.PI * 2, lean = 0.6 + rnd() * 1.6, H = 4 + rnd() * 3.5;
        const tip = V(Math.cos(a) * lean * 1.4, H, Math.sin(a) * lean * 1.4);
        tg.push(tint(limb(V(Math.cos(a) * 0.15, -0.2, Math.sin(a) * 0.15), tip, 0.2, 0.07, 0.5, 6, 6, rnd), "#ffffff"));
        for (let j = 0; j < 2; j += 1) {
          const t2 = V(tip.x + (rnd() - 0.5) * 2.4, tip.y + rnd() * 1.2, tip.z + (rnd() - 0.5) * 2.4);
          tg.push(tint(limb(tip.clone().multiplyScalar(0.7), t2, 0.08, 0.03, 0.4, 4, 3, rnd), "#ffffff"));
          lg.push(cardCluster({ n: fx.LOW ? 4 : 8, rx: 1.2, ry: 0.7, rz: 1.2, size: 1.1, cx: t2.x, cy: t2.y, cz: t2.z, rnd }));
        }
      }
      out.push({ trunk: mergeGeometries(tg), leaves: mergeGeometries(lg), h: 7 });
      tg.forEach((g) => g.dispose()); lg.forEach((g) => g.dispose());
    }
  } else if (kind === "bamboo") {
    bark = fx.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
    fx.wind(bark, 0.0018, 0.8);
    leaf = fx.leafMaterial(fx.leafTexture("bamboo", { colors: ["#4f7a2c", "#5f8a34", "#6f993c", "#3d6424"], seed: seed + 9 }), { wind: 0.0018, freq: 0.8 });
    for (let v = 0; v < variants; v += 1) {
      const tg = [], lg = [];
      const culms = 14 + Math.floor(rnd() * 10);
      for (let k = 0; k < culms; k += 1) {
        const a = rnd() * Math.PI * 2, r0 = rnd() * 1.0, H = 8 + rnd() * 6, lean = 0.6 + rnd() * 2.2;
        const tip = V(Math.cos(a) * (r0 + lean), H, Math.sin(a) * (r0 + lean));
        tg.push(tint(limb(V(Math.cos(a) * r0, -0.2, Math.sin(a) * r0), tip, 0.09, 0.04, 0.12, 5, 5, rnd), rnd() < 0.5 ? "#6f8f3a" : "#86994a", "#4f6a2a", 0, H));
        for (let j = 0; j < 4; j += 1) {
          const t = 0.45 + j * 0.15, p = V(Math.cos(a) * (r0 + lean * t * t), H * t, Math.sin(a) * (r0 + lean * t * t));
          lg.push(cardCluster({ n: fx.LOW ? 2 : 3, rx: 1.0, ry: 0.5, rz: 1.0, size: 1.5, cx: p.x, cy: p.y, cz: p.z, rnd, droop: 0.5 }));
        }
      }
      out.push({ trunk: mergeGeometries(tg), leaves: mergeGeometries(lg), h: 12 });
      tg.forEach((g) => g.dispose()); lg.forEach((g) => g.dispose());
    }
  } else if (kind === "banana" || kind === "palm" || kind === "fanpalm") {
    bark = kind === "banana"
      ? fx.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }))
      : barkPbr({ color: "#8f8576", color2: "#6f6658", color3: "#4a443a", repeat: [1, 6] });
    const tex = kind === "banana" ? fx.leafTexture("banana", { colors: ["#4b7a2a", "#5d8c32", "#6b9a38", "#3d6422"], seed: seed + 11 })
      : kind === "fanpalm" ? fx.leafTexture("broad", { colors: ["#4a7230", "#5a823a", "#3d6428", "#6b8f42"], n: 50, len: 0.36, wid: 0.03, seed: seed + 13 })
        : fx.leafTexture("palm", { colors: ["#3e6a2a", "#4d7a30", "#5c8a38", "#35591f"], seed: seed + 13 });
    leaf = fx.leafMaterial(tex, { wind: kind === "banana" ? 0.02 : 0.0035, freq: 0.9 });
    for (let v = 0; v < variants; v += 1) {
      const tg = [], lg = [];
      const H = kind === "banana" ? 2.2 + rnd() * 1.2 : kind === "fanpalm" ? 9 + rnd() * 4 : 9 + rnd() * 6;
      const lean = kind === "palm" ? 0.8 + rnd() * 1.6 : 0.2;
      const la = rnd() * Math.PI * 2;
      const top = V(Math.cos(la) * lean, H, Math.sin(la) * lean);
      tg.push(tint(limb(V(0, -0.3, 0), top, kind === "banana" ? 0.2 : 0.26, kind === "banana" ? 0.13 : 0.2, kind === "palm" ? 0.35 : 0.05, 7, 6, rnd), kind === "banana" ? "#7d8f45" : "#ffffff", kind === "banana" ? "#5a6a30" : null, 0, H));
      const n = kind === "banana" ? 8 : kind === "fanpalm" ? 14 : 13;
      for (let k = 0; k < n; k += 1) {
        const a = (k / n) * Math.PI * 2 + rnd() * 0.4;
        const L = kind === "banana" ? 2.6 + rnd() * 0.8 : kind === "fanpalm" ? 3.2 : 4.2 + rnd() * 1.2;
        const g = new THREE.PlaneGeometry(kind === "banana" ? 1.1 : kind === "fanpalm" ? 3.2 : 1.7, L, 1, 6);
        g.translate(0, L / 2, 0);
        /* arch the leaf: rotate down progressively along its length */
        const p = g.attributes.position;
        const droop = kind === "fanpalm" ? 0.5 : 1.1 + rnd() * 0.4;
        for (let i = 0; i < p.count; i += 1) {
          const y = p.getY(i), t = y / L, ang = 0.35 + t * droop;
          p.setXYZ(i, p.getX(i), Math.cos(ang) * y * 0.85, Math.sin(ang) * y);
        }
        g.computeVertexNormals();
        g.rotateY(a);
        g.translate(top.x, top.y - 0.1, top.z);
        lg.push(g);
      }
      if (kind === "palm") for (let k = 0; k < 5; k += 1) {
        const c = new THREE.SphereGeometry(0.16, 6, 5);
        c.translate(top.x + Math.cos(k * 1.3) * 0.3, top.y - 0.35, top.z + Math.sin(k * 1.3) * 0.3);
        tg.push(tint(c, "#6e6a2a"));
      }
      out.push({ trunk: mergeGeometries(tg), leaves: mergeGeometries(lg), h: H });
      tg.forEach((g) => g.dispose()); lg.forEach((g) => g.dispose());
    }
  } else if (kind === "fern" || kind === "shrub") {
    bark = fx.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
    leaf = fx.leafMaterial(kind === "fern" ? fx.leafTexture("fern", { colors: ["#3e6a2a", "#4f7a32", "#2f5622", "#5a8838"], seed: seed + 17 }) : fx.leafTexture("broad", { n: 40, len: 0.12, wid: 0.04, colors: ["#3a5f28", "#4b6f30", "#2e4d20", "#5d7f3a"], seed: seed + 19 }), { wind: 0.05 });
    for (let v = 0; v < variants; v += 1) {
      const lg = [];
      const n = kind === "fern" ? 3 : 5;
      for (let k = 0; k < n; k += 1) {
        const g = new THREE.PlaneGeometry(kind === "fern" ? 1.8 : 1.6, kind === "fern" ? 1.3 : 1.4);
        g.translate(0, kind === "fern" ? 0.6 : 0.7, 0);
        g.rotateY((k / n) * Math.PI + rnd() * 0.3);
        if (kind === "shrub") g.translate((rnd() - 0.5) * 0.6, rnd() * 0.3, (rnd() - 0.5) * 0.6);
        lg.push(g);
      }
      const t = new THREE.CylinderGeometry(0.03, 0.04, 0.3, 4);
      t.translate(0, 0.1, 0);
      out.push({ trunk: tint(t, "#4a3a28"), leaves: mergeGeometries(lg), h: 1.2 });
      lg.forEach((g) => g.dispose());
    }
  }
  return { variants: out, bark, leaf, kind };
}

/* Place a species: list of { x, y, z, s, ry, v } -> instanced meshes per variant. */
export function plant(fx, sp, list, { shadow = true } = {}) {
  const meshes = [];
  sp.variants.forEach((variant, vi) => {
    const sub = list.filter((p) => (p.v ?? 0) % sp.variants.length === vi);
    if (!sub.length) return;
    meshes.push(fx.instances(variant.trunk, sp.bark, sub, { shadow }));
    meshes.push(fx.instances(variant.leaves, sp.leaf, sub, { shadow }));
  });
  return meshes;
}

/**
 * Ganlan stilt house (Dai bamboo house 竹楼 / Bulang house): posts, a raised
 * floor, an open veranda, walls, a steep xieshan roof and an outside stair.
 * mats: { post, floor, wall, roof, trim, gable, dark, orn? }
 * Returns { group, foot: [w, d] } in local space; the caller places it and adds a collider.
 */
export function stiltHouse(fx, mats, { w = 8, d = 6.5, postH = 2.1, wallH = 2.3, roofH = 4.6, roofType = "xieshan", veranda = 2.2, ornament = null, stairSide = 1, upturn = 0.35, oh = 1.4 } = {}) {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, ry = 0) => {
    fx.geo(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const totalD = d + veranda;
  const fz = -veranda / 2;
  /* posts on stone footings */
  for (let i = 0; i <= 4; i += 1) for (let j = 0; j <= 3; j += 1) {
    const x = -w / 2 + (i / 4) * w, z = -totalD / 2 + (j / 3) * totalD;
    add(cylUV(0.13, 0.15, postH + 0.1, 7, 0.6), mats.post, x, postH / 2, z);
    add(new THREE.CylinderGeometry(0.22, 0.26, 0.22, 7), mats.dark, x, 0.08, z);
  }
  /* floor deck and beams */
  add(boxUV(w + 0.3, 0.22, totalD + 0.3, 1.2), mats.floor, 0, postH + 0.11, 0);
  add(boxUV(w + 0.4, 0.16, 0.2, 1), mats.dark, 0, postH - 0.08, totalD / 2 + 0.1);
  add(boxUV(w + 0.4, 0.16, 0.2, 1), mats.dark, 0, postH - 0.08, -totalD / 2 - 0.1);
  /* walls of the enclosed room (back part), front veranda open with a rail */
  const wy = postH + 0.22 + wallH / 2, rz = totalD / 2 - d / 2 - 0.0;
  const roomZ = -totalD / 2 + d / 2;
  add(boxUV(w, wallH, 0.12, 1.2), mats.wall, 0, wy, roomZ - d / 2 + 0.06);
  add(boxUV(0.12, wallH, d, 1.2), mats.wall, -w / 2 + 0.06, wy, roomZ);
  add(boxUV(0.12, wallH, d, 1.2), mats.wall, w / 2 - 0.06, wy, roomZ);
  /* front wall with a door gap */
  const doorW = 1.2;
  add(boxUV((w - doorW) / 2, wallH, 0.12, 1.2), mats.wall, -(w + doorW) / 4, wy, roomZ + d / 2 - 0.06);
  add(boxUV((w - doorW) / 2, wallH, 0.12, 1.2), mats.wall, (w + doorW) / 4, wy, roomZ + d / 2 - 0.06);
  add(boxUV(doorW, 0.5, 0.12, 1.2), mats.wall, 0, postH + 0.22 + wallH - 0.25, roomZ + d / 2 - 0.06);
  add(new THREE.BoxGeometry(doorW - 0.1, wallH - 0.55, 0.05), mats.dark, 0, postH + 0.22 + (wallH - 0.55) / 2, roomZ + d / 2 - 0.1);
  /* windows */
  if (mats.window) [-w / 2 + 1.2, w / 2 - 1.2].forEach((x) => add(new THREE.PlaneGeometry(0.9, 0.7), mats.window, x, wy + 0.2, roomZ + d / 2 + 0.01));
  /* veranda rail */
  const vz = totalD / 2;
  add(boxUV(w, 0.08, 0.08, 1), mats.dark, 0, postH + 1.0, vz);
  for (let i = 0; i <= 10; i += 1) add(new THREE.BoxGeometry(0.06, 0.8, 0.06), mats.post, -w / 2 + (i / 10) * w, postH + 0.6, vz);
  /* roof */
  const R = roofGeometry({ w: w + 0.2, d: totalD + 0.2, h: roofH, oh, type: roofType, curve: 1.15, upturn, tile: 1.1, skirt: 0.5, top: 0.85 });
  const ry0 = postH + 0.22 + wallH;
  add(R.roof, mats.roof, 0, ry0, 0).material.side = THREE.DoubleSide;
  if (R.trim) add(R.trim, mats.trim, 0, ry0, 0);
  if (R.gableWall) add(R.gableWall, mats.gable || mats.wall, 0, ry0, 0).material.side = THREE.DoubleSide;
  /* ridge ornaments: Jingmai "one bud, two leaves" or Dai finials */
  if (ornament) {
    const Wr = (w + 0.2) / 2 + oh, gw = Wr * (1 - 0.5 * ((totalD / 2 + oh) / Wr)) * 0.85;
    [-1, 1].forEach((sx) => {
      const x = sx * (gw + 0.1), y = ry0 + roofH + 0.05;
      if (ornament === "bud") {
        add(new THREE.ConeGeometry(0.12, 0.7, 6), mats.orn || mats.trim, x, y + 0.35, 0);
        const l1 = new THREE.SphereGeometry(0.28, 8, 6); l1.scale(1, 0.35, 0.55);
        add(l1, mats.orn || mats.trim, x + 0.22 * sx, y + 0.28, 0.05).rotation.z = sx * 0.6;
        const l2 = new THREE.SphereGeometry(0.28, 8, 6); l2.scale(1, 0.35, 0.55);
        add(l2, mats.orn || mats.trim, x - 0.22 * sx, y + 0.22, -0.05).rotation.z = -sx * 0.6;
      } else {
        add(new THREE.ConeGeometry(0.1, 0.9, 6), mats.orn || mats.trim, x, y + 0.45, 0);
      }
    });
  }
  /* outside stair to the veranda */
  const stairX = stairSide * (w / 2 + 0.55), steps = 7;
  for (let i = 0; i < steps; i += 1) {
    add(new THREE.BoxGeometry(0.95, 0.08, 0.36), mats.floor, stairX, (postH / steps) * (i + 1), totalD / 2 - 0.2 - (steps - 1 - i) * 0.34);
  }
  add(new THREE.BoxGeometry(0.08, 0.08, steps * 0.4), mats.dark, stairX + 0.45, postH * 0.55, totalD / 2 - 0.2 - (steps * 0.34) / 2).rotation.x = Math.atan2(postH, steps * 0.34);
  return { group: g, foot: [w + 0.6, totalD + 0.6], stairX, roofTop: ry0 + roofH };
}
