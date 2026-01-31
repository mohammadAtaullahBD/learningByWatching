PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_lemma_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  lemma TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, lemma)
);

CREATE INDEX IF NOT EXISTS idx_user_lemma_status_user
  ON user_lemma_status (user_id, status);

CREATE TABLE IF NOT EXISTS user_quiz_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  episode_id TEXT NOT NULL,
  term TEXT NOT NULL,
  seen_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT,
  UNIQUE (user_id, content_id, episode_id, term)
);

CREATE INDEX IF NOT EXISTS idx_user_quiz_stats_scope
  ON user_quiz_stats (user_id, content_id, episode_id);

INSERT OR IGNORE INTO user_lemma_status (user_id, lemma, status, updated_at)
SELECT
  ws.user_id,
  COALESCE(MAX(o.lemma), ws.term) as lemma,
  'learned' as status,
  MAX(ws.updated_at) as updated_at
FROM word_status ws
LEFT JOIN vocab_occurrences o
  ON o.term = ws.term
  AND o.content_id = ws.content_id
  AND o.episode_id = ws.episode_id
WHERE ws.status = 'learned'
GROUP BY ws.user_id, ws.term;
