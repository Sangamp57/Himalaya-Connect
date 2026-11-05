"""Seed the editorial demo: destinations, threads, writers and stories.

The stories and writer profiles are illustrative demo content. Photographs are
real Creative Commons images and carry their source credit on each story.
"""

from __future__ import annotations

import json
import os
from datetime import timedelta
from pathlib import Path
from textwrap import dedent

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from journal.models import Category, Comment, Destination, Post, Profile

User = get_user_model()

CATEGORIES = [
    {
        "name": "Heritage",
        "icon": "⌂",
        "accent": "#b85d3f",
        "order": 1,
        "description": "Buildings, objects and living traditions.",
    },
    {
        "name": "Food",
        "icon": "◒",
        "accent": "#c47a3d",
        "order": 2,
        "description": "Kitchens, markets, recipes and the people behind them.",
    },
    {
        "name": "Craft",
        "icon": "✳",
        "accent": "#8b6a3f",
        "order": 3,
        "description": "Materials, makers and things made slowly.",
    },
    {
        "name": "Landscapes",
        "icon": "⌁",
        "accent": "#4f7668",
        "order": 4,
        "description": "Weather, roads, water and the shape of the ground.",
    },
    {
        "name": "People",
        "icon": "◯",
        "accent": "#7b5b82",
        "order": 5,
        "description": "Conversations, hospitality and daily life.",
    },
    {
        "name": "Culture",
        "icon": "✦",
        "accent": "#9b4c42",
        "order": 6,
        "description": "Music, ritual, language and shared memory.",
    },
]

DESTINATIONS = [
    {
        "name": "Kathmandu Valley",
        "country": "Nepal",
        "flag": "🇳🇵",
        "tagline": "Courtyards, carved wood and living Newar heritage.",
        "summary": "A valley of dense neighbourhoods, temple squares and workshops where heritage is part of the working city.",
        "description": (
            "Kathmandu Valley is not one postcard. It is Bhaktapur's brick lanes, Patan's metalworkers, "
            "Kathmandu's crowded intersections and the smaller towns between them. Historic temple squares "
            "sit beside schools, bus stops and family kitchens.\n\n"
            "The valley's Newar architecture is known for its brickwork, timber frames and carved windows, "
            "but those forms are not frozen. Buildings are repaired, adapted and sometimes lost. Reading them "
            "well means noticing both continuity and change — and remembering that people live here all year, "
            "not only during festival week."
        ),
        "best_season": "October–November; March–April",
        "altitude": "1,400 m",
        "image": "images/kathmandu-durbar.webp",
        "accent": "#b85d3f",
        "order": 1,
        "highlights": "Carved windows in Bhaktapur\nMomo kitchens and morning tea\nLokta paper workshops\nStone water spouts and quiet courtyards",
    },
    {
        "name": "Hunza Valley",
        "country": "Pakistan",
        "flag": "🇵🇰",
        "tagline": "Stone villages beneath the Karakoram.",
        "summary": "Terraced fields, apricot orchards and high mountain light in Gilgit-Baltistan.",
        "description": (
            "Hunza is a high mountain region in Gilgit-Baltistan, shaped by steep terrain, irrigation channels "
            "and the seasonal rhythm of fruit trees. The valley is often photographed from its viewpoints; "
            "it is also a place of schools, shops, kitchens and families who live with the weather rather than "
            "passing through it.\n\n"
            "Travel here asks for patience. Roads close, plans move and the most memorable moments may happen "
            "while waiting for tea. Come with time, warm layers and a willingness to follow local advice about "
            "conditions and access."
        ),
        "best_season": "April–May for blossom; September–October for harvest",
        "altitude": "2,400 m",
        "image": "images/hunza-valley.webp",
        "accent": "#6d7f5e",
        "order": 2,
        "highlights": "Apricot blossom in spring\nBaltit Fort above Karimabad\nStone and timber village architecture\nWalks along irrigation channels",
    },
    {
        "name": "Kashgar",
        "country": "China",
        "flag": "🇨🇳",
        "tagline": "An oasis city of craft, trade and long memory.",
        "summary": "A historic Silk Road city in Xinjiang, with a dense old city, bazaars and Uyghur cultural life.",
        "description": (
            "Kashgar sits in the far west of Xinjiang, where oasis trade routes have met for centuries. Its old "
            "city is made of narrow lanes, courtyard homes, workshops and shopfronts, while the Grand Bazaar "
            "carries the city's reputation for exchange into the present.\n\n"
            "Uyghur culture is central to the city's identity. Food, music, language and craft are not side "
            "attractions; they are the fabric of everyday life. Visit with the ordinary courtesy you would "
            "offer anywhere: ask before taking a portrait, buy from the person who made the thing, and do not "
            "treat a residential lane as a stage."
        ),
        "best_season": "May–June; September–October",
        "altitude": "1,290 m",
        "image": "images/kashgar-old-city.webp",
        "accent": "#b37a48",
        "order": 3,
        "highlights": "The old city at first light\nHand-pulled noodles and tea\nCopper, textile and instrument workshops\nThe Grand Bazaar's working rhythm",
    },
    {
        "name": "Karakoram Route",
        "country": "Pakistan–China",
        "flag": "🏔️",
        "tagline": "High passes, shared histories and a road through the mountains.",
        "summary": "The Karakoram Highway and the landscapes around it, read as a route rather than a checklist.",
        "description": (
            "The Karakoram Highway runs through some of the highest mountain terrain on earth, linking "
            "Gilgit-Baltistan with Xinjiang. It is a road of engineering, trade and family journeys — and also "
            "a place where weather, landslides and maintenance shape every timetable.\n\n"
            "We treat the route as a series of distinct places, not one continuous attraction. The communities "
            "along it have different histories, languages and relationships to the road. Stop properly, travel "
            "in daylight when you can, and support local transport and guiding where possible."
        ),
        "best_season": "June–September, weather permitting",
        "altitude": "4,693 m at Khunjerab Pass",
        "image": "images/karakoram-highway.webp",
        "accent": "#64777d",
        "order": 4,
        "highlights": "Khunjerab Pass and the high plateau\nAttabad Lake and the Hunza River\nRoadside tea stops\nShared histories of trade and mobility",
    },
]

