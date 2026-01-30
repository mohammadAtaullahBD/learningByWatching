export function normalizeSubtitleText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
}
