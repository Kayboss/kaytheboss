# KAYTHEBOSS — Self-hosted backend

Fastify + SQLite + Drizzle for content API and a server-rendered admin.

## Setup

1. Install dependencies

   ```bash
   cd server
   npm install
   ```

   (depends: fastify, @fastify/cookie, @fastify/formbody, better-sqlite3, drizzle-orm, drizzle-kit)

2. Generate migrations + create schema

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

3. Seed content + create admin user

   Set env:
   ```bash
   set ADMIN_EMAIL=you@kaytheboss.studio
   set ADMIN_PASSWORD=your-strong-password
   # or create .env and run with node --env-file=.env
   npm run db:seed
   ```

   Or `npm run user:add you@kaytheboss.studio your-password` (creates user only if none exist).

4. Start

   ```bash
   npm run dev  # --watch
   # or
   npm run start
   ```

Server runs at http://localhost:8787. Admin: http://localhost:8787/admin.

`/` redirects to the admin; the machine-readable endpoint index lives at `/api`.

## API

- GET /api/health
- GET /api/content -> { site, work, journal }
- GET /api/site, GET /api/work, GET /api/work/:slug, GET /api/journal, GET /api/journal/:slug

## Admin

- Login at /admin/login (cookie-based session, 14 days)
- Edit work, journal, settings (JSON editor for site)

## Emails

Commission enquiries land in `/admin/emails`. The site form mirrors each
submission to `POST /api/enquiry` here when `CONTENT_API_URL` (or
`ADMIN_INBOX_URL`) is set in the site's env.

To reply: open an enquiry, edit the draft, press **Send reply**. The message
goes out through Resend, the enquiry is marked `replied`, and the draft is
saved first so a failed send never loses your text. `Reply-To` is set to the
studio inbox, so the visitor's answer comes back to you.

Without `RESEND_API_KEY` the send button is disabled and **Reply by email**
opens your mail client instead.

Env:

- `RESEND_API_KEY` — verify the sending domain in Resend first;
  `onboarding@resend.dev` only delivers to the Resend account owner
- `ENQUIRY_FROM_EMAIL` — e.g. `KAYTHEBOSS <hello@kaytheboss.studio>`
- `ENQUIRY_TO_EMAIL` — owner notifications and the Reply-To address
  (default `commissions@kaytheboss.studio`)

## Database

Data lives in `../data/kaytheboss.db` (SQLite). `schema.js` defines tables; `drizzle/` holds migrations.

## Frontend (Vercel) — connect to this backend

Set env on Vercel (or when building):
- CONTENT_API_URL=https://your-backend.example  (origin only — no `/api` suffix)
- CONTENT_API_TOKEN=optional

`content/loader.mjs` prefers CONTENT_API_URL → fetches `/api/content`; falls back to Sanity/local JSON.
`api/commission.js` posts new enquiries to `/api/enquiry` on the same origin, which
is what puts them in the admin inbox.

## Running the admin locally, site on Vercel

The admin and its SQLite file stay on this machine; Vercel only builds the
static site. Vercel cannot reach `localhost`, so the deploy reads
`content/*.json` instead of the API.

Workflow:

1. Edit work, journal and settings in `/admin` as normal.
2. Before you deploy, push admin edits into the JSON the site builds from:

   ```bash
   npm run content:export
   ```

   This rewrites `content/site.json`, `work.json` and `journal.json` from
   `data/kaytheboss.db` (it refuses to run if the database has no rows).
3. Commit those three files and let Vercel build — in this local setup do not
   set `CONTENT_API_URL` on Vercel, because it cannot reach `localhost` and
   the build will silently fall back to JSON anyway. (If the admin is hosted
   on Render instead, see the next section.)

Images uploaded through the admin land in `public/media/`. That folder is
gitignored except for `.gitkeep`, so uploads only exist on this machine —
commit or copy them separately if they need to appear on the live site.

## Deploying the admin on Render

The admin, the content API and the SQLite database can live on one Render web
service; Vercel keeps building the static site from the API at build time.
`render.yaml` in the repo root describes the whole thing.

**Before you start**

- The repo must be on GitHub — Render deploys from git, not from this folder.
- Use a paid instance type (`0.5c-512mb`, ~$7/mo, already set in
  `render.yaml`). The free plan has no persistent disk, so the database and
  every enquiry would be lost on each restart.

**Steps**

1. Push the repo to GitHub (once):

   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin master
   ```

2. In Render: **New → Blueprint**, pick the repo, **Apply**. Render reads
   `render.yaml`, creates the web service and a 1 GB disk mounted at
   `/var/data`, and asks for the secret env vars.

3. Fill in the prompted values:

   | Key | Value |
   | --- | --- |
   | `ADMIN_EMAIL` | your admin login email |
   | `ADMIN_PASSWORD` | a strong password |
   | `RESEND_API_KEY` | optional — needed to send replies from the admin |
   | `ENQUIRY_FROM_EMAIL` | optional — e.g. `KAYTHEBOSS <hello@kaytheboss.studio>` |
   | `ENQUIRY_TO_EMAIL` | optional — defaults to `commissions@kaytheboss.studio` |

   `ADMIN_*` are only read while the database has no users, so changing them
   later does nothing. To reset the password, run
   `npm run user:passwd <email> <new-password>` from the Render shell.

4. Each deploy runs:

   ```
   npm ci
   npm run db:migrate      # apply Drizzle migrations
   npm run db:bootstrap    # seed content + first admin user, no-op after that
   npm start               # listens on 0.0.0.0:$PORT
   ```

   On the first boot the log shows `[bootstrap] seeded 5 case studies, …` and
   `[bootstrap] created admin user …`; later deploys log
   `[bootstrap] nothing to do`. Health check: `/api/health`.

   Migrations run inside the start command on purpose: Render's alternative
   (`preDeployCommand`) runs on a separate instance **without the disk**, so
   it could not see `/var/data/kaytheboss.db`. The trade-off is that a deploy
   briefly restarts the admin (a disk also disables zero-downtime deploys);
   the public site on Vercel is unaffected.

5. Open `https://<service>.onrender.com/admin` — use the **https** URL.
   In production the session cookie is `Secure`, so logging in over plain
   http silently fails.

6. On Vercel, set `CONTENT_API_URL=https://<service>.onrender.com` (origin
   only, no `/api`) and redeploy. The build then bakes the current database
   content into the site, and the commission form posts enquiries to Render.

**Local development is unaffected.** With no `DATABASE_URL`/`MEDIA_DIR` set,
everything still uses `../data/kaytheboss.db` and `../public/media/`.

**Two deployment gaps to know about**

- **Media.** Admin uploads are written to `MEDIA_DIR` (`/var/data/media` on
  Render) and served from `https://<service>.onrender.com/media/<file>`. The
  static site on Vercel does not copy that folder, so images uploaded in the
  admin will not appear on the live site. Either point image fields at the
  Render media URLs directly, or keep media in the repo.
- **Content is baked at build time.** Editing work or journal in the admin
  updates the API immediately, but the public site only changes on the next
  Vercel build. Trigger a redeploy (or push a commit) after content edits.