USERS = [
    {
        "username": "mira",
        "name": "Mira Gurung",
        "email": "mira@himalayaconnect.local",
        "location": "Kathmandu, Nepal",
        "bio": (
            "Mira writes about food, craft and the quiet politics of everyday objects in the Kathmandu Valley. "
            "She is interested in the people who keep a skill in use rather than on display."
        ),
    },
    {
        "username": "arjun",
        "name": "Arjun Karim",
        "email": "arjun@himalayaconnect.local",
        "location": "Karimabad, Hunza",
        "bio": (
            "Arjun is a photographer and mountain guide from Gilgit-Baltistan. He writes about roads, weather, "
            "stonework and the long conversations that happen while waiting for both."
        ),
    },
    {
        "username": "sana",
        "name": "Sana Yusuf",
        "email": "sana@himalayaconnect.local",
        "location": "Kashgar, Xinjiang",
        "bio": (
            "Sana writes about cities, food and the everyday architecture of belonging. Her work follows "
            "courtyards, market stalls, music and the people who make a neighbourhood feel like home."
        ),
    },
]

POSTS = [
    {
        "slug": "the-window-that-learned-to-hold-a-city",
        "title": "The window that learned to hold a city",
        "author": "mira",
        "category": "Heritage",
        "destination": "Kathmandu Valley",
        "cover": "images/bhaktapur-window.webp",
        "tags": "heritage, kathmandu, architecture, craft",
        "featured": True,
        "days_ago": 2,
        "views": 842,
        "excerpt": "In Bhaktapur, a carved peacock window is not a relic. It is a lesson in how a city keeps its memory in use.",
        "alt": "The carved Peacock Window in Bhaktapur, Kathmandu Valley",
        "content": """
            On the eastern side of Bhaktapur's Dattatraya Square, a carved wooden window does what a good window has always done: it turns a wall into a conversation. The peacock at its centre is not an ornament added for visitors. It is a reason people stop, look up and forget what they came to buy.

            The window is widely known as the Peacock Window. Its frame is a dense field of carving — vines, birds, small figures, geometry — that rewards a second look more than a photograph does. In the Newar architecture of the Kathmandu Valley, a window is rarely only an opening. It is a threshold, a display of skill and a way of letting light and air into a house while keeping some of the street outside.

            ## A building is a set of decisions

            The valley's historic towns are often described as open-air museums. That phrase gets the relationship backwards. These are working neighbourhoods. A temple square is also a shortcut to school. A courtyard is also where vegetables are sorted. The old city is not preserved because time stopped; it survives because people keep making decisions about it.

            Timber needs replacing. Brick needs repointing. A carving can be repaired with great care or replaced with something that looks roughly right from a distance. Those choices are rarely neutral. They involve money, expertise, family memory and the question of who gets to decide what a place should look like next.

            > Craft is not a style. It is a set of decisions made in a particular place, by particular hands.

            ## How to look closely

            A few details are worth giving your attention:

            - Look at the joins. Traditional timber construction often makes the joins part of the visual rhythm rather than hiding them.
            - Notice proportion. A window can be elaborate without feeling heavy; the frame and the wall are in conversation.
            - Ask about change. Repair is not the opposite of heritage. The interesting question is who did the work and what knowledge they used.
            - Look down as well as up. The street, the drainage, the steps and the thresholds tell you how the building meets daily life.

            The Peacock Window is a starting point, not a conclusion. It is one expression of a much wider tradition of carving in the valley, with different forms in different towns, workshops and periods. There is no single correct way to read it.

            If you visit, remember that this is not a film set. The lanes around the square are residential. Ask before photographing people. Buy something from the makers whose work you admire, if you can. And leave enough time to stand still. A carved window reveals itself slowly; so does the city around it.
        """,
    },
    {
        "slug": "momo-is-a-shape-not-a-recipe",
        "title": "Momo is a shape, not a recipe",
        "author": "mira",
        "category": "Food",
        "destination": "Kathmandu Valley",
        "cover": "images/momo.webp",
        "tags": "food, kathmandu, dumplings, kitchen",
        "featured": True,
        "days_ago": 4,
        "views": 1105,
        "excerpt": "A plate of momo contains more arguments than a cookbook can hold: fillings, folds, sauces and the memory of a kitchen.",
        "alt": "A plate of steamed momo with two bowls of dipping sauce",
        "content": """
            The first thing to understand about momo is that the word describes a family, not a formula. There are steamed momo, fried momo, soup-filled momo and open-topped shapes that might argue for a different name entirely. Fillings change with the household, the season and what is in the fridge.

            In Kathmandu, momo are everywhere: in small shops with a single steamer, in family kitchens, in offices where someone has ordered lunch for twelve. Their familiarity can make them seem simple. They are not.

            ## The fold carries information

            A fold is a technique, but it is also a signature. Some kitchens pleat tightly, making a purse with a small belly. Others leave a little opening at the top. Some shapes hold more filling; some cook faster; some are designed to catch sauce in a particular way. None of this is random, even when it is done quickly.

            The wrapper matters too. A thin wrapper can turn translucent and tender; a thicker one can hold a wetter filling. The ratio of dough to filling changes the whole experience. So does the steamer, the heat and the cloth underneath.

            > A good momo is not a test of authenticity. It is a test of care.

            ## The sauce is not a footnote

            In Nepal, momo are often served with a tomato-based sauce that can be sharp, smoky, sesame-heavy or fiery depending on the cook. The sauce is not a universal condiment; it is part of the dish's balance. Ask what is in it. You may get a recipe, a story or a very firm opinion.

            A useful way to eat your first plate in an unfamiliar shop is to try one plain, then one with sauce. Notice the texture of the wrapper before the chilli takes over. If the shop is busy with regulars, order what they order.

            ## A kitchen with many origins

            Momo in Nepal are connected to wider Himalayan and Central Asian dumpling traditions, but local kitchens have made them their own. The word, the shape, the filling and the occasion vary across communities. A strict search for the "original" momo misses the point: food travels, changes and becomes local by being cooked.

            At home, the best version is the one that fits your kitchen. Use a filling you can handle with confidence. Keep the wrapper covered so it does not dry out. Do not overfill the first batch. And invite someone to help with the pleating — the conversation is part of the recipe.
        """,
    },
    {
        "slug": "paper-from-the-mountain",
        "title": "Paper from the mountain, patience from the maker",
        "author": "mira",
        "category": "Craft",
        "destination": "Kathmandu Valley",
        "cover": "images/lokta-paper.webp",
        "tags": "craft, paper, kathmandu, makers",
        "featured": False,
        "days_ago": 8,
        "views": 467,
        "excerpt": "Lokta paper begins with bark, water and a great deal of waiting. The result is a material that remembers the hand that made it.",
        "alt": "Papermakers working with frames and pulp in Nepal",
        "content": """
            A sheet of handmade paper looks calm. The process behind it is not. Bark is harvested, cleaned, cooked and beaten. Fibres are suspended in water, lifted on a frame and left to drain. The sheet is pressed, dried and finished. None of these steps can be hurried without leaving a mark.

            Lokta paper is associated with the inner bark of lokta shrubs that grow in Himalayan hill regions. Production is distributed across several districts and workshops, not concentrated in a single place. The paper is used for notebooks, stationery, packaging and traditional documents, and the industry supports many small businesses.

            ## The material is the message

            Machine-made paper tries to remove variation. Handmade paper keeps it. A slight thickness change, a visible fibre or a soft edge is evidence of the process, not a defect. Printers and bookbinders learn how the sheet behaves: how it folds, how it takes ink, how it ages.

            The work is also physical. Pulp is heavy. Water is heavy. Drying depends on weather. A maker's day is shaped by tasks that cannot be moved indoors simply because a deadline has arrived.

            > Craft knowledge lives in the body before it lives in a manual.

            ## A better souvenir

            If you buy handmade paper, ask who made it and where the fibre came from. Look for a workshop or retailer that can answer those questions. A notebook is a useful thing to bring home, but the story of its making is part of what you are buying.

            Avoid treating every workshop as a photo opportunity. People are working, and the rhythm of the process matters. Ask before filming. Keep your hands away from wet sheets. Buy something rather than only observing, and pay the price the maker sets without turning it into a performance of bargaining.

            The final sheet may look simple. That is the achievement. A material made from bark, water and patience can carry a whole chain of human decisions without announcing any of them.
        """,
    },
    {
        "slug": "morning-above-the-clouds",
        "title": "Morning above the clouds",
        "author": "arjun",
        "category": "Landscapes",
        "destination": "Hunza Valley",
        "cover": "images/hunza-valley.webp",
        "tags": "hunza, mountains, walking, photography",
        "featured": True,
        "days_ago": 6,
        "views": 1367,
        "excerpt": "In Hunza, the mountain is not a backdrop. It sets the time you wake, the direction you walk and the scale of every plan.",
        "alt": "Snow-covered peaks and green fields in Hunza Valley",
        "content": """
            The first light in Hunza does not arrive all at once. It reaches the highest snow first, then moves down the rock in a slow tide. For a while the valley floor is still in shadow. The apricot trees are dark shapes. Someone is already working in a field.

            Visitors often come for the viewpoint. The viewpoint is real, but it is not the whole story. The valley is a place where the mountain is a daily constraint and a daily companion. It decides where the water goes, which road stays open, when the fruit ripens and how much time a journey really takes.

            ## Walk at the speed of the ground

            The best walks here are not the longest ones. A path along an irrigation channel can teach you more about the valley than a race to a famous panorama. Water is managed carefully; channels run through fields and villages. Stay on established paths, close gates behind you and do not walk through crops to get a photograph.

            Weather can change quickly. Carry a layer, water and a little food even on a short walk. Tell someone where you are going. Mobile coverage is not a substitute for local advice.

            > The mountain does not reward speed. It rewards attention.

            ## Photograph with restraint

            A photograph of a mountain often erases the people who live below it. If you want to include a person, ask. If you want to include a home, remember that it is a home. Do not fly a drone over fields or villages without clear permission. Do not block a path to get the shot everyone else has taken.

            The light will change again in ten minutes. The mountain will still be there tomorrow. The person whose morning you interrupted may not want to give you another chance.

            ## A practical note

            Hunza is a high-altitude region in Gilgit-Baltistan, and conditions vary by season and location. Travel plans should leave room for road closures and weather. Guides and drivers who know the area are not a luxury; they are part of travelling responsibly. Ask about the route, the vehicle and the contingency before you set out.

            The valley's beauty is not a secret. Its ordinary life is. Stay long enough to see the shops open, the school run begin and the light move across the fields. That is when the mountain stops being scenery and becomes a place.
        """,
    },
    {
        "slug": "the-apricot-tree-keeps-the-calendar",
        "title": "The apricot tree keeps the calendar",
        "author": "arjun",
        "category": "Food",
        "destination": "Hunza Valley",
        "cover": "images/apricot-blossom.webp",
        "tags": "hunza, apricot, season, food",
        "featured": False,
        "days_ago": 11,
        "views": 728,
        "excerpt": "Blossom, fruit, drying racks and winter stores: in Hunza, the apricot is a way of marking time.",
        "alt": "A woman walking beneath apricot blossom in Hunza Valley",
        "content": """
            In spring, the apricot trees turn the valley into a room with white walls. For a few days the blossom is everywhere: above the road, behind the school, in the corner of a courtyard. Then the wind takes it, and the ordinary green returns.

            The apricot is one of the fruits associated with Hunza and other mountain valleys of Gilgit-Baltistan, though its cultivation and uses vary from village to village. Fresh fruit is eaten in season; surplus is dried, stored and used through the year. The details of drying, cooking and sharing are household knowledge, not a single regional recipe.

            ## A season is a set of small tasks

            Blossom is beautiful to visitors. For a household, it is also the beginning of work: watching the weather, protecting the crop, planning the harvest and preparing space to dry fruit. A late frost can change the year. So can water, labour or a road closure.

            The apricot's presence in the landscape is a reminder that mountain food systems are not idyllic. They are practical systems built on risk. The tree produces abundantly in a good year and very little in a bad one.

            > To eat with the season is to accept that the season is not always generous.

            ## What to ask at a market

            If you buy dried apricots or other fruit in the region, ask where they were grown and how they were dried. The answer may be simple; it may also reveal a whole family story. Do not assume that a pretty display means a fair price for the grower. Pay what is asked, or negotiate respectfully, and remember that your holiday budget is not the same as a household's annual income.

            Photography needs the same care. A drying rack is not an installation. It is food being made ready for winter. Ask before you take the picture, and accept a no without turning it into a negotiation.

            The blossom is the obvious moment. The more interesting one may be a quiet afternoon months later, when a jar of last summer's fruit is opened and the valley's brief white spring returns in a different form.
        """,
    },
    {
        "slug": "a-fort-is-a-conversation-with-time",
        "title": "A fort is a conversation with time",
        "author": "arjun",
        "category": "Heritage",
        "destination": "Hunza Valley",
        "cover": "images/baltit-fort.webp",
        "tags": "heritage, hunza, architecture, conservation",
        "featured": False,
        "days_ago": 14,
        "views": 594,
        "excerpt": "Baltit Fort above Karimabad is not only a monument to the past. It is a record of repair, reuse and the decision to keep a building alive.",
        "alt": "Baltit Fort standing above Karimabad in Hunza Valley",
        "content": """
            From the road below, Baltit Fort looks as if it grew out of the rock. Up close, the building reveals a more complicated story: stone, timber, plaster, additions and repairs layered over time. A fort is never finished in the way a photograph suggests.

            Baltit Fort stands above Karimabad and has been conserved and adapted as a heritage site. Its history is tied to the region's political and architectural past, but its present is also important. Conservation involves choices about which layers to protect, which materials to use and how to let visitors see the building without wearing it out.

            ## Look for the repair

            The most interesting details are often the least dramatic. A new timber beam, a patch of plaster, a slightly different stone — these are evidence of maintenance. In a living building, repair is not a failure of authenticity. It is the condition of survival.

            Conservation can also be a form of interpretation. A restored room tells you something about the people who decided what mattered, what could be reconstructed and what should be left visible. It is worth reading the site's own explanations rather than relying only on a guidebook.

            > A building stays alive when someone keeps making decisions about it.

            ## Visit with a lighter step

            Follow the site's routes and restrictions. Do not lean on fragile surfaces or move objects for a photograph. Ask before photographing staff or other visitors. If a room is roped off, there is usually a reason: wear, safety, conservation or the simple need to protect a small space from a large crowd.

            The view from the fort is spectacular, and it is easy to let the photograph become the whole experience. Stay a little longer. Look back at the walls, the windows and the way the building sits in the slope. The fort is not separate from the valley; it is one of the valley's many arguments about how to live with the ground.
        """,
    },
    {
        "slug": "the-road-that-made-neighbours",
        "title": "The road that made neighbours",
        "author": "arjun",
        "category": "Landscapes",
        "destination": "Karakoram Route",
        "cover": "images/karakoram-highway.webp",
        "tags": "karakoram, road, travel, history",
        "featured": False,
        "days_ago": 18,
        "views": 1032,
        "excerpt": "The Karakoram Highway is an engineering achievement, a family route and a reminder that mountain travel is never only scenery.",
        "alt": "The Karakoram Highway running through a wide mountain valley",
        "content": """
            A road through the Karakoram looks like a line drawn on a map. On the ground it is a sequence of negotiations: with rock, water, weather and the ordinary need to get a child to school or a bag of flour home. The Karakoram Highway is both an infrastructural project and a lived route.

            The highway links Gilgit-Baltistan with Xinjiang through some of the highest terrain in the world. It was built over decades and opened to traffic in the late 1970s. Since then, landslides, floods and repairs have continually reshaped it. The road is not a permanent fact; it is maintained.

            ## Travel in the present tense

            It is tempting to treat the highway as a corridor of viewpoints. The better approach is to treat it as a series of places with their own rhythms. A roadside tea stop is not a photo opportunity; it is someone's business and possibly the only warm thing for kilometres.

            Ask about conditions before setting out. Travel in daylight where possible. Carry water and a layer even in summer. A local driver who knows the route is worth more than a confident map. Schedules should include the possibility of waiting.

            > The road is not a promise that the mountain will cooperate.

            ## Shared histories, distinct places

            The route connects communities with different languages, histories and relationships to the borderlands. Do not flatten them into a single "mountain culture." The useful question is not "What do these people have in common?" but "What does this particular place do with the road?"

            At Khunjerab Pass, the high plateau can feel like the end of the world. It is also a working border crossing with rules, officials and weather. Follow instructions, give staff space and do not assume that a photograph is welcome simply because the view is open.

            The highway is a route to elsewhere for many travellers. For the people who live along it, it is also the way home. Keep both facts in view.
        """,
    },
    {
        "slug": "kashgar-before-the-bazaar-wakes",
        "title": "Kashgar in the hour before the bazaar wakes",
        "author": "sana",
        "category": "Culture",
        "destination": "Kashgar",
        "cover": "images/kashgar-bazaar.webp",
        "tags": "kashgar, market, city, morning",
        "featured": False,
        "days_ago": 22,
        "views": 889,
        "excerpt": "Before the shutters rise, Kashgar's bazaar is a set of sounds: a broom, a cart, a kettle, a conversation through a doorway.",
        "alt": "A busy covered market lane in Kashgar",
        "content": """
            The bazaar is never only a place to buy things. In the early morning, before the shutters are fully up, it is a workshop of small preparations. A broom crosses the pavement. A cart is pulled into position. Somewhere behind a door, a kettle is coming to the boil.

            Kashgar's Grand Bazaar is the best-known market in the city, but the everyday commercial life of Kashgar is spread through streets and neighbourhoods. The old city has shops that serve residents first: bread, tea, fabric, repairs. Visitors arrive later, when the day is already in motion.

            ## Learn the rhythm before the display

            A market has two lives. One is arranged for customers; the other is the process that makes the display possible. If you arrive early and move quietly, you see the second one. Boxes are opened. Produce is arranged. A vendor greets a neighbour with the familiarity of years.

            Ask before taking photographs of people at work. If you are buying something, ask about the material, where it came from and how it is used. A short conversation is usually more valuable than a bargain. And if the price is fixed, respect that it is fixed.

            > The most useful travel skill is not bargaining. It is knowing when not to.

            ## The city beyond the stalls

            Step away from the main market street and the scale changes. Lanes narrow. Doorways open onto courtyards. Sound travels differently. The old city's architecture is domestic as well as commercial, and that matters: a lane is also the space outside someone's home.

            Keep your voice low in residential passages. Do not photograph children without a guardian's permission. Do not enter private courtyards to get a better angle. If you are invited in, treat it as hospitality, not as access.

            ## A note on change

            Kashgar is changing, as cities do. Tourism, new construction and the movement of young people shape the old city alongside conservation and everyday use. It is not our job as visitors to decide which version is authentic. It is our job to be curious, specific and respectful of the people who live with those changes.

            By the time the market is busy, the morning has disappeared into the day. The kettle is still working. The conversation has moved on. The city has already made a hundred small decisions without asking whether anyone was watching.
        """,
    },
    {
        "slug": "a-city-is-a-courtyard-you-can-walk-through",
        "title": "A city is a courtyard you can walk through",
        "author": "sana",
        "category": "Heritage",
        "destination": "Kashgar",
        "cover": "images/kashgar-old-city.webp",
        "tags": "kashgar, heritage, architecture, home",
        "featured": False,
        "days_ago": 27,
        "views": 512,
        "excerpt": "In Kashgar's old city, the street is a shared room. The architecture of home is also an architecture of neighbourhood.",
        "alt": "Historic rooftops and lanes in Kashgar's old city",
        "content": """
            The first thing a courtyard teaches you is that a city can be organised around privacy without becoming closed. From the lane, a doorway reveals almost nothing. Inside, the space opens: a tree, a washing line, a chair, the sound of a radio. A house can be inward-looking and still be part of a dense social world.

            Kashgar's old city is made of lanes, courtyard homes and shopfronts that blur the boundary between public and private. That makes it fascinating to walk through — and easy to walk through badly. A lane is not a museum corridor. It is the shared room of a neighbourhood.

            ## Read the threshold

            Doorways, steps, screens and benches tell you where one kind of space ends and another begins. Pay attention to them. A bench may be an invitation to sit; it may also be a place where a particular group gathers. A doorway may be open; that does not make it an entrance for visitors.

            The architecture of the old city is also a climate technology. Thick walls, shade, courtyards and narrow lanes help manage heat and light. These are not picturesque details; they are practical responses to place, developed over time and adapted by each household.

            > A good street does not only move people through. It gives them somewhere to belong.

            ## Walking with care

            Do not enter a courtyard without an explicit invitation. Ask before photographing people, especially women and children. Keep to the wider lanes when a passage is clearly residential. If you are lost, ask for help rather than opening gates. Learn a few words of greeting; they will do more than a guidebook sentence.

            Visitors often look for the oldest, most "authentic" corner. The better question is how the city is being lived in now. Who is repairing a roof? Where do children play? Which shop has been run by the same family for decades? What has changed, and who is negotiating the change?

            The courtyard is a useful metaphor for the whole city: private enough to hold a family, generous enough to make room for a guest, and strong enough to keep its boundaries. A visitor who understands that will find Kashgar opens more slowly — and more honestly.
        """,
    },
    {
        "slug": "when-a-lake-arrives-without-asking",
        "title": "When a lake arrives without asking",
        "author": "arjun",
        "category": "Landscapes",
        "destination": "Hunza Valley",
        "cover": "images/attabad-lake.webp",
        "tags": "hunza, lake, landscape, change",
        "featured": False,
        "days_ago": 32,
        "views": 976,
        "excerpt": "Attabad Lake is beautiful and complicated. Its water covers a history of displacement, road-building and mountain risk.",
        "alt": "Turquoise water of Attabad Lake surrounded by steep mountain slopes",
        "content": """
            Attabad Lake is the colour of a stone you might put in your pocket. From the road, the water looks calm and impossible. It is difficult to remember that it arrived through disaster.

            The lake formed in January 2010 after a major landslide blocked the Hunza River. The rising water submerged parts of villages and displaced communities. The road was cut; new routes and tunnels had to be built. The lake became a landmark and, for many travellers, a photograph.

            ## Beauty does not erase consequence

            It is possible to hold two things at once: the lake is astonishing, and its creation caused profound disruption. The people who lost homes, land and connections did not experience it as scenery. Any story that uses the lake as a decorative stop is missing the point.

            Local livelihoods have adapted in different ways. Boating, tourism and roadside services have grown around the lake, while questions of risk, access and compensation remain part of the region's memory. Visitors should be aware that a landscape can be both an ecological event and a place where people continue to make a living.

            > A beautiful landscape can also be a record of loss.

            ## On the water and around it

            If you take a boat, use an operator recommended locally and follow safety instructions. Ask about conditions. Do not assume that calm water means a calm mountain. If a road is closed, do not try to find a shortcut; local advice matters more than a map.

            Photograph the lake if you like. Then look at the slopes, the road and the settlements. Ask where the water came from, and who had to move. The answers are part of the view.

            Attabad is not a tragedy to be consumed, nor a miracle to be celebrated without context. It is a place in the middle of change. The most respectful thing a traveller can do is arrive with curiosity rather than certainty, and leave some of the beauty unclaimed.
        """,
    },
]

