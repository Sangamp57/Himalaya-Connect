import {
  BRIDGES,
  CARD_MAP,
  COUNTRIES,
  OBJECTS_BY_WORLD,
  OBJECT_MAP,
  SCAVENGER_HUNTS,
  WORLDS,
  applyDatabaseCatalogue,
} from "./data.js";
import { dirFor, translate } from "./i18n.js";
import { icon } from "./icons.js";
import { ExplorerStore } from "./store.js";
import { ExploreUI } from "./ui.js";
import { SceneManager, webglAvailable } from "./three/scene.js";
import { CultureMap } from "./map.js";
import { CulturalGuide } from "./guide.js";
import { WorldGuide } from "./world-guide.js";
import { SoundEngine } from "./audio.js";

const app = document.getElementById("explore-app");
if (!app) throw new Error("Explorer root not found.");

// The database is the source of truth for editable explorer catalogue content.
try {
  const response = await fetch(app.dataset.catalogueUrl || "/api/explorer/catalogue/", { credentials: "same-origin" });
  if (response.ok) applyDatabaseCatalogue(await response.json());
} catch (error) {
  // Keep the bundled catalogue available if the API is temporarily unavailable.
}

function localize(value, lang) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.en || "";
}

const store = new ExplorerStore();
const t = (key, vars) => translate(store.language, key, vars);
const sound = new SoundEngine(store.state.settings.sound);
const ui = new ExploreUI({ store });

// Signed-in players get a portable save game; guests continue using localStorage.
let serverSaveTimer = null;
function queueServerSave() {
  if (app.dataset.authenticated !== "true") return;
  window.clearTimeout(serverSaveTimer);
  serverSaveTimer = window.setTimeout(async () => {
    try {
      await fetch(app.dataset.progressSaveUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')?.content || "",
        },
        credentials: "same-origin",
        body: JSON.stringify({ progress: store.state }),
      });
    } catch (error) {
      // localStorage remains the offline fallback
    }
  }, 500);
}
if (app.dataset.authenticated === "true") {
  fetch(app.dataset.progressUrl, { credentials: "same-origin" })
    .then((response) => response.json())
    .then(({ progress }) => {
      if (progress) {
        store.loadServerState(progress);
        refreshAfterServerLoad();
      } else {
        queueServerSave();
      }
    })
    .catch(() => {});
  store.subscribe(queueServerSave);
}

const guide = new CulturalGuide({
  store,
  t,
  guideLive: app.dataset.guideLive === "true",
  endpoint: app.dataset.guideUrl || "/culture-guide/",
  csrfToken: document.querySelector('meta[name="csrf-token"]')?.content || "",
  elements: {
    form: document.getElementById("guide-form"),
    input: document.getElementById("guide-input"),
    send: document.getElementById("guide-send"),
    log: document.getElementById("guide-log"),
    suggestions: document.getElementById("guide-suggestions"),
    modeChip: document.getElementById("guide-mode-chip"),
    notice: document.getElementById("guide-notice"),
    contextCopy: document.getElementById("guide-context-copy"),
    clear: document.getElementById("guide-clear"),
  },
  onOpenObject: (objectId) => openObjectInWorld(objectId),
  onToast: (message) => ui.toast(message),
});

let currentView = "home";

/* The home scene is a fixed 3D backdrop with a scrolling content layer. */
const homePanel = document.querySelector('[data-view-panel="home"]');
let homeScrollFrame = 0;
function syncHomeScroll() {
  homeScrollFrame = 0;
  if (!homePanel) return;
  const offset = homePanel.scrollTop;
  homePanel.style.setProperty("--home-scroll", `${offset}px`);
  window.__homeScroll = offset;
}
homePanel?.addEventListener(
  "scroll",
  () => {
    if (!homeScrollFrame) homeScrollFrame = window.requestAnimationFrame(syncHomeScroll);
  },
  { passive: true }
);
window.addEventListener(
  "wheel",
  (event) => {
    if (currentView !== "home" || !homePanel || event.ctrlKey || event.metaKey) return;
    const max = homePanel.scrollHeight - homePanel.clientHeight;
    if (max <= 0) return;
    const next = Math.max(0, Math.min(max, homePanel.scrollTop + event.deltaY));
    if (next !== homePanel.scrollTop) {
      homePanel.scrollTop = next;
      event.preventDefault();
    }
  },
  { passive: false }
);
syncHomeScroll();
let currentWorldId = store.state.lastWorld && WORLDS[store.state.lastWorld] ? store.state.lastWorld : "kathmandu";
let currentObjectId = null;
let collectionFilter = "all";
let etiquetteChoice = null;
/* Where a panel's close button should return. Opening Etiquette (or any
   panel) from a world returns to that world instead of dropping to Home. */
let panelReturn = null;
let bridgeChoice = null;
let sceneManager = null;
let hasWebGL = webglAvailable();
let loadToken = 0;
let overviewPromise = null;
let booted = false;

const WORLD_BUILDERS = {
  kathmandu: () => import("./three/worlds/kathmandu.js").then((module) => module.default),
  pokhara: () => import("./three/worlds/pokhara.js").then((module) => module.default),
  hunza: () => import("./three/worlds/hunza-walkable.js").then((module) => module.default),
  skardu: () => import("./three/worlds/skardu.js").then((module) => module.default),
  kashgar: () => import("./three/worlds/kashgar.js").then((module) => module.default),
  turpan: () => import("./three/worlds/turpan.js").then((module) => module.default),
  dunhuang: () => import("./three/worlds/dunhuang.js").then((module) => module.default),
  puer: () => import("./three/worlds/puer.js").then((module) => module.default),
  xishuangbanna: () => import("./three/worlds/xishuangbanna.js").then((module) => module.default),
  karakoram: () => import("./three/worlds/karakoram.js").then((module) => module.default),
  journey: () => import("./three/worlds/journey.js").then((module) => module.default),
  overview: () => import("./three/worlds/overview.js").then((module) => module.default),
};

