import { COUNTRIES, MAP_LOCATIONS, WORLDS } from "./data.js";
import { icon } from "./icons.js";

const COUNTRY_COLORS = {
  nepal: "#c45a45",
  pakistan: "#2f8a62",
  china: "#d0a53d",
};

function localize(value, lang) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.en || "";
}

function countryFor(id) {
  return COUNTRIES.find((country) => country.id === id);
}

function categoryIcon(category) {
  return icon(category === "landmark" ? "landmark" : category === "community" ? "globe" : "compass");
}

export class CultureMap {
  constructor({ mapEl, listEl, detailEl, filtersEl, loadingEl, tileNoteEl, store, t, onOpenWorld, onToast }) {
    this.mapEl = mapEl;
    this.listEl = listEl;
    this.detailEl = detailEl;
    this.filtersEl = filtersEl;
    this.loadingEl = loadingEl;
    this.tileNoteEl = tileNoteEl;
    this.store = store;
    this.t = t;
    this.onOpenWorld = onOpenWorld;
    this.onToast = onToast;
    this.lang = store.language;
    this.filter = "all";
    this.selectedId = "kathmandu";
    this.map = null;
    this.markers = new Map();
    this.initialized = false;
    this.tileErrorShown = false;
    this.renderFilters();
    this.renderList();
    this.renderDetail();
  }

  get locations() {
    return this.filter === "all"
      ? MAP_LOCATIONS
      : MAP_LOCATIONS.filter((location) => location.countryId === this.filter);
  }