COMMENTS = [
    {
        "post": "the-window-that-learned-to-hold-a-city",
        "author": "arjun",
        "body": "The point about repair being part of heritage is so important. I see the same thing in the old stone houses here — the newest beam is often the most honest part of the building.",
    },
    {
        "post": "the-window-that-learned-to-hold-a-city",
        "author": "sana",
        "body": "I love the idea of looking down as well as up. Thresholds tell you so much about how a street is actually used.",
    },
    {
        "post": "morning-above-the-clouds",
        "author": "mira",
        "body": "The sentence about the valley's ordinary life being the secret has stayed with me. It is a good antidote to the viewpoint checklist.",
    },
    {
        "post": "kashgar-before-the-bazaar-wakes",
        "author": "arjun",
        "body": "The early hour is always the best one. Thank you for writing about the preparations and not only the display.",
    },
]

LIKE_MAP = {
    "the-window-that-learned-to-hold-a-city": ["arjun", "sana"],
    "momo-is-a-shape-not-a-recipe": ["arjun", "sana"],
    "paper-from-the-mountain": ["sana"],
    "morning-above-the-clouds": ["mira", "sana"],
    "the-apricot-tree-keeps-the-calendar": ["mira"],
    "a-fort-is-a-conversation-with-time": ["mira", "sana"],
    "the-road-that-made-neighbours": ["mira", "sana"],
    "kashgar-before-the-bazaar-wakes": ["mira", "arjun"],
    "a-city-is-a-courtyard-you-can-walk-through": ["mira"],
    "when-a-lake-arrives-without-asking": ["mira", "sana"],
}