const map = new CultureMap({
  mapEl: document.getElementById("culture-map"),
  listEl: document.getElementById("map-list"),
  detailEl: document.getElementById("map-detail"),
  filtersEl: document.getElementById("map-filters"),
  loadingEl: document.getElementById("map-loading"),
  tileNoteEl: document.getElementById("map-tile-note"),
  store,
  t,
  onOpenWorld: (worldId) => enterWorld(worldId),
  onToast: (message) => ui.toast(message),
});

/* -----------------------------------------------------------------------
   Bootstrap
   ----------------------------------------------------------------------- */

async function boot() {
  document.body.classList.toggle("reduce-motion", Boolean(store.state.settings.reducedMotion));
  ui.setLanguage(store.language);
  ui.renderHome();
  /* Panels are rendered lazily when opened. Building all 150 collection
     cards and every scenario before the first paint made the explorer slower,
     especially on phones. */
  bindEvents();
  applyInitialSettings();

  const route = parseHash();
  if (!hasWebGL) {
    showNoWebGL();
    await openView(route.view === "world" ? "world" : route.view, { updateHash: false, push: false, skipScene: true });
    ui.setLoader(false);
    booted = true;
    return;
  }

  try {
    initSceneManager();
    if (route.view === "world") {
      await enterWorld(route.worldId || currentWorldId, { updateHash: false, initial: true, push: false });
      ui.setLoader(true, 100);
      window.setTimeout(() => ui.setLoader(false), 320);
    } else {
      /* Render the page first; the decorative 3D overview can arrive after
         the readable content is already on screen. */
      await openView(route.view, { updateHash: false, push: false, skipScene: true });
      ui.setLoader(false);
      if (route.view === "home") {
        const loadOverview = () => {
          if (currentView !== "home" || !hasWebGL || !sceneManager) return;
          ensureOverview({ initial: true, silent: true }).catch(() => {});
        };
        if (window.requestIdleCallback) window.requestIdleCallback(loadOverview, { timeout: 1500 });
        else window.setTimeout(loadOverview, 220);
      }
    }
  } catch (error) {
    console.error("Explorer failed to start", error);
    hasWebGL = false;
    showNoWebGL();
    ui.setLoader(false);
    ui.toast(t("toast.webgl"));
  }
  booted = true;
}

function initSceneManager() {
  const canvas = document.getElementById("explore-canvas");
  if (!canvas) throw new Error("Canvas not found");
  sceneManager = new SceneManager(canvas, {
    container: document.getElementById("ex-scene"),
    quality: store.state.settings.quality,
    reducedMotion: store.state.settings.reducedMotion,
    language: store.language,
    dir: dirFor(store.language),
    onSelect: handleSceneSelect,
    onDeselect: () => {
      if (currentView === "world" && currentObjectId) closeObjectPanel();
    },
    onHover: handleSceneHover,
    onError: (error) => {
      console.error("Scene error", error);
      ui.setWorldFallback(true);
      ui.toast(t("common.error"));
    },
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    hasWebGL = false;
    showNoWebGL();
    ui.toast(t("toast.webgl"));
  });
  canvas.addEventListener("webglcontextrestored", () => {
    window.location.reload();
  });
}

function showNoWebGL() {
  hasWebGL = false;
  ui.setSceneFallback(true);
  ui.setWorldFallback(true);
  ui.setReadingMode(true);
  if (sceneManager) {
    try {
      sceneManager.dispose();
    } catch (error) {
      /* no-op */
    }
    sceneManager = null;
  }
}

function applyInitialSettings() {
  sound.setEnabled(store.state.settings.sound);
  ui.syncSettings(store.state.settings);
  ui.updateSoundButton(store.state.settings.sound);
  sceneManager?.setReducedMotion(store.state.settings.reducedMotion);
  sceneManager?.setQuality(store.state.settings.quality);
}

/* -----------------------------------------------------------------------
   Scenes
   ----------------------------------------------------------------------- */

async function ensureOverview({ initial = false, silent = false } = {}) {
  if (!hasWebGL || !sceneManager) return;
  if (sceneManager.currentWorldId === "overview" && sceneManager.stage) {
    return;
  }
  if (overviewPromise) return overviewPromise;
  if (!silent && (initial || currentView === "home")) ui.setLoader(true, currentView === "home" ? 36 : 18);
  overviewPromise = (async () => {
    const builder = await WORLD_BUILDERS.overview();
    const config = {
      position: [0.5, 20, 40],
      target: [0, 0.4, 0],
      min: 18,
      max: 52,
      autoRotate: true,
      autoRotateSpeed: 0.032,
    };
    await sceneManager.loadWorld("overview", config, builder);
    refreshSceneLabels();
  })()
    .catch((error) => {
      console.error("Overview scene failed", error);
      ui.toast(t("common.error"));
      throw error;
    })
    .finally(() => {
      overviewPromise = null;
    });
  try {
    await overviewPromise;
  } finally {
    if (!silent && (currentView === "home" || initial)) {
      ui.setLoader(true, 100);
      window.setTimeout(() => ui.setLoader(false), 220);
    }
  }
}

