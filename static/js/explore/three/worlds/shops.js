import * as THREE from "three";
import { mergeGeometries, tint } from "./yunnan-fx.js";

/* Small market stalls with goods on the counter, like the shawl stall in Hunza.
   buildShop(stage, { goods, cloth, sign }) -> THREE.Group (local origin at the counter front).
   goods: "paintings" | "raisins" | "bowls" | "gems" | "tea" */

const _o = new THREE.Object3D();
function bx(w, h, d, x, y, z, c, ry = 0, rx = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry || rx) { _o.rotation.set(rx, ry, 0); _o.position.set(0, 0, 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); g.applyMatrix4(_o.matrix); }
  g.translate(x, y, z);
  return tint(g, c);
}
function cyl(rt, rb, h, seg, x, y, z, c) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return tint(g, c);
}
function signTex(text, bg = "#2a1a10", fg = "#f2c76b") {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = bg; x.fillRect(0, 0, 512, 128);
  x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(8, 8, 496, 112);
  x.fillStyle = fg; x.font = "bold 50px 'Noto Serif SC','Songti SC',Georgia,serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildShop(stage, { goods = "raisins", cloth = "#b3261e", cloth2 = "#e0b347", sign = "" } = {}) {
  const g = new THREE.Group();
  const P = [];
  const wood = "#6a4a30", dark = "#3a2818";
  /* counter, back shelf, posts and a striped awning */
  P.push(bx(3.6, 1.0, 1.1, 0, 0.5, 0, wood), bx(3.8, 0.08, 1.3, 0, 1.04, 0, dark));
  P.push(bx(3.6, 1.9, 0.5, 0, 0.95, -1.6, wood), bx(3.6, 0.06, 0.5, 0, 1.2, -1.6, dark), bx(3.6, 0.06, 0.5, 0, 1.7, -1.6, dark));
  for (const [x, z] of [[-1.85, 0.5], [1.85, 0.5], [-1.85, -1.85], [1.85, -1.85]]) P.push(bx(0.12, 2.7, 0.12, x, 1.35, z, dark));
  for (let k = 0; k < 6; k += 1) P.push(bx(0.66, 0.06, 2.9, -1.65 + k * 0.66, 2.78 - 0.0, -0.65, k % 2 ? cloth : cloth2, 0, -0.12));
  P.push(bx(4.0, 0.3, 0.05, 0, 2.6, 0.75, cloth));
  /* goods */
  const G = [];
  if (goods === "raisins") {
    const cols = ["#7a9a3a", "#a83a2a", "#3a2420", "#c88a3a", "#8a5a2a", "#d8c890"];
    cols.forEach((c, i) => {
      const x = -1.4 + (i % 3) * 1.4, z = i < 3 ? 0.2 : -0.25;
      G.push(cyl(0.48, 0.4, 0.22, 12, x, 1.18, z, "#c8a878"));
      const heap = new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); heap.scale(1, 0.6, 1); heap.translate(x, 1.28, z);
      G.push(tint(heap, c));
    });
    for (let k = 0; k < 5; k += 1) G.push(bx(0.4, 0.3, 0.3, -1.4 + k * 0.7, 1.37, -1.6, ["#c8a878", "#a87a4a"][k % 2]));
  } else if (goods === "bowls") {
    for (let k = 0; k < 7; k += 1) {
      const r = 0.16 + (k % 3) * 0.06, x = -1.5 + k * 0.5, z = (k % 2) * 0.3 - 0.1;
      const b = new THREE.SphereGeometry(r, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); b.rotateX(Math.PI); b.translate(x, 1.08 + r, z);
      G.push(tint(b, ["#b8903a", "#9a7430", "#c8a048"][k % 3]));
      G.push(cyl(r * 0.9, r * 0.9, 0.02, 14, x, 1.09 + r, z, "#5a4420"));
    }
    for (let k = 0; k < 6; k += 1) { const b = new THREE.SphereGeometry(0.2, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); b.rotateX(Math.PI); b.translate(-1.4 + k * 0.56, 1.42, -1.6); G.push(tint(b, "#b8903a")); }
    /* prayer flags across the front */
    ["#2e6fb0", "#f4efe4", "#bd3e32", "#3d8a5f", "#d8a541"].forEach((c, k) => G.push(bx(0.45, 0.32, 0.02, -1.4 + k * 0.7, 2.2, 0.7, c)));
  } else if (goods === "gems") {
    G.push(bx(3.2, 0.25, 0.8, 0, 1.18, 0, "#2a3a4a"));
    G.push(bx(3.0, 0.02, 0.7, 0, 1.31, 0, "#e8eef2"));
    const cols = ["#6ac8d8", "#e8b84a", "#d84a6a", "#7a3a8a", "#4ab878", "#f0f0f0"];
    for (let k = 0; k < 18; k += 1) {
      const gg = new THREE.OctahedronGeometry(0.07 + (k % 3) * 0.03, 0); gg.scale(0.8, 1.4, 0.8);
      gg.translate(-1.3 + (k % 9) * 0.32, 1.42, k < 9 ? 0.15 : -0.15);
      G.push(tint(gg, cols[k % cols.length]));
    }
    for (let k = 0; k < 4; k += 1) { const gg = new THREE.OctahedronGeometry(0.22, 0); gg.scale(0.7, 1.6, 0.7); gg.translate(-1.2 + k * 0.8, 1.55, -1.6); G.push(tint(gg, cols[k])); }
  } else if (goods === "paintings") {
    for (let k = 0; k < 4; k += 1) G.push(bx(0.7, 0.5, 0.04, -1.2 + k * 0.8, 1.32, 0.1, "#e8d8b8", 0, -0.35));
    for (let k = 0; k < 3; k += 1) G.push(bx(0.9, 1.2, 0.05, -1.1 + k * 1.1, 1.65, -1.33, "#d8c8a0"));
  } else if (goods === "tea") {
    G.push(cyl(0.22, 0.22, 1.2, 12, -1.2, 1.68, -0.1, "#7a5232"), cyl(0.24, 0.24, 0.06, 12, -1.2, 1.1, -0.1, "#3a2818"));
    for (let k = 0; k < 4; k += 1) G.push(cyl(0.12, 0.1, 0.14, 10, -0.2 + k * 0.4, 1.15, 0.15, "#d8d0c4"));
    G.push(cyl(0.2, 0.24, 0.4, 12, 1.2, 1.28, 0, "#8a7a6a"), cyl(0.05, 0.05, 0.25, 6, 1.42, 1.38, 0, "#8a7a6a"));
    for (let k = 0; k < 5; k += 1) G.push(bx(0.5, 0.18, 0.35, -1.4 + k * 0.7, 1.32, -1.6, "#5a3a20"));
  }
  const all = P.concat(G);
  const geo = mergeGeometries(all);
  all.forEach((q) => q.dispose());
  stage.trackGeometry(geo);
  const mat = stage.material("#ffffff", { vertexColors: true, roughness: 0.85 });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  if (goods === "paintings") {
    /* little feitian figures painted on the scrolls */
    const c = document.createElement("canvas"); c.width = 256; c.height = 256; const x = c.getContext("2d");
    x.fillStyle = "#e6d6b2"; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = "#8a2a1a"; x.lineWidth = 10; x.beginPath(); x.moveTo(30, 180); x.bezierCurveTo(90, 90, 160, 200, 230, 70); x.stroke();
    x.strokeStyle = "#2a6a6a"; x.lineWidth = 7; x.beginPath(); x.moveTo(40, 200); x.bezierCurveTo(110, 120, 170, 230, 240, 110); x.stroke();
    x.fillStyle = "#c8742a"; x.beginPath(); x.arc(120, 120, 24, 0, 7); x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; stage.trackTexture(t);
    const pm = stage.material("#ffffff", { map: t, roughness: 0.8 });
    for (let k = 0; k < 3; k += 1) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.1), pm); stage.trackGeometry(p.geometry); p.position.set(-1.1 + k * 1.1, 1.65, -1.3); g.add(p); }
  }
  if (sign) {
    const t = signTex(sign); stage.trackTexture(t);
    const sm = stage.material("#ffffff", { map: t, roughness: 0.6 });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), sm); stage.trackGeometry(sg.geometry);
    sg.position.set(0, 2.35, 0.79);
    g.add(sg);
  }
  return g;
}

/** Build, place, make solid and register a shop as a discovery. */
export function placeShop({ W, kit, stage, hgt }, { x, z, ry = 0, goods, sign, id, label, cloth, cloth2, seller = null }) {
  const g = buildShop(stage, { goods, sign, cloth, cloth2 });
  g.position.set(x, hgt(x, z), z);
  g.rotation.y = ry;
  stage.add(g);
  kit.blockBoxIn(g, 0, -0.75, 4.0, 2.9);
  const fx = x + Math.sin(ry) * 2.6, fz = z + Math.cos(ry) * 2.6;
  W.interactive(id, g, label, [fx, fz], { radius: 12, labelOffset: 1.3 });
  if (seller && W.addNpc && W.D && W.D[seller] !== undefined) W.addNpc({ kind: "idle", x: x - Math.sin(ry) * 1.0, z: z - Math.cos(ry) * 1.0, yaw: ry, design: W.D[seller] });
  return g;
}
