export type ParsedSubtitleData = {
  sentences: string[];
  terms: string[];
  occurrences: SubtitleOccurrence[];
};

export type SubtitleOccurrence = {
  term: string;
  sentence: string;
  index: number;
};

const timestampPattern = /\d{2}:\d{2}:\d{2}[.,]\d{3}/;
const allowedWordPattern = /[A-Za-zÀ-ÖØ-öø-ÿ']+/g;

const shouldIgnoreLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (trimmed === "WEBVTT") return true;
  if (trimmed.includes("-->")) return true;
  if (/^NOTE(\s|$)/.test(trimmed)) return true;
  if (/^STYLE(\s|$)/.test(trimmed)) return true;
  if (/^REGION(\s|$)/.test(trimmed)) return true;
  if (/^\d+$/.test(trimmed)) return true;
  if (timestampPattern.test(trimmed)) return true;
  return false;
};

const stripMarkup = (value: string): string =>
  value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const splitSentences = (text: string): string[] => {
  if (!text) return [];
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
};

const extractTerms = (sentence: string): string[] => {
  const matches = sentence.match(allowedWordPattern);
  if (!matches) return [];
  return matches
    .map((term) => term.toLowerCase())
    .filter((term) => term.length > 1);
};

export const parseSubtitleText = (rawText: string): ParsedSubtitleData => {
  const lines = rawText.split(/\r?\n/);
  const cleanedLines = lines.filter((line) => !shouldIgnoreLine(line)).map(stripMarkup);
  const combinedText = cleanedLines.join(" ").trim();
  const sentences = splitSentences(combinedText);

  const termSet = new Set<string>();
  const occurrences: SubtitleOccurrence[] = [];

  sentences.forEach((sentence, sentenceIndex) => {
    const terms = extractTerms(sentence);
    terms.forEach((term) => {
      termSet.add(term);
      occurrences.push({ term, sentence, index: sentenceIndex });
    });
  });

  return {
    sentences,
    terms: Array.from(termSet).sort(),
    occurrences,
  };
};
