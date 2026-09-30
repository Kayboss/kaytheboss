# KAYTHEBOSS Admin (Sanity Studio)

Content management for **work projects** and **journal posts**. The static site in the
repo root builds from these docs.

## One-time setup (you do this)

1. Create a free project at https://www.sanity.io/manage
2. `npm install` in this folder
3. Copy `.env.example` → `.env` and paste your Project ID / dataset
4. `npm run dev` → logs you in and opens the studio at http://localhost:3333
5. (Optional, to edit from a phone) `npm run deploy` publishes the studio to a public URL

## Daily editing

- `npm run dev`, edit in the browser, hit **Publish**. That's it.
- Images: upload any image directly in the studio (drag & drop into the image field).

## How the site gets new content

The build in the repo root pulls from this CMS when **`SANITY_PROJECT_ID`** is set,
otherwise it falls back to the local `content/*.json` files (existing behaviour).

- **Local preview:** `npm run preview` uses the JSON files until you set the env var.
- **Deployed (Vercel):** set `SANITY_PROJECT_ID`, `SANITY_DATASET`, and optionally
  `SANITY_API_TOKEN` in the Vercel dashboard. After that, every `Publish` is picked up
  on the next deploy.

## Schema notes

- `workProject` → `/work/<slug>.html` (cards, case study page)
- `journalPost` → `/journal/<slug>.html` (list, article page). The article body is the
  "rich text" editor — paragraphs, headings, quotes and lists carry over automatically.
- `siteSettings` is reserved for site-wide fields (nav etc.) but is **not yet wired into
  the build** — the local `content/site.json` still controls that.