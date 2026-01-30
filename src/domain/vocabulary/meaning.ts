import {
	D1Database,
	getCachedTranslation,
	saveVocabularyEntry,
	setCachedTranslation,
} from "./db";

export type WorkersAiEnv = {
	CLOUDFLARE_ACCOUNT_ID?: string;
	CLOUDFLARE_API_TOKEN?: string;
	TRANSLATION_API_URL?: string;
	GOOGLE_TRANSLATE_API_KEY?: string;
	TRANSLATION_CHAR_LIMIT?: string;
};

type MeaningRequest = {
	db: D1Database;
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

const buildCacheKey = (lemma: string, pos: string, sentence: string): string =>
	`${lemma.toLowerCase()}::${pos.toLowerCase()}::${sentence.trim().toLowerCase()}`;

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

const fetchMeaningFromWorkersAi = async (
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
				content: `Target lemma: ${lemma}\nPart of speech: ${pos}\nExample sentence: ${sentence}`,
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

	return text.trim();
};

const fetchMeaningFromTranslationApi = async (
	lemma: string,
	pos: string,
	sentence: string,
	apiUrl: string,
): Promise<string> => {
	const response = await fetch(apiUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ lemma, pos, sentence }),
	});

	if (!response.ok) {
		throw new Error(`Translation API failed with status ${response.status}.`);
	}

	const payload = (await response.json()) as { meaning_bn?: string };
	if (!payload.meaning_bn) {
		throw new Error("Translation API response missing meaning_bn.");
	}

	return payload.meaning_bn.trim();
};

const fetchMeaningFromGoogleTranslate = async (
	lemma: string,
	apiKey: string,
): Promise<string> => {
	const url = new URL("https://translation.googleapis.com/language/translate/v2");
	url.searchParams.set("key", apiKey);
	const response = await fetch(url.toString(), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			q: lemma,
			source: "en",
			target: "bn",
			format: "text",
		}),
	});

	if (!response.ok) {
		throw new Error(`Google Translate API failed with status ${response.status}.`);
	}

	const payload = (await response.json()) as {
		data?: { translations?: Array<{ translatedText?: string }> };
	};
	const translated = payload.data?.translations?.[0]?.translatedText;
	if (!translated) {
		throw new Error("Google Translate response missing translatedText.");
	}

	return translated.trim();
};

const buildMonthKey = (value: Date): string => {
	const year = value.getUTCFullYear();
	const month = String(value.getUTCMonth() + 1).padStart(2, "0");
	return `${year}-${month}`;
};

const getUsageCount = async (
	db: D1Database,
	monthKey: string,
	provider: string,
): Promise<number> => {
	const row = await db
		.prepare(
			"SELECT char_count as char_count FROM translation_usage WHERE month_key = ?1 AND provider = ?2",
		)
		.bind(monthKey, provider)
		.first<UsageRow>();
	return row?.char_count ?? 0;
};

const incrementUsage = async (
	db: D1Database,
	monthKey: string,
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
		.bind(monthKey, provider, delta)
		.run();
};

const ensureWithinLimit = async (
	db: D1Database,
	provider: string,
	charCount: number,
	limit: number,
): Promise<void> => {
	const monthKey = buildMonthKey(new Date());
	const used = await getUsageCount(db, monthKey, provider);
	if (used + charCount > limit) {
		throw new Error("Monthly translation limit reached.");
	}
	await incrementUsage(db, monthKey, provider, charCount);
};

const fetchMeaning = async (
	lemma: string,
	pos: string,
	sentence: string,
	env: WorkersAiEnv,
	db: D1Database,
): Promise<string> => {
	if (env.TRANSLATION_API_URL) {
		return fetchMeaningFromTranslationApi(
			lemma,
			pos,
			sentence,
			env.TRANSLATION_API_URL,
		);
	}

	if (env.GOOGLE_TRANSLATE_API_KEY) {
		const limit = Number(env.TRANSLATION_CHAR_LIMIT ?? "500000");
		const charCount = lemma.length;
		await ensureWithinLimit(db, "google-translate", charCount, limit);
		return fetchMeaningFromGoogleTranslate(lemma, env.GOOGLE_TRANSLATE_API_KEY);
	}

	return fetchMeaningFromWorkersAi(lemma, pos, sentence, env);
};

export const getMeaningAndPersist = async (
	request: MeaningRequest,
): Promise<MeaningResponse> => {
	const { db, lemma, pos, exampleSentence, env } = request;
	const cacheKey = buildCacheKey(lemma, pos, exampleSentence);
	const cached = await getCachedTranslation(db, cacheKey);

	if (cached) {
		await saveVocabularyEntry(db, {
			lemma,
			pos,
			exampleSentence,
			meaningBn: cached,
		});
		return { meaningBn: cached, source: "cache" };
	}

	const meaningBn = await fetchMeaning(lemma, pos, exampleSentence, env, db);
	await setCachedTranslation(db, cacheKey, meaningBn);
	await saveVocabularyEntry(db, {
		lemma,
		pos,
		exampleSentence,
		meaningBn,
	});

	return { meaningBn, source: "api" };
};
