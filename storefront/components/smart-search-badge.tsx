// "✦ Search by Gemma 4 · Formal · size 4 · under $60 · black": what smart search understood, as a DESIGN.md stamp
// (1.5px currentColor pill label). Server-renderable: no hooks, no client code. The fallback parser shows a campus dot.
import type { SmartSearchResult } from "@/lib/smart-search";

export function SmartSearchBadge({ by, summary, className = "" }: Pick<SmartSearchResult, "by" | "summary"> & { className?: string }) {
  if (!summary) return null;
  const gemma = by === "gemma-4";
  const label = gemma ? "Search by Gemma 4" : "Search";
  return (
    <p className={`stamp max-w-full ${className}`} title={`${label} · ${summary}`}>
      {gemma ? (
        <span aria-hidden="true" className="text-[13px] leading-none">
          ✦
        </span>
      ) : (
        <span aria-hidden="true" className="stamp-dot" />
      )}
      <span className="shrink-0">{label}</span>
      <span aria-hidden="true" className="muted">
        ·
      </span>
      <span className="min-w-0 truncate font-semibold">{summary}</span>
    </p>
  );
}
