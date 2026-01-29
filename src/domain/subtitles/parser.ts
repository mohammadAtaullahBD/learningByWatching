export interface SubtitleCue {
  index: number;
  start: string;
  end: string;
  text: string;
}

export function parseSrt(input: string): SubtitleCue[] {
  const blocks = input
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean);

  return blocks.map((block, index) => {
    const lines = block.split(/\n/).filter(Boolean);
    const timeLine = lines[1] ?? "";
    const [start, end] = timeLine.split(" --> ");
    return {
      index: Number(lines[0] ?? index + 1),
      start: start ?? "",
      end: end ?? "",
      text: lines.slice(2).join(" "),
    };
  });
}
