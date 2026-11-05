import { BRIDGES, CARD_MAP, OBJECT_MAP, WORLDS } from "./data.js";
import { icon } from "./icons.js";

const WELCOME = {
  en: "I'm the demo cultural guide. I can explain an object you open, compare traditions, or help with respectful etiquette. This prototype uses a curated knowledge base — it is not a live model.",
  zh: "我是演示版文化向导。我可以解释你打开的物件、比较传统，或提供尊重的礼仪建议。本原型使用精选知识库，并非实时模型。",
  ne: "म प्रदर्शन सांस्कृतिक मार्गदर्शक हुँ। तपाईंले खोल्नुभएको वस्तु व्याख्या गर्न, परम्परा तुलना गर्न वा शिष्टाचारमा सहयोग गर्न सक्छु। यो प्रोटोटाइप छनोट ज्ञान आधार प्रयोग गर्छ, प्रत्यक्ष मोडेल होइन।",
  ur: "میں ڈیمو ثقافتی رہنما ہوں۔ میں آپ کی کھولی ہوئی شے کی وضاحت، روایات کا موازنہ یا باادب آداب میں مدد کر سکتا ہوں۔ یہ نمونہ منتخب معلومات استعمال کرتا ہے، براہ راست ماڈل نہیں۔",
};

