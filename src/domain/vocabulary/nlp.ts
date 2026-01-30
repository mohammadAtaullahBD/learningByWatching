import rawWink from "wink-nlp";
import rawModel from "wink-eng-lite-web-model";

type TokenInfo = {
	value: string;
	lemma: string;
	pos: string;
	type: string;
};

const model = (rawModel as any)?.default ?? rawModel;
const winkNLP = (rawWink as any)?.default ?? rawWink;
let nlpInstance: any | null = null;

const getNlp = () => {
	if (!nlpInstance) {
		nlpInstance = winkNLP(model) as any;
	}
	return nlpInstance;
};

export type SentenceAnalysis = {
	tokens: TokenInfo[];
};

export const analyzeSentence = (sentence: string): SentenceAnalysis => {
	const nlp = getNlp();
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