async function enterWorld(worldId, { updateHash = true, push = true, objectId = null, initial = false } = {}) {
  const world = WORLDS[worldId] || WORLDS[currentWorldId] || WORLDS.kathmandu;
  const id = world.id;
  currentWorldId = id;
  currentObjectId = null;
  currentView = "world";
  panelReturn = null;
  store.recordWorld(id);
  if (updateHash) setHash(`#world/${id}`, push);
  ui.setActiveView("world");
  ui.updateNav("world");
  ui.hideObject();
  guide.setContext({ worldId: id, objectId: null });
  ui.renderWorld(world, {
    discovered: store.state.discoveredObjects,
    selectedId: null,
    hasScene: hasWebGL,
  });
  ui.setWorldFallback(!hasWebGL);

  if (!hasWebGL || !sceneManager) {
    ui.setLoader(false);
    updateFilmButton();
    if (objectId) selectObject(objectId);
    return;
  }

  /* A background overview build must finish before a world replaces it. */
  if (overviewPromise) {
    try {
      await overviewPromise;
    } catch (error) {
      /* The world can still load if the decorative overview failed. */
    }
  }

  if (sceneManager.currentWorldId === id && sceneManager.stage) {
    ui.setLoader(false);
    refreshSceneLabels();
    sceneManager.resetCamera();
    updateFilmButton();
    if (objectId) selectObject(objectId);
    return;
  }

  const token = ++loadToken;
  if (initial || currentView === "world") ui.setLoader(true, 24);
  try {
    const builder = await WORLD_BUILDERS[id]();
    if (token !== loadToken) return;
    const config = {
      position: world.camera.position,
      target: world.camera.target,
      min: world.camera.min,
      max: world.camera.max,
    };
    pauseFilmOnLeave();
    await sceneManager.loadWorld(id, config, builder);
    if (token !== loadToken) return;
    sceneManager.markCollected(Object.keys(store.state.collection));
    refreshSceneLabels();
    ui.renderWorld(world, {
      discovered: store.state.discoveredObjects,
      selectedId: null,
      hasScene: true,
    });
    updateFilmButton();
    ui.setLoader(true, 100);
    window.setTimeout(() => ui.setLoader(false), 280);
    if (objectId) selectObject(objectId);
  } catch (error) {
    if (token !== loadToken) return;
    console.error("World load failed", error);
    ui.setLoader(false);
    ui.setWorldFallback(true);
    ui.toast(t("common.error"));
  }
}

function handleSceneSelect(id) {
  if (!id) return;
  if (id.startsWith("overview:")) {
    const worldId = id.split(":")[1];
    if (WORLDS[worldId]) enterWorld(worldId);
    return;
  }
  if (id.startsWith("video:")) {
    toggleFilm();
    return;
  }
  selectObject(id);
}

function handleSceneHover(id, event) {
  if (!id) {
    ui.showTooltip(null);
    return;
  }
  let label = "";
  if (id.startsWith("overview:")) {
    const worldId = id.split(":")[1];
    label = worldId ? localize(WORLDS[worldId]?.names, store.language) : "";
  } else if (id.startsWith("video:")) {
    label = t("film.title");
  } else if (OBJECT_MAP[id]) {
    label = localize(OBJECT_MAP[id].names, store.language);
  }
  const x = event?.clientX || 0;
  const y = event?.clientY || 0;
  ui.showTooltip(label, x, y);
}

function selectObject(objectId) {
  const object = OBJECT_MAP[objectId];
  if (!object) return;
  if (currentWorldId !== object.worldId) {
    enterWorld(object.worldId, { objectId, push: true });
    return;
  }
  if (hasWebGL && sceneManager && sceneManager.currentWorldId !== object.worldId) {
    enterWorld(object.worldId, { objectId, push: false });
    return;
  }
  currentObjectId = objectId;
  const discovery = store.markDiscovered(objectId, object);
  ui.showObject(object, {
    collected: Boolean(store.state.collection[objectId]),
    quizResult: store.getQuizResult(`object-${objectId}`),
  });
  ui.renderWorld(WORLDS[currentWorldId], {
    discovered: store.state.discoveredObjects,
    selectedId: objectId,
    hasScene: hasWebGL,
  });
  guide.setContext({ worldId: currentWorldId, objectId });
  if (hasWebGL && sceneManager?.stage) {
    sceneManager.selectObject(objectId);
  }
  sound.focus();
  ui.toast(t("toast.objectFocus", { name: localize(object.names, store.language) }));
  handleRewards(discovery);
  handleHuntFind(objectId);
  if (window.innerWidth <= 900) ui.el.worldTrail.hidden = true;
}

function closeObjectPanel() {
  if (!currentObjectId && ui.el.objectDrawer?.hidden) return;
  currentObjectId = null;
  ui.hideObject();
  if (hasWebGL && sceneManager) sceneManager.clearSelection();
  if (WORLDS[currentWorldId]) {
    ui.renderWorld(WORLDS[currentWorldId], {
      discovered: store.state.discoveredObjects,
      selectedId: null,
      hasScene: hasWebGL,
    });
    guide.setContext({ worldId: currentWorldId, objectId: null });
  }
}

function refreshSceneLabels() {
  if (!sceneManager || !sceneManager.stage) return;
  const texts = {};
  if (sceneManager.currentWorldId === "overview") {
    const nepal = COUNTRIES.find((country) => country.id === "nepal");
    const pakistan = COUNTRIES.find((country) => country.id === "pakistan");
    const china = COUNTRIES.find((country) => country.id === "china");
    texts["overview:kathmandu"] = localize(nepal?.names, store.language);
    texts["overview:hunza"] = localize(pakistan?.names, store.language);
    texts["overview:kashgar"] = localize(china?.names, store.language);
    texts["overview:dunhuang"] = localize(WORLDS.dunhuang.names, store.language);
    texts["overview:puer"] = localize(WORLDS.puer.names, store.language);
    texts["overview:xishuangbanna"] = localize(WORLDS.xishuangbanna.names, store.language);
    texts["overview:karakoram"] = localize(WORLDS.karakoram.names, store.language);
    texts["overview:journey"] = localize(WORLDS.journey.names, store.language);
  } else {
    const ids = OBJECTS_BY_WORLD[sceneManager.currentWorldId] || [];
    ids.forEach((id) => {
      texts[id] = localize(OBJECT_MAP[id].names, store.language);
    });
    if (sceneManager.currentWorldId === "journey") {
      texts["video:everest"] = t("film.title");
    }
  }
  sceneManager.updateLabels(store.language, dirFor(store.language), texts);
}


