import {
	D1Database,
	getCachedTranslation,
	saveVocabularyEntry,
	setCachedTranslation,
} from "./db";

export type WorkersAiEnv = {
	CLOUDFLARE_ACCOUNT_ID?: string;
	CLOUDFLARE_API_TOKEN?: string;
	WORKERS_AI_DAILY_CHAR_LIMIT?: string;
};

type MeaningRequest = {
	db: D1Database;
	surfaceTerm: string;
	lemma: string;
	pos: string;
	exampleSentence: string;
	env: WorkersAiEnv;
};

type MeaningResponse = {
	meaningBn: string;
	source: "cache" | "api";
};

type UsageRow = {
	char_count: number;
};

const buildCacheKey = (surfaceTerm: string, pos: string): string =>
	`${surfaceTerm.toLowerCase()}::${pos.toLowerCase()}`;

const extractResponseText = (payload: unknown): string | null => {
	if (!payload || typeof payload !== "object") {
		return null;
	}

	const data = payload as {
		result?: { response?: string };
		response?: string;
		output?: string;
	};

	return data.result?.response ?? data.response ?? data.output ?? null;
};

const sanitizeMeaning = (value: string): string => {
	// Strip BOM, replacement chars, and control chars that can corrupt display.
	return value
		.replace(/^\uFEFF/, "")
		.replace(/\uFFFD/g, "")
		.replace(/[\u0000-\u001F\u007F]/g, "")
		.trim();
};

const looksLikeBangla = (value: string): boolean =>
	/[\u0980-\u09FF]/.test(value);

const isCorrupted = (value: string): boolean =>
	value.includes("\uFFFD") || !looksLikeBangla(value);

const fetchMeaningFromWorkersAi = async (
	surfaceTerm: string,
	lemma: string,
	pos: string,
	sentence: string,
	env: WorkersAiEnv,
): Promise<string> => {
	if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
		throw new Error(
			"Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN for Workers AI call.",
		);
	}

	const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`;
	const body = {
		messages: [
			{
				role: "system",
				content:
					"You are a linguistics assistant. Respond with a concise Bangla meaning for the target word in context. Return only Bangla text.",
			},
			{
				role: "user",
				content: `Surface word: ${surfaceTerm}\nLemma: ${lemma}\nPart of speech: ${pos}\nExample sentence: ${sentence}`,
			},
		],
		max_tokens: 64,
	};

	const response = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(
			`Workers AI request failed with status ${response.status}.`,
		);
	}

	const payload = (await response.json()) as unknown;
	const text = extractResponseText(payload);
	if (!text) {
		throw new Error("Workers AI response did not include text.");
	}

	return sanitizeMeaning(text);
};

const fetchMeaningWithRetry = async (
	surfaceTerm: string,
	lemma: string,
	pos: string,
	sentence: string,
	env: WorkersAiEnv,
): Promise<string> => {
	let meaning = await fetchMeaningFromWorkersAi(
		surfaceTerm,
		lemma,
		pos,
		sentence,
		env,
	);

	if (!isCorrupted(meaning)) {
		return meaning;
	}

	// Retry once with a stricter prompt to avoid partial words.
	const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`;
	const body = {
		messages: [
			{
				role: "system",
				content:
					"Return only a correct Bangla word or short Bangla phrase. Do not include punctuation or Latin characters.",
			},
			{
				role: "user",
				content: `Surface word: ${surfaceTerm}\nLemma: ${lemma}\nPart of speech: ${pos}\nExample sentence: ${sentence}`,
			},
		],
		max_tokens: 32,
	};

	const response = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		return meaning;
	}

	const payload = (await response.json()) as unknown;
	const text = extractResponseText(payload);
	if (!text) {
		return meaning;
	}

	meaning = sanitizeMeaning(text);
	return meaning;
};

const buildDayKey = (value: Date): string => {
	const year = value.getUTCFullYear();
	const month = String(value.getUTCMonth() + 1).padStart(2, "0");
	const day = String(value.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const getUsageCount = async (
	db: D1Database,
	dayKey: string,
	provider: string,
): Promise<number> => {
	const row = await db
		.prepare(
			"SELECT char_count as char_count FROM translation_usage WHERE month_key = ?1 AND provider = ?2",
		)
		.bind(dayKey, provider)
		.first<UsageRow>();
	return row?.char_count ?? 0;
};

const incrementUsage = async (
	db: D1Database,
	dayKey: string,
	provider: string,
	delta: number,
): Promise<void> => {
	await db
		.prepare(
			`INSERT INTO translation_usage (month_key, provider, char_count, updated_at)
       VALUES (?1, ?2, ?3, datetime('now'))
       ON CONFLICT(month_key, provider) DO UPDATE SET
         char_count = translation_usage.char_count + ?3,
         updated_at = datetime('now')`,
		)
		.bind(dayKey, provider, delta)
		.run();
};

const ensureWithinLimit = async (
	db: D1Database,
	provider: string,
	charCount: number,
	limit: number,
): Promise<void> => {
	const dayKey = buildDayKey(new Date());
	const used = await getUsageCount(db, dayKey, provider);
	if (used + charCount > limit) {
		throw new Error("Daily Workers AI translation limit reached.");
	}
	await incrementUsage(db, dayKey, provider, charCount);
};

const fetchMeaning = async (
	surfaceTerm: string,
	lemma: string,
	pos: string,
	sentence: string,
	env: WorkersAiEnv,
	db: D1Database,
): Promise<string> => {
	const limit = Number(env.WORKERS_AI_DAILY_CHAR_LIMIT ?? "10000");
	const estimatedChars = surfaceTerm.length + sentence.length;
	await ensureWithinLimit(db, "workers-ai", estimatedChars, limit);
	return fetchMeaningWithRetry(surfaceTerm, lemma, pos, sentence, env);
};

export const getMeaningAndPersist = async (
	request: MeaningRequest,
): Promise<MeaningResponse> => {
	const { db, surfaceTerm, lemma, pos, exampleSentence, env } = request;
	const cacheKey = buildCacheKey(surfaceTerm, pos);
	const cached = await getCachedTranslation(db, cacheKey);

	if (cached) {
		const cleaned = sanitizeMeaning(cached);
		if (cleaned !== cached) {
			await setCachedTranslation(db, cacheKey, cleaned);
		}
		await saveVocabularyEntry(db, {
			surfaceTerm,
			lemma,
			pos,
			exampleSentence,
			meaningBn: cleaned,
		});
		return { meaningBn: cleaned, source: "cache" };
	}

	const meaningBn = await fetchMeaning(
		surfaceTerm,
		lemma,
		pos,
		exampleSentence,
		env,
		db,
	);
	await setCachedTranslation(db, cacheKey, meaningBn);
	await saveVocabularyEntry(db, {
		surfaceTerm,
		lemma,
		pos,
		exampleSentence,
		meaningBn,
	});

	return { meaningBn, source: "api" };
};
