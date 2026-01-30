PRAGMA foreign_keys = ON;

ALTER TABLE vocab_occurrences ADD COLUMN pos TEXT;

CREATE TABLE IF NOT EXISTS word_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT 'default',
  content_id TEXT NOT NULL,
  episode_id TEXT NOT NULL,
  term TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, content_id, episode_id, term)
);

CREATE INDEX IF NOT EXISTS idx_word_status_content_episode
  ON word_status (content_id, episode_id, status);