/* -----------------------------------------------------------------------
   3D world guide (a tab of the Guide view)
   ----------------------------------------------------------------------- */
let worldGuide = null;
let guideTabNow = "ask";
function setGuideTab(tab) {
  guideTabNow = tab === "worlds" ? "worlds" : "ask";
  const panel = document.querySelector(".guide-panel");
  if (!panel) return;
  const tabs = WorldGuide.tabs(store.language);
  panel.querySelectorAll("[data-guide-tab]").forEach((b) => {
    const on = b.dataset.guideTab === guideTabNow;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-selected", String(on));
    b.textContent = b.dataset.guideTab === "worlds" ? tabs.worlds : tabs.ask;
  });
  panel.classList.toggle("is-world-guide", guideTabNow === "worlds");
  const root = document.getElementById("world-guide");
  root.hidden = guideTabNow !== "worlds";
  if (guideTabNow === "worlds") {
    if (!worldGuide) {
      worldGuide = new WorldGuide({
        root,
        getLang: () => store.language,
        onOpenCard: (id) => openCard(id),
        onGo: (worldId, placeKey) => goToPlace(worldId, placeKey),
      });
      worldGuide.setWorld(currentWorldId);
    }
    worldGuide.render();
  }
}
async function goToPlace(worldId, placeKey) {
  const before = window.__walk || window.__ktm || null;
  const same = sceneManager && sceneManager.currentWorldId === worldId && before;
  await enterWorld(worldId);
  const t0 = performance.now();
  const tick = () => {
    const A = window.__walk || window.__ktm;
    const ready = A && A.places && A.places[placeKey] && sceneManager && sceneManager.currentWorldId === worldId && (same || A !== before);
    if (ready) { window.setTimeout(() => A.travelTo(placeKey), same ? 0 : 900); return; }
    if (performance.now() - t0 < 60000) window.setTimeout(tick, 300);
  };
  tick();
}

/* -----------------------------------------------------------------------
   Views, routing and language
   ----------------------------------------------------------------------- */

async function openView(view, { updateHash = true, push = true, skipScene = false } = {}) {
  const valid = ["home", "world", "today", "map", "etiquette", "collection", "bridge", "game", "films", "guide"];
  if (!valid.includes(view)) view = "home";
  if (view === "world") {
    await enterWorld(currentWorldId || store.state.lastWorld || "kathmandu", { updateHash, push });
    return;
  }

  if (view === "home") {
    panelReturn = null;
  } else if (currentView === "world") {
    panelReturn = { view: "world", worldId: currentWorldId };
  } else if (!panelReturn) {
    panelReturn = { view: "home" };
  }

  const fromView = currentView;
  const fromWorld = currentWorldId;
  pauseFilmOnLeave();
  const previousObjectId = currentObjectId;
  currentView = view;
  if (updateHash) setHash(`#${view}`, push);
  ui.setActiveView(view);
  ui.updateNav(view);
  ui.toggleSettings(false);
  if (view !== "world" && currentObjectId) {
    currentObjectId = null;
    sceneManager?.clearSelection();
  }
  if (view !== "world") ui.hideObject();

  if (view === "home") {
    if (!skipScene && hasWebGL) await ensureOverview();
    ui.renderHome();
    guide.setContext({ worldId: null, objectId: null });
  } else if (view === "today") {
    const encounter = ui.getTodayEncounter();
    ui.renderToday(encounter, todayState(encounter));
    guide.setContext({ worldId: null, objectId: null });
    const readKey = store.getToday();
    if (!store.state.dailyRead[readKey]) store.readDaily(encounter);
  } else if (view === "map") {
    map.open();
    guide.setContext({ worldId: null, objectId: null });
  } else if (view === "etiquette") {
    const etiquetteWorld = fromView === "world"
      ? fromWorld
      : panelReturn?.view === "world" ? panelReturn.worldId : null;
    ui.setEtiquetteWorld(etiquetteWorld);
    ui.renderEtiquette(ui.currentEtiquette, etiquetteChoice);
    guide.setContext({ worldId: null, objectId: null });
  } else if (view === "collection") {
    ui.renderCollection(collectionFilter);
    guide.setContext({ worldId: currentWorldId, objectId: null });
  } else if (view === "bridge") {
    ui.renderBridge(ui.currentBridge, bridgeChoice);
    guide.setContext({ worldId: null, objectId: null });
  } else if (view === "game") {
    ui.renderGame();
    guide.setContext({ worldId: null, objectId: null });
  } else if (view === "films") {
    guide.setContext({ worldId: null, objectId: null });
  } else if (view === "guide") {
    guide.setContext({ worldId: currentWorldId, objectId: previousObjectId || null });
    if (worldGuide) worldGuide.setWorld(currentWorldId);
    setGuideTab(guideTabNow);
    if (guideTabNow === "ask") window.setTimeout(() => document.getElementById("guide-input")?.focus({ preventScroll: true }), 220);
  }
  ui.updateTopbar();
}

function closePanel() {
  const target = panelReturn;
  panelReturn = null;
  if (target?.view === "world" && WORLDS[target.worldId]) {
    enterWorld(target.worldId);
  } else {
    openView("home");
  }
}

/* A signed-in player's cloud save arrives asynchronously. Refresh whatever is
   currently on screen so XP, discoveries and settings appear without a reload. */
function refreshAfterServerLoad() {
  sound.setEnabled(store.state.settings.sound);
  ui.syncSettings(store.state.settings);
  ui.updateTopbar();
  if (currentView === "home") ui.renderHome();
  else if (currentView === "world" && WORLDS[currentWorldId]) {
    ui.renderWorld(WORLDS[currentWorldId], {
      discovered: store.state.discoveredObjects,
      selectedId: currentObjectId,
    });
  } else if (currentView === "collection") ui.renderCollection(collectionFilter);
  else if (currentView === "game") ui.renderGame();
  else if (currentView === "etiquette") ui.renderEtiquette(ui.currentEtiquette, etiquetteChoice);
  else if (currentView === "bridge") ui.renderBridge(ui.currentBridge, bridgeChoice);
  refreshSceneLabels();
}

