import * as THREE from "three";
import { OrbitController } from "./controls.js";
import { WorldStage } from "./helpers.js";

export function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (error) {
    return false;
  }
}

export class SceneManager {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.container = options.container || canvas.parentElement;
    this.onSelect = options.onSelect || (() => {});
    this.onDeselect = options.onDeselect || (() => {});
    this.onHover = options.onHover || (() => {});
    this.onError = options.onError || (() => {});
    this.quality = options.quality || "auto";
    this.reducedMotion = Boolean(options.reducedMotion);
    this.language = options.language || "en";
    this.dir = options.dir || "ltr";
    this.mobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760;
    this.lowPower = this.mobile || this.quality === "low";
    this.scene = new THREE.Scene();
    this.stage = null;
    this.currentWorldId = null;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hoverThrottle = 0;
    this.clock = new THREE.Clock();
    this.running = true;
    this.lastWorldConfig = null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.lowPower,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowPower ? 1.35 : 1.85));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = !this.lowPower;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(43, 1, 0.1, 280);
    this.camera.position.set(18, 13, 20);

    this.controls = new OrbitController(this.camera, canvas, {
      target: [0, 2, 0],
      radius: 22,
      theta: 0.76,
      phi: 1.08,
      minRadius: 7,
      maxRadius: 45,
      onTap: (event) => this.handleTap(event),
      onHoverMove: (event) => this.handleHover(event),
    });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.onWindowResize = () => this.resize();
    window.addEventListener("resize", this.onWindowResize);
    this.onPointerLeave = () => {
      this.canvas.style.cursor = "grab";
      this.onHover(null);
    };
    this.canvas.addEventListener("pointerleave", this.onPointerLeave);
    this.onVisibility = () => {
      this.running = !document.hidden;
      if (this.running) this.clock.getDelta();
    };
    document.addEventListener("visibilitychange", this.onVisibility);
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  tick() {
    if (!this.running) return;
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;
    if (this.stage) this.stage.update(elapsed, delta);
    this.controls.update(delta);
    /* a world may supply its own renderer (e.g. post-processing); otherwise draw directly */
    if (this.stage && typeof this.stage.render === "function") this.stage.render(this.renderer, this.scene, this.camera, delta);
    else this.renderer.render(this.scene, this.camera);
  }

  buildStage({ scene, lang = this.language, dir = this.dir }) {
    if (this.stage) this.stage.dispose();
    this.worldResult = null;
    this.scene = scene || new THREE.Scene();
    this.stage = new WorldStage({
      scene: this.scene,
      quality: this.lowPower ? "low" : this.quality,
      reducedMotion: this.reducedMotion,
      lang,
      dir,
    });
    return this.stage;
  }

  async loadWorld(worldId, config, builder) {
    this.lastWorldConfig = config;
    this.currentWorldId = worldId;
    this.controls.enabled = false;
    this.canvas.style.cursor = "default";
    const scene = new THREE.Scene();
    const stage = this.buildStage({ scene });
    try {
      const result = await builder({ scene, stage, THREE, manager: this });
      this.worldResult = result;
      const aspect = this.camera.aspect || 1;
      const distanceScale = aspect < 0.75 ? 1.5 : aspect < 1.05 ? 1.24 : 1;
      const target = config.target || [0, 2, 0];
      const position = config.position || [18, 13, 20];
      const scaledPosition = [
        target[0] + (position[0] - target[0]) * distanceScale,
        target[1] + (position[1] - target[1]) * distanceScale,
        target[2] + (position[2] - target[2]) * distanceScale,
      ];
      /* Every world gets a much wider zoom range than its authored home view.
         The old limits often started at the home radius, which made zoom-in
         impossible in Pokhara, Hunza, Skardu and the Great Journey. */
      const zoomMin = Math.max(3, (config.min || 7) * 0.5);
      const zoomMax = Math.max(zoomMin + 24, (config.max || 45) * 1.8);
      const min = zoomMin * distanceScale;
      const max = zoomMax * distanceScale;
      /* Allow a full horizontal 360 orbit and a much wider vertical arc.
         Walkable worlds still clamp the camera above the terrain. */
      this.controls.minPhi = 0.08;
      this.controls.maxPhi = 1.72;
      this.controls.setHome({
        position: scaledPosition,
        target,
        min,
        max,
      });
      this.controls.autoRotate = Boolean(config.autoRotate);
      this.controls.autoRotateSpeed = config.autoRotateSpeed || 0.035;
      this.controls.setLimitsForWorld(min, max);
      this.controls.enabled = true;
      this.resize();
      return result;
    } catch (error) {
      console.error("World build failed", error);
      this.onError(error);
      throw error;
    } finally {
      this.controls.enabled = true;
    }
  }

  markCollected(ids = []) {
    if (!this.stage) return;
    ids.forEach((id) => {
      this.stage.markCollected(id);
    });
  }

  selectObject(id, { focus = true } = {}) {
    if (!this.stage) return;
    this.stage.setSelected(id);
    if (focus) {
      const entry = this.stage.interactives.find((item) => item.id === id);
      if (entry) {
        const target = entry.focus.clone();
        this.controls.focusOn(target, {
          radius: this.mobile ? Math.max(9.5, entry.radius + 2.5) : entry.radius,
          duration: this.reducedMotion ? 1 : 950,
        });
      }
    }
  }

  clearSelection() {
    if (!this.stage) return;
    this.stage.setSelected(null);
  }

  focusObject(id) {
    if (!this.stage) return;
    const entry = this.stage.interactives.find((item) => item.id === id);
    if (!entry) return;
    this.controls.focusOn(entry.focus, {
      radius: this.mobile ? Math.max(9.5, entry.radius + 2.5) : entry.radius,
      duration: this.reducedMotion ? 1 : 950,
    });
  }

  resetCamera() {
    this.controls.reset(this.reducedMotion ? 1 : 1000);
  }

  zoom(factor) {
    this.controls.zoomBy(factor);
  }

  rotate(theta, phi = 0) {
    this.controls.rotateBy(theta, phi);
  }

  setQuality(quality) {
    this.quality = quality;
    const low = quality === "low" || (quality === "auto" && this.mobile);
    this.renderer.shadowMap.enabled = !low;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.25 : 1.85));
    this.lowPower = low;
    this.scene?.traverse((object) => {
      if (object.isDirectionalLight) object.castShadow = !low;
    });
    if (this.stage) {
      this.stage.quality = quality;
      this.stage.reducedMotion = this.reducedMotion;
    }
    this.resize();
  }

  setReducedMotion(value) {
    this.reducedMotion = value;
    this.controls.autoRotate = value ? false : Boolean(this.lastWorldConfig?.autoRotate);
    if (this.stage) this.stage.reducedMotion = value;
  }

  updateLabels(lang, dir, textById = {}) {
    this.language = lang;
    this.dir = dir;
    if (!this.stage) return;
    Object.entries(textById).forEach(([id, text]) => {
      this.stage.setLabel(id, text, dir);
    });
  }

  handleTap(event) {
    if (!this.stage) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.pointer.set(x, y);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const id = this.stage.raycast(this.raycaster);
    if (id) this.onSelect(id);
    else this.onDeselect();
  }

  handleHover(event) {
    if (!this.stage) return;
    const now = performance.now();
    if (now - this.hoverThrottle < 55) return;
    this.hoverThrottle = now;
    const rect = this.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.pointer.set(x, y);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const id = this.stage.raycast(this.raycaster);
    this.canvas.style.cursor = id ? "pointer" : "grab";
    this.onHover(id, event);
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    window.removeEventListener("resize", this.onWindowResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
    this.controls.dispose();
    this.stage?.dispose();
    this.renderer.dispose();
  }
}
