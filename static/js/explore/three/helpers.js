import * as THREE from "three";

const srgb = (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

export function makeCanvasTexture(width, height, draw, { repeat = [1, 1] } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 4;
  return srgb(texture);
}

export function brickTexture(base = "#9c4c34", mortar = "#6f382b", repeat = [3, 3]) {
  return makeCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = mortar;
      ctx.fillRect(0, 0, w, h);
      const rows = 10;
      const rowHeight = h / rows;
      const brickWidth = w / 5;
      for (let row = 0; row < rows; row += 1) {
        const offset = row % 2 === 0 ? 0 : brickWidth / 2;
        for (let col = -1; col < 6; col += 1) {
          const x = col * brickWidth + offset + 2;
          const y = row * rowHeight + 2;
          const jitter = ((row * 13 + col * 7) % 9) - 4;
          const shade = 20 + jitter;
          ctx.fillStyle = base;
          ctx.globalAlpha = 1;
          ctx.fillRect(x, y, brickWidth - 4, rowHeight - 4);
          ctx.fillStyle = `rgba(255,255,255,${0.035 + (shade % 4) * 0.01})`;
          ctx.fillRect(x, y, brickWidth - 4, 2);
          ctx.fillStyle = "rgba(0,0,0,.06)";
          ctx.fillRect(x, y + rowHeight - 6, brickWidth - 4, 2);
        }
      }
      ctx.globalAlpha = 1;
    },
    { repeat }
  );
}

export function stoneTexture(base = "#8b8477", dark = "#615c53", repeat = [3, 3]) {
  return makeCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, w, h);
      let seed = 24;
      const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      for (let row = 0; row < 7; row += 1) {
        let x = -10 + random() * 16;
        const y = (row * h) / 7;
        while (x < w) {
          const bw = 26 + random() * 35;
          const bh = h / 7 - 3;
          ctx.fillStyle = base;
          ctx.globalAlpha = 0.82 + random() * 0.18;
          ctx.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 2);
          ctx.globalAlpha = 0.16;
          ctx.fillStyle = "#fff9e9";
          ctx.fillRect(x + 3, y + 3, bw - 6, 2);
          x += bw;
        }
      }
      ctx.globalAlpha = 1;
    },
    { repeat }
  );
}

export function woodTexture(base = "#704225", line = "#3f2315", repeat = [2, 2]) {
  return makeCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 34; i += 1) {
        const x = (i / 34) * w + Math.sin(i * 2.7) * 4;
        ctx.strokeStyle = line;
        ctx.globalAlpha = 0.08 + (i % 5) * 0.012;
        ctx.lineWidth = 1 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 8, h * 0.3, x - 5, h * 0.7, x + 2, h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    { repeat }
  );
}

export function tileTexture(base = "#9f4f35", line = "#763929", repeat = [4, 4]) {
  return makeCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = line;
      ctx.lineWidth = 3;
      for (let y = 0; y <= h; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let row = 0; row < 12; row += 1) {
        const offset = row % 2 === 0 ? 0 : 16;
        for (let x = offset; x < w; x += 32) {
          ctx.strokeStyle = "rgba(0,0,0,.12)";
          ctx.beginPath();
          ctx.moveTo(x, row * 22);
          ctx.lineTo(x, row * 22 + 22);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#ffe9bf";
      for (let i = 0; i < 80; i += 1) {
        ctx.fillRect((i * 47) % w, (i * 83) % h, 2, 2);
      }
      ctx.globalAlpha = 1;
    },
    { repeat }
  );
}

export function pavingTexture(base = "#a89273", line = "#79684f", repeat = [6, 6]) {
  return makeCanvasTexture(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = line;
      ctx.fillRect(0, 0, w, h);
      const cell = 64;
      for (let row = 0; row < 8; row += 1) {
        for (let col = 0; col < 8; col += 1) {
          const inset = 2;
          const shade = 10 + ((row * 9 + col * 5) % 12);
          ctx.fillStyle = base;
          ctx.globalAlpha = 0.88 + (shade % 5) * 0.02;
          ctx.fillRect(col * cell + inset, row * cell + inset, cell - inset * 2, cell - inset * 2);
          ctx.fillStyle = "rgba(255,255,255,.045)";
          ctx.fillRect(col * cell + inset, row * cell + inset, cell - inset * 2, 2);
        }
      }
      ctx.globalAlpha = 1;
    },
    { repeat }
  );
}