function parseHash() {
  const raw = decodeURIComponent(window.location.hash.replace(/^#/, "")).trim();
  if (raw.startsWith("world/")) {
    const worldId = raw.split("/")[1];
    return { view: "world", worldId: WORLDS[worldId] ? worldId : null };
  }
  if (["home", "today", "map", "etiquette", "collection", "bridge", "game", "films", "guide"].includes(raw)) {
    return { view: raw };
  }
  return { view: "home" };
}

function setHash(hash, push = true) {
  if (window.location.hash === hash) return;
  try {
    if (push) window.history.pushState(null, "", hash);
    else window.history.replaceState(null, "", hash);
  } catch (error) {
    window.location.hash = hash;
  }
}

/* -----------------------------------------------------------------------
   Today, cards, quizzes and bridge
   ----------------------------------------------------------------------- */

function todayState(encounter) {
  return {
    saved: Boolean(store.state.dailySaved[store.getToday()]),
    quizResult: store.getQuizResult(`daily-${encounter.id}`),
  };
}

async function saveDailyEncounter() {
  const encounter = ui.getTodayEncounter();
  const result = store.saveDaily(encounter);
  if (!result.first) {
    ui.toast(t("today.saved"));
    return;
  }
  sound.card();
  const card = CARD_MAP[encounter.cardId];
  ui.toast(t("toast.dailySaved"), { gold: true, title: localize(card?.names, store.language) });
  handleRewards(result);
  ui.renderToday(encounter, todayState(encounter));
  ui.renderHome();
  ui.renderCollection(collectionFilter);
}

function autoCollectCard(cardId) {
  if (!CARD_MAP[cardId] || store.state.collection[cardId]) return null;
  return store.collectCard(cardId);
}

function showObjectQuiz(object) {
  const quizId = `object-${object.id}`;
  const previous = store.getQuizResult(quizId);
  const localQuiz = object.quizI18n?.[store.language] || object.quiz;
  const quiz = {
    ...localQuiz,
    q: localQuiz.q,
  };
  ui.showQuiz(quiz, {
    previouslyPassed: Boolean(previous?.passed),
    onPass: () => {
      const quizResult = store.passQuiz(quizId, 100);
      const cardResult = autoCollectCard(object.id);
      if (quizResult.xp) {
        sound.success();
        ui.toast(t("toast.quizPassed", { xp: quizResult.xp }), { gold: true });
      } else {
        ui.toast(t("toast.quizRepeat"));
      }
      handleRewards(quizResult);
      if (cardResult) handleRewards(cardResult);
      if (hasWebGL && sceneManager?.stage) sceneManager.markCollected([object.id]);
      ui.renderHome();
      ui.renderCollection(collectionFilter);
    },
    onClose: () => {
      if (currentObjectId === object.id) {
        ui.showObject(object, {
          collected: Boolean(store.state.collection[object.id]),
          quizResult: store.getQuizResult(quizId),
        });
      }
    },
  });
}

function showDailyQuiz() {
  const encounter = ui.getTodayEncounter();
  const quizId = `daily-${encounter.id}`;
  const previous = store.getQuizResult(quizId);
  ui.showQuiz(encounter.quiz, {
    previouslyPassed: Boolean(previous?.passed),
    onPass: () => {
      const quizResult = store.passQuiz(quizId, 100);
      const cardResult = autoCollectCard(encounter.cardId);
      if (quizResult.xp) {
        sound.success();
        ui.toast(t("toast.quizPassed", { xp: quizResult.xp }), { gold: true });
      } else {
        ui.toast(t("toast.quizRepeat"));
      }
      handleRewards(quizResult);
      if (cardResult) handleRewards(cardResult);
      ui.renderToday(encounter, todayState(encounter));
      ui.renderHome();
      ui.renderCollection(collectionFilter);
    },
    onClose: () => {
      ui.renderToday(encounter, todayState(encounter));
    },
  });
}

function chooseEtiquetteOption(optionId) {
  const scenario = ui.etiquetteScenarios().find((item) => item.id === ui.currentEtiquette);
  const option = scenario?.options.find((item) => item.id === optionId);
  if (!scenario || !option) return;
  etiquetteChoice = optionId;
  if (option.correct) {
    const added = store.completeEtiquette(scenario.id);
    if (added) {
      sound.success();
      ui.toast(t("etiquette.completed"), { gold: true });
    }
  }
  ui.renderEtiquette(scenario.id, etiquetteChoice);
}

function chooseBridgeOption(optionId) {
  const bridge = getAllBridges().find((item) => item.id === ui.currentBridge);
  const option = bridge?.options.find((item) => item.id === optionId);
  if (!bridge || !option) return;
  bridgeChoice = optionId;
  if (option.correct) {
    const already = store.state.completedBridges.includes(bridge.id);
    const result = store.completeBridge(bridge.id, bridge.rewardCard);
    if (result.first) {
      sound.card();
      ui.toast(t("toast.bridgeBuilt", { xp: result.xp }), { gold: true });
      handleRewards(result);
      ui.renderHome();
      ui.renderCollection(collectionFilter);
    } else if (!already) {
      ui.toast(t("bridge.complete"));
    }
  }
  ui.renderBridge(bridge.id, bridgeChoice);
}

function getAllBridges() {
  return BRIDGES;
}

async function openCard(cardId) {
  const card = CARD_MAP[cardId];
  if (!card) return;
  if (OBJECT_MAP[cardId]) {
    await openObjectInWorld(cardId);
    return;
  }
  ui.showCardDetail(card, { collected: Boolean(store.state.collection[cardId]) });
}

async function openObjectInWorld(objectId) {
  const object = OBJECT_MAP[objectId];
  if (!object) return;
  if (currentWorldId === object.worldId && (!hasWebGL || sceneManager?.currentWorldId === object.worldId)) {
    await openView("world", { updateHash: true });
    selectObject(objectId);
    return;
  }
  await enterWorld(object.worldId, { objectId, push: false });
}

function collectCard(cardId, sourceButton = null) {
  const card = CARD_MAP[cardId];
  if (!card) return;
  const result = store.collectCard(cardId);
  if (!result.added) return;
  sound.card();
  ui.toast(t("toast.cardAdded", { name: localize(card.names, store.language) }), {
    gold: true,
    title: t("common.collected"),
  });
  handleRewards(result);
  if (OBJECT_MAP[cardId] && hasWebGL && sceneManager?.stage) {
    sceneManager.markCollected([cardId]);
  }
  if (sourceButton) {
    sourceButton.disabled = true;
    sourceButton.textContent = t("object.collected");
  }
  if (currentObjectId === cardId) ui.updateObjectCollectionState(cardId, true);
  ui.renderHome();
  ui.renderCollection(collectionFilter);
}

function handleRewards(result) {
  if (!result) return;
  if (result.achievements?.length) {
    result.achievements.forEach((achievement) => {
      ui.achievementToast(achievement);
      sound.success();
    });
  }
  if (result.levelUp) ui.levelToast(result.levelUp);
  ui.updateTopbar();
  ui.renderHome();
  if (currentView === "collection") ui.renderCollection(collectionFilter);
}

function handleHuntFind(objectId) {
  const outcome = store.recordHuntFind(objectId);
  if (!outcome) return;
  if (outcome.completed) {
    sound.success();
    ui.toast(t("toast.huntComplete", { name: localize(outcome.hunt.title, store.language) }), {
      gold: true,
      title: t("game.completed"),
    });
    handleRewards(outcome.result);
    ui.renderGame();
  } else {
    ui.toast(t("toast.huntProgress", {
      name: localize(outcome.hunt.title, store.language),
      found: outcome.found,
      total: outcome.total,
    }));
  }
}

function currentFilm() {
  return sceneManager?.worldResult?.video || null;
}

function pauseFilmOnLeave() {
  const film = currentFilm();
  if (film?.element && !film.element.paused) {
    film.element.pause();
    film.playing = false;
  }
  updateFilmButton();
}

function toggleFilm() {
  const film = currentFilm();
  if (!film) return;
  const page = film.page || "https://commons.wikimedia.org/wiki/File:The_Himalayan_-_Mt.Everest_Base_Camp_trek_HD_Time_Lapse.webm";
  if (!film.supported || !film.element) {
    try {
      window.open(page, "_blank", "noopener");
    } catch (error) {
      window.location.href = page;
    }
    ui.toast(t("film.watch"));
    return;
  }
  const video = film.element;
  if (video.paused) {
    const started = video.play();
    if (started && started.catch) started.catch(() => {});
    film.playing = true;
  } else {
    video.pause();
    film.playing = false;
  }
  updateFilmButton();
  ui.toast(t(film.playing ? "film.playing" : "film.paused"));
}

function updateFilmButton() {
  const button = document.getElementById("film-toggle");
  if (!button) return;
  const film = currentFilm();
  const visible = Boolean(film) && currentView === "world" && sceneManager?.currentWorldId === "journey";
  button.hidden = !visible;
  if (!visible) return;
  button.innerHTML = icon(film.playing ? "pause" : "play");
  button.setAttribute("aria-label", t(film.playing ? "film.pause" : "film.play"));
}

async function shareEncounter() {
  const encounter = ui.getTodayEncounter();
  const title = localize(encounter.title, store.language);
  const url = `${window.location.origin}/explore/#today`;
  const text = `${title} — ${encounter.fact}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Himalaya Connect", text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    ui.toast(t("common.copied"));
  } catch (error) {
    if (error?.name === "AbortError") return;
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      ui.toast(t("common.copied"));
    } catch (clipboardError) {
      ui.toast(t("common.shareFailed"));
    }
  }
}

async function openTodayWorld(button) {
  const worldId = button.dataset.todayWorld;
  const objectId = button.dataset.todayObject;
  if (objectId) {
    await openObjectInWorld(objectId);
    return;
  }
  if (worldId && WORLDS[worldId]) {
    await enterWorld(worldId);
  }
}

/* -----------------------------------------------------------------------
   Events
   ----------------------------------------------------------------------- */

function bindEvents() {
  document.addEventListener("click", (event) => {
    const guideTab = event.target.closest("[data-guide-tab]");
    if (guideTab) {
      setGuideTab(guideTab.dataset.guideTab);
      return;
    }
    const backButton = event.target.closest("[data-view-back]");
    if (backButton) {
      event.preventDefault();
      closePanel();
      return;
    }
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      event.preventDefault();
      openView(viewButton.dataset.view);
      return;
    }
    const worldChoice = event.target.closest("[data-world-choice]");
    if (worldChoice) {
      enterWorld(worldChoice.dataset.worldChoice);
      return;
    }
    const dockWorld = event.target.closest("[data-dock-world]");
    if (dockWorld) {
      enterWorld(dockWorld.dataset.dockWorld);
      return;
    }
    const huntStart = event.target.closest("[data-hunt-start]");
    if (huntStart) {
      const hunt = SCAVENGER_HUNTS.find((item) => item.id === huntStart.dataset.huntStart);
      store.startHunt(huntStart.dataset.huntStart);
      sound.click();
      if (hunt?.worldId && WORLDS[hunt.worldId]) enterWorld(hunt.worldId);
      else openView("game");
      return;
    }
    const trailObject = event.target.closest("[data-trail-object]");
    if (trailObject) {
      selectObject(trailObject.dataset.trailObject);
      return;
    }
    const openCardButton = event.target.closest("[data-open-card]");
    if (openCardButton) {
      openCard(openCardButton.dataset.openCard);
      return;
    }
    const collectionFilterButton = event.target.closest("[data-collection-filter]");
    if (collectionFilterButton) {
      collectionFilter = collectionFilterButton.dataset.collectionFilter;
      ui.renderCollection(collectionFilter);
      return;
    }
    const objectAction = event.target.closest("[data-object-action]");
    if (objectAction) {
      if (!currentObjectId) return;
      const object = OBJECT_MAP[currentObjectId];
      if (!object) return;
      if (objectAction.dataset.objectAction === "collect") collectCard(currentObjectId, objectAction);
      if (objectAction.dataset.objectAction === "quiz") showObjectQuiz(object);
      if (objectAction.dataset.objectAction === "ask") openGuideForObject(object);
      return;
    }
    const etiquetteScenario = event.target.closest("[data-etiquette-scenario]");
    if (etiquetteScenario) {
      const id = etiquetteScenario.dataset.etiquetteScenario;
      if (id === ui.currentEtiquette) {
        etiquetteChoice = null;
      } else {
        etiquetteChoice = null;
      }
      ui.renderEtiquette(id, null);
      return;
    }
    const etiquetteOption = event.target.closest("[data-etiquette-option]");
    if (etiquetteOption) {
      chooseEtiquetteOption(etiquetteOption.dataset.etiquetteOption);
      return;
    }
    const etiquetteNext = event.target.closest("[data-etiquette-next]");
    if (etiquetteNext) {
      const scenarios = ui.etiquetteScenarios();
      const index = scenarios.findIndex((scenario) => scenario.id === ui.currentEtiquette);
      const next = scenarios[(index + 1) % scenarios.length];
      etiquetteChoice = null;
      ui.renderEtiquette(next.id, null);
      return;
    }
    const etiquetteRetry = event.target.closest("[data-etiquette-retry]");
    if (etiquetteRetry) {
      etiquetteChoice = null;
      ui.renderEtiquette(ui.currentEtiquette, null);
      return;
    }
    const bridgeNav = event.target.closest("[data-bridge-nav]");
    if (bridgeNav) {
      bridgeChoice = null;
      ui.renderBridge(bridgeNav.dataset.bridgeNav, null);
      return;
    }
    const bridgeOption = event.target.closest("[data-bridge-choice]");
    if (bridgeOption) {
      chooseBridgeOption(bridgeOption.dataset.bridgeChoice);
      return;
    }
    const bridgeNext = event.target.closest("[data-bridge-next]");
    if (bridgeNext) {
      const index = getAllBridges().findIndex((bridge) => bridge.id === ui.currentBridge);
      const next = getAllBridges()[(index + 1) % getAllBridges().length];
      bridgeChoice = null;
      ui.renderBridge(next.id, null);
      return;
    }
    const bridgeRetry = event.target.closest("[data-bridge-retry]");
    if (bridgeRetry) {
      bridgeChoice = null;
      ui.renderBridge(ui.currentBridge, null);
      return;
    }
    const todayQuiz = event.target.closest("[data-today-quiz]");
    if (todayQuiz) {
      showDailyQuiz();
      return;
    }
    const todaySave = event.target.closest("[data-today-save]");
    if (todaySave) {
      saveDailyEncounter();
      return;
    }
    const todayShare = event.target.closest("[data-today-share]");
    if (todayShare) {
      shareEncounter();
      return;
    }
    const todayWorld = event.target.closest("[data-today-world]");
    if (todayWorld) {
      openTodayWorld(todayWorld);
      return;
    }
    const cardCollect = event.target.closest("[data-card-collect]");
    if (cardCollect) {
      collectCard(cardCollect.dataset.cardCollect, cardCollect);
      return;
    }
    const cardWorld = event.target.closest("[data-card-world]");
    if (cardWorld) {
      ui.closeDialog();
      enterWorld(cardWorld.dataset.cardWorld);
      return;
    }
    if (event.target.closest("[data-sources-open]")) {
      ui.toggleSettings(false);
      ui.showSources();
      return;
    }
    if (event.target.closest("[data-settings-open]")) {
      ui.toggleSettings(true);
      return;
    }
    if (event.target.closest("[data-toggle-trail]")) {
      toggleTrail(ui.el.worldTrail?.hidden);
      return;
    }
  });

  document.getElementById("home-start")?.addEventListener("click", () => {
    sound.click();
    if (!store.state.tutorialDone) {
      ui.showTutorial({
        onStart: () => {
          store.finishTutorial();
          enterWorld("kathmandu");
        },
        onSkip: () => {
          store.finishTutorial();
        },
      });
    } else {
      enterWorld(store.state.lastWorld || "kathmandu");
    }
  });

  document.getElementById("home-continue")?.addEventListener("click", () => {
    sound.click();
    enterWorld(store.state.lastWorld || "kathmandu");
  });

  document.getElementById("object-drawer-close")?.addEventListener("click", closeObjectPanel);

  const worldHead = document.querySelector(".world-head");
  const worldHeadBack = worldHead?.querySelector(".world-head-top [data-view='home']");
  worldHeadBack?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const expanded = worldHead.classList.toggle("is-expanded");
    worldHeadBack.setAttribute(
      "aria-label",
      expanded ? "Hide world details" : "Show world details"
    );
    worldHeadBack.setAttribute("aria-expanded", String(expanded));
  });

  document.getElementById("world-trail-toggle")?.addEventListener("click", () => toggleTrail(ui.el.worldTrail.hidden));
  document.getElementById("world-trail-close")?.addEventListener("click", () => toggleTrail(false));
  document.getElementById("zoom-in")?.addEventListener("click", () => sceneManager?.zoom(0.82));
  document.getElementById("zoom-out")?.addEventListener("click", () => sceneManager?.zoom(1.22));
  document.getElementById("reset-camera")?.addEventListener("click", () => {
    sceneManager?.resetCamera();
    ui.toast(t("toast.cameraReset"));
  });
  document.getElementById("world-exit")?.addEventListener("click", () => {
    sceneManager?.clearSelection();
    openView("home");
  });
  document.getElementById("world-help")?.addEventListener("click", () => ui.showHelp());
  document.getElementById("film-toggle")?.addEventListener("click", () => {
    sound.click();
    toggleFilm();
  });
  document.getElementById("retry-webgl")?.addEventListener("click", () => window.location.reload());

  document.getElementById("language-select")?.addEventListener("change", (event) => {
    changeLanguage(event.target.value);
  });

  document.getElementById("settings-toggle")?.addEventListener("click", (event) => {
    event.stopPropagation();
    ui.toggleSettings(ui.el.settings?.hidden);
  });
  document.getElementById("settings-close")?.addEventListener("click", () => ui.toggleSettings(false));
  document.addEventListener("click", (event) => {
    if (!ui.el.settings || ui.el.settings.hidden) return;
    if (ui.el.settings.contains(event.target) || event.target.closest("#settings-toggle")) return;
    ui.toggleSettings(false);
  });

  document.getElementById("sound-toggle")?.addEventListener("click", () => {
    const next = !store.state.settings.sound;
    store.setSetting("sound", next);
    sound.setEnabled(next);
    ui.updateSoundButton(next);
    ui.syncSettings(store.state.settings);
    if (next) sound.click();
  });
  document.getElementById("sound-setting-toggle")?.addEventListener("change", (event) => {
    const next = event.target.checked;
    store.setSetting("sound", next);
    sound.setEnabled(next);
    ui.updateSoundButton(next);
    if (next) sound.click();
  });
  document.getElementById("reduced-motion-toggle")?.addEventListener("change", (event) => {
    const next = event.target.checked;
    store.setSetting("reducedMotion", next);
    sceneManager?.setReducedMotion(next);
    document.body.classList.toggle("reduce-motion", next);
    ui.syncSettings(store.state.settings);
  });
  document.getElementById("quality-choice")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-quality]");
    if (!button) return;
    store.setSetting("quality", button.dataset.quality);
    sceneManager?.setQuality(button.dataset.quality);
    ui.syncSettings(store.state.settings);
  });

  document.getElementById("ex-dialog")?.addEventListener("cancel", () => {
    /* dialog closes itself */
  });

  const routeFromHash = () => {
    if (!booted) return;
    const expected = currentView === "world" ? `#world/${currentWorldId}` : `#${currentView}`;
    if (window.location.hash === expected) return;
    const route = parseHash();
    if (route.view === "world") enterWorld(route.worldId || currentWorldId, { updateHash: false, push: false });
    else openView(route.view, { updateHash: false, push: false });
  };
  window.addEventListener("popstate", routeFromHash);
  window.addEventListener("hashchange", routeFromHash);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (currentObjectId) {
        closeObjectPanel();
        return;
      }
      if (ui.el.settings && !ui.el.settings.hidden) {
        ui.toggleSettings(false);
        return;
      }
    }
    if (!sceneManager || currentView !== "world") return;
    if (document.querySelector("dialog[open]")) return;
    const target = event.target;
    if (target && target.matches && (target.matches("input, textarea, select") || target.isContentEditable)) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      sceneManager.rotate(-0.14, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      sceneManager.rotate(0.14, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      sceneManager.rotate(0, -0.1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      sceneManager.rotate(0, 0.1);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      sceneManager.zoom(0.86);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      sceneManager.zoom(1.16);
    } else if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      sceneManager.resetCamera();
      ui.toast(t("toast.cameraReset"));
    }
  });
}