const RESPONSES = {
  greeting: {
    en: "Namaste, assalamu alaikum and nǐ hǎo are all useful starts, but the setting matters. In Nepal, palms together with a slight bow is common. In Pakistan, a handshake is often offered between people of the same gender, while others prefer a verbal greeting. In China, a nod or a light handshake is common in professional settings. Follow the other person's cue and do not force physical contact.",
    zh: "“Namaste”“assalamu alaikum”和“nǐ hǎo”都是有用的开场，但场合很重要。在尼泊尔，双手合十并微微躬身很常见。在巴基斯坦，同性之间常会握手，也有人更喜欢口头问候。在中国，职场中点头或轻握手较常见。请跟随对方的示意，不要强行身体接触。",
    ne: "नमस्ते, अस्सलामु अलैकुम र नी हाओ — सबै राम्रा सुरुवात हुन्, तर सन्दर्भ महत्त्वपूर्ण छ। नेपालमा हात जोडेर हल्का निहुरिनु सामान्य छ। पाकिस्तानमा एउटै लिङ्गका व्यक्तिबीच हात मिलाउने चलन छ, कतिपयले मौखिक अभिवादन रुचाउँछन्। चीनमा व्यावसायिक सन्दर्भमा टाउको हल्लाउने वा हल्का हात मिलाउने चलन छ। अरूको सङ्केत पछ्याउनुहोस्, जबरजस्ती शारीरिक सम्पर्क नगर्नुहोस्।",
    ur: "نمستے، السلام علیکم اور نِی ہاوٴ سب اچھی شروعات ہیں، مگر سیاق و سباق اہم ہے۔ نیپال میں ہاتھ جوڑ کر ہلکا سا جھکنا عام ہے۔ پاکستان میں ہم جنس لوگوں کے درمیان مصافحہ عام ہے، جبکہ کچھ لوگ زبانی سلام کو ترجیح دیتے ہیں۔ چین میں پیشہ ورانہ ماحول میں سر ہلانا یا ہلکا مصافحہ عام ہے۔ دوسرے کے اشارے کی پیروی کریں، جسمانی رابطہ زبردستی نہ کریں۔",
  },
  sacred: {
    en: "Check the site's current rules before you arrive. Dress modestly, remove shoes where required, keep your voice low and ask before photographing worship. Some Hindu temples restrict non-Hindu entry; mosques may have separate prayer areas and times. A 'no' is a complete answer, and a sacred site is not a photo set.",
    zh: "到访前先确认场所的现行规定。穿着得体，按要求脱鞋，保持低声，拍摄宗教活动前先询问。部分印度教寺庙限制非印度教徒进入；清真寺可能有单独的礼拜区域与时间。“不可以”就是完整答案，宗教场所不是摄影棚。",
    ne: "पुग्नुअघि स्थलको हालको नियम जाँच्नुहोस्। शालीन पहिरन लगाउनुहोस्, आवश्यक भए जुत्ता फुकाल्नुहोस्, आवाज कम राख्नुहोस् र पूजाअर्चनाको फोटो खिच्नुअघि सोध्नुहोस्। केही हिन्दू मन्दिरमा गैर-हिन्दू प्रवेशमा रोक छ; मस्जिदमा छुट्टै प्रार्थना क्षेत्र र समय हुन सक्छ। 'हुँदैन' पूर्ण उत्तर हो; पवित्र स्थल फोटो स्टुडियो होइन।",
    ur: "جانے سے پہلے مقام کے موجودہ قواعد دیکھیں۔ شائستہ لباس پہنیں، جہاں ضروری ہو جوتے اتاریں، آواز مدھم رکھیں اور عبادت کی تصویر لینے سے پہلے اجازت مانگیں۔ کچھ ہندو مندروں میں غیر ہندوؤں کے داخلے پر پابندی ہے؛ مساجد میں الگ نماز کی جگہیں اور اوقات ہو سکتے ہیں۔ 'نہیں' مکمل جواب ہے؛ مقدس مقام فوٹو اسٹوڈیو نہیں۔",
  },
  photo: {
    en: "Ask before taking a portrait, accept no without negotiating, and don't use a long lens to get around a refusal. A yes for one photograph is not permission to publish it or to photograph children. At ceremonies and religious sites, follow signs and staff guidance.",
    zh: "拍摄肖像前先询问，对方拒绝就接受，不要用长焦镜头绕过拒绝。同意拍一张照片，不代表同意发布或拍摄儿童。在仪式和宗教场所，请遵守标识与工作人员指引。",
    ne: "पोर्ट्रेट खिच्नुअघि सोध्नुहोस्, 'हुँदैन' भने बिना वार्तालाप स्वीकार्नुहोस्, र अस्वीकारबाट बच्न लामो लेन्स प्रयोग नगर्नुहोस्। एउटा फोटोको स्वीकृति प्रकाशन वा बालबालिकाको फोटोको अनुमति होइन। समारोह र धार्मिक स्थलमा सङ्केत र कर्मचारीको निर्देशन पालना गर्नुहोस्।",
    ur: "پورٹریٹ لینے سے پہلے اجازت مانگیں، انکار کو بغیر بحث قبول کریں، اور انکار سے بچنے کے لیے لمبا لینس استعمال نہ کریں۔ ایک تصویر کی اجازت اشاعت یا بچوں کی تصویر کی اجازت نہیں۔ تقریبات اور مذہبی مقامات پر نشانات اور عملے کی ہدایت پر عمل کریں۔",
  },
  festivals: {
    en: "There are real resonances — reunion, food, gifts and decorated spaces — but don't flatten them into one origin story. Nepal's Dashain and Tihar, Pakistan's Eid traditions and China's Spring Festival have different histories and local forms. Ask what the festival means in this particular household, and remember that one invitation does not describe a whole country.",
    zh: "确实存在共鸣——团聚、食物、礼物与装饰空间——但不要把她们压成一个起源故事。尼泊尔的德赛节与排灯节、巴基斯坦的开斋节与古尔邦节传统、中国的春节各有不同历史和地方形式。请问问这个家庭如何理解节日，并记住一次邀请并不能代表整个国家。",
    ne: "पुनर्मिलन, खाना, उपहार र सजाइएका ठाउँ — यी साँच्चै साझा अनुभव हुन्, तर सबैलाई एउटै उत्पत्ति कथामा नमिलाउनुहोस्। नेपालको दशैं र तिहार, पाकिस्तानको ईद परम्परा र चीनको वसन्त चाडका फरक इतिहास र स्थानीय रूप छन्। यो परिवारका लागि चाडको अर्थ सोध्नुहोस्; एउटा निमन्त्रणाले पूरै देश वर्णन गर्दैन।",
    ur: "ملاپ، کھانا، تحائف اور سجے ہوئے مقامات — یہ حقیقی مماثلتیں ہیں، مگر انہیں ایک ہی اصل کی کہانی میں نہ سمیٹیں۔ نیپال کا دسہین اور تہوار، پاکستان کی عید روایات اور چین کا بہار میلہ مختلف تاریخیں اور مقامی شکلیں رکھتے ہیں۔ اس گھرانے میں تہوار کا مطلب پوچھیں؛ ایک دعوت پورے ملک کی نمائندگی نہیں کرتی۔",
  },
  recommend: {
    en: "A useful next stop is a tradition from another country in the same category. Comparing specific objects — a window with a door, a drum with a lute — is more honest than declaring whole cultures similar.",
    zh: "下一步可以看看另一个国家、同一类别的传统。把具体物件放在一起比较——窗户与门、鼓与琴——比宣称整个文化相似更诚实。",
    ne: "अर्को उपयोगी पाइला अर्को देशको एउटै वर्गको परम्परा हेर्नु हो। ठ्याक्कै वस्तु तुलना गर्नु — झ्याल र ढोका, मादल र बाजा — पूरै संस्कृति समान भन्नुभन्दा इमानदार हुन्छ।",
    ur: "اگلا مفید قدم کسی دوسرے ملک کی اسی زمرے کی روایت دیکھنا ہے۔ مخصوص اشیاء کا موازنہ — کھڑکی اور دروازہ، ڈھول اور ساز — پوری ثقافتوں کو ایک جیسا کہنے سے زیادہ ایماندار ہے۔",
  },
  englishNotice: {
    en: "",
    zh: "（以下对象比较的详细说明仍为英文原文，待社群审校。）",
    ne: "（तलको वस्तु तुलनाको विस्तृत विवरण अझै अंग्रेजीमा छ, समुदाय समीक्षाको प्रतीक्षामा।）",
    ur: "（نیچے اشیاء کے موازنے کی تفصیلی وضاحت انگریزی میں ہے، کمیونٹی کے جائزے کے منتظر。）",
  },
};

