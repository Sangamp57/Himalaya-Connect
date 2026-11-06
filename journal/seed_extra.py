"""Additional editorial content for the main journal.

Kept separate from seed_content.py so the original seed remains easy to read.
China receives the largest share, with two additional Nepal stories and two
additional Pakistan stories.
"""

EXTRA_DESTINATIONS = [
    {
        "name": "Turpan",
        "country": "China",
        "flag": "🇨🇳",
        "tagline": "A desert basin of karez water, grapes and old Silk Road lanes.",
        "summary": "An oasis below sea level where irrigation, vineyards and caravan history meet the Flaming Mountains.",
        "description": (
            "Turpan sits in a deep basin in eastern Xinjiang, surrounded by arid mountains. Its fields and "
            "vineyards depend on the karez, a network of underground channels that carries water from the "
            "mountains without losing it to evaporation.\n\n"
            "The result is a place that feels impossible at first: green vines, poplar avenues and busy "
            "markets in one of the hottest and driest parts of China. The old Silk Road is present in the "
            "ruins and place names, but Turpan is also a working agricultural region. Visit the karez "
            "carefully, ask before entering drying houses, and leave time for the ordinary streets between "
            "the famous sights."
        ),
        "best_season": "April-May; September-October",
        "altitude": "154 m below sea level",
        "image": "images/objects/cn-liangfang.webp",
        "accent": "#c08a3e",
        "order": 6,
        "highlights": "Karez underground water channels\nGrape drying houses and trellised lanes\nEmin Minaret and the old bazaar\nThe Flaming Mountains at sunset",
    },
    {
        "name": "Pu'er",
        "country": "China",
        "flag": "🇨🇳",
        "tagline": "Tea mountains, old forests and the Tea Horse Road.",
        "summary": "A southern Yunnan landscape of tea terraces, forest gardens and Bulang and Dai villages.",
        "description": (
            "Pu'er is a tea region before it is a tourist destination. Around the city, tea grows in "
            "terraced gardens and in older forest gardens where shrubs sit beneath taller trees. The old "
            "tea forests of Jingmai Mountain were inscribed as a UNESCO cultural landscape in 2023.\n\n"
            "This is a working agricultural landscape. Pickers, workshops, drying yards and village "
            "courtyards are part of the visit, not scenery around it. Ask before entering private land or "
            "photographing people, do not pick tea without permission, and buy from the makers whose work "
            "you want to support."
        ),
        "best_season": "October-April",
        "altitude": "1,300 m",
        "image": "images/objects/cn-pe-terraces.webp",
        "accent": "#758c4b",
        "order": 7,
        "highlights": "Jingmai Mountain old tea forests\nTea terraces and spring picking\nGongfu tea in a local tea house\nThe Tea Horse Road landscape",
    },
    {
        "name": "Xishuangbanna",
        "country": "China",
        "flag": "🇨🇳",
        "tagline": "Dai temples, rainforest and the upper Mekong.",
        "summary": "A tropical corner of Yunnan shaped by Dai culture, Theravada Buddhism, rice paddies and the Lancang River.",
        "description": (
            "Xishuangbanna is the southernmost prefecture of Yunnan, bordering Laos and Myanmar. Its "
            "lowland valleys are home to Dai villages, stilt houses, Theravada temples and rice paddies; "
            "the hills hold rainforest, tea and a remarkable diversity of plants and animals.\n\n"
            "The region is often visited for the Water-Splashing Festival, but the festival is a living "
            "community celebration, not a water fight for visitors. Outside festival week, spend time in "
            "the temple courtyards, the night markets and the forest. Keep a respectful distance from wild "
            "elephants and follow reserve rules."
        ),
        "best_season": "November-April",
        "altitude": "550 m",
        "image": "images/objects/cn-xb-poshui.webp",
        "accent": "#4f9560",
        "order": 8,
        "highlights": "Dai stilt-house villages\nTheravada temples and white pagodas\nWater-Splashing Festival\nRainforest and wild Asian elephants",
    },
    {
        "name": "Pokhara",
        "country": "Nepal",
        "flag": "🇳🇵",
        "tagline": "A lakeside city beneath the Annapurnas.",
        "summary": "Phewa Lake, hill viewpoints and the working shore of a city that is also a gateway to the mountains.",
        "description": (
            "Pokhara sits in a valley in central Nepal, with Phewa Lake on one side and the Annapurna "
            "range on the horizon. It is a gateway for trekkers and a working city of schools, markets "
            "and lakeside businesses.\n\n"
            "The lake is not only a viewpoint. Fishermen, boat operators, temple visitors and families "
            "share the shore. Ask before photographing people at work, wear a life jacket on the water, "
            "and treat Tal Barahi as a living shrine rather than a stop on a boat tour."
        ),
        "best_season": "October-November; March-April",
        "altitude": "820 m",
        "image": "images/objects/np-phewa.webp",
        "accent": "#4f7668",
        "order": 9,
        "highlights": "Phewa Lake and Tal Barahi temple\nSarangkot sunrise\nLakeside walks and local kitchens\nGateway to the Annapurna region",
    },
    {
        "name": "Skardu",
        "country": "Pakistan",
        "flag": "🇵🇰",
        "tagline": "A high desert valley at the edge of the Karakoram.",
        "summary": "Cold desert, wide rivers, old forts and some of the highest mountains on earth.",
        "description": (
            "Skardu lies in Gilgit-Baltistan, where the Indus River crosses a high desert valley beneath "
            "the Karakoram. The landscape is enormous: braided rivers, sand dunes, irrigated villages and "
            "snow peaks that seem to sit directly behind the town.\n\n"
            "It is also a place of everyday work and local hospitality. The polo ground, bazaars and "
            "family orchards are as much a part of the valley as the famous viewpoints. Travel slowly, "
            "ask before entering fields or photographing people, and follow local advice about roads and "
            "weather."
        ),
        "best_season": "May-September",
        "altitude": "2,230 m",
        "image": "images/objects/pk-shigar.webp",
        "accent": "#64777d",
        "order": 10,
        "highlights": "Shigar Fort and the old valley\nIndus River and Katpana Desert\nPolo and local markets\nGateway to the high Karakoram",
    },
]

