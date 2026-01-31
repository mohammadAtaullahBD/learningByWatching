PRAGMA foreign_keys = ON;

ALTER TABLE vocab_occurrences ADD COLUMN is_corrupt_override INTEGER;
ALTER TABLE vocabulary ADD COLUMN is_corrupt INTEGER NOT NULL DEFAULT 0;

UPDATE vocabulary
SET is_corrupt = 1
WHERE meaning_bn LIKE '%�%';

UPDATE vocab_occurrences
SET is_corrupt_override = 1
WHERE meaning_bn_override LIKE '%�%';
