import * as THREE from "three";

/* Blocky toy-style characters for the Kathmandu Valley world.
   Every figure is built from boxes with vertex colours, so one material
   serves the whole crowd and each design becomes a handful of instanced meshes. */

const HIP_Y = 0.76;
const SHOULDER_Y = 1.33;
const SHOULDER_X = 0.36;
const LEG_X = 0.14;

const C = (hex) => new THREE.Color(hex);

function geoFromBoxes(boxes) {
  const position = [];
  const normal = [];
  const color = [];
  boxes.forEach((b) => {
    const [w, h, d, x, y, z, hex, rx = 0, ry = 0, rz = 0] = b;
    let g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    if (rx) g.rotateX(rx);
    if (ry) g.rotateY(ry);
    if (rz) g.rotateZ(rz);
    g.translate(x, y, z);
    const c = C(hex);
    position.push(...g.attributes.position.array);
    normal.push(...g.attributes.normal.array);
    for (let i = 0; i < g.attributes.position.count; i += 1) color.push(c.r, c.g, c.b);
    g.dispose();
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(color, 3));
  geo.computeBoundingSphere();
  return geo;
}

/* A design describes clothes and accessories; buildDesign turns it into boxes. */
export const DESIGNS = [
  {
    id: "monk",
    label: "Buddhist monk",
    skin: "#9b6a4a", shirt: "#7a1f1c", sleeve: "#7a1f1c", sleeveR: "#9b6a4a", pants: "#7a1f1c", shoes: "#3b2a20",
    hair: "bald", robe: "#7a1f1c", robeTo: 0.12,
    extras: [[0.6, 0.12, 0.33, 0, 1.2, 0, "#c9842b", 0, 0, 0.75], [0.6, 0.12, 0.33, 0, 0.95, 0, "#c9842b", 0, 0, 0.75]],
  },
  {
    id: "sadhu",
    label: "Sadhu",
    skin: "#8a5a3c", shirt: "#d8691e", sleeve: "#d8691e", pants: "#d8691e", shoes: "#5a3a22",
    hair: "bun", hairColor: "#3a2c22", beard: "#e6e1d6", tilak: "#c8241e", robe: "#e07a24", robeTo: 0.1,
    extras: [[0.06, 0.6, 0.06, 0.18, 1.12, 0.16, "#5b2b16", 0.2, 0, 0.9]],
  },
  {
    id: "newar-woman",
    label: "Newar woman in haku patasi",
    skin: "#a8734f", shirt: "#1d1a1a", sleeve: "#1d1a1a", pants: "#1d1a1a", shoes: "#6b1d1a",
    hair: "bun", hairColor: "#141010", robe: "#1d1a1a", robeTo: 0.1, robeHem: "#b4261d",
    extras: [[0.56, 0.08, 0.32, 0, 1.0, 0, "#b4261d"], [0.4, 0.1, 0.05, 0.06, 1.25, 0.17, "#e8d9b8", 0, 0, -0.5]],
  },
  {
    id: "daura-man",
    label: "Man in daura-suruwal and dhaka topi",
    skin: "#9a6849", shirt: "#e9e2cf", sleeve: "#e9e2cf", pants: "#e9e2cf", shoes: "#2a2320",
    hair: "short", hairColor: "#1b1512", hat: "topi", mustache: "#1b1512",
    extras: [[0.56, 0.58, 0.04, 0, 1.06, 0.165, "#33363b"], [0.08, 0.58, 0.05, 0, 1.06, 0.19, "#e9e2cf"]],
  },
  {
    id: "trekker",
    label: "Trekker",
    skin: "#e2b391", shirt: "#2f6fd0", sleeve: "#2f6fd0", pants: "#4a4f57", shoes: "#6b4a2b",
    hair: "short", hairColor: "#8a5a2a", hat: "cap", hatColor: "#c63a2b", glasses: true,
    extras: [[0.46, 0.6, 0.24, 0, 1.1, -0.28, "#e07b22"], [0.4, 0.14, 0.2, 0, 1.46, -0.28, "#a85a17"]],
  },
  {
    id: "schoolgirl",
    label: "School student",
    skin: "#b07a55", shirt: "#cfe3f5", sleeve: "#cfe3f5", pants: "#b07a55", shoes: "#1c1c22",
    hair: "braids", hairColor: "#151112", robe: "#1f2e5a", robeTo: 0.42,
    extras: [[0.08, 0.3, 0.04, 0, 1.2, 0.17, "#b3241d"], [0.4, 0.5, 0.18, 0, 1.08, -0.24, "#2a5c3a"]],
  },
  {
    id: "momo-vendor",
    label: "Momo cook",
    skin: "#9e6c4c", shirt: "#b8332a", sleeve: "#b8332a", pants: "#2d3440", shoes: "#2a2320",
    hair: "short", hairColor: "#191311", hat: "chef",
    extras: [[0.5, 0.8, 0.04, 0, 0.9, 0.165, "#f4f0e6"], [0.5, 0.06, 0.05, 0, 1.3, 0.17, "#f4f0e6"]],
  },
  {
    id: "porter",
    label: "Porter with a doko basket",
    skin: "#8a5a3c", shirt: "#5d6b46", sleeve: "#5d6b46", pants: "#3e3a33", shoes: "#3a2a1c",
    hair: "short", hairColor: "#1a1410", hat: "topi",
    extras: [
      [0.62, 0.78, 0.52, 0, 1.3, -0.46, "#a07a44"],
      [0.66, 0.06, 0.56, 0, 1.0, -0.46, "#7a5a30"],
      [0.66, 0.06, 0.56, 0, 1.3, -0.46, "#7a5a30"],
      [0.66, 0.06, 0.56, 0, 1.6, -0.46, "#7a5a30"],
      [0.44, 0.06, 0.06, 0, 1.86, 0.04, "#7a5a30"],
      [0.5, 0.36, 0.42, 0, 1.86, -0.46, "#d9b36a"],
    ],
  },
  {
    id: "tibetan-woman",
    label: "Tibetan woman in a chuba",
    skin: "#b47f5a", shirt: "#4a2e22", sleeve: "#e6dccb", pants: "#4a2e22", shoes: "#2a1f18",
    hair: "braids", hairColor: "#141010", robe: "#4a2e22", robeTo: 0.1,
    extras: [
      [0.4, 0.09, 0.04, 0, 0.92, 0.165, "#c8382a"],
      [0.4, 0.09, 0.04, 0, 0.83, 0.165, "#2e8e4a"],
      [0.4, 0.09, 0.04, 0, 0.74, 0.165, "#e8b82a"],
      [0.4, 0.09, 0.04, 0, 0.65, 0.165, "#2f62c8"],
      [0.4, 0.09, 0.04, 0, 0.56, 0.165, "#c8382a"],
      [0.4, 0.09, 0.04, 0, 0.47, 0.165, "#f4f1ea"],
      [0.12, 0.08, 0.05, 0, 1.3, 0.17, "#2bb3a8"],
    ],
  },
  {
    id: "elder",
    label: "Elder with a walking stick",
    skin: "#9a6a4a", shirt: "#8e8a80", sleeve: "#8e8a80", pants: "#e3ddd0", shoes: "#3a2a20",
    hair: "short", hairColor: "#d8d4cc", hat: "topi", hatColor: "#ece6d8", mustache: "#e9e5dc",
    extras: [[0.62, 0.22, 0.36, 0, 1.28, 0, "#6f6a60"]],
    stick: true,
  },
];

export const PLAYER_DESIGN = {
  id: "player",
  label: "You",
  skin: "#c88d64", shirt: "#d0412b", sleeve: "#d0412b", pants: "#2c3a4c", shoes: "#202022",
  hair: "short", hairColor: "#2a1c14", hat: "beanie", hatColor: "#e6b23a",
  extras: [[0.46, 0.58, 0.24, 0, 1.08, -0.28, "#3f6a46"], [0.5, 0.08, 0.26, 0, 1.38, -0.28, "#2f5236"]],
};

function buildDesign(d) {
  const body = [];
  const legs = [];
  const arm = [];
  const armR = [];
  // torso and neck
  body.push([0.54, 0.6, 0.3, 0, HIP_Y + 0.3, 0, d.shirt]);
  body.push([0.56, 0.08, 0.32, 0, HIP_Y + 0.03, 0, d.pants]);
  body.push([0.16, 0.08, 0.16, 0, HIP_Y + 0.64, 0, d.skin]);
  if (d.robe) {
    const top = HIP_Y + 0.05;
    const bottom = d.robeTo ?? 0.15;
    body.push([0.62, top - bottom, 0.36, 0, (top + bottom) / 2, 0, d.robe]);
    if (d.robeHem) body.push([0.64, 0.08, 0.38, 0, bottom + 0.04, 0, d.robeHem]);
  }
  // head
  const hy = HIP_Y + 0.88;
  body.push([0.42, 0.42, 0.42, 0, hy, 0, d.skin]);
  // face: eyes, brows, mouth
  const fz = 0.212;
  if (d.glasses) {
    body.push([0.34, 0.08, 0.02, 0, hy + 0.05, fz, "#151515"]);
  } else {
    body.push([0.06, 0.07, 0.02, -0.09, hy + 0.05, fz, "#1a1414"]);
    body.push([0.06, 0.07, 0.02, 0.09, hy + 0.05, fz, "#1a1414"]);
    body.push([0.02, 0.02, 0.022, -0.075, hy + 0.07, fz + 0.001, "#ffffff"]);
    body.push([0.02, 0.02, 0.022, 0.105, hy + 0.07, fz + 0.001, "#ffffff"]);
  }
  body.push([0.14, 0.035, 0.02, 0, hy - 0.09, fz, "#6b2a22"]);
  body.push([0.05, 0.03, 0.02, -0.08, hy - 0.075, fz, "#6b2a22"]);
  body.push([0.05, 0.03, 0.02, 0.08, hy - 0.075, fz, "#6b2a22"]);
  if (d.tilak) body.push([0.04, 0.09, 0.02, 0, hy + 0.13, fz, d.tilak]);
  if (d.mustache) body.push([0.2, 0.04, 0.03, 0, hy - 0.04, fz + 0.005, d.mustache]);
  if (d.beard) body.push([0.36, 0.3, 0.08, 0, hy - 0.2, 0.18, d.beard]);
  // hair
  const hc = d.hairColor || "#1a1410";
  if (d.hair === "short" || d.hair === "braids" || d.hair === "bun") {
    body.push([0.44, 0.1, 0.44, 0, hy + 0.2, 0, hc]);
    body.push([0.44, 0.3, 0.06, 0, hy + 0.08, -0.2, hc]);
    body.push([0.05, 0.22, 0.4, -0.2, hy + 0.1, -0.02, hc]);
    body.push([0.05, 0.22, 0.4, 0.2, hy + 0.1, -0.02, hc]);
  }
  if (d.hair === "bun") body.push([0.2, 0.16, 0.2, 0, hy + 0.3, -0.08, hc]);
  if (d.hair === "braids") {
    body.push([0.08, 0.42, 0.08, -0.17, hy - 0.22, -0.12, hc]);
    body.push([0.08, 0.42, 0.08, 0.17, hy - 0.22, -0.12, hc]);
  }
  // hats
  if (d.hat === "topi") {
    const c = d.hatColor;
    const stripes = c ? [c, c, c] : ["#b3241d", "#1f1b18", "#e8b82a"];
    body.push([0.44, 0.08, 0.44, 0, hy + 0.25, 0, stripes[0]]);
    body.push([0.42, 0.08, 0.42, 0, hy + 0.33, -0.02, stripes[1]]);
    body.push([0.38, 0.06, 0.38, 0, hy + 0.4, -0.04, stripes[2]]);
  } else if (d.hat === "cap") {
    body.push([0.46, 0.14, 0.46, 0, hy + 0.27, 0, d.hatColor]);
    body.push([0.36, 0.04, 0.2, 0, hy + 0.21, 0.3, d.hatColor]);
  } else if (d.hat === "beanie") {
    body.push([0.46, 0.18, 0.46, 0, hy + 0.27, 0, d.hatColor]);
    body.push([0.14, 0.1, 0.14, 0, hy + 0.41, 0, "#f6efe0"]);
  } else if (d.hat === "chef") {
    body.push([0.44, 0.24, 0.44, 0, hy + 0.32, 0, "#f6f3ec"]);
  }
  (d.extras || []).forEach((e) => body.push(e));
  // legs: pivot at the hip, hanging down
  legs.push([0.22, 0.66, 0.26, 0, -0.33, 0, d.pants]);
  legs.push([0.23, 0.1, 0.32, 0, -0.71, 0.03, d.shoes]);
  // arms: pivot at the shoulder
  arm.push([0.17, 0.5, 0.2, 0, -0.25, 0, d.sleeve]);
  arm.push([0.15, 0.13, 0.17, 0, -0.56, 0, d.skin]);
  armR.push([0.17, 0.5, 0.2, 0, -0.25, 0, d.sleeveR || d.sleeve]);
  armR.push([0.15, 0.13, 0.17, 0, -0.56, 0, d.skin]);
  if (d.stick) armR.push([0.06, 1.3, 0.06, 0, -0.68, 0.12, "#5b3a20"]);
  return {
    body: geoFromBoxes(body),
    leg: geoFromBoxes(legs),
    armL: geoFromBoxes(arm),
    armR: geoFromBoxes(armR),
  };
}

/* One animated figure built from ordinary meshes (used for the player). */
export function makeFigure(design, material) {
  const g = buildDesign(design);
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  const body = new THREE.Mesh(g.body, material);
  const legL = new THREE.Mesh(g.leg, material);
  const legR = new THREE.Mesh(g.leg, material);
  const armL = new THREE.Mesh(g.armL, material);
  const armR = new THREE.Mesh(g.armR, material);
  legL.position.set(-LEG_X, HIP_Y, 0);
  legR.position.set(LEG_X, HIP_Y, 0);
  armL.position.set(-SHOULDER_X, SHOULDER_Y, 0);
  armR.position.set(SHOULDER_X, SHOULDER_Y, 0);
  [body, legL, legR, armL, armR].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    inner.add(m);
  });
  return {
    root,
    inner,
    geometries: [g.body, g.leg, g.armL, g.armR],
    pose(swing) {
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.8;
      armR.rotation.x = swing * 0.8;
    },
  };
}

