export const isCorruptedMeaning = (value: string | null, flag: number): boolean =>
  flag === 1 || Boolean(value && value.includes("\uFFFD"));

export const buildMonthKey = (value: Date = new Date()): string => {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const resolveQuestionCount = (
  requested: number,
  totalAvailable: number,
  fallback = 8,
): number => {
  if (!Number.isFinite(requested)) {
    return Math.min(Math.max(1, fallback), Math.max(1, totalAvailable));
  }
  if (requested <= 0) return totalAvailable;
  return Math.min(Math.max(1, Math.floor(requested)), totalAvailable);
};
