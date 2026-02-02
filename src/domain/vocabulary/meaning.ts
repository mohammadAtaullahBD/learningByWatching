import {
  D1Database,
  getCachedTranslation,
  saveVocabularyEntry,
  setCachedTranslation,
} from "./db";
import { buildMonthKey } from "@/lib/vocab-utils";

export type GoogleTranslateEnv = {
  GOOGLE_TRANSLATE_PROJECT_ID?: string;
  GOOGLE_TRANSLATE_API_KEY?: string;
  GOOGLE_TRANSLATE_LOCATION?: string;
  GOOGLE_TRANSLATE_DAILY_CHAR_LIMIT?: string;
  GOOGLE_TRANSLATE_MONTHLY_CHAR_LIMIT?: string;
};

type MeaningRequest = {
  db: D1Database;
  surfaceTerm: string;
  lemma: string;
  pos: string;
  exampleSentence: string;
  env: GoogleTranslateEnv;
};

type MeaningResponse = {
  meaningBn: string;
  source: "cache" | "api";
  changed: boolean;
};

type UsageRow = {
  char_count: number;
};

const buildCacheKey = (surfaceTerm: string, pos: string): string =>
  `${surfaceTerm.toLowerCase()}::${pos.toLowerCase()}`;

const extractTranslatedText = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as {
    data?: { translations?: Array<{ translatedText?: string }> };
  };

  return data.data?.translations?.[0]?.translatedText ?? null;
};

const sanitizeMeaning = (value: string): string => value;

const fetchMeaningFromGoogleTranslate = async (
  surfaceTerm: string,
  _lemma: string,
  _pos: string,
  _sentence: string,
  env: GoogleTranslateEnv,
): Promise<string> => {
  const apiKey = env.GOOGLE_TRANSLATE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing GOOGLE_TRANSLATE_API_KEY for Google Translate call.");
  }

  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`;
  const body = {
    q: surfaceTerm,
    source: "en",
    target: "bn",
    format: "text",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `Google Translate request failed with status ${response.status}. ${details}`,
    );
  }

  const payload = (await response.json()) as unknown;
  const errorPayload = payload as { error?: { message?: string } };
  if (errorPayload.error?.message) {
    throw new Error(`Google Translate request failed: ${errorPayload.error.message}`);
  }
  const text = extractTranslatedText(payload);
  if (!text) {
    throw new Error("Google Translate response did not include text.");
  }

  return sanitizeMeaning(text);
};

const getMonthlyUsage = async (
  db: D1Database,
  monthKey: string,
  provider: string,
): Promise<number> => {
  const monthRow = await db
    .prepare(
      "SELECT char_count as char_count FROM translation_usage WHERE month_key = ?1 AND provider = ?2",
    )
    .bind(monthKey, provider)
    .first<UsageRow>();
  if (monthRow?.char_count !== undefined && monthRow?.char_count !== null) {
    return monthRow.char_count;
  }

  // Backward-compat: previous versions stored daily keys like YYYY-MM-DD.
  const likePattern = `${monthKey}-%`;
  const sumRow = await db
    .prepare(
      "SELECT COALESCE(SUM(char_count), 0) as char_count FROM translation_usage WHERE month_key LIKE ?1 AND provider = ?2",
    )
    .bind(likePattern, provider)
    .first<UsageRow>();
  return sumRow?.char_count ?? 0;
};

const incrementUsage = async (
  db: D1Database,
  monthKey: string,
  provider: string,
  delta: number,
): Promise<void> => {
  const existing = await getMonthlyUsage(db, monthKey, provider);
  const nextTotal = existing + delta;
  await db
    .prepare(
      `INSERT INTO translation_usage (month_key, provider, char_count, updated_at)
       VALUES (?1, ?2, ?3, datetime('now'))
       ON CONFLICT(month_key, provider) DO UPDATE SET
         char_count = ?3,
         updated_at = datetime('now')`,
    )
    .bind(monthKey, provider, nextTotal)
    .run();
};

const ensureWithinLimit = async (
  db: D1Database,
  provider: string,
  charCount: number,
  limit: number,
): Promise<void> => {
  const monthKey = buildMonthKey();
  const used = await getMonthlyUsage(db, monthKey, provider);
  if (used + charCount > limit) {
    throw new Error("Monthly Google Translate limit reached.");
  }
  await incrementUsage(db, monthKey, provider, charCount);
};

const fetchMeaning = async (
  surfaceTerm: string,
  lemma: string,
  pos: string,
  sentence: string,
  env: GoogleTranslateEnv,
  db: D1Database,
): Promise<{ meaning: string; isCorrupt: boolean }> => {
  const limit = Number(env.GOOGLE_TRANSLATE_MONTHLY_CHAR_LIMIT ?? "500000");
  const estimatedChars = surfaceTerm.length;
  await ensureWithinLimit(db, "google-translate", estimatedChars, limit);
  const meaning = await fetchMeaningFromGoogleTranslate(
    surfaceTerm,
    lemma,
    pos,
    sentence,
    env,
  );
  return { meaning, isCorrupt: false };
};

export const getMeaningAndPersist = async (
  request: MeaningRequest,
): Promise<MeaningResponse> => {
  const { db, surfaceTerm, lemma, pos, exampleSentence, env } = request;
  const cacheKey = buildCacheKey(surfaceTerm, pos);
  const cached = await getCachedTranslation(db, cacheKey);

  if (cached) {
    const cachedMeaning = sanitizeMeaning(cached);
    await saveVocabularyEntry(db, {
      surfaceTerm,
      lemma,
      pos,
      exampleSentence,
      meaningBn: cachedMeaning,
      isCorrupt: 0,
    });
    return { meaningBn: cachedMeaning, source: "cache", changed: false };
  }

  const { meaning, isCorrupt } = await fetchMeaning(
    surfaceTerm,
    lemma,
    pos,
    exampleSentence,
    env,
    db,
  );
  await setCachedTranslation(db, cacheKey, meaning);
  await saveVocabularyEntry(db, {
    surfaceTerm,
    lemma,
    pos,
    exampleSentence,
    meaningBn: meaning,
    isCorrupt: isCorrupt ? 1 : 0,
  });

  return { meaningBn: meaning, source: "api", changed: isCorrupt };
};