  async init() {
    if (this.initialized) {
      this.map?.invalidateSize();
      return;
    }
    this.initialized = true;
    const L = await this.waitForLeaflet();
    if (!L) {
      this.loadingEl?.classList.add("is-hidden");
      this.tileNoteEl.hidden = false;
      this.tileNoteEl.textContent = this.t("map.tileError");
      return;
    }
    this.L = L;
    this.map = L.map(this.mapEl, {
      zoomControl: true,
      scrollWheelZoom: true,
      worldCopyJump: true,
      minZoom: 3,
      maxZoom: 12,
    });
    this.map.setView([34, 88], 5);
    const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
      crossOrigin: true,
    });
    let loaded = false;
    tiles.on("load", () => {
      loaded = true;
      this.loadingEl?.classList.add("is-hidden");
    });
    tiles.on("tileerror", () => {
      if (this.tileErrorShown) return;
      this.tileErrorShown = true;
      this.tileNoteEl.hidden = false;
      this.tileNoteEl.textContent = this.t("map.tileError");
      this.onToast?.(this.t("toast.mapTiles"));
    });
    tiles.addTo(this.map);
    window.setTimeout(() => {
      if (!loaded) this.loadingEl?.classList.add("is-hidden");
    }, 3200);
    window.setTimeout(() => {
      if (!loaded) {
        this.tileNoteEl.hidden = false;
        this.tileNoteEl.textContent = this.t("map.tileError");
      }
    }, 6500);

    this.markerLayer = L.layerGroup().addTo(this.map);
    this.refreshMarkers();
    const bounds = L.latLngBounds(MAP_LOCATIONS.map((location) => [location.lat, location.lng]));
    this.map.fitBounds(bounds.pad(0.22), { animate: false });
    this.map.on("click", () => {});
    window.setTimeout(() => this.map?.invalidateSize(), 250);
    this.select(this.selectedId, { pan: false });
  }

  waitForLeaflet() {
    return new Promise((resolve) => {
      if (window.L) {
        resolve(window.L);
        return;
      }
      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;
        if (window.L) {
          window.clearInterval(timer);
          resolve(window.L);
        } else if (attempts > 40) {
          window.clearInterval(timer);
          resolve(null);
        }
      }, 100);
    });
  }

  refreshMarkers() {
    if (!this.map || !this.L) return;
    const L = this.L;
    this.markerLayer.clearLayers();
    this.markers.clear();
    this.locations.forEach((location) => {
      const country = countryFor(location.countryId);
      const marker = L.marker([location.lat, location.lng], {
        icon: L.divIcon({
          className: "",
          html: `<span class="map-marker ${location.worldId ? "is-world" : ""}" style="--pin-color:${COUNTRY_COLORS[location.countryId] || "#e6bc6a"}">${categoryIcon(location.category)}</span>`,
          iconSize: location.worldId ? [31, 31] : [26, 26],
          iconAnchor: location.worldId ? [15, 30] : [13, 26],
        }),
        title: localize(location.title, this.lang),
        keyboard: true,
      });
      marker.on("click", () => this.select(location.id, { pan: true }));
      marker.addTo(this.markerLayer);
      this.markers.set(location.id, marker);
    });
  }

  renderFilters() {
    if (!this.filtersEl) return;
    const options = [{ id: "all", label: this.t("map.all") }, ...COUNTRIES.map((country) => ({
      id: country.id,
      label: localize(country.names, this.lang),
    }))];
    this.filtersEl.innerHTML = options
      .map(
        (option) =>
          `<button type="button" class="filter-chip ${this.filter === option.id ? "is-active" : ""}" data-map-filter="${option.id}">${option.label}</button>`
      )
      .join("");
    this.filtersEl.querySelectorAll("[data-map-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        this.filter = button.dataset.mapFilter;
        this.renderFilters();
        this.refreshMarkers();
        this.renderList();
        if (this.filter !== "all" && this.selectedId && !this.locations.some((loc) => loc.id === this.selectedId)) {
          const first = this.locations[0];
          if (first) this.select(first.id, { pan: true });
        }
      });
    });
  }

  renderList() {
    if (!this.listEl) return;
    this.listEl.innerHTML = this.locations
      .map((location) => {
        const country = countryFor(location.countryId);
        return `<button type="button" class="map-list-item ${this.selectedId === location.id ? "is-active" : ""}" data-map-location="${location.id}">
          <span class="map-list-dot" style="--country-color:${COUNTRY_COLORS[location.countryId]}"></span>
          <span><strong>${localize(location.title, this.lang)}</strong><small>${localize(country?.names, this.lang) || ""} · ${this.t(`map.${location.category === "community" ? "community" : location.category === "landmark" ? "landmark" : "worldMarker"}`)}</small></span>
          ${location.worldId ? icon("compass") : icon("map")}
        </button>`;
      })
      .join("");
    this.listEl.querySelectorAll("[data-map-location]").forEach((button) => {
      button.addEventListener("click", () => this.select(button.dataset.mapLocation, { pan: true }));
    });
  }

  renderDetail() {
    if (!this.detailEl) return;
    const location = MAP_LOCATIONS.find((item) => item.id === this.selectedId) || this.locations[0];
    if (!location) {
      this.detailEl.innerHTML = `<p class="map-detail-empty">${this.t("map.empty")}</p>`;
      return;
    }
    const country = countryFor(location.countryId);
    const world = location.worldId ? WORLDS[location.worldId] : null;
    this.detailEl.innerHTML = `
      <span class="ex-chip">${localize(country?.names, this.lang) || ""} · ${this.t(`map.${location.category === "community" ? "community" : location.category === "landmark" ? "landmark" : "worldMarker"}`)}</span>
      <h3>${localize(location.title, this.lang)}</h3>
      <p>${location.detail}</p>
      <p class="map-detail-coords">${this.t("map.coordinates")}: ${location.lat.toFixed(4)}°, ${location.lng.toFixed(4)}°</p>
      <div class="map-detail-actions">
        ${world ? `<button type="button" class="ex-button ex-button--tiny ex-button--gold" data-open-world="${world.id}">${this.t("map.openWorld")} ${icon("arrow")}</button>` : `<span class="ex-chip">${this.t("map.noWorld")}</span>`}
        <a class="ex-button ex-button--tiny ex-button--ghost" href="${location.worldId ? "/stories/" : "/stories/"}" data-map-journal>${this.t("map.openJournal")}</a>
      </div>`;
    const worldButton = this.detailEl.querySelector("[data-open-world]");
    if (worldButton) {
      worldButton.addEventListener("click", () => this.onOpenWorld?.(worldButton.dataset.openWorld));
    }
  }

  select(id, { pan = false } = {}) {
    const location = MAP_LOCATIONS.find((item) => item.id === id);
    if (!location) return;
    this.selectedId = id;
    this.renderList();
    this.renderDetail();
    this.markers.forEach((marker, markerId) => {
      marker.getElement()?.classList.toggle("is-selected", markerId === id);
    });
    if (pan && this.map) {
      this.map.flyTo([location.lat, location.lng], Math.max(this.map.getZoom(), 7), { duration: 0.7 });
    }
  }

  open() {
    this.init();
    window.setTimeout(() => this.map?.invalidateSize(), 260);
  }

  setLanguage(lang) {
    this.lang = lang;
    this.renderFilters();
    this.renderList();
    this.renderDetail();
    this.refreshMarkers();
  }
}
