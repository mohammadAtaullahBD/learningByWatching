PRAGMA foreign_keys = ON;

INSERT INTO subtitle_files (
  content_id,
  episode_id,
  r2_key,
  file_name,
  file_type,
  status,
  uploaded_at,
  processed_at,
  sentence_count,
  term_count
) VALUES
  (
    'friends',
    'friends-ep1',
    'subtitles/friends/friends-ep1.vtt',
    'Friends.S01E01.vtt',
    'text/vtt',
    'processed',
    datetime('now', '-2 day'),
    datetime('now', '-2 day'),
    18,
    12
  ),
  (
    'office',
    'office-ep1',
    'subtitles/office/office-ep1.vtt',
    'Office.S01E01.vtt',
    'text/vtt',
    'processed',
    datetime('now', '-1 day'),
    datetime('now', '-1 day'),
    22,
    16
  );

INSERT INTO vocab_terms (term, created_at, updated_at) VALUES
  ('awkward', datetime('now', '-2 day'), datetime('now', '-1 day')),
  ('gesture', datetime('now', '-2 day'), datetime('now', '-1 day')),
  ('deadline', datetime('now', '-2 day'), datetime('now', '-1 day')),
  ('legendary', datetime('now', '-2 day'), datetime('now', '-1 day')),
  ('office', datetime('now', '-2 day'), datetime('now', '-1 day')),
  ('prank', datetime('now', '-2 day'), datetime('now', '-1 day'));

INSERT INTO vocab_occurrences (
  term,
  content_id,
  episode_id,
  sentence,
  sentence_index,
  created_at
) VALUES
  ('awkward', 'friends', 'friends-ep1', 'That was awkward, but we handled it.', 3, datetime('now', '-2 day')),
  ('gesture', 'friends', 'friends-ep1', 'She made a kind gesture to break the silence.', 5, datetime('now', '-2 day')),
  ('legendary', 'friends', 'friends-ep1', 'This story is legendary among the group.', 9, datetime('now', '-2 day')),
  ('office', 'office', 'office-ep1', 'Welcome to the office where chaos lives.', 2, datetime('now', '-1 day')),
  ('deadline', 'office', 'office-ep1', 'We cannot miss this deadline again.', 6, datetime('now', '-1 day')),
  ('prank', 'office', 'office-ep1', 'The prank went too far this time.', 12, datetime('now', '-1 day'));

INSERT INTO vocabulary (lemma, pos, example_sentence, meaning_bn) VALUES
  ('awkward', 'adjective', 'That was awkward, but we handled it.', 'বিব্রতকর'),
  ('gesture', 'noun', 'She made a kind gesture to break the silence.', 'ইঙ্গিত বা সদয় কাজ'),
  ('legendary', 'adjective', 'This story is legendary among the group.', 'কিংবদন্তি-সদৃশ'),
  ('office', 'noun', 'Welcome to the office where chaos lives.', 'অফিস'),
  ('deadline', 'noun', 'We cannot miss this deadline again.', 'শেষ সময়সীমা'),
  ('prank', 'noun', 'The prank went too far this time.', 'ঠাট্টা বা প্র্যাঙ্ক');
