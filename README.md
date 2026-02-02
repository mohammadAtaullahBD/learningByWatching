# ReelVocab

Vocabulary-first learning from film/series subtitles. Admins upload subtitles, the system extracts terms, generates Bangla meanings, and learners practice with MCQ quizzes. Built on Cloudflare (D1/R2/Queues) with Next.js + OpenNext.

## Goals
- Turn subtitles into a clean, reviewable vocabulary library.
- Help learners move words from new → learned with quick quizzes and feedback loops.
- Keep meanings accurate through admin review, user reports, and usage limits.

## Achievements
- End-to-end subtitle pipeline: upload → parse → store → learn.
- Admin meaning workflow with caching and monthly usage tracking.
- Per-user progress tracking with learned/weak status and quiz stats.
- Lightweight Cloudflare-first deployment with queue-ready processing.

## Current Features
- Subtitle upload to R2 with processing status tracking.
- NLP tokenization (lemma + POS) with per-episode occurrences and examples.
- On-demand Bangla meanings via Google Translate with cache + usage limits.
- Learner dashboard with overall progress and series/episode entry points.
- Episode vocab list with POS filter and repeat-frequency sorting.
- MCQ quiz with weighted selection and per-user stats.
- Report wrong meanings directly from the quiz with suggestions.
- Admin review tools: edit meaning/lemma/POS, apply suggestions, hide corrupt entries.
- Dark mode toggle with system preference support.

## Stack
- Next.js App Router (OpenNext Cloudflare adapter)
- Cloudflare D1 (data), R2 (subtitle storage), Queues (background processing)
- Tailwind CSS v4
- wink-nlp for tokenization/POS
- Google Translate API (Bangla meanings) with monthly usage tracking

## Core Flow
1) Admin uploads subtitle file on `/subtitles`.
2) File saved to R2 and queued for processing.
3) Worker parses subtitle into:
   - `subtitle_files`, `vocab_terms`, `vocab_occurrences`
4) Admin runs “Process meanings” to fetch Bangla meanings and store:
   - `translation_cache` (cache)
   - `vocabulary` (surface + lemma + POS + meaning)
5) Learners open episode page:
   - See words, meanings, examples, POS tags, repeat counts
   - MCQ quiz updates learned/weak status
6) Users can report wrong meanings after a quiz answer.
7) Admin reviews reported words and applies suggestions or edits manually.

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

## Admin Areas
- `/subtitles`: upload, delete packs, check/process meanings
- `/processing`: recent subtitle processing status
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

## Roadmap (Next)
- Subtitle library improvements: search, filters, pagination, bulk actions.
- Meaning QA and reprocess tools for fast corrections.
- Learning upgrades: spaced repetition, review queue, progress charts.
- Better processing visibility: logs, metrics, and retry insights.

## Project Structure
- `src/app/(admin)` – admin pages
- `src/app/(learn)` – learner pages and quiz UI
- `src/app/api` – API routes
- `src/domain` – core processing/meaning logic
- `src/lib` – shared helpers, D1 helpers, subtitle pipeline
