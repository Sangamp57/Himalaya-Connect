/* 3D World Guide: a tab inside the Guide view.
   For each world: how to play, where the rides are, the main places (with
   pictures taken in the game), what can be discovered there and the animals.
   "Go there" opens the world and walks you to the place. */
import { OBJECT_MAP, WORLDS } from "./data.js";
import { OBJECT_IMAGES } from "./object-images.js";
import { WORLD_GUIDE } from "./world-guide-data.js";
import { drawRideIcon } from "./three/worlds/walk-engine.js";

const ORDER = ["kathmandu", "pokhara", "hunza", "skardu", "kashgar", "turpan", "dunhuang", "karakoram", "journey", "puer", "xishuangbanna"];

const T = {
  en: {
    ask: "Ask the guide", worlds: "3D world guide",
    intro: "Pick a world to see its main places, where to find every ride and which animals live there. Pictures are taken inside the game.",
    howTitle: "How to play",
    how: [
      ["W A S D", "walk · Shift to run · drag to look around"],
      ["E", "learn about the golden beacon or the ⓘ animal nearby"],
      ["F", "get on or off a ride (look for the teal ride badge)"],
      ["Map", "teal badges on the mini-map show where the rides wait"],
    ],
    rides: "Rides in this world", places: "Places", animals: "Animals", shops: "Shops",
    go: "Go there", here: "Here you can find", rideAt: "Waiting at",
    kinds: {
      camel: "Walk up to the saddled camel and press F. Camels are slow but climb the dunes.",
      horse: "Press F beside the saddled horse. Hold Shift to gallop.",
      yak: "Yaks are steady on rough ground. Press F beside the saddled yak.",
      cart: "Sit on the donkey cart and steer down the lanes.",
      jeep: "Drive the open jeep along the road. Shift for full speed; steer gently on bends.",
      glider: "Stand by the wing on the ridge, press F, then walk forward to take off. Rising air over the slopes lifts you; Shift dives. Land on open ground.",
      boat: "Step into the boat at the shore and paddle. You can only get off close to land.",
      sled: "Press F at the sled rack: you start from the top of the dune and slide down. Steer left and right.",
      rickshaw: "Pedal the cycle rickshaw round the square.",
      elephant: "Climb into the howdah at the trek station. Elephants walk slowly through the forest.",
    },
  },
  zh: {
    ask: "问问向导", worlds: "3D世界指南",
    intro: "选择一个世界，查看主要地点、每种坐骑在哪里，以及那里生活着哪些动物。图片均来自游戏内。",
    howTitle: "玩法",
    how: [
      ["W A S D", "行走 · Shift 奔跑 · 拖动鼠标环顾"],
      ["E", "了解附近的金色信标或带 ⓘ 的动物"],
      ["F", "上下坐骑（找青绿色的坐骑图标）"],
      ["地图", "小地图上的青绿色图标标出了坐骑的位置"],
    ],
    rides: "这个世界的坐骑", places: "地点", animals: "动物", shops: "商店",
    go: "前往", here: "在这里可以发现", rideAt: "位于",
    kinds: {
      camel: "走到备好鞍的骆驼旁按 F。骆驼走得慢，但能爬上沙丘。",
      horse: "在备好鞍的马旁按 F，按住 Shift 可以疾驰。",
      yak: "牦牛在崎岖地面上很稳。在备好鞍的牦牛旁按 F。",
      cart: "坐上毛驴车，沿着小巷驾驶。",
      jeep: "沿公路驾驶敞篷吉普车。Shift 全速；转弯时轻打方向。",
      glider: "站在山脊上的伞翼旁按 F，然后向前走即可起飞。山坡上的上升气流会把你托起，Shift 加速下降。请降落在空地上。",
      boat: "在岸边上船划行，只有靠近陆地时才能下船。",
      sled: "在滑沙架旁按 F：从沙丘顶出发往下滑，左右控制方向。",
      rickshaw: "骑着人力三轮车绕广场转转。",
      elephant: "在骑象站爬进象轿，大象会慢慢穿过森林。",
    },
  },
};

const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const loc = (v, lang) => (!v ? "" : typeof v === "string" ? v : v[lang] || v.en || "");

const iconCache = {};
function rideIconUrl(kind) {
  if (!iconCache[kind]) {
    const c = document.createElement("canvas");
    c.width = c.height = 48;
    const g = c.getContext("2d");
    g.scale(2.6, 2.6);
    drawRideIcon(g, kind, 9.2, 9.2);
    iconCache[kind] = c.toDataURL();
  }
  return iconCache[kind];
}

