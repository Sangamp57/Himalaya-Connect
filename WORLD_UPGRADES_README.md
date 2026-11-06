# World upgrades: animals, rides and solid objects

This phase adds animals, rides and collisions to all eleven 3D worlds. It also improves the graphics of Dunhuang, Turpan, Kashgar and the Great Journey.

## What every world now has

- **Five or more local animals, each with an ⓘ badge.** Click the badge, or press **E** when you are close, to open a discovery card. Each card has the species story, a fact and a quiz (English and Chinese), names in all four languages, and a Wikimedia Commons photo.
  - These cards use the new **"Animals & wildlife"** category (paw icon). Their ids follow the pattern `an-<world>-<species>`.
- **At least one famous local ride.** Press **F** (or tap the prompt) to get on and off.
  - While you ride, **WASD** steers and **Shift** goes faster.
  - Using Travel gets you off the ride first.
- **No walking through objects.** Buildings, walls, posts, rocks and tree trunks get box or circle colliders that are generated automatically from their meshes. The visitor slides along walls instead of stopping dead.
  - Animals and parked rides also block the visitor.
  - Roofs, canopies and low kerbs are skipped. So are place spawns and beacons, so they always stay reachable.

## Per world

| World | Ride(s) | Animals (ⓘ) | New discovery |
|---|---|---|---|
| Dunhuang | Bactrian camel; sand sled down the Mingsha dunes | camel, donkey, goitered gazelle, golden eagle, fat-tailed sheep | `cn-mingsha` Singing sands |
| Turpan | donkey cart (under the grape-trellis lane); camel | donkey, camel, sheep, goat, golden eagle | `cn-liangfang` Grape drying houses |
| Kashgar | donkey cart; horse (livestock market) | donkey, horse, sheep, camel, goat | `cn-livestock` Sunday livestock market |
| The Great Journey | open jeep on the Karakoram Highway loop; yak | yak, bharal, snow leopard, griffon vulture, horse, golden eagle | `jo-kkh` Karakoram Highway |
| Karakoram Route | jeeps at Chilas, Karimabad and Sost; yak at Khunjerab | yak, Marco Polo sheep, ibex, markhor, snow leopard, golden eagle | – |
| Hunza Valley | Hunza horse; yak; boat on Attabad Lake | horse, yak, markhor, ibex, golden eagle | – |
| Skardu | polo pony on the new polo ground; yak; zak (goat-skin) raft on the Indus | horse, yak, Himalayan brown bear, ibex, golden eagle | `pk-polo` Free-style polo |
| Pokhara | **paragliding from Sarangkot**; doonga boats on Phewa | water buffalo, hill cow, griffon vulture, rhesus macaque, goat | `np-barahi` Tal Barahi temple |
| Pu'er | Yunnan pony on the Tea Horse Road | caravan mule, horse, buffalo, goat, eagle | – |
| Xishuangbanna | elephant trek; Lancang boats | Asian elephant, peacock, buffalo, macaque, goat, eagle | – |
| Kathmandu | cycle rickshaw | sacred cow, street dog (Kukur Tihar), macaque, goat, buffalo | – |

**Paragliding.** To launch, walk off the Sarangkot ridge. Thermals over the sunny slopes lift you, and Shift makes you dive. You land on any open ground, but not on the lake.

## Graphics and glitch fixes

**Dunhuang**
- Real sand dunes with crests, plus a rippled sand texture.
- Water surface on Crescent Lake, ringed by reeds.
- The two-storey Yueya pavilion.
- The Mogao cliff now has cave rows, wooden galleries and the red nine-storey hall.
- Adobe courtyard houses with grape trellises, poplars, and a lantern-lit night market.

**Turpan**
- The Flaming Mountains are now a red, gullied ridge.
- The Emin Minaret is now textured brick.
- Grape drying houses with brick lattice walls.
- A grape-trellis lane and a naan oven with smoke.
- Glitch fixed: the floating 70 × 56 slab is gone.

