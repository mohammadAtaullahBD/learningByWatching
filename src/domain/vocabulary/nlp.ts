import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";

type TokenInfo = {
	value: string;
	lemma: string;
	pos: string;
	type: string;
};

const nlp = winkNLP(model);
const { its } = nlp;

export type SentenceAnalysis = {
	tokens: TokenInfo[];
};

export const analyzeSentence = (sentence: string): SentenceAnalysis => {
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
