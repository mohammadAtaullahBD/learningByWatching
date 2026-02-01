"use client";

type Props = {
  value: string;
  options: string[];
  hrefAll: string;
  hrefByPos: Record<string, string>;
};

export default function PosFilterSelect({
  value,
  options,
  hrefAll,
  hrefByPos,
}: Props) {
  return (
    <label className="flex items-center gap-2 text-[color:var(--muted)]">
      <span>POS</span>
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          const target = next === "all" ? hrefAll : hrefByPos[next];
          if (target) {
            window.location.href = target;
          }
        }}
        className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-[color:var(--text)]"
      >
        <option value="all">All POS</option>
        {options.map((pos) => (
          <option key={pos} value={pos}>
            {pos}
          </option>
        ))}
      </select>
    </label>
  );
}
