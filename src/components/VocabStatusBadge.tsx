import type { ReactNode } from "react";

type VocabStatus = "new" | "learned" | "weak";

type Props = {
  status: VocabStatus;
  label?: ReactNode;
};

const statusStyles: Record<VocabStatus, string> = {
  new: "border border-black/10 bg-white text-[color:var(--muted)]",
  learned: "bg-[color:var(--accent)] text-white",
  weak: "bg-orange-400 text-white",
};

export default function VocabStatusBadge({ status, label }: Props) {
  const text = label ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {text}
    </span>
  );
}
