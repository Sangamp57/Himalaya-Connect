/* Animals of the walkable worlds: one text per species, registered per world
   as discovery cards in the "wildlife" category (ids: an-<world>-<species>).
   The 3D animals carry a floating ⓘ badge that opens the card. */

const B = (slug, label) => ({ label: `Britannica · ${label}`, url: `https://www.britannica.com/animal/${slug}` });
const q = (qq, options, answer, explain) => ({ q: qq, options, answer, explain });

export const SPECIES = {
  camel: {
    rarity: "epic",
    names: { en: "Bactrian camel", zh: "双峰驼", ne: "दुई कुम्मे ऊँट", ur: "دو کوہان والا اونٹ" },
    local: "双峰驼 · shuāngfēng tuó",
    summary: {
      en: "The two-humped camel that carried the Silk Road across the Gobi and Taklamakan.",
      zh: "曾驮着丝绸之路穿越戈壁与塔克拉玛干的双峰骆驼。",
      ne: "गोबी र टाक्लामाकान पार गर्दै रेशम मार्ग बोक्ने दुई कुम्मे ऊँट।",
      ur: "دو کوہان والا اونٹ جو صحرائے گوبی اور تکلامکان سے شاہراہِ ریشم کا سامان لے جاتا تھا۔",
    },
    story: {
      en: "Bactrian camels store fat, not water, in their two humps, and can drink more than a hundred litres in a few minutes after a long crossing. Thick winter wool lets them survive desert nights far below freezing; in spring they shed it in great clumps that herders spin into rope and felt.\n\nFor centuries caravans of these camels linked oasis towns such as Dunhuang, Turpan and Kashgar. Today most work with herders and in tourism – the camel rides on the Mingsha dunes are famous – while the truly wild Bactrian camel survives in only a few remote parts of the Gobi and is critically endangered.",
      zh: "双峰驼的驼峰里储存的是脂肪而不是水；长途跋涉之后，它们几分钟就能喝下一百多升水。厚厚的冬毛让它们熬过零下几十度的沙漠夜晚，春天大块脱落的驼毛被牧民纺成绳子、擀成毡。\n\n几百年来，驼队把敦煌、吐鲁番、喀什这些绿洲城镇连在一起。如今大多数骆驼在牧区劳作或服务旅游——鸣沙山骑骆驼十分有名；而真正的野双峰驼只在戈壁深处少数地方残存，属于极度濒危物种。",
    },
    fact: { en: "The wild Bactrian camel is a separate species from the domestic one and is critically endangered.", zh: "野双峰驼与家养双峰驼是不同的物种，属于极度濒危。" },
    quiz: {
      en: q("What does a Bactrian camel store in its humps?", ["Fat", "Water", "Air", "Milk"], 0, "The humps hold fat that the camel can use as energy when food is scarce."),
      zh: q("双峰驼的驼峰里储存的是什么？", ["脂肪", "水", "空气", "奶"], 0, "驼峰储存脂肪，食物短缺时可以转化为能量。"),
    },
    sources: [B("Bactrian-camel", "Bactrian camel")],
  },
  donkey: {
    rarity: "common",
    names: { en: "Xinjiang donkey", zh: "新疆毛驴", ne: "सिन्जियाङ गधा", ur: "سنکیانگ کا گدھا" },
    local: "毛驴 · máolǘ · Uyghur: ئېشەك (eshek)",
    summary: {
      en: "Small, tough and patient, the donkey still pulls carts through oasis lanes.",
      zh: "个子小、耐力强、性情温和，毛驴车至今仍穿行在绿洲小巷。",
      ne: "सानो, बलियो र धैर्यवान् गधा अझै पनि ओएसिसका गल्लीमा गाडा तान्छ।",
      ur: "چھوٹا، مضبوط اور صابر گدھا آج بھی نخلستان کی گلیوں میں گاڑیاں کھینچتا ہے۔",
    },
    story: {
      en: "In the oases of Xinjiang and Gansu, the donkey cart was for generations the family car: it carried grapes to the drying houses, melons to market and grandparents to weddings. Donkeys need little water, eat rough fodder and cope with heat that would exhaust a horse.\n\nMotor tricycles have replaced many carts, but donkeys are still kept in Turpan's vineyards and at Kashgar's Sunday livestock market. A good owner keeps the harness padded and the load light – a strained donkey stops and refuses, which is good sense rather than stubbornness.",
      zh: "在新疆和甘肃的绿洲里，毛驴车曾经是几代人的“家用车”：把葡萄运到晾房，把甜瓜拉去巴扎，把老人送去婚礼。毛驴喝水少、吃得粗，能耐住让马都吃不消的酷热。\n\n如今很多驴车被电动三轮取代，但吐鲁番的葡萄园和喀什的星期天牲畜巴扎里仍有不少毛驴。好主人会把挽具垫软、把货装轻——驴子累了会停下来不走，这其实是聪明，而不是倔。",
    },
    fact: { en: "Donkeys were domesticated in Africa around 5,000–7,000 years ago and reached China along the trade routes.", zh: "驴大约在五千到七千年前于非洲被驯化，后来沿着商路传入中国。" },
    quiz: {
      en: q("Why do donkeys suit desert oases?", ["They need little water and handle heat", "They swim well", "They only eat grapes", "They prefer snow"], 0, "Donkeys are economical with water and cope with heat and rough food."),
      zh: q("为什么毛驴适合沙漠绿洲？", ["喝水少、耐高温", "擅长游泳", "只吃葡萄", "喜欢下雪"], 0, "毛驴节水、耐热、耐粗饲。"),
    },
    sources: [B("donkey", "Donkey")],
  },
  gazelle: {
    rarity: "rare",
    names: { en: "Goitered gazelle", zh: "鹅喉羚", ne: "गोइटर्ड हरिण", ur: "گوئٹرڈ غزال" },
    local: "鹅喉羚 · éhóulíng",
    summary: {
      en: "A desert gazelle named for the male's swollen throat in the rutting season.",
      zh: "雄性发情期喉部会鼓起，因而得名的荒漠羚羊。",
      ne: "प्रजनन मौसममा भाले हरिणको सुन्निएको घाँटीका कारण नाम पाएको मरुभूमिको हरिण।",
      ur: "صحرائی غزال جس کا نام نر کے سوجے ہوئے گلے کی وجہ سے پڑا۔",
    },
    story: {
      en: "Goitered gazelles live on the gravel plains and dune edges of Central Asia, from the Gobi to Iran. They feed at dawn and dusk, rest in the shade at midday and can go for long periods without drinking, getting moisture from plants.\n\nThey are fast and shy – you are more likely to see a pale rump bounding away than a gazelle up close. Hunting and fences across their migration routes have reduced their numbers, and they are listed as Vulnerable. Watch from a distance and never chase them with a vehicle.",
      zh: "鹅喉羚生活在从戈壁到伊朗的中亚砾石荒原和沙丘边缘，清晨和傍晚觅食，中午躲在阴凉处休息，可以长时间不喝水，从植物里获取水分。\n\n它们跑得快、胆子小——你更可能看到一团白色的臀部跳着远去，而不是近距离的羚羊。偷猎和横断迁徙路线的围栏让数量下降，被列为易危。请远远观察，不要开车追赶。",
    },
    fact: { en: "Goitered gazelles are listed as Vulnerable by the IUCN.", zh: "鹅喉羚被世界自然保护联盟列为易危物种。" },
    quiz: {
      en: q("How should you watch wild gazelles?", ["From a distance, without chasing them", "By driving close", "By feeding them", "By calling them"], 0, "Disturbance costs them energy and can separate young from mothers."),
      zh: q("应该怎样观察野生鹅喉羚？", ["远距离观察，不追赶", "开车靠近", "投喂", "大声呼唤"], 0, "惊扰会消耗它们的体力，还可能让幼崽与母亲失散。"),
    },
    sources: [B("gazelle", "Gazelle")],
  },
  eagle: {
    rarity: "rare",
    names: { en: "Golden eagle", zh: "金雕", ne: "सुनौलो चील", ur: "سنہری عقاب" },
    local: "金雕 · jīndiāo · Kyrgyz: бүркүт (bürküt)",
    summary: {
      en: "A great hunting eagle of the mountains and steppe, and partner of the eagle falconers.",
      zh: "山地与草原上的大型猛禽，也是驯鹰人的伙伴。",
      ne: "पहाड र घाँसे मैदानको ठूलो शिकारी चील, बाज पाल्नेहरूको साथी।",
      ur: "پہاڑوں اور میدانوں کا بڑا شکاری عقاب، عقاب بازوں کا ساتھی۔",
    },
    story: {
      en: "With wings that can span more than two metres, the golden eagle rides the rising air along ridges and cliffs, looking for marmots, hares and partridges. Pairs often use the same cliff nest for many years, adding sticks each season.\n\nKyrgyz and Kazakh herders in the Pamirs and Tian Shan have trained golden eagles for hunting for centuries – a skill passed from elder to apprentice. In the wild, watch for the golden nape and the long, slightly upswept wings as it circles above the valley.",
      zh: "金雕翼展可超过两米，沿着山脊和悬崖的上升气流盘旋，寻找旱獭、野兔和石鸡。一对金雕常常多年使用同一个崖壁巢穴，每年再添些树枝。\n\n帕米尔和天山的柯尔克孜族、哈萨克族牧民驯养金雕狩猎已有数百年，技艺由长辈传给徒弟。在野外，可以留意它金色的后颈和略微上扬的长翅膀在山谷上空盘旋。",
    },
    fact: { en: "Golden eagles can dive at well over 200 km/h when hunting.", zh: "金雕俯冲捕猎时速度可超过每小时200公里。" },
    quiz: {
      en: q("How do golden eagles stay aloft for hours?", ["They ride rising air along ridges", "They flap constantly", "They sleep in the air", "They follow airplanes"], 0, "Thermals and ridge lift let large raptors soar with little effort."),
      zh: q("金雕为什么能在空中盘旋几个小时？", ["借助山脊的上升气流", "一直拍打翅膀", "在空中睡觉", "跟着飞机飞"], 0, "热气流和山脊气流让大型猛禽几乎不费力就能翱翔。"),
    },
    sources: [B("golden-eagle", "Golden eagle")],
  },
  sheep: {
    rarity: "common",
    names: { en: "Fat-tailed sheep", zh: "大尾羊", ne: "मोटो पुच्छर भएको भेडा", ur: "دنبہ" },
    local: "大尾羊 · dàwěiyáng · Uyghur: قوي (qoy)",
    summary: {
      en: "The sheep behind the polo, kebabs and felt of the Silk Road oases.",
      zh: "丝路绿洲手抓饭、烤肉与毛毡背后的大尾羊。",
      ne: "रेशम मार्गका पोलो, कबाब र फेल्टपछाडिको भेडा।",
      ur: "شاہراہِ ریشم کے پلاؤ، کباب اور نمدے کے پیچھے کا دنبہ۔",
    },
    story: {
      en: "Fat-tailed sheep store energy in a broad tail instead of under the skin – useful in deserts where grazing is good one season and poor the next. The breeds of Xinjiang and Central Asia give meat for polo and kebabs, wool for felt carpets and milk for yoghurt.\n\nAt Kashgar's livestock bazaar buyers still judge a sheep by feeling the tail and back. Herders move flocks between summer pastures in the mountains and winter grounds near the oasis, a rhythm that shapes the year for many families.",
      zh: "大尾羊把能量储存在宽大的尾巴里，而不是皮下——这在草场一季好、一季差的荒漠里很有用。新疆和中亚的品种提供做抓饭、烤肉的羊肉，做毛毡的羊毛，以及做酸奶的羊奶。\n\n在喀什的牲畜巴扎，买家至今还是摸尾巴和脊背来判断一只羊好不好。牧民夏天赶羊上山，冬天回到绿洲附近，这样的节奏决定了许多家庭的一年。",
    },
    fact: { en: "A fat-tailed sheep's tail can weigh several kilograms.", zh: "一只大尾羊的尾巴可以重达好几公斤。" },
    quiz: {
      en: q("Why is the fat tail useful?", ["It stores energy for lean seasons", "It keeps flies away", "It helps the sheep swim", "It is only decoration"], 0, "The tail is an energy reserve for times when grazing is poor."),
      zh: q("大尾巴有什么用？", ["为食物短缺的季节储存能量", "赶苍蝇", "帮助游泳", "只是装饰"], 0, "尾部脂肪是草场不好时的能量储备。"),
    },
    sources: [B("sheep", "Sheep")],
  },
  goat: {
    rarity: "common",
    names: { en: "Mountain goat (domestic)", zh: "山羊", ne: "बाख्रा", ur: "بکری" },
    local: "山羊 · shānyáng · बाख्रा · بکری",
    summary: {
      en: "Sure-footed goats that turn steep, thin pasture into milk, meat and cashmere.",
      zh: "脚步稳健的山羊，把陡峭贫瘠的草场变成奶、肉和羊绒。",
      ne: "ठाडो, पातलो चरनलाई दूध, मासु र पश्मिनामा बदल्ने बाख्रा।",
      ur: "مضبوط قدم بکریاں جو کھڑی ڈھلوانوں کی چراگاہ کو دودھ، گوشت اور پشمینہ میں بدلتی ہیں۔",
    },
    story: {
      en: "Goats browse where cattle cannot: on rocky slopes, thorny shrubs and terrace edges. Across the Himalaya and Karakoram they are a family's savings account – sold when school fees are due, and central to festivals such as Dashain in Nepal and Eid in Pakistan.\n\nThe fine under-wool of high-altitude goats becomes pashmina (cashmere). Because goats eat almost anything, herders move them carefully so that young trees and terrace walls are not damaged.",
      zh: "山羊能在牛去不了的地方觅食：乱石坡、带刺灌丛、梯田边。在喜马拉雅和喀喇昆仑一带，山羊就像家里的“储蓄账户”——要交学费时卖一只，也是尼泊尔德赛节、巴基斯坦宰牲节的重要部分。\n\n高海拔山羊细软的底绒就是羊绒（帕什米纳）。山羊几乎什么都吃，所以牧民会小心放牧，避免啃坏幼树和梯田石墙。",
    },
    fact: { en: "Pashmina comes from the soft under-fleece of high-altitude goats.", zh: "帕什米纳羊绒来自高海拔山羊柔软的底绒。" },
    quiz: {
      en: q("What is pashmina?", ["Fine under-wool of mountain goats", "A kind of tea", "A sheep breed", "A woven basket"], 0, "Pashmina is the fine winter under-fleece of high-altitude goats."),
      zh: q("帕什米纳是什么？", ["山羊细软的底绒", "一种茶", "一种绵羊", "一种竹篮"], 0, "帕什米纳是高海拔山羊冬季长出的细软底绒。"),
    },
    sources: [B("goat", "Goat")],
  },
  horse: {
    rarity: "rare",
    names: { en: "Mountain horse", zh: "山地马", ne: "पहाडी घोडा", ur: "پہاڑی گھوڑا" },
    local: "马 · mǎ · Burushaski: haghur · گھوڑا",
    summary: {
      en: "Small, sure-footed horses for mountain trails, polo grounds and village festivals.",
      zh: "矮小稳健的山地马，走山路、打马球、过节日。",
      ne: "पहाडी बाटो, पोलो मैदान र गाउँका चाडका लागि सानो, बलियो घोडा।",
      ur: "پہاڑی راستوں، پولو گراؤنڈ اور گاؤں کے میلوں کے لیے چھوٹے مضبوط گھوڑے۔",
    },
    story: {
      en: "Before the Karakoram Highway, horses and mules carried people, mail and goods along cliff paths between Gilgit, Hunza and Kashgar. Mountain horses are compact and careful, placing each hoof on loose stone.\n\nHorses are also at the heart of mountain sport: free-style polo, played with few rules on narrow village grounds, is the pride of Gilgit-Baltistan, and the Shandur festival draws crowds every summer. In Yunnan, horses walked the Tea Horse Road beside the mule caravans, and at Kashgar's Sunday market traders still test horses by riding them up and down the lane.",
      zh: "喀喇昆仑公路修通之前，马和骡子沿着悬崖小路，在吉尔吉特、罕萨和喀什之间驮运人、邮件和货物。山地马个头紧凑、步子谨慎，每一步都踩稳在碎石上。\n\n马也是山区运动的核心：规则很少、在狭窄村场进行的自由式马球是吉尔吉特-巴尔蒂斯坦的骄傲，每年夏天的尚杜尔马球节吸引大批观众。在云南，马与骡帮一起走过茶马古道；在喀什的星期天巴扎，商人至今还会在小路上来回骑一圈来试马。",
    },
    fact: { en: "The Shandur Polo Festival is played on one of the highest polo grounds in the world, about 3,700 m.", zh: "尚杜尔马球节的球场海拔约3700米，是世界上最高的马球场之一。" },
    quiz: {
      en: q("What sport is famous with mountain horses in Gilgit-Baltistan?", ["Free-style polo", "Ice hockey", "Surfing", "Baseball"], 0, "Free-style polo is played at village grounds and at the Shandur festival."),
      zh: q("吉尔吉特-巴尔蒂斯坦以哪种马上运动闻名？", ["自由式马球", "冰球", "冲浪", "棒球"], 0, "自由式马球在村庄球场和尚杜尔马球节上进行。"),
    },
    sources: [B("horse", "Horse")],
  },
  yak: {
    rarity: "rare",
    names: { en: "Yak", zh: "牦牛", ne: "चौंरी / याक", ur: "یاک" },
    local: "牦牛 · máoniú · Balti/Wakhi: yak · याक",
    summary: {
      en: "The shaggy ox of the high plateau – transport, milk, wool and warmth in one animal.",
      zh: "高原上的长毛牛——运输、奶、毛和取暖燃料全靠它。",
      ne: "उच्च पठारको झुसुले गाई – ढुवानी, दूध, ऊन र न्यानोपन एउटै जनावरमा।",
      ur: "بلند سطح مرتفع کا لمبے بالوں والا بیل – سواری، دودھ، اون اور ایندھن سب ایک جانور میں۔",
    },
    story: {
      en: "Yaks thrive above 3,000 metres, where thin air and cold would exhaust ordinary cattle. Large lungs, a thick coat with a soft under-wool and very few sweat glands let them work in snow and wind.\n\nHerders in Tibet, Nepal, Ladakh, Gilgit-Baltistan and the Pamirs depend on yaks for butter and cheese, wool for tents and rope, dung for fuel and strong backs for carrying loads over passes. Crossbreeds with cattle – called dzo or zo – are common in lower villages. Wild yaks still roam the Chang Tang plateau but are rare and Vulnerable.",
      zh: "牦牛在海拔三千米以上生活得最好，那里稀薄的空气和严寒会让普通黄牛精疲力尽。大肺活量、长毛外加柔软底绒、几乎没有汗腺，让它们能在风雪中劳作。\n\n西藏、尼泊尔、拉达克、吉尔吉特-巴尔蒂斯坦和帕米尔的牧民依靠牦牛获得酥油和奶酪，用牦牛毛织帐篷、搓绳子，用牛粪做燃料，靠它们驮货翻山。牦牛与黄牛的杂交种（犏牛）在海拔较低的村子很常见。野牦牛仍在羌塘高原游荡，但数量稀少，属于易危。",
    },
    fact: { en: "Yak butter is used both in salty butter tea and in temple lamps.", zh: "牦牛酥油既用来打咸味酥油茶，也用来点寺庙的酥油灯。" },
    quiz: {
      en: q("Which of these is NOT a common use of yaks?", ["Pulling rickshaws in cities", "Carrying loads over passes", "Butter and cheese", "Wool and dung for fuel"], 0, "Yaks are high-altitude animals; they suffer in hot lowland cities."),
      zh: q("下面哪一项不是牦牛的常见用途？", ["在城市里拉人力车", "驮货翻山", "提供酥油和奶酪", "牛毛和牛粪燃料"], 0, "牦牛适应高海拔，在炎热的低地城市里会很难受。"),
    },
    sources: [B("yak", "Yak")],
  },
  bharal: {
    rarity: "rare",
    names: { en: "Bharal (Himalayan blue sheep)", zh: "岩羊", ne: "नाउर", ur: "بھرل" },
    local: "岩羊 · yányáng · नाउर (naur)",
    summary: {
      en: "Slate-grey 'blue sheep' of the high cliffs – and the snow leopard's main prey.",
      zh: "高山崖壁上的灰蓝色岩羊，也是雪豹最主要的猎物。",
      ne: "अग्ला चट्टानका खरानी-नीला नाउर – हिउँ चितुवाको मुख्य आहारा।",
      ur: "اونچی چٹانوں کی سرمئی نیلی بھیڑ – برفانی چیتے کا اہم شکار۔",
    },
    story: {
      en: "Despite the name, bharal are neither truly blue nor exactly sheep – they sit between sheep and goats. Their grey-brown coat blends into scree so well that a whole herd can be invisible until it moves.\n\nBharal graze open slopes near cliffs and escape upward when threatened. Where bharal are healthy, snow leopards usually are too, so conservation groups count them to understand the whole mountain ecosystem.",
      zh: "虽然英文叫“蓝羊”，岩羊既不是真正的蓝色，也不完全是绵羊——它们介于绵羊和山羊之间。灰褐色的毛与碎石坡融为一体，整群岩羊不动时几乎看不见。\n\n岩羊在靠近悬崖的开阔山坡吃草，一有危险就往崖上跑。岩羊多的地方雪豹通常也多，所以保护组织会统计岩羊数量来了解整个高山生态系统。",
    },
    fact: { en: "Bharal are the most important prey of snow leopards in the Himalaya.", zh: "岩羊是喜马拉雅地区雪豹最重要的猎物。" },
    quiz: {
      en: q("Why do conservationists count bharal?", ["Their numbers show the health of snow leopard habitat", "They are tame pets", "They are used for racing", "They only live in zoos"], 0, "Healthy prey populations support healthy predator populations."),
      zh: q("保护人员为什么要统计岩羊数量？", ["反映雪豹栖息地的健康状况", "它们是宠物", "用来比赛", "只住在动物园"], 0, "猎物种群健康，捕食者种群才能健康。"),
    },
    sources: [B("bharal", "Bharal")],
  },
  snowleopard: {
    rarity: "legendary",
    names: { en: "Snow leopard", zh: "雪豹", ne: "हिउँ चितुवा", ur: "برفانی چیتا" },
    local: "雪豹 · xuěbào · हिउँ चितुवा · برفانی چیتا",
    summary: {
      en: "The 'ghost of the mountains', rarely seen and found across all three countries.",
      zh: "“雪山之王”雪豹，难得一见，在中、尼、巴三国山地都有分布。",
      ne: "'पहाडको भूत' – विरलै देखिने, तीनै देशमा पाइने हिउँ चितुवा।",
      ur: "'پہاڑوں کا بھوت' – شاذ و نادر دکھائی دینے والا، تینوں ملکوں میں پایا جاتا ہے۔",
    },
    story: {
      en: "Snow leopards live on broken, rocky slopes from about 3,000 to 5,500 metres. A long, thick tail helps them balance on cliffs and wraps round the face like a scarf when they sleep. Smoky-grey rosettes make them almost invisible against rock.\n\nChina, Nepal and Pakistan together hold a large share of the world's snow leopards. The biggest threats are retaliation killing after livestock losses, poaching and loss of prey. Community programmes – predator-proof corrals, livestock insurance and herder-led camera trapping – have helped turn some villagers into the cat's protectors.",
      zh: "雪豹生活在海拔约三千到五千五百米的破碎岩坡上。又长又粗的尾巴帮助它在悬崖上保持平衡，睡觉时还能像围巾一样盖住脸。烟灰色的斑点让它在岩石间几乎隐形。\n\n中国、尼泊尔和巴基斯坦拥有世界上相当大比例的雪豹。最大的威胁是家畜被捕食后的报复性猎杀、偷猎以及猎物减少。防豹畜圈、牲畜保险和由牧民参与的红外相机监测等社区项目，让一些村民成了雪豹的守护者。",
    },
    fact: { en: "Snow leopards cannot roar; they chuff, hiss and yowl instead.", zh: "雪豹不会吼叫，而是发出喷鼻声、嘶嘶声和嚎叫。" },
    quiz: {
      en: q("What has helped reduce snow leopard killings by herders?", ["Predator-proof corrals and livestock insurance", "Feeding them meat", "Building more roads", "Keeping them as pets"], 0, "When losses fall or are compensated, retaliation drops."),
      zh: q("哪些措施帮助减少了牧民猎杀雪豹？", ["防豹畜圈和牲畜保险", "给雪豹喂肉", "修更多的路", "把雪豹当宠物"], 0, "损失减少或得到补偿后，报复性猎杀就会下降。"),
    },
    sources: [B("snow-leopard", "Snow leopard"), { label: "WWF · Snow leopard", url: "https://www.worldwildlife.org/species/snow-leopard" }],
  },
  vulture: {
    rarity: "rare",
    names: { en: "Himalayan griffon vulture", zh: "高山兀鹫", ne: "हिमाली गिद्ध", ur: "ہمالیائی گدھ" },
    local: "高山兀鹫 · gāoshān wùjiù · हिमाली गिद्ध",
    summary: {
      en: "One of the largest birds of the Himalaya, cleaning the mountains as it soars.",
      zh: "喜马拉雅最大的鸟类之一，在翱翔中为山野“清洁”。",
      ne: "हिमालयका सबैभन्दा ठूला चराहरूमध्ये एक, उड्दै पहाड सफा गर्ने गिद्ध।",
      ur: "ہمالیہ کے سب سے بڑے پرندوں میں سے ایک، جو اڑتے ہوئے پہاڑوں کو صاف رکھتا ہے۔",
    },
    story: {
      en: "With a wingspan close to three metres, the Himalayan griffon circles for hours on thermals above valleys like Pokhara's, watching for carcasses and for other vultures dropping down to feed. By clearing dead animals quickly, vultures stop disease from spreading.\n\nIn South Asia several vulture species crashed after cattle were treated with the painkiller diclofenac, which poisons vultures. Nepal banned veterinary diclofenac and set up 'vulture restaurants' that provide safe food – one of them near Pokhara – and numbers have begun to recover.",
      zh: "高山兀鹫翼展接近三米，能借助热气流在博卡拉这样的山谷上空盘旋数小时，寻找动物尸体，也观察其他兀鹫是否落地进食。兀鹫迅速清理尸体，阻止了疾病传播。\n\n在南亚，由于牛被用了止痛药双氯芬酸，好几种兀鹫数量骤降——这种药对兀鹫有毒。尼泊尔禁止兽用双氯芬酸，并设立提供安全食物的“兀鹫餐厅”（博卡拉附近就有一处），兀鹫数量开始回升。",
    },
    fact: { en: "Nepal's 'vulture restaurants' feed vultures with carcasses free of diclofenac.", zh: "尼泊尔的“兀鹫餐厅”为兀鹫提供不含双氯芬酸的安全尸体。" },
    quiz: {
      en: q("Why did many South Asian vultures die?", ["A cattle painkiller (diclofenac) poisoned them", "Too much snow", "Paragliders", "Lack of trees"], 0, "Diclofenac residues in carcasses cause kidney failure in vultures."),
      zh: q("南亚大量兀鹫死亡的原因是什么？", ["牛用止痛药双氯芬酸使它们中毒", "雪太多", "滑翔伞", "缺少树木"], 0, "尸体中残留的双氯芬酸会导致兀鹫肾衰竭。"),
    },
    sources: [B("vulture", "Vulture")],
  },
  marcopolo: {
    rarity: "legendary",
    names: { en: "Marco Polo sheep", zh: "帕米尔盘羊", ne: "मार्को पोलो भेडा", ur: "مارکو پولو بھیڑ" },
    local: "帕米尔盘羊 · Pàmǐ'ěr pányáng",
    summary: {
      en: "The wild sheep with the longest horns on Earth, at home around the Khunjerab Pass.",
      zh: "世界上角最长的野羊，生活在红其拉甫山口一带。",
      ne: "पृथ्वीमा सबैभन्दा लामो सिङ भएको जंगली भेडा, खुन्जेराब वरपर बस्ने।",
      ur: "دنیا میں سب سے لمبے سینگوں والی جنگلی بھیڑ، درہ خنجراب کے آس پاس رہتی ہے۔",
    },
    story: {
      en: "The Marco Polo sheep is a subspecies of argali living in the Pamirs where China, Pakistan, Tajikistan and Afghanistan meet. Rams carry spiralling horns that can measure more than 1.5 metres along the curve. Marco Polo described them in the 13th century, which is how they got their name.\n\nKhunjerab National Park on the Pakistan–China border was created partly to protect them. Herds move across the border with the seasons, so their survival depends on cooperation between countries and with local Wakhi and Kyrgyz herders.",
      zh: "帕米尔盘羊是盘羊的一个亚种，生活在中国、巴基斯坦、塔吉克斯坦和阿富汗交界的帕米尔高原。公羊螺旋形的大角沿弧线量可超过1.5米。马可·波罗在13世纪描述过它们，因此英文名叫“马可·波罗羊”。\n\n巴中边境的红其拉甫国家公园建立的目的之一就是保护它们。羊群随季节跨境迁移，所以它们的生存有赖于国家之间以及与当地瓦罕人、柯尔克孜族牧民的合作。",
    },
    fact: { en: "Marco Polo sheep horns can exceed 1.5 metres measured along the spiral.", zh: "帕米尔盘羊的角沿螺旋测量可超过1.5米。" },
    quiz: {
      en: q("Why does protecting Marco Polo sheep need cross-border cooperation?", ["Herds migrate across national borders", "They only live in one village", "They are farm animals", "They live in the sea"], 0, "Seasonal movements cross the borders of several countries in the Pamirs."),
      zh: q("为什么保护帕米尔盘羊需要跨国合作？", ["羊群会跨越国界迁移", "它们只住在一个村子", "它们是家畜", "它们生活在海里"], 0, "帕米尔盘羊的季节性迁移会穿越多个国家的边界。"),
    },
    sources: [B("argali", "Argali")],
  },
  ibex: {
    rarity: "rare",
    names: { en: "Himalayan ibex", zh: "北山羊", ne: "आइबेक्स", ur: "آئی بیکس" },
    local: "北山羊 · běishānyáng · Burushaski: girkis",
    summary: {
      en: "A wild goat with great ridged, back-swept horns, climbing cliffs above the villages.",
      zh: "长着带棱节、向后弯的大角的野山羊，在村庄上方的悬崖攀爬。",
      ne: "पछाडि घुमेका ठूला सिङ भएको जंगली बाख्रा, गाउँमाथिका चट्टान चढ्ने।",
      ur: "پیچھے مڑے بڑے سینگوں والی جنگلی بکری، دیہات کے اوپر چٹانوں پر چڑھتی ہے۔",
    },
    story: {
      en: "Ibex spend summer high up near the snowline and come down to lower cliffs in winter, which is when villagers in Hunza, Nagar and Baltistan see them most often. Their hooves have a hard rim and soft centre that grip rock like climbing shoes.\n\nIn Gilgit-Baltistan, community-managed conservation areas allow a strictly limited trophy hunt each year; most of the fee goes to the village for schools, water channels and wildlife guards. The system is debated, but ibex numbers have risen in many valleys where poaching stopped.",
      zh: "北山羊夏天在雪线附近的高处，冬天下到较低的崖壁，罕萨、纳加尔和巴尔蒂斯坦的村民这时最常看到它们。它们的蹄子边缘坚硬、中间柔软，像攀岩鞋一样抓住岩石。\n\n在吉尔吉特-巴尔蒂斯坦，社区管理的保护区每年只允许极少量的狩猎，所得费用大部分归村庄，用于学校、水渠和护林员。这种做法有争议，但在偷猎停止的许多山谷，北山羊的数量都增加了。",
    },
    fact: { en: "Ibex hooves have a soft inner pad that grips rock.", zh: "北山羊的蹄子有柔软的内垫，能牢牢抓住岩石。" },
    quiz: {
      en: q("When are ibex most often seen near villages?", ["In winter, when they come down from the high slopes", "Only at midnight in summer", "Never", "During monsoon floods"], 0, "Snow pushes them down to lower cliffs in winter."),
      zh: q("什么时候最容易在村庄附近看到北山羊？", ["冬天它们从高处下来时", "夏天午夜", "从来看不到", "季风洪水期间"], 0, "冬天的大雪把它们逼到较低的崖壁。"),
    },
    sources: [B("ibex", "Ibex")],
  },
  markhor: {
    rarity: "legendary",
    names: { en: "Markhor", zh: "捻角山羊", ne: "मार्खोर", ur: "مارخور" },
    local: "مارخور · markhor · 捻角山羊",
    summary: {
      en: "Pakistan's national animal, with corkscrew horns and a flowing beard.",
      zh: "巴基斯坦的国兽，长着螺旋状的角和飘逸的长须。",
      ne: "पाकिस्तानको राष्ट्रिय जनावर – कर्कस्क्रू सिङ र लामो दाह्री।",
      ur: "پاکستان کا قومی جانور – پیچ دار سینگ اور لہراتی داڑھی۔",
    },
    story: {
      en: "Markhor rams carry spectacular corkscrew horns and a long ruff of hair on the chest and neck. They live on steep, forested and rocky slopes in Gilgit-Baltistan, Chitral and Kashmir, often at lower altitudes than ibex.\n\nBy the 1990s hunting had pushed markhor close to disappearing. Community-led protection, with local guards and income shared with villages, helped numbers recover so much that the IUCN moved the markhor from Endangered to Near Threatened in 2015 – one of the region's real conservation successes.",
      zh: "捻角山羊公羊长着壮观的螺旋状大角，胸前和颈部有长长的鬃毛。它们生活在吉尔吉特-巴尔蒂斯坦、吉德拉尔和克什米尔陡峭的林间岩坡上，通常比北山羊海拔低。\n\n到了1990年代，猎杀让捻角山羊几近消失。由社区主导的保护——本地护林员加上与村庄分享收入——让数量明显恢复，2015年世界自然保护联盟把它从“濒危”降为“近危”，这是这一地区真正的保护成功案例之一。",
    },
    fact: { en: "The markhor is Pakistan's national animal.", zh: "捻角山羊是巴基斯坦的国兽。" },
    quiz: {
      en: q("What helped markhor numbers recover?", ["Community-led protection with shared income", "Moving them to cities", "Feeding them bread", "Building dams"], 0, "Local guards and village benefits reduced poaching."),
      zh: q("是什么帮助捻角山羊数量恢复？", ["社区主导、收入共享的保护", "搬到城市", "喂面包", "修水坝"], 0, "本地护林员和村庄受益减少了偷猎。"),
    },
    sources: [B("markhor", "Markhor")],
  },
  buffalo: {
    rarity: "common",
    names: { en: "Water buffalo", zh: "水牛", ne: "भैंसी", ur: "بھینس" },
    local: "水牛 · shuǐniú · भैंसी (bhaisi) · بھینس",
    summary: {
      en: "The wallowing buffalo of paddy fields – ploughing, milk, yoghurt and ghee.",
      zh: "在稻田泥塘里打滚的水牛——犁田、产奶、做酸奶和酥油。",
      ne: "धानखेतको भैंसी – जोत्ने, दूध, दही र घ्यू।",
      ur: "دھان کے کھیتوں کی بھینس – ہل چلانا، دودھ، دہی اور گھی۔",
    },
    story: {
      en: "Water buffalo have few sweat glands, so on hot days they wallow in mud and ponds to cool off and keep insects away. Their wide hooves do not sink in flooded paddies, which made them the traditional ploughing animal of rice farmers from Yunnan to the Pokhara valley.\n\nIn Nepal buffalo milk is richer than cow's milk and becomes juju dhau – the creamy 'king of yoghurts' of Bhaktapur – and ghee. In Xishuangbanna, Dai farmers still keep buffalo near the stilt houses, though small tractors now do much of the ploughing.",
      zh: "水牛汗腺很少，天热时会在泥塘和水塘里打滚降温、驱赶蚊虫。宽大的蹄子在水田里不会陷下去，因此从云南到博卡拉谷地，它们一直是稻农传统的耕牛。\n\n在尼泊尔，水牛奶比黄牛奶更浓，被做成巴克塔普尔有名的“酸奶之王”久久达乌，还有酥油。在西双版纳，傣族农民仍在竹楼旁养水牛，不过如今大部分犁田已由小型拖拉机完成。",
    },
    fact: { en: "Bhaktapur's famous juju dhau yoghurt is traditionally made from buffalo milk.", zh: "巴克塔普尔有名的久久达乌酸奶传统上用水牛奶制作。" },
    quiz: {
      en: q("Why do water buffalo wallow in mud?", ["To cool down and keep insects off", "To find fish", "To sleep underwater", "To clean the pond"], 0, "With few sweat glands, mud and water are their air-conditioning."),
      zh: q("水牛为什么在泥塘里打滚？", ["降温并驱赶蚊虫", "找鱼", "在水下睡觉", "清洁池塘"], 0, "水牛汗腺少，泥和水就是它们的“空调”。"),
    },
    sources: [B("water-buffalo", "Water buffalo")],
  },
  zebu: {
    rarity: "common",
    names: { en: "Hill cow (zebu)", zh: "瘤牛", ne: "गाई", ur: "گائے" },
    local: "गाई (gai) · 瘤牛",
    summary: {
      en: "Humped cattle honoured in Nepal, where the cow is the national animal.",
      zh: "背上有肩峰的瘤牛，在尼泊尔受到尊崇，牛是尼泊尔的国兽。",
      ne: "कुम्मे गाई – नेपालको राष्ट्रिय जनावर, सम्मानित।",
      ur: "کوہان والی گائے، نیپال میں قابلِ احترام اور قومی جانور۔",
    },
    story: {
      en: "Zebu cattle, with their shoulder hump and loose dewlap, handle heat and ticks better than European breeds. In Nepal the cow is the national animal and is honoured as a symbol of Lakshmi, the goddess of wealth; slaughtering cows is illegal.\n\nDuring Tihar, families garland cows and feed them sweets on Gai Puja. You will see cows resting calmly in the middle of streets and squares – drivers simply go round them.",
      zh: "瘤牛肩部有隆起的肩峰，颈下有松弛的垂皮，比欧洲品种更耐热、更抗蜱虫。在尼泊尔，牛是国兽，被视为财富女神吉祥天女的象征，宰杀牛是违法的。\n\n灯节期间的“敬牛日”，家家户户给牛戴花环、喂甜食。你会看到牛安静地卧在街道和广场中央——司机们只是绕过去。",
    },
    fact: { en: "The cow is Nepal's national animal.", zh: "牛是尼泊尔的国兽。" },
    quiz: {
      en: q("On which festival day are cows honoured in Nepal?", ["Gai Puja during Tihar", "Holi", "Christmas", "Losar"], 0, "Gai Puja, the cow worship day, is part of the five-day Tihar festival."),
      zh: q("尼泊尔哪个节日的哪一天专门敬牛？", ["灯节中的敬牛日", "洒红节", "圣诞节", "藏历新年"], 0, "敬牛日是为期五天的灯节中的一天。"),
    },
    sources: [B("zebu", "Zebu")],
  },
  monkey: {
    rarity: "common",
    names: { en: "Rhesus macaque", zh: "猕猴", ne: "बाँदर", ur: "بندر" },
    local: "बाँदर (bãdar) · 猕猴 · míhóu",
    summary: {
      en: "Clever, bold monkeys of temple hills – look, but keep food out of sight.",
      zh: "聪明大胆的寺庙山猴——可以看，但要把食物收好。",
      ne: "मन्दिर डाँडाका चलाख, निडर बाँदर – हेर्नुस्, तर खाना लुकाउनुस्।",
      ur: "مندروں کی پہاڑیوں کے ہوشیار، دلیر بندر – دیکھیں، مگر کھانا چھپا کر رکھیں۔",
    },
    story: {
      en: "Rhesus macaques live in forests and on temple hills across South and East Asia, from Swayambhunath in Kathmandu to the hills of Yunnan. Troops have a clear hierarchy, and young monkeys spend hours playing, grooming and learning which visitors carry snacks.\n\nFeeding monkeys makes them aggressive and unhealthy. Keep bags closed, avoid staring into a monkey's eyes (a threat in macaque language) and step back calmly if one approaches.",
      zh: "猕猴生活在南亚和东亚的森林与寺庙山上，从加德满都的斯瓦扬布纳特到云南的山林都有。猴群有明确的等级，小猴子整天玩耍、梳毛，也学会了分辨哪些游客带着零食。\n\n投喂会让猴子变得具有攻击性、也不健康。请把包拉好，不要直视猴子的眼睛（在猕猴的语言里这是挑衅），如果它靠近，就平静地后退。",
    },
    fact: { en: "Swayambhunath is often called the 'Monkey Temple' because of its resident macaques.", zh: "斯瓦扬布纳特因为住着许多猕猴，常被称为“猴庙”。" },
    quiz: {
      en: q("What should you do when a macaque approaches you?", ["Stay calm, avoid eye contact and step back", "Offer it food", "Stare it down", "Try to touch it"], 0, "Direct staring is a threat; feeding encourages aggression."),
      zh: q("猕猴靠近你时应该怎么做？", ["保持冷静，避免对视，后退", "给它食物", "盯着它看", "伸手去摸"], 0, "直视是挑衅；投喂会助长攻击行为。"),
    },
    sources: [B("rhesus-monkey", "Rhesus monkey")],
  },
  bear: {
    rarity: "epic",
    names: { en: "Himalayan brown bear", zh: "喜马拉雅棕熊", ne: "हिमाली खैरो भालु", ur: "ہمالیائی بھورا ریچھ" },
    local: "بھورا ریچھ · Balti: drenmo",
    summary: {
      en: "The great bear of the Deosai plains above Skardu, digging for marmots.",
      zh: "斯卡杜上方德奥赛高原上的大棕熊，挖洞捕捉旱獭。",
      ne: "स्कर्दूमाथि देओसाई मैदानको ठूलो भालु, मार्मोट खन्दै।",
      ur: "سکردو کے اوپر دیوسائی کے میدانوں کا بڑا ریچھ، مارموٹ کے لیے کھدائی کرتا ہوا۔",
    },
    story: {
      en: "The Himalayan brown bear is one of the rarest large mammals of South Asia. On the Deosai plateau, at over 4,000 metres above Skardu, bears dig up marmots and roots in summer and sleep through the long winter.\n\nDeosai National Park was set up in 1993 largely to protect them, and the bear population there has slowly grown from only a few dozen animals. Visitors should keep well away, never leave food or rubbish behind, and stay on the jeep track.",
      zh: "喜马拉雅棕熊是南亚最稀有的大型哺乳动物之一。在斯卡杜上方海拔四千多米的德奥赛高原，棕熊夏天挖旱獭、刨草根，漫长的冬天则在洞里冬眠。\n\n德奥赛国家公园于1993年建立，主要就是为了保护它们，那里的棕熊从只有几十只慢慢增加。游客应保持很远的距离，绝不留下食物和垃圾，并留在吉普车道上。",
    },
    fact: { en: "Deosai National Park was created in 1993 mainly to protect the Himalayan brown bear.", zh: "德奥赛国家公园1993年建立，主要目的是保护喜马拉雅棕熊。" },
    quiz: {
      en: q("Why should visitors never leave food on Deosai?", ["It teaches bears to approach people", "It feeds the grass", "It attracts tourists", "It is good for marmots"], 0, "Food-conditioned bears become dangerous and are often killed."),
      zh: q("为什么游客绝不能在德奥赛留下食物？", ["会让棕熊习惯接近人", "能给草施肥", "能吸引游客", "对旱獭有好处"], 0, "习惯了人类食物的熊会变得危险，往往因此被杀。"),
    },
    sources: [B("brown-bear", "Brown bear")],
  },
  mule: {
    rarity: "rare",
    names: { en: "Caravan mule", zh: "马帮骡子", ne: "खच्चर", ur: "خچر" },
    local: "骡子 · luózi · 马帮 mǎbāng",
    summary: {
      en: "The strong, patient mule that carried tea cakes along the Tea Horse Road.",
      zh: "沿着茶马古道驮运茶饼的强壮而耐心的骡子。",
      ne: "चिया-घोडा मार्गमा चियाका ढिक्का बोक्ने बलियो, धैर्यवान् खच्चर।",
      ur: "چائے گھوڑا راستے پر چائے کی ٹکیاں ڈھونے والا مضبوط اور صابر خچر۔",
    },
    story: {
      en: "A mule is the offspring of a donkey father and a horse mother: it has a horse's size and strength with a donkey's sure feet and endurance. Mabang caravans of mules and horses carried Pu'er tea cakes, salt and cloth for weeks along the Tea Horse Road from Yunnan towards Tibet.\n\nThe lead mule wore a bell and bright red tassels so that others on narrow mountain paths could hear the caravan coming. Muleteers were famous for their songs, their care for the animals and their knowledge of every river crossing.",
      zh: "骡子是公驴和母马的后代，有马的个头和力气，又有驴的稳健脚步和耐力。马帮赶着骡马，沿茶马古道从云南出发，驮着普洱茶饼、盐和布匹走上好几个星期去西藏。\n\n头骡挂着铃铛和鲜红的缨子，好让窄山道上的其他人远远就听到马帮来了。赶马人以他们的山歌、对牲口的细心照料和对每一个渡口的熟悉而闻名。",
    },
    fact: { en: "A mule's father is a donkey and its mother is a horse.", zh: "骡子的父亲是驴，母亲是马。" },
    quiz: {
      en: q("Why did the lead mule of a caravan wear a bell?", ["So people on narrow paths could hear it coming", "To scare tigers only", "As a prize", "To count the tea"], 0, "Bells warned other travellers on narrow mountain trails."),
      zh: q("马帮的头骡为什么挂铃铛？", ["让窄路上的人提前听到", "只为吓老虎", "作为奖品", "用来数茶叶"], 0, "铃声提醒狭窄山道上的其他行人避让。"),
    },
    sources: [{ label: "Britannica · Tea Horse Road", url: "https://www.britannica.com/topic/Tea-Horse-Road" }, B("mule", "Mule")],
  },
  dog: {
    rarity: "common",
    names: { en: "Street dog (Kukur)", zh: "街头小狗", ne: "कुकुर", ur: "کتا" },
    local: "कुकुर (kukur)",
    summary: {
      en: "Kathmandu's community dogs, garlanded and honoured on Kukur Tihar.",
      zh: "加德满都的社区狗，在“狗节”这天会被戴上花环、受到敬拜。",
      ne: "काठमाडौंका सामुदायिक कुकुर, कुकुर तिहारमा माला लगाइ पूजा गरिने।",
      ur: "کٹھمنڈو کے محلے کے کتے، جنہیں ککر تہار پر ہار پہنا کر عزت دی جاتی ہے۔",
    },
    story: {
      en: "Many of Kathmandu's dogs belong to a whole street rather than one family: shopkeepers feed them and they guard the lanes at night. On the second day of Tihar, Kukur Tihar, people put a red tika on dogs' foreheads, hang marigold garlands round their necks and give them their best food, honouring the dog as messenger of Yama, god of death.\n\nAnimal welfare groups in Nepal vaccinate and sterilise street dogs so that they stay healthy and rabies-free.",
      zh: "加德满都的许多狗不属于某一个家庭，而是属于整条街：店主们喂它们，它们夜里守着小巷。在灯节的第二天“狗节”，人们给狗额头点上红色提卡，戴上万寿菊花环，喂最好的食物，敬奉这位死神阎摩的使者。\n\n尼泊尔的动物福利组织为流浪狗接种疫苗和绝育，让它们保持健康、远离狂犬病。",
    },
    fact: { en: "Kukur Tihar is the second day of Nepal's five-day Tihar festival.", zh: "狗节是尼泊尔五天灯节中的第二天。" },
    quiz: {
      en: q("What do people give dogs on Kukur Tihar?", ["A tika, a marigold garland and good food", "A new collar only", "Nothing", "A bath in the river"], 0, "Dogs receive a tika, flowers and special food."),
      zh: q("狗节这天人们给狗什么？", ["提卡、万寿菊花环和美食", "只有新项圈", "什么也不给", "河里洗澡"], 0, "狗会得到提卡、花环和特别的食物。"),
    },
    sources: [B("dog", "Dog")],
  },
};

