"use client";

type Option = { value: string; label: string };

type Props = {
  value: string;
  options: Option[];
  hrefByValue: Record<string, string>;
};

export default function RepeatSortSelect({ value, options, hrefByValue }: Props) {
  return (
    <label className="flex items-center gap-2 text-[color:var(--muted)]">
      <span>Repeat</span>
      <select
        value={value}
        onChange={(event) => {
          const target = hrefByValue[event.target.value];
          if (target) {
            window.location.href = target;
          }
        }}
        className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-[color:var(--text)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
