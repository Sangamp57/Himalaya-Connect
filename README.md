# Himalaya Connect

A complete, responsive travel journal **and interactive 3D cultural explorer** built with **Django, HTML, CSS, Three.js and vanilla JavaScript**. The journal is a layered editorial experience of mountain photography and slow travel stories; the explorer is a playable miniature world across Nepal, Pakistan and China.

The journal is fully functional, not a static mock-up. Members can sign up, sign in, reset a password, edit a profile, publish stories, save reading lists, like stories, comment, follow other writers, and manage or delete their account.

### The 3D explorer

Open **`/explore/`** (also linked as “3D Explorer” in the main navigation).

- Five procedural, explorable 3D scenes: Kathmandu, Hunza Valley, Kashgar, a thematic Karakoram Cultural Route, and a winding "Great Journey" mountain-trail world.
- Real orbit/pan/zoom camera controls, object raycasting, camera fly-to, highlighting, reset and mobile touch support.
- 35 cultural objects with stories, facts, source links, quizzes and collectible cards.
- A scavenger-hunt **Game** section: three themed hunts that track your beacon discoveries and award XP and bonus cards.
- A 3D cinema screen inside the Journey world that plays a freely-licensed Himalayan time-lapse as a live video texture (with a poster fallback and source credit).
- A **Films** section with three real, freely-licensed short films — one each from Nepal, Pakistan and China — played as ordinary HTML5 videos.
- Daily encounters, an etiquette practice lab, a Cultural Bridge comparison activity, XP, achievements and a filtered card gallery.
- A real OpenStreetMap culture map with verified coordinates and links into the 3D worlds.
- Persistent progress, language and settings in `localStorage`.
- English, Simplified Chinese, Nepali and Urdu interface support, including RTL Urdu. Detailed cultural narratives remain in English where a community-reviewed translation is not yet available, and the interface says so.
- The AI Cultural Guide is a clearly labelled curated demo when no server key is configured. With `OPENAI_API_KEY` set, questions are proxied through the Django server; the key never reaches the browser.

The explorer needs no Node build step. Three.js r169 and Leaflet 1.9 are vendored under `static/vendor/`. Photographs are not used inside the 3D worlds: the environments are built from procedural geometry and generated textures. The Journey world's cinema screen streams a CC BY Himalayan time-lapse from Wikimedia Commons (see credits below); where a browser cannot play WebM inline, a generated poster is shown with a link to the source.

## Run it locally

**Requirements:** Python 3.12+ and pip.

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Open <http://127.0.0.1:8000>.

On macOS/Linux activate the environment with `source .venv/bin/activate` instead.

The repository includes a seeded `db.sqlite3`, so `migrate` is enough if you are opening this exact folder. `seed_demo` is safe to run again: it restores the demo editorial data without overwriting story edits.

### Demo accounts

| Role | Username | Password |
| --- | --- | --- |
| Editor / superuser | `admin` | `Admin@2026!` |
| Writer | `mira` | `Himalaya2026!` |
| Writer | `arjun` | `Himalaya2026!` |
| Writer | `sana` | `Himalaya2026!` |

Change these before putting the site anywhere public. The passwords can be supplied on a fresh seed:

```powershell
python manage.py seed_demo --admin-password "a-long-new-password" --demo-password "another-long-password"
```

Or set `DEMO_ADMIN_PASSWORD` and `DEMO_USER_PASSWORD` in `.env` before the first seed.

## What is included

### Public site

- Interactive 3D explorer with four miniature worlds, speaking beacons, object stories, quizzes, etiquette scenarios, comparison challenges, achievements, local progress and a collectible card gallery.
- A real geographic culture map with OpenStreetMap tiles, verified coordinates and world launch links.
- A daily encounter that rotates deterministically from a curated set, with save, share and quiz actions.
- Full-screen parallax home page with layered mountain photography, scroll depth, floating notes and scroll-reveal sections.
- Story index with full-text search, category/destination/tag filters, sort options and pagination.
- Destination guide pages for Kathmandu Valley, Hunza, Kashgar and the Karakoram Route.
- Long-form story pages with drop caps, rich-but-safe text formatting, photo credits, author cards, likes, reading-list saves, share buttons and related stories.
- Author profile pages with follow buttons, bios and published-story grids.
- About page with editorial principles, travel ethics and photography credits.
- Contact form with honeypot spam protection and a friendly FAQ.
- Newsletter signup, search overlay, sitemap and robots.txt.
- 404 and 500 pages.