/* A crowd: each design becomes five instanced meshes (body, two legs, two arms). */
export function makeCrowd(material, people) {
  const byDesign = new Map();
  people.forEach((p) => {
    if (!byDesign.has(p.design)) byDesign.set(p.design, []);
    byDesign.get(p.design).push(p);
  });
  const meshes = [];
  const groups = [];
  const geometries = [];
  byDesign.forEach((list, designIndex) => {
    const g = buildDesign(DESIGNS[designIndex]);
    geometries.push(g.body, g.leg, g.armL, g.armR);
    const make = (geo) => {
      const m = new THREE.InstancedMesh(geo, material, list.length);
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      meshes.push(m);
      return m;
    };
    groups.push({ list, body: make(g.body), legL: make(g.leg), legR: make(g.leg), armL: make(g.armL), armR: make(g.armR) });
  });
  const base = new THREE.Matrix4();
  const part = new THREE.Matrix4();
  const rot = new THREE.Matrix4();
  const out = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const place = (mesh, i, px, py, pz, angle) => {
    part.makeTranslation(px, py, pz);
    rot.makeRotationX(angle);
    out.copy(base).multiply(part).multiply(rot);
    mesh.setMatrixAt(i, out);
  };
  return {
    meshes,
    geometries,
    update() {
      groups.forEach((grp) => {
        grp.list.forEach((p, i) => {
          pos.set(p.x, p.y + (p.bob || 0), p.z);
          q.setFromAxisAngle(up, p.yaw);
          base.compose(pos, q, one);
          grp.body.setMatrixAt(i, base);
          const s = p.swing || 0;
          place(grp.legL, i, -LEG_X, HIP_Y, 0, s);
          place(grp.legR, i, LEG_X, HIP_Y, 0, -s);
          place(grp.armL, i, -SHOULDER_X, SHOULDER_Y, 0, -s * 0.8 + (p.wave || 0));
          place(grp.armR, i, SHOULDER_X, SHOULDER_Y, 0, s * 0.8);
        });
        ["body", "legL", "legR", "armL", "armR"].forEach((k) => {
          grp[k].instanceMatrix.needsUpdate = true;
        });
      });
    },
  };
}
