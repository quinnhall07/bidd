"use client";
// The chapter closet's access-code gate. v=a: inline above the blurred closet. v=b: a bottom sheet.
// Mock: the code is checked in the browser; with Supabase it becomes a server check.
import { useRouter } from "next/navigation";
import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { Alert, Lock } from "./icons";

const LENGTH = 6;

export function CodeGate({
  code,
  chapter,
  unlockHref,
  viewer,
  sheet,
}: {
  code: string;
  chapter: string;
  unlockHref: string;
  viewer: "member" | "visitor" | "officer";
  sheet?: boolean;
}) {
  const router = useRouter();
  const [chars, setChars] = useState<string[]>(Array(LENGTH).fill(""));
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const submit = (value = chars.join("")) => {
    if (value.length < LENGTH) return;
    if (value.toUpperCase() === code.toUpperCase()) {
      setBusy(true);
      router.replace(unlockHref, { scroll: false });
    } else {
      setError(true);
      setChars(Array(LENGTH).fill(""));
      boxes.current[0]?.focus();
    }
  };
  const put = (i: number, v: string) => {
    const c = v.replace(/[^a-z0-9]/gi, "").slice(-1).toUpperCase();
    const next = [...chars];
    next[i] = c;
    setChars(next);
    setError(false);
    if (c && i < LENGTH - 1) boxes.current[i + 1]?.focus();
    if (c && next.every(Boolean)) submit(next.join(""));
  };
  const key = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === "Enter") submit();
  };
  const paste = (e: ClipboardEvent) => {
    const v = e.clipboardData.getData("text").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, LENGTH);
    if (!v) return;
    e.preventDefault();
    const next = Array.from({ length: LENGTH }, (_, i) => v[i] ?? "");
    setChars(next);
    if (v.length === LENGTH) submit(v);
  };

  const lead =
    viewer === "visitor"
      ? `${chapter}'s closet is for members and guests with the code. Got it from a member? Enter it here.`
      : `Your officers share this week's code in the chapter group chat. It unlocks drops and members' resale.`;

  const form = (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-ink text-paper">
          <Lock width={18} height={18} />
        </span>
        <h2 className="display text-[clamp(2.25rem,4vw,3.25rem)]">Enter the code.</h2>
      </div>
      <p className="muted mt-4 max-w-[48ch] text-[16px] leading-relaxed">{lead}</p>
      <form
        className="mt-6 flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex gap-2" onPaste={paste}>
          {chars.map((c, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              value={c}
              onChange={(e) => put(i, e.target.value)}
              onKeyDown={(e) => key(i, e)}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="one-time-code"
              aria-label={`Code character ${i + 1}`}
              className="h-[60px] w-[52px] rounded-[4px] border-2 border-ink bg-paper text-center text-[24px] font-semibold uppercase outline-none transition-[border-color,box-shadow] focus:border-[var(--campus-line)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--campus-line)_25%,transparent)]"
            />
          ))}
        </div>
        <button className="pill pill-ink" disabled={busy || chars.some((c) => !c)}>
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </form>
      <p className="mt-4 flex min-h-6 items-center gap-2 text-[15px] font-semibold" role="status">
        {error && (
          <>
            <Alert width={20} height={20} /> That code doesn&apos;t match. Check the latest code from your officers and try again.
          </>
        )}
      </p>
    </div>
  );

  if (!sheet) return form;
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/45" role="dialog" aria-modal="true" aria-label="Enter the access code">
      <div className="sheet w-full rounded-t-[4px] bg-paper pb-[max(32px,env(safe-area-inset-bottom))]">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-[var(--gray-200)]" />
        <div className="column pt-6">{form}</div>
      </div>
    </div>
  );
}
