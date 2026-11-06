import * as THREE from "three";
import { mountain, pine, tree } from "../helpers.js";
import { buildWalkableTown } from "./walk-town.js";
import { placeShop } from "./shops.js";
import { fbm, ss, lerp } from "./walk-engine.js";
import { SKY_PRESETS, mergeGeometries, tint } from "./yunnan-fx.js";
import { animalId } from "../../wildlife-data.js";

const VIDEO_SRC =
  "https://upload.wikimedia.org/wikipedia/commons/transcoded/c/cc/The_Himalayan_-_Mt.Everest_Base_Camp_trek_HD_Time_Lapse.webm/The_Himalayan_-_Mt.Everest_Base_Camp_trek_HD_Time_Lapse.webm.480p.vp9.webm";
const VIDEO_SRC_MOV =
  "https://upload.wikimedia.org/wikipedia/commons/transcoded/c/cc/The_Himalayan_-_Mt.Everest_Base_Camp_trek_HD_Time_Lapse.webm/The_Himalayan_-_Mt.Everest_Base_Camp_trek_HD_Time_Lapse.webm.360p.mpeg4.mov";
const POSTER_SRC =
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/The_Himalayan_-_Mt.Everest_Base_Camp_trek_HD_Time_Lapse.webm/960px--The_Himalayan_-_Mt.Everest_Base_Camp_trek_HD_Time_Lapse.webm.jpg";
const VIDEO_PAGE =
  "https://commons.wikimedia.org/wiki/File:The_Himalayan_-_Mt.Everest_Base_Camp_trek_HD_Time_Lapse.webm";

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

function buildPosterTexture(stage) {
  // A real photographic still of the film (the video's actual frame from
  // Wikimedia Commons), shown while the footage buffers or on browsers that
  // cannot play video inline.
  const texture = new THREE.TextureLoader().setCrossOrigin("anonymous").load(POSTER_SRC);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  stage.trackTexture(texture);
  return texture;
}

function supportsVideo() {
  try {
    const test = document.createElement("video");
    const types = [
      'video/webm; codecs="vp9"',
      'video/mp4; codecs="mp4v"',
      "video/quicktime",
    ];
    return types.some((type) => test.canPlayType && test.canPlayType(type));
  } catch (error) {
    return false;
  }
}

function buildCinema(stage, { x, y, z, rotation }) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotation;

  const frameMat = stage.material("#2b2320", { roughness: 0.85 });
  const darkMat = stage.material("#14100e", { roughness: 0.95 });
  const postMat = stage.material("#4a3a2a", { roughness: 0.9 });
  const baseMat = stage.material("#5a4a37", { roughness: 1 });

  group.add(box(stage, 9.4, 5.4, 0.5, frameMat, 0, 2.7, 0));
  group.add(box(stage, 9.0, 5.0, 0.25, darkMat, 0, 2.7, 0.16));
  [-4.4, 4.4].forEach((px) => {
    group.add(box(stage, 0.4, 5.6, 0.5, postMat, px, 2.8, -0.25));
  });
  group.add(box(stage, 10.4, 0.5, 1.0, baseMat, 0, 0.25, 0.1));

  const poster = buildPosterTexture(stage);
  const screenMat = new THREE.MeshBasicMaterial({ map: poster, toneMapped: false });
  const screen = mesh(stage, new THREE.PlaneGeometry(8.4, 4.7), screenMat, 0, 2.7, 0.32);

  let video = null;
  let playing = false;
  const supported = supportsVideo();
  if (supported) {
    video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("playsinline", "");
    const webmSource = document.createElement("source");
    webmSource.src = VIDEO_SRC;
    webmSource.type = 'video/webm; codecs="vp9"';
    video.appendChild(webmSource);
    const movSource = document.createElement("source");
    movSource.src = VIDEO_SRC_MOV;
    movSource.type = "video/quicktime";
    video.appendChild(movSource);
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    stage.trackTexture(videoTexture);
    screen.material.map = videoTexture;
    screen.material.needsUpdate = true;
    video.addEventListener("error", () => {
      screen.material.map = poster;
      screen.material.needsUpdate = true;
      playing = false;
    });
    video.addEventListener("playing", () => {
      playing = true;
    });
    video.addEventListener("pause", () => {
      playing = false;
    });
    video.load();
    const started = video.play();
    if (started && started.catch) started.catch(() => {});
    playing = true;
  }

  group.add(screen);

  // Benches facing the screen.
  const benchWood = stage.material("#6e4b33", { roughness: 0.9 });
  [-2.2, 0, 2.2].forEach((bx) => {
    group.add(box(stage, 1.8, 0.16, 0.6, benchWood, bx, 0.5, 2.1));
    group.add(box(stage, 0.14, 0.4, 0.5, benchWood, bx - 0.7, 0.28, 2.1));
    group.add(box(stage, 0.14, 0.4, 0.5, benchWood, bx + 0.7, 0.28, 2.1));
  });

  return {
    group,
    video: {
      element: video,
      supported,
      playing,
      page: VIDEO_PAGE,
    },
  };
}

