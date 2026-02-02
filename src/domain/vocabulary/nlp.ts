type TokenInfo = {
  value: string;
  lemma: string;
  pos: string;
  type: string;
};

type TokenOutput = {
  out: (selector: unknown) => unknown;
};

type DocOutput = {
  tokens: () => TokenOutput;
};

type WinkNlpInstance = {
  readDoc: (text: string) => DocOutput;
  its: {
    value: unknown;
    lemma: unknown;
    pos: unknown;
    type: unknown;
  };
};

type WinkNlpFactory = (model: unknown) => WinkNlpInstance;

let nlpInstancePromise: Promise<WinkNlpInstance> | null = null;

const getNlp = async () => {
  if (!nlpInstancePromise) {
    // Lazy-load the model to keep the worker cold start fast.
    nlpInstancePromise = (async () => {
      const winkMod = (await import("wink-nlp")) as unknown;
      const modelMod = (await import("wink-eng-lite-web-model")) as unknown;

      const factory = (winkMod as { default?: WinkNlpFactory }).default ??
        (winkMod as WinkNlpFactory);
      const model = (modelMod as { default?: unknown }).default ?? modelMod;
      return factory(model);
    })();
  }
  return nlpInstancePromise;
};

export type SentenceAnalysis = {
  tokens: TokenInfo[];
};

export const analyzeSentence = async (sentence: string): Promise<SentenceAnalysis> => {
  const nlp = await getNlp();
  const doc = nlp.readDoc(sentence);
  const values = doc.tokens().out(nlp.its.value) as string[];
  const lemmas = doc.tokens().out(nlp.its.lemma) as string[];
  const posTags = doc.tokens().out(nlp.its.pos) as string[];
  const types = doc.tokens().out(nlp.its.type) as string[];

  const tokens = values.map((value, index) => ({
    value,
    lemma: lemmas[index] ?? value,
    pos: posTags[index] ?? "",
    type: types[index] ?? "",
  }));

  return { tokens };
};
