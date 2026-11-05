/* End-to-end test of the Pu'er and Xishuangbanna walkable worlds.
   Usage: node tests/yunnan_worlds_e2e.js [baseUrl]   (screenshots go to shots/e2e-*.png) */
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://127.0.0.1:8000";
const results = [];
require("fs").mkdirSync("shots", { recursive: true });
const ok = (name, pass, info = "") => { results.push({ name, pass, info }); console.log((pass ? "PASS " : "FAIL ") + name + (info ? "  — " + info : "")); };

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const consoleErrors = [], externalErrors = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/ERR_TUNNEL|ERR_NAME|ERR_CONNECTION|Failed to load resource/.test(t)) externalErrors.push(t); else consoleErrors.push(t);
  });
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
  const shot = (n) => page.screenshot({ path: `shots/e2e-${n}.png`, timeout: 180000 });
  const waitWorld = async (id) => {
    await page.waitForFunction((id) => window.__walk && window.__walk.st && document.location.hash.includes(id), id, { timeout: 180000 });
    await page.waitForTimeout(2500);
  };
  const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };

  for (const world of ["puer", "xishuangbanna"]) {
    console.log("\n=== " + world + " ===");
    await page.goto(`${BASE}/explore/#world/${world}`);
    await waitWorld(world);
    const info = await page.evaluate(() => {
      const W = window.__walk;
      return { n: W.stage.interactives.length, ids: W.stage.interactives.map((e) => e.id), colliders: W.kit.COLLIDERS.length, boxes: W.kit.COLLIDERS.filter((c) => c.box).length, npcs: W.NPC.length };
    });
    ok(`${world}: 10 golden beacons registered`, info.n === 10, info.ids.join(", "));
    ok(`${world}: colliders registered`, info.boxes > 40, `${info.boxes} boxes, ${info.colliders - info.boxes} circles, ${info.npcs} NPCs`);
    const known = await page.evaluate((ids) => import("/static/js/explore/data.js").then((d) => ids.filter((i) => !d.OBJECT_MAP[i])), info.ids);
    ok(`${world}: every beacon has a data.js discovery`, known.length === 0, known.join(","));

    /* walking with W */
    await page.click("canvas", { position: { x: 640, y: 420 } }).catch(() => {});
    await page.keyboard.press("Escape");
    const p0 = await page.evaluate(() => ({ x: window.__walk.st.x, z: window.__walk.st.z }));
    await hold("KeyW", 4500);
    const p1 = await page.evaluate(() => ({ x: window.__walk.st.x, z: window.__walk.st.z }));
    const walked = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    ok(`${world}: W walks the player`, walked > 1, `moved ${walked.toFixed(1)} units`);
    await hold("ShiftLeft", 10).catch(() => {});

    /* collision: walk straight into building walls, then diagonally to test sliding */
    const col = await page.evaluate(async () => {
      const W = window.__walk, K = W.kit, st = W.st, c = W.controls;
      const boxes = K.COLLIDERS.filter((b) => b.box && b.hw > 1.5 && b.hd > 1.5);
      const out = { tested: 0, penetrated: 0, stoppedOutside: 0, slid: 0, details: [] };
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const keyDown = (code) => window.dispatchEvent(new KeyboardEvent("keydown", { code }));
      const keyUp = (code) => window.dispatchEvent(new KeyboardEvent("keyup", { code }));
      const inside = (b, x, z, pad) => { const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; return Math.abs(lx) < b.hw + pad && Math.abs(lz) < b.hd + pad; };
      for (let i = 0; i < boxes.length && out.tested < 8; i += 7) {
        const b = boxes[i];
        /* start 3.2 units outside the +z face (local), facing the box */
        const lx = 0, lz = b.hd + 3.2;
        const sx = b.x + lx * b.c + lz * b.s, sz = b.z - lx * b.s + lz * b.c;
        if (K.blocked(sx, sz, 0.6)) continue;
        st.x = sx; st.z = sz;
        await sleep(150);
        if (Math.hypot(st.x - sx, st.z - sz) > 0.5) continue; /* the spawn spot was not standable */
        const dx = b.x - sx, dz = b.z - sz;
        c.theta = c.desiredTheta = Math.atan2(-dx, -dz);
        keyDown("KeyW"); await sleep(6000); keyUp("KeyW");
        out.tested += 1;
        if (inside(b, st.x, st.z, 0.2)) out.penetrated += 1; else out.stoppedOutside += 1;
        /* diagonal approach: sliding along the face */
        st.x = sx; st.z = sz;
        await sleep(120);
        const ax = (b.c * 1 + b.s * 0), az = (-b.s * 1 + b.c * 0); /* local +x in world */
        const tx = dx + ax * 3.5, tz = dz + az * 3.5;
        c.theta = c.desiredTheta = Math.atan2(-tx, -tz);
        const before = { x: st.x, z: st.z };
        keyDown("KeyW"); await sleep(6000); keyUp("KeyW");
        const along = (st.x - before.x) * ax + (st.z - before.z) * az;
        if (along > 1.0 && !inside(b, st.x, st.z, 0.2)) out.slid += 1;
        out.details.push(`box@(${b.x.toFixed(0)},${b.z.toFixed(0)}) ${(b.hw * 2).toFixed(1)}x${(b.hd * 2).toFixed(1)} along=${along.toFixed(1)}`);
      }
      return out;
    });
    ok(`${world}: player never enters a building collider`, col.tested >= 4 && col.penetrated === 0, `${col.tested} walls tested, ${col.penetrated} penetrations`);
    ok(`${world}: player slides along walls when walking at an angle`, col.slid >= Math.max(2, col.tested - 2), `${col.slid}/${col.tested} slid; ${col.details.slice(0, 3).join("; ")}`);

    /* travel menu: open and pick the second place */
    await page.click(".ktm-btn--gold");
    await page.waitForTimeout(600);
    const menuItems = await page.$$eval(".ktm-menu button", (bs) => bs.map((b) => b.textContent.trim().slice(0, 40)));
    ok(`${world}: Travel menu lists places`, menuItems.length >= 8, menuItems.length + " places");
    await page.click(".ktm-menu button:nth-of-type(2)");
    await page.waitForTimeout(3000);
    const trav = await page.evaluate(() => ({ x: window.__walk.st.x, z: window.__walk.st.z }));
    ok(`${world}: Travel moves the player`, Math.hypot(trav.x - p1.x, trav.z - p1.z) > 10, `now at ${trav.x.toFixed(0)}, ${trav.z.toFixed(0)}`);
    await shot(`${world}-travel`);

    /* beacon: walk to the nearest beacon and press E */
    const target = await page.evaluate(() => {
      const W = window.__walk, st = W.st;
      let best = null, bd = 1e9;
      Object.entries(W.POS).forEach(([id, p]) => { const d = Math.hypot(p.x - st.x, p.z - st.z); if (d < bd) { bd = d; best = { id, ...p }; } });
      st.x = best.x + 1.5; st.z = best.z + 1.5;
      return best;
    });
    await page.waitForTimeout(1500);
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(1800);
    const drawer = await page.evaluate(() => { const d = document.getElementById("object-drawer"); return d && !d.hidden ? document.getElementById("object-drawer-content").innerText.slice(0, 120) : null; });
    ok(`${world}: E at a beacon opens the discovery card`, Boolean(drawer), `${target.id}: ${(drawer || "").replace(/\s+/g, " ").slice(0, 70)}`);
    await shot(`${world}-beacon-en`);

    /* language switch: HUD 中文 button */
    await page.keyboard.press("Escape");
    await page.evaluate(() => { const c = document.querySelector('[data-object-action="close"], .ex-object-drawer [aria-label*="lose"]'); if (c) c.click(); });
    await page.click('.ktm-hud [data-k="lang"]');
    await page.waitForTimeout(2500);
    const zh = await page.evaluate(() => ({ lang: window.__walk.getLang(), place: document.querySelector('.ktm-place b').textContent, travel: document.querySelector('.ktm-btn--gold').textContent, time: document.querySelector('[data-k="time"]').textContent }));
    ok(`${world}: 中文 switch changes HUD to Chinese`, zh.lang === "zh" && /[一-鿿]/.test(zh.place + zh.travel), JSON.stringify(zh));
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(1800);
    const drawerZh = await page.evaluate(() => { const d = document.getElementById("object-drawer"); return d && !d.hidden ? document.getElementById("object-drawer-content").innerText : ""; });
    const cjk = (drawerZh.match(/[一-鿿]/g) || []).length;
    ok(`${world}: discovery card is Chinese (name, story, fact)`, cjk > 120, `${cjk} Chinese characters in the card`);
    await shot(`${world}-beacon-zh`);
    await page.keyboard.press("Escape");
    await page.click('.ktm-hud [data-k="lang"]');
    await page.waitForTimeout(1200);
    const en = await page.evaluate(() => window.__walk.getLang());
    ok(`${world}: switch back to English`, en === "en");

    /* riding (Xishuangbanna): F mounts the nearest boat / elephant, steering moves it, F gets off */
    if (world === "xishuangbanna") {
      for (const [place, kind] of [["pier", "boat"], ["trek", "elephant"]]) {
        await page.evaluate((p) => window.__walk.travelTo(p), place);
        await page.waitForTimeout(3000);
        await page.evaluate((k) => { const W = window.__walk; const r = W.RIDES.find((q) => q.kind === k).pos(); W.st.x = r.x - (k === "boat" ? 4.2 : 3.4); W.st.z = r.z; }, kind);
        let shown = false;
        try { await page.waitForFunction(() => !document.querySelector(".ktm-prompt").hidden && /Ride|乘坐/.test(document.querySelector(".ktm-prompt").innerText), null, { timeout: 120000 }); shown = true; } catch (e) { /* reported below */ }
        await page.keyboard.press("KeyF");
        let mounted = false;
        try { await page.waitForFunction((k) => window.__walk.isRiding() && window.__walk.isRiding().kind === k, kind, { timeout: 60000 }); mounted = true; } catch (e) { /* reported below */ }
        const a = await page.evaluate(() => ({ x: window.__walk.st.x, z: window.__walk.st.z }));
        await page.evaluate(() => { const c = window.__walk.controls; c.theta = c.desiredTheta = Math.PI; });
        await hold("KeyW", 9000);
        const b = await page.evaluate(() => ({ x: window.__walk.st.x, z: window.__walk.st.z }));
        ok(`${world}: ride the ${kind} (F to mount, W to steer)`, shown && mounted && Math.hypot(b.x - a.x, b.z - a.z) > 1, `moved ${Math.hypot(b.x - a.x, b.z - a.z).toFixed(1)} units while riding`);
        await shot(`${world}-ride-${kind}`);
        await page.evaluate(() => window.__walk.travelTo("village"));
        await page.waitForTimeout(3000);
        ok(`${world}: Travel gets the player off the ${kind}`, await page.evaluate(() => !window.__walk.isRiding()));
      }
    }

    /* time of day: cycle to night and check lamps/windows glow */
    const t0 = await page.evaluate(() => window.__walk.sun.intensity);
    for (let i = 0; i < 3; i += 1) { await page.click('.ktm-hud [data-k="time"]'); await page.waitForTimeout(500); }
    const night = await page.evaluate(() => ({ idx: window.__walk.getTimeIdx(), sun: window.__walk.sun.intensity, glow: Math.max(...window.__walk.lights.nightMats.map((m) => m.emissiveIntensity)), label: document.querySelector('[data-k="time"]').textContent }));
    ok(`${world}: time of day cycles to night`, night.idx === 3 && night.sun < t0 && night.glow > 0.5, JSON.stringify(night));
    await page.evaluate(() => window.__walk.travelTo(Object.keys(window.__walk.POS).length ? (document.location.hash.includes("puer") ? "teahouse" : "square") : "village"));
    await page.waitForTimeout(3200);
    await shot(`${world}-night`);
    await page.click('.ktm-hud [data-k="time"]');
    await page.waitForTimeout(600);
  }

  /* switching worlds: Pu'er -> Kathmandu (old world) -> Xishuangbanna -> Turpan -> Pu'er */
  console.log("\n=== switching worlds ===");
  for (const w of ["kathmandu", "xishuangbanna", "turpan", "puer"]) {
    const t = Date.now();
    await page.evaluate((w) => { document.location.hash = "#world/" + w; }, w);
    await page.waitForTimeout(800);
    try {
      await waitWorld(w);
      const huds = await page.$$eval(".ktm-hud", (h) => h.length);
      ok(`switch to ${w}`, huds === 1, `loaded in ${((Date.now() - t) / 1000).toFixed(1)} s, ${huds} HUD`);
    } catch (e) { ok(`switch to ${w}`, false, e.message.slice(0, 80)); }
  }
  await shot("switch-back-puer");

  ok("no console errors from the app", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));
  console.log(`(ignored ${externalErrors.length} blocked external requests: map tiles / web fonts are not reachable from the test sandbox)`);
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  require("fs").writeFileSync("shots/e2e-results.json", JSON.stringify({ results, consoleErrors, externalErrors: externalErrors.length }, null, 2));
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})();
