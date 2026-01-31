export type VocabularyRecord = {
	surfaceTerm: string;
	lemma: string;
	pos: string;
	exampleSentence: string;
	meaningBn: string;
	isCorrupt?: number;
};

type D1Result = {
	success: boolean;
};

type D1PreparedStatement = {
	bind: (...values: unknown[]) => D1PreparedStatement;
	first: <T = Record<string, unknown>>(column?: string) => Promise<T | null>;
	run: () => Promise<D1Result>;
};

export type D1Database = {
	prepare: (query: string) => D1PreparedStatement;
};

export const getCachedTranslation = async (
	db: D1Database,
	cacheKey: string,
): Promise<string | null> => {
	const row = await db
		.prepare(
			"SELECT meaning_bn as meaningBn FROM translation_cache WHERE cache_key = ?1",
		)
		.bind(cacheKey)
		.first<{ meaningBn: string }>();

	return row?.meaningBn ?? null;
};

export const setCachedTranslation = async (
	db: D1Database,
	cacheKey: string,
	meaningBn: string,
): Promise<void> => {
	await db
		.prepare(
			"INSERT INTO translation_cache (cache_key, meaning_bn) VALUES (?1, ?2) ON CONFLICT(cache_key) DO UPDATE SET meaning_bn = excluded.meaning_bn, updated_at = CURRENT_TIMESTAMP",
		)
		.bind(cacheKey, meaningBn)
		.run();
};

export const saveVocabularyEntry = async (
	db: D1Database,
	entry: VocabularyRecord,
): Promise<void> => {
	const isCorrupt = entry.isCorrupt ?? 0;
	await db
		.prepare(
			"INSERT INTO vocabulary (surface_term, lemma, pos, example_sentence, meaning_bn, is_corrupt) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(surface_term, pos) DO UPDATE SET meaning_bn = excluded.meaning_bn, is_corrupt = excluded.is_corrupt, updated_at = CURRENT_TIMESTAMP",
		)
		.bind(
			entry.surfaceTerm,
			entry.lemma,
			entry.pos,
			entry.exampleSentence,
			entry.meaningBn,
			isCorrupt,
		)
		.run();
};
