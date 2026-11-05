import * as THREE from "three";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * A lightweight orbit controller designed for the explorer.
 * - left drag / one finger: rotate
 * - right/middle/shift drag: pan
 * - wheel / pinch: zoom
 * - two-finger drag: pan
 * - smooth fly-to for object focus and reset
 */
export class OrbitController {
  constructor(camera, domElement, options = {}) {
    this.camera = camera;
    this.dom = domElement;
    this.target = new THREE.Vector3(...(options.target || [0, 2, 0]));
    this.home = {
      target: this.target.clone(),
      radius: options.radius || 20,
      theta: options.theta ?? 0.8,
      phi: options.phi ?? 1.08,
    };
    this.radius = this.home.radius;
    this.theta = this.home.theta;
    this.phi = this.home.phi;
    this.desiredRadius = this.radius;
    this.desiredTheta = this.theta;
    this.desiredPhi = this.phi;
    this.desiredTarget = this.target.clone();
    this.minRadius = options.minRadius || 6;
    this.maxRadius = options.maxRadius || 60;
    this.minPhi = options.minPhi || 0.18;
    this.maxPhi = options.maxPhi || 1.43;
    this.minTargetY = options.minTargetY ?? 0.4;
    this.maxTargetY = options.maxTargetY ?? 8;
    this.autoRotate = Boolean(options.autoRotate);
    this.autoRotateSpeed = options.autoRotateSpeed || 0.045;
    this.damping = options.damping || 9;
    this.enabled = true;
    this.pointers = new Map();
    this.lastGesture = null;
    this.transition = null;
    this.idleSince = performance.now();
    this.pointerDownAt = 0;
    this.moved = false;
    this.button = 0;
    this.shiftPan = false;
    this.onTap = options.onTap || null;
    this.onStart = options.onStart || null;
    this.onHoverMove = options.onHoverMove || null;

    this._onPointerDown = this.handlePointerDown.bind(this);
    this._onPointerMove = this.handlePointerMove.bind(this);
    this._onPointerUp = this.handlePointerUp.bind(this);
    this._onWheel = this.handleWheel.bind(this);
    this._onContextMenu = (event) => event.preventDefault();

    this.dom.addEventListener("pointerdown", this._onPointerDown);
    this.dom.addEventListener("pointermove", this._onPointerMove);
    this.dom.addEventListener("pointerup", this._onPointerUp);
    this.dom.addEventListener("pointercancel", this._onPointerUp);
    this.dom.addEventListener("wheel", this._onWheel, { passive: false });
    this.dom.addEventListener("contextmenu", this._onContextMenu);
    this.dom.style.touchAction = "none";

    this.updateCamera();
  }