BOOKMARK_MAP = {
    "mira": [
        "morning-above-the-clouds",
        "kashgar-before-the-bazaar-wakes",
    ],
    "arjun": [
        "the-window-that-learned-to-hold-a-city",
        "a-city-is-a-courtyard-you-can-walk-through",
    ],
    "sana": ["the-apricot-tree-keeps-the-calendar"],
}


def load_credits() -> dict:
    path = Path(settings.BASE_DIR) / "journal" / "data" / "photo_credits.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


class Command(BaseCommand):
    help = "Create the demo editors, destinations, threads and ten field notes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--admin-password",
            default=os.environ.get("DEMO_ADMIN_PASSWORD", "Admin@2026!"),
            help="Password for the demo superuser (default: Admin@2026!).",
        )
        parser.add_argument(
            "--demo-password",
            default=os.environ.get("DEMO_USER_PASSWORD", "Himalaya2026!"),
            help="Password for the three demo writers (default: Himalaya2026!).",
        )

    def handle(self, *args, **options):
        credits = load_credits()
        now = timezone.now()

        category_lookup = {}
        for entry in CATEGORIES:
            category, _ = Category.objects.update_or_create(
                name=entry["name"],
                defaults={
                    "slug": entry["name"].lower(),
                    "icon": entry["icon"],
                    "accent": entry["accent"],
                    "order": entry["order"],
                    "description": entry["description"],
                },
            )
            category_lookup[entry["name"]] = category

        destination_lookup = {}
        for entry in DESTINATIONS:
            destination, _ = Destination.objects.update_or_create(
                name=entry["name"],
                defaults={
                    "slug": entry["name"].lower().replace(" ", "-").replace("–", "-"),
                    "country": entry["country"],
                    "flag": entry["flag"],
                    "tagline": entry["tagline"],
                    "summary": entry["summary"],
                    "description": entry["description"],
                    "best_season": entry["best_season"],
                    "altitude": entry["altitude"],
                    "image": entry["image"],
                    "accent": entry["accent"],
                    "order": entry["order"],
                    "highlights": entry["highlights"],
                },
            )
            destination_lookup[entry["name"]] = destination

        admin, admin_created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@himalayaconnect.local",
                "first_name": "Journal",
                "last_name": "Editor",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if admin_created:
            admin.set_password(options["admin_password"])
            admin.save()
            Profile.objects.update_or_create(
                user=admin,
                defaults={
                    "display_name": "The Editors",
                    "bio": "The editorial desk of Himalaya Connect. Corrections, pitches and good tea welcome.",
                    "location": "Kathmandu · Hunza · Kashgar",
                },
            )

        users = {}
        for entry in USERS:
            user, created = User.objects.get_or_create(
                username=entry["username"],
                defaults={"email": entry["email"], "first_name": entry["name"].split()[0]},
            )
            if created:
                user.set_password(options["demo_password"])
                user.save()
            Profile.objects.update_or_create(
                user=user,
                defaults={
                    "display_name": entry["name"],
                    "bio": entry["bio"],
                    "location": entry["location"],
                },
            )
            users[entry["username"]] = user

        created_count = 0
        for index, entry in enumerate(POSTS):
            cover = entry["cover"]
            credit = credits.get(cover.split("/")[-1], {})
            defaults = {
                "title": entry["title"],
                "author": users[entry["author"]],
                "category": category_lookup[entry["category"]],
                "destination": destination_lookup[entry["destination"]],
                "excerpt": entry["excerpt"],
                "content": dedent(entry["content"]).strip(),
                "cover_photo": cover,
                "cover_alt": entry["alt"],
                "cover_credit": (
                    f"{credit.get('author', 'Wikimedia Commons contributor')} · "
                    f"{credit.get('licence', 'Creative Commons')} · Wikimedia Commons"
                    if credit
                    else ""
                ),
                "cover_credit_url": credit.get("source_page", ""),
                "tags": entry["tags"],
                "status": Post.Status.PUBLISHED,
                "featured": entry["featured"],
                "published_at": now - timedelta(days=entry["days_ago"]),
                "views": entry["views"],
            }
            post, created = Post.objects.get_or_create(
                slug=entry["slug"], defaults=defaults
            )
            if created:
                created_count += 1
            else:
                # Keep editorial edits, but ensure the demo's relationships stay valid.
                changed = False
                for field in ("author", "category", "destination"):
                    new_value = defaults[field]
                    if getattr(post, field) != new_value:
                        setattr(post, field, new_value)
                        changed = True
                # Fill in photo attribution on an older seeded database.
                if not post.cover_credit and defaults["cover_credit"]:
                    post.cover_credit = defaults["cover_credit"]
                    post.cover_credit_url = defaults["cover_credit_url"]
                    changed = True
                if changed:
                    post.save()

        for slug, usernames in LIKE_MAP.items():
            post = Post.objects.filter(slug=slug).first()
            if post:
                post.likes.add(*(users[name] for name in usernames if name in users))

        for username, slugs in BOOKMARK_MAP.items():
            user = users.get(username)
            if not user:
                continue
            for slug in slugs:
                post = Post.objects.filter(slug=slug).first()
                if post:
                    post.bookmarks.add(user)

        for entry in COMMENTS:
            post = Post.objects.filter(slug=entry["post"]).first()
            if post:
                Comment.objects.get_or_create(
                    post=post,
                    author=users[entry["author"]],
                    body=entry["body"],
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(CATEGORIES)} threads, {len(DESTINATIONS)} destinations, "
                f"{len(POSTS)} stories ({created_count} new)."
            )
        )
        self.stdout.write(
            "Demo editor: admin / %s\nDemo writer: mira / %s\n"
            % (options["admin_password"], options["demo_password"])
        )
