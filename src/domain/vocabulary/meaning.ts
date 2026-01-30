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

const fetchMeaning = async (
	lemma: string,
	pos: string,
	sentence: string,
	env: WorkersAiEnv,
): Promise<string> => {
	if (env.TRANSLATION_API_URL) {
		return fetchMeaningFromTranslationApi(
			lemma,
			pos,
			sentence,
			env.TRANSLATION_API_URL,
		);
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

	const meaningBn = await fetchMeaning(lemma, pos, exampleSentence, env);
	await setCachedTranslation(db, cacheKey, meaningBn);
	await saveVocabularyEntry(db, {
		lemma,
		pos,
		exampleSentence,
		meaningBn,
	});

	return { meaningBn, source: "api" };
};
