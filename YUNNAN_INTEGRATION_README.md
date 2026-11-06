# Yunnan worlds: Pu'er 普洱 and Xishuangbanna 西双版纳

Two new walkable 3D worlds for the Himalaya Connect explorer, built on the same engine and design as the walkable Kathmandu Valley (open-world walking, follow camera, blocky players and NPCs, golden beacons, EN/中文, time of day, mini-map, Travel menu), with more realistic graphics and building collision.

- **Pu'er** (`#world/puer`): terraced tea hills with pickers, a tea workshop (杀青 kill-green woks, 揉捻 hand rolling, 晒青 sun-drying), a stone press for 七子饼 cakes, a gongfu tea house, the Jingmai ancient tea forest (UNESCO 2023) with a Bulang village, a covered bridge, a Tea Horse Road post station and a moving mule caravan. 10 discoveries `cn-pe-*`.
- **Xishuangbanna** (`#world/xishuangbanna`): a Dai stilt-house village, a Theravada temple, the Manfeilong-style white pagoda, the Water-Splashing Festival square (splash particles, wet ground, petals), dragon boats on the Lancang, a peacock-dance stage, palm-leaf scriptures, a pineapple-rice stall, rice paddies and the rainforest with wild elephants. 10 discoveries `cn-xb-*`.
  - **Rideable boats**: three boats at the Boat Pier (`游船码头`). Walk up to one, press **F** (or tap the prompt) to get in, steer with W A S D (Shift for full throttle), **F** again near a shore or pier to get out. The Lancang now runs about 3.3 km through the valley, well beyond the walkable map, past riverside villages, a high bridge, a hill stupa and wild elephants drinking at the bank.
  - **Rideable elephants**: two elephants with howdahs at the Elephant Trek station (`骑象`). F to climb on, steer with W A S D, F to get off. The wild herd in Wild Elephant Valley stays fenced and cannot be ridden.
  - Travel (or switching world) always gets you off first.

Both are `countryId: "china"` and appear in the home world list, the world dock, the overview islands, the culture map and two new scavenger hunts.

## Files

New

| File | What it is |
| --- | --- |
| `static/js/explore/three/worlds/puer.js` | Pu'er world (uses `buildWalkableTown`) |
| `static/js/explore/three/worlds/xishuangbanna.js` | Xishuangbanna world |
| `static/js/explore/three/worlds/yunnan-fx.js` | Realism kit: canvas albedo + normal + roughness maps, leaf cards, GPU wind sway, near-player grass, layered water, mist, cloud dome, particles, wet marks, petals, contact shadows, distant terrain, post-processing |
| `static/js/explore/three/worlds/yunnan-props.js` | Curved Chinese/Dai roofs, stilt houses, lanterns, lattice windows, signboards, animated mules/elephants/buffalo/peacocks, vegetation species |
| `static/vendor/three/addons/postprocessing/*.js`, `static/vendor/three/addons/shaders/*.js` | Unmodified three.js r169 addons (MIT): EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, OutputPass, Pass, MaskPass, CopyShader, LuminosityHighPassShader, OutputShader |
| `tests/yunnan_worlds_e2e.js` | Playwright end-to-end test |
| `YUNNAN_INTEGRATION_README.md` | This file |

Changed (all backwards compatible; older worlds behave as before, apart from the extra photos)

