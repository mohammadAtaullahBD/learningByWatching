PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('movie', 'series')),
  title TEXT NOT NULL,
  synopsis TEXT,
  release_year INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id INTEGER NOT NULL,
  number INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (series_id, number),
  FOREIGN KEY (series_id) REFERENCES contents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  synopsis TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (season_id, number),
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subtitle_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  parsed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vocab_terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lemma TEXT NOT NULL,
  pos TEXT NOT NULL,
  meaning_bn TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (lemma, pos)
);

CREATE TABLE IF NOT EXISTS vocab_occurrences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term_id INTEGER NOT NULL,
  episode_id INTEGER NOT NULL,
  example_sentence TEXT,
  frequency INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (term_id) REFERENCES vocab_terms(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auth_identity TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_word_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  term_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, term_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES vocab_terms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  scope_type TEXT NOT NULL,
  scope_id INTEGER NOT NULL,
  progress_pct REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vocab_terms_lemma_pos
  ON vocab_terms (lemma, pos);

CREATE INDEX IF NOT EXISTS idx_vocab_occurrences_episode_term
  ON vocab_occurrences (episode_id, term_id);