export function createSky(scene, { top = "#1a3f5f", bottom = "#f6c98a", fog = "#d9b98d", near = 42, far = 115 } = {}) {
  const geometry = new THREE.SphereGeometry(140, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(top) },
      bottomColor: { value: new THREE.Color(bottom) },
      offset: { value: 10 },
      exponent: { value: 0.72 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        float gradient = pow(max(h, 0.0), exponent);
        gl_FragColor = vec4(mix(bottomColor, topColor, gradient), 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.name = "sky";
  scene.add(sky);
  scene.fog = new THREE.Fog(new THREE.Color(fog), near, far);
  return sky;
}

export function addLighting(scene, { shadows = true, sun = [18, 28, 14], color = "#ffd7a0", intensity = 2.2, ambient = 1.2 } = {}) {
  const hemisphere = new THREE.HemisphereLight("#cce7ff", "#6b4833", ambient);
  scene.add(hemisphere);

  const directional = new THREE.DirectionalLight(color, intensity);
  directional.position.set(...sun);
  directional.castShadow = shadows;
  if (shadows) {
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.camera.near = 1;
    directional.shadow.camera.far = 90;
    directional.shadow.camera.left = -28;
    directional.shadow.camera.right = 28;
    directional.shadow.camera.top = 28;
    directional.shadow.camera.bottom = -28;
    directional.shadow.bias = -0.0006;
    directional.shadow.normalBias = 0.02;
  }
  scene.add(directional);

  const rim = new THREE.DirectionalLight("#8fb7d8", 0.7);
  rim.position.set(-18, 12, -20);
  scene.add(rim);

  return { hemisphere, directional, rim };
}

export function addSun(scene, { position = [-35, 28, -42], color = "#ffdca8", size = 5 } = {}) {
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(size, 24, 16),
    new THREE.MeshBasicMaterial({ color, fog: false })
  );
  sun.position.set(...position);
  scene.add(sun);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(size * 1.7, 24, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, depthWrite: false, fog: false })
  );
  glow.position.copy(sun.position);
  scene.add(glow);
  return sun;
}

export function mountain(height, radius, color = "#55606f", snowColor = "#f3f0e7", snowRatio = 0.3, segments = 7) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.94,
    flatShading: true,
  });
  const base = new THREE.Mesh(new THREE.ConeGeometry(radius, height, segments, 2), material);
  base.position.y = height / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  if (snowRatio > 0) {
    const capRadius = radius * snowRatio * 1.035;
    const capHeight = height * snowRatio;
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(capRadius, capHeight, segments, 1),
      new THREE.MeshStandardMaterial({
        color: snowColor,
        roughness: 0.86,
        flatShading: true,
        emissive: new THREE.Color(snowColor).multiplyScalar(0.08),
      })
    );
    cap.position.y = height - capHeight / 2 + 0.02;
    cap.castShadow = true;
    group.add(cap);
  }
  group.userData.type = "mountain";
  return group;
}

export function tree(x, z, scale = 1, foliage = "#4f7a4e", blossom = null, trunk = "#5a3d29") {
  const group = new THREE.Group();
  const trunkMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * scale, 0.19 * scale, 1.2 * scale, 6),
    new THREE.MeshStandardMaterial({ color: trunk, roughness: 1, flatShading: true })
  );
  trunkMesh.position.y = 0.6 * scale;
  trunkMesh.castShadow = true;
  group.add(trunkMesh);
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: blossom || foliage,
    roughness: 0.92,
    flatShading: true,
  });
  const positions = [
    [0, 1.55, 0, 0.72],
    [-0.45, 1.9, 0.18, 0.5],
    [0.44, 1.84, -0.12, 0.48],
    [0.1, 2.22, 0.1, 0.38],
  ];
  positions.forEach(([px, py, pz, radius]) => {
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * scale, 0), foliageMaterial);
    leaves.position.set(px * scale, py * scale, pz * scale);
    leaves.castShadow = true;
    group.add(leaves);
  });
  group.position.set(x, 0, z);
  return group;
}

export function pine(x, z, scale = 1, color = "#2f5a4c") {
  const group = new THREE.Group();
  const trunkMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1 * scale, 0.15 * scale, 1 * scale, 5),
    new THREE.MeshStandardMaterial({ color: "#4a3424", roughness: 1, flatShading: true })
  );
  trunkMesh.position.y = 0.5 * scale;
  group.add(trunkMesh);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
  [1.3, 1.9, 2.4].forEach((height, index) => {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry((0.72 - index * 0.14) * scale, 0.95 * scale, 6),
      material
    );
    cone.position.y = height * scale;
    cone.castShadow = true;
    group.add(cone);
  });
  group.position.set(x, 0, z);
  return group;
}

