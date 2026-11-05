import * as THREE from "three";
import {
  bird,
  cloud,
  mountain,
  pine,
  tree,
  stoneTexture,
  woodTexture,
} from "../helpers.js";
import { createKit, createWalker, fbm, hs, lerp, ss, col } from "./walk-engine.js";
import {
  buildApricotStall,
  buildCraftWorkshop,
  buildEmbroideredStall,
  buildFort,
  buildRubabCorner,
  buildViewpoint,
  buildVillageHome,
  buildWaterChannel,
  goat,
  hamletHouse,
  person,
} from "./hunza.js";

/* ------------------------------------------------------------------
   Hunza Valley â€” a walkable valley focused only on Hunza.
   Karimabad bazaar, Baltit Fort, Altit Fort, the apricot terraces,
   Ganish and the kuhl, Duikar viewpoint, the Hussaini bridge and
   Attabad Lake. The Karakoram is the backdrop; the walk stays in Hunza.
   ------------------------------------------------------------------ */

const RIVER = (z) => 16 * Math.sin(z * 0.013) + 7 * Math.sin(z * 0.037 + 1.1);
const WATER_Y = 0.55;
const LAKE_Z0 = 340;
const LAKE_Z1 = 590;
const LAKE_Y = 0.95;
const BOUNDS = { x0: -330, x1: 330, z0: -190, z1: 640 };

const PAL = {
  grass: col("#6b8738"),
  grass2: col("#8aa04a"),
  dry: col("#9a8a58"),
  rock: col("#5a4f42"),
  rock2: col("#7b6b56"),
  snow: col("#eef2f6"),
  bank: col("#8b8272"),
  bed: col("#4f5f58"),
  terrace: col("#7f9a4a"),
  dirt: col("#9a8466"),
};

function ridged(x, z) {
  const r = 1 - Math.abs(fbm(x * 0.012 + 3, z * 0.012 + 7, 4) * 2 - 1);
  return r * r;
}

const PADS = [
  { x: -45, z: 0, r: 42, f: 24 }, // Karimabad bazaar
  { x: -92, z: -62, r: 30, f: 18 }, // Baltit Fort
  { x: -58, z: 142, r: 30, f: 18 }, // Altit Fort
  { x: -198, z: 95, r: 24, f: 16 }, // Duikar
  { x: 100, z: 95, r: 34, f: 20 }, // Ganish
  { x: -118, z: 42, r: 24, f: 16 }, // terraces
  { x: -18, z: 60, r: 12, f: 10 }, // footbridge west
  { x: 38, z: 60, r: 12, f: 10 }, // footbridge east
  { x: -42, z: 250, r: 12, f: 10 }, // Hussaini west
  { x: 30, z: 250, r: 12, f: 10 }, // Hussaini east
  { x: -85, z: 380, r: 30, f: 18 }, // Attabad shore
];

function lakeFactor(z) {
  return ss(LAKE_Z0, LAKE_Z0 + 70, z) * (1 - ss(LAKE_Z1 - 50, LAKE_Z1, z));
}

function baseH(x, z) {
  const rx = RIVER(z);
  const d = Math.abs(x - rx);
  let h =
    3.2 +
    fbm(x * 0.018, z * 0.018, 4) * 3.4 +
    fbm(x * 0.06, z * 0.06, 3) * 0.9;
  const wall = ss(48, 300, d);
  h += wall * (0.62 * Math.min(Math.max(d - 48, 0), 280));
  h += wall * (ridged(x, z) * 24 + fbm(x * 0.035, z * 0.035, 3) * 12);

  // three landmark hills
  h += 24 * Math.exp(-(((x + 92) ** 2 + (z + 62) ** 2) / (2 * 38 * 38)));
  h += 22 * Math.exp(-(((x + 58) ** 2 + (z - 142) ** 2) / (2 * 34 * 34)));
  h += 54 * Math.exp(-(((x + 198) ** 2 + (z - 95) ** 2) / (2 * 46 * 46)));

  // Attabad basin
  const lf = lakeFactor(z);
  if (lf > 0.01) {
    const half = 10 + 55 * ss(LAKE_Z0, LAKE_Z0 + 100, z);
    h = lerp(h, -2.6, lf * (1 - ss(half * 0.55, half + 26, d)));
  }

  // Hunza River channel
  h = lerp(h, -2.3, 1 - ss(9, 27, d));
  return h;
}

PADS.forEach((p) => {
  p.h = baseH(p.x, p.z);
});

function terrainH(x, z) {
  let h = baseH(x, z);
  for (const p of PADS) {
    const dx = x - p.x;
    const dz = z - p.z;
    const R = p.r + p.f;
    if (dx * dx + dz * dz < R * R) {
      h += (p.h - h) * ss(R, p.r, Math.sqrt(dx * dx + dz * dz));
    }
  }
  return h;
}

