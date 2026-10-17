"use client";
// One private Saved list (no public likes). Mock: local state only.
import { useState } from "react";
import { Heart } from "./icons";

export function SaveHeart({ className = "" }: { className?: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Saved" : "Save"}
      onClick={() => setSaved(!saved)}
      className={`grid size-9 place-items-center rounded-full bg-paper/90 text-ink transition-transform duration-300 ease-[var(--ease-out-expo)] hover:scale-110 active:scale-95 ${className}`}
    >
      <Heart filled={saved} width={18} height={18} />
    </button>
  );
}
