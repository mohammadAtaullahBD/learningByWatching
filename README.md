# ReelVocab (Cloudflare + OpenNext)

Vocabulary-first learning from film/series subtitles. Runs on Cloudflare (D1, R2, Queues, Workers AI) via OpenNext.

## Stack
- Next.js App Router (edge runtime where data is used)
- OpenNext Cloudflare adapter
- Cloudflare D1 (vocab + progress), R2 (subtitle files), Queues (async parsing), Workers AI (Bangla meanings)
- Tailwind CSS v4
- wink-nlp for tokenization/POS tagging (Workers compatible)

## Quick start (local worker-style dev)
1) Install deps: `npm install`
2) Create Cloudflare resources (names below are referenced in `wrangler.jsonc`):
   - D1: `wrangler d1 create vocab-db` → copy `database_id` into `wrangler.jsonc`
   - R2: `wrangler r2 create vocab-subtitles`
   - Queue: `wrangler queues create vocab-subtitles-queue`
3) Bind them in `wrangler.jsonc` (already templated; just replace `REPLACE_WITH_DB_ID` if needed).
4) Generate env types (optional): `npm run cf-typegen`
5) Run migrations + seed locally: `npm run migrate:local`
6) Run with Cloudflare runtime bindings: `npm run dev:cf`
   - Alternatively, `npm run preview` to build then serve through the worker.

For plain Next dev (no bindings), `npm run dev` works but API upload will 500 because R2/Queue/D1 aren’t bound.

## Deployment
```
npm run deploy   # build via OpenNext and push to Cloudflare
```
Ensure your account has the same-named resources or adjust `wrangler.jsonc`.

## Environment / secrets
- Workers AI: set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` as secrets (`wrangler secret put ...`).
- Optional: set `WORKERS_AI_DAILY_CHAR_LIMIT` in `wrangler.jsonc` (estimated chars, default 10,000).

## Data flow
1) Admin uploads subtitle → `/api/subtitles/upload`
2) File stored in R2, job enqueued to `SUBTITLE_QUEUE`
3) Worker `queue` handler calls `handleSubtitleQueue`:
   - Fetch subtitle from R2
   - Parse sentences/terms, store into D1 (`subtitle_files`, `vocab_terms`, `vocab_occurrences`)
4) Meaning lookup (Bangla) uses Workers AI and caches in `translation_cache` + `vocabulary`.
5) Learn pages read from D1 and render vocab per episode/content.

## Migrations
- `migrations/0002_vocab_schema.sql` — authoritative schema aligned to the current code
- `migrations/0003_seed.sql` — demo data for Friends/Office, plus sample vocab
Run with: `npm run migrate:local` (uses `DB_NAME` env var, default `vocab-db`).

## Manual steps you still need
- Create Cloudflare resources (D1/R2/Queue) and update `wrangler.jsonc` IDs.
- Add secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`.
- If deploying, run `npm run deploy` after the above.

## Current limitations / next actions
- Processing status page still uses static data; can be wired to `subtitle_files` and queue dead-letter info.
- User auth/progress is not implemented; D1 tables exist for vocab, not per-user tracking yet.
- No UI yet for marking “learned/weak”; buttons are present but not wired to persistence.

## Useful commands
- `npm run dev:cf` – dev with Cloudflare bindings
- `npm run preview` – build + serve via OpenNext worker locally
- `npm run deploy` – push to Cloudflare
- `npm run migrate:local` – apply schema + seed to local D1
- `npm run cf-typegen` – regenerate `cloudflare-env.d.ts`
