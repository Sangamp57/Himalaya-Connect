# Himalaya Connect

Himalaya Connect is a travel journal and a playable 3D cultural explorer in one Django project. The journal holds long-form stories, destination guides and the usual things a small editorial site needs: accounts, comments, bookmarks, drafts and search. The explorer turns the same regions into eleven stylised worlds that you can walk around, with discovery cards, short quizzes, rides, a culture map and a film room.

It is built with Django, server-rendered templates, plain JavaScript, Three.js and Leaflet. The 3D scenes are interpretations rather than survey reconstructions, and the editorial side is meant to be readable rather than glossy.

## What is in the project

### The journal

- 20 published stories and 10 destination guides.
- 8 of the stories and 6 of the destinations focus on China, including Yunnan and Dunhuang.
- Categories, tags, search, filters, featured stories and pagination.
- Sign-up, sign-in by username or email, password reset/change and profile editing.
- Author pages, follows, likes, bookmarks, comments and a personal reading dashboard.
- Drafts, publishing, editing and deleting your own stories.
- Contact form, newsletter sign-up, sitemap, robots.txt and a health endpoint.
- A desktop and mobile layout, with an English/中文 switch on the main site.

### The 3D explorer

Open `/explore/` from the main navigation.

- Eleven walkable worlds: Kathmandu Valley, Pokhara, Hunza Valley, Skardu, Kashgar, Turpan, Dunhuang, Pu'er, Xishuangbanna, the Karakoram Highway and the Great Journey trail.
- 150 cultural discovery cards, each with a story, a fact, a photo credit and a quiz.
- 7 scavenger hunts, 6 achievements, 5 daily encounters, 19 etiquette scenarios and 6 Cultural Bridge comparisons.
- Rideable animals and vehicles in the worlds, including horses, yaks, camels, boats, a jeep, a cycle rickshaw and a paraglider.
- Orbit, pan, zoom and walk controls, a full 360° orbit, a minimap, an exit control and touch support on phones.
- Collision handling so you slide along buildings, walls and other solid objects instead of walking through them.
- An 18-place OpenStreetMap culture map with links into the matching 3D worlds.
- Three freely licensed short films from Nepal, Pakistan and China, plus a 3D cinema screen in the Journey world.
- English, Simplified Chinese, Nepali and Urdu interfaces, including right-to-left Urdu. Some long cultural narratives remain in English where a reviewed translation is not available yet; the explorer labels its translation status rather than pretending everything is complete.
- A cultural guide that works offline from a curated knowledge base. If an API key is configured on the server, it can proxy live answers without exposing the key to the browser.
- Guest progress in `localStorage`. Signed-in visitors can also save progress to their Django account and continue on another device.

## Requirements

- Python 3.12 or newer.
- Node.js 18 or newer if you want to import the explorer catalogue into the database.
- A modern browser with WebGL for the full 3D experience.
- Playwright is optional, only for the browser-level end-to-end test in `tests/`.

## Run it locally

Clone the repository and create a virtual environment:

```bash
git clone https://github.com/Sangamp57/Himalaya-Connect.git
cd Himalaya-Connect
python -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Or on macOS/Linux:

```bash
source .venv/bin/activate
```

Install the Python dependencies and create your local environment file:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Windows:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Open `.env` and set at least a private `DJANGO_SECRET_KEY`. The example file lists the other optional integrations. Do not commit `.env`.

Set up the database and load the sample content:

```bash
python manage.py migrate
python manage.py seed_content
python manage.py import_explorer_content
python manage.py createsuperuser
python manage.py runserver
```

Then open:

- Journal: <http://127.0.0.1:8000/>
- Explorer: <http://127.0.0.1:8000/explore/>
- Django admin: <http://127.0.0.1:8000/admin/>

`seed_content` is optional. It creates the sample stories, destinations and demo editorial accounts. The demo accounts are created with unusable passwords by default, so no starter password is published in the repository. Use `createsuperuser` for your own admin account, or set `SEED_ADMIN_PASSWORD` and `SEED_WRITER_PASSWORD` in `.env` before seeding if you specifically need to sign in as a demo author. You can also set a password later with:

```bash
python manage.py changepassword <username>
```

`import_explorer_content` reads the bundled explorer catalogue and writes the normalized worlds, discoveries, quizzes, hunts and achievements into the database. It needs Node.js and is safe to run again; it updates existing records instead of creating duplicates.

If you only want the journal and do not need the normalized explorer catalogue, you can skip the import. The explorer keeps a bundled fallback copy of its catalogue and still runs.

## Configuration

`.env.example` contains the full list of settings. The important ones are:

| Variable | Purpose |
| --- | --- |
| `DJANGO_SECRET_KEY` | Django signing key. Use a long random value outside local development. |
| `DJANGO_DEBUG` | `1` for local development, `0` for production. |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hostnames. |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Comma-separated HTTPS origins when serving behind a proxy. |
| `EMAIL_*` | Password-reset and contact-form email. The development default prints messages to the terminal. |
| `GOOGLE_*`, `WECHAT_*`, `FACEBOOK_*` | Optional social sign-in credentials. |
| `SMS_*`, `TWILIO_*` | Optional phone sign-in. The development default prints verification codes to the terminal. |
| `OPENAI_*` | Optional live cultural-guide answers. The key is read only by the server. |
| `SEED_ADMIN_PASSWORD`, `SEED_WRITER_PASSWORD` | Optional passwords for the demo accounts created by `seed_content`. |

Keep secrets in `.env` or your hosting provider's environment settings. The repository intentionally ignores `.env`, `db.sqlite3`, uploaded media and local build artefacts.

## Explorer data and API

The editable catalogue lives in the database after `import_explorer_content` runs. The JavaScript bundle remains as a fallback, and the browser asks the catalogue API for the latest values when it loads.

| Route | Access | What it does |
| --- | --- | --- |
| `/api/explorer/catalogue/` | Public | Returns active worlds, discovery items, quizzes, hunts and achievements. |
| `/api/explorer/progress/` | Signed in | Loads the current user's explorer save. |
| `/api/explorer/progress/save/` | Signed in | Saves the current user's explorer save. |
| `/culture-guide/` | POST | Returns a curated or optional live cultural-guide answer. |

The source catalogue is `static/js/explore/data.js`. If you change it, run the importer again:

```bash
python manage.py import_explorer_content
```

The importer requires Node.js because it evaluates the JavaScript catalogue directly, so there is no second copy of the content to maintain by hand.

## Tests

Run the Django checks and test suite from the project root:

```bash
python manage.py check
python manage.py test
python manage.py makemigrations --check --dry-run
```

The browser-level explorer test is optional and expects Playwright to be installed and the development server to be running:

```bash
node tests/yunnan_worlds_e2e.js http://127.0.0.1:8000
```

## Project layout

```text
config/                         Django settings, URLs, ASGI and WSGI
journal/
  models.py                     Journal, account and explorer models
  views.py                      Pages, authentication and JSON endpoints
  urls.py                       Web and API routes
  admin.py                      Django admin registration
  migrations/                   Database schema history
  data/photo_credits.json       Source, author and licence for story photos
  management/commands/
    seed_content.py             Sample stories, destinations and demo accounts
    import_explorer_content.py  Import the explorer catalogue into the database
