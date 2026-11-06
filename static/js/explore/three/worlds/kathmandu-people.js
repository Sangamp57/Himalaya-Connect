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
  {
    id: "hunza-man",
    label: "Man in shalwar kameez and a Hunza wool cap",
    skin: "#c09070", shirt: "#d8d0bd", sleeve: "#d8d0bd", pants: "#d8d0bd", shoes: "#3a2a20",
    hair: "short", hairColor: "#2a1d15", hat: "pakol", beard: "#3a2a20", robe: "#d8d0bd", robeTo: 0.42,
    extras: [[0.56, 0.6, 0.04, 0, 1.06, 0.165, "#3a4048"], [0.08, 0.6, 0.05, 0, 1.06, 0.19, "#d8d0bd"]],
  },
  {
    id: "hunza-woman",
    label: "Woman with an embroidered cap and shawl",
    skin: "#c99a76", shirt: "#7d2a45", sleeve: "#7d2a45", pants: "#2e2c38", shoes: "#2a1f18",
    hair: "short", hairColor: "#2a1a12", hat: "pillbox", robe: "#7d2a45", robeTo: 0.36,
    extras: [[0.6, 0.86, 0.06, 0, 1.2, -0.2, "#efe8d8"], [0.5, 0.06, 0.05, 0, 1.0, 0.17, "#e2a93b"]],
  },
  {
    id: "tajik-woman",
    label: "Tajik woman with a kulta hat",
    skin: "#d2a684", shirt: "#b3241d", sleeve: "#b3241d", pants: "#b3241d", shoes: "#2a1f18",
    hair: "braids", hairColor: "#2a1a12", hat: "kulta", robe: "#b3241d", robeTo: 0.1,
    extras: [[0.6, 0.7, 0.05, 0, 1.38, -0.22, "#f4efe6"], [0.5, 0.08, 0.05, 0, 0.6, 0.19, "#e8b82a"]],
  },
  /* ---- Yunnan: Pu'er tea mountains and Xishuangbanna (appended so existing indices stay stable) ---- */
  {
    id: "tea-picker",
    label: "Tea picker with a bamboo back basket",
    skin: "#b5835c", shirt: "#3d5f8a", sleeve: "#3d5f8a", pants: "#2c3442", shoes: "#3a2c20",
    hair: "bun", hairColor: "#16110e", hat: "straw", robe: "#2c3442", robeTo: 0.2,
    extras: [
      [0.5, 0.42, 0.05, 0, 0.98, 0.17, "#d9cdb0"],
      [0.48, 0.5, 0.36, 0, 1.06, -0.36, "#b48d4e"],
      [0.52, 0.05, 0.4, 0, 1.31, -0.36, "#8c6a35"],
      [0.52, 0.05, 0.4, 0, 1.06, -0.36, "#8c6a35"],
      [0.42, 0.14, 0.3, 0, 1.36, -0.36, "#5f8d3e"],
      [0.06, 0.6, 0.04, -0.17, 1.2, -0.17, "#7a5a30", 0.35],
      [0.06, 0.6, 0.04, 0.17, 1.2, -0.17, "#7a5a30", 0.35],
    ],
  },
  {
    id: "tea-master",
    label: "Tea master in a long changshan robe",
    skin: "#b07c58", shirt: "#4b3a2c", sleeve: "#4b3a2c", pants: "#2a2420", shoes: "#1c1814",
    hair: "short", hairColor: "#6d6a66", robe: "#4b3a2c", robeTo: 0.16,
    extras: [
      [0.08, 0.58, 0.04, 0.13, 1.06, 0.165, "#d9c79a"],
      [0.14, 0.05, 0.03, 0.06, 1.28, 0.17, "#d9c79a"],
      [0.14, 0.05, 0.03, 0.06, 1.12, 0.17, "#d9c79a"],
      [0.14, 0.05, 0.03, 0.06, 0.96, 0.17, "#d9c79a"],
    ],
  },
  {
    id: "mule-driver",
    label: "Tea Horse Road mule driver (mabang)",
    skin: "#94603f", shirt: "#2d3a52", sleeve: "#2d3a52", pants: "#3a332a", shoes: "#2a1d14",
    hair: "short", hairColor: "#1b1410", hat: "brim", hatColor: "#4a3a28", mustache: "#1b1410",
    extras: [
      [0.6, 0.56, 0.36, 0, 1.06, 0, "#c9b48e"],
      [0.6, 0.06, 0.37, 0, 0.8, 0, "#6b4a2a"],
      [0.08, 0.9, 0.05, 0.14, 1.06, -0.19, "#6b4a2a", 0, 0, 0.6],
      [0.22, 0.2, 0.12, -0.24, 0.72, 0.14, "#7a5a36"],
    ],
    stick: true,
  },
  {
    id: "bulang-woman",
    label: "Bulang (Blang) woman with a tasselled head cloth",
    skin: "#a8724d", shirt: "#1e1c22", sleeve: "#1e1c22", pants: "#1e1c22", shoes: "#2a1f18",
    hair: "bun", hairColor: "#141010", hat: "wrap", hatColor: "#1e1c22", robe: "#22252c", robeTo: 0.08, robeHem: "#c8304e",
    extras: [
      [0.5, 0.05, 0.04, 0, 1.3, 0.165, "#d9dde2"],
      [0.5, 0.05, 0.04, 0, 1.22, 0.165, "#d9dde2"],
      [0.08, 0.08, 0.04, -0.12, 1.14, 0.17, "#d9dde2"],
      [0.08, 0.08, 0.04, 0.12, 1.14, 0.17, "#d9dde2"],
      [0.6, 0.06, 0.38, 0, 0.44, 0, "#e0a52e"],
      [0.6, 0.06, 0.38, 0, 0.34, 0, "#2f8f6a"],
    ],
  },
  {
    id: "dai-woman",
    label: "Dai woman in a fitted top and long tube skirt",
    skin: "#c08d66", shirt: "#e6a9b8", sleeve: "#e6a9b8", sleeveR: "#e6a9b8", pants: "#c08d66", shoes: "#c08d66",
    hair: "bun", hairColor: "#120d0b", hat: "flower", robe: "#2d6e74", robeTo: 0.04, robeHem: "#e0b041",
    extras: [
      [0.58, 0.07, 0.34, 0, 0.84, 0, "#d9dde2"],
      [0.64, 0.05, 0.38, 0, 0.5, 0, "#e0b041"],
      [0.64, 0.04, 0.38, 0, 0.3, 0, "#8a2f4a"],
    ],
  },
  {
    id: "dai-man",
    label: "Dai man in a collarless jacket and head wrap",
    skin: "#b07c56", shirt: "#ede6d6", sleeve: "#ede6d6", pants: "#2f3440", shoes: "#2a2320",
    hair: "short", hairColor: "#141010", hat: "turban", hatColor: "#e2a5b8",
    extras: [
      [0.08, 0.58, 0.04, 0, 1.06, 0.165, "#cfc6b1"],
      [0.06, 0.06, 0.03, 0, 1.24, 0.19, "#d6a73c"],
      [0.06, 0.06, 0.03, 0, 1.06, 0.19, "#d6a73c"],
      [0.6, 0.12, 0.34, 0, 0.82, 0, "#7a3b52"],
    ],
  },
  {
    id: "novice-monk",
    label: "Novice monk in a saffron robe",
    skin: "#b07a54", shirt: "#e07a1c", sleeve: "#e07a1c", sleeveR: "#b07a54", pants: "#e07a1c", shoes: "#8a5a3a",
    hair: "bald", robe: "#e07a1c", robeTo: 0.12,
    extras: [
      [0.62, 0.14, 0.35, 0, 1.18, 0, "#c9611a", 0, 0, 0.7],
      [0.62, 0.14, 0.35, 0, 0.92, 0, "#c9611a", 0, 0, 0.7],
      [0.3, 0.12, 0.26, 0.42, 0.88, 0.0, "#2b2420"],
    ],
  },
  {
    id: "peacock-dancer",
    label: "Peacock dancer",
    skin: "#c99a74", shirt: "#1f7f78", sleeve: "#2b8f5f", sleeveR: "#2b8f5f", pants: "#c99a74", shoes: "#c99a74",
    hair: "bun", hairColor: "#120d0b", hat: "crown", robe: "#1a6a6e", robeTo: 0.03, robeHem: "#d9b13c",
    extras: [
      [0.7, 0.06, 0.44, 0, 0.58, 0, "#d9b13c"],
      [0.6, 0.07, 0.34, 0, 1.24, 0, "#d9b13c"],
      [0.18, 1.1, 0.04, 0, 0.75, -0.3, "#1f6f62", -0.35, 0, 0],
      [0.18, 1.0, 0.04, -0.2, 0.78, -0.28, "#2b8f5f", -0.35, 0, 0.32],
      [0.18, 1.0, 0.04, 0.2, 0.78, -0.28, "#2b8f5f", -0.35, 0, -0.32],
      [0.16, 0.9, 0.04, -0.38, 0.84, -0.24, "#1f6f62", -0.3, 0, 0.62],
      [0.16, 0.9, 0.04, 0.38, 0.84, -0.24, "#1f6f62", -0.3, 0, -0.62],
      [0.1, 0.1, 0.03, 0, 1.18, -0.5, "#e6c64a"],
      [0.1, 0.1, 0.03, -0.32, 1.12, -0.46, "#e6c64a"],
      [0.1, 0.1, 0.03, 0.32, 1.12, -0.46, "#e6c64a"],
      [0.06, 0.06, 0.035, 0, 1.18, -0.52, "#1e3c8a"],
      [0.06, 0.06, 0.035, -0.32, 1.12, -0.48, "#1e3c8a"],
      [0.06, 0.06, 0.035, 0.32, 1.12, -0.48, "#1e3c8a"],
    ],
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
  } else if (d.hat === "pakol") {
    body.push([0.46, 0.08, 0.46, 0, hy + 0.24, 0, "#cbb894"]);
    body.push([0.5, 0.1, 0.5, 0, hy + 0.31, 0, "#b9a47c"]);
    body.push([0.42, 0.06, 0.42, 0, hy + 0.38, 0, "#cbb894"]);
  } else if (d.hat === "pillbox") {
    body.push([0.42, 0.16, 0.42, 0, hy + 0.28, 0, "#b3241d"]);
    body.push([0.44, 0.05, 0.44, 0, hy + 0.23, 0, "#2e8e4a"]);
    body.push([0.44, 0.04, 0.44, 0, hy + 0.33, 0, "#e8b82a"]);
  } else if (d.hat === "kulta") {
    body.push([0.42, 0.34, 0.42, 0, hy + 0.36, 0, "#a0201a"]);
    body.push([0.44, 0.06, 0.44, 0, hy + 0.22, 0, "#e8b82a"]);
    body.push([0.44, 0.04, 0.44, 0, hy + 0.42, 0, "#e8b82a"]);
  } else if (d.hat === "straw") {
    /* conical bamboo-and-straw hat (douli) */
    const c = d.hatColor || "#d6bb78";
    body.push([0.94, 0.035, 0.94, 0, hy + 0.25, 0, c]);
    body.push([0.7, 0.05, 0.7, 0, hy + 0.29, 0, c]);
    body.push([0.46, 0.07, 0.46, 0, hy + 0.34, 0, "#c9ab66"]);
    body.push([0.24, 0.07, 0.24, 0, hy + 0.4, 0, c]);
    body.push([0.08, 0.05, 0.08, 0, hy + 0.45, 0, "#9c7f45"]);
  } else if (d.hat === "brim") {
    const c = d.hatColor || "#4a3a28";
    body.push([0.78, 0.04, 0.78, 0, hy + 0.23, 0, c]);
    body.push([0.44, 0.2, 0.44, 0, hy + 0.34, 0, c]);
    body.push([0.45, 0.05, 0.45, 0, hy + 0.27, 0, "#2a1d14"]);
  } else if (d.hat === "turban") {
    const c = d.hatColor || "#e2a5b8";
    body.push([0.48, 0.12, 0.48, 0, hy + 0.24, 0, c]);
    body.push([0.46, 0.1, 0.46, 0, hy + 0.33, -0.01, "#f2e8ec"]);
    body.push([0.16, 0.16, 0.1, 0.17, hy + 0.36, 0.16, c, 0, 0, 0.4]);
  } else if (d.hat === "wrap") {
    const c = d.hatColor || "#1e1c22";
    body.push([0.47, 0.18, 0.47, 0, hy + 0.27, 0, c]);
    body.push([0.48, 0.04, 0.48, 0, hy + 0.2, 0, "#e23a5e"]);
    body.push([0.48, 0.03, 0.48, 0, hy + 0.36, 0, "#e0a52e"]);
    body.push([0.05, 0.22, 0.05, -0.25, hy + 0.05, 0.06, "#e23a5e"]);
    body.push([0.05, 0.22, 0.05, 0.25, hy + 0.05, 0.06, "#2f8f6a"]);
  } else if (d.hat === "flower") {
    body.push([0.2, 0.05, 0.05, 0, hy + 0.36, -0.06, "#e3bd4a"]);
    body.push([0.12, 0.12, 0.08, 0.15, hy + 0.3, -0.12, "#f26b8a"]);
    body.push([0.06, 0.06, 0.09, 0.15, hy + 0.3, -0.12, "#ffe58a"]);
  } else if (d.hat === "crown") {
    body.push([0.46, 0.08, 0.46, 0, hy + 0.24, 0, "#d9b13c"]);
    body.push([0.34, 0.14, 0.34, 0, hy + 0.34, 0, "#d9b13c"]);
    body.push([0.08, 0.34, 0.05, 0, hy + 0.55, 0.1, "#e6c64a"]);
    body.push([0.05, 0.24, 0.05, -0.12, hy + 0.5, 0.06, "#1f7f78"]);
    body.push([0.05, 0.24, 0.05, 0.12, hy + 0.5, 0.06, "#1f7f78"]);
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
      legL.rotation.z = 0;
      legR.rotation.z = 0;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.8;
      armR.rotation.x = swing * 0.8;
    },
    /* astride a horse, camel or yak: legs apart and down */
    straddle() {
      legL.rotation.set(-0.35, 0, -0.42);
      legR.rotation.set(-0.35, 0, 0.42);
      armL.rotation.x = -0.7;
      armR.rotation.x = -0.7;
    },
    /* seated (riding an elephant or a boat) */
    sit() {
      legL.rotation.z = 0;
      legR.rotation.z = 0;
      legL.rotation.x = -1.35;
      legR.rotation.x = -1.35;
      armL.rotation.x = -0.6;
      armR.rotation.x = -0.6;
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
  const rotZ = new THREE.Matrix4();
  const place = (mesh, i, px, py, pz, angle, zAngle = 0) => {
    part.makeTranslation(px, py, pz);
    rot.makeRotationX(angle);
    out.copy(base).multiply(part);
    if (zAngle) out.multiply(rotZ.makeRotationZ(zAngle));
    out.multiply(rot);
    mesh.setMatrixAt(i, out);
  };
  /* optional per-person tint (p.tint): instance colour multiplies the vertex colours */
  groups.forEach((grp) => {
    if (!grp.list.some((p) => p.tint)) return;
    const white = new THREE.Color(1, 1, 1), c = new THREE.Color();
    grp.list.forEach((p, i) => {
      const v = p.tint ? c.set(p.tint) : white;
      ["body", "legL", "legR", "armL", "armR"].forEach((k) => grp[k].setColorAt(i, v));
    });
  });
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
          place(grp.armL, i, -SHOULDER_X, SHOULDER_Y, 0, -s * 0.8 + (p.wave || 0), -(p.armZ || 0));
          place(grp.armR, i, SHOULDER_X, SHOULDER_Y, 0, s * 0.8 + (p.waveR || 0), p.armZ || 0);
        });
        ["body", "legL", "legR", "armL", "armR"].forEach((k) => {
          grp[k].instanceMatrix.needsUpdate = true;
        });
      });
    },
  };
}
