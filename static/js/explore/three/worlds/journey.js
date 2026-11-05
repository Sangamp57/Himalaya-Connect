import * as THREE from "three";
import {
  addLighting,
  addSun,
  bird,
  cloud,
  createSky,
  mountain,
  pine,
  tree,
} from "../helpers.js";

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

export default function buildJourney({ scene, stage }) {
  const detail = stage.quality !== "low";
  createSky(scene, {
    top: "#12263f",
    bottom: "#e2aa65",
    fog: "#c8a17a",
    near: 46,
    far: 120,
  });
  addLighting(scene, { shadows: detail, sun: [20, 30, 16], color: "#ffd9a1", intensity: 2.5, ambient: 1.3 });
  addSun(scene, { position: [-36, 26, -44], size: 4.4, color: "#ffdca8" });

  const ground = box(stage, 70, 0.8, 60, stage.material("#6f6a58", { roughness: 1 }), 0, -0.4, 0);
  ground.receiveShadow = true;
  stage.add(ground);

  // A winding high road from the trailhead toward the back pass.
  const roadMat = stage.material("#4b4743", { roughness: 0.95 });
  const roadPoints = [];
  for (let index = 0; index <= 11; index += 1) {
    const t = index / 11;
    roadPoints.push([Math.sin(t * Math.PI * 1.15) * 13, 0.02, -20 + t * 38]);
  }
  for (let index = 0; index < roadPoints.length - 1; index += 1) {
    const [x1, , z1] = roadPoints[index];
    const [x2, , z2] = roadPoints[index + 1];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const seg = box(stage, 2.8, 0.08, len + 0.5, roadMat, (x1 + x2) / 2, 0.05, (z1 + z2) / 2);
    seg.rotation.y = Math.atan2(dx, dz);
    stage.add(seg);
  }

  const mountainPalette = ["#4a5d72", "#54697d", "#5e7489"];
  const ranges = [
    [-28, -30, 20, 17, 0],
    [-18, -34, 24, 21, 1],
    [0, -38, 26, 24, 2],
    [20, -33, 22, 19, 1],
    [30, -30, 16, 15, 0],
    [-26, 24, 18, 15, 1],
    [26, 28, 20, 18, 2],
  ];
  ranges.forEach(([x, z, height, radius, paletteIndex], index) => {
    const peak = mountain(height, radius, mountainPalette[paletteIndex], "#f5f1e7", 0.34, detail ? 7 : 5);
    peak.position.set(x, 0.5, z);
    peak.rotation.y = index * 0.7;
    stage.add(peak);
  });

  const trailhead = buildTrailheadSign(stage);
  stage.add(trailhead);
  stage.addInteractive("jo-trailhead", trailhead, {
    label: "Trailhead",
    accent: "#e6bc6a",
    focus: [-6.5, 1.4, -14],
    radius: 9,
    beaconPosition: [-5.6, 0.15, -12.6],
  });

  const cairn = buildCairn(stage);
  stage.add(cairn);
  stage.addInteractive("jo-cairn", cairn, {
    label: "Stone cairn",
    accent: "#e6bc6a",
    focus: [7.2, 1.8, -6],
    radius: 8,
    beaconPosition: [7.2, 0.12, -4.5],
  });

  const ridge = buildPrayerFlagRidge(stage);
  stage.add(ridge);
  stage.addInteractive("jo-flag", ridge, {
    label: "Prayer flags",
    accent: "#e6bc6a",
    focus: [-7.5, 2.2, 8],
    radius: 9,
    beaconPosition: [-7.5, 0.14, 10],
  });

  const cinema = buildCinema(stage, { x: 0, y: 0, z: 12, rotation: 0 });
  stage.add(cinema.group);
  stage.addInteractive("video:everest", cinema.group, {
    label: "Everest time-lapse",
    accent: "#e6bc6a",
    focus: [0, 2.8, 12],
    radius: 13,
    beaconPosition: [0, 0.18, 9.2],
    labelOffset: 0.6,
  });

  const trees = [
    tree(-11, -12, 1.1, "#4f7757", "#e7a9a0"),
    tree(11, -13, 0.9, "#547655", "#e6b7b0"),
    tree(-12, -4, 0.85, "#4c7253", null),
    tree(12, 0, 1.0, "#55764f", "#e5aaa1"),
    pine(-9, -18, 0.7, "#385d50"),
    pine(9, -18, 0.72, "#355a4d"),
  ];
  stage.add(...trees);

  const clouds = [];
  for (let index = 0; index < (detail ? 6 : 3); index += 1) {
    const cloudGroup = cloud(1.3 + (index % 3) * 0.4);
    cloudGroup.position.set(-24 + index * 9, 13 + (index % 3) * 1.8, -34 - (index % 2) * 8);
    stage.add(cloudGroup);
    clouds.push({ mesh: cloudGroup, speed: 0.12 + index * 0.025 });
  }
  stage.animate((time, delta) => {
    if (stage.reducedMotion) return;
    clouds.forEach((item) => {
      item.mesh.position.x += item.speed * delta;
      if (item.mesh.position.x > 32) item.mesh.position.x = -34;
    });
  });

  for (let index = 0; index < (detail ? 3 : 1); index += 1) {
    const flying = bird(-8 + index * 8, 14 + index, -16 + index * 4);
    stage.add(flying);
    stage.animate((time, delta) => {
      if (stage.reducedMotion) return;
      flying.position.x += delta * (0.6 + index * 0.15);
      flying.position.y = 14 + Math.sin(time * 0.7 + index) * 0.35;
      if (flying.position.x > 26) flying.position.x = -26;
    });
  }

  const haze = new THREE.PointLight("#ffbd72", 3, 20, 2);
  haze.position.set(0, 4, 10);
  scene.add(haze);

  return { objectId: "journey", video: cinema.video };
}
