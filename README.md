# ReelVocab

Vocabulary-first learning from film/series subtitles. Admins upload subtitles, the system extracts terms, generates Bangla meanings, and learners practice with MCQ quizzes. Built on Cloudflare (D1/R2/Queues) with Next.js + OpenNext.

## Goals
- Build a subtitle-to-vocabulary pipeline for language learners.
- Keep meanings accurate, with admin review and user reporting.
- Track learning progress (new/learned/weak) and enable quiz practice.

## Stack
- Next.js App Router (OpenNext Cloudflare adapter)
- Cloudflare D1 (data), R2 (subtitle storage), Queues (background processing)
- Tailwind CSS v4
- wink-nlp for tokenization/POS
- Google Translate API (Bangla meanings) with monthly usage tracking

## Core Flow
1) Admin uploads subtitle file on `/subtitles`
2) File saved to R2 and queued
3) Worker queue parses subtitle into:
   - `subtitle_files`, `vocab_terms`, `vocab_occurrences`
4) Admin runs “Process meanings” to fetch Bangla meanings and store:
   - `translation_cache` (cache)
   - `vocabulary` (surface + lemma + POS + meaning)
5) Learners open episode page:
   - See words, meanings, examples
   - MCQ quiz updates learned/weak status
6) Quiz users can report wrong meanings with a suggested correction
7) Admin reviews reported words and applies suggestions or edits manually

## Features
- Surface form + lemma per term
- Per-user status: new/learned/weak
- MCQ quiz with weighted selection
- Corruption flagging to hide bad meanings for normal users
- Admin filters: corrupt only, reported only
- Report workflow from quiz (with suggested meaning)

## Local Setup
1) Install dependencies
```
npm install
```

2) Create Cloudflare resources (names referenced in `wrangler.jsonc`)
```
wrangler d1 create vocab-db
wrangler r2 create vocab-subtitles
wrangler queues create vocab-subtitles-queue
```

3) Update `wrangler.jsonc` with your D1 database_id.

4) Apply local migrations + seed
```
npm run migrate:local
```

5) Start local worker-style dev
```
npm run dev:cf
```

For plain Next dev (no Cloudflare bindings), `npm run dev` works but the upload/queue features will not.

## Deployment
```
npm run deploy
```

## Environment Variables
Set these as Cloudflare Worker secrets/vars:

Required
- `GOOGLE_TRANSLATE_API_KEY`

Optional
- `GOOGLE_TRANSLATE_PROJECT_ID` (kept for reference)
- `GOOGLE_TRANSLATE_MONTHLY_CHAR_LIMIT` (default 500,000)

## Database (D1)
Key tables:
- `subtitle_files` – uploaded subtitle metadata
- `vocab_terms` – deduped terms
- `vocab_occurrences` – per-episode occurrences, examples, overrides
- `vocabulary` – canonical meaning by surface/pos
- `translation_cache` – cached meaning per term+pos
- `word_status` / `user_lemma_status` – per-user progress
- `user_quiz_stats` – per-user quiz analytics
- `vocab_reports` – user reports from quiz

### Migrations
Run locally with:
```
npm run migrate:local
```

For production, run the specific migration file (example):
```
wrangler d1 execute vocab-db --remote --file migrations/0011_vocab_reports.sql
```

## Admin Actions
- `/subtitles`: upload, delete packs, check/process meanings
- `/usage`: monthly translation usage
- Episode page (admin):
  - Filters: corrupt only, reported only
  - Edit words, apply suggestions, resolve, delete

## Testing
Run lightweight tests (utility correctness):
```
npm test
```

## Useful Commands
- `npm run dev:cf` – dev with Cloudflare bindings
- `npm run preview` – build + serve via OpenNext worker locally
- `npm run deploy` – deploy to Cloudflare
- `npm run migrate:local` – apply schema + seed to local D1

## Project Structure
- `src/app/(admin)` – admin pages
- `src/app/(learn)` – learner pages and quiz UI
- `src/app/api` – API routes
- `src/domain` – core processing/meaning logic
- `src/lib` – shared helpers, D1 helpers, subtitle pipeline

