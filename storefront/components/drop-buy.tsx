"use client";
// Size picker and the drop's main action, drawn on the campus field.
// v=a: size pills. v=b: a SNKRS-style size grid with stock per size.
// Mock: pre-ordering only changes local state.
import Link from "next/link";
import { useState } from "react";
import type { DropPhase, DropSize } from "@/lib/types";
import { Arrow, Bell, Check } from "./icons";

export function DropBuy({
  sizes: initial,
  phase,
  price,
  grid,
  chapter,
  closetHref,
}: {
  sizes: DropSize[];
  phase: DropPhase;
  price: string;
  grid: boolean;
  chapter: string;
  closetHref: string;
}) {
  const [sizes, setSizes] = useState(initial);
  const [size, setSize] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [reminded, setReminded] = useState(false);
  const open = phase === "live" || phase === "low";

  if (phase === "ended")
    return (
      <Link href={closetHref} className="pill pill-flip">
        Shop {chapter}&apos;s closet <Arrow width={18} height={18} />
      </Link>
    );

  if (done)
    return (
      <div className="rounded-[4px] bg-[var(--campus-ink)] p-5 text-[var(--campus)]" role="status">
        <p className="flex items-center gap-2 text-[17px] font-bold">
          <Check width={20} height={20} strokeWidth={3} /> Pre-ordered: size {done}
        </p>
        <p className="mt-1 text-[15px] font-semibold opacity-85">+40 pts for {chapter} in the Fall Cup. Pick it up at the Exchange Spot or have it sent to your MSC.</p>
      </div>
    );

  return (
    <div>
      <fieldset disabled={!open && phase !== "upcoming"}>
        <legend className="mb-3 text-[14px] font-semibold">{phase === "upcoming" ? "Sizes at launch" : "Pick your size"}</legend>
        <div className={grid ? "grid grid-cols-3 gap-2 sm:grid-cols-6" : "flex flex-wrap gap-2"}>
          {sizes.map((s) => {
            const out = s.stock === 0;
            const active = size === s.size;
            return (
              <button
                key={s.size}
                type="button"
                disabled={!open || out}
                aria-pressed={active}
                onClick={() => setSize(s.size)}
                className={`border-2 border-current font-bold transition-colors duration-300 aria-pressed:border-[var(--campus-ink)] aria-pressed:bg-[var(--campus-ink)] aria-pressed:text-[var(--campus)] ${
                  grid ? "flex flex-col items-start rounded-[4px] px-3 py-2.5 text-left" : "min-w-14 rounded-full px-4 py-2.5 text-[15px]"
                } ${out ? "line-through opacity-40" : phase === "upcoming" ? "opacity-80" : "hover:bg-[color-mix(in_srgb,var(--campus-ink)_14%,transparent)]"}`}
              >
                <span className={grid ? "text-[16px]" : ""}>{s.size}</span>
                {grid && <span className="num text-[12.5px] font-semibold no-underline opacity-85">{phase === "upcoming" ? `${s.total} at launch` : out ? "Sold out" : `${s.stock} left`}</span>}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {phase === "upcoming" ? (
          <button type="button" className="pill pill-flip" onClick={() => setReminded(true)} aria-pressed={reminded}>
            {reminded ? <Check width={18} height={18} strokeWidth={3} /> : <Bell width={18} height={18} />} {reminded ? "We'll remind you" : "Remind me"}
          </button>
        ) : phase === "soldout" ? (
          <button type="button" className="pill" disabled>
            Sold out
          </button>
        ) : (
          <button
            type="button"
            className="pill pill-flip"
            disabled={!size}
            onClick={() => {
              setSizes(sizes.map((s) => (s.size === size ? { ...s, stock: s.stock - 1 } : s)));
              setDone(size);
            }}
          >
            {size ? `Pre-order size ${size} · ${price}` : "Pick a size to pre-order"}
          </button>
        )}
        <p className="field-soft text-[14px] font-semibold">
          {phase === "soldout" ? "Every size is claimed. Officers can reopen it for a restock." : "No buyer fee on drops."}
        </p>
      </div>
    </div>
  );
}