| File | Change |
| --- | --- |
| `three/worlds/walk-engine.js` | Oriented-box colliders `kit.blockBox(x, z, w, d, rotY)` and `kit.blockBoxIn(group, lx, lz, w, d)`, `kit.resolve()` push-out, `kit.COLLIDERS`; `blocked()` now tests boxes too. Sliding collision is opt-in with `createWalker({ collision: "slide" })`. Rideables: `W.addRideable({ kind, label, radius, blockR, pos, mount, step, dismount, reset })`, F to mount/dismount, seated player pose. NPC action poses (`act: "pick" | "work" | "roll" | "splash" | "dance" | "row" | "pray" | "pour"`), scripted NPCs (`kind: "script"`, `fixedY`), a few extra API fields (`kit`, `POS`, `getLang`, `getTimeIdx`, `skyU`). |
| `three/worlds/walk-town.js` | Optional `walker` options (passed to `createWalker`), `terrain.material`, `terrain.farHeightFn` (heights outside the map), `water[].curve`; `build()` also receives `canStand`. |
| `three/worlds/kathmandu-people.js` | 8 designs appended at the end (existing indices unchanged): `tea-picker`, `tea-master`, `mule-driver`, `bulang-woman`, `dai-woman`, `dai-man`, `novice-monk`, `peacock-dancer`; new hats; optional per-person `tint`, right-arm `waveR` and sideways `armZ` in `makeCrowd`. |
| `three/scene.js` | Two lines: if the stage has `stage.render`, it is used instead of `renderer.render` (post-processing). |
| `three/worlds/overview.js` | Two islands (`overview:puer`, `overview:xishuangbanna`). |
| `object-images.js` | Real photos for the 20 new discovery cards (Wikimedia Commons, author and licence in each credit), hosted locally in `static/images/objects/cn-pe-*.webp` and `cn-xb-*.webp`. |
| `data.js` | `WORLDS.puer` (order 10) and `WORLDS.xishuangbanna` (order 11); 20 curated objects inserted into `OBJECTS`; 2 `SCAVENGER_HUNTS`; 3 `MAP_LOCATIONS`. |
| `main.js` | `WORLD_BUILDERS.puer` / `.xishuangbanna` and the two overview labels. |

No template, Python or CSS changes. The post-processing addons are loaded with a relative dynamic `import()` from `yunnan-fx.js`, so the import map in `templates/explore/app.html` does not need a new entry and it also works with `ManifestStaticFilesStorage`.

## How to merge

The work is based on `main` at `38a8b4a`. `main` has since gained Dunhuang (`02cd3d4`); the branch merges onto it without conflicts in code. If you merge by hand:

1. Copy the new files listed above.
2. In `main.js`, add the two lines to `WORLD_BUILDERS` and the two `texts["overview:…"]` lines in `refreshSceneLabels()`.
3. In `data.js`, add the two `WORLDS` entries, the `SRC_YN` + `OBJECTS.push(...)` block (place it right after the `OBJECTS` array), the two hunts and the three map locations.
4. Replace `walk-engine.js`, `walk-town.js`, `kathmandu-people.js`, `scene.js` and `overview.js` with the new versions, or apply the diffs (`git diff 38a8b4a -- <file>`). If `overview.js` has changed on `main`, keep `main`'s version and add `miniPuer`, `miniBanna`, the two `island(...)` calls and the two `addInteractive(...)` calls.
5. Run the test below.

To give another walkable world sliding collision: pass `walker: { collision: "slide" }` to `buildWalkableTown` (or `collision: "slide"` to `createWalker`) and register buildings with `kit.blockBox`.

## How to run

```bash
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_content     # demo content and accounts (there is no seed_demo command)
python manage.py runserver
```

Open `http://127.0.0.1:8000/explore/#world/puer` or `#world/xishuangbanna`. Controls: W A S D to walk, Shift to run, drag to look, E or click a golden beacon to read, F to ride a boat or elephant, the HUD buttons for 中文/EN, time of day and Travel.

Quality: on phones or with Quality set to Low, plant counts, grass, particles and terrain resolution drop and post-processing is off. Reduced motion stops wind, water flow, particles and the caravan/boats.

## How to test

```bash
npm install playwright@1          # once; or use an existing Playwright install
npx playwright install chromium   # once
node tests/yunnan_worlds_e2e.js http://127.0.0.1:8000
```

It checks, for both worlds: 10 beacons that exist in `data.js`, walking, that the player cannot enter building colliders and slides along walls, the Travel menu, E opening a discovery card, the 中文 switch (HUD and card in Chinese), riding a boat and an elephant (Xishuangbanna), time of day to night, switching to Kathmandu, Turpan and back, and no console errors. Screenshots go to `shots/`.

## Content notes

All 20 discoveries have names in en/zh/ne/ur, summaries and stories in English and Chinese, and an English fact and quiz. Nepali and Urdu names were written by AI and should be checked by native speakers. Scenes are stylised composites, not survey maps; the post station is inspired by Nakeli (那柯里) and the pagoda by Manfeilong (曼飞龙白塔).
