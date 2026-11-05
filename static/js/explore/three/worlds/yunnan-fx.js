import * as THREE from "three";
import { mulberry } from "./walk-engine.js";

/* Realism kit for the Yunnan worlds (Pu'er, Xishuangbanna).
   Everything is generated in code at load time: canvas albedo + normal +
   roughness maps, leaf cards, wind sway, near-player grass, layered water,
   mist, a cloud dome, particles (splashes, steam, petals), contact shadows
   and optional post-processing (MSAA + gentle bloom + colour grade).
   Heavy extras switch off when stage.quality is "low"; animation stops when
   stage.reducedMotion is set. Nothing here touches the older worlds. */

const K = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);

/* Sky colour keys by sun height: [sunY, zenith, horizon, glow] (linear). */
export const SKY_PRESETS = {
  /* cool, misty mornings over the tea mountains */
  puer: [
    [-0.25, K(0.006, 0.01, 0.026), K(0.02, 0.03, 0.05), K(0, 0, 0)],
    [-0.03, K(0.05, 0.08, 0.17), K(0.5, 0.36, 0.3), K(0.9, 0.42, 0.2)],
    [0.1, K(0.16, 0.3, 0.52), K(0.78, 0.7, 0.62), K(1, 0.64, 0.38)],
    [0.32, K(0.12, 0.3, 0.66), K(0.62, 0.72, 0.8), K(1, 0.9, 0.74)],
    [1, K(0.07, 0.24, 0.62), K(0.58, 0.69, 0.78), K(1, 0.95, 0.86)],
  ],
  /* warm, humid tropical haze */
  banna: [
    [-0.25, K(0.008, 0.012, 0.03), K(0.025, 0.035, 0.05), K(0, 0, 0)],
    [-0.03, K(0.07, 0.07, 0.16), K(0.72, 0.4, 0.22), K(1, 0.42, 0.14)],
    [0.1, K(0.2, 0.32, 0.52), K(0.92, 0.7, 0.46), K(1, 0.62, 0.3)],
    [0.32, K(0.14, 0.34, 0.66), K(0.74, 0.8, 0.78), K(1, 0.9, 0.7)],
    [1, K(0.09, 0.28, 0.66), K(0.7, 0.78, 0.76), K(1, 0.95, 0.84)],
  ],
};

/* ---------------------------------------------------------------- geometry */

