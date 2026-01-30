PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS translation_usage (
  month_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  char_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (month_key, provider)
);
