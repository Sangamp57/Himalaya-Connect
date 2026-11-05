import * as THREE from "three";
import { bird, cloud, mountain, pine, tree } from "../helpers.js";
import { buildWalkableTown } from "./walk-town.js";
import { fbm, ss, lerp } from "./walk-engine.js";

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

  function heightFn(x, z) {
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

  function colorFn(x, z, h) {
    const n = fbm(x * 0.06, z * 0.06, 3);
    if (h > 24) return new THREE.Color("#7b7564").lerp(new THREE.Color("#98917b"), n);
    if (h > 14) return new THREE.Color("#6f7d5a").lerp(new THREE.Color("#8a9168"), n);
    return new THREE.Color("#5e7d54").lerp(new THREE.Color("#7d925e"), n);
  }

  const W = buildWalkableTown({
    scene,
    stage,
    manager,
    seed: 20261114,
    terrain: { heightFn, colorFn, segments: 160 },
    places,
    startPlace: "trailhead",
    worldName: { en: "The Great Journey", zh: "\u4f1f\u5927\u65c5\u7a0b", sub: "\u0639\u0638\u06cc\u0645 \u0633\u0641\u0631" },
    mapBounds: { x0: -80, x1: 80, z0: -80, z1: 80 },
    mapLines: [
      [[0, 30], [8, 10], [-6, -8], [0, -25]],
      [[0, -25], [16, -36], [28, -42], [35, -50]],
      [[0, -25], [-16, -32], [-28, -40], [-35, -45]],
      [[0, 30], [-12, 30], [-30, 30]],
    ],
    mapColor: (x, z) => {
      const h = heightFn(x, z);
      if (h > 24) return [123, 117, 100];
      if (h > 14) return [111, 125, 90];
      return [94, 125, 84];
    },
    fogDensity: 0.0007,
    exposureScale: 0.94,
    build: ({ kit, W, stage, hgt, makePath }) => {
      const trailhead = buildTrailheadSign(stage);
      trailhead.position.set(0, hgt(0, 30), 30);
      trailhead.rotation.y = 0.4;
      stage.add(trailhead);
      W.interactive("jo-trailhead", trailhead, "Trailhead", [3, 30], { radius: 14, labelOffset: 1.5 });

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

      const clouds = [];
      for (let i = 0; i < 5; i += 1) {
        const c = cloud(1.5 + (i % 3) * 0.4);
        c.position.set(-40 + i * 20, 20 + (i % 3) * 2, -60 - (i % 2) * 6);
        stage.add(c);
        clouds.push({ mesh: c, speed: 0.15 + i * 0.03 });
      }
      for (let i = 0; i < 5; i += 1) {
        stage.add(bird(-30 + i * 15, 16 + i * 0.6, -24 - i * 4));
      }
      stage.animate((time, delta) => {
        if (stage.reducedMotion) return;
        clouds.forEach((c) => {
          c.mesh.position.x += c.speed * delta;
          if (c.mesh.position.x > 80) c.mesh.position.x = -80;
        });
      });
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