function localized(value, lang) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.en || "";
}

function categoryIn(lang, category) {
  const map = { architecture: ["architecture", "建筑", "वास्तुकला", "تعمیرات"], food: ["food", "食物", "खाना", "کھانا"], festivals: ["festivals", "节日", "चाडपर्व", "تہوار"], clothing: ["clothing", "服饰", "पहिरन", "لباس"], handicrafts: ["craft", "手工艺", "हस्तकला", "دستکاری"], music: ["music", "音乐", "संगीत", "موسیقی"], landmarks: ["landmark", "地标", "स्थल", "مقام"], traditions: ["tradition", "传统", "परम्परा", "روایت"] };
  return (map[category] || map.traditions)[{ en: 0, zh: 1, ne: 2, ur: 3 }[lang] || 0];
}

export class CulturalGuide {
  constructor({ store, t, aiConfigured, endpoint, csrfToken, elements, onOpenObject, onToast }) {
    this.store = store;
    this.t = t;
    this.lang = store.language;
    this.aiConfigured = Boolean(aiConfigured);
    this.endpoint = endpoint;
    this.csrfToken = csrfToken;
    this.onOpenObject = onOpenObject;
    this.onToast = onToast;
    this.elements = elements;
    this.messages = [];
    this.context = { worldId: null, objectId: null };
    this.busy = false;

    this.elements.form?.addEventListener("submit", (event) => {
      event.preventDefault();
      this.submit(this.elements.input.value);
    });
    this.elements.input?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        this.submit(this.elements.input.value);
      }
    });
    this.elements.clear?.addEventListener("click", () => this.clear());
    this.elements.suggestions?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-guide-prompt]");
      if (!button) return;
      this.submit(button.dataset.guidePrompt);
    });
    this.elements.log?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-guide-open-object]");
      if (button) this.onOpenObject?.(button.dataset.guideOpenObject);
    });

    this.updateModeUi();
    this.renderSuggestions();
    this.addMessage("assistant", WELCOME[this.lang] || WELCOME.en, { welcome: true });
  }

  updateModeUi() {
    const demo = !this.aiConfigured;
    if (this.elements.notice) {
      this.elements.notice.textContent = this.t(demo ? "guide.demoNotice" : "guide.liveNotice");
      this.elements.notice.classList.toggle("is-live", !demo);
    }
    if (this.elements.modeChip) {
      const label = this.elements.modeChip.querySelector("span:last-child");
      if (label) label.textContent = this.t(demo ? "guide.demo" : "guide.live");
    }
  }

  setLanguage(lang) {
    this.lang = lang;
    this.updateModeUi();
    this.renderSuggestions();
    this.updateContextUi();
    this.elements.log?.querySelectorAll(".chat-message").forEach((message) => {
      const label = message.querySelector(".message-label");
      if (label) {
        label.textContent = message.classList.contains("user")
          ? this.t("guide.you")
          : this.t("guide.assistant");
      }
    });
    if (this.messages.length === 1 && this.messages[0].welcome) {
      this.elements.log.innerHTML = "";
      this.messages = [];
      this.addMessage("assistant", WELCOME[lang] || WELCOME.en, { welcome: true });
    }
  }

  setContext({ worldId = null, objectId = null } = {}) {
    this.context = { worldId, objectId };
    this.updateContextUi();
    this.renderSuggestions();
  }

  updateContextUi() {
    if (!this.elements.contextCopy) return;
    const object = this.context.objectId ? OBJECT_MAP[this.context.objectId] : null;
    const world = this.context.worldId ? WORLDS[this.context.worldId] : null;
    if (object) {
      const category = categoryIn(this.lang, object.category);
      this.elements.contextCopy.textContent = `${localized(object.names, this.lang)} · ${category} · ${world ? localized(world.names, this.lang) : ""}`;
      return;
    }
    if (world) {
      this.elements.contextCopy.textContent = `${localized(world.names, this.lang)} · ${localized(world.region, this.lang)}`;
      return;
    }
    this.elements.contextCopy.textContent = this.t("guide.noContext");
  }

  renderSuggestions() {
    if (!this.elements.suggestions) return;
    const object = this.context.objectId ? OBJECT_MAP[this.context.objectId] : null;
    const prompts = [
      this.t(object ? "guide.askThisObject" : "guide.askGreeting"),
      this.t("guide.askArchitecture"),
      this.t("guide.askTemple"),
      this.t("guide.askFestival"),
      this.t("guide.askPhoto"),
    ];
    this.elements.suggestions.innerHTML = prompts
      .map((prompt) => `<button type="button" class="guide-suggestion" data-guide-prompt="${this.escapeAttr(prompt)}">${this.escape(prompt)}</button>`)
      .join("");
  }

  submit(raw) {
    const text = String(raw || "").trim();
    if (!text || this.busy) return;
    this.elements.input.value = "";
    this.addMessage("user", text);
    if (this.aiConfigured) {
      this.askLive(text);
    } else {
      this.answerDemo(text);
    }
  }

  addMessage(role, content, options = {}) {
    const message = { role, content, ...options };
    this.messages.push(message);
    const wrapper = document.createElement("div");
    wrapper.className = `chat-message ${role}`;
    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = role === "user" ? this.t("guide.you") : this.t("guide.assistant");
    wrapper.appendChild(label);
    const body = document.createElement("div");
    String(content)
      .split(/\n{2,}/)
      .filter(Boolean)
      .forEach((paragraph) => {
        const p = document.createElement("p");
        p.textContent = paragraph;
        body.appendChild(p);
      });
    wrapper.appendChild(body);
    if (options.relatedId && CARD_MAP[options.relatedId]) {
      const card = CARD_MAP[options.relatedId];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chat-source";
      button.dataset.guideOpenObject = options.relatedId;
      button.innerHTML = `${icon("compass")} ${this.escape(localized(card.names, this.lang))}`;
      wrapper.appendChild(button);
    }
    this.elements.log.appendChild(wrapper);
    this.elements.log.scrollTop = this.elements.log.scrollHeight;
    return wrapper;
  }

  addTyping() {
    const typing = document.createElement("div");
    typing.className = "chat-typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    typing.setAttribute("aria-label", this.t("guide.typing"));
    this.elements.log.appendChild(typing);
    this.elements.log.scrollTop = this.elements.log.scrollHeight;
    return typing;
  }

  async askLive(text) {
    this.busy = true;
    this.elements.send.disabled = true;
    const typing = this.addTyping();
    try {
      const object = this.context.objectId ? OBJECT_MAP[this.context.objectId] : null;
      const world = this.context.worldId ? WORLDS[this.context.worldId] : null;
      const context = [
        world ? `World: ${world.names.en} (${world.region.en})` : "",
        object ? `Selected object: ${object.names.en}. ${object.summary.en}` : "",
        "The 3D scene is a stylised educational reconstruction.",
      ]
        .filter(Boolean)
        .join(" ");
      const history = this.messages
        .slice(0, -1)
        .filter((message) => !message.welcome)
        .slice(-6)
        .map((message) => ({ role: message.role, content: message.content }));
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": this.csrfToken,
        },
        body: JSON.stringify({
          message: text,
          language: this.lang,
          context,
          history,
        }),
      });
      const data = await response.json().catch(() => ({}));
      typing.remove();
      if (!response.ok || data.mode !== "live" || !data.reply) {
        this.aiConfigured = false;
        this.updateModeUi();
        this.answerDemo(text, { afterLiveFailure: true });
        return;
      }
      this.addMessage("assistant", data.reply);
    } catch (error) {
      typing.remove();
      this.aiConfigured = false;
      this.updateModeUi();
      this.answerDemo(text, { afterLiveFailure: true });
      this.onToast?.(this.t("guide.error"));
    } finally {
      this.busy = false;
      this.elements.send.disabled = false;
    }
  }

  answerDemo(text, options = {}) {
    this.busy = true;
    this.elements.send.disabled = true;
    const typing = this.addTyping();
    window.setTimeout(() => {
      typing.remove();
      const reply = this.buildDemoReply(text);
      this.addMessage("assistant", reply.content, { relatedId: reply.relatedId });
      this.busy = false;
      this.elements.send.disabled = false;
      if (options.afterLiveFailure) {
        this.addMessage("assistant", this.lang === "en" ? "The live service is unavailable, so I've switched to the curated demo knowledge base." : this.t("guide.demoNotice"));
      }
    }, this.store.state.settings.reducedMotion ? 50 : 520);
  }

  buildDemoReply(text) {
    const query = text.toLowerCase();
    const object = this.context.objectId ? OBJECT_MAP[this.context.objectId] : null;
    const lang = this.lang;
    const notice = RESPONSES.englishNotice[lang] || "";

    if (/(hello|hi\b|greet|namaste|namaskar|salaam|سلام|नमस्ते|你好|您好)/i.test(query)) {
      return { content: RESPONSES.greeting[lang] || RESPONSES.greeting.en };
    }
    if (/(temple|mosque|shrine|worship|mandir|masjid|寺|庙|मन्दिर|मस्जिद|مسجد|مندر)/i.test(query)) {
      return { content: RESPONSES.sacred[lang] || RESPONSES.sacred.en };
    }
    if (/(photo|photograph|camera|picture|selfie|拍照|摄影|фото|फोटो|तस्बिर|تصویر|کیمرہ)/i.test(query)) {
      return { content: RESPONSES.photo[lang] || RESPONSES.photo.en };
    }
    if (/(festival|eid|dashain|tihar|spring festival|new year|节日|春节|चाड|दशैं|तिहार|تہوار|عید)/i.test(query)) {
      return { content: RESPONSES.festivals[lang] || RESPONSES.festivals.en };
    }
    if (/(architect|window|door|building|temple style|建筑|门窗|वास्तु|झ्याल|تعمیر|دروازہ)/i.test(query)) {
      return this.comparisonReply(object, notice, lang);
    }
    if (/(compare|difference|similar|truck art|比较|对比|तुलना|موازنہ|فرق)/i.test(query)) {
      if (/truck art/i.test(query)) {
        const card = CARD_MAP["extra-truck-art"];
        return {
          content: `${localized(card.summary, lang)}\n\n${card.story}`,
          relatedId: "extra-truck-art",
        };
      }
      return this.comparisonReply(object, notice, lang);
    }
    if (/(recommend|next|what else|推荐|सिफारिस|تجویز)/i.test(query)) {
      const related = this.findRelated(object);
      return {
        content: `${RESPONSES.recommend[lang] || RESPONSES.recommend.en}${related ? `\n\n${localized(related.names, lang)} — ${localized(related.summary, lang)}` : ""}`,
        relatedId: related?.id,
      };
    }
    if (object) {
      const summary = localized(object.summary, lang);
      const fact = lang === "en" ? `\n\n${object.fact}` : `\n\n${notice}`;
      return {
        content: `${localized(object.names, lang)} — ${categoryIn(lang, object.category)}. ${summary}${fact}`,
        relatedId: this.findRelated(object)?.id,
      };
    }
    return {
      content: `${WELCOME[lang] || WELCOME.en}\n\n${RESPONSES.recommend[lang] || RESPONSES.recommend.en}`,
    };
  }

  comparisonReply(object, notice, lang) {
    let bridge = BRIDGES.find((item) => item.a === object?.id || item.b === object?.id);
    if (!bridge) bridge = BRIDGES[0];
    const cardA = CARD_MAP[bridge.a];
    const cardB = CARD_MAP[bridge.b];
    const title = localized(bridge.title, lang);
    const comparison = `${title}: ${cardA.names.en} and ${cardB.names.en}. ${bridge.explanation}`;
    return {
      content: `${comparison}${notice ? `\n\n${notice}` : ""}`,
      relatedId: bridge.rewardCard,
    };
  }

  findRelated(object) {
    if (object) {
      const sameCategory = Object.values(OBJECT_MAP).find(
        (candidate) =>
          candidate.category === object.category &&
          candidate.countryId !== object.countryId
      );
      if (sameCategory) return sameCategory;
    }
    const fallback = Object.values(OBJECT_MAP).find((candidate) => candidate.countryId !== "nepal");
    return fallback || null;
  }

  clear() {
    this.messages = [];
    this.elements.log.innerHTML = "";
    this.addMessage("assistant", WELCOME[this.lang] || WELCOME.en, { welcome: true });
  }

  escape(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  escapeAttr(value) {
    return this.escape(value).replaceAll("'", "&#39;");
  }
}