export function cloud(scale = 1, material) {
  const group = new THREE.Group();
  const cloudMaterial =
    material ||
    new THREE.MeshBasicMaterial({
      color: "#f6f1e6",
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      fog: true,
    });
  const blobs = [
    [0, 0, 0, 1.1],
    [1.05, 0.22, 0.15, 0.8],
    [-1.0, 0.06, -0.1, 0.72],
    [0.45, 0.52, -0.35, 0.58],
    [-0.35, 0.32, 0.4, 0.62],
  ];
  blobs.forEach(([x, y, z, r]) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 10, 8), cloudMaterial);
    mesh.position.set(x * scale, y * scale, z * scale);
    mesh.scale.y = 0.42;
    group.add(mesh);
  });
  return group;
}

export function bird(x, y, z, color = "#2b3034") {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const wingGeometry = new THREE.BufferGeometry();
  wingGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 0.38, 0.04, 0, 0.08, -0.12, 0], 3)
  );
  wingGeometry.computeVertexNormals();
  const left = new THREE.Mesh(wingGeometry, material);
  const right = new THREE.Mesh(wingGeometry, material);
  right.scale.x = -1;
  group.add(left, right);
  group.position.set(x, y, z);
  return group;
}

export class TextLabel {
  constructor(text, { accent = "#e6bc6a", dir = "ltr", size = 38, padding = 18, worldScale = 0.012 } = {}) {
    this.text = text;
    this.accent = accent;
    this.dir = dir;
    this.size = size;
    this.padding = padding;
    this.worldScale = worldScale;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.renderOrder = 20;
    this.redraw();
  }

  redraw() {
    const ctx = this.ctx;
    const scale = 2;
    const fontSize = this.size;
    ctx.font = `700 ${fontSize}px Manrope, "Nirmala UI", "Microsoft YaHei", "Noto Nastaliq Urdu", sans-serif`;
    const measured = ctx.measureText(this.text);
    const width = Math.ceil(measured.width + this.padding * 4);
    const height = 84;
    this.canvas.width = width * scale;
    this.canvas.height = height * scale;
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(7, 22, 27, 0.78)";
    ctx.strokeStyle = "rgba(230, 188, 106, 0.7)";
    ctx.lineWidth = 2;
    const radius = 28;
    const x = 2;
    const y = 2;
    const w = width - 4;
    const h = height - 4;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.accent;
    ctx.beginPath();
    ctx.arc(this.padding + 7, height / 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8e9";
    ctx.textBaseline = "middle";
    ctx.direction = this.dir === "rtl" ? "rtl" : "ltr";
    ctx.textAlign = "left";
    const textX = this.dir === "rtl" ? width - this.padding - 8 : this.padding + 20;
    ctx.fillText(this.text, textX, height / 2 + 1);
    this.texture.needsUpdate = true;
    this.material.map = this.texture;
    const ratio = width / height;
    this.sprite.scale.set(0.95 * ratio, 0.95, 1);
  }

  setText(text, dir = this.dir) {
    if (text === this.text && dir === this.dir) return;
    this.text = text;
    this.dir = dir;
    this.redraw();
  }

  dispose() {
    this.texture.dispose();
    this.material.dispose();
  }
}

export class WorldStage {
  constructor({ scene, quality = "auto", reducedMotion = false, lang = "en", dir = "ltr" }) {
    this.scene = scene;
    this.quality = quality;
    this.reducedMotion = reducedMotion;
    this.lang = lang;
    this.dir = dir;
    this.root = new THREE.Group();
    this.root.name = "world-root";
    this.scene.add(this.root);
    this.interactives = [];
    this.labels = [];
    this.animations = [];
    this.materials = new Set();
    this.geometries = new Set();
    this.textures = new Set();
    this.selectedId = null;
    this.time = 0;
    this.materialCache = new Map();
  }

  add(...objects) {
    objects.flat().forEach((object) => {
      if (object) this.root.add(object);
    });
    return this;
  }

  animate(fn) {
    this.animations.push(fn);
    return this;
  }