function buildTrailheadSign(stage) {
  const group = new THREE.Group();
  group.position.set(-6.5, 0, -14);
  group.rotation.y = 0.15;
  const wood = stage.material("#5e3d24", { roughness: 0.9 });
  const plank = stage.material("#7c5a35", { roughness: 0.92 });
  group.add(box(stage, 0.3, 2.4, 0.3, wood, 0, 1.2, 0));
  group.add(box(stage, 2.6, 0.9, 0.14, plank, 0, 2.0, 0));
  group.add(box(stage, 1.9, 0.42, 0.16, plank, 0, 1.55, 0));
  group.add(box(stage, 2.0, 0.14, 0.2, wood, 0, 2.55, 0));
  group.add(box(stage, 1.2, 0.7, 0.5, stage.material("#8a8172", { roughness: 1 }), 0, 0.35, 0));
  return group;
}

function buildCairn(stage) {
  const group = new THREE.Group();
  group.position.set(7.2, 0, -6);
  const stone = stage.material("#8b8477", { roughness: 1 });
  const stoneDark = stage.material("#615c53", { roughness: 1 });
  const rise = box(stage, 3.4, 1.0, 3.4, stoneDark, 0, 0.5, 0);
  group.add(rise);
  const layers = [
    { y: 1.0, r: 0.95, color: stone },
    { y: 1.6, r: 0.72, color: stoneDark },
    { y: 2.15, r: 0.52, color: stone },
    { y: 2.62, r: 0.34, color: stoneDark },
  ];
  layers.forEach(({ y, r, color }) => {
    group.add(mesh(stage, new THREE.CylinderGeometry(r * 0.8, r, 0.42, 7), color, 0, y, 0));
  });
  group.add(mesh(stage, new THREE.SphereGeometry(0.18, 8, 6), stone, 0, 2.86, 0));
  return group;
}

function buildPrayerFlagRidge(stage) {
  const group = new THREE.Group();
  group.position.set(-7.5, 0, 8);
  const poleMat = stage.material("#6b5a40", { roughness: 0.9 });
  const flagColors = ["#2e6fb0", "#f4efe4", "#bd3e32", "#3d8a5f", "#d8a541"];
  const poles = [
    [-2.4, 0],
    [-1.2, 0.6],
    [0, 1.1],
    [1.2, 0.6],
    [2.4, 0],
  ];
  poles.forEach(([px, drop]) => {
    const height = 3.4 - drop;
    group.add(box(stage, 0.12, height, 0.12, poleMat, px, height / 2, 0));
  });
  for (let line = 0; line < 2; line += 1) {
    const z = line * 0.9;
    for (let index = 0; index < 5; index += 1) {
      const px = -2.4 + index * 1.2;
      const py = 3.2 - (index === 0 || index === 4 ? 0.6 : index === 1 || index === 3 ? 0.25 : 0) - line * 0.15;
      const flag = mesh(
        stage,
        new THREE.PlaneGeometry(0.55, 0.42),
        stage.material(flagColors[(index + line) % flagColors.length], { roughness: 0.9, side: THREE.DoubleSide }),
        px + 0.06,
        py,
        z
      );
      group.add(flag);
      stage.animate((time) => {
        if (stage.reducedMotion) return;
        flag.rotation.y = Math.sin(time * 1.6 + index + line) * 0.16;
      });
    }
  }
  return group;
}

