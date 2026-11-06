/* Lightweight English/Chinese switcher for the main journal.
   It translates the editorial interface and the seeded story/destination
   metadata. Story bodies stay in their original language. */
(function () {
  "use strict";

  const ZH = {
    "3D Explorer": "3D 探索器",
    Stories: "故事",
    Destinations: "目的地",
    About: "关于",
    Contact: "联系",
    "Search the journal": "搜索日志",
    Write: "写作",
    "Sign in": "登录",
    "Join the journal": "加入日志",
    "Open menu": "打开菜单",
    "Close menu": "关闭菜单",
    "Browse by thread": "按主题浏览",
    "Already a member?": "已经是会员？",
    "Nepal · Pakistan · China": "尼泊尔 · 巴基斯坦 · 中国",
    "Nepal · Pakistan · China.": "尼泊尔 · 巴基斯坦 · 中国。",
    "A field journal from the roof of the world": "来自世界屋脊的田野日志",
    "Three countries.": "三个国家。",
    "One journey of discovery.": "一段发现之旅。",
    "Explore the traditions, stories, architecture and everyday life of Nepal, Pakistan and China through an interactive 3D cultural adventure.":
      "通过互动式 3D 文化旅程，探索尼泊尔、巴基斯坦与中国的传统、故事、建筑和日常生活。",
    "Start your journey": "开始旅程",
    "Read the field journal": "阅读田野日志",
    "Scroll to wander": "向下滚动漫游",
    "Field note — 04": "田野笔记 04",
    "Hunza Valley, spring": "罕萨山谷，春天",
    "The valley is a garden when the apricots bloom — and a lesson in patience for the other eleven months.":
      "杏花盛开时，山谷是一座花园；其余十一个月，则是一堂关于耐心的课。",
    "The editorial promise": "编辑承诺",
    "Travel is a way of paying attention.": "旅行是一种专注的方式。",
    "We are not here to collect places. We are here to notice them — the carved window above a doorway, the shape of a folded dumpling, the conversation that begins when the bus stops for tea.":
      "我们不是来收集地点的。我们来注意它们：门楣上方的雕花窗、一只饺子的形状、巴士停下喝茶时开始的对话。",
    "Himalaya Connect is a community journal across Nepal, Pakistan and China's mountain regions. Every story is rooted in a real place, written with care, and edited for accuracy rather than spectacle.":
      "Himalaya Connect 是一份横跨尼泊尔、巴基斯坦和中国山区的社区日志。每个故事都扎根于真实地点，用心书写，并以准确而非猎奇为编辑原则。",
    "How we work": "我们如何工作",
    "Field stories": "田野故事",
    "Contributors": "撰稿人",
    "Selected field notes": "精选田野笔记",
    "Stories worth slowing down for": "值得慢下来的故事",
    "All stories": "所有故事",
    "China focus": "中国聚焦",
    "Tea forests, desert water and the Silk Road": "茶林、沙漠之水与丝绸之路",
    "More from China": "更多中国故事",
    "From the tea mountains of Yunnan to the karez-watered fields of Turpan and the painted caves of Dunhuang, these are working landscapes, not backdrops.":
      "从云南的茶山到吐鲁番坎儿井灌溉的田野，再到敦煌的壁画洞窟，这些都是正在生活与劳作的土地，而不只是背景。",
    "Go deeper": "深入探索",
    "All destinations": "所有目的地",
    "Enter the place": "进入此地",
    "A note from the editors": "编辑手记",
    "The opposite of a tourist is not a local. It is someone who is paying attention.":
      "游客的反面不是本地人，而是愿意专注观察的人。",
    "We look for the specific detail rather than the sweeping claim. We name what we do not know. We credit the people who make things, and we leave room for a place to be more complicated than a postcard.":
      "我们寻找具体细节，而不是笼统断言。我们承认未知，尊重创造者，并为一个地方保留比明信片更复杂的空间。",
    "Rooted in place": "扎根地方",
    "Edited with care": "用心编辑",
    "Free to read": "免费阅读",
    "Fresh from the field": "来自田野的最新消息",
    "Latest dispatches": "最新报道",
    "Browse every story": "浏览所有故事",
    "The Sunday field note": "周日田野笔记",
    "One story.": "一个故事。",
    "One quiet moment.": "一段安静时光。",
    "A considered letter from the mountains, delivered once a week. Photographs, practical details and a thought worth keeping.":
      "一封来自山间的用心来信，每周送达。照片、实用细节，以及值得留下的思考。",
    "Your email address": "你的电子邮箱",
    "Join the letter": "加入订阅",
    "No advertising. No noise. Unsubscribe any time.": "没有广告，没有噪音，随时可以退订。",
    "Today's cultural encounter": "今日文化相遇",
    "A meal that changes with the season": "随季节变化的一餐",
    "Your journey": "你的旅程",
    "Curious traveller": "好奇的旅人",
    "Collection preview": "收藏预览",
    "All": "全部",
    "Recent discoveries": "最近发现",
    "Your first discovery will appear here. Start with a glowing beacon in Kathmandu.":
      "你的第一项发现会出现在这里。从加德满都的发光标记开始吧。",
    "One considered story, a photograph and a practical detail. No noise, once a week.":
      "一个用心的故事、一张照片和一个实用细节。没有噪音，每周一次。",
    "By joining you agree to receive our weekly letter. Unsubscribe any time.":
      "加入即表示你同意接收我们的每周来信，随时可以退订。",
    "Read": "阅读",
    "Threads": "主题",
    "Community": "社区",
    "3D cultural explorer": "3D 文化探索器",
    "Most loved": "最受欢迎",
    "About the journal": "关于日志",
    "Field notes": "田野笔记",
    "Become a writer": "成为作者",
    "Say hello": "联系我们",
    "Member sign in": "会员登录",
    "Account settings": "账户设置",
    "A field journal and interactive 3D cultural explorer for people who travel slowly, ask better questions, and listen for the story between the peaks.":
      "一份面向慢旅行者、愿意提出更好问题并倾听山峰之间故事的田野日志与互动式 3D 文化探索器。",
    "Start the 3D journey": "开始 3D 旅程",
    "Written from Kathmandu · Hunza · Kashgar": "写于加德满都 · 罕萨 · 喀什",
    "Editorial ethics": "编辑伦理",
    "Corrections": "更正",
    "Photography via Wikimedia Commons": "图片来自 Wikimedia Commons",
    "credits": "版权说明",
    "Read more": "阅读更多",
    "Field note": "田野笔记",
    "All field notes": "所有田野笔记",
    "Back to stories": "返回故事",
    "Nepal": "尼泊尔",
    "Pakistan": "巴基斯坦",
    "China": "中国",
    "Heritage": "遗产",
    "Food": "食物",
    "Craft": "工艺",
    "Landscapes": "风景",
    "People": "人物",
    "Culture": "文化",
    "Kathmandu Valley": "加德满都谷地",
    "Hunza Valley": "罕萨山谷",
    "Kashgar": "喀什",
    "Karakoram Route": "喀喇昆仑之路",
    "Dunhuang": "敦煌",
    "Turpan": "吐鲁番",
    "Pu'er": "普洱",
    "Xishuangbanna": "西双版纳",
    "Pokhara": "博卡拉",
    "Skardu": "斯卡杜",
    "Kathmandu": "加德满都",
    "Hunza": "罕萨",
    "Karakoram": "喀喇昆仑",
    "Bhaktapur": "巴克塔普尔",
    "Attabad Lake": "阿塔巴德湖",
    "0 min read": "0 分钟阅读",
    "1 min read": "1 分钟阅读",
    "2 min read": "2 分钟阅读",
    "3 min read": "3 分钟阅读",
    "4 min read": "4 分钟阅读",
    "5 min read": "5 分钟阅读",
    "6 min read": "6 分钟阅读",
    "7 min read": "7 分钟阅读",
    "8 min read": "8 分钟阅读",
    "9 min read": "9 分钟阅读",
    "10 min read": "10 分钟阅读",
    "11 min read": "11 分钟阅读",
    "12 min read": "12 分钟阅读",
    "13 min read": "13 分钟阅读",
    "14 min read": "14 分钟阅读",
    "15 min read": "15 分钟阅读",
  };

  const POST_ZH = {
    "when-a-lake-arrives-without-asking": {
      title: "当湖泊不请自来",
      excerpt: "阿塔巴德湖美丽而复杂。水面之下，是流离失所、修路与山地风险的历史。",
    },
    "a-city-is-a-courtyard-you-can-walk-through": {
      title: "城市是一座可以穿行的庭院",
      excerpt: "在喀什老城，街道是一间共享的房间。家的建筑，也是邻里的建筑。",
    },
    "kashgar-before-the-bazaar-wakes": {
      title: "喀什：巴扎醒来之前",
      excerpt: "卷帘门升起之前，喀什的巴扎是一组声音：扫帚、推车、水壶，以及门洞里的一场对话。",
    },
    "the-road-that-made-neighbours": {
      title: "一条让邻里相遇的路",
      excerpt: "喀喇昆仑公路是一项工程，也是一条家庭之路；它提醒我们，山地旅行从来不只是风景。",
    },
    "the-bridge-is-a-neighbour": {
      title: "桥也是邻居",
      excerpt: "一座著名的桥也是当地的基础设施。走过它的人，不是风景的一部分。",
    },
    "a-fort-is-a-conversation-with-time": {
      title: "城堡是与时间的对话",
      excerpt: "卡里马巴德上方的巴尔蒂特堡不只是过去的纪念碑，也是修缮、再利用与让建筑继续活着的记录。",
    },
    "a-river-made-the-valley": {
      title: "河流造就了山谷",
      excerpt: "印度河是斯卡杜田野、道路与聚落背后的安静力量。山谷首先是一个河流故事。",
    },
    "a-lake-with-a-working-shore": {
      title: "有工作岸线的湖",
      excerpt: "费瓦湖既是风景，也是工作场所和通往寺庙的路。最好的旅行会给这三者都留出空间。",
    },
    "the-apricot-tree-keeps-the-calendar": {
      title: "杏树记着日历",
      excerpt: "花开、结果、晾晒与冬藏：在罕萨，杏树是一种标记时间的方式。",
    },
    "the-door-is-a-greeting": {
      title: "门是一种问候",
      excerpt: "在喀什老城，门洞是街道与家之间的门槛。读懂它，意味着记得门后住着人。",
    },
    "paper-from-the-mountain": {
      title: "山中的纸，匠人的耐心",
      excerpt: "洛塔纸始于树皮、水和漫长的等待。成品记得制作它的那双手。",
    },
    "bhaktapur-before-the-crowds": {
      title: "人潮之前的巴克塔普尔",
      excerpt: "旅行团到来之前，老城最像自己：一把扫帚、一只水壶、一扇卷帘门，以及正在醒来的广场。",
    },
    "morning-above-the-clouds": {
      title: "云上之晨",
      excerpt: "在罕萨，山不是背景。它决定你何时醒来、往哪里走，以及每一个计划的尺度。",
    },
    "water-is-a-blessing": {
      title: "水是祝福，不是肆意泼洒",
      excerpt: "傣历新年里，水是祝福。节日是社区庆典，不是向陌生人泼水的许可证。",
    },
    "momo-is-a-shape-not-a-recipe": {
      title: "馍馍是形状，不是配方",
      excerpt: "一盘馍馍里有比食谱更多的争论：馅料、褶法、蘸酱，以及一间厨房的记忆。",
    },
    "dunhuang-where-the-desert-keeps-the-silk-road": {
      title: "沙漠守护丝绸之路的地方",
      excerpt: "在敦煌，丝绸之路不只是地图上的路线。它是壁画洞窟、一弯湖水，以及天黑后仍在营业的市场。",
    },
    "dunhuang-after-the-last-bus": {
      title: "最后一班车之后的敦煌",
      excerpt: "洞窟关闭、沙丘空下来后，敦煌重新成为一座工作的小城：面条、杏干和灯光下的市场。",
    },
    "the-window-that-learned-to-hold-a-city": {
      title: "学会容纳一座城市的窗",
      excerpt: "在巴克塔普尔，雕花孔雀窗不是遗物。它教会我们，一座城市如何让记忆继续被使用。",
    },
    "the-tea-forest-is-a-garden": {
      title: "茶林是一座有记忆的花园",
      excerpt: "在景迈山，古茶树生长在森林树冠之下。这座花园也是一个社区的档案。",
    },
    "turpan-water-is-a-promise": {
      title: "吐鲁番：水是一种承诺",
      excerpt: "在海平面以下的盆地，坎儿井把远山的水变成花园、葡萄园和一座城市。",
    },
  };

  const DEST_ZH = {
    "kathmandu-valley": { name: "加德满都谷地", tagline: "庭院、木雕与活态纽瓦丽遗产。" },
    "hunza-valley": { name: "罕萨山谷", tagline: "喀喇昆仑山下的石砌村落。" },
    kashgar: { name: "喀什", tagline: "工艺、贸易与悠长记忆的绿洲城市。" },
    "karakoram-route": { name: "喀喇昆仑之路", tagline: "高山垭口、共同历史与穿山公路。" },
    dunhuang: { name: "敦煌", tagline: "壁画洞窟、鸣沙山与丝路绿洲。" },
    turpan: { name: "吐鲁番", tagline: "坎儿井、葡萄与古老丝路街巷的沙漠盆地。" },
    puer: { name: "普洱", tagline: "茶山、古茶林与茶马古道。" },
    "pu'er": { name: "普洱", tagline: "茶山、古茶林与茶马古道。" },
    xishuangbanna: { name: "西双版纳", tagline: "傣族佛寺、雨林与澜沧江上游。" },
    pokhara: { name: "博卡拉", tagline: "安纳普尔纳山下的湖畔城市。" },
    skardu: { name: "斯卡杜", tagline: "喀喀喇昆仑边缘的高原沙漠谷地。" },
  };

  const STORAGE_KEY = "hc-site-lang";
  let records = [];
  let placeholders = [];

  function collect(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest("script, style, noscript, [data-site-lang]")) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    let node;
    while ((node = walker.nextNode())) records.push({ node, text: node.nodeValue });
    document.querySelectorAll("input[placeholder]").forEach((input) => {
      placeholders.push({ input, text: input.placeholder });
    });
  }

  function translated(key, lang) {
    if (lang !== "zh") return key;
    if (ZH[key]) return ZH[key];
    const match = key.match(/^(\d+)\s+min read$/);
    if (match) return `${match[1]} 分钟阅读`;
    const proof = key.match(/^(\d+)\s+3D worlds\s+·\s+(\d+)\s+cultural discoveries\s+·\s+(\d+)\s+independent voices\.$/);
    if (proof) return `${proof[1]} 个 3D 世界 · ${proof[2]} 项文化发现 · ${proof[3]} 位独立作者。`;
    const places = key.match(/^(\d+)\s+places,\s+(\d+)\s+ways in$/);
    if (places) return `${places[1]} 个地方，${places[2]} 种进入方式`;
    return key;
  }

  function apply(lang) {
    const chinese = lang === "zh";
    records.forEach(({ node, text }) => {
      const leading = text.match(/^\s*/)[0];
      const trailing = text.match(/\s*$/)[0];
      node.nodeValue = leading + translated(text.trim(), chinese ? "zh" : "en") + trailing;
    });
    placeholders.forEach(({ input, text }) => {
      input.placeholder = chinese && ZH[text] ? ZH[text] : text;
    });

    document.querySelectorAll("[data-post-slug]").forEach((card) => {
      const item = POST_ZH[card.dataset.postSlug];
      if (!item) return;
      const title = card.querySelector("h3 a");
      const excerpt = card.querySelector(".story-card-body > p");
      const media = card.querySelector(".story-card-media");
      if (title && !title.dataset.en) title.dataset.en = title.textContent;
      if (excerpt && !excerpt.dataset.en) excerpt.dataset.en = excerpt.textContent;
      if (title) title.textContent = chinese ? item.title : title.dataset.en;
      if (excerpt) excerpt.textContent = chinese ? item.excerpt : excerpt.dataset.en;
      if (media) {
        if (!media.dataset.enAria) media.dataset.enAria = media.getAttribute("aria-label") || "";
        media.setAttribute("aria-label", chinese ? `阅读：${item.title}` : media.dataset.enAria);
      }
    });

    document.querySelectorAll("[data-destination-slug]").forEach((card) => {
      const item = DEST_ZH[card.dataset.destinationSlug];
      if (!item) return;
      const title = card.querySelector("h3");
      const tagline = card.querySelector(".destination-card-content p");
      if (title && !title.dataset.en) title.dataset.en = title.textContent;
      if (tagline && !tagline.dataset.en) tagline.dataset.en = tagline.textContent;
      if (title) title.textContent = chinese ? item.name : title.dataset.en;
      if (tagline) tagline.textContent = chinese ? item.tagline : tagline.dataset.en;
    });

    document.querySelectorAll("[data-site-lang]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.siteLang === lang);
      button.setAttribute("aria-pressed", String(button.dataset.siteLang === lang));
    });
    document.documentElement.lang = chinese ? "zh-Hans" : "en";
    document.documentElement.dir = "ltr";
  }

  function setLanguage(lang) {
    const next = lang === "zh" ? "zh" : "en";
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      /* ignore storage failures */
    }
    apply(next);
  }

  document.addEventListener("DOMContentLoaded", () => {
    collect(document.body);
    document.querySelectorAll("[data-site-lang]").forEach((button) => {
      button.addEventListener("click", () => setLanguage(button.dataset.siteLang));
    });
    let stored = "en";
    try {
      stored = window.localStorage.getItem(STORAGE_KEY) || "en";
    } catch (error) {
      stored = "en";
    }
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("lang");
    apply(requested === "zh" || requested === "en" ? requested : stored);
  });
})();
