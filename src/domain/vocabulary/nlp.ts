type TokenInfo = {
	value: string;
	lemma: string;
	pos: string;
	type: string;
};

let nlpInstancePromise: Promise<any> | null = null;

const getNlp = async () => {
	if (!nlpInstancePromise) {
		nlpInstancePromise = (async () => {
			const winkMod = await import("wink-nlp");
			const modelMod = await import("wink-eng-lite-web-model");
			const winkNLP = (winkMod as any)?.default ?? winkMod;
			const model = (modelMod as any)?.default ?? modelMod;
			return winkNLP(model) as any;
		})();
	}
	return nlpInstancePromise;
};

export type SentenceAnalysis = {
	tokens: TokenInfo[];
};

export const analyzeSentence = async (sentence: string): Promise<SentenceAnalysis> => {
	const nlp = await getNlp();
	const { its } = nlp as any;
	const doc = nlp.readDoc(sentence);
	const values = doc.tokens().out(its.value) as string[];
	const lemmas = doc.tokens().out(its.lemma) as string[];
	const posTags = doc.tokens().out(its.pos) as string[];
	const types = doc.tokens().out(its.type) as string[];

	const tokens = values.map((value, index) => ({
		value,
		lemma: lemmas[index] ?? value,
		pos: posTags[index] ?? "",
		type: types[index] ?? "",
	}));

	return { tokens };
};
