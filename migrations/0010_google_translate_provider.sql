PRAGMA foreign_keys = ON;

INSERT INTO translation_usage (month_key, provider, char_count, updated_at)
SELECT
  month_key,
  'google-translate' as provider,
  SUM(char_count) as char_count,
  datetime('now') as updated_at
FROM translation_usage
WHERE provider IN ('workers-ai', 'google-translate')
GROUP BY month_key
ON CONFLICT(month_key, provider) DO UPDATE SET
  char_count = excluded.char_count,
  updated_at = excluded.updated_at;

DELETE FROM translation_usage WHERE provider = 'workers-ai';