function toggleTrail(open) {
  if (!ui.el.worldTrail) return;
  ui.el.worldTrail.hidden = !open;
  ui.el.worldTrailToggle?.setAttribute("aria-expanded", String(Boolean(open)));
}

function openGuideForObject(object) {
  guide.setContext({ worldId: object.worldId, objectId: object.id });
  openView("guide");
}

function changeLanguage(lang) {
  if (!store.setLanguage(lang)) return;
  ui.setLanguage(lang);
  guide.setLanguage(lang);
  map.setLanguage(lang);
  if (currentView === "guide") setGuideTab(guideTabNow);
  refreshSceneLabels();
  ui.renderHome();
  const encounter = ui.getTodayEncounter();
  ui.renderToday(encounter, todayState(encounter));
  ui.renderEtiquette(ui.currentEtiquette, etiquetteChoice);
  ui.renderCollection(collectionFilter);
  ui.renderBridge(ui.currentBridge, bridgeChoice);
  if (currentView === "game") ui.renderGame();
  if (WORLDS[currentWorldId]) {
    ui.renderWorld(WORLDS[currentWorldId], {
      discovered: store.state.discoveredObjects,
      selectedId: currentObjectId,
      hasScene: hasWebGL,
    });
  }
  if (currentObjectId && OBJECT_MAP[currentObjectId]) {
    ui.showObject(OBJECT_MAP[currentObjectId], {
      collected: Boolean(store.state.collection[currentObjectId]),
      quizResult: store.getQuizResult(`object-${currentObjectId}`),
    });
    guide.setContext({ worldId: currentWorldId, objectId: currentObjectId });
  }
  ui.setActiveView(currentView);
  ui.updateNav(currentView);
  if (currentView === "map") map.open();
  updateFilmButton();
  ui.toast(t("toast.language"));
}

/* Expose a tiny read-only surface for debugging in the browser console. */
window.HimalayaConnect = {
  get state() {
    return store.state;
  },
  get world() {
    return currentWorldId;
  },
  get view() {
    return currentView;
  },
  get three() {
    return sceneManager;
  },
};

boot();