const IMG = (file, alt, credit) => ({ src: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=960`, alt, credit, source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}` });
export const SPECIES_IMAGES = {
  camel: IMG("Camels in Gobi Desert 02.jpg", "Bactrian camels in the Gobi Desert", "Bernard Gagnon / CC0"),
  donkey: IMG("Uyghur man on his donkey cart. Kashgar.jpg", "Donkey cart in Kashgar", "John Hill / CC BY-SA 4.0"),
  gazelle: IMG("Female goitered gazelle, Shirvan National Park, Azerbaijan.jpg", "Goitered gazelle", "Elşad İbrahimov / CC BY-SA 4.0"),
  eagle: IMG("015 Wild Golden Eagle in flight at Pfyn-Finges (Switzerland) Photo by Giles Laurent.jpg", "Golden eagle in flight", "Giles Laurent / CC BY-SA 4.0"),
  sheep: IMG("Erector fat tail sheep.jpg", "Fat-tailed sheep", "Erector / CC BY 3.0"),
  goat: IMG("Goat in Ganish.jpg", "Domestic goat in Ganish, Hunza", "Abbashuru / CC BY-SA 4.0"),
  horse: IMG("Horses grazing at Trunkol meadow, Jammu and Kashmir, India (crop).jpg", "Horses grazing in a mountain meadow", "UnpetitproleX / CC BY 4.0"),
  yak: IMG("Bos grunniens at Letdar on Annapurna Circuit.jpg", "Yak on the Annapurna Circuit", "travelwayoflife / CC BY-SA 2.0"),
  bharal: IMG("Pseudois nayaur , Bharal, Himalayan blue sheep.jpg", "Bharal", "Jan Reurink / CC BY 2.0"),
  snowleopard: IMG("Uncia uncia Ähtäri.jpg", "Snow leopard", "kallerna / CC BY-SA 3.0"),
  vulture: IMG("Himalayan Griffon Soaring over Ghusa Village, Api Nampa Conservation Area.jpg", "Himalayan griffon soaring in Nepal", "Sunuwargr / CC BY-SA 4.0"),
  marcopolo: IMG("Marco Polo sheep by Fábio Olmos.jpg", "Marco Polo sheep", "Fábio Olmos / CC BY 4.0"),
  ibex: IMG("Siberian Ibex.jpg", "Ibex", "Quinet / CC BY 3.0"),
  markhor: IMG("Capra falconeri Markhor Parc Bouillon 31082014 1.jpg", "Markhor", "Vassil / CC0"),
  buffalo: IMG("Farmer with Buffalo - Outside Lumbini - Nepal (13871635834).jpg", "Farmer with buffalo in Nepal", "Adam Jones / CC BY-SA 2.0"),
  zebu: IMG("Pahadi Cow Jomsom Village-WLV-0699.jpg", "Hill cow in Jomsom", "Bijay Chaurasia / CC BY-SA 4.0"),
  monkey: IMG("Potroit of Rhesus Macaque at Swayambhunath Stupa.jpg", "Rhesus macaque at Swayambhunath", "Nabin K. Sapkota / CC BY-SA 4.0"),
  bear: IMG("Himalayan Brown Bear at Jambu Zoo 1.jpg", "Himalayan brown bear", "Sumbria.vikramaditya / CC0"),
  mule: IMG("A Hui Muslim mule caravan passing through a village in western Yunnan c.1905.jpg", "Mule caravan in western Yunnan, c. 1905", "Unknown / public domain"),
};