templates/                      Server-rendered pages
static/
  css/                          Journal and explorer styles
  fonts/                        Self-hosted Fraunces, Manrope and Noto fonts
  js/explore/                   Explorer data, UI, 3D scenes and game logic
  images/                       Story, guide and discovery photography
  vendor/                       Local Three.js and Leaflet builds
tests/                          Optional browser-level checks
CREDITS.md                      Full photo, film and software credits
LICENSE                         MIT licence for the code
```

## Deployment notes

For a production-style setup:

```bash
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py import_explorer_content
```

Set `DJANGO_DEBUG=0`, a strong `DJANGO_SECRET_KEY`, the correct allowed hosts and HTTPS settings, a real email backend, persistent media storage and database backups. If you use a database other than SQLite, update the `DATABASES` setting and install the appropriate driver. Run the app with Gunicorn (or another WSGI server) behind a reverse proxy.

The development database is created locally with `migrate`; `db.sqlite3` is ignored by Git. Uploaded media and the `.env` file are also ignored.

## Credits, licences and content use

The project code is released under the MIT licence. See [`LICENSE`](LICENSE).

Original editorial text and project-created illustrations are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). If you reuse them, credit **Himalaya Connect** and link back to this repository.

Third-party material remains under its own licence. The full image-by-image list is in [`CREDITS.md`](CREDITS.md), and each story and discovery card also shows its own credit and source link in the interface.

In particular:

- **Photography** comes from Wikimedia Commons contributors, mostly under CC BY, CC BY-SA, CC0 or public-domain terms. The author, licence and original file page are listed in `CREDITS.md` and `journal/data/photo_credits.json`.
- **Films** are the Everest base-camp time-lapse by Amit Haware (CC BY 3.0), the Hunza Valley film by Nabin K. Sapkota and Nasr Rahman (CC BY-SA 4.0), and the Bayingol road film by Karl Osj. G (CC BY-SA 4.0), all via Wikimedia Commons.
- **Fonts** are Fraunces and Manrope by their respective designers, plus Noto Sans Devanagari and Noto Nastaliq Urdu from Google Fonts. They are self-hosted under the SIL Open Font License 1.1.
- **Software** includes Three.js (MIT), Leaflet (BSD-2-Clause), Django (BSD-3-Clause), Pillow (HPND), requests (Apache-2.0), WhiteNoise (MIT) and Gunicorn (MIT). The vendored Three.js and Leaflet licence files are kept in `static/vendor/`.
- **Maps** use OpenStreetMap data and tiles. Map data is © OpenStreetMap contributors, available under the Open Database Licence; attribution is shown on the culture map.
- **Reference material** used while writing the explorer content includes UNESCO World Heritage and Intangible Heritage pages, Britannica, BBC Travel, IFAD, Encyclopaedia Iranica, Craft Atlas and other sources linked from the relevant cards and from `static/js/explore/data.js`.

The explorer catalogue and editorial work also include contributions from **Herve Emmanuel Ilunga** (normalized explorer tables, importer and catalogue API) and the **zeeeditor** branch work on the walkable worlds, rideables and collision fixes. Thanks to everyone whose photographs, films, fonts, map data and reference material made the project possible.

If you are a rights holder and spot an incorrect credit or a licence that needs correcting, please open an issue with the image or source URL and the change you would like.

## A note on the 3D scenes

The worlds are stylised educational interpretations. They are not architectural surveys, navigation tools or a substitute for current local travel advice. Access rules, opening times and conditions change; check with local and official sources before travelling.

## Licence summary

- Code: MIT.
- Original editorial text and project-created illustrations: CC BY 4.0.
- Third-party photos, films, fonts, map data and software: their respective licences, listed in [`CREDITS.md`](CREDITS.md).