export class WorldGuide {
  constructor({ root, getLang, onGo, onOpenCard }) {
    this.root = root;
    this.getLang = getLang;
    this.onGo = onGo;
    this.onOpenCard = onOpenCard;
    this.world = "kathmandu";
    root.addEventListener("click", (e) => {
      const w = e.target.closest("[data-wg-world]");
      if (w) { this.world = w.dataset.wgWorld; this.render(); this.root.scrollTop = 0; return; }
      const go = e.target.closest("[data-wg-go]");
      if (go) { this.onGo(go.dataset.wgWorld2 || this.world, go.dataset.wgGo); return; }
      const card = e.target.closest("[data-wg-card]");
      if (card) this.onOpenCard(card.dataset.wgCard);
    });
  }
  setWorld(id) { if (WORLD_GUIDE[id]) this.world = id; }
  render() {
    const lang = this.getLang();
    const t = T[lang] || T.en;
    if (!WORLD_GUIDE[this.world]) this.world = ORDER.find((id) => WORLD_GUIDE[id]) || this.world;
    const G = WORLD_GUIDE[this.world];
    if (!G) { this.root.innerHTML = `<p class="wg-intro">${esc(t.intro)}</p>`; return; }
    const name = (id) => loc(WORLDS[id]?.names, lang) || id;
    const cardName = (id) => loc(OBJECT_MAP[id]?.names, lang) || id;
    const placeName = (p) => (lang === "zh" && p.zh ? p.zh : p.n);
    const chip = (id) => {
      const img = OBJECT_IMAGES[id];
      return `<button type="button" class="wg-chip" data-wg-card="${esc(id)}">${img ? `<img src="${esc(img.src)}" alt="" loading="lazy">` : ""}<span>${esc(cardName(id))}</span></button>`;
    };
    const rideLine = (r) => `<div class="wg-ride">
        <img class="wg-ride-icon" src="${rideIconUrl(r.kind)}" alt="">
        <div class="wg-ride-body"><strong>${esc(loc(r.label, lang))}</strong>
          <small>${esc(t.rideAt)} ${esc(placeName(G.places.find((p) => p.key === r.place) || { n: r.place }))}</small>
          <p>${esc(t.kinds[r.kind] || "")}</p></div>
        <button type="button" class="ex-button ex-button--gold wg-go" data-wg-go="${esc(r.place)}" data-wg-ride="1">${esc(t.go)}</button>
      </div>`;
    const placeCard = (p) => `<article class="wg-place">
        <figure><img src="${esc(p.img)}" alt="${esc(placeName(p))}" loading="lazy"></figure>
        <div class="wg-place-body">
          <h3>${esc(placeName(p))}${lang !== "zh" && p.zh ? ` <small>${esc(p.zh)}</small>` : ""}</h3>
          ${p.rides.length ? `<div class="wg-place-rides">${p.rides.map((r) => `<span class="wg-tag"><img src="${rideIconUrl(r.kind)}" alt="">${esc(loc(r.label, lang))}</span>`).join("")}</div>` : ""}
          ${p.items.length ? `<p class="wg-here">${esc(t.here)}</p><div class="wg-chips">${p.items.map(chip).join("")}</div>` : ""}
          <button type="button" class="ex-button ex-button--gold wg-go" data-wg-go="${esc(p.key)}">${esc(t.go)} →</button>
        </div>
      </article>`;
    this.root.innerHTML = `
      <p class="wg-intro">${esc(t.intro)}</p>
      <div class="wg-worlds" role="tablist">${ORDER.filter((id) => WORLD_GUIDE[id]).map((id) => `<button type="button" role="tab" class="wg-world ${id === this.world ? "is-active" : ""}" aria-selected="${id === this.world}" data-wg-world="${id}">${esc(name(id))}</button>`).join("")}</div>
      <section class="wg-how"><h2>${esc(t.howTitle)}</h2><ul>${t.how.map(([k, v]) => `<li><kbd>${esc(k)}</kbd><span>${esc(v)}</span></li>`).join("")}</ul></section>
      <section><h2>${esc(t.rides)}</h2>${G.rides.map(rideLine).join("")}</section>
      ${G.shops.length ? `<section><h2>${esc(t.shops)}</h2><div class="wg-chips">${G.shops.map(chip).join("")}</div></section>` : ""}
      <section><h2>${esc(t.animals)}</h2><div class="wg-chips">${G.animals.map(chip).join("")}</div></section>
       <section><h2>${esc(t.places)}</h2><div class="wg-places">${G.places.map(placeCard).join("")}</div></section>`;
    this.root.querySelectorAll("img").forEach((img) => {
      img.addEventListener("error", () => {
        // Never leave the browser's broken-image glyph in the guide.
        img.hidden = true;
      }, { once: true });
    });
  }
  static tabs(lang) { return T[lang] || T.en; }
}