### Members

- Sign up with display name, username, email and password.
- Sign in with either username or email.
- Password reset by email (console backend in development).
- Password change from account settings.
- Editable profile with bio, location, website and avatar upload.
- Public author profile and follow / unfollow.
- Writer dashboard with stats, drafts, published stories, reading list and recent comments.
- Create, edit, publish, unpublish and delete stories.
- Cover image upload with live preview, photo attribution fields and a plain-text editor with light formatting.
- Like, bookmark and comment on stories.
- Delete comments on your own stories.
- Delete account and all attached content.

### Editorial/admin

- Customised Django admin for stories, categories, destinations, comments, profiles, newsletter subscribers and contact messages.
- Publish/unpublish and feature actions for stories.
- Editorial demo content: 10 stories, 3 writers, 6 categories and 4 destinations.

## Mobile behaviour

The layout was checked at **390 × 844** and **1440 × 1000** with no horizontal overflow. The interactive explorer was additionally exercised in headless Chromium at **390 × 844** and **1440 × 950**: camera controls, world switching, object selection, card collection, quizzes, etiquette feedback, bridge completion, language switching (including RTL Urdu), map markers, progress persistence and the WebGL fallback were checked for console errors.

- Desktop navigation becomes a full-screen editorial drawer.
- Hero height and type scale respond to small screens; no fixed-width content.
- Story and destination grids collapse to a single column.
- Filters wrap and category chips scroll horizontally.
- Destination cards become a snap-scrolling rail.
- Auth screens move the photography panel above the form.
- Dashboard, forms, comments and text remain readable at phone widths.
- Parallax is reduced automatically for `prefers-reduced-motion`.
- Content is visible if JavaScript is unavailable (reveal animations only activate after the JS boots).

## Project structure

```text
config/                  Django project settings and root URLs
journal/
  models.py              Categories, destinations, posts, comments, profiles
  views.py               Public pages, explorer, AI proxy, auth flows, dashboard, social actions
  tests.py               Journal, explorer and demo-guide tests
  forms.py               Sign up, profile, post, comment, contact and newsletter
  backends.py            Email-or-username authentication
  templatetags/          Safe story formatting, query strings, avatar colours
  management/commands/   seed_demo command
  data/photo_credits.json
templates/
  pages/                 Home, about, contact
  journal/               Stories, destinations, editor
  accounts/              Auth, dashboard, profile, settings
  explore/app.html       Standalone interactive explorer shell
  partials/              Header, footer, cards, forms, pagination, search
static/
  css/main.css           Design system, components, responsive rules
  css/explore.css        Explorer art direction, glass panels, cards, RTL
  css/fonts.css          Self-hosted font faces (no external requests)
  js/main.js             Parallax, menu, search, AJAX likes, editor helpers
  js/explore/            Explorer modules (data, store, UI, scenes, map, guide)
  vendor/three/          Vendored Three.js r169 module + licence
  vendor/leaflet/        Vendored Leaflet map library + licence
  images/                WebP photography, favicon, grain texture
  fonts/                 Fraunces, Manrope, Devanagari and Nastaliq WOFF2 + OFL licences
```

### Explorer internals

```text
static/js/explore/
  data.js                Curated objects, worlds, cards, quizzes, etiquette, map data
  i18n.js                Four-language interface dictionaries
  store.js               localStorage progress, XP, achievements, streaks
  ui.js                  Home, world HUD, cards, scenarios, dialogs and toasts
  map.js                 Leaflet culture map and coordinate markers
  guide.js               Chat interface + curated demo knowledge
  audio.js               Generated interface tones
  three/                 Renderer, custom orbit controls, procedural worlds
```

## Configuration

Copy `.env.example` to `.env` and set:

- `DJANGO_SECRET_KEY` — generate a long random value for anything beyond local development.
- `DJANGO_DEBUG` — `0` in production.
- `DJANGO_ALLOWED_HOSTS` — comma-separated hostnames.
- `DJANGO_CSRF_TRUSTED_ORIGINS` — full origins if using HTTPS.
- Email settings for password reset delivery.
- `OPENAI_API_KEY` is optional. Leave it blank for the explorer's labelled demo guide. If set, set `OPENAI_MODEL` (default `gpt-4o-mini`) and optionally `OPENAI_BASE_URL`. The key is read only by `journal.views.cultural_guide`; it is never returned to the browser.
- Demo passwords if you are re-seeding a fresh database.

