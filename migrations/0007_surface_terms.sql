PRAGMA foreign_keys = ON;

ALTER TABLE vocab_occurrences ADD COLUMN lemma TEXT;
ALTER TABLE vocab_occurrences ADD COLUMN meaning_bn_override TEXT;

UPDATE vocab_occurrences SET lemma = term WHERE lemma IS NULL;

CREATE TABLE IF NOT EXISTS vocabulary_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surface_term TEXT NOT NULL,
  lemma TEXT NOT NULL,
  pos TEXT NOT NULL,
  example_sentence TEXT NOT NULL,
  meaning_bn TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surface_term, pos)
);

INSERT INTO vocabulary_new (surface_term, lemma, pos, example_sentence, meaning_bn, created_at, updated_at)
SELECT lemma, lemma, pos, example_sentence, meaning_bn, created_at, updated_at
FROM vocabulary;

DROP TABLE vocabulary;
ALTER TABLE vocabulary_new RENAME TO vocabulary;
