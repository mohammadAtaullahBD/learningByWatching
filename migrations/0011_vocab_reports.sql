CREATE TABLE IF NOT EXISTS vocab_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id TEXT NOT NULL,
  episode_id TEXT NOT NULL,
  term TEXT NOT NULL,
  observed_meaning TEXT,
  suggested_meaning TEXT,
  reporter_id TEXT,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_vocab_reports_term_open
  ON vocab_reports(content_id, episode_id, term, resolved_at);

CREATE INDEX IF NOT EXISTS idx_vocab_reports_open
  ON vocab_reports(resolved_at, created_at);
