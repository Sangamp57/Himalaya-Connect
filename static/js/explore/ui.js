import {
  ALL_CARDS,
  ACHIEVEMENTS,
  BRIDGES,
  CARD_MAP,
  CATEGORIES,
  COUNTRIES,
  DAILY_ENCOUNTERS,
  ETIQUETTE_SCENARIOS,
  OBJECTS,
  OBJECTS_BY_WORLD,
  OBJECT_MAP,
  RARITIES,
  SCAVENGER_HUNTS,
  SOURCE_NOTES,
  WORLDS,
} from "./data.js";
import { OBJECT_IMAGES } from "./object-images.js";
import { categoryIcon, icon } from "./icons.js";
import { dirFor, localeFor, translate } from "./i18n.js";

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const COUNTRY_ACCENT = Object.fromEntries(COUNTRIES.map((country) => [country.id, country.accent]));

function artworkMarkup(card, accent, name, localLabel = card.localName || "") {
  const photo = OBJECT_IMAGES[card.id];
  if (!photo) {
    return `<div class="object-art" style="--art-accent:${accent}">
      <span class="object-art-icon">${categoryIcon(card.category)}</span>
      <span class="object-art-local">${escapeHtml(localLabel)}</span>
    </div>`;
  }
  return `<figure class="object-art object-art--photo" style="--art-accent:${accent}">
    <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt || name)}" loading="lazy" decoding="async">
    <span class="object-art-fallback"><span class="object-art-icon">${categoryIcon(card.category)}</span></span>
    ${photo.credit ? `<figcaption class="object-art-credit">${photo.source ? `<a href="${escapeHtml(photo.source)}" target="_blank" rel="noopener noreferrer">${escapeHtml(photo.credit)}</a>` : escapeHtml(photo.credit)}</figcaption>` : ""}
    ${localLabel ? `<span class="object-art-local">${escapeHtml(localLabel)}</span>` : ""}
  </figure>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function localize(value, lang) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.en || "";
}

function paragraphs(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part)}</p>`)
    .join("");
}