### Production checklist

1. Set `DJANGO_DEBUG=0`, a real `DJANGO_SECRET_KEY`, correct `DJANGO_ALLOWED_HOSTS` and HTTPS origins.
2. Run `python manage.py collectstatic` **after** setting `DJANGO_DEBUG=0` so the hashed static manifest is generated. Whitenoise is configured to serve the compressed assets in production.
3. Point `MEDIA_ROOT` at persistent storage (or use object storage) and serve `/media/` from your web server.
4. Move from SQLite to PostgreSQL before real traffic.
5. Use a real SMTP provider for password reset and contact notifications.
6. Add an edge rate limiter. The app has a lightweight IP throttle for auth, comments, contact and newsletter, but a production deployment deserves a proper one.
7. Back up the database and media files.

## Tests

```powershell
python manage.py test
```

The suite covers public rendering, the explorer page and demo-guide endpoint, search and filters, signup, email-or-username login, draft privacy, story CRUD, author permissions, likes, bookmarks, comments, follows, profile editing, contact, newsletter, sitemap and robots.

Browser checks used headless Chromium at desktop and phone widths. They covered the 3D canvas and world loading, touch-sized controls, object raycasting, camera focus, collection and quiz rewards, daily save, achievements, map markers, language persistence and RTL, WebGL fallback reading mode, and the production static manifest.

## Photo credits

The demo photographs are served locally from `static/images/` as optimised WebP files. They remain the property of their photographers and are used under the licences recorded by Wikimedia Commons. Each story page renders its credit and a source link.

| Image | Photographer | Licence |
| --- | --- | --- |
| Kathmandu Durbar Square | SristiAwasthi21 | CC BY-SA 4.0 |
| Peacock Window, Bhaktapur | Nirajan pant | CC BY-SA 4.0 |
| Momo | Kushal Goyal | CC BY-SA 3.0 |
| Lokta paper | Gozitano | CC BY-SA 4.0 |
| Hunza Valley | Tahsin Shah | CC BY-SA 4.0 |
| Passu Cones | Musab243 | CC BY-SA 4.0 |
| Baltit Fort | Furqanlw | CC BY-SA 4.0 |
| Apricot blossom, Hunza | Muhammad Arsalan Mehboob | CC BY-SA 4.0 |
| Attabad Lake | Hassanzealous | CC BY-SA 4.0 |
| Karakoram Highway | taylorandayumi | CC BY 2.0 |
| Khunjerab Pass road | Shaguftakarim | CC BY-SA 4.0 |
| Kashgar Old City | Radosław Botev | CC BY 3.0 pl |
| Kashgar Grand Bazaar | David Stanley | CC BY 2.0 |

The Journey world's 3D cinema plays *"The Himalayan — Mt. Everest Base Camp trek HD Time Lapse"* by Amit Haware, sourced from Wikimedia Commons under CC BY 3.0. The Films section adds two more: *"Hunza Valley"* (Nabin K. Sapkota & Nasr Rahman, CC BY-SA 4.0) for Pakistan and *"Scenery along a road in Bayingol, Xinjiang"* (Karl Osj. G, CC BY-SA 4.0) for China. All are streamed, not bundled, and are credited on-screen and in the explorer's source notes.

The stories, writer names and profiles are fictional demo content created for this project. They are not reporting about real individuals. The destinations, cultural context and practical notes were written with care, but should still be checked against current local advice before travelling.

Typography by **Fraunces**, **Manrope**, **Noto Sans Devanagari** and **Noto Nastaliq Urdu**, self-hosted under the SIL Open Font License 1.1. The licence texts are included in `static/fonts/`.

The 3D explorer vendors **Three.js r169** (MIT licence) and **Leaflet 1.9.4** (BSD-2-Clause licence) under `static/vendor/`; their licence files are kept beside the builds. The culture map uses OpenStreetMap tiles and credits the contributors in the map attribution. The explorer's educational content and sources are listed in the in-app “Sources, ethics & notes” dialog and in each object panel.

## Notes on the rebuild

This folder replaces the previous React/Vite project. There is no Node.js build step any more: templates are rendered by Django, styling is plain CSS, and the journal's parallax/interaction layer is dependency-free JavaScript. The explorer vendors Three.js and Leaflet locally and is served as native ES modules, so the whole result runs as a normal Django site on desktop and phone.