/* Concatenate geometries into one non-indexed geometry (position, normal, uv, color). */
export function mergeGeometries(list) {
  const P = [], N = [], U = [], C = [];
  list.forEach((src) => {
    const g = src.index ? src.toNonIndexed() : src;
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, c = g.attributes.color;
    for (let i = 0; i < p.count; i += 1) {
      P.push(p.getX(i), p.getY(i), p.getZ(i));
      if (n) N.push(n.getX(i), n.getY(i), n.getZ(i)); else N.push(0, 1, 0);
      if (u) U.push(u.getX(i), u.getY(i)); else U.push(0, 0);
      if (c) C.push(c.getX(i), c.getY(i), c.getZ(i)); else C.push(1, 1, 1);
    }
    if (g !== src) g.dispose();
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  out.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

/* Paint one colour into a geometry's vertex colours (with optional vertical gradient). */
export function tint(g, hex, bottomHex = null, y0 = 0, y1 = 1) {
  const a = new THREE.Color(hex), b = bottomHex ? new THREE.Color(bottomHex) : a, c = new THREE.Color();
  const p = g.attributes.position, arr = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 1) {
    const t = Math.min(1, Math.max(0, (p.getY(i) - y0) / (y1 - y0 || 1)));
    c.copy(b).lerp(a, t);
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

/* A curved, tapered trunk/branch as a tube, from p0 to p1 with a bend. */
export function limb(p0, p1, r0, r1, bend = 0.15, seg = 6, rings = 5, rnd = Math.random) {
  const mid = p0.clone().lerp(p1, 0.5);
  const d = p1.clone().sub(p0);
  const side = new THREE.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(d.length() * bend * (rnd() - 0.5) * 2);
  mid.add(side);
  const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
  const g = new THREE.TubeGeometry(curve, rings, 1, seg, false);
  /* taper: scale each ring's radius */
  const pos = g.attributes.position, nrm = g.attributes.normal;
  const pts = curve.getSpacedPoints(rings);
  for (let i = 0; i < pos.count; i += 1) {
    const ring = Math.floor(i / (seg + 1));
    const t = ring / rings, r = r0 + (r1 - r0) * t, c = pts[Math.min(ring, rings)];
    pos.setXYZ(i, c.x + nrm.getX(i) * r, c.y + nrm.getY(i) * r, c.z + nrm.getZ(i) * r);
  }
  g.computeVertexNormals();
  return g;
}

/* Leaf cards scattered in an ellipsoid; normals bent outward so the crown
   lights like a volume rather than flat planes. */
export function cardCluster({ n = 24, rx = 2, ry = 1.4, rz = 2, size = 1.4, cx = 0, cy = 0, cz = 0, droop = 0.3, rnd = Math.random, hex = null }) {
  const parts = [];
  const tmp = new THREE.Object3D();
  for (let i = 0; i < n; i += 1) {
    const u = rnd() * Math.PI * 2, v = Math.acos(2 * rnd() - 1) * 0.85, k = 0.55 + 0.45 * Math.cbrt(rnd());
    const ox = Math.sin(v) * Math.cos(u) * rx * k, oy = Math.cos(v) * ry * k, oz = Math.sin(v) * Math.sin(u) * rz * k;
    const s = size * (0.75 + rnd() * 0.5);
    const g = new THREE.PlaneGeometry(s, s);
    tmp.position.set(cx + ox, cy + oy, cz + oz);
    tmp.rotation.set(-Math.PI / 2 + (rnd() - 0.5) * 1.6 + droop, rnd() * Math.PI * 2, (rnd() - 0.5) * 1.2);
    tmp.updateMatrix();
    g.applyMatrix4(tmp.matrix);
    /* bend normals toward the outward direction */
    const nr = g.attributes.normal, out = new THREE.Vector3(ox, oy * 0.8 + ry * 0.4, oz).normalize();
    for (let j = 0; j < nr.count; j += 1) {
      const vn = new THREE.Vector3(nr.getX(j), nr.getY(j), nr.getZ(j));
      if (vn.dot(out) < 0) vn.negate();
      vn.lerp(out, 0.65).normalize();
      nr.setXYZ(j, vn.x, vn.y, vn.z);
    }
    if (hex) tint(g, hex);
    parts.push(g);
  }
  const m = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return m;
}

/* LatheGeometry from [radius, height] pairs (stupas, finials, bells, pots). */
export function lathe(profile, seg = 28) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg);
}

/* ---------------------------------------------------------------- noise for canvases */

function makeNoise(seed) {
  const R = mulberry(seed);
  const P = new Float32Array(256 * 256);
  for (let i = 0; i < P.length; i += 1) P[i] = R();
  /* periodic value noise: period must divide 256 */
  function vnoise(x, y, period) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const m = (a) => ((a % period) + period) % period;
    const g = (a, b) => P[m(b) * 256 + m(a)];
    const a = g(ix, iy), b = g(ix + 1, iy), c = g(ix, iy + 1), d = g(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, period, oct = 4) {
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let o = 0; o < oct; o += 1) {
      s += a * vnoise(x * f, y * f, period * f);
      n += a; f *= 2; a *= 0.5;
    }
    return s / n;
  }
  return { R, vnoise, fbm };
}

/* ---------------------------------------------------------------- the kit */

export function createFx({ stage, manager, kit = null, walker: walker0 = null }) {
  let walker = walker0;
  const renderer = manager.renderer;
  const LOW = stage.quality === "low";
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const TS = LOW ? 256 : 512;
  const uTime = { value: 0 };
  const updates = [];
  const onTimes = [];
  const track = (m) => { stage.materials.add(m); return m; };
  const geo = (g) => stage.trackGeometry(g);
  if (!stage.__yfxDisposeFlag) {
    stage.__yfxDisposeFlag = true;
    const d0 = stage.dispose.bind(stage);
    stage.dispose = () => { stage.disposed = true; d0(); };
  }

  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d", { willReadFrequently: true });
    return c;
  }
  function toTex(c, { srgb = true, repeat = null } = {}) {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = ANISO;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    stage.trackTexture(t);
    return t;
  }

  /* Height canvas -> tangent-space normal map (central differences, wrapped). */
  function normalFromHeight(hc, strength = 2.5) {
    const W = hc.width, H = hc.height;
    const src = hc.getContext("2d").getImageData(0, 0, W, H).data;
    const oc = canvas(W, H), og = oc.getContext("2d"), img = og.createImageData(W, H), d = img.data;
    const h = (x, y) => src[(((y + H) % H) * W + ((x + W) % W)) * 4] / 255;
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 0.5 + (h(x + 1, y - 1) - h(x - 1, y - 1) + h(x + 1, y + 1) - h(x - 1, y + 1)) * 0.25;
      const dy = (h(x, y + 1) - h(x, y - 1)) * 0.5 + (h(x - 1, y + 1) - h(x - 1, y - 1) + h(x + 1, y + 1) - h(x + 1, y - 1)) * 0.25;
      let nx = -dx * strength, ny = dy * strength, nz = 1;
      const L = Math.hypot(nx, ny, nz);
      nx /= L; ny /= L; nz /= L;
      const o = (y * W + x) * 4;
      d[o] = (nx * 0.5 + 0.5) * 255; d[o + 1] = (ny * 0.5 + 0.5) * 255; d[o + 2] = (nz * 0.5 + 0.5) * 255; d[o + 3] = 255;
    }
    og.putImageData(img, 0, 0);
    return oc;
  }
  /* roughness: crevices (low height) rougher; stored in G as three.js expects */
  function roughFromHeight(hc, base = 0.85, crevice = 0.15, jitter = 0.06, seed = 3) {
    const W = hc.width, H = hc.height, R = mulberry(seed);
    const src = hc.getContext("2d").getImageData(0, 0, W, H).data;
    const oc = canvas(W, H), og = oc.getContext("2d"), img = og.createImageData(W, H), d = img.data;
    for (let i = 0; i < W * H; i += 1) {
      const hv = src[i * 4] / 255;
      const r = Math.min(1, Math.max(0.02, base + (1 - hv) * crevice + (R() - 0.5) * jitter));
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = r * 255; d[i * 4 + 3] = 255;
    }
    og.putImageData(img, 0, 0);
    return oc;
  }

  /* Per-pixel generator: fn(u, v) -> [r, g, b, height] with u, v in 0..1 (tileable). */
  function pixelSurface(size, fn) {
    const A = canvas(size, size), Hc = canvas(size, size);
    const ga = A.getContext("2d"), gh = Hc.getContext("2d");
    const ia = ga.createImageData(size, size), ih = gh.createImageData(size, size);
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
      const [r, g, b, h] = fn(x / size, y / size, x, y);
      const o = (y * size + x) * 4;
      ia.data[o] = r; ia.data[o + 1] = g; ia.data[o + 2] = b; ia.data[o + 3] = 255;
      const hv = Math.max(0, Math.min(255, h * 255));
      ih.data[o] = ih.data[o + 1] = ih.data[o + 2] = hv; ih.data[o + 3] = 255;
    }
    ga.putImageData(ia, 0, 0);
    gh.putImageData(ih, 0, 0);
    return { A, H: Hc };
  }

  /* Voronoi cells (tileable): returns {f1, f2, id} for flagstones/cobbles. */
  function voronoi(cells, seed) {
    const R = mulberry(seed);
    const pts = [];
    for (let j = 0; j < cells; j += 1) for (let i = 0; i < cells; i += 1) pts.push([(i + 0.15 + R() * 0.7) / cells, (j + 0.15 + R() * 0.7) / cells, R()]);
    return (u, v) => {
      const ci = Math.floor(u * cells), cj = Math.floor(v * cells);
      let f1 = 9, f2 = 9, id = 0;
      for (let dj = -1; dj <= 1; dj += 1) for (let di = -1; di <= 1; di += 1) {
        let i = ci + di, j = cj + dj, ox = 0, oy = 0;
        if (i < 0) { i += cells; ox = -1; } else if (i >= cells) { i -= cells; ox = 1; }
        if (j < 0) { j += cells; oy = -1; } else if (j >= cells) { j -= cells; oy = 1; }
        const p = pts[j * cells + i];
        const dx = p[0] + ox - u, dy = p[1] + oy - v, d = Math.sqrt(dx * dx + dy * dy);
        if (d < f1) { f2 = f1; f1 = d; id = p[2]; } else if (d < f2) f2 = d;
      }
      return { f1, f2, id };
    };
  }

  const hexRGB = (h) => { const c = new THREE.Color(h); return [c.r * 255, c.g * 255, c.b * 255]; };
  const mixRGB = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  const surfCache = new Map();
  /**
   * Procedural PBR surface. kind: flagstone | cobble | tiles | thatch | weave |
   * bamboo | planks | plaster | earth | bark | gold | ground | leafmass | brick.
   * Returns { map, normalMap, roughnessMap } (fresh texture objects; set .repeat freely).
   */
  function surface(kind, o = {}) {
    const key = kind + JSON.stringify(o);
    let base = surfCache.get(key);
    if (!base) {
      base = buildSurface(kind, o);
      surfCache.set(key, base);
    }
    const mk = (c, srgb) => toTex(c, { srgb });
    const out = { map: mk(base.A, true), normalMap: mk(base.N, false), roughnessMap: mk(base.Rg, false) };
    if (o.repeat) [out.map, out.normalMap, out.roughnessMap].forEach((t) => t.repeat.set(o.repeat[0], o.repeat[1]));
    return out;
  }
  function buildSurface(kind, o) {
    const S = o.size || TS;
    const nz = makeNoise(o.seed || 7);
    let res, strength = 2.5, rough = [0.85, 0.15, 0.06];
    const c1 = hexRGB(o.color || "#8f877a"), c2 = hexRGB(o.color2 || "#6e675c"), c3 = hexRGB(o.color3 || "#4a4238");
    if (kind === "flagstone" || kind === "cobble") {
      const vor = voronoi(o.cells || (kind === "cobble" ? 9 : 5), o.seed || 11);
      res = pixelSurface(S, (u, v) => {
        const { f1, f2, id } = vor(u, v);
        const edge = f2 - f1;
        const n = nz.fbm(u * 16, v * 16, 16, 4);
        let h;
        if (kind === "cobble") {
          const r = 0.5 / (o.cells || 9);
          h = Math.sqrt(Math.max(0, 1 - (f1 / (r * 1.25)) ** 2)) * sstep(0.0, 0.02, edge) * 0.85 + n * 0.15;
        } else {
          h = sstep(0.0, 0.035, edge) * 0.75 + n * 0.25 - (1 - sstep(0, 0.012, edge)) * 0.2;
        }
        let col = mixRGB(c1, c2, id * 0.8 + n * 0.4 - 0.2);
        const joint = 1 - sstep(0.0, 0.025, edge);
        col = mixRGB(col, o.moss ? mixRGB(c3, hexRGB("#4f6b34"), nz.fbm(u * 8, v * 8, 8, 2)) : c3, joint * 0.9);
        const spot = nz.fbm(u * 32 + 5, v * 32 + 3, 32, 3);
        col = mixRGB(col, mixRGB(c1, [255, 255, 255], 0.2), Math.max(0, spot - 0.62) * 1.6);
        return [col[0], col[1], col[2], Math.max(0, h)];
      });
      strength = kind === "cobble" ? 4 : 3;
      rough = [0.78, 0.2, 0.08];
    } else if (kind === "tiles") {
      /* Chinese / Dai roof tiles: alternating pan and cap rows */
      const cols = o.cols || 8, rows = o.rows || 10;
      res = pixelSurface(S, (u, v) => {
        const x = u * cols, y = v * rows;
        const fx = x - Math.floor(x), fy = y - Math.floor(y), row = Math.floor(y), col = Math.floor(x);
        const prof = Math.cos((fx - 0.5) * Math.PI * 2) * 0.5 + 0.5;
        const lap = fy;
        const h = prof * 0.7 + lap * 0.25 - (fy > 0.93 ? 0.35 : 0);
        const n = nz.fbm(u * 24, v * 24, 24, 3);
        const tileVar = nz.vnoise(col * 3.1, row * 2.7, 64);
        let c = mixRGB(c1, c2, tileVar * 0.7 + n * 0.3);
        c = mixRGB(c, c3, (1 - prof) * 0.35 + (fy > 0.9 ? 0.4 : 0));
        if (o.lichen) c = mixRGB(c, hexRGB("#a7a37a"), Math.max(0, nz.fbm(u * 10 + 9, v * 10, 10, 3) - 0.6) * 2);
        return [c[0], c[1], c[2], h];
      });
      strength = 3.2;
      rough = [0.72, 0.2, 0.08];
    } else if (kind === "thatch") {
      const A = canvas(S, S), Hc = canvas(S, S), ga = A.getContext("2d"), gh = Hc.getContext("2d");
      const R = nz.R;
      ga.fillStyle = o.color3 || "#5a4628"; ga.fillRect(0, 0, S, S);
      gh.fillStyle = "#202020"; gh.fillRect(0, 0, S, S);
      const courses = o.courses || 6, n = LOW ? 2200 : 5200;
      for (let i = 0; i < n; i += 1) {
        const x = R() * S, course = Math.floor(R() * courses), y0 = (course / courses) * S + R() * (S / courses) * 0.3;
        const len = (S / courses) * (1.05 + R() * 0.35), lean = (R() - 0.5) * 6;
        const t = R();
        const c = mixRGB(c1, c2, t);
        const lw = 1 + R() * 1.6;
        for (const dx of [-S, 0, S]) for (const dy of [-S, 0]) {
          ga.strokeStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
          ga.lineWidth = lw;
          ga.beginPath(); ga.moveTo(x + dx, y0 + dy); ga.lineTo(x + dx + lean, y0 + dy + len); ga.stroke();
          const hv = 120 + t * 120 | 0;
          gh.strokeStyle = `rgb(${hv},${hv},${hv})`;
          gh.lineWidth = lw;
          gh.beginPath(); gh.moveTo(x + dx, y0 + dy); gh.lineTo(x + dx + lean, y0 + dy + len); gh.stroke();
        }
      }
      for (let k = 1; k <= courses; k += 1) {
        const y = (k / courses) * S;
        const gr = ga.createLinearGradient(0, y - 10, 0, y + 2);
        gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(20,12,4,.45)");
        ga.fillStyle = gr; ga.fillRect(0, y - 10, S, 12);
      }
      res = { A, H: Hc };
      strength = 3.5;
      rough = [0.9, 0.1, 0.05];
    } else if (kind === "weave") {
      const cell = o.cells || 12;
      res = pixelSurface(S, (u, v) => {
        const x = u * cell, y = v * cell, ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
        const horiz = (ix + iy) % 2 === 0;
        const across = horiz ? fy : fx, along = horiz ? fx : fy;
        const strip = Math.sin(across * Math.PI);
        const h = strip * (0.65 + 0.35 * Math.sin(along * Math.PI)) * (across > 0.06 && across < 0.94 ? 1 : 0.2);
        const fib = nz.vnoise(horiz ? u * 4 : u * 200, horiz ? v * 200 : v * 4, 256);
        let c = mixRGB(c1, c2, fib * 0.6 + (horiz ? 0.2 : 0));
        c = mixRGB(c, c3, (1 - strip) * 0.6);
        return [c[0], c[1], c[2], h];
      });
      strength = 3;
      rough = [0.8, 0.15, 0.06];
    } else if (kind === "bamboo") {
      const poles = o.poles || 7;
      const R = nz.R, nodes = [];
      for (let i = 0; i < poles; i += 1) nodes.push([R() * 0.4, 0.28 + R() * 0.12]);
      res = pixelSurface(S, (u, v) => {
        const x = u * poles, i = Math.floor(x), fx = x - i;
        const [off, step] = nodes[i % poles];
        const ny = ((v + off) / step) % 1;
        const node = Math.exp(-((ny - 0.5) ** 2) / 0.0006);
        const round = Math.sqrt(Math.max(0, 1 - ((fx - 0.5) * 2.1) ** 2));
        const h = round * 0.85 - node * 0.18 + (fx < 0.04 || fx > 0.96 ? -0.3 : 0);
        const streak = nz.vnoise(u * poles * 6, v * 3, 64);
        let c = mixRGB(c1, c2, streak * 0.7 + (i % 3) * 0.12);
        c = mixRGB(c, c3, (1 - round) * 0.55 + node * 0.4);
        return [c[0], c[1], c[2], Math.max(0, h)];
      });
      strength = 3.2;
      rough = [0.6, 0.25, 0.05];
    } else if (kind === "planks") {
      const n = o.boards || 6, R = nz.R, offs = [];
      for (let i = 0; i < n; i += 1) offs.push([R(), R()]);
      res = pixelSurface(S, (u, v) => {
        const x = u * n, i = Math.floor(x), fx = x - i;
        const [a, b] = offs[i % n];
        const grain = Math.sin((v * 22 + nz.fbm(u * 3 + a * 9, v * 2, 8, 3) * 6 + a * 7) * Math.PI * 2) * 0.5 + 0.5;
        const gap = fx < 0.03 || fx > 0.97;
        const knot = Math.exp(-(((fx - 0.5) ** 2) + ((((v + b) % 1) - 0.5) ** 2) * 0.3) / 0.002);
        let c = mixRGB(c1, c2, grain * 0.55 + a * 0.35);
        c = mixRGB(c, c3, knot * 0.8 + (gap ? 0.85 : 0));
        const h = gap ? 0.05 : 0.65 + grain * 0.2 - knot * 0.2;
        return [c[0], c[1], c[2], h];
      });
      strength = 2.2;
      rough = [0.78, 0.15, 0.06];
    } else if (kind === "plaster" || kind === "earth") {
      const layers = o.layers || 9;
      res = pixelSurface(S, (u, v) => {
        const n = nz.fbm(u * 8, v * 8, 8, 5);
        const fine = nz.fbm(u * 64, v * 64, 64, 2);
        let h = n * 0.6 + fine * 0.4;
        let c = mixRGB(c1, c2, n * 0.9 - 0.15);
        if (kind === "earth") {
          const ly = v * layers, fy = ly - Math.floor(ly);
          h -= (fy > 0.94 ? 0.35 : 0);
          c = mixRGB(c, c3, (fy > 0.92 ? 0.45 : 0) + Math.max(0, fine - 0.7));
        } else {
          const stain = Math.max(0, nz.fbm(u * 3 + 4, v * 3, 4, 4) - 0.55) * 1.6;
          c = mixRGB(c, c3, stain * (o.stains ?? 0.6));
        }
        return [c[0], c[1], c[2], h];
      });
      strength = kind === "earth" ? 3.4 : 1.6;
      rough = [0.92, 0.08, 0.05];
    } else if (kind === "brick") {
      const rows = o.rows || 12, cols = o.cols || 5;
      res = pixelSurface(S, (u, v) => {
        const y = v * rows, row = Math.floor(y), fy = y - row;
        const x = u * cols + (row % 2 ? 0.5 : 0), col = Math.floor(x), fx = x - col;
        const mortar = fy < 0.08 || fx < 0.04;
        const n = nz.fbm(u * 30, v * 30, 32, 3);
        const bv = nz.vnoise(col * 5.3, row * 3.1, 64);
        let c = mixRGB(c1, c2, bv * 0.8 + n * 0.3);
        if (mortar) c = c3;
        return [c[0], c[1], c[2], mortar ? 0.1 : 0.7 + n * 0.3];
      });
      strength = 2.6;
    } else if (kind === "bark") {
      res = pixelSurface(S, (u, v) => {
        const f = nz.fbm(u * 10, v * 1.5, 8, 5);
        const furrow = Math.abs(Math.sin((u * 14 + f * 2.5) * Math.PI));
        const h = Math.pow(furrow, 0.6) * 0.8 + nz.fbm(u * 40, v * 10, 32, 2) * 0.2;
        let c = mixRGB(c3, c1, h);
        c = mixRGB(c, c2, nz.fbm(u * 4 + 3, v * 4, 4, 3) * 0.6);
        if (o.moss) c = mixRGB(c, hexRGB("#56702f"), Math.max(0, nz.fbm(u * 5 + 7, v * 3, 4, 4) - 0.5) * 1.8 * (1 - h * 0.5));
        return [c[0], c[1], c[2], h];
      });
      strength = 4;
      rough = [0.9, 0.1, 0.05];
    } else if (kind === "gold") {
      res = pixelSurface(S, (u, v) => {
        const a = Math.abs(((u * 8 + v * 8) % 1) - 0.5), b = Math.abs(((u * 8 - v * 8 + 8) % 1) - 0.5);
        const lattice = Math.min(a, b) < 0.06 ? 1 : 0;
        const fx = (u * 8) % 1 - 0.5, fy = (v * 8) % 1 - 0.5;
        const dot = Math.exp(-(fx * fx + fy * fy) / 0.012);
        const n = nz.fbm(u * 20, v * 20, 32, 3);
        const h = lattice * 0.6 + dot * 0.8 + n * 0.15;
        const c = mixRGB(c1, c2, n * 0.8 + lattice * 0.2);
        return [c[0], c[1], c[2], h];
      });
      strength = 2.5;
      rough = [0.32, 0.25, 0.08];
    } else if (kind === "leafmass") {
      const A = canvas(S, S), Hc = canvas(S, S), ga = A.getContext("2d"), gh = Hc.getContext("2d"), R = nz.R;
      ga.fillStyle = o.color3 || "#1f3317"; ga.fillRect(0, 0, S, S);
      gh.fillStyle = "#000"; gh.fillRect(0, 0, S, S);
      const n = LOW ? 900 : 2400, L = S / (o.leaves || 18);
      for (let i = 0; i < n; i += 1) {
        const x = R() * S, y = R() * S, a = R() * Math.PI * 2, s = L * (0.6 + R() * 0.6), t = R();
        const c = mixRGB(c1, c2, t);
        const tip = o.buds && R() < 0.12;
        for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
          if (x + dx < -L || x + dx > S + L || y + dy < -L || y + dy > S + L) continue;
          ga.save(); ga.translate(x + dx, y + dy); ga.rotate(a);
          ga.fillStyle = tip ? "rgb(150,190,70)" : `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
          ga.beginPath(); ga.ellipse(0, 0, s, s * 0.42, 0, 0, Math.PI * 2); ga.fill();
          ga.strokeStyle = "rgba(255,255,220,.18)"; ga.lineWidth = 1; ga.beginPath(); ga.moveTo(-s, 0); ga.lineTo(s, 0); ga.stroke();
          ga.restore();
          gh.save(); gh.translate(x + dx, y + dy); gh.rotate(a);
          const g = gh.createRadialGradient(0, 0, 0, 0, 0, s);
          const hv = 120 + t * 135 | 0;
          g.addColorStop(0, `rgb(${hv},${hv},${hv})`); g.addColorStop(1, "rgb(30,30,30)");
          gh.fillStyle = g; gh.beginPath(); gh.ellipse(0, 0, s, s * 0.42, 0, 0, Math.PI * 2); gh.fill();
          gh.restore();
        }
      }
      res = { A, H: Hc };
      strength = 3;
      rough = [0.62, 0.3, 0.08];
    } else {
      /* ground detail: grey-ish multiplier around 0.9..1 for vertex-coloured terrain */
      res = pixelSurface(S, (u, v) => {
        const n = nz.fbm(u * 8, v * 8, 8, 5), f = nz.fbm(u * 48, v * 48, 64, 3);
        const peb = Math.max(0, nz.vnoise(u * 90, v * 90, 128) - 0.78) * 4;
        const g = 205 + n * 40 + f * 18 - peb * 30;
        return [g, g * 0.99, g * 0.96, n * 0.55 + f * 0.35 + peb * 0.3];
      });
      strength = 2.2;
      rough = [0.95, 0.06, 0.04];
    }
    const N = normalFromHeight(res.H, (o.bump ?? 1) * strength);
    const Rg = roughFromHeight(res.H, o.rough ?? rough[0], rough[1], rough[2], (o.seed || 7) + 1);
    return { A: res.A, N, Rg };
  }

  /* Material from a surface kind. extra: MeshStandardMaterial params. */
  function pbr(kind, o = {}, extra = {}) {
    const s = surface(kind, o);
    const m = track(new THREE.MeshStandardMaterial(Object.assign({
      map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1, metalness: 0,
      normalScale: new THREE.Vector2(o.normal ?? 1, o.normal ?? 1),
    }, extra)));
    return m;
  }

  /* ------------------------------------------------ leaf cards (alpha) */
  const leafCache = new Map();
  function leafTexture(kind, o = {}) {
    const key = kind + JSON.stringify(o);
    if (leafCache.has(key)) return leafCache.get(key);
    const S = LOW ? 256 : 512, c = canvas(S, S), g = c.getContext("2d"), R = mulberry(o.seed || 21);
    const pal = (o.colors || ["#2f5a24", "#3f7230", "#58873a", "#24461c"]).map(hexRGB);
    const fillLeaf = (x, y, len, wid, ang, col, vein = true) => {
      g.save(); g.translate(x, y); g.rotate(ang);
      const gr = g.createLinearGradient(0, -wid, 0, wid);
      gr.addColorStop(0, `rgb(${col[0] * 0.8 | 0},${col[1] * 0.8 | 0},${col[2] * 0.8 | 0})`);
      gr.addColorStop(0.5, `rgb(${Math.min(255, col[0] * 1.15) | 0},${Math.min(255, col[1] * 1.15) | 0},${Math.min(255, col[2] * 1.1) | 0})`);
      gr.addColorStop(1, `rgb(${col[0] * 0.75 | 0},${col[1] * 0.75 | 0},${col[2] * 0.75 | 0})`);
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(len * 0.45, -wid, len, 0);
      g.quadraticCurveTo(len * 0.45, wid, 0, 0);
      g.fill();
      if (vein) {
        g.strokeStyle = "rgba(220,235,170,.35)"; g.lineWidth = Math.max(1, wid * 0.08);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.95, 0); g.stroke();
      }
      g.restore();
    };
    g.clearRect(0, 0, S, S);
    if (kind === "palm") {
      /* one pinnate frond from bottom-centre curving up */
      const n = 46;
      for (const side of [-1, 1]) for (let i = 0; i < n; i += 1) {
        const t = i / n, x = S * 0.5 + side * 2, y = S * (0.97 - t * 0.92);
        const col = pal[(R() * pal.length) | 0];
        fillLeaf(x, y, S * (0.42 * Math.sin((t * 0.85 + 0.12) * Math.PI)), S * 0.018, side > 0 ? -0.55 - t * 0.3 : Math.PI + 0.55 + t * 0.3, col, false);
      }
      g.strokeStyle = "#6b6a3a"; g.lineWidth = S * 0.012; g.beginPath(); g.moveTo(S * 0.5, S); g.lineTo(S * 0.5, S * 0.04); g.stroke();
    } else if (kind === "banana") {
      const col = pal[1];
      g.save(); g.translate(S * 0.5, S * 0.98);
      g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      g.beginPath(); g.moveTo(0, 0);
      g.bezierCurveTo(-S * 0.36, -S * 0.3, -S * 0.3, -S * 0.85, 0, -S * 0.96);
      g.bezierCurveTo(S * 0.3, -S * 0.85, S * 0.36, -S * 0.3, 0, 0);
      g.fill();
      for (let i = 0; i < 26; i += 1) {
        const y = -S * (0.08 + i * 0.033), sd = R() < 0.5 ? -1 : 1;
        g.strokeStyle = "rgba(255,255,210,.16)"; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, y); g.lineTo(sd * S * 0.32, y - S * 0.06); g.stroke();
        if (R() < 0.35) { g.globalCompositeOperation = "destination-out"; g.lineWidth = 3; g.beginPath(); g.moveTo(sd * S * 0.08, y); g.lineTo(sd * S * 0.4, y - S * 0.07); g.stroke(); g.globalCompositeOperation = "source-over"; }
      }
      g.strokeStyle = "#a9b56a"; g.lineWidth = S * 0.018; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -S * 0.95); g.stroke();
      g.restore();
    } else if (kind === "bamboo") {
      for (let i = 0; i < 70; i += 1) {
        const x = S * (0.15 + R() * 0.7), y = S * (0.1 + R() * 0.8);
        fillLeaf(x, y, S * (0.16 + R() * 0.1), S * 0.022, R() * Math.PI * 2, pal[(R() * pal.length) | 0]);
      }
    } else if (kind === "fern") {
      for (let f = 0; f < 7; f += 1) {
        const a = -Math.PI / 2 + (f - 3) * 0.32, len = S * (0.4 + R() * 0.08);
        for (let i = 0; i < 26; i += 1) {
          const t = i / 26, x = S * 0.5 + Math.cos(a) * len * t, y = S * 0.98 + Math.sin(a) * len * t;
          const l = S * 0.07 * Math.sin((1 - t) * Math.PI * 0.85 + 0.15);
          fillLeaf(x, y, l, S * 0.012, a - 1.2, pal[(i + f) % pal.length], false);
          fillLeaf(x, y, l, S * 0.012, a + 1.2, pal[(i + f + 1) % pal.length], false);
        }
      }
    } else if (kind === "tea") {
      /* small serrated tea leaves with fresh pale tips */
      for (let i = 0; i < (LOW ? 90 : 160); i += 1) {
        const x = S * (0.08 + R() * 0.84), y = S * (0.08 + R() * 0.84);
        const tip = R() < 0.14;
        fillLeaf(x, y, S * (tip ? 0.07 : 0.1 + R() * 0.05), S * (tip ? 0.02 : 0.034), R() * Math.PI * 2, tip ? hexRGB("#9cc45a") : pal[(R() * pal.length) | 0]);
      }
    } else if (kind === "flowers") {
      for (let i = 0; i < 60; i += 1) {
        const x = S * (0.1 + R() * 0.8), y = S * (0.1 + R() * 0.8), r = S * (0.02 + R() * 0.025);
        const col = hexRGB((o.petals || ["#f2a3c0", "#ffd6e2", "#f6c64a"])[(R() * 3) | 0]);
        for (let k = 0; k < 5; k += 1) fillLeaf(x, y, r * 1.6, r * 0.7, (k / 5) * Math.PI * 2, col, false);
        g.fillStyle = "#f4d04a"; g.beginPath(); g.arc(x, y, r * 0.35, 0, 7); g.fill();
      }
    } else {
      /* broadleaf cluster */
      const n = o.n || 34;
      for (let i = 0; i < n; i += 1) {
        const a = R() * Math.PI * 2, r = R() * S * 0.3;
        const x = S * 0.5 + Math.cos(a) * r, y = S * 0.5 + Math.sin(a) * r;
        fillLeaf(x, y, S * (o.len || 0.2) * (0.7 + R() * 0.5), S * (o.wid || 0.055), a + (R() - 0.5) * 0.8, pal[(R() * pal.length) | 0]);
      }
    }
    const t = toTex(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    leafCache.set(key, t);
    return t;
  }

  /* ------------------------------------------------ wind sway (GPU) */
  function wind(mat, strength = 0.06, freq = 1) {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;")
        .replace("#include <begin_vertex>", `#include <begin_vertex>
        {
          vec3 wpos = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #ifdef USE_INSTANCING
            wpos += (modelMatrix * vec4(instanceMatrix[3].xyz, 0.0)).xyz;
          #endif
          float hgt = max(position.y, 0.0);
          float ph = wpos.x * 0.11 + wpos.z * 0.07;
          float gust = 0.6 + 0.4 * sin(uTime * 0.37 * ${freq.toFixed(2)} + wpos.x * 0.013);
          float s = ${strength.toFixed(4)} * hgt * hgt * gust;
          transformed.x += sin(uTime * 1.9 * ${freq.toFixed(2)} + ph) * s + sin(uTime * 4.7 + ph * 3.1 + position.z * 2.0) * s * 0.25;
          transformed.z += cos(uTime * 1.5 * ${freq.toFixed(2)} + ph * 1.3) * s * 0.7;
        }`);
    };
    mat.customProgramCacheKey = () => "yfx-wind-" + strength + "-" + freq;
    return mat;
  }
  function leafMaterial(tex, o = {}) {
    const m = track(new THREE.MeshStandardMaterial({
      map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: o.roughness ?? 0.62, metalness: 0,
      color: o.color || 0xffffff, vertexColors: Boolean(o.vertexColors),
    }));
    if (o.wind !== false) wind(m, o.wind ?? 0.012, o.freq ?? 1);
    return m;
  }

  /* ------------------------------------------------ instancing helpers */
  const _o = new THREE.Object3D();
  function instances(geometry, material, list, { shadow = true, receive = true, colors = null } = {}) {
    geo(geometry);
    const im = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
    im.count = list.length;
    list.forEach((p, i) => {
      _o.position.set(p.x, p.y, p.z);
      _o.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
      const s = p.s || 1;
      _o.scale.set(p.sx || s, p.sy || s, p.sz || s);
      _o.updateMatrix();
      im.setMatrixAt(i, _o.matrix);
      if (colors) im.setColorAt(i, colors[i]);
    });
    im.castShadow = shadow;
    im.receiveShadow = receive;
    im.computeBoundingSphere();
    stage.add(im);
    return im;
  }

  /* ------------------------------------------------ near-player grass */
  function grass({ hgt, density, R = 34, count = 3600, colors = ["#3d5a26", "#7c9a45"], height = 0.55 }) {
    const n = LOW ? Math.floor(count * 0.3) : count;
    const rnd = mulberry(99);
    /* one tuft = 7 bent blades with a dark base and light tips */
    const blades = [];
    for (let b = 0; b < 7; b += 1) {
      const a = rnd() * Math.PI * 2, r = rnd() * 0.18, h = height * (0.6 + rnd() * 0.6), lean = 0.15 + rnd() * 0.3;
      const bx = Math.cos(a) * r, bz = Math.sin(a) * r, w = 0.045 + rnd() * 0.02, dir = rnd() * Math.PI * 2;
      const lx = Math.cos(dir) * lean, lz = Math.sin(dir) * lean;
      const px = -Math.sin(dir), pz = Math.cos(dir);
      const P = [
        bx - px * w, 0, bz - pz * w, bx + px * w, 0, bz + pz * w,
        bx + lx * 0.35 - px * w * 0.7, h * 0.55, bz + lz * 0.35 - pz * w * 0.7, bx + lx * 0.35 + px * w * 0.7, h * 0.55, bz + lz * 0.35 + pz * w * 0.7,
        bx + lx, h, bz + lz,
      ];
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
      /* both windings so FrontSide renders each blade twice with an upward normal (no dark backs) */
      g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 0, 2, 1, 1, 2, 3, 2, 4, 3]);
      const N = [];
      for (let i = 0; i < 5; i += 1) N.push(lx * 0.3, 1, lz * 0.3);
      g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
      tint(g, colors[1], colors[0], 0, h);
      blades.push(g);
    }
    const tuft = mergeGeometries(blades);
    blades.forEach((g) => g.dispose());
    const mat = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
    wind(mat, 0.5, 1.3);
    geo(tuft);
    const im = new THREE.InstancedMesh(tuft, mat, n);
    im.frustumCulled = false;
    im.receiveShadow = true;
    im.castShadow = false;
    const S = R * 2, base = [];
    for (let i = 0; i < n; i += 1) base.push([rnd() * S, rnd() * S, rnd() * Math.PI * 2, 0.7 + rnd() * 0.6, rnd()]);
    const col = new THREE.Color();
    let lx = 1e9, lz = 1e9;
    function place(px, pz) {
      for (let i = 0; i < n; i += 1) {
        const b = base[i];
        const x = b[0] + S * Math.round((px - b[0]) / S), z = b[1] + S * Math.round((pz - b[1]) / S);
        const d = Math.hypot(x - px, z - pz);
        const dens = d > R ? 0 : density(x, z);
        const vis = dens > b[4] * 0.999 ? 1 : 0;
        const fade = Math.min(1, (R - d) / 8);
        const s = vis * b[3] * Math.max(0, fade) * (0.6 + dens * 0.5);
        _o.position.set(x, hgt(x, z) - 0.02, z);
        _o.rotation.set(0, b[2], 0);
        _o.scale.set(s, s, s);
        _o.updateMatrix();
        im.setMatrixAt(i, _o.matrix);
        col.setHSL(0.22 + b[4] * 0.05, 0.4, 0.8 + b[4] * 0.3);
        im.setColorAt(i, col);
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    stage.add(im);
    updates.push((t, dt, st) => {
      if (!st) return;
      if (Math.abs(st.x - lx) + Math.abs(st.z - lz) > 2.5) { lx = st.x; lz = st.z; place(lx, lz); }
    });
    return im;
  }

  /* ------------------------------------------------ water */
  let waterNormalCanvas = null;
  function waterNormal() {
    if (!waterNormalCanvas) {
      const S = LOW ? 256 : 512, Hc = canvas(S, S), g = Hc.getContext("2d"), img = g.createImageData(S, S);
      const R = mulberry(5), waves = [];
      for (let i = 0; i < 14; i += 1) waves.push([1 + ((R() * 6) | 0), ((R() * 7) | 0) - 3, R() * 6.28, 0.4 + R()]);
      for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) {
        let h = 0;
        for (const [a, b, p, amp] of waves) h += Math.sin(((a * x + b * y) / S) * Math.PI * 2 + p) * amp / (a + Math.abs(b));
        const v = 128 + h * 60, o = (y * S + x) * 4;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = v; img.data[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      waterNormalCanvas = normalFromHeight(Hc, 3.2);
    }
    return waterNormalCanvas;
  }
  const waters = [];
  /**
   * Layered water: two scrolling normal layers (normalMap + clearcoatNormalMap),
   * a Fresnel blend toward the current sky horizon colour and sun glints.
   */
  function waterMaterial({ color = "#2c5f62", opacity = 0.9, repeat = [2, 12], flow = [0, 0.03], flow2 = [0.012, -0.018], rough = 0.08, scale = 0.5 } = {}) {
    /* one tiling normal map sampled twice with independent scroll offsets
       (cheap, robust on every GPU), a Fresnel blend toward the sky horizon
       colour and a low roughness for sun glints */
    const n1 = toTex(waterNormal(), { srgb: false });
    n1.repeat.set(repeat[0], repeat[1]);
    const m = track(new THREE.MeshStandardMaterial({
      color, roughness: rough, metalness: 0.02, transparent: true, opacity,
      normalMap: n1, normalScale: new THREE.Vector2(scale, scale),
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    }));
    const uSky = { value: new THREE.Color("#9fb7c4") };
    const uOff1 = { value: new THREE.Vector2() }, uOff2 = { value: new THREE.Vector2() };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uSky = uSky;
      sh.uniforms.uOff1 = uOff1;
      sh.uniforms.uOff2 = uOff2;
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uSky;\nuniform vec2 uOff1, uOff2;")
        .replace("vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;",
          "vec3 mapN = normalize( ( texture2D( normalMap, vNormalMapUv + uOff1 ).xyz * 2.0 - 1.0 ) + ( texture2D( normalMap, vNormalMapUv * 1.73 + uOff2 ).xyz * 2.0 - 1.0 ) );")
        .replace("#include <tonemapping_fragment>", `{
          vec3 vdir = normalize( vViewPosition );
          float ndv = clamp( dot( vdir, normalize( normal ) ), 0.0, 1.0 );
          float fr = pow( 1.0 - ndv, 4.0 );
          gl_FragColor.rgb = mix( gl_FragColor.rgb, uSky * 0.72, clamp( fr * 0.7, 0.0, 0.5 ) );
          gl_FragColor.a = mix( gl_FragColor.a, 1.0, fr );
        }
        #include <tonemapping_fragment>`);
    };
    m.customProgramCacheKey = () => "yfx-water2";
    waters.push({ m, uOff1, uOff2, flow, flow2, uSky });
    return m;
  }
  function foamMaterial({ repeat = [1, 8], speed = 0.04 } = {}) {
    const S = 256, c = canvas(S, S), g = c.getContext("2d"), R = mulberry(17);
    g.clearRect(0, 0, S, S);
    for (let i = 0; i < 900; i += 1) {
      const x = R() * S, y = R() * S, w = 2 + R() * 10, a = 0.15 + R() * 0.5;
      const edge = 1 - Math.abs(x / S - 0.5) * 2;
      g.fillStyle = `rgba(255,255,255,${a * (1 - edge * 0.85)})`;
      g.beginPath(); g.ellipse(x, y, w * 0.4, w, 0, 0, 7); g.fill();
    }
    const t = toTex(c);
    t.repeat.set(repeat[0], repeat[1]);
    const m = track(new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    updates.push((time) => { if (!stage.reducedMotion) t.offset.y = -time * speed; });
    return m;
  }

  /* ------------------------------------------------ soft sprite textures */
  let softTex = null;
  function soft() {
    if (!softTex) {
      const S = 128, c = canvas(S, S), g = c.getContext("2d");
      const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
      softTex = toTex(c);
      softTex.wrapS = softTex.wrapT = THREE.ClampToEdgeWrapping;
    }
    return softTex;
  }
  let cloudTexC = null;
  function cloudTex() {
    if (!cloudTexC) {
      const S = 256, nz = makeNoise(31), A = canvas(S, S), g = A.getContext("2d"), img = g.createImageData(S, S);
      for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) {
        const u = x / S, v = y / S, d = Math.hypot(u - 0.5, v - 0.5) * 2;
        const n = nz.fbm(u * 6, v * 6, 8, 5);
        const a = Math.max(0, n * 1.6 - 0.45) * Math.max(0, 1 - d * d);
        const o = (y * S + x) * 4;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = 255; img.data[o + 3] = Math.min(255, a * 255);
      }
      g.putImageData(img, 0, 0);
      cloudTexC = toTex(A);
      cloudTexC.wrapS = cloudTexC.wrapT = THREE.ClampToEdgeWrapping;
    }
    return cloudTexC;
  }

  /* ------------------------------------------------ mist */
  const mists = [];
  /** Low banks of valley mist: soft sprites whose opacity follows the time of day. */
  function mistBank(list, { color = "#e9eef0", opacity = 0.5, morning = 1.6, night = 0.4 } = {}) {
    const tex = cloudTex();
    list.forEach(([x, y, z, sx, sy]) => {
      const m = track(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, fog: true }));
      const s = new THREE.Sprite(m);
      s.position.set(x, y, z);
      s.scale.set(sx, sy || sx * 0.32, 1);
      stage.add(s);
      mists.push({ s, m, base: opacity, morning, night, x, ph: Math.random() * 6 });
    });
  }
  /** Flat drifting mist sheet hanging at a height (tileable alpha noise). */
  function mistSheet(x, y, z, w, d, { opacity = 0.35, color = "#eef2f3", speed = 0.004, ring = null } = {}) {
    const S = 256, nz = makeNoise(43), A = canvas(S, S), g = A.getContext("2d"), img = g.createImageData(S, S);
    for (let yy = 0; yy < S; yy += 1) for (let xx = 0; xx < S; xx += 1) {
      const n = nz.fbm(xx / S * 4, yy / S * 4, 4, 5);
      const o = (yy * S + xx) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255; img.data[o + 3] = Math.max(0, Math.min(255, (n * 1.7 - 0.55) * 255));
    }
    g.putImageData(img, 0, 0);
    const t = toTex(A);
    t.repeat.set(w / 160, d / 160);
    const m = track(new THREE.MeshBasicMaterial({ map: t, color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
    const pl = new THREE.Mesh(geo(ring ? ringUV(ring[0], ring[1]) : new THREE.PlaneGeometry(w, d)), m);
    pl.rotation.x = -Math.PI / 2;
    pl.position.set(x, y, z);
    pl.renderOrder = 2;
    stage.add(pl);
    mists.push({ m, base: opacity, morning: 1.7, night: 0.5, sheet: t, speed });
    return pl;
  }

  function ringUV(r0, r1) {
    const g = new THREE.RingGeometry(r0, r1, 96, 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i += 1) uv.setXY(i, (p.getX(i) + r1) / (2 * r1), (p.getY(i) + r1) / (2 * r1));
    return g;
  }

  /* ------------------------------------------------ cloud dome */
  function cloudDome({ coverage = 0.5, scale = 1.4, speed = 0.004, tintC = "#ffffff" } = {}) {
    if (!walker) return null;
    const camFar = manager.camera.far;
    const u = {
      uTime, uSun: { value: walker.sunDir }, uZen: walker.skyU.zen, uHor: walker.skyU.hor, uGlow: walker.skyU.glow,
      uCov: { value: coverage }, uScale: { value: scale }, uSpeed: { value: speed }, uTint: { value: new THREE.Color(tintC) },
    };
    const m = track(new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, side: THREE.BackSide, fog: false,
      vertexShader: "varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `uniform float uTime,uCov,uScale,uSpeed;uniform vec3 uSun,uZen,uHor,uGlow,uTint;varying vec3 vDir;
        float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
        float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
        void main(){vec3 d=normalize(vDir);if(d.y<0.01)discard;
          vec2 p=d.xz/(d.y+.12)*uScale+vec2(uTime*uSpeed,uTime*uSpeed*.4);
          float c=fbm(p),c2=fbm(p*2.3+7.);
          float a=smoothstep(uCov,uCov+.28,c*.75+c2*.35)*smoothstep(.01,.18,d.y);
          float sd=max(dot(d,normalize(uSun)),0.);
          float lit=clamp(normalize(uSun).y*2.+.2,0.,1.);
          vec3 base=mix(uHor*.85,uZen*.6+uHor*.5,.35);
          vec3 col=mix(base*.75,uGlow*.9+base*.45,lit*.8)*uTint+uGlow*pow(sd,6.)*.6;
          col=mix(col,uHor,(1.-smoothstep(.02,.3,d.y))*.6);
          gl_FragColor=vec4(col,a*.92);}`,
    }));
    const dome = new THREE.Mesh(geo(new THREE.SphereGeometry(camFar * 0.8, 32, 12)), m);
    dome.frustumCulled = false;
    dome.renderOrder = -0.5;
    stage.add(dome);
    updates.push((t, dt, st) => { if (st) dome.position.set(st.x, 0, st.z); });
    return dome;
  }

  /* ------------------------------------------------ particles */
  function pointsMaterial(color, opacity, blending = THREE.NormalBlending, kind = "drop") {
    const frag = kind === "drop"
      ? "uniform vec3 uColor;uniform float uOpacity;varying float vA;void main(){vec2 p=gl_PointCoord-.5;float d=length(p);if(d>.5)discard;float hi=smoothstep(.22,0.,length(p-vec2(-.12,-.12)));gl_FragColor=vec4(uColor+hi*.6,(1.-smoothstep(.3,.5,d))*uOpacity*vA);}"
      : "uniform vec3 uColor;uniform float uOpacity;varying float vA;void main(){vec2 p=gl_PointCoord-.5;float d=length(p);if(d>.5)discard;gl_FragColor=vec4(uColor,pow(1.-d*2.,1.6)*uOpacity*vA);}";
    return track(new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uScale: { value: 300 } },
      transparent: true, depthWrite: false, blending,
      vertexShader: "attribute float aSize;attribute float aAlpha;uniform float uScale;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=aSize*uScale/max(.5,-mv.z);vA=aAlpha;}",
      fragmentShader: frag,
    }));
  }
  /**
   * Generic particle pool. type "drop": ballistic droplets that call onLand.
   * type "steam": rising, swelling, fading puffs.
   */
  function particles({ max = 1200, color = "#dff3ff", opacity = 0.85, size = 0.12, type = "drop", gravity = -9.8, groundY = null, onLand = null }) {
    const n = LOW ? Math.floor(max * 0.4) : max;
    const P = new Float32Array(n * 3), V = new Float32Array(n * 3), L = new Float32Array(n), L0 = new Float32Array(n), Sz = new Float32Array(n), Al = new Float32Array(n);
    const g = geo(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSize", new THREE.BufferAttribute(Sz, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(Al, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = pointsMaterial(color, opacity, THREE.NormalBlending, type === "drop" ? "drop" : "soft");
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 3;
    stage.add(pts);
    let head = 0;
    function emit(x, y, z, vx, vy, vz, count = 20, spread = 1, life = 1.4, sz = size) {
      for (let k = 0; k < count; k += 1) {
        const i = head; head = (head + 1) % n;
        P[i * 3] = x + (Math.random() - 0.5) * 0.1; P[i * 3 + 1] = y; P[i * 3 + 2] = z + (Math.random() - 0.5) * 0.1;
        V[i * 3] = vx + (Math.random() - 0.5) * spread; V[i * 3 + 1] = vy + (Math.random() - 0.3) * spread; V[i * 3 + 2] = vz + (Math.random() - 0.5) * spread;
        L[i] = L0[i] = life * (0.7 + Math.random() * 0.6);
        Sz[i] = sz * (0.6 + Math.random() * 0.8);
        Al[i] = 1;
      }
    }
    updates.push((t, dt) => {
      mat.uniforms.uScale.value = renderer.domElement.height / 2 / Math.tan((manager.camera.fov * Math.PI) / 360);
      for (let i = 0; i < n; i += 1) {
        if (L[i] <= 0) { Al[i] = 0; continue; }
        L[i] -= dt;
        const k = i * 3;
        if (type === "drop") {
          V[k + 1] += gravity * dt;
          P[k] += V[k] * dt; P[k + 1] += V[k + 1] * dt; P[k + 2] += V[k + 2] * dt;
          if (groundY) {
            const gy = groundY(P[k], P[k + 2]);
            if (P[k + 1] < gy) { if (onLand && Math.random() < 0.08) onLand(P[k], gy, P[k + 2]); L[i] = 0; }
          }
          Al[i] = Math.min(1, L[i] / 0.3);
        } else {
          const age = 1 - L[i] / L0[i];
          V[k + 1] *= 0.995;
          P[k] += (V[k] + Math.sin(t * 0.7 + i) * 0.15) * dt; P[k + 1] += V[k + 1] * dt; P[k + 2] += V[k + 2] * dt;
          Sz[i] += dt * size * 0.9;
          Al[i] = Math.sin(Math.min(1, age) * Math.PI) * 0.9;
        }
      }
      g.attributes.position.needsUpdate = true;
      g.attributes.aSize.needsUpdate = true;
      g.attributes.aAlpha.needsUpdate = true;
    });
    return { emit, points: pts };
  }
  /** Wet ground marks that darken the paving then dry out. */
  function wetMarks({ max = 140, color = "#0f1a1c", opacity = 0.32, life = 9 } = {}) {
    const n = LOW ? 50 : max;
    const tex = soft();
    const m = track(new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    const g = geo(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    const im = new THREE.InstancedMesh(g, m, n);
    im.frustumCulled = false;
    const data = [];
    for (let i = 0; i < n; i += 1) { data.push({ x: 0, y: -999, z: 0, r: 0, t: 0 }); _o.position.set(0, -999, 0); _o.scale.set(0.001, 1, 0.001); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); }
    stage.add(im);
    let head = 0;
    function add(x, y, z, r = 0.8 + Math.random() * 1.2) { const d = data[head]; head = (head + 1) % n; Object.assign(d, { x, y: y + 0.03, z, r, t: life }); }
    updates.push((t, dt) => {
      for (let i = 0; i < n; i += 1) {
        const d = data[i];
        if (d.t <= 0) continue;
        d.t -= dt;
        const s = d.r * Math.min(1, d.t / (life * 0.6)) + 0.001;
        _o.position.set(d.x, d.y, d.z); _o.rotation.set(0, 0, 0); _o.scale.set(s, 1, s); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    });
    return { add };
  }
  /** Falling flower petals over an area (festival). */
  function petals({ x, z, w, d, top = 9, count = 260, hgt, colors = ["#f6a1bf", "#ffe1ea", "#f5c442", "#ff8a5b"] }) {
    const n = LOW ? Math.floor(count * 0.35) : count;
    const g = geo(new THREE.PlaneGeometry(0.12, 0.08));
    const m = track(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7 }));
    const im = new THREE.InstancedMesh(g, m, n);
    im.frustumCulled = false;
    const P = [], col = new THREE.Color();
    for (let i = 0; i < n; i += 1) {
      P.push({ x: x + (Math.random() - 0.5) * w, y: Math.random() * top, z: z + (Math.random() - 0.5) * d, ph: Math.random() * 6, sp: 0.4 + Math.random() * 0.5 });
      im.setColorAt(i, col.set(colors[i % colors.length]));
    }
    stage.add(im);
    updates.push((t, dt) => {
      P.forEach((p, i) => {
        if (!stage.reducedMotion) {
          p.y -= p.sp * dt;
          p.x += Math.sin(t * 1.3 + p.ph) * dt * 0.5;
          const gy = hgt(p.x, p.z);
          if (p.y < gy + 0.05) { p.y = gy + top; p.x = x + (Math.random() - 0.5) * w; p.z = z + (Math.random() - 0.5) * d; }
        }
        _o.position.set(p.x, p.y, p.z);
        _o.rotation.set(t * 2 + p.ph, t * 1.3 + p.ph, 0);
        _o.scale.set(1, 1, 1);
        _o.updateMatrix();
        im.setMatrixAt(i, _o.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
    });
    return im;
  }

  /* ------------------------------------------------ contact shadows */
  function contactShadows(getList, { max = 220, opacity = 0.42 } = {}) {
    const m = track(new THREE.MeshBasicMaterial({ map: soft(), color: 0x000000, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    const g = geo(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    const im = new THREE.InstancedMesh(g, m, max);
    im.frustumCulled = false;
    im.renderOrder = 1;
    stage.add(im);
    updates.push(() => {
      const L = getList();
      const n = Math.min(max, L.length);
      for (let i = 0; i < n; i += 1) {
        const p = L[i];
        _o.position.set(p.x, p.y + 0.04, p.z); _o.rotation.set(0, p.ry || 0, 0); _o.scale.set(p.r * 2, 1, (p.rz || p.r) * 2); _o.updateMatrix();
        im.setMatrixAt(i, _o.matrix);
      }
      im.count = n;
      im.instanceMatrix.needsUpdate = true;
    });
    return im;
  }

  /* ------------------------------------------------ distant terrain beyond the walkable area */
  function farTerrain({ heightFn, colorFn, bounds, extent = 3200, segments = 180, sink = 10, margin = 6 }) {
    const seg = LOW ? Math.floor(segments * 0.6) : segments;
    const cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    const g = new THREE.PlaneGeometry(extent, extent, seg, seg);
    g.rotateX(-Math.PI / 2);
    g.translate(cx, 0, cz);
    const p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i += 1) {
      const x = p.getX(i), z = p.getZ(i);
      const inside = x > bounds.x0 + margin && x < bounds.x1 - margin && z > bounds.z0 + margin && z < bounds.z1 - margin;
      const h = heightFn(x, z);
      p.setY(i, inside ? h - sink : h - 0.6);
      const v = colorFn(x, z, h);
      if (v && v.isColor) c.copy(v); else c.setRGB(v[0], v[1], v[2]);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    g.computeVertexNormals();
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    const mesh = new THREE.Mesh(geo(g), track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
    mesh.receiveShadow = true;
    stage.add(mesh);
    return mesh;
  }

  /* ------------------------------------------------ post-processing (high quality only) */
  async function post({ bloom = { strength: 0.32, radius: 0.55, threshold: 0.88 }, grade = {} } = {}) {
    if (LOW) return null;
    try {
      const base = "../../../../vendor/three/addons/postprocessing/";
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { ShaderPass }] = await Promise.all([
        import(base + "EffectComposer.js"), import(base + "RenderPass.js"), import(base + "UnrealBloomPass.js"),
        import(base + "OutputPass.js"), import(base + "ShaderPass.js"),
      ]);
      if (stage.disposed) return null;
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: renderer.capabilities.isWebGL2 ? 4 : 0 });
      const composer = new EffectComposer(renderer, rt);
      composer.setPixelRatio(1);
      composer.setSize(size.x, size.y);
      const rp = new RenderPass(stage.scene, manager.camera);
      composer.addPass(rp);
      /* clamp very bright / non-finite pixels (tiny specular hot spots in the half-float
         buffer) so the bloom blur cannot smear them across the frame */
      composer.addPass(new ShaderPass({
        uniforms: { tDiffuse: { value: null } },
        vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: "uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);if(isnan(c.r)||isnan(c.g)||isnan(c.b)||isinf(c.r)||isinf(c.g)||isinf(c.b))c.rgb=vec3(0.);gl_FragColor=vec4(clamp(c.rgb,0.,24.),1.);}",
      }));
      const bp = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), bloom.strength, bloom.radius, bloom.threshold);
      composer.addPass(bp);
      composer.addPass(new OutputPass());
      const gp = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          uTint: { value: new THREE.Color(grade.tint || "#ffffff") },
          uContrast: { value: grade.contrast ?? 1.05 },
          uSat: { value: grade.saturation ?? 1.06 },
          uVig: { value: grade.vignette ?? 0.32 },
          uLift: { value: grade.lift ?? 0.0 },
        },
        vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: `uniform sampler2D tDiffuse;uniform vec3 uTint;uniform float uContrast,uSat,uVig,uLift;varying vec2 vUv;
          void main(){vec4 c=texture2D(tDiffuse,vUv);vec3 col=c.rgb*uTint;float l=dot(col,vec3(.2126,.7152,.0722));
          col=mix(vec3(l),col,uSat);col=(col-.5)*uContrast+.5+uLift;vec2 d=vUv-.5;col*=1.-uVig*dot(d,d)*1.8;
          gl_FragColor=vec4(clamp(col,0.,1.),1.);}`,
      });
      composer.addPass(gp);
      const sz = new THREE.Vector2();
      stage.render = (r, scene, camera) => {
        if (stage.quality === "low") { r.render(scene, camera); return; }
        r.getDrawingBufferSize(sz);
        if (sz.x !== composer._w || sz.y !== composer._h) {
          composer._w = sz.x; composer._h = sz.y;
          composer.setSize(sz.x, sz.y);
          bp.resolution.set(sz.x / 2, sz.y / 2);
        }
        rp.scene = scene;
        rp.camera = camera;
        composer.render();
      };
      fx.composer = composer;
      fx.bloomPass = bp;
      fx.gradePass = gp;
      const prevDispose = stage.dispose.bind(stage);
      stage.dispose = () => {
        stage.render = null;
        try { composer.dispose(); bp.dispose(); rt.dispose(); } catch (e) { /* ignore */ }
        prevDispose();
      };
      return composer;
    } catch (error) {
      console.warn("Post-processing unavailable, rendering directly.", error);
      return null;
    }
  }

  /* ------------------------------------------------ per-frame */
  stage.animate((time, delta) => {
    if (!stage.reducedMotion) uTime.value = time;
    const st = walker ? walker.st : null;
    if (walker) waters.forEach((w) => w.uSky.value.copy(walker.skyU.hor.value));
    if (!stage.reducedMotion) {
      waters.forEach((w) => {
        w.uOff1.value.set(time * w.flow[0], time * w.flow[1]);
        w.uOff2.value.set(time * w.flow2[0], time * w.flow2[1]);
      });
      mists.forEach((m) => {
        if (m.sheet) m.sheet.offset.x = time * m.speed;
        if (m.s) m.s.position.x = m.x + Math.sin(time * 0.05 + m.ph) * 6;
      });
    }
    const dt = Math.min(delta || 0.016, 0.05);
    updates.forEach((fn) => fn(time, stage.reducedMotion ? 0 : dt, st));
  });

  /* call from the walker's onTime: mist thickens in the morning, thins at midday */
  function setMood({ day, night, y }) {
    const morning = Math.max(0, 1 - Math.abs(y - 0.18) / 0.3) * (1 - night);
    mists.forEach((m) => {
      const k = 1 + (m.morning - 1) * morning * 1.2 - (1 - m.night) * night;
      m.m.opacity = Math.max(0, Math.min(1, m.base * k * (0.55 + 0.45 * (1 - day * 0.5))));
    });
    onTimes.forEach((fn) => fn({ day, night, y, morning }));
  }

  const fx = {
    attach: (w) => { walker = w; },
    LOW, uTime, surface, pbr, leafTexture, leafMaterial, wind, instances, grass, waterMaterial, foamMaterial,
    mistBank, mistSheet, cloudDome, particles, wetMarks, petals, contactShadows, farTerrain, post, setMood,
    soft, cloudTex, canvas, toTex, onUpdate: (fn) => updates.push(fn), onTime: (fn) => onTimes.push(fn), track, geo,
  };
  return fx;
}