EXTRA_POSTS = [
    {
        "slug": "turpan-water-is-a-promise",
        "title": "Turpan: water is a promise",
        "author": "sana",
        "category": "Landscapes",
        "destination": "Turpan",
        "cover": "images/objects/cn-karez.webp",
        "tags": "turpan, water, karez, xinjiang, landscape",
        "featured": True,
        "days_ago": 3,
        "views": 934,
        "excerpt": "In a basin below sea level, the karez turns distant mountain water into gardens, vineyards and a city.",
        "alt": "An underground karez water channel in Turpan",
        "content": """
            Turpan is a lesson in what water can do when it is moved carefully. The basin lies below sea level and receives very little rain. Yet the streets are shaded by poplars and the fields are green. The karez makes that possible.

            A karez is not a single well. It is a system: vertical shafts, underground channels and surface outlets that carry groundwater from the mountain edge to the fields. Keeping the channel underground limits evaporation in the heat. Maintaining it requires knowledge, labour and coordination between users.

            ## A system you cannot see

            From the road, the most important part of the system is invisible. What you see are the shafts, the outlets and the irrigated fields. What you do not see is the long, gently sloping tunnel that connects them. The engineering is old, but it is not a museum object; it is maintained because people still depend on it.

            The karez is also a reminder that an oasis is not a natural accident. It is a relationship between water, labour and agreement. When the water is plentiful, the system is easy to ignore. When it is scarce, every user has an opinion about how it should be shared.

            ## How to visit

            Visit a karez interpretation site or a working outlet with a local guide. Ask how the water is allocated and who maintains the channel. Do not climb into narrow shafts or enter private fields. A vineyard or drying house is a workplace, not a backdrop.

            The famous grapes and raisins are the visible result of the system. The more interesting story is the one underground: a quiet promise that the mountains will keep sending water, if the people below keep the channel open.
        """,
    },
    {
        "slug": "the-tea-forest-is-a-garden",
        "title": "The tea forest is a garden with a memory",
        "author": "sana",
        "category": "Craft",
        "destination": "Pu'er",
        "cover": "images/objects/cn-pe-jingmai.webp",
        "tags": "puer, tea, jingmai, yunnan, craft",
        "featured": True,
        "days_ago": 5,
        "views": 812,
        "excerpt": "On Jingmai Mountain, old tea trees grow beneath a forest canopy. The garden is also a community's archive.",
        "alt": "Old tea forest on Jingmai Mountain, Pu'er",
        "content": """
            A tea garden is usually imagined as a field of low, neat bushes. On Jingmai Mountain, the tea grows under trees. The shrubs are there, but so is a canopy, a understory and a long history of managing both.

            The Cultural Landscape of Old Tea Forests of Jingmai Mountain was inscribed on the UNESCO World Heritage List in 2023. The recognition is not only for the tea. It is for the relationship between tea forests, villages, water and the communities who have managed them for generations.

            ## The harvest is a conversation

            Pickers take the young flush in spring, usually one bud and two leaves. The timing matters. So does the condition of the tree, the shade, the soil and the weather. In a tea forest, the harvest is not a single event; it is a set of decisions made across the year.

            The leaves are carried to workshops for kill-green, rolling and drying. Each step changes the tea. A small difference in temperature or timing can be tasted months later. The people doing the work often learn by watching, repeating and correcting rather than by reading a recipe.

            ## Visiting with care

            The tea forest is a working cultural landscape. Stay on paths, ask before entering a courtyard or photographing people, and do not pick tea without permission. Buy from makers when you can. A tea cake is not only a souvenir; it is the result of a season of work.

            The forest looks quiet. It is full of memory: old trees, family knowledge, village decisions and the taste of a particular spring. Give it enough time to be more than a photograph.
        """,
    },
    {
        "slug": "water-is-a-blessing",
        "title": "Water is a blessing, not a free-for-all",
        "author": "sana",
        "category": "Culture",
        "destination": "Xishuangbanna",
        "cover": "images/objects/cn-xb-poshui.webp",
        "tags": "xishuangbanna, dai, festival, water, yunnan",
        "featured": True,
        "days_ago": 9,
        "views": 689,
        "excerpt": "At the Dai New Year, water is poured as a blessing. The festival is a community celebration, not a licence to soak strangers.",
        "alt": "Water-Splashing Festival in Xishuangbanna",
        "content": """
            In Xishuangbanna, the Water-Splashing Festival marks the Dai New Year. Water is poured over Buddha images and offered to elders as a blessing. In the streets, people splash one another in a spirit of celebration.

            The two scenes belong together. The festival is not a water fight that happens to have religious origins; it is a new-year observance with many layers. Temple visits, family meals, dances and boat races are part of the same occasion.

            ## Ask before you splash

            Visitors are often invited to join. Accept the invitation with care. Ask before splashing strangers, especially elders, people carrying cameras and anyone who has said no. Protect phones and bags. Follow the festival's rules and the guidance of your host.

            The water is a blessing. Treating it as an excuse to soak anyone in reach turns a shared celebration into a nuisance. A little restraint makes the festival better for everyone.

            ## Beyond the festival

            The rest of Xishuangbanna is just as worth your time. Dai stilt houses, Theravada temples, palm-leaf manuscripts and the rainforest are not side attractions. The Lancang River is a working river, and the forests are home to wild Asian elephants.

            Keep a respectful distance from wildlife, never feed or ride wild elephants, and follow reserve rules. The region's beauty is not separate from its communities. It is produced by them.
        """,
    },
    {
        "slug": "dunhuang-after-the-last-bus",
        "title": "Dunhuang after the last tour bus",
        "author": "sana",
        "category": "People",
        "destination": "Dunhuang",
        "cover": "images/objects/cn-silkroad.webp",
        "tags": "dunhuang, night market, silk road, gansu",
        "featured": False,
        "days_ago": 6,
        "views": 572,
        "excerpt": "When the caves close and the dunes empty, Dunhuang becomes a working town again: noodles, apricots and a market under the lights.",
        "alt": "Dunhuang night market",
        "content": """
            The tour buses leave in the late afternoon. The dunes cool. On the street, the night market begins to set up: skewers, noodles, dried fruit, souvenirs and the low hum of a town that has been welcoming travellers for centuries.

            Dunhuang is famous for its caves and its lake, but the town itself is worth an evening. The market is a working place. Families run stalls, cooks prepare food, and children move between the tables. It is also a tourism economy, with all the pressure and performance that implies.

            ## Look at the ordinary

            The most interesting details are often small: how noodles are pulled, how apricots are dried, how a stall divides the evening shift. Ask before photographing people at work. Buy from the stall you actually want to support. Do not bargain as a performance.

            The Silk Road is not only a route of monuments. It is a history of exchange, movement and ordinary hospitality. A bowl of noodles at the end of a hot day is part of that history too.

            ## A slower visit

            Give Dunhuang more than one night. See the caves with a guide, visit the lake early or late, and leave time for the market without a checklist. The town is not a footnote to the attractions. It is where the oasis actually lives.
        """,
    },
    {
        "slug": "the-door-is-a-greeting",
        "title": "The door is a greeting",
        "author": "sana",
        "category": "Heritage",
        "destination": "Kashgar",
        "cover": "images/objects/cn-courtyard.webp",
        "tags": "kashgar, architecture, doors, old city, xinjiang",
        "featured": False,
        "days_ago": 12,
        "views": 488,
        "excerpt": "In Kashgar's old city, a doorway is a threshold between street and home. Reading it well means remembering who lives behind it.",
        "alt": "An old-town courtyard and gateway in Kashgar",
        "content": """
            In the old city of Kashgar, a door is never only a door. It is a boundary, a welcome, a display of craft and a piece of family history. The carved timber, the colour, the height of the step and the shade of the courtyard all say something about the people who live there.

            The lanes are dense and social. A doorway opens onto a private world, but the street outside is shared. That balance is part of the architecture. A house can be inward-looking without being closed.

            ## Walk with permission

            Visitors often want to photograph the doors. Ask first. A doorway belongs to a household, even when it is beautiful and the street is public. Do not open a gate, step into a courtyard or move objects to improve a picture.

            The old city is a residential neighbourhood, not a film set. The most respectful way to look is also the most interesting: slow down, notice the materials, and let the place reveal itself on its own terms.

            ## Repair is part of heritage

            Old buildings change. Timber is replaced, plaster is repaired, and new materials appear. Conservation is not the same as freezing a street in time. The interesting questions are who does the work, what knowledge they use and whether the people who live there have a say.

            A door can be a greeting. It can also be a reminder that the best way to see a neighbourhood is to remember that it is someone's home.
        """,
    },
    {
        "slug": "bhaktapur-before-the-crowds",
        "title": "Bhaktapur before the crowds",
        "author": "mira",
        "category": "People",
        "destination": "Kathmandu Valley",
        "cover": "images/bhaktapur-window.webp",
        "tags": "bhaktapur, kathmandu, morning, newar",
        "featured": False,
        "days_ago": 10,
        "views": 641,
        "excerpt": "The old city is most itself before the tour groups arrive: a broom, a kettle, a shop shutter and a square coming awake.",
        "alt": "A carved window in Bhaktapur",
        "content": """
            Bhaktapur is often described as a living museum. The phrase is well meant and slightly wrong. A museum is arranged for visitors. A living town arranges itself around the people who wake up there.

            Early morning is the best time to see the difference. A shopkeeper sweeps the step. A kettle begins to whistle. Someone carries a crate through the square. The temples are still there, but they are part of a working morning rather than a backdrop.

            ## A square is a shared room

            The old squares are not only monuments. They are routes to school, places to meet, shortcuts and temporary workshops. If you visit, keep to the edges of processions, ask before photographing people and do not sit on fragile plinths.

            The city's Newar architecture is famous for its brickwork and carved timber. It is also the product of continuous repair. A building that looks old may have been rebuilt or restored several times. That is not a contradiction; it is how a city stays alive.

            ## Stay for the ordinary

            The famous sights are worth seeing. So is the ordinary hour after them: tea, a newspaper, a delivery, a conversation in a doorway. The most memorable part of Bhaktapur may be the moment when the heritage stops being an object and becomes a place where people are simply getting on with their day.
        """,
    },
    {
        "slug": "a-lake-with-a-working-shore",
        "title": "A lake with a working shore",
        "author": "mira",
        "category": "Landscapes",
        "destination": "Pokhara",
        "cover": "images/objects/np-phewa.webp",
        "tags": "pokhara, phewa, lake, nepal, boats",
        "featured": False,
        "days_ago": 15,
        "views": 533,
        "excerpt": "Phewa Lake is a view, a workplace and a temple approach. The best visits make room for all three.",
        "alt": "Phewa Lake and the Annapurnas near Pokhara",
        "content": """
            From the lakeside, Pokhara can look like a single postcard: a calm lake, green hills and the Annapurnas somewhere behind the clouds. The lake is real, but it is also busy. Boats cross it, fishermen work its edges, and pilgrims visit the island temple.

            A good visit begins by noticing that the shore is a workplace. Ask before photographing boat operators. Wear a life jacket. Sit where the boatman asks you to sit. Do not stand up for a photograph while the boat is moving.

            ## Tal Barahi is a shrine

            The temple on the island is a living religious site. Remove your shoes where required, cover your shoulders and keep your voice low. Photography may be restricted. The lake is not a theme park, and the temple is not a photo prop.

            The surrounding hills are also part of the story. Sarangkot is famous for sunrise, but the walk there passes through fields, villages and school routes. Stay on paths, close gates and ask before entering private land.

            ## A slower lake

            The most rewarding time at Phewa may be the hour after the tour boats return. The light softens, the water stills, and the shore goes back to its ordinary rhythm. Give the lake that hour. It is a better souvenir than another identical sunset photograph.
        """,
    },
    {
        "slug": "a-river-made-the-valley",
        "title": "A river made the valley",
        "author": "arjun",
        "category": "Landscapes",
        "destination": "Skardu",
        "cover": "images/objects/pk-indus.webp",
        "tags": "skardu, indus, baltistan, river, mountains",
        "featured": False,
        "days_ago": 17,
        "views": 501,
        "excerpt": "The Indus is the quiet force behind Skardu's fields, roads and settlements. The valley is a river story before it is a mountain view.",
        "alt": "The Indus River near Skardu",
        "content": """
            In Skardu, the mountains take the attention. They are enormous, close and constantly changing with the light. But the valley itself is shaped by water. The Indus and its tributaries carry the sediment, cut the channels and make the irrigated fields possible.

            The river is also a road. It connects settlements, carries goods and creates the broad gravel beds that roads and bridges must negotiate. In spring and summer, snowmelt changes its volume. Weather upstream can change it again.

            ## Fields at the edge of the river

            The green fields look effortless. They are not. Irrigation channels, stone walls, soil and careful water management turn a dry valley into a place where crops can grow. Ask before walking through fields or orchards. A path that looks empty may be someone's route to work.

            The old fort at Shigar and the bazaars of Skardu are part of the same landscape. They grew where water, trade and defence met. The valley's history is not only in the monuments; it is in the shape of the fields and the routes between them.

            ## Travel with the river

            Give yourself time to sit by the water without trying to photograph it from every angle. Watch how the current moves. Notice the sound. The Indus is not a backdrop to the mountains; it is the reason the valley exists.
        """,
    },
    {
        "slug": "the-bridge-is-a-neighbour",
        "title": "The bridge is a neighbour",
        "author": "arjun",
        "category": "People",
        "destination": "Hunza Valley",
        "cover": "images/objects/pk-hussaini.webp",
        "tags": "hunza, hussaini, bridge, karakoram, community",
        "featured": False,
        "days_ago": 20,
        "views": 456,
        "excerpt": "A famous bridge is also a piece of local infrastructure. The people crossing it are not part of the scenery.",
        "alt": "Hussaini Suspension Bridge in Hunza Valley",
        "content": """
            Hussaini Bridge is one of the most photographed places in Hunza. The narrow suspension bridge swings above the Hunza River, with the Karakoram rising behind it. It looks like an adventure.

            For local people, it is also infrastructure. People cross it to reach fields, homes and the road. Visitors stop in the middle for photographs; residents may be trying to get somewhere. Keep the walkway clear, do not shake the bridge, and do not block the approach.

            ## Ask before you photograph

            The villages around the bridge are not an extension of the viewpoint. Ask before photographing people or entering private land. Do not fly a drone low over homes without permission. A smile is not consent.

            The bridge is a good place to remember that mountain tourism depends on local labour: drivers, guides, cooks, porters and families who host visitors. Spend deliberately. Buy from local businesses. Treat the people who make the journey possible as more than background.

            ## A view with a job

            The best photographs of the bridge include the valley, not only the dramatic span. They show why the bridge exists: a river, a settlement and a route. That context is also the reason to treat the place with care.
        """,
    },
]