**Kashgar**
- Brick-paved ground, which replaces the z-fighting paving slab.
- The Id Kah Mosque has a new ochre façade, a pointed iwan and two minarets.
- The city gate is now a real gateway with walls you can walk through.
- A new livestock market area.

**The Great Journey**
- A smoothed highway bed with asphalt, a centre line, kilometre stones, bilingual signs and a painted truck.

**All upgraded worlds**
- Cloud dome and contact shadows.
- Wind-blown grass and a light post-processing grade.
- Desert and alpine sky presets.
- Flat-coloured materials now get matching PBR textures (plaster, mud, stone, wood and cloth) with world-scaled UVs.

**Engine fixes**
- `stage.material()` now honours `vertexColors`.
- The emissive colour is now part of its cache key.
- Near a ride, the prompt offers "Ride", not the animal's info card.

## New and changed files

- `static/js/explore/three/worlds/fauna.js` (new):
  - animal models: camel, yak, sheep, goat, ibex, markhor, Marco Polo sheep, snow leopard, gazelle, zebu, bear, monkey, dog, plus the existing horse, mule, donkey, elephant and buffalo;
  - herds that wander, graze and flee, and soaring birds;
  - rides: animals, donkey cart, jeep, paraglider, boat, zak raft, sand sled and rickshaw.
- `static/js/explore/three/worlds/world-upgrade.js` (new): auto-colliders, retexturing, atmosphere, and the `upgradeWorld()` helper.
- `static/js/explore/wildlife-data.js` (new): species texts, Commons photos and the world-to-animal list.
- `walk-engine.js`:
  - info badges (`addInfoTarget`), moving blockers (`addBlocker`);
  - straddle and stand ride poses, custom "can't get off here" notes.
- `walk-town.js`: the new `upgrade: { grass, clouds, post, animals }` option.
- The world files dunhuang, turpan, kashgar, journey, pokhara, skardu, hunza-walkable, karakoram, puer, xishuangbanna and kathmandu.
- `data.js` (wildlife category and the new discoveries), `icons.js` (paw icon), `object-images.js` (animal photos) and `helpers.js`.

## Testing

Each world was loaded in headless Chromium (SwiftShader). The tests checked three things:
- that each ride's step function moves it and produces a valid seat;
- that a dismount spot is found;
- that no collider sits on top of a place's spawn point.

The page-error check across all eleven worlds is in the summary of this delivery.

## Phase 2: photos, shops, ride icons and the 3D World Guide

- **A real photo on every card.** Every discovery and animal card now shows a Wikimedia Commons photo, with the author and licence linked under it. Before this phase, the 7 newest cards had none.
- **Five new shops**, built like the Hunza shawl stall. Each has a counter of goods, a sign and a seller, and opens a discovery card with a real photo:
  - Feitian mural art shop, Dunhuang (`cn-feitian`)
  - raisin stall, Turpan (`cn-raisins`)
  - singing-bowl shop, Pokhara (`np-bowl`)
  - gemstone shop, Skardu (`pk-gems`)
  - trail teahouse with butter tea, Great Journey (`jo-buttertea`)

  Maps that already had shops were skipped: Hunza, Kathmandu, Kashgar, Karakoram, Pu'er and Xishuangbanna.
- **Ride icons:**
  - every ride has a floating teal ride badge in the world;
  - every ride also has an icon on the mini-map, which turns gold when the ride is in reach.
- **3D World Guide.** The Guide view has a new tab, "3D world guide". For each world it shows:
  - how to play;
  - every ride and where it waits, with a "Go there" button;
  - the shops;
  - the animals, which open their cards;
  - every place, with a picture taken inside the game, what you can discover there, and "Go there".
- **More interactions:**
  - Tame animals stop and turn to look at you when you walk up to them.
  - The first time you try each ride, a note tells you how many of that world's rides you have tried (e.g. "New ride: a Bactrian camel · 1/2").

New files:
- `static/js/explore/world-guide.js`
- `static/js/explore/world-guide-data.js`
- `static/js/explore/three/worlds/shops.js`
- `static/images/guide/*.webp` (the in-game pictures)