  setHome({ position, target, min, max }) {
    if (target) this.home.target = new THREE.Vector3(...target);
    if (Array.isArray(position)) {
      const offset = new THREE.Vector3(...position).sub(this.home.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      this.home.radius = spherical.radius;
      this.home.theta = spherical.theta;
      this.home.phi = clamp(spherical.phi, this.minPhi, this.maxPhi);
    }
    if (min) this.minRadius = min;
    if (max) this.maxRadius = max;
    this.radius = this.home.radius;
    this.theta = this.home.theta;
    this.phi = this.home.phi;
    this.target.copy(this.home.target);
    this.desiredRadius = this.radius;
    this.desiredTheta = this.theta;
    this.desiredPhi = this.phi;
    this.desiredTarget.copy(this.target);
    this.transition = null;
    this.updateCamera();
  }

  beginTransition(to = {}, duration = 900) {
    const now = performance.now();
    this.transition = {
      start: now,
      duration,
      from: {
        radius: this.radius,
        theta: this.theta,
        phi: this.phi,
        target: this.target.clone(),
      },
      to: {
        radius: clamp(to.radius ?? this.radius, this.minRadius, this.maxRadius),
        theta: to.theta ?? this.theta,
        phi: clamp(to.phi ?? this.phi, this.minPhi, this.maxPhi),
        target: to.target ? new THREE.Vector3(...to.target) : this.target.clone(),
      },
    };
    this.desiredRadius = this.transition.to.radius;
    this.desiredTheta = this.transition.to.theta;
    this.desiredPhi = this.transition.to.phi;
    this.desiredTarget.copy(this.transition.to.target);
    this.idleSince = now;
  }

  focusOn(point, { radius = 9, phi, theta, duration = 950 } = {}) {
    const target = new THREE.Vector3(point.x, point.y, point.z);
    this.beginTransition(
      {
        target: [target.x, clamp(target.y, this.minTargetY, this.maxTargetY), target.z],
        radius,
        theta: theta ?? this.theta,
        phi: phi ?? this.phi,
      },
      duration
    );
  }

  reset(duration = 950) {
    this.beginTransition(
      {
        target: this.home.target.toArray(),
        radius: this.home.radius,
        theta: this.home.theta,
        phi: this.home.phi,
      },
      duration
    );
  }

  handlePointerDown(event) {
    if (!this.enabled) return;
    this.dom.focus({ preventScroll: true });
    this.dom.setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
    });
    this.button = event.button;
    this.shiftPan = event.shiftKey;
    this.pointerDownAt = performance.now();
    this.moved = false;
    this.transition = null;
    this.idleSince = performance.now();
    if (this.onStart) this.onStart();
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.lastGesture = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
    event.preventDefault();
  }

  handlePointerMove(event) {
    if (!this.enabled) return;
    const previous = this.pointers.get(event.pointerId);
    if (!previous) {
      if (this.onHoverMove) this.onHoverMove(event);
      return;
    }
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    previous.x = event.clientX;
    previous.y = event.clientY;
    if (Math.hypot(event.clientX - previous.startX, event.clientY - previous.startY) > 4) {
      this.moved = true;
    }
    this.idleSince = performance.now();

    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (this.lastGesture) {
        const scale = this.lastGesture.distance / Math.max(1, distance);
        this.desiredRadius = clamp(this.desiredRadius * scale, this.minRadius, this.maxRadius);
        const panX = midpoint.x - this.lastGesture.midpoint.x;
        const panY = midpoint.y - this.lastGesture.midpoint.y;
        this.pan(panX, panY);
      }
      this.lastGesture = { distance, midpoint };
      event.preventDefault();
      return;
    }

    if (this.button === 2 || this.button === 1 || this.shiftPan) {
      this.pan(dx, dy);
    } else {
      this.desiredTheta -= dx * 0.0052;
      this.desiredPhi = clamp(this.desiredPhi - dy * 0.0046, this.minPhi, this.maxPhi);
    }
    event.preventDefault();
  }

  handlePointerUp(event) {
    if (!this.pointers.has(event.pointerId)) return;
    const wasSingle = this.pointers.size === 1;
    this.pointers.delete(event.pointerId);
    this.lastGesture = null;
    this.dom.releasePointerCapture?.(event.pointerId);
    if (wasSingle && !this.moved && performance.now() - this.pointerDownAt < 650) {
      if (this.onTap) this.onTap(event);
    }
    if (this.pointers.size === 0) {
      this.button = 0;
      this.shiftPan = false;
    }
    event.preventDefault();
  }

  handleWheel(event) {
    if (!this.enabled) return;
    event.preventDefault();
    this.transition = null;
    const factor = Math.exp(event.deltaY * 0.0012);
    this.desiredRadius = clamp(this.desiredRadius * factor, this.minRadius, this.maxRadius);
    this.idleSince = performance.now();
  }

  pan(dx, dy) {
    const scale = (this.radius * 0.00145) / Math.max(0.7, this.camera.zoom || 1);
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    this.camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
    this.desiredTarget.addScaledVector(right, -dx * scale);
    this.desiredTarget.addScaledVector(up, dy * scale);
    this.desiredTarget.y = clamp(this.desiredTarget.y, this.minTargetY, this.maxTargetY);
  }

  rotateBy(deltaTheta, deltaPhi) {
    this.transition = null;
    this.desiredTheta += deltaTheta;
    this.desiredPhi = clamp(this.desiredPhi + deltaPhi, this.minPhi, this.maxPhi);
    this.idleSince = performance.now();
  }

  zoomBy(factor) {
    this.transition = null;
    this.desiredRadius = clamp(this.desiredRadius * factor, this.minRadius, this.maxRadius);
    this.idleSince = performance.now();
  }

  update(delta) {
    const now = performance.now();
    if (this.transition) {
      const t = clamp((now - this.transition.start) / this.transition.duration, 0, 1);
      const eased = easeInOutCubic(t);
      const { from, to } = this.transition;
      this.radius = THREE.MathUtils.lerp(from.radius, to.radius, eased);
      this.theta = THREE.MathUtils.lerp(from.theta, to.theta, eased);
      this.phi = THREE.MathUtils.lerp(from.phi, to.phi, eased);
      this.target.lerpVectors(from.target, to.target, eased);
      this.desiredRadius = this.radius;
      this.desiredTheta = this.theta;
      this.desiredPhi = this.phi;
      this.desiredTarget.copy(this.target);
      if (t >= 1) this.transition = null;
    } else {
      const damping = 1 - Math.exp(-this.damping * Math.min(delta, 0.05) * 60 / 60);
      const blend = Math.min(0.32, Math.max(0.08, damping));
      this.radius += (this.desiredRadius - this.radius) * blend;
      this.theta += (this.desiredTheta - this.theta) * blend;
      this.phi += (this.desiredPhi - this.phi) * blend;
      this.target.lerp(this.desiredTarget, blend);
      if (this.autoRotate && now - this.idleSince > 3200) {
        this.desiredTheta += this.autoRotateSpeed * delta;
      }
    }
    this.updateCamera();
  }

  updateCamera() {
    const sinPhi = Math.sin(this.phi);
    const offset = new THREE.Vector3(
      this.radius * sinPhi * Math.sin(this.theta),
      this.radius * Math.cos(this.phi),
      this.radius * sinPhi * Math.cos(this.theta)
    );
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  setLimitsForWorld(minRadius, maxRadius) {
    this.minRadius = minRadius;
    this.maxRadius = maxRadius;
    this.desiredRadius = clamp(this.desiredRadius, minRadius, maxRadius);
  }

  dispose() {
    this.dom.removeEventListener("pointerdown", this._onPointerDown);
    this.dom.removeEventListener("pointermove", this._onPointerMove);
    this.dom.removeEventListener("pointerup", this._onPointerUp);
    this.dom.removeEventListener("pointercancel", this._onPointerUp);
    this.dom.removeEventListener("wheel", this._onWheel);
    this.dom.removeEventListener("contextmenu", this._onContextMenu);
  }
}
