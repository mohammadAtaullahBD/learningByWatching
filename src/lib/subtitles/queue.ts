import type { GoogleTranslateEnv } from "@/domain/vocabulary/meaning";
import { parseSubtitleText } from "./processing";

export type SubtitleUploadJob = {
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

type ProcessingEnv = GoogleTranslateEnv & { VOCAB_DB: D1Database };

type TokenOccurrence = {
  term: string;
  lemma: string;
  pos: string;
  sentence: string;
  index: number;
};

const wordPattern = /[A-Za-zÀ-ÖØ-öø-ÿ']+/;

const normalizeToken = (value: string): string => value.toLowerCase();

const isWordToken = (value: string, type?: string): boolean => {
  if (type && type.toLowerCase() !== "word") {
    return false;
  }
  return wordPattern.test(value);
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
  lemma: string,
  pos: string,
  sentence: string,
  index: number,
  now: string,
) =>
  db
    .prepare(
      `INSERT INTO vocab_occurrences (
        term,
        lemma,
        pos,
        content_id,
        episode_id,
        sentence,
        sentence_index,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(term, lemma, pos, job.contentId, job.episodeId, sentence, index, now);

const buildTokenData = async (sentences: string[]) => {
  const { analyzeSentence } = await import("@/domain/vocabulary/nlp");
  const occurrences: TokenOccurrence[] = [];
  const termSet = new Set<string>();
  const vocabExamples = new Map<
    string,
    { surfaceTerm: string; lemma: string; pos: string; sentence: string }
  >();

  for (let sentenceIndex = 0; sentenceIndex < sentences.length; sentenceIndex += 1) {
    const sentence = sentences[sentenceIndex];
    const { tokens } = await analyzeSentence(sentence);
    for (const token of tokens) {
      if (!isWordToken(token.value, token.type)) {
        continue;
      }
      const surfaceTerm = normalizeToken(token.value);
      const lemma = normalizeToken(token.lemma || token.value);
      if (surfaceTerm.length <= 1) {
        continue;
      }
      const pos = token.pos ? token.pos.toLowerCase() : "unknown";
      termSet.add(surfaceTerm);
      occurrences.push({ term: surfaceTerm, lemma, pos, sentence, index: sentenceIndex });

      const key = `${surfaceTerm}::${pos}`;
      if (!vocabExamples.has(key)) {
        vocabExamples.set(key, { surfaceTerm, lemma, pos, sentence });
      }
    }
  }

  return { occurrences, termSet, vocabExamples };
};

export const processSubtitleText = async (
  job: SubtitleUploadJob,
  text: string,
  env: ProcessingEnv,
): Promise<{ sentenceCount: number; termCount: number }> => {
  const { VOCAB_DB } = env;
  const parsed = parseSubtitleText(text);
  const { occurrences, termSet, vocabExamples } = await buildTokenData(parsed.sentences);
  const now = new Date().toISOString();

  const statements: D1PreparedStatement[] = [];
  statements.push(
    insertSubtitleFile(VOCAB_DB, job, now, parsed.sentences.length, termSet.size),
  );

  for (const term of termSet) {
    statements.push(insertVocabTerm(VOCAB_DB, term, now));
  }

  for (const occurrence of occurrences) {
    statements.push(
      insertOccurrence(
        VOCAB_DB,
        job,
        occurrence.term,
        occurrence.lemma,
        occurrence.pos,
        occurrence.sentence,
        occurrence.index,
        now,
      ),
    );
  }

  if (statements.length > 0) {
    for (let i = 0; i < statements.length; i += 100) {
      await VOCAB_DB.batch(statements.slice(i, i + 100));
    }
  }

  // Meanings are now generated on-demand via the admin action.

  return { sentenceCount: parsed.sentences.length, termCount: termSet.size };
};

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
      await processSubtitleText(job, text, env as ProcessingEnv);
      message.ack();
    } catch (error) {
      message.retry();
    }
  }
};
