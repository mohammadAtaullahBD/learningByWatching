PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS subtitle_files;
DROP TABLE IF EXISTS vocab_terms;
DROP TABLE IF EXISTS vocab_occurrences;
DROP TABLE IF EXISTS translation_cache;
DROP TABLE IF EXISTS vocabulary;

CREATE TABLE IF NOT EXISTS subtitle_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id TEXT NOT NULL,
  episode_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  status TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  processed_at TEXT,
  sentence_count INTEGER NOT NULL DEFAULT 0,
  term_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (content_id, episode_id)
);

CREATE TABLE IF NOT EXISTS vocab_terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vocab_occurrences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL,
  content_id TEXT NOT NULL,
  episode_id TEXT NOT NULL,
  sentence TEXT,
  sentence_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS translation_cache (
  cache_key TEXT PRIMARY KEY,
  meaning_bn TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vocabulary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lemma TEXT NOT NULL,
  pos TEXT NOT NULL,
  example_sentence TEXT NOT NULL,
  meaning_bn TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (lemma, pos, example_sentence)
);

CREATE INDEX IF NOT EXISTS idx_vocab_occurrences_episode_term
  ON vocab_occurrences (content_id, episode_id, term);