/* Keep the wildlife cards fast and reliable: the same Commons photos are
   bundled locally, while source and credit links remain in each card. */
const LOCAL_SPECIES_IMAGES = {
  camel: "/static/images/objects/an-camel.webp",
  donkey: "/static/images/objects/an-donkey.webp",
  gazelle: "/static/images/objects/an-gazelle.webp",
  eagle: "/static/images/objects/an-eagle.webp",
  sheep: "/static/images/objects/an-sheep.webp",
  goat: "/static/images/objects/an-goat.webp",
  horse: "/static/images/objects/an-horse.webp",
  yak: "/static/images/objects/an-yak.webp",
  bharal: "/static/images/objects/an-bharal.webp",
  snowleopard: "/static/images/objects/an-snowleopard.webp",
  vulture: "/static/images/objects/an-vulture.webp",
  marcopolo: "/static/images/objects/an-marcopolo.webp",
  ibex: "/static/images/objects/an-ibex.webp",
  markhor: "/static/images/objects/an-markhor.webp",
  buffalo: "/static/images/objects/an-buffalo.webp",
  zebu: "/static/images/objects/an-zebu.webp",
  monkey: "/static/images/objects/an-monkey.webp",
  bear: "/static/images/objects/an-bear.webp",
  mule: "/static/images/objects/an-mule.webp",
};
for (const [key, src] of Object.entries(LOCAL_SPECIES_IMAGES)) {
  if (SPECIES_IMAGES[key]) SPECIES_IMAGES[key].src = src;
}