export default function buildJourney({ scene, stage, manager }) {
  let cinemaVideo = null;
  const places = {
    trailhead: {
      n: "Trailhead",
      zh: "\u5c71\u5f84\u8d77\u70b9",
      sub: "\u0679\u0631\u06cc\u0644 \u06c1\u06cc\u0688",
      x: 0,
      z: 30,
      r: 28,
      spawn: [0, 36],
      look: [0, 0],
      pitch: 1.32,
      dist: 16,
    },
    pass: {
      n: "High Pass",
      zh: "\u9ad8\u5c71\u51b3\u53e3",
      sub: "\u0627\u0648\u0646\u0686\u0627 \u062f\u0631\u06c1",
      x: 0,
      z: -25,
      r: 24,
      spawn: [0, -18],
      look: [0, -40],
      pitch: 1.4,
      dist: 16,
    },
    ridge: {
      n: "Prayer-Flag Ridge",
      zh: "\u7948\u798f\u65d7\u5c71\u810a",
      sub: "\u062f\u0639\u0627 \u067e\u0631\u0686\u0645 \u06a9\u06cc \u067e\u06c1\u0627\u0691\u06cc",
      x: 35,
      z: -50,
      r: 24,
      spawn: [28, -38],
      look: [45, -65],
      pitch: 1.34,
      dist: 16,
    },
    dunhuang: {
      n: "Dunhuang Gate",
      zh: "\u6566\u714c\u4e4b\u95e8",
      sub: "\u6566\u714c\u4e4b\u95e8",
      x: -35,
      z: -45,
      r: 24,
      spawn: [-26, -35],
      look: [-45, -55],
      pitch: 1.32,
      dist: 15,
    },
    cinema: {
      n: "Trail Cinema",
      zh: "\u5c71\u5f84\u5f71\u9662",
      sub: "\u0679\u0631\u06cc\u0644 \u0633\u06cc\u0646\u0645\u0627",
      x: -30,
      z: 30,
      r: 20,
      spawn: [-18, 30],
      look: [-35, 30],
      pitch: 1.34,
      dist: 15,
    },
  };

  /* The highway: a closed loop round the valley, its bed smoothed so a jeep can drive it. */
  const ROAD_PTS = [[-70, 58], [-30, 60], [10, 58], [44, 54], [66, 30], [68, -6], [48, -20], [18, -8], [-14, -12], [-48, -16], [-70, -4], [-74, 30]];
  const roadCurve = new THREE.CatmullRomCurve3(ROAD_PTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "centripetal");
  const ROAD = roadCurve.getSpacedPoints(360).slice(0, 360);
  const RB = new Map();
  ROAD.forEach((p, i) => {
    const k = Math.floor(p.x / 12) + "," + Math.floor(p.z / 12);
    if (!RB.has(k)) RB.set(k, []);
    RB.get(k).push(i);
  });
  function roadNear(x, z) {
    const cx = Math.floor(x / 12), cz = Math.floor(z / 12);
    let bi = -1, bd = 1e9;
    for (let a = -1; a <= 1; a += 1) for (let b = -1; b <= 1; b += 1) {
      const l = RB.get(cx + a + "," + (cz + b));
      if (l) for (const i of l) { const d = (ROAD[i].x - x) ** 2 + (ROAD[i].z - z) ** 2; if (d < bd) { bd = d; bi = i; } }
    }
    return bi < 0 ? null : { i: bi, d: Math.sqrt(bd) };
  }
  let roadY = null;
  function heightFn(x, z) {
    let h = heightFn0(x, z);
    if (roadY) {
      const r = roadNear(x, z);
      if (r && r.d < 10) h = lerp(h, roadY[r.i], ss(10, 4.8, r.d));
    }
    return h;
  }
  function heightFn0(x, z) {
    let h = 5.0 + fbm(x * 0.03, z * 0.03, 4) * 3.0;
    h += 26 * Math.exp(-(((x + 45) ** 2 + (z + 45) ** 2) / (2 * 30 * 30)));
    h += 32 * Math.exp(-(((x - 45) ** 2 + (z + 50) ** 2) / (2 * 32 * 32)));
    h += 14 * Math.exp(-(((x - 0) ** 2 + (z + 55) ** 2) / (2 * 28 * 28)));
    const pads = [
      [0, 30, 24, 14, 5.5],
      [0, -25, 32, 20, 13.0],
      [35, -50, 18, 10, 35.0],
      [-35, -45, 18, 10, 18.0],
      [-30, 30, 18, 10, 6.0],
    ];
    for (const [cx, cz, outer, inner, target] of pads) {
      const d = Math.hypot(x - cx, z - cz);
      if (d < outer) h = lerp(h, target, ss(outer, inner, d));
    }
    return h;
  }

  /* road bed: average the ground around each road point, then smooth along the road */
  {
    const raw = ROAD.map((p) => { let s = 0; for (let k = 0; k < 9; k += 1) { const a = (k / 9) * Math.PI * 2, r = k ? 7 : 0; s += heightFn0(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r); } return s / 9; });
    roadY = raw.map((_, i) => { let s = 0; for (let k = -10; k <= 10; k += 1) s += raw[(i + k + raw.length) % raw.length]; return s / 21; });
  }

  function colorFn(x, z, h) {
    const n = fbm(x * 0.06, z * 0.06, 3);
    const r = roadNear(x, z);
    if (r && r.d < 7) return new THREE.Color("#8a806e").lerp(new THREE.Color("#a09682"), n);
    if (h > 24) return new THREE.Color("#7b7564").lerp(new THREE.Color("#98917b"), n);
    if (h > 14) return new THREE.Color("#6f7d5a").lerp(new THREE.Color("#8a9168"), n);
    return new THREE.Color("#5e7d54").lerp(new THREE.Color("#7d925e"), n);
  }

  const W = buildWalkableTown({
    scene,
    stage,
    manager,
    seed: 20261114,
    terrain: {
      heightFn,
      colorFn,
      segments: 200,
      material: (M, fx) => (fx ? fx.pbr("plaster", { color: "#ffffff", color2: "#e2ddd2", color3: "#b8b0a0", stains: 0.5, seed: 101, bump: 1.6, repeat: [40, 40] }, { vertexColors: true }) : M({ vertexColors: true, roughness: 0.98 })),
    },
    places,
    startPlace: "trailhead",
    worldName: { en: "The Great Journey", zh: "\u4f1f\u5927\u65c5\u7a0b", sub: "\u0639\u0638\u06cc\u0645 \u0633\u0641\u0631" },
    mapBounds: { x0: -80, x1: 80, z0: -80, z1: 80 },
    mapLines: [
      [[0, 30], [8, 10], [-6, -8], [0, -25]],
      [[0, -25], [16, -36], [28, -42], [35, -50]],
      [[0, -25], [-16, -32], [-28, -40], [-35, -45]],
      [[0, 30], [-12, 30], [-30, 30]],
      ROAD_PTS.concat([ROAD_PTS[0]]),
    ],
    mapColor: (x, z) => {
      const h = heightFn(x, z);
      const r = roadNear(x, z);
      if (r && r.d < 4) return [70, 70, 72];
      if (h > 24) return [123, 117, 100];
      if (h > 14) return [111, 125, 90];
      return [94, 125, 84];
    },
    fogDensity: 0.0007,
    exposureScale: 0.94,
    walker: { collision: "slide", skyKeys: SKY_PRESETS.alpine },
    build: ({ kit, W, stage, hgt, makePath, fx }) => {
      const trailhead = buildTrailheadSign(stage);
      trailhead.position.set(0, hgt(0, 30), 30);
      trailhead.rotation.y = 0.4;
      stage.add(trailhead);
      W.interactive("jo-trailhead", trailhead, "Trailhead", [3, 30], { radius: 14, labelOffset: 1.5 });

      placeShop({ W, kit, stage, hgt }, { x: 13, z: 34, ry: -Math.PI / 2, goods: "tea", sign: "TEAHOUSE · 茶馆", id: "jo-buttertea", label: "Trail teahouse", seller: "tibetan-woman", cloth: "#8a2a1a", cloth2: "#e8c840" });

      const cairn = buildCairn(stage);
      cairn.position.set(0, hgt(0, -25), -25);
      stage.add(cairn);
      W.interactive("jo-cairn", cairn, "Stone cairn", [3, -25], { radius: 14, labelOffset: 1.5 });

      const ridge = buildPrayerFlagRidge(stage);
      ridge.position.set(35, hgt(35, -50), -50);
      ridge.rotation.y = -0.5;
      stage.add(ridge);
      W.interactive("jo-flag", ridge, "Prayer flags", [32, -47], { radius: 14, labelOffset: 1.5 });

      const gate = new THREE.Group();
      gate.position.set(-35, hgt(-35, -45), -45);
      gate.rotation.y = 0.4;
      const gateWall = stage.material("#a77b52", { roughness: 0.97 });
      const gateWood = stage.material("#5d3d26", { roughness: 0.9 });
      const gateDark = stage.material("#2a1c15", { roughness: 0.95 });
      gate.add(box(stage, 10, 5.0, 1.2, gateWall, 0, 2.5, 0));
      gate.add(box(stage, 10.8, 0.4, 1.6, gateWood, 0, 5.1, 0));
      gate.add(box(stage, 4.2, 4.4, 0.3, gateDark, 0, 2.2, 0.7));
      gate.add(box(stage, 2.2, 3.8, 0.35, gateDark, 0, 1.9, 0.72));
      for (const x of [-4.3, 4.3]) {
        gate.add(box(stage, 0.5, 6.0, 0.5, gateWood, x, 3.0, 0));
        gate.add(box(stage, 1.2, 0.35, 1.2, gateDark, x, 6.1, 0));
      }
      gate.add(box(stage, 3.0, 0.7, 0.2, gateWood, 0, 4.1, 0.8));
      stage.add(gate);
      W.interactive("jo-dunhuang", gate, "Dunhuang Gate", [-31, -41], { radius: 15, labelOffset: 1.5 });

      const cinema = buildCinema(stage, { x: -30, y: hgt(-30, 30), z: 30, rotation: Math.PI / 2 });
      stage.add(cinema.group);
      cinemaVideo = cinema.video;
      W.interactive("video:everest", cinema.group, "Everest time-lapse", [-25, 30], { radius: 15, labelOffset: 1.2 });


      /* ---------------- The Karakoram Highway loop: asphalt, centre line, kilometre stones, signs */
      {
        const asphalt = fx.pbr("plaster", { color: "#5a5a5c", color2: "#4a4a4c", color3: "#3a3a3c", stains: 0.3, seed: 102, bump: 0.8, repeat: [1, 40] }, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        const pts = ROAD.concat([ROAD[0]]);
        kit.ribbon(pts, 6.4, (x, z) => hgt(x, z) + 0.1, asphalt, 4);
        const geos = [];
        for (let i = 0; i < ROAD.length; i += 2) {
          const a = ROAD[i], b = ROAD[(i + 1) % ROAD.length];
          const g = new THREE.BoxGeometry(0.16, 0.02, 1.4);
          g.rotateY(Math.atan2(b.x - a.x, b.z - a.z));
          g.translate(a.x, hgt(a.x, a.z) + 0.14, a.z);
          geos.push(tint(g, "#e8c84a"));
        }
        /* kilometre stones every ~40 m on the outside of the road */
        for (let i = 0; i < ROAD.length; i += 22) {
          const a = ROAD[i], b = ROAD[(i + 1) % ROAD.length];
          const yaw = Math.atan2(b.x - a.x, b.z - a.z), ox = Math.cos(yaw) * 4.2, oz = -Math.sin(yaw) * 4.2;
          const g = new THREE.BoxGeometry(0.4, 0.7, 0.2);
          g.rotateY(yaw);
          g.translate(a.x + ox, hgt(a.x + ox, a.z + oz) + 0.35, a.z + oz);
          geos.push(tint(g, "#f2f0e8", "#c8c4b8", 0, 0.7));
          const t = new THREE.BoxGeometry(0.42, 0.22, 0.22); t.rotateY(yaw); t.translate(a.x + ox, hgt(a.x + ox, a.z + oz) + 0.62, a.z + oz);
          geos.push(tint(t, "#c0302a"));
        }
        const g = mergeGeometries(geos); geos.forEach((q) => q.dispose());
        const lines = mesh(stage, g, stage.material("#ffffff", { vertexColors: true, roughness: 0.7 }));
        lines.receiveShadow = true;
        stage.add(lines);
        /* green highway signs */
        const sign = (i, text) => {
          const a = ROAD[i], b = ROAD[(i + 1) % ROAD.length];
          const yaw = Math.atan2(b.x - a.x, b.z - a.z), ox = Math.cos(yaw) * 5.2, oz = -Math.sin(yaw) * 5.2;
          const grp = new THREE.Group();
          grp.position.set(a.x + ox, hgt(a.x + ox, a.z + oz), a.z + oz);
          grp.rotation.y = yaw + Math.PI;
          grp.add(box(stage, 0.14, 3.2, 0.14, stage.material("#9a9a9a", { metalness: 0.4 }), -1.2, 1.6, 0));
          grp.add(box(stage, 0.14, 3.2, 0.14, stage.material("#9a9a9a", { metalness: 0.4 }), 1.2, 1.6, 0));
          const c = document.createElement("canvas"); c.width = 512; c.height = 192;
          const x2 = c.getContext("2d");
          x2.fillStyle = "#1f6a3a"; x2.fillRect(0, 0, 512, 192); x2.strokeStyle = "#fff"; x2.lineWidth = 8; x2.strokeRect(10, 10, 492, 172);
          x2.fillStyle = "#fff"; x2.font = "bold 52px sans-serif"; x2.textAlign = "center"; x2.fillText(text[0], 256, 86); x2.font = "40px sans-serif"; x2.fillText(text[1], 256, 146);
          const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; stage.trackTexture(tex);
          grp.add(box(stage, 3.2, 1.2, 0.08, stage.material("#ffffff", { map: tex, roughness: 0.6 }), 0, 3.2, 0));
          stage.add(grp);
        };
        sign(8, ["KARAKORAM HWY", "N-35 · Khunjerab 108 km"]);
        sign(130, ["喀喇昆仑公路", "G314 · 塔什库尔干"]);
        sign(250, ["Passu · Sost", "Hunza Valley ←"]);
        /* a decorated "jingle" truck parked in a lay-by */
        const ti = 40, ta = ROAD[ti], tb = ROAD[ti + 1], ty = Math.atan2(tb.x - ta.x, tb.z - ta.z);
        const truck = new THREE.Group();
        truck.position.set(ta.x + Math.cos(ty) * 6.2, hgt(ta.x + Math.cos(ty) * 6.2, ta.z - Math.sin(ty) * 6.2), ta.z - Math.sin(ty) * 6.2);
        truck.rotation.y = ty;
        const art = (() => {
          const c = document.createElement("canvas"); c.width = 256; c.height = 256; const x2 = c.getContext("2d");
          const cols = ["#e8402a", "#f2c230", "#2a9a5a", "#2a6ab8", "#e86ab0", "#ffffff"];
          for (let k = 0; k < 18; k += 1) { x2.fillStyle = cols[k % cols.length]; x2.fillRect(0, k * 14.2, 256, 14.2); }
          for (let k = 0; k < 40; k += 1) { x2.fillStyle = cols[(k * 7) % cols.length]; x2.beginPath(); x2.arc((k * 53) % 256, (k * 97) % 256, 10 + (k % 4) * 4, 0, Math.PI * 2); x2.fill(); }
          const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; stage.trackTexture(t); return t;
        })();
        const artM = stage.material("#ffffff", { map: art, roughness: 0.6 });
        truck.add(box(stage, 2.5, 1.0, 9, stage.material("#2a2a2a"), 0, 1.0, 0));
        truck.add(box(stage, 2.5, 2.2, 2.4, artM, 0, 2.6, 3.3));
        truck.add(box(stage, 2.6, 2.6, 6.2, artM, 0, 2.8, -1.2));
        truck.add(box(stage, 2.3, 1.2, 0.8, artM, 0, 4.4, 4.2));
        truck.add(box(stage, 2.0, 0.9, 0.06, stage.material("#3a5868", { roughness: 0.3 }), 0, 3.0, 4.52));
        for (const [wx, wz] of [[-1.2, 3], [1.2, 3], [-1.2, -2.6], [1.2, -2.6], [-1.2, -3.8], [1.2, -3.8]]) {
          const w = mesh(stage, new THREE.CylinderGeometry(0.55, 0.55, 0.4, 14), stage.material("#1d1d1d"), wx, 0.55, wz);
          w.rotation.z = Math.PI / 2;
          truck.add(w);
        }
        stage.add(truck);
        W.interactive("jo-kkh", truck, "Karakoram Highway", [ta.x + Math.cos(ty) * 6.2 - Math.sin(ty) * 7, ta.z - Math.sin(ty) * 6.2 - Math.cos(ty) * 7], { radius: 16, labelOffset: 1.4 });
      }
      makePath([[0, 36], [2, 46], [4, 55]], 3.0);
      makePath([[0, 36], [4, 22], [8, 10], [-6, -8], [0, -25]], 3.2);
      makePath([[0, -25], [16, -36], [28, -42], [35, -50]], 2.8);
      makePath([[0, -25], [-16, -32], [-28, -40], [-35, -45]], 2.8);
      makePath([[0, 30], [-12, 30], [-24, 30]], 3.0);

      const peaks = [
        [-46, -72, 58, 28, "#4c6070", 0.36],
        [-20, -78, 78, 36, "#465a6b", 0.34],
        [6, -80, 70, 32, "#526777", 0.38],
        [32, -76, 60, 28, "#5a6f7f", 0.4],
        [58, -70, 48, 22, "#617482", 0.44],
      ];
      peaks.forEach(([x, z, h, r, color, snow], i) => {
        const peak = mountain(h, r, color, "#f5f1e6", snow, 7);
        peak.position.set(x, 0, z);
        peak.rotation.y = i * 0.7;
        stage.add(peak);
      });

      const treeSpots = [
        [-14, 18], [14, 18], [-10, -4], [12, -8], [-18, -18], [18, -26],
        [-38, 20], [-44, 34], [42, -40], [46, -56],
      ];
      treeSpots.forEach(([x, z], i) => {
        const t = i % 3 === 0 ? pine(x, z, 0.8, "#315b4c") : tree(x, z, 0.8 + (i % 2) * 0.1, "#557550", i % 4 === 0 ? "#e7b4ac" : null);
        t.position.y = hgt(x, z);
        stage.add(t);
      });

    },
    upgrade: {
      grass: { density: (x, z) => { const h = heightFn(x, z); const r = roadNear(x, z); return (h < 20 ? 0.9 : 0.3) * (r && r.d < 5 ? 0 : 1); }, colors: ["#4e6a30", "#a3a865"], count: 3000 },
      clouds: { coverage: 0.5, scale: 1.4, speed: 0.006 },
      post: { grade: { tint: "#f6f9ff", contrast: 1.07, saturation: 1.05, vignette: 0.28 } },
      animals: (fa, { W: Wk }) => {
        const id = (k) => animalId("journey", k);
        /* drive the highway */
        const a = ROAD[2], b = ROAD[3];
        fa.rideJeep({ x: a.x, z: a.z, yaw: Math.atan2(b.x - a.x, b.z - a.z), label: { en: "the jeep (Karakoram Highway)", zh: "吉普车（喀喇昆仑公路）" }, color: "#e6e0d0" });
        fa.herd({ id: id("yak"), kind: "yak", count: 5, cx: -48, cz: 40, R: 10, speed: 0.5, opts: (i) => (i % 3 === 0 ? { patch: true } : {}) });
        fa.rideAnimal({ kind: "yak", x: -10, z: 38, yaw: -1.2, label: { en: "a yak", zh: "牦牛" }, id: id("yak") });
        fa.herd({ id: id("horse"), kind: "horse", count: 3, cx: 26, cz: 30, R: 8, speed: 0.6, opts: (i) => ({ color: ["#6a4a30", "#2a2420", "#c8b8a0"][i % 3] }) });
        fa.herd({ id: id("bharal"), kind: "ibex", count: 6, cx: 52, cz: -46, R: 10, speed: 1.1, wild: true, flee: 12, opts: { color: "#8a8478" } });
        fa.herd({ id: id("snowleopard"), kind: "snowleopard", count: 1, cx: -50, cz: -56, R: 6, speed: 0.8, wild: true, flee: 16 });
        fa.soar({ id: id("vulture"), kind: "vulture", count: 2, cx: 10, cz: -30, R: 40, h: 62 });
        fa.soar({ id: id("eagle"), kind: "eagle", count: 1, cx: -30, cz: 10, R: 30, h: 48 });
      },
    },
    people: (W) => {
      const mix = ["trekker", "porter", "elder", "hunza-man", "hunza-woman", "schoolgirl"];
      const add = (cx, cz, radius, count) => {
        for (let i = 0; i < count; i += 1) {
          const a = Math.random() * Math.PI * 2;
          const d = 4 + Math.random() * radius;
          W.addNpc({
            kind: Math.random() < 0.4 ? "idle" : "wander",
            cx,
            cz,
            R: radius,
            x: cx + Math.cos(a) * d,
            z: cz + Math.sin(a) * d,
            tx: 0,
            tz: 0,
            wait: Math.random() * 4,
            design: W.pick(mix),
          });
        }
      };
      add(0, 30, 12, 10);
      add(0, -20, 8, 4);
      add(32, -46, 7, 3);
      add(-30, -40, 7, 3);
      add(-26, 30, 7, 3);
    },
  });
  if (cinemaVideo) W.video = cinemaVideo;
  return W;
}
