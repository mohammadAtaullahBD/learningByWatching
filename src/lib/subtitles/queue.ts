import { parseSubtitleText } from "./processing";

type SubtitleUploadJob = {
  key: string;
  contentId: string;
  episodeId: string;
  fileName: string;
  contentType: string;
};

type SubtitleQueueEnv = CloudflareEnv & {
  SUBTITLE_BUCKET: R2Bucket;
  VOCAB_DB: D1Database;
};

const insertSubtitleFile = (
  db: D1Database,
  job: SubtitleUploadJob,
  now: string,
  sentenceCount: number,
  termCount: number,
) =>
  db
    .prepare(
      `INSERT INTO subtitle_files (
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(content_id, episode_id) DO UPDATE SET
        r2_key = excluded.r2_key,
        file_name = excluded.file_name,
        file_type = excluded.file_type,
        status = excluded.status,
        processed_at = excluded.processed_at,
        sentence_count = excluded.sentence_count,
        term_count = excluded.term_count`,
    )
    .bind(
      job.contentId,
      job.episodeId,
      job.key,
      job.fileName,
      job.contentType,
      "processed",
      now,
      now,
      sentenceCount,
      termCount,
    );

const insertVocabTerm = (db: D1Database, term: string, now: string) =>
  db
    .prepare(
      `INSERT INTO vocab_terms (term, created_at, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(term) DO UPDATE SET updated_at = excluded.updated_at`,
    )
    .bind(term, now, now);

const insertOccurrence = (
  db: D1Database,
  job: SubtitleUploadJob,
  term: string,
  sentence: string,
  index: number,
  now: string,
) =>
  db
    .prepare(
      `INSERT INTO vocab_occurrences (
        term,
        content_id,
        episode_id,
        sentence,
        sentence_index,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(term, job.contentId, job.episodeId, sentence, index, now);

export const handleSubtitleQueue = async (
  batch: MessageBatch<SubtitleUploadJob>,
  env: SubtitleQueueEnv,
): Promise<void> => {
  const { SUBTITLE_BUCKET, VOCAB_DB } = env;

  for (const message of batch.messages) {
    try {
      const job = message.body;
      const object = await SUBTITLE_BUCKET.get(job.key);

      if (!object) {
        message.retry();
        continue;
      }

      const text = await object.text();
      const parsed = parseSubtitleText(text);
      const now = new Date().toISOString();

      const statements: D1PreparedStatement[] = [];
      statements.push(
        insertSubtitleFile(
          VOCAB_DB,
          job,
          now,
          parsed.sentences.length,
          parsed.terms.length,
        ),
      );

      for (const term of parsed.terms) {
        statements.push(insertVocabTerm(VOCAB_DB, term, now));
      }

      for (const occurrence of parsed.occurrences) {
        statements.push(
          insertOccurrence(
            VOCAB_DB,
            job,
            occurrence.term,
            occurrence.sentence,
            occurrence.index,
            now,
          ),
        );
      }

      if (statements.length > 0) {
        await VOCAB_DB.batch(statements);
      }
      message.ack();
    } catch (error) {
      message.retry();
    }
  }
};
