"use client";
// Apply to rep a brand: mock applied state, nothing is sent.
import { useState } from "react";
import { Check } from "./icons";

export function AmbassadorApply({ brand, campus }: { brand: string; campus: string }) {
  const [applied, setApplied] = useState(false);
  if (applied)
    return (
      <div className="flex flex-col gap-1.5" role="status">
        <span className="pill pill-line pill-sm pointer-events-none self-start">
          <Check width={16} height={16} /> Applied
        </span>
        <span className="muted text-[13px] leading-snug">
          Bidd will match you with {brand} for {campus} and send your drop code. Demo, nothing was sent.
        </span>
      </div>
    );
  return (
    <button type="button" onClick={() => setApplied(true)} className="pill pill-ink pill-sm self-start">
      Apply to rep {brand}
    </button>
  );
}