/* cached bilinear height sampling */
const HC = { x0: -360, z0: -220, c: 2 };
HC.nx = Math.ceil(720 / HC.c) + 1;
HC.nz = Math.ceil(900 / HC.c) + 1;
const hcache = new Map();
function hgt(x, z) {
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
      h = terrainH(HC.x0 + a * HC.c, HC.z0 + b * HC.c);
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

function waterY(z) {
  return lerp(WATER_Y, LAKE_Y, ss(LAKE_Z0 - 20, LAKE_Z0 + 30, z));
}

function waterHalf(z) {
  const lf = lakeFactor(z);
  return 8 + (lf > 0.02 ? 48 * ss(LAKE_Z0, LAKE_Z0 + 100, z) : 0);
}

/* ------------------------------------------------------------------ */

export default function buildHunzaValley({ scene, stage, manager }) {
  const LOWQ = stage.quality === "low";
  const kit = createKit(stage, manager.renderer, 20261109);
  const { rnd, rr, M, ctex, noiseFill, mk, bx, cy, block, blockRect, blocked, _o } = kit;

  const stoneMap = stage.trackTexture(stoneTexture("#8c8475", "#605b51", [3, 3]));
  const timberMap = stage.trackTexture(woodTexture("#65402a", "#3c2415", [2, 2]));

  const soilMat = M({ color: "#7b6b52", roughness: 1 });
  const cropMat = M({ color: "#6f8a3c", roughness: 1 });
  const cropRow = M({ color: "#526b2f", roughness: 1 });
  const terraceStone = M({ map: stoneMap, color: "#c9bca6", roughness: 1 });
  const pathMat = M({
    map: stoneMap,
    color: "#cbb89a",
    roughness: 0.98,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const nightMats = [];

  /* ---------- terrain ---------- */
  (function terrain() {
    const SX = 760;
    const SZ = 980;
    const NX = LOWQ ? 160 : 230;
    const NZ = LOWQ ? 200 : 290;
    const g = new THREE.PlaneGeometry(SX, SZ, NX, NZ);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, 220);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i += 1) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const h = terrainH(x, z);
      p.setY(i, h);
      const d = Math.abs(x - RIVER(z));
      const lf = lakeFactor(z);
      const wh = 8 + (lf > 0.02 ? 48 * ss(LAKE_Z0, LAKE_Z0 + 100, z) : 0);
      const wy = waterY(z);
      const n = fbm(x * 0.045 + 1, z * 0.045 + 2, 3);
      const n2 = fbm(x * 0.16 + 4, z * 0.16 + 1, 2);
      const patch = hs(Math.floor(x / 13), Math.floor(z / 11));
      if (h < wy + 0.35 && d < wh + 5) {
        c.copy(PAL.bed);
      } else if (h < wy + 1.6 && d < wh + 9) {
        c.copy(PAL.bank);
      } else if (h > 175 + n * 18) {
        c.copy(PAL.snow).lerp(PAL.rock2, n2 * 0.25);
      } else if (h > 92) {
        c.copy(PAL.rock).lerp(PAL.rock2, n);
      } else {
        c.copy(PAL.grass).lerp(PAL.grass2, n);
        if (patch > 0.7) c.lerp(PAL.terrace, 0.55);
        if (patch < 0.2) c.lerp(PAL.dry, 0.45);
        c.lerp(PAL.rock, ss(34, 95, h) * 0.7);
      }
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }
    g.computeVertexNormals();
    const nrm = g.attributes.normal;
    for (let i = 0; i < p.count; i += 1) {
      const steep = ss(0.76, 0.5, nrm.getY(i));
      if (steep > 0) {
        c.setRGB(cols[i * 3], cols[i * 3 + 1], cols[i * 3 + 2]);
        c.lerp(PAL.rock, steep * 0.8);
        cols[i * 3] = c.r;
        cols[i * 3 + 1] = c.g;
        cols[i * 3 + 2] = c.b;
      }
    }
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    stage.trackGeometry(g);
    const m = new THREE.Mesh(g, M({ vertexColors: true, roughness: 0.97 }));
    m.receiveShadow = true;
    stage.add(m);
  })();

  /* ---------- Hunza River and Attabad Lake ---------- */
  const riverPts = [];
  for (let z = -230; z <= LAKE_Z1 + 20; z += 3) {
    riverPts.push(new THREE.Vector3(RIVER(z), 0, z));
  }
  const waterMat = M({
    color: "#2a9aa8",
    roughness: 0.13,
    metalness: 0.18,
    transparent: true,
    opacity: 0.94,
  });
  kit.ribbon(
    riverPts,
    (i, p) => 16 + 100 * lakeFactor(p.z),
    (x, z, p) => waterY(p.z),
    waterMat,
    40
  );

  /* ---------- paths ---------- */
  function makePath(points, width = 3.4) {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, z]) => new THREE.Vector3(x, 0, z))
    );
    const n = Math.max(24, Math.round(curve.getLength() / 4));
    const pts = curve.getSpacedPoints(n);
    kit.ribbon(pts, width, (x, z) => hgt(x, z) + 0.08, pathMat, 4);
    return pts;
  }

  const mainPath = [
    [-45, 5],
    [-25, 40],
    [-8, 80],
    [0, 130],
    [5, 180],
    [-2, 220],
    [-8, 245],
  ];
  makePath([[-45, 5], [-55, -12], [-68, -30], [-80, -48], [-86, -56]], 3.0);
  makePath([[-45, 5], [-42, 40], [-40, 80], [-46, 110], [-52, 128]], 3.2);
  makePath([[-45, 5], [-65, 15], [-85, 25], [-105, 35], [-118, 40]], 2.8);
  makePath([[-45, 5], [-30, 22], [-15, 40], [-18, 58]], 2.8);
  makePath([[38, 58], [50, 70], [75, 82], [92, 90]], 2.8);
  makePath([[-45, 5], [-70, 15], [-100, 35], [-130, 55], [-160, 72], [-184, 86]], 2.6);
  makePath(mainPath, 3.4);
  makePath([[-8, 245], [-20, 246], [-32, 248], [-40, 250]], 2.6);
  makePath([[-8, 255], [-20, 290], [-40, 320], [-65, 340], [-82, 360]], 3.0);
  makePath([[-85, 360], [-100, 378], [-96, 398], [-80, 392], [-70, 372]], 2.6);
  makePath([[-45, 5], [-60, 18], [-75, 26], [-90, 32]], 2.4);

  /* ---------- terraced fields ---------- */
  function terraceField(x, z, width, depth, side) {
    const edge = x + (side * width) / 2;
    const top = hgt(edge, z) + 0.32;
    kit.bx(width, 0.7, depth, soilMat, x, top - 0.35, z);
    kit.bx(width - 0.4, 0.1, depth - 0.4, cropMat, x, top + 0.06, z);
    kit.bx(0.7, 1.5, depth, terraceStone, edge + side * 0.18, top - 0.65, z);
    kit.bx(0.95, 0.14, depth, terraceStone, edge + side * 0.18, top + 0.02, z);
    for (let i = 0; i < 4; i += 1) {
      kit.bx(
        0.22,
        0.06,
        depth * 0.9,
        cropRow,
        x - width / 2 + ((i + 0.5) * width) / 4,
        top + 0.12,
        z
      );
    }
    const tx = edge - side * 1.8;
    [-depth * 0.28, depth * 0.28].forEach((dz) => {
      const t = tree(tx, z + dz, 0.55, "#5a8250", "#e7b4ac");
      t.position.y = top + 0.12;
      stage.add(t);
    });
  }

  for (let i = 0; i < 6; i += 1) {
    terraceField(-98 - i * 11, 44, 10, 62, 1);
  }
  for (let i = 0; i < 4; i += 1) {
    terraceField(118 + i * 10, 100, 9, 42, -1);
  }
  for (let i = 0; i < 3; i += 1) {
    terraceField(-132 + i * 11, 105, 9, 34, 1);
  }

  /* ---------- bridges ---------- */
  const BRIDGES = [];
  const cableMat = new THREE.LineBasicMaterial({ color: 0x2c241c });

  function buildBridgeX(z, x0, x1, width, sag, deckLift, towerH, stone, timber) {
    const ya = hgt(x0, z) + deckLift;
    const yb = hgt(x1, z) + deckLift;
    const n = Math.max(12, Math.ceil((x1 - x0) / 0.55));
    const deckMat = M({ map: timberMap, color: "#d9c4a0", roughness: 0.92 });
    const railMat = M({ color: "#4a3424", roughness: 0.9 });
    for (let i = 0; i <= n; i += 1) {
      const u = i / n;
      const x = lerp(x0, x1, u);
      const y = lerp(ya, yb, u) - Math.sin(u * Math.PI) * sag;
      kit.bx(0.5, 0.14, width, deckMat, x, y, z);
    }
    for (const side of [-1, 1]) {
      const zz = z + (side * width) / 2;
      for (let i = 0; i <= n; i += 3) {
        const u = i / n;
        const x = lerp(x0, x1, u);
        const y = lerp(ya, yb, u) - Math.sin(u * Math.PI) * sag;
        kit.bx(0.12, 1.25, 0.12, railMat, x, y + 0.65, zz);
      }
      const pts = [];
      for (let i = 0; i <= 22; i += 1) {
        const u = i / 22;
        const x = lerp(x0, x1, u);
        const y =
          lerp(ya, yb, u) - Math.sin(u * Math.PI) * sag + 1.28;
        pts.push(new THREE.Vector3(x, y, zz));
      }
      stage.add(
        new THREE.Line(
          stage.trackGeometry(new THREE.BufferGeometry().setFromPoints(pts)),
          cableMat
        )
      );
      const main = [];
      for (let i = 0; i <= 22; i += 1) {
        const u = i / 22;
        const x = lerp(x0, x1, u);
        const y =
          lerp(ya, yb, u) -
          Math.sin(u * Math.PI) * (sag + 1.2) +
          towerH;
        main.push(new THREE.Vector3(x, y, zz));
      }
      stage.add(
        new THREE.Line(
          stage.trackGeometry(new THREE.BufferGeometry().setFromPoints(main)),
          cableMat
        )
      );
    }
    for (const [x, y] of [
      [x0, ya],
      [x1, yb],
    ]) {
      for (const side of [-1, 1]) {
        kit.bx(1.0, towerH + 2.5, 1.0, stone, x, y + towerH * 0.5 - 0.2, z + (side * width) / 2);
      }
      kit.bx(1.5, 0.5, width + 2.6, timber, x, y + towerH, z);
    }
    BRIDGES.push({ x0, x1, z, width, ya, yb, sag });
    return { ya, yb };
  }

  const bridgeTimber = M({ map: timberMap, color: "#c8a878", roughness: 0.92 });
  const footBridge = buildBridgeX(
    60,
    -18,
    38,
    2.8,
    0.8,
    0.7,
    4.2,
    terraceStone,
    bridgeTimber
  );
  const hussaini = buildBridgeX(
    250,
    -42,
    30,
    2.5,
    2.0,
    1.4,
    8.5,
    terraceStone,
    bridgeTimber
  );

  function bridgeY(x, z) {
    for (const b of BRIDGES) {
      if (Math.abs(z - b.z) > b.width / 2) continue;
      if (x < b.x0 || x > b.x1) continue;
      const u = (x - b.x0) / (b.x1 - b.x0);
      return lerp(b.ya, b.yb, u) - Math.sin(u * Math.PI) * b.sag;
    }
    return null;
  }

  /* ---------- Attabad pier ---------- */
  (function pier() {
    const z = 380;
    const x0 = -85;
    const x1 = -38;
    const y = hgt(x0, z) + 0.5;
    for (let x = x0; x <= x1; x += 1.1) {
      kit.bx(0.9, 0.12, 3.2, M({ map: timberMap, color: "#d9c4a0", roughness: 0.92 }), x, y, z);
    }
    for (let x = x0; x <= x1; x += 8) {
      kit.bx(0.22, 3.4, 0.22, terraceStone, x, y - 1.7, z - 1.4);
      kit.bx(0.22, 3.4, 0.22, terraceStone, x, y - 1.7, z + 1.4);
    }
    for (const side of [-1, 1]) {
      for (let x = x0; x <= x1; x += 4) {
        kit.bx(0.1, 1.1, 0.1, M({ color: "#4a3424", roughness: 0.9 }), x, y + 0.55, z + side * 1.5);
      }
      kit.bx(x1 - x0, 0.09, 0.09, M({ color: "#4a3424", roughness: 0.9 }), (x0 + x1) / 2, y + 1.05, z + side * 1.5);
    }
    BRIDGES.push({ x0, x1, z, width: 3.2, ya: y, yb: y, sag: 0 });
  })();

  /* ---------- walkable helpers ---------- */
  function groundY(x, z) {
    const by = bridgeY(x, z);
    return by !== null ? by : hgt(x, z);
  }

  function canStand(x, z) {
    if (bridgeY(x, z) !== null) return true;
    if (x < BOUNDS.x0 || x > BOUNDS.x1 || z < BOUNDS.z0 || z > BOUNDS.z1) return false;
    if (blocked(x, z, 0.45)) return false;
    const d = Math.abs(x - RIVER(z));
    const wh = waterHalf(z);
    if (d < wh - 1 && hgt(x, z) < waterY(z) + 0.4) return false;
    return true;
  }

  /* ---------- places ---------- */
  const PL = {
    karimabad: {
      n: "Karimabad Bazaar",
      zh: "å¡é‡Œé©¬å·´å¾·é›†å¸‚",
      sub: "Ú©Ø±ÛŒÙ… Ø¢Ø¨Ø§Ø¯",
      x: -45,
      z: 0,
      r: 38,
      spawn: [-52, 14],
      look: [-45, 0],
      pitch: 1.3,
      dist: 14,
    },
    baltit: {
      n: "Baltit Fort",
      zh: "å·´å°”è’‚ç‰¹å ¡",
      sub: "Ø¨Ù„ØªØª Ù‚Ù„Ø¹Û",
      x: -92,
      z: -62,
      r: 26,
      spawn: [-76, -42],
      look: [-92, -62],
      pitch: 1.34,
      dist: 16,
    },
    altit: {
      n: "Altit Fort",
      zh: "é˜¿å°”æç‰¹å ¡",
      sub: "Ø§Ù„ØªÛŒØª Ù‚Ù„Ø¹Û",
      x: -58,
      z: 142,
      r: 26,
      spawn: [-44, 130],
      look: [-58, 142],
      pitch: 1.34,
      dist: 16,
    },
    terraces: {
      n: "Apricot Terraces",
      zh: "ææ ‘æ¢¯ç”°",
      sub: "Ø®ÙˆØ¨Ø§Ù†ÛŒ Ú©Û’ Ø¨Ø§ØºØ§Øª",
      x: -125,
      z: 44,
      r: 30,
      spawn: [-106, 48],
      look: [-125, 44],
      pitch: 1.3,
      dist: 15,
    },
    ganish: {
      n: "Ganish Village",
      zh: "åŠ å°¼ä»€æ‘",
      sub: "Ú¯Ù†Ø´",
      x: 100,
      z: 95,
      r: 28,
      spawn: [88, 88],
      look: [100, 95],
      pitch: 1.3,
      dist: 14,
    },
    duikar: {
      n: "Duikar Viewpoint",
      zh: "æœä¼Šå¡å°”è§‚æ™¯ç‚¹",
      sub: "Ø¯ÙˆØ¦ÛŒÚ©Ø§Ø±",
      x: -198,
      z: 95,
      r: 24,
      spawn: [-186, 88],
      look: [-150, 40],
      pitch: 1.4,
      dist: 16,
    },
    hussaini: {
      n: "Hussaini Bridge",
      zh: "ä¾¯èµ›å°¼åŠæ¡¥",
      sub: "Ø­Ø³ÛŒÙ†ÛŒ Ù¾Ù„",
      x: -6,
      z: 250,
      r: 24,
      spawn: [-38, 246],
      look: [-6, 250],
      pitch: 1.36,
      dist: 14,
    },
    attabad: {
      n: "Attabad Lake",
      zh: "é˜¿å¡”å·´å¾·æ¹–",
      sub: "Ø¹Ø·Ø§ Ø¢Ø¨Ø§Ø¯ Ø¬Ú¾ÛŒÙ„",
      x: -20,
      z: 430,
      r: 70,
      spawn: [-85, 368],
      look: [-20, 430],
      pitch: 1.38,
      dist: 18,
    },
  };

  const riverLine = [];
  for (let z = -180; z <= 620; z += 20) riverLine.push([RIVER(z), z]);
  const mainLine = mainPath.map((p) => [p[0], p[1]]);

  /* ---------- walker ---------- */
  const W = createWalker({
    scene,
    stage,
    manager,
    kit,
    places: PL,
    startPlace: "karimabad",
    worldName: { en: "Hunza Valley", zh: "ç½•è¨å±±è°·", sub: "ÛÙ†Ø²Û ÙˆØ§Ø¯ÛŒ" },
    hgt,
    groundY,
    canStand,
    nightMats,
    kmPerUnit: 0.02,
    runSpeed: 11,
    exposureScale: 0.96,
    fogDensity: 0.0005,
    far: 4600,
    mapBounds: { x0: -330, x1: 330, z0: -190, z1: 640 },
    mapLines: [riverLine, mainLine],
    mapColor: (x, z) => {
      const h = hgt(x, z);
      const d = Math.abs(x - RIVER(z));
      const wh = waterHalf(z);
      if (d < wh && h < waterY(z) + 0.4) return [44, 152, 168];
      if (h > 180) return [235, 238, 242];
      if (h > 85) return [122, 112, 92];
      const n = fbm(x * 0.03, z * 0.03, 2);
      return [Math.round(104 + 36 * n), Math.round(128 + 28 * n), Math.round(56 + 22 * n)];
    },
  });

  /* ---------- landmark placement ---------- */
  function placeGroup(group, x, z, rot = 0, scale = 1) {
    group.position.set(x, hgt(x, z), z);
    group.rotation.y = rot;
    group.scale.setScalar(scale);
    stage.add(group);
    return group;
  }

  function makeSign(text, x, z, rot = 0) {
    const tex = ctex(512, 128, (g, w, h) => {
      g.fillStyle = "#3a2a1c";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "#c9a45c";
      g.lineWidth = 6;
      g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = "#f1e3c2";
      g.font = "bold 40px Georgia, serif";
      g.textAlign = "center";
      g.fillText(text, w / 2, h / 2 + 14);
    });
    const sign = mk(
      new THREE.PlaneGeometry(5.2, 1.3),
      M({ map: tex, roughness: 0.9, side: THREE.DoubleSide }),
      x,
      hgt(x, z) + 2.2,
      z
    );
    sign.rotation.y = rot;
    kit.bx(0.14, 2.2, 0.14, M({ color: "#4a3424", roughness: 0.9 }), x - 2.2, hgt(x, z) + 1.1, z);
    kit.bx(0.14, 2.2, 0.14, M({ color: "#4a3424", roughness: 0.9 }), x + 2.2, hgt(x, z) + 1.1, z);
    return sign;
  }

  function lantern(x, z, y = 1.8) {
    const mat = M({
      color: "#f1bd63",
      emissive: new THREE.Color("#b86e20"),
      emissiveIntensity: 0.25,
      roughness: 0.5,
    });
    nightMats.push(mat);
    kit.bx(0.1, 2.4, 0.1, M({ color: "#3b2a1c", roughness: 0.9 }), x, hgt(x, z) + 1.2, z);
    kit.mk(new THREE.SphereGeometry(0.24, 10, 8), mat, x, hgt(x, z) + 2.35, z);
  }

  /* ---------- Karimabad bazaar ---------- */
  const embroidery = placeGroup(buildEmbroideredStall(stage), -56, 8, 0.35, 1.05);
  const apricot = placeGroup(buildApricotStall(stage), -40, 10, -0.25, 1.05);
  const craft = placeGroup(buildCraftWorkshop(stage), -33, -3, -0.7, 1.05);
  const rubab = placeGroup(buildRubabCorner(stage), -49, -6, 0.5, 1.0);
  const home = placeGroup(buildVillageHome(stage, stoneMap, timberMap), -61, -2, 0.15, 1.0);
  blockRect(-56, 8, 4.2, 3.0, 0.35);
  blockRect(-40, 10, 4.2, 3.0, -0.25);
  blockRect(-33, -3, 6.0, 4.5, -0.7);
  blockRect(-61, -2, 6.5, 5.0, 0.15);

  // More village houses and a tea house.
  placeGroup(hamletHouse(stage, 0, 0, stoneMap, timberMap, 1.05), -59, 15, 0.2);
  placeGroup(hamletHouse(stage, 0, 0, stoneMap, timberMap, 0.95), -43, 20, -0.3);
  placeGroup(hamletHouse(stage, 0, 0, stoneMap, timberMap, 0.9), -31, 7, 0.5);
  placeGroup(hamletHouse(stage, 0, 0, stoneMap, timberMap, 1.15), -66, 9, -0.1);
  blockRect(-59, 15, 7, 6, 0.2);
  blockRect(-43, 20, 6, 5, -0.3);
  blockRect(-31, 7, 6, 5, 0.5);
  blockRect(-66, 9, 7, 6, -0.1);

  // Market tables, carpets and fruit.
  const clothMat = M({ color: "#9c3f36", roughness: 0.9 });
  const cloth2 = M({ color: "#2d6a58", roughness: 0.9 });
  for (let i = 0; i < 5; i += 1) {
    const x = -57 + i * 6;
    const z = 1.5;
    kit.bx(2.4, 0.8, 1.2, M({ color: "#6a4a31", roughness: 0.9 }), x, hgt(x, z) + 0.4, z);
    kit.bx(2.6, 0.08, 1.4, i % 2 ? clothMat : cloth2, x, hgt(x, z) + 0.86, z);
    for (let k = 0; k < 4; k += 1) {
      kit.mk(
        new THREE.SphereGeometry(0.13, 8, 6),
        M({ color: k % 2 ? "#e49a36" : "#c25f2e", roughness: 0.75 }),
        x - 0.7 + k * 0.45,
        hgt(x, z) + 1.0,
        z + 0.15
      );
    }
  }

  const bigTree = tree(-45, 4, 1.8, "#55764f", "#efc8bd");
  bigTree.position.y = hgt(-45, 4);
  stage.add(bigTree);
  stage.add(goat(stage, -37, 16, 0.8));
  stage.add(goat(stage, -35, 18, 0.65));

  makeSign("KARIMABAD BAZAAR", -45, 24, Math.PI);
  lantern(-55, 12);
  lantern(-41, 13);
  lantern(-33, 6);
  lantern(-60, 6);
  lantern(-49, 22);

  // Prayer flags across the bazaar.
  kit.flagString(
    new THREE.Vector3(-64, hgt(-64, 4) + 5.2, 4),
    new THREE.Vector3(-30, hgt(-30, 4) + 5.2, 4),
    0.7
  );

  /* ---------- Baltit Fort ---------- */
  const baltit = placeGroup(buildFort(stage, 0, 0, stoneMap, timberMap), -92, -62, 0.55, 1.7);
  blockRect(-92, -62, 22, 18, 0.55);
  makeSign("BALTIT FORT", -79, -44, -0.8);
  placeGroup(hamletHouse(stage, 0, 0, stoneMap, timberMap, 1.0), -110, -82, 0.3);
  placeGroup(hamletHouse(stage, 0, 0, stoneMap, timberMap, 0.9), -76, -82, -0.4);
  blockRect(-110, -82, 7, 6, 0.3);
  blockRect(-76, -82, 6, 5, -0.4);
  kit.flagString(
    new THREE.Vector3(-92, hgt(-92, -62) + 22, -62),
    new THREE.Vector3(-72, hgt(-72, -42) + 6, -42),
    1.2
  );
  stage.add(goat(stage, -102, -48, 0.8));

  /* ---------- Altit Fort ---------- */
  const altit = placeGroup(buildFort(stage, 0, 0, stoneMap, timberMap), -58, 142, -0.7, 1.35);
  // a taller watchtower makes Altit distinct from Baltit
  const altitStone = M({ map: stoneMap, color: "#e7dfd0", roughness: 0.98 });
  const altitTimber = M({ map: timberMap, color: "#c8a878", roughness: 0.92 });
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      altit.add(
        new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 1.1, 0.55),
          altitStone
        )
      );
      const m = altit.children[altit.children.length - 1];
      m.position.set(-6.4 + i * 1.2, 12.2, -4.2 + j * 1.2);
    }
  }
  altit.add(
    new THREE.Mesh(new THREE.BoxGeometry(3.4, 11.5, 3.4), altitStone)
  );
  altit.children[altit.children.length - 1].position.set(-5.2, 6.4, -3.2);
  altit.add(
    new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.4, 3.9), altitTimber)
  );
  altit.children[altit.children.length - 1].position.set(-5.2, 12.1, -3.2);
  blockRect(-58, 142, 20, 18, -0.7);
  makeSign("ALTIT FORT", -44, 128, 2.3);
  placeGroup(hamletHouse(stage, 0, 0, stoneMap, timberMap, 1.0), -42, 156, 0.4);
  placeGroup(hamletHouse(stage, 0, 0, stoneMap, timberMap, 0.85), -72, 154, -0.2);
  blockRect(-42, 156, 7, 6, 0.4);
  blockRect(-72, 154, 6, 5, -0.2);
  kit.flagString(
    new THREE.Vector3(-58, hgt(-58, 142) + 18, 142),
    new THREE.Vector3(-40, hgt(-40, 132) + 5, 132),
    1.0
  );

  /* ---------- Duikar viewpoint ---------- */
  const duikar = placeGroup(buildViewpoint(stage), -198, 95, -0.85, 2.0);
  placeGroup(hamletHouse(stage, 0, 0, stoneMap, timberMap, 0.9), -212, 90, 0.6);
  blockRect(-212, 90, 6, 5, 0.6);
  makeSign("DUIKAR Â· EAGLE'S NEST", -188, 108, 0.4);
  kit.flagString(
    new THREE.Vector3(-206, hgt(-206, 88) + 6, 88),
    new THREE.Vector3(-188, hgt(-188, 100) + 6, 100),
    0.8
  );
  lantern(-190, 92);

  /* ---------- Ganish village and kuhl ---------- */
  const water = placeGroup(buildWaterChannel(stage), 100, 95, 0.3, 1.6);
  blockRect(100, 95, 8, 10, 0.3);
  placeGroup(hamletHouse(stage, 0, 0, stoneMap, timberMap, 1.0), 112, 106, 0.3);
  placeGroup(hamletHouse(stage, 0, 0, stoneMap, timberMap, 0.9), 88, 108, -0.4);
  placeGroup(hamletHouse(stage, 0, 0, stoneMap, timberMap, 0.85), 105, 78, 0.6);
  blockRect(112, 106, 7, 6, 0.3);
  blockRect(88, 108, 6, 5, -0.4);
  blockRect(105, 78, 6, 5, 0.6);
  makeSign("GANISH", 100, 112, Math.PI);
  kit.flagString(
    new THREE.Vector3(86, hgt(86, 92) + 4.5, 92),
    new THREE.Vector3(116, hgt(116, 92) + 4.5, 92),
    0.6
  );
  lantern(94, 100);

  /* ---------- Hussaini bridge ---------- */
  const hussainiGroup = new THREE.Group();
  hussainiGroup.position.set(-42, hgt(-42, 250), 250);
  stage.add(hussainiGroup);
  makeSign("HUSSAINI BRIDGE", -44, 256, 0.1);
  kit.flagString(
    new THREE.Vector3(-42, hgt(-42, 250) + 9.5, 250),
    new THREE.Vector3(30, hgt(30, 250) + 9.5, 250),
    1.8
  );
  lantern(-27, 248);

  /* ---------- Attabad Lake ---------- */
  const attabad = placeGroup(buildViewpoint(stage), -85, 380, 0.9, 2.2);
  placeGroup(hamletHouse(stage, 0, 0, stoneMap, timberMap, 0.95), -98, 388, 0.4);
  blockRect(-98, 388, 6, 5, 0.4);
  makeSign("ATTABAD LAKE", -72, 368, -0.8);
  kit.flagString(
    new THREE.Vector3(-95, hgt(-95, 375) + 6, 375),
    new THREE.Vector3(-70, hgt(-70, 388) + 6, 388),
    0.9
  );
  lantern(-82, 375);
  // simple boats on the lake
  const boatColors = ["#c24a33", "#2b7d88", "#d6a33c"];
  boatColors.forEach((color, i) => {
    const bx0 = -42 + i * 22;
    const bz = 410 + i * 24;
    const boat = new THREE.Group();
    boat.position.set(bx0, LAKE_Y + 0.25, bz);
    boat.rotation.y = 0.5 + i * 0.7;
    boat.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.55, 1.6),
        M({ color, roughness: 0.75 })
      )
    );
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 1.6, 4),
      M({ color, roughness: 0.75 })
    );
    tip.rotation.z = -Math.PI / 2;
    tip.position.set(2.6, 0, 0);
    boat.add(tip);
    stage.add(boat);
  });

  /* ---------- mountains ---------- */
  const peaks = [
    [180, 690, 300, 160, 0.42],
    [-300, 540, 240, 130, 0.45],
    [-100, 820, 290, 150, 0.4],
    [340, 590, 220, 100, 0.48],
    [0, 930, 340, 220, 0.38],
    [-520, 780, 300, 180, 0.42],
    [520, 820, 300, 180, 0.42],
  ];
  peaks.forEach(([x, z, h, r, snow], i) => {
    const peak = mountain(
      h,
      r,
      ["#4a5b6b", "#52677a", "#5b7182"][i % 3],
      "#f2f4f7",
      snow,
      LOWQ ? 5 : 7
    );
    peak.position.set(x, -8, z);
    peak.rotation.y = i * 0.7;
    stage.add(peak);
  });

  /* ---------- orchards, pines and poplars ---------- */
  const orchardSpots = [
    [-70, 28], [-84, 32], [-98, 30], [-112, 34], [-126, 38],
    [-78, 52], [-92, 56], [-106, 58], [-120, 62], [-134, 66],
    [-30, 28], [-24, 40], [-62, 30], [-56, 44], [-36, 52],
    [80, 80], [92, 72], [108, 68], [120, 76], [132, 86],
    [-168, 60], [-160, 74], [-174, 84], [-186, 72],
    [-96, 356], [-108, 366], [-70, 356], [-60, 366],
  ];
  orchardSpots.forEach(([x, z], i) => {
    const t = tree(
      x,
      z,
      rr(0.55, 0.95),
      i % 3 === 0 ? "#5a8250" : "#4f7654",
      i % 4 === 0 ? "#e7b4ac" : null
    );
    t.position.y = hgt(x, z);
    stage.add(t);
  });
  for (let i = 0; i < (LOWQ ? 18 : 34); i += 1) {
    const x = rr(-260, 240);
    const z = rr(-120, 420);
    const h = hgt(x, z);
    if (h < 22 || h > 160 || Math.abs(x - RIVER(z)) < 25) continue;
    const p = pine(x, z, rr(0.7, 1.4), "#315b4c");
    p.position.y = h;
    stage.add(p);
  }

  /* ---------- clouds and birds ---------- */
  const clouds = [];
  for (let i = 0; i < (LOWQ ? 4 : 7); i += 1) {
    const c = cloud(rr(1.8, 3.4));
    c.position.set(rr(-240, 240), rr(70, 130), rr(-60, 560));
    stage.add(c);
    clouds.push({ mesh: c, speed: rr(0.25, 0.5) });
  }
  for (let i = 0; i < 7; i += 1) {
    stage.add(bird(rr(-120, 120), rr(28, 48), rr(-40, 260)));
  }

  /* ---------- interactive beacons ---------- */
  W.interactive("pk-embroidery", embroidery, "Embroidered shawl", [-56, 11], { radius: 8 });
  W.interactive("pk-apricot", apricot, "Apricot stall", [-40, 13], { radius: 8 });
  W.interactive("pk-craft", craft, "Craft workshop", [-33, 0], { radius: 9 });
  W.interactive("pk-rubab", rubab, "Rubab", [-49, -3], { radius: 8 });
  W.interactive("pk-home", home, "Stone village home", [-61, 1], { radius: 8 });
  W.interactive("pk-fort", baltit, "Baltit Fort", [-80, -46], { radius: 24, labelOffset: 2 });
  W.interactive("pk-altit", altit, "Altit Fort", [-44, 130], { radius: 24, labelOffset: 2 });
  W.interactive("pk-water", water, "Kuhl water channel", [100, 100], { radius: 16, labelOffset: 1.4 });
  W.interactive("pk-view", duikar, "Duikar viewpoint", [-190, 92], { radius: 20, labelOffset: 2 });
  W.interactive("pk-hussaini", hussainiGroup, "Hussaini Bridge", [-38, 250], { radius: 18, labelOffset: 2 });
  W.interactive("pk-attabad", attabad, "Attabad Lake", [-82, 378], { radius: 28, labelOffset: 2 });

  /* ---------- people ---------- */
  const bazaarMix = ["hunza-man", "hunza-woman", "elder", "schoolgirl", "porter", "trekker", "tajik-woman"];
  const fortMix = ["hunza-woman", "hunza-man", "elder", "schoolgirl", "trekker"];
  const addPeople = (cx, cz, radius, count, mix) => {
    for (let i = 0; i < count; i += 1) {
      const a = rnd() * Math.PI * 2;
      const d = rr(3, radius);
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      if (blocked(x, z, 0.7) || !canStand(x, z)) continue;
      W.addNpc({
        kind: rnd() < 0.4 ? "idle" : "wander",
        cx,
        cz,
        R: radius,
        x,
        z,
        tx: 0,
        tz: 0,
        wait: rr(0, 4),
        design: W.pick(mix),
      });
    }
  };
  addPeople(-45, 0, 32, 22, bazaarMix);
  addPeople(-92, -62, 18, 6, fortMix);
  addPeople(-58, 142, 16, 5, fortMix);
  addPeople(100, 95, 22, 7, bazaarMix);
  addPeople(-198, 95, 12, 4, fortMix);
  addPeople(-6, 250, 12, 4, fortMix);
  addPeople(-85, 380, 18, 6, bazaarMix);

  // Static figures and goats add a little bustle at the bazaar.
  stage.add(person(stage, -36, 14, "#5c6e5d", "#4a3a32", 0.92, 0.7));
  stage.add(person(stage, -52, 18, "#8b4b3b", "#3f4b50", 0.86, 1.8));
  stage.add(person(stage, -44, -9, "#3c5b72", "#3a3229", 0.8, 3.1));

  /* ---------- animate ---------- */
  stage.animate((time, delta) => {
    if (stage.reducedMotion) return;
    clouds.forEach((c) => {
      c.mesh.position.x += c.speed * delta;
      if (c.mesh.position.x > 300) c.mesh.position.x = -300;
    });
  });

  W.start();
}