  material(color, options = {}) {
    const {
      roughness = 0.9,
      metalness = 0,
      flatShading = true,
      transparent = false,
      opacity = 1,
      emissive = null,
      emissiveIntensity = 0,
      map = null,
      side = THREE.FrontSide,
      vertexColors = false,
    } = options;
    const em = emissive && emissive.isColor ? emissive.getHexString() : emissive;
    const key = [color, roughness, metalness, flatShading, transparent, opacity, em, emissiveIntensity, map?.uuid || "", side, vertexColors].join("|");
    if (this.materialCache.has(key)) return this.materialCache.get(key);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      flatShading,
      transparent,
      opacity,
      emissive: emissive || 0x000000,
      emissiveIntensity,
      map,
      side,
      vertexColors,
    });
    this.materials.add(material);
    if (map) this.textures.add(map);
    this.materialCache.set(key, material);
    return material;
  }

  basicMaterial(color, options = {}) {
    const { transparent = false, opacity = 1, side = THREE.FrontSide, map = null, fog = true } = options;
    const key = ["basic", color, transparent, opacity, side, map?.uuid || "", fog].join("|");
    if (this.materialCache.has(key)) return this.materialCache.get(key);
    const material = new THREE.MeshBasicMaterial({ color, transparent, opacity, side, map, fog });
    this.materials.add(material);
    if (map) this.textures.add(map);
    this.materialCache.set(key, material);
    return material;
  }

  trackGeometry(geometry) {
    this.geometries.add(geometry);
    return geometry;
  }

  trackTexture(texture) {
    this.textures.add(texture);
    return texture;
  }

  addInteractive(id, group, options = {}) {
    this.root.add(group);
    this.root.updateMatrixWorld(true);
    group.userData.objectId = id;
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) {
      box.setFromCenterAndSize(group.position.clone(), new THREE.Vector3(3, 3, 3));
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const pad = options.hitPadding || 0.65;
    const hitGeometry = this.trackGeometry(
      new THREE.BoxGeometry(Math.max(1.4, size.x + pad * 2), Math.max(1.4, size.y + pad), Math.max(1.4, size.z + pad * 2))
    );
    const hitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const hit = new THREE.Mesh(hitGeometry, hitMaterial);
    hit.position.copy(center);
    hit.userData.objectId = id;
    hit.userData.isHitArea = true;
    group.add(hit);

    const interactiveMaterials = [];
    const materialClones = new Map();
    group.traverse((child) => {
      if (child.isMesh && child.material && !child.userData.isHitArea) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        const replacements = materials.map((material) => {
          let clone = materialClones.get(material);
          if (!clone) {
            clone = material.clone();
            materialClones.set(material, clone);
            this.materials.add(clone);
            interactiveMaterials.push({
              material: clone,
              emissive: clone.emissive ? clone.emissive.clone() : null,
            });
          }
          return clone;
        });
        child.material = Array.isArray(child.material) ? replacements : replacements[0];
      }
    });

    const focusPoint = options.focus
      ? new THREE.Vector3(
          Array.isArray(options.focus) ? options.focus[0] : options.focus.x,
          Array.isArray(options.focus) ? options.focus[1] : options.focus.y,
          Array.isArray(options.focus) ? options.focus[2] : options.focus.z
        )
      : new THREE.Vector3(center.x, Math.min(box.max.y, center.y + size.y * 0.15), center.z);
    const beaconY = options.beaconY ?? Math.max(0.14, box.min.y + 0.08);
    const beaconPosition = options.beaconPosition
      ? new THREE.Vector3(...options.beaconPosition)
      : new THREE.Vector3(center.x, beaconY, center.z);
    const beacon = this.createBeacon(beaconPosition, options.accent || "#e6bc6a");
    this.root.add(beacon.group);

    const labelText = options.label || "";
    const label = new TextLabel(labelText, { accent: options.accent || "#e6bc6a", dir: this.dir });
    label.sprite.position.set(center.x, box.max.y + (options.labelOffset || 0.85), center.z);
    label.sprite.visible = !options.hideLabel;
    this.root.add(label.sprite);
    this.labels.push({ id, label });

    const entry = {
      id,
      group,
      focus: focusPoint,
      radius: options.radius || 9,
      beacon,
      label,
      interactiveMaterials,
      baseScale: group.scale.clone(),
      selectedRing: null,
    };
    this.interactives.push(entry);
    this.animate((time) => {
      entry.beacon.pulse(time, this.reducedMotion);
      if (label.sprite) {
        const baseY = box.max.y + (options.labelOffset || 0.85);
        label.sprite.position.y = baseY + (this.reducedMotion ? 0 : Math.sin(time * 1.4 + center.x) * 0.035);
      }
      if (entry.selectedRing) {
        entry.selectedRing.rotation.z += 0.0035;
      }
    });
    return entry;
  }

  createBeacon(position, accent) {
    const group = new THREE.Group();
    group.position.copy(position);
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.06, 2.55, 6, 1, true),
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    shaft.position.y = 1.25;
    group.add(shaft);
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshBasicMaterial({ color: accent, toneMapped: false })
    );
    gem.position.y = 2.65;
    group.add(gem);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.43, 32),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    group.add(ring);
    const selectedRing = new THREE.Mesh(
      new THREE.RingGeometry(0.74, 0.84, 48),
      new THREE.MeshBasicMaterial({ color: "#f7e0a9", transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false })
    );
    selectedRing.rotation.x = -Math.PI / 2;
    selectedRing.position.y = 0.06;
    selectedRing.visible = false;
    group.add(selectedRing);

    let collected = false;
    return {
      group,
      gem,
      shaft,
      ring,
      selectedRing,
      setCollected(value) {
        collected = value;
        const color = collected ? "#79d7b0" : accent;
        gem.material.color.set(color);
        shaft.material.color.set(color);
        ring.material.color.set(color);
        shaft.material.opacity = collected ? 0.18 : 0.34;
      },
      setSelected(value) {
        selectedRing.visible = value;
        gem.scale.setScalar(value ? 1.35 : 1);
      },
      pulse(time, reduced) {
        if (!reduced) {
          gem.position.y = 2.65 + Math.sin(time * 2.2 + position.x) * 0.08;
          gem.rotation.y += 0.018;
          ring.scale.setScalar(1 + Math.sin(time * 1.8 + position.z) * 0.06);
        }
      },
    };
  }

  setSelected(id) {
    this.selectedId = id;
    this.interactives.forEach((entry) => {
      const selected = entry.id === id;
      entry.beacon.setSelected(selected);
      entry.interactiveMaterials.forEach(({ material, emissive }) => {
        if (!material.emissive) return;
        if (selected) {
          material.emissive.set("#7a4a11");
          material.emissiveIntensity = 0.48;
        } else {
          material.emissive.copy(emissive || new THREE.Color(0x000000));
          material.emissiveIntensity = 0;
        }
      });
      const targetScale = selected ? 1.035 : 1;
      if (entry.baseScale) {
        entry.group.scale.set(
          entry.baseScale.x * targetScale,
          entry.baseScale.y * targetScale,
          entry.baseScale.z * targetScale
        );
      }
      if (selected && !entry.selectedRing) {
        entry.selectedRing = entry.beacon.selectedRing;
      }
    });
  }

  markCollected(id) {
    const entry = this.interactives.find((item) => item.id === id);
    if (entry) entry.beacon.setCollected(true);
  }

  setLabel(id, text, dir = this.dir) {
    const entry = this.labels.find((item) => item.id === id);
    if (entry) entry.label.setText(text, dir);
  }

  update(time, delta) {
    this.time = time;
    this.animations.forEach((fn) => fn(time, delta));
  }

  findInteractiveByObject(object) {
    let current = object;
    while (current) {
      if (current.userData?.objectId) return current.userData.objectId;
      current = current.parent;
    }
    return null;
  }

  raycast(raycaster) {
    const hits = raycaster.intersectObjects(
      this.interactives.map((entry) => entry.group),
      true
    );
    for (const hit of hits) {
      const id = this.findInteractiveByObject(hit.object);
      if (id) return id;
    }
    return null;
  }

  dispose() {
    this.interactives.forEach((entry) => entry.label.dispose());
    const geometries = new Set(this.geometries);
    const materials = new Set(this.materials);
    this.root.traverse((child) => {
      if (child.geometry) geometries.add(child.geometry);
      if (child.material) {
        const list = Array.isArray(child.material) ? child.material : [child.material];
        list.forEach((material) => materials.add(material));
      }
    });
    materials.forEach((material) => {
      if (material.map && material.map.dispose) material.map.dispose();
      material.dispose?.();
    });
    geometries.forEach((geometry) => geometry.dispose?.());
    this.textures.forEach((texture) => texture.dispose?.());
    this.scene.remove(this.root);
    this.interactives = [];
    this.labels = [];
    this.animations = [];
    this.materials.clear();
    this.geometries.clear();
    this.textures.clear();
  }
}

export const colors = {
  brick: "#a34e36",
  brickDark: "#7c3a2b",
  timber: "#5f3622",
  timberLight: "#8b5b36",
  gold: "#d8a33e",
  goldLight: "#f0ce86",
  ivory: "#f6ead2",
  ink: "#14242b",
  jade: "#2c6f55",
  jadeLight: "#6c9e78",
  turquoise: "#5bb6ad",
  terracotta: "#b4492f",
  ochre: "#c88a3f",
  stone: "#8b8174",
  stoneDark: "#5d574e",
  snow: "#f5f0e5",
  water: "#5b9dba",
  waterDeep: "#2d617c",
  night: "#0b1b2b",
  dusk: "#233c51",
};