/* which animals live in which world */
export const WORLD_ANIMALS = {
  dunhuang: { country: "china", list: ["camel", "donkey", "gazelle", "eagle", "sheep"] },
  turpan: { country: "china", list: ["donkey", "camel", "sheep", "goat", "eagle"] },
  kashgar: { country: "china", list: ["donkey", "horse", "sheep", "camel", "goat"] },
  journey: { country: "china", list: ["yak", "bharal", "snowleopard", "vulture", "horse", "eagle"] },
  karakoram: { country: "pakistan", list: ["yak", "marcopolo", "ibex", "snowleopard", "eagle", "markhor"] },
  hunza: { country: "pakistan", list: ["horse", "yak", "markhor", "ibex", "eagle"] },
  skardu: { country: "pakistan", list: ["yak", "bear", "horse", "ibex", "eagle"] },
  pokhara: { country: "nepal", list: ["buffalo", "zebu", "vulture", "monkey", "goat"] },
  puer: { country: "china", list: ["horse", "buffalo", "mule", "goat", "eagle"] },
  xishuangbanna: { country: "china", list: ["buffalo", "monkey", "goat", "eagle"] },
  kathmandu: { country: "nepal", list: ["zebu", "monkey", "dog", "goat", "buffalo"] },
};

export const animalId = (world, species) => `an-${world}-${species}`;

export function wildlifeObjects() {
  const out = [];
  for (const [worldId, w] of Object.entries(WORLD_ANIMALS)) {
    for (const k of w.list) {
      const s = SPECIES[k];
      if (!s) continue;
      out.push({
        id: animalId(worldId, k),
        worldId,
        countryId: w.country,
        category: "wildlife",
        rarity: s.rarity,
        names: s.names,
        localName: s.local,
        summary: s.summary,
        story: s.story,
        fact: s.fact.en,
        factI18n: { zh: s.fact.zh },
        sources: s.sources,
        quiz: s.quiz.en,
        quizI18n: { zh: s.quiz.zh },
      });
    }
  }
  return out;
}

export function wildlifeImages() {
  const out = {};
  for (const [worldId, w] of Object.entries(WORLD_ANIMALS)) for (const k of w.list) if (SPECIES_IMAGES[k]) out[animalId(worldId, k)] = SPECIES_IMAGES[k];
  return out;
}