function shuffledCopy(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function countryName(countryId, lang) {
  const country = COUNTRIES.find((item) => item.id === countryId);
  return localize(country?.names, lang);
}

function categoryName(categoryId, lang) {
  return localize(CATEGORIES[categoryId]?.en ? {
    en: CATEGORIES[categoryId].en,
    zh: CATEGORIES[categoryId].zh,
    ne: CATEGORIES[categoryId].ne,
    ur: CATEGORIES[categoryId].ur,
  } : null, lang);
}

function rarityName(rarity, lang) {
  return localize(RARITIES[rarity] || RARITIES.common, lang);
}

function journalFor(world) {
  return world.journalUrl || "/stories/";
}

export class ExploreUI {
  constructor({ store, actions = {} }) {
    this.store = store;
    this.actions = actions;
    this.lang = store.language;
    this.filter = "all";
    this.t = (key, vars) => translate(this.lang, key, vars);
    this.noticeDismissed = this.readNoticeState();
    this.currentEtiquette = ETIQUETTE_SCENARIOS[0].id;
    this.etiquetteChoice = null;
    this.currentBridge = BRIDGES[0].id;
    this.bridgeChoice = null;
    this.currentObject = null;
    this.todayEncounter = null;
    this.readingMode = false;
    this.etiquetteOrders = new Map();
    this.bridgeOrders = new Map();

    this.el = {
      homeLevel: $("#home-level-number"),
      homeLevelRing: $("#home-level-ring"),
      homeXp: $("#home-xp"),
      homeStreak: $("#home-streak"),
      homeFound: $("#home-found"),
      homeTotal: $("#home-total"),
      homeFill: $("#home-progress-fill"),
      homeProgressTitle: $("#home-progress-title"),
      homeMiniCards: $("#home-mini-cards"),
      homeRecent: $("#home-recent-list"),
      homeWorlds: $("#home-worlds"),
      homeDailyTitle: $("#home-daily-title"),
      homeDailyCountry: $("#home-daily-country"),
      homeContinue: $("#home-continue"),
      homeProof: $("#home-proof-copy"),
      topLevel: $("#top-level"),
      topXp: $("#top-xp"),
      topLevelLabel: $("#top-level-label"),
      worldEyebrow: $("#world-eyebrow"),
      worldTitle: $("#world-title"),
      worldBlurb: $("#world-blurb"),
      worldRegion: $("#world-region"),
      worldProgress: $("#world-progress"),
      worldJournal: $("#world-journal-link"),
      worldTrailList: $("#world-trail-list"),
      worldDock: $("#world-dock"),
      worldTrail: $("#world-trail"),
      worldTrailToggle: $("#world-trail-toggle"),
      worldRouteNote: $("#world-route-note"),
      worldFallback: $("#world-fallback"),
      objectDrawer: $("#object-drawer"),
      objectContent: $("#object-drawer-content"),
      todayContent: $("#today-content"),
      etiquetteList: $("#etiquette-list"),
      etiquetteDetail: $("#etiquette-detail"),
      collectionGrid: $("#collection-grid"),
      collectionFilters: $("#collection-filters"),
      collectionProgress: $("#collection-progress-copy"),
      collectionFill: $("#collection-progress-fill"),
      achievementStrip: $("#achievement-strip"),
      gameContent: $("#game-content"),
      filmToggle: $("#film-toggle"),
      bridgeList: $("#bridge-list"),
      bridgeDetail: $("#bridge-detail"),
      translationNotice: $("#translation-notice"),
      languageSelect: $("#language-select"),
      dialog: $("#ex-dialog"),
      dialogInner: $("#ex-dialog-inner"),
      settings: $("#settings-popover"),
      qualityChoice: $("#quality-choice"),
      reducedMotionToggle: $("#reduced-motion-toggle"),
      soundSettingToggle: $("#sound-setting-toggle"),
      soundToggle: $("#sound-toggle"),
      loader: $("#ex-loader"),
      loaderProgress: $("#loader-progress"),
      sceneFallback: $("#scene-fallback"),
      tooltip: $("#scene-tooltip"),
    };

    this.el.dialog?.addEventListener("click", (event) => {
      if (event.target === this.el.dialog || event.target.closest("[data-dialog-close]")) {
        this.closeDialog();
      }
    });
    this.el.dialog?.addEventListener("close", () => {
      this.el.dialogInner.innerHTML = "";
    });
    $("#translation-close")?.addEventListener("click", () => {
      this.noticeDismissed = true;
      try {
        window.sessionStorage.setItem("hc-translation-dismissed", "1");
      } catch (error) {
        /* ignore private-mode storage errors */
      }
      this.updateTranslationNotice();
    });

    this.applyTranslations();
    this.hydrateIcons();
  }

  readNoticeState() {
    try {
      return window.sessionStorage.getItem("hc-translation-dismissed") === "1";
    } catch (error) {
      return false;
    }
  }

  setLanguage(lang) {
    this.lang = lang;
    this.t = (key, vars) => translate(lang, key, vars);
    this.applyTranslations();
    this.hydrateIcons();
    this.syncSettings(this.store.state.settings);
  }

  applyTranslations() {
    document.documentElement.lang = this.lang;
    document.documentElement.dir = dirFor(this.lang);
    document.body?.classList.toggle("is-rtl", dirFor(this.lang) === "rtl");
    $$("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      if (key) element.textContent = this.t(key);
    });
    $$("[data-i18n-placeholder]").forEach((element) => {
      const key = element.dataset.i18nPlaceholder;
      if (key) element.placeholder = this.t(key);
    });
    $$("[data-i18n-aria]").forEach((element) => {
      const key = element.dataset.i18nAria;
      if (key) element.setAttribute("aria-label", this.t(key));
    });
    if (this.el.languageSelect) this.el.languageSelect.value = this.lang;
    this.updateTranslationNotice();
    this.updateNav(this.currentView);
    this.updateTopbar();
    if (this.el.homeProof) {
      this.el.homeProof.textContent = `${Object.keys(WORLDS).length} ${this.t("home.worldsShort")} · ${OBJECTS.length} ${this.t("home.statDiscoveries")}`;
    }
    this.updateSoundButton(this.store.state.settings.sound);
    this.syncSettings(this.store.state.settings);
  }

  updateTranslationNotice() {
    if (!this.el.translationNotice) return;
    this.el.translationNotice.hidden = this.lang === "en" || this.noticeDismissed;
  }

  hydrateIcons(root = document) {
    $$("[data-icon]", root).forEach((element) => {
      const name = element.dataset.icon;
      element.innerHTML = icon(name);
      element.removeAttribute("data-icon");
    });
  }

  formatDate(value, options = {}) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(localeFor(this.lang), {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...options,
    }).format(date);
  }

  updateNav(view) {
    this.currentView = view;
    $$(".ex-navlink").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      if (active) {
        button.setAttribute("aria-current", "page");
        if (window.innerWidth <= 1080) {
          button.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
        }
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }

  updateTopbar() {
    const stats = this.store.getStats();
    if (this.el.topLevel) this.el.topLevel.textContent = stats.level.level;
    if (this.el.topXp) this.el.topXp.textContent = `${stats.xp} ${this.t("common.xp")}`;
    if (this.el.topLevelLabel) this.el.topLevelLabel.textContent = `${this.t("common.level")} ${stats.level.level}`;
  }

  updateSoundButton(enabled) {
    if (!this.el.soundToggle) return;
    this.el.soundToggle.innerHTML = icon(enabled ? "volume" : "mute");
    this.el.soundToggle.classList.toggle("is-on", Boolean(enabled));
    this.el.soundToggle.setAttribute("aria-pressed", String(Boolean(enabled)));
  }

  syncSettings(settings) {
    if (this.el.reducedMotionToggle) this.el.reducedMotionToggle.checked = Boolean(settings.reducedMotion);
    if (this.el.soundSettingToggle) this.el.soundSettingToggle.checked = Boolean(settings.sound);
    $$("[data-quality]", this.el.qualityChoice).forEach((button) => {
      button.classList.toggle("is-active", button.dataset.quality === settings.quality);
      button.setAttribute("aria-pressed", String(button.dataset.quality === settings.quality));
    });
  }

  setLoader(visible, progress = 0, text = null) {
    if (!this.el.loader) return;
    if (this.el.loaderProgress) this.el.loaderProgress.style.width = `${Math.max(8, Math.min(100, progress))}%`;
    if (text) {
      const copy = $(".loader-copy", this.el.loader);
      if (copy) copy.textContent = text;
    }
    this.el.loader.classList.toggle("is-hidden", !visible);
  }

  setSceneFallback(visible) {
    if (this.el.sceneFallback) this.el.sceneFallback.hidden = !visible;
    document.body.classList.toggle("no-webgl", visible);
  }

  setWorldFallback(visible) {
    if (this.el.worldFallback) this.el.worldFallback.hidden = !visible;
  }

  setReadingMode(value) {
    this.readingMode = Boolean(value);
    this.renderCollection(this.filter);
  }

  setActiveView(view) {
    this.updateNav(view);
    $$("[data-view-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.viewPanel === view);
    });
  }

  renderHome() {
    const stats = this.store.getStats();
    const total = ALL_CARDS.length;
    if (this.el.homeLevel) this.el.homeLevel.textContent = stats.level.level;
    if (this.el.homeLevelRing) this.el.homeLevelRing.style.setProperty("--pct", stats.level.pct);
    if (this.el.homeXp) this.el.homeXp.textContent = stats.xp;
    if (this.el.homeStreak) this.el.homeStreak.textContent = stats.streak;
    if (this.el.homeFound) this.el.homeFound.textContent = stats.discoveries;
    if (this.el.homeTotal) this.el.homeTotal.textContent = OBJECTS.length;
    if (this.el.homeFill) this.el.homeFill.style.width = `${Math.round((stats.discoveries / OBJECTS.length) * 100)}%`;
    if (this.el.homeProgressTitle) this.el.homeProgressTitle.textContent = `${this.t("common.level")} ${stats.level.level} · ${this.t("home.levelLabel")}`;
    this.updateTopbar();

    if (this.el.homeContinue) {
      const show = this.store.isReturning;
      this.el.homeContinue.hidden = !show;
      if (show) {
        const world = WORLDS[this.store.state.lastWorld] || WORLDS.kathmandu;
        this.el.homeContinue.textContent = this.t("home.resume", { world: localize(world.names, this.lang) });
      }
    }

    const recent = this.store.getRecentDiscoveries(4);
    if (this.el.homeMiniCards) {
      const found = recent.map((item) => item.card);
      const foundIds = new Set(found.map((card) => card.id));
      const locked = ALL_CARDS.filter((card) => !foundIds.has(card.id) && !this.store.state.collection[card.id]).slice(0, Math.max(0, 4 - found.length));
      const cards = [...found, ...locked].slice(0, 4);
      this.el.homeMiniCards.innerHTML = cards
        .map((card) => {
          const isFound = Boolean(this.store.state.collection[card.id]);
          const accent = COUNTRY_ACCENT[card.countryId] || "#e6bc6a";
          if (isFound) {
            const photo = OBJECT_IMAGES[card.id];
            return `<button type="button" class="mini-card is-found" style="--mini-accent:${accent}" data-open-card="${card.id}" title="${escapeHtml(localize(card.names, this.lang))}">
              <span class="mini-card-art" style="background:radial-gradient(circle at 65% 25%, ${accent}, transparent 70%)">${photo ? `<img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt || localize(card.names, this.lang))}" loading="lazy" decoding="async">` : ""}</span>
              ${categoryIcon(card.category)}
            </button>`;
          }
          return `<span class="mini-card is-empty" aria-hidden="true">${icon("lock")}</span>`;
        })
        .join("");
    }

    if (this.el.homeRecent) {
      this.el.homeRecent.innerHTML = recent.length
        ? recent
            .slice(0, 3)
            .map(({ card }) => `<button type="button" class="recent-item" data-open-card="${card.id}">
              <span class="recent-item-icon">${categoryIcon(card.category)}</span>
              <span><strong>${escapeHtml(localize(card.names, this.lang))}</strong><small>${escapeHtml(countryName(card.countryId, this.lang))} · ${escapeHtml(categoryName(card.category, this.lang))}</small></span>
            </button>`)
            .join("")
        : `<p class="recent-empty">${escapeHtml(this.t("home.emptyRecent"))}</p>`;
    }

    if (this.el.homeWorlds) {
      this.el.homeWorlds.innerHTML = Object.values(WORLDS)
        .sort((a, b) => a.order - b.order)
        .map((world) => {
          const country = COUNTRIES.find((item) => item.id === world.countryId);
          const flag = world.flag || (world.id === "karakoram" ? "🏔️" : country?.flag || "✦");
          const indexLabel = world.route
            ? localize(world.region, this.lang)
            : localize(country?.names, this.lang) || this.t("world.worlds");
          const names = localize(world.names, this.lang);
          return `<button type="button" class="world-choice" style="--world-accent:${world.accent}" data-world-choice="${world.id}">
            <span class="world-choice-index"><span class="flag">${flag}</span> ${escapeHtml(indexLabel)}</span>
            <h3>${escapeHtml(names)}</h3>
            <p>${escapeHtml(localize(world.blurb, this.lang))}</p>
            <span class="world-choice-meta"><span>${OBJECTS_BY_WORLD[world.id].length} ${escapeHtml(this.t("home.statDiscoveries"))}</span><span class="world-choice-arrow">${icon("arrow")}</span></span>
          </button>`;
        })
        .join("");
    }

    const today = this.getTodayEncounter();
    if (today) {
      if (this.el.homeDailyTitle) this.el.homeDailyTitle.textContent = localize(today.title, this.lang);
      if (this.el.homeDailyCountry) {
        const country = COUNTRIES.find((item) => item.id === today.countryId);
        this.el.homeDailyCountry.textContent = country ? localize(country.names, this.lang) : today.region;
      }
    }
  }

  getTodayEncounter() {
    if (!this.todayEncounter) {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const day = Math.floor((now - start) / 86400000);
      this.todayEncounter = DAILY_ENCOUNTERS[day % DAILY_ENCOUNTERS.length];
    }
    return this.todayEncounter;
  }

  renderWorld(world, { discovered = [], selectedId = null, hasScene = true } = {}) {
    const country = COUNTRIES.find((item) => item.id === world.countryId);
    const known = new Set(discovered);
    if (this.el.worldEyebrow) {
      this.el.worldEyebrow.textContent = this.t("world.eyebrow", {
        number: String(world.order).padStart(2, "0"),
        country: localize(country?.names, this.lang) || "",
      });
    }
    if (this.el.worldTitle) this.el.worldTitle.textContent = localize(world.names, this.lang);
    if (this.el.worldBlurb) this.el.worldBlurb.textContent = localize(world.blurb, this.lang);
    if (this.el.worldRegion) this.el.worldRegion.textContent = localize(world.region, this.lang);
    if (this.el.worldRouteNote) {
      this.el.worldRouteNote.hidden = world.id !== "karakoram" && !world.route;
      this.el.worldRouteNote.textContent = this.t("world.routeNote");
    }
    if (this.el.worldProgress) {
      const done = OBJECTS_BY_WORLD[world.id].filter((id) => known.has(id)).length;
      const total = OBJECTS_BY_WORLD[world.id].length;
      this.el.worldProgress.textContent = done === total && total > 0
        ? this.t("world.allCollected")
        : this.t("world.progress", { done, total });
    }
    if (this.el.worldJournal) this.el.worldJournal.href = journalFor(world);
    this.setWorldFallback(!hasScene);
    if (this.el.filmToggle) this.el.filmToggle.hidden = world.id !== "journey";
    this.renderWorldDock(world.id);
    this.renderTrail(world, known, selectedId);
    const view = $('.ex-view--world');
    if (view) view.style.setProperty("--world-accent", world.accent);
  }

  renderWorldDock(currentId) {
    if (!this.el.worldDock) return;
    this.el.worldDock.innerHTML = Object.values(WORLDS)
      .sort((a, b) => a.order - b.order)
      .map((world) => `<button type="button" class="dock-world ${world.id === currentId ? "is-active" : ""}" data-dock-world="${world.id}">
          <span class="dock-world-number">${String(world.order).padStart(2, "0")}</span>
          <strong>${escapeHtml(localize(world.names, this.lang))}</strong>
        </button>`)
      .join("");
    if (window.innerWidth <= 900) {
      this.el.worldDock.querySelector(".dock-world.is-active")?.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: "smooth",
      });
    }
  }

  renderTrail(world, known, selectedId) {
    if (!this.el.worldTrailList) return;
    const ids = OBJECTS_BY_WORLD[world.id] || [];
    this.el.worldTrailList.innerHTML = ids
      .map((id, index) => {
        const object = OBJECT_MAP[id];
        const found = known.has(id);
        return `<button type="button" class="trail-item ${found ? "is-found" : ""} ${selectedId === id ? "is-active" : ""}" data-trail-object="${id}">
          <span class="trail-item-index">${String(index + 1).padStart(2, "0")}</span>
          <span class="trail-item-copy"><strong>${escapeHtml(localize(object.names, this.lang))}</strong><small>${escapeHtml(categoryName(object.category, this.lang))}</small></span>
          <span class="trail-item-status">${found ? this.t("common.discovered") : this.t("common.locked")}</span>
        </button>`;
      })
      .join("");
  }

  showObject(object, { collected = false, quizResult = null } = {}) {
    if (!this.el.objectDrawer || !this.el.objectContent) return;
    this.currentObject = object;
    const world = WORLDS[object.worldId];
    const countryData = COUNTRIES.find((item) => item.id === object.countryId);
    const accent = COUNTRY_ACCENT[object.countryId] || "#b83a2e";
    const localizedName = localize(object.names, this.lang);
    const artifact = artworkMarkup(object, accent, localizedName);
    const sourceLinks = (object.sources || [])
      .map(
        (source) =>
          `<a class="object-source" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(source.label)}</span>${icon("arrow")}</a>`
      )
      .join("");
    const quizStatus = quizResult?.passed
      ? `<p class="object-quiz-status">${escapeHtml(this.t("object.quizDone", { score: quizResult.best || 100 }))}</p>`
      : "";
    this.el.objectContent.innerHTML = `
      ${artifact}
      <div class="object-kicker">
        <span>${escapeHtml(categoryName(object.category, this.lang))}</span>
        <span class="rarity rarity--${object.rarity}">${escapeHtml(rarityName(object.rarity, this.lang))}</span>
      </div>
      <h2 id="object-drawer-title">${escapeHtml(localizedName)}</h2>
      ${this.lang !== "en" ? `<p class="object-original-note">${escapeHtml(object.names.en)}</p>` : ""}
      <div class="object-subtitle">
        <span class="ex-chip">${escapeHtml(localize(world?.names, this.lang) || "")}</span>
        <span class="ex-chip">${escapeHtml(localize(countryData?.names, this.lang) || "")}</span>
      </div>
      <p class="object-summary">${escapeHtml(localize(object.summary, this.lang))}</p>
      <div class="object-section">
        <h3>${escapeHtml(this.t("object.story"))}</h3>
        ${paragraphs(localize(object.story, this.lang))}
        ${this.lang !== "en" && !(object.story && object.story[this.lang]) ? `<p class="object-original-note">${escapeHtml(this.t("object.originalNotice"))}</p>` : ""}
      </div>
      <div class="object-section">
        <h3>${escapeHtml(this.t("object.fact"))}</h3>
        <div class="object-fact">${escapeHtml(object.factI18n?.[this.lang] || object.fact)}</div>
      </div>
      <div class="object-actions">
        <button class="ex-button ex-button--gold" type="button" data-object-action="collect" ${collected ? "disabled" : ""}>
          <span data-icon="cards"></span><span>${escapeHtml(collected ? this.t("object.collected") : this.t("object.collect"))}</span>
        </button>
        <button class="ex-button ex-button--ghost" type="button" data-object-action="quiz">
          <span data-icon="spark"></span><span>${escapeHtml(this.t("object.quizCta"))}</span>
        </button>
        <button class="ex-button ex-button--text" type="button" data-object-action="ask">
          <span data-icon="guide"></span><span>${escapeHtml(this.t("object.askCta"))}</span>
        </button>
      </div>
      ${quizStatus}
      <p class="object-collect-hint">${escapeHtml(this.t("object.collectHint"))}</p>
      <div class="object-section">
        <h3>${escapeHtml(this.t("object.sources"))}</h3>
        <div class="object-sources">${sourceLinks}</div>
      </div>`;
    this.bindArtworkErrors(this.el.objectContent);
    this.el.objectDrawer.hidden = false;
    this.hydrateIcons(this.el.objectDrawer);
    const closeButton = $("#object-drawer-close");
    closeButton?.focus?.({ preventScroll: true });
  }

  hideObject() {
    if (this.el.objectDrawer) this.el.objectDrawer.hidden = true;
    this.currentObject = null;
  }

  bindArtworkErrors(scope) {
    scope?.querySelectorAll(".object-art--photo img").forEach((img) => {
      img.addEventListener("error", () => img.closest(".object-art")?.classList.add("is-missing"), { once: true });
    });
  }

  renderToday(encounter, { saved = false, quizResult = null } = {}) {
    if (!this.el.todayContent) return;
    this.todayEncounter = encounter;
    const card = CARD_MAP[encounter.cardId];
    const country = COUNTRIES.find((item) => item.id === encounter.countryId);
    const accent = COUNTRY_ACCENT[encounter.countryId] || encounter.accent || "#b83a2e";
    const streak = this.store.getStats().streak;
    const readToday = Boolean(this.store.state.dailyRead[this.store.getToday()]);
    const filledDots = Math.min(7, Math.max(0, streak || (readToday ? 1 : 0)));
    const art = this.encounterArt(card, accent);
    const targetWorld = card?.worldId ? WORLDS[card.worldId] : null;
    const objectTarget = OBJECT_MAP[card?.id] ? card.id : null;
    this.el.todayContent.innerHTML = `
      <div class="today-grid">
        <div class="today-main">
          <p class="ex-kicker"><span class="ex-kicker-line"></span><span>${escapeHtml(this.formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</span></p>
          <h2 class="today-title">${escapeHtml(localize(encounter.title, this.lang))}</h2>
          <div class="today-meta">
            <span class="ex-chip">${escapeHtml(localize(country?.names, this.lang) || "")}</span>
            <span class="ex-chip">${escapeHtml(encounter.region)}</span>
            <span class="ex-chip">${escapeHtml(this.t("collection.rarity"))}: ${escapeHtml(rarityName(card?.rarity || "common", this.lang))}</span>
          </div>
          <div class="today-story">
            <p>${escapeHtml(encounter.story)}</p>
            ${this.lang !== "en" ? `<p class="object-original-note">${escapeHtml(this.t("common.originalEnglish"))}</p>` : ""}
          </div>
          <div class="today-fact">${icon("spark")}<span>${escapeHtml(encounter.fact)}</span></div>
          <div class="today-actions">
            <button class="ex-button ex-button--gold" type="button" data-today-quiz>${icon("spark")}<span>${escapeHtml(this.t("today.quizCta"))}</span></button>
            <button class="ex-button ex-button--ghost" type="button" data-today-save ${saved ? "disabled" : ""}>${icon("cards")}<span>${escapeHtml(saved ? this.t("today.saved") : this.t("common.save"))}</span></button>
            <button class="ex-button ex-button--ghost" type="button" data-today-share>${icon("arrow")}<span>${escapeHtml(this.t("today.share"))}</span></button>
            ${targetWorld ? `<button class="ex-button ex-button--text" type="button" data-today-world="${targetWorld.id}" ${objectTarget ? `data-today-object="${objectTarget}"` : ""}>${icon("compass")}<span>${escapeHtml(this.t("today.view3d"))}</span></button>` : ""}
          </div>
        </div>
        <aside class="today-side">
          ${art}
          <div class="streak-card">
            <div class="streak-top"><strong>${streak}</strong><span>${escapeHtml(this.t("today.streak"))}</span></div>
            <div class="streak-dots" aria-hidden="true">${Array.from({ length: 7 }, (_, index) => `<span class="streak-dot ${index < filledDots ? "is-on" : ""}"></span>`).join("")}</div>
            <p class="panel-footnote" style="padding:8px 0 0;border:0;font-size:9px">${escapeHtml(streak > 0 ? this.t("today.streakDays", { count: streak }) : this.t("today.startStreak"))}</p>
          </div>
          <div class="today-quiz-card">
            <h3>${escapeHtml(this.t("quiz.title"))}</h3>
            <p>${escapeHtml(this.t("quiz.kicker"))}</p>
            ${quizResult?.passed ? `<span class="today-quiz-status">${escapeHtml(this.t("today.quizDone"))}</span>` : `<button class="ex-button ex-button--tiny ex-button--gold" type="button" data-today-quiz>${escapeHtml(this.t("common.quiz"))}</button>`}
          </div>
        </aside>
      </div>`;
    this.hydrateIcons(this.el.todayContent);
  }

  encounterArt(card, accent) {
    const category = card?.category || "traditions";
    return `<div class="encounter-art" style="--encounter-accent:${accent}">
      <svg class="encounter-art-svg" viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="encounterSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1d4054"/>
            <stop offset="100%" stop-color="${accent}"/>
          </linearGradient>
        </defs>
        <rect width="400" height="280" fill="url(#encounterSky)"/>
        <circle cx="315" cy="70" r="30" fill="#f5d89b" opacity=".9"/>
        <path d="M0 206 84 111l37 55 49-85 65 104 39-51 126 128v18H0Z" fill="#233b43" opacity=".62"/>
        <path d="M0 232 94 161l55 54 45-46 66 68 51-33 89 63v13H0Z" fill="#0e242d" opacity=".82"/>
        <path d="M0 248c76-12 130-4 190 7 79 15 140-4 210-17v42H0Z" fill="#071a22" opacity=".72"/>
        <path d="m35 60 13-4M30 70l18-1M346 104l15-3" stroke="#f8efd6" stroke-width="1.5" opacity=".55"/>
      </svg>
      <span class="encounter-art-label">${escapeHtml(countryName(card?.countryId || "nepal", this.lang))}</span>
      <span class="encounter-art-icon">${categoryIcon(category)}</span>
    </div>`;
  }

  renderEtiquette(scenarioId = this.currentEtiquette, choiceId = this.etiquetteChoice) {
    this.currentEtiquette = scenarioId;
    this.etiquetteChoice = choiceId;
    const scenario = ETIQUETTE_SCENARIOS.find((item) => item.id === scenarioId) || ETIQUETTE_SCENARIOS[0];
    const completed = new Set(this.store.state.completedEtiquette);
    if (this.el.etiquetteList) {
      this.el.etiquetteList.innerHTML = ETIQUETTE_SCENARIOS.map((item, index) => `
        <button type="button" class="etiquette-nav-item ${item.id === scenario.id ? "is-active" : ""} ${completed.has(item.id) ? "is-done" : ""}" data-etiquette-scenario="${item.id}">
          <span class="etiquette-nav-icon">${completed.has(item.id) ? icon("check") : icon(item.icon)}</span>
          <span><strong>${escapeHtml(localize(item.title, this.lang))}</strong><small>${escapeHtml(this.t("etiquette.scenario", { current: index + 1, total: ETIQUETTE_SCENARIOS.length }))}</small></span>
          ${completed.has(item.id) ? `<span class="trail-item-status">${escapeHtml(this.t("etiquette.completed"))}</span>` : ""}
        </button>`).join("");
    }
    if (!this.el.etiquetteDetail) return;
    if (!this.etiquetteOrders.has(scenario.id)) {
      this.etiquetteOrders.set(scenario.id, shuffledCopy(scenario.options));
    }
    const orderedOptions = this.etiquetteOrders.get(scenario.id);
    const chosen = scenario.options.find((option) => option.id === choiceId);
    this.el.etiquetteDetail.innerHTML = `
      <div class="etiquette-detail-head">
        <span class="etiquette-detail-icon">${icon(scenario.icon)}</span>
        <div><h2>${escapeHtml(localize(scenario.title, this.lang))}</h2><span class="ex-chip">${escapeHtml(this.t("etiquette.scenario", { current: ETIQUETTE_SCENARIOS.indexOf(scenario) + 1, total: ETIQUETTE_SCENARIOS.length }))}</span></div>
      </div>
      <p class="etiquette-context">${escapeHtml(scenario.context)}</p>
      <div class="etiquette-conversation">
        ${scenario.conversation.map((line) => `<div class="conversation-line"><span class="conversation-speaker">${escapeHtml(line.speaker)}</span><p>${escapeHtml(line.text)}</p></div>`).join("")}
      </div>
      <p class="etiquette-question">${escapeHtml(scenario.question)}</p>
      <div class="etiquette-options">
        ${orderedOptions.map((option, index) => {
          const classes = chosen ? `${option.correct ? "is-correct" : ""} ${choiceId === option.id && !option.correct ? "is-wrong" : ""}` : "";
          return `<button type="button" class="etiquette-option ${classes}" data-etiquette-option="${option.id}" ${chosen ? "disabled" : ""}>
            <span class="etiquette-option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option.text)}</span>
          </button>`;
        }).join("")}
      </div>
      ${chosen ? `<div class="etiquette-feedback"><strong>${escapeHtml(this.t("etiquette.feedback"))}:</strong> ${escapeHtml(chosen.feedback)}</div>` : ""}
      <div class="etiquette-extra-grid">
        <div class="etiquette-box"><h3>${escapeHtml(this.t("etiquette.expressions"))}</h3>${scenario.expressions.map((expression) => `<div class="expression"><span class="script">${escapeHtml(expression.script)}</span><span class="roman">${escapeHtml(expression.roman)}</span><span class="meaning">${escapeHtml(expression.meaning)}</span></div>`).join("")}</div>
        <div class="etiquette-box"><h3>${escapeHtml(this.t("etiquette.challenge"))}</h3><p>${escapeHtml(scenario.challenge)}</p></div>
      </div>
      <div class="etiquette-note">${escapeHtml(scenario.note)}</div>
      <div class="etiquette-next">
        ${chosen && !chosen.correct ? `<button type="button" class="ex-button ex-button--tiny ex-button--ghost" data-etiquette-retry>${escapeHtml(this.t("etiquette.chooseAnother"))}</button>` : ""}
        <button type="button" class="ex-button ex-button--tiny ex-button--ghost" data-etiquette-next>${escapeHtml(this.t("etiquette.next"))} ${icon("arrow")}</button>
      </div>`;
    this.hydrateIcons(this.el.etiquetteDetail);
  }

  renderCollection(filter = this.filter) {
    this.filter = filter;
    const found = this.store.state.collection;
    const cards = ALL_CARDS
      .filter((card) => filter === "all" || card.category === filter)
      .sort((a, b) => {
        const aFound = Boolean(found[a.id]);
        const bFound = Boolean(found[b.id]);
        if (aFound !== bFound) return aFound ? -1 : 1;
        return localize(a.names, this.lang).localeCompare(localize(b.names, this.lang));
      });
    const total = ALL_CARDS.length;
    const collected = Object.keys(found).length;
    if (this.el.collectionProgress) this.el.collectionProgress.textContent = this.t("collection.yourProgress", { found: collected, total });
    if (this.el.collectionFill) this.el.collectionFill.style.width = `${Math.round((collected / total) * 100)}%`;
    if (this.el.collectionFilters) {
      const filters = [{ id: "all", label: this.t("common.all") }, ...Object.entries(CATEGORIES).map(([id, category]) => ({ id, label: localize(category, this.lang) }))];
      this.el.collectionFilters.innerHTML = filters
        .map((item) => `<button type="button" class="filter-chip ${filter === item.id ? "is-active" : ""}" data-collection-filter="${item.id}">${escapeHtml(item.label)}</button>`)
        .join("");
    }
    if (this.el.achievementStrip) {
      const unlocked = this.store.state.achievements;
      this.el.achievementStrip.innerHTML = `
        <p class="achievement-strip-head">${escapeHtml(this.t("collection.achievements"))} <span>${unlocked.length} / ${ACHIEVEMENTS.length}</span></p>
        <div class="achievement-badges">
          ${ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = unlocked.includes(achievement.id);
            return `<div class="achievement-badge ${isUnlocked ? "is-unlocked" : ""}" title="${escapeHtml(localize(achievement.descriptions, this.lang))}">
              <span class="achievement-badge-icon">${icon(achievement.icon)}</span>
              <span><strong>${escapeHtml(localize(achievement.names, this.lang))}</strong><small>${escapeHtml(isUnlocked ? localize(achievement.descriptions, this.lang) : this.t("common.locked"))}</small></span>
            </div>`;
          }).join("")}
        </div>`;
    }
    if (!this.el.collectionGrid) return;
    const empty = collected === 0
      ? `<div class="collection-empty"><h3>${escapeHtml(this.t("collection.empty"))}</h3><p>${escapeHtml(this.t("collection.emptyHint"))}</p></div>`
      : "";
    this.el.collectionGrid.innerHTML = empty + cards.map((card) => this.collectionCard(card, Boolean(found[card.id]))).join("");
    this.hydrateIcons(this.el.collectionGrid);
    this.bindArtworkErrors(this.el.collectionGrid);
  }

  collectionCard(card, isFound) {
    const accent = COUNTRY_ACCENT[card.countryId] || "#e6bc6a";
    const discoveredAt = this.store.state.collection[card.id];
    const names = localize(card.names, this.lang);
    const country = countryName(card.countryId, this.lang);
    const canRead = isFound || this.readingMode;
    const photo = canRead ? OBJECT_IMAGES[card.id] : null;
    const content = `
      <div class="culture-card-art ${photo ? "has-photo" : ""}" style="--card-accent:${accent}">
        ${photo ? `<img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt || names)}" loading="lazy" decoding="async">` : ""}
        <span class="culture-card-art-icon">${canRead ? categoryIcon(card.category) : icon("lock")}</span>
        <span class="culture-card-rarity rarity--${card.rarity}">${escapeHtml(rarityName(card.rarity, this.lang))}</span>
        ${!isFound ? `<span class="culture-card-status">${escapeHtml(this.readingMode ? this.t("collection.readingMode") : this.t("common.locked"))}</span>` : ""}
      </div>
      <div class="culture-card-body">
        <span class="culture-card-cat">${escapeHtml(categoryName(card.category, this.lang))}</span>
        <h3>${escapeHtml(names)}</h3>
        <span class="culture-card-country">${escapeHtml(country)} · ${escapeHtml(categoryName(card.category, this.lang))}</span>
        <span class="culture-card-date">${discoveredAt ? `${icon("check")} ${escapeHtml(this.t("collection.discoveredOn", { date: this.formatDate(discoveredAt) }))}` : escapeHtml(this.readingMode ? this.t("collection.readingMode") : this.t("collection.undiscovered"))}</span>
      </div>`;
    if (!canRead) {
      return `<div class="culture-card is-locked" aria-disabled="true">${content}</div>`;
    }
    return `<button type="button" class="culture-card ${!isFound ? "is-reading" : ""}" data-open-card="${card.id}" style="text-align:start">${content}</button>`;
  }

  renderBridge(bridgeId = this.currentBridge, choiceId = this.bridgeChoice) {
    this.currentBridge = bridgeId;
    this.bridgeChoice = choiceId;
    const bridge = BRIDGES.find((item) => item.id === bridgeId) || BRIDGES[0];
    const completed = this.store.state.completedBridges.includes(bridge.id);
    if (this.el.bridgeList) {
      this.el.bridgeList.innerHTML = BRIDGES.map((item, index) => {
        const done = this.store.state.completedBridges.includes(item.id);
        return `<button type="button" class="bridge-nav-item ${item.id === bridge.id ? "is-active" : ""} ${done ? "is-done" : ""}" data-bridge-nav="${item.id}">
          <span class="bridge-nav-icon">${done ? icon("check") : icon("bridge")}</span>
          <span><strong>${escapeHtml(localize(item.title, this.lang))}</strong><small>${escapeHtml(categoryName(item.category, this.lang))}</small></span>
        </button>`;
      }).join("");
    }
    if (!this.el.bridgeDetail) return;
    if (!this.bridgeOrders.has(bridge.id)) {
      this.bridgeOrders.set(bridge.id, shuffledCopy(bridge.options));
    }
    const orderedBridgeOptions = this.bridgeOrders.get(bridge.id);
    const cardA = CARD_MAP[bridge.a];
    const cardB = CARD_MAP[bridge.b];
    const chosen = bridge.options.find((option) => option.id === choiceId);
    this.el.bridgeDetail.innerHTML = `
      <div class="bridge-pair">
        ${this.bridgeObject(cardA)}
        <span class="bridge-link">${icon("bridge")}</span>
        ${this.bridgeObject(cardB)}
      </div>
      <h2>${escapeHtml(localize(bridge.title, this.lang))}</h2>
      <p class="bridge-prompt">${escapeHtml(bridge.prompt)}</p>
      <div class="bridge-options">
        ${orderedBridgeOptions.map((option) => {
          const chosenClass = chosen ? `${option.correct ? "is-correct" : ""} ${choiceId === option.id && !option.correct ? "is-wrong" : ""}` : "";
          return `<button type="button" class="bridge-option ${chosenClass}" data-bridge-choice="${option.id}" ${chosen ? "disabled" : ""}>${escapeHtml(option.text)}</button>`;
        }).join("")}
      </div>
      ${chosen ? `<div class="bridge-result"><strong>${escapeHtml(chosen.correct ? this.t("bridge.correct") : this.t("bridge.tryAgain"))}</strong><br>${escapeHtml(bridge.explanation)}</div>
        <div class="bridge-columns">
          <div class="bridge-column"><h3>${escapeHtml(this.t("bridge.similarities"))}</h3><ul>${bridge.similarities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
          <div class="bridge-column"><h3>${escapeHtml(this.t("bridge.differences"))}</h3><ul>${bridge.differences.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
        </div>` : ""}
      ${completed ? `<div class="bridge-complete"><span>${escapeHtml(this.t("bridge.complete"))} · ${escapeHtml(this.t("bridge.rewardCard"))}</span>${icon("check")}</div>` : ""}
      <div class="etiquette-next">
        ${chosen && !chosen.correct ? `<button type="button" class="ex-button ex-button--tiny ex-button--ghost" data-bridge-retry>${escapeHtml(this.t("common.tryAgain"))}</button>` : ""}
        <button type="button" class="ex-button ex-button--tiny ex-button--ghost" data-bridge-next>${escapeHtml(this.t("bridge.next"))} ${icon("arrow")}</button>
      </div>`;
    this.hydrateIcons(this.el.bridgeDetail);
  }

  bridgeObject(card) {
    return `<div class="bridge-object">
      <div class="bridge-object-top"><span class="bridge-object-icon">${categoryIcon(card.category)}</span><div><small>${escapeHtml(countryName(card.countryId, this.lang))}</small><h4>${escapeHtml(localize(card.names, this.lang))}</h4></div></div>
      <p>${escapeHtml(localize(card.summary, this.lang))}</p>
    </div>`;
  }

  renderGame() {
    if (!this.el.gameContent) return;
    const activeHunt = this.store.state.activeHunt;
    this.el.gameContent.innerHTML = SCAVENGER_HUNTS.map((hunt) => {
      const state = this.store.getHuntState(hunt.id) || { found: [], total: hunt.targets.length, complete: false };
      const world = WORLDS[hunt.worldId];
      const accent = world?.accent || "#b07a3a";
      const foundCount = state.found.length;
      const pct = Math.round((foundCount / state.total) * 100);
      const complete = state.complete;
      const isActive = activeHunt === hunt.id && !complete;
      return `<div class="hunt-card ${complete ? "is-complete" : ""} ${isActive ? "is-active" : ""}" style="--hunt-accent:${accent}">
        <div class="hunt-card-head">
          <span class="hunt-card-icon">${icon(hunt.icon || "compass")}</span>
          <div>
            <span class="ex-chip">${escapeHtml(localize(world?.names, this.lang) || "")}</span>
            <h3>${escapeHtml(localize(hunt.title, this.lang))}</h3>
          </div>
        </div>
        <p class="hunt-card-blurb">${escapeHtml(localize(hunt.blurb, this.lang))}</p>
        <p class="hunt-targets-label">${escapeHtml(this.t("game.targets"))}</p>
        <div class="hunt-targets">
          ${hunt.targets.map((id) => {
            const object = OBJECT_MAP[id];
            const done = state.found.includes(id);
            return `<span class="hunt-target ${done ? "is-found" : ""}">${done ? icon("check") : icon("compass")}<span>${escapeHtml(localize(object?.names, this.lang))}</span></span>`;
          }).join("")}
        </div>
        <div class="hunt-progress" aria-hidden="true"><span style="width:${pct}%"></span></div>
        <div class="hunt-card-foot">
          <span>${escapeHtml(complete ? this.t("game.completed") : this.t("game.found", { found: foundCount, total: state.total }))} · ${escapeHtml(this.t("game.reward", { xp: hunt.xp }))}</span>
          <button type="button" class="ex-button ex-button--tiny ${complete ? "ex-button--text" : "ex-button--gold"}" data-hunt-start="${hunt.id}">
            ${icon("compass")}<span>${escapeHtml(complete ? this.t("game.revisit") : foundCount > 0 ? this.t("game.resume") : this.t("game.start"))}</span>
          </button>
        </div>
      </div>`;
    }).join("");
    this.hydrateIcons(this.el.gameContent);
  }

  toast(message, { gold = false, title = "" } = {}) {
    const stack = $("#toast-stack");
    if (!stack) return;
    const toast = document.createElement("div");
    toast.className = `ex-toast ${gold ? "is-gold" : ""}`;
    toast.setAttribute("role", "status");
    const content = document.createElement("div");
    content.className = "ex-toast-content";
    if (title) {
      const strong = document.createElement("strong");
      strong.textContent = title;
      content.appendChild(strong);
    }
    const p = document.createElement("span");
    p.textContent = message;
    content.appendChild(p);
    toast.appendChild(content);
    stack.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add("is-leaving");
      window.setTimeout(() => toast.remove(), 280);
    }, 4600);
  }

  achievementToast(achievement) {
    const name = localize(achievement.names, this.lang);
    this.toast(this.t("toast.achievement", { name, xp: achievement.xp }), { gold: true, title: this.t("achievement.unlocked") });
  }

  levelToast(level) {
    this.toast(this.t("toast.levelUp", { level }), { gold: true });
  }

  openDialog(html) {
    if (!this.el.dialog || !this.el.dialogInner) return;
    this.el.dialogInner.innerHTML = `<button class="dialog-close" type="button" data-dialog-close aria-label="${escapeHtml(this.t("common.close"))}">${icon("close")}</button>${html}`;
    if (!this.el.dialog.open) this.el.dialog.showModal();
    $("#ex-dialog-inner [data-dialog-close]")?.focus?.({ preventScroll: true });
  }

  closeDialog() {
    if (this.el.dialog?.open) this.el.dialog.close();
    if (this.el.dialogInner) this.el.dialogInner.innerHTML = "";
  }

  showTutorial({ onStart, onSkip } = {}) {
    this.el.dialog?.addEventListener("close", () => onSkip?.(), { once: true });
    this.openDialog(`
      <p class="dialog-kicker">${escapeHtml(this.t("home.kicker"))}</p>
      <h2>${escapeHtml(this.t("home.tutorialTitle"))}</h2>
      <p>${escapeHtml(this.t("home.tutorialBody"))}</p>
      <div class="tutorial-list">
        <div class="tutorial-item"><span class="tutorial-index">01</span><span>${escapeHtml(this.t("home.tutorialPoint1"))}</span></div>
        <div class="tutorial-item"><span class="tutorial-index">02</span><span>${escapeHtml(this.t("home.tutorialPoint2"))}</span></div>
        <div class="tutorial-item"><span class="tutorial-index">03</span><span>${escapeHtml(this.t("home.tutorialPoint3"))}</span></div>
      </div>
      <div class="dialog-actions">
        <button type="button" class="ex-button ex-button--text" data-dialog-close>${escapeHtml(this.t("common.skip"))}</button>
        <button type="button" class="ex-button ex-button--gold" id="tutorial-start">${escapeHtml(this.t("home.tutorialCta"))} ${icon("arrow")}</button>
      </div>`);
    $("#tutorial-start")?.addEventListener("click", () => {
      this.closeDialog();
      onStart?.();
    });
  }

  showHelp() {
    this.openDialog(`
      <p class="dialog-kicker">${escapeHtml(this.t("common.help"))}</p>
      <h2>${escapeHtml(this.t("help.title"))}</h2>
      <div class="tutorial-list">
        <div class="tutorial-item"><span class="tutorial-index">01</span><span>${escapeHtml(this.t("help.orbit"))}</span></div>
        <div class="tutorial-item"><span class="tutorial-index">02</span><span>${escapeHtml(this.t("help.zoom"))}</span></div>
        <div class="tutorial-item"><span class="tutorial-index">03</span><span>${escapeHtml(this.t("help.pan"))}</span></div>
        <div class="tutorial-item"><span class="tutorial-index">04</span><span>${escapeHtml(this.t("help.select"))}</span></div>
        <div class="tutorial-item"><span class="tutorial-index">05</span><span>${escapeHtml(this.t("help.reset"))}</span></div>
      </div>
      <p class="panel-footnote" style="padding:0;border:0">${escapeHtml(this.t("help.accessible"))}</p>
      <div class="dialog-actions"><button type="button" class="ex-button ex-button--gold" data-dialog-close>${escapeHtml(this.t("help.close"))}</button></div>`);
  }

  showSources() {
    this.openDialog(`
      <p class="dialog-kicker">Himalaya Connect</p>
      <h2>${escapeHtml(this.t("sources.title"))}</h2>
      <p>${escapeHtml(this.t("sources.lede"))}</p>
      <p>${escapeHtml(this.t("sources.illustrative"))}</p>
      <p>${escapeHtml(this.t("sources.ethics"))}</p>
      <div class="object-sources" style="margin-top:16px">${SOURCE_NOTES.map((source) => `<a class="object-source" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(source.label)}</span>${icon("arrow")}</a>`).join("")}</div>
      <p style="margin-top:16px">${escapeHtml(this.t("sources.thanks"))}</p>
      <div class="dialog-actions"><button type="button" class="ex-button ex-button--gold" data-dialog-close>${escapeHtml(this.t("sources.close"))}</button></div>`);
  }

  showQuiz(quiz, { onPass = null, onClose = null, previouslyPassed = false } = {}) {
    const sourceOptions = quiz.options || [];
    const sourceAnswerIndex = typeof quiz.answer === "number" ? quiz.answer : 0;
    const correctText = sourceOptions[sourceAnswerIndex];
    const shuffled = shuffledCopy(sourceOptions);
    const options = shuffled;
    const answerIndex = Math.max(0, shuffled.indexOf(correctText));
    const question = quiz.q || quiz.question || "";
    let answered = false;
    let passed = false;
    this.openDialog(`
      <p class="dialog-kicker">${escapeHtml(this.t("quiz.kicker"))}</p>
      <h2>${escapeHtml(this.t("quiz.title"))}</h2>
      <div class="quiz-header"><span class="ex-chip">${escapeHtml(this.t("quiz.answerLabel"))}</span><span class="ex-chip">${previouslyPassed ? escapeHtml(this.t("quiz.completed")) : escapeHtml(this.t("quiz.reward", { xp: 15 }))}</span></div>
      <p class="quiz-question">${escapeHtml(question)}</p>
      ${this.lang !== "en" ? `<p class="object-original-note">${escapeHtml(this.t("common.originalEnglish"))}</p>` : ""}
      <div class="quiz-options">
        ${options.map((option, index) => `<button type="button" class="quiz-option" data-quiz-option="${index}"><span class="quiz-option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span></button>`).join("")}
      </div>
      <div class="quiz-feedback" id="quiz-feedback" hidden></div>
      <div class="quiz-footer"><span>${escapeHtml(this.t("quiz.kicker"))}</span><button type="button" class="ex-button ex-button--tiny ex-button--gold" data-dialog-close>${escapeHtml(this.t("common.close"))}</button></div>`);
    const feedback = $("#quiz-feedback");
    const optionButtons = $$("[data-quiz-option]");
    optionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const chosen = Number(button.dataset.quizOption);
        const correct = chosen === answerIndex;
        optionButtons.forEach((optionButton, index) => {
          optionButton.disabled = true;
          if (index === answerIndex) optionButton.classList.add("is-correct");
          if (index === chosen && !correct) optionButton.classList.add("is-wrong");
        });
        feedback.hidden = false;
        feedback.className = `quiz-feedback ${correct ? "is-correct" : "is-wrong"}`;
        feedback.innerHTML = `<strong>${escapeHtml(correct ? this.t("quiz.correct") : this.t("quiz.incorrect"))}</strong><p>${escapeHtml(quiz.explain || quiz.explanation || quiz.correctGeneric || "")}</p>`;
        if (correct && !passed) {
          passed = true;
          onPass?.(100);
        }
        const footer = $(".quiz-footer", this.el.dialogInner);
        if (footer) {
          footer.querySelector("span").textContent = this.t("quiz.score", {
            correct: correct ? 1 : 0,
            total: options.length,
          });
        }
      });
    });
    this.el.dialog?.addEventListener("close", () => onClose?.(), { once: true });
  }

  showCardDetail(card, { collected = false } = {}) {
    if (!card) return;
    const world = card.worldId ? WORLDS[card.worldId] : null;
    const accent = COUNTRY_ACCENT[card.countryId] || "#e6bc6a";
    const sources = (card.sources || []).map((source) => `<a class="object-source" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(source.label)}</span>${icon("arrow")}</a>`).join("");
    this.openDialog(`
      ${artworkMarkup(card, accent, localize(card.names, this.lang), countryName(card.countryId, this.lang))}
      <div class="object-kicker"><span>${escapeHtml(categoryName(card.category, this.lang))}</span><span class="rarity rarity--${card.rarity}">${escapeHtml(rarityName(card.rarity, this.lang))}</span></div>
      <h2>${escapeHtml(localize(card.names, this.lang))}</h2>
      <p class="object-summary">${escapeHtml(localize(card.summary, this.lang))}</p>
      <div class="object-section"><h3>${escapeHtml(this.t("object.story"))}</h3>${paragraphs(localize(card.story, this.lang))}</div>
      <div class="object-section"><h3>${escapeHtml(this.t("object.fact"))}</h3><div class="object-fact">${escapeHtml(card.factI18n?.[this.lang] || card.fact)}</div></div>
      ${sources ? `<div class="object-section"><h3>${escapeHtml(this.t("object.sources"))}</h3><div class="object-sources">${sources}</div></div>` : ""}
      <div class="dialog-actions">
        ${world && card.id && !OBJECT_MAP[card.id] ? `<button type="button" class="ex-button ex-button--ghost" data-card-world="${world.id}">${escapeHtml(this.t("today.view3d"))}</button>` : ""}
        <button type="button" class="ex-button ${collected ? "ex-button--text" : "ex-button--gold"}" data-card-collect="${card.id}" ${collected ? "disabled" : ""}>${escapeHtml(collected ? this.t("object.collected") : this.t("object.collect"))}</button>
        <button type="button" class="ex-button ex-button--text" data-dialog-close>${escapeHtml(this.t("common.close"))}</button>
      </div>`);
    this.hydrateIcons(this.el.dialogInner);
    this.bindArtworkErrors(this.el.dialogInner);
  }

  toggleSettings(show = null) {
    if (!this.el.settings) return;
    const shouldShow = show === null ? this.el.settings.hidden : show;
    this.el.settings.hidden = !shouldShow;
  }

  showTooltip(text, x, y) {
    if (!this.el.tooltip) return;
    if (!text) {
      this.el.tooltip.hidden = true;
      return;
    }
    this.el.tooltip.textContent = text;
    this.el.tooltip.style.left = `${x}px`;
    this.el.tooltip.style.top = `${y}px`;
    this.el.tooltip.hidden = false;
  }

  updateObjectCollectionState(cardId, collected) {
    if (!this.currentObject || this.currentObject.id !== cardId) return;
    const button = $('[data-object-action="collect"]', this.el.objectDrawer);
    if (!button) return;
    button.disabled = collected;
    const label = $("span:last-child", button);
    if (label) label.textContent = collected ? this.t("object.collected") : this.t("object.collect");
  }
}
