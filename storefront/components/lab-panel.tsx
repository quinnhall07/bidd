"use client";
// The hidden ?lab=1 panel. Every control writes to the URL, so any combination is a link.
// Showing the panel, its tab and whether it's open are remembered per browser; the settings live in the URL.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { LAB_DEFAULTS, LAB_KEYS, LAB_OPTIONS, LAB_PRESETS, parseLab, type Lab } from "@/lib/lab";
import { Close, Copy, Link2, Sliders } from "./icons";

type CampusOption = { slug: string; name: string; short: string; primary: string; secondary: string };
type Key = keyof typeof LAB_OPTIONS;

const LABELS: Record<Key, string> = {
  state: "Data",
  v: "Placement",
  card: "Card shape",
  duo: "Two colors",
  logos: "School logos",
  drop: "Drop phase",
  gate: "Chapter gate",
  viewer: "Viewer",
  names: "Chapter names",
  bid: "Your sealed bid",
  rule: "Auction pricing",
  fx: "Campus surfaces",
  heads: "Headlines",
  photos: "Listing photos",
  motion: "Motion",
  ticker: "Ticker",
  header: "Header",
  corners: "Corners",
  grid: "Columns (wide)",
};

const TABS: { id: string; label: string; keys: Key[] }[] = [
  { id: "campus", label: "Campus", keys: ["logos", "duo", "names"] },
  { id: "layout", label: "Layout", keys: ["v", "card", "grid", "corners", "header", "ticker"] },
  { id: "look", label: "Look", keys: ["fx", "heads", "photos", "motion"] },
  { id: "states", label: "States", keys: ["state", "drop", "gate", "viewer", "bid", "rule"] },
];

const PAGES = [
  ["/", "Feed"],
  ["/c/kappa-delta", "Chapter"],
  ["/c/me", "Your closet"],
  ["/drop/bid-day", "Drop"],
  ["/drop/one-of-one", "Sealed bid"],
  ["/cup", "Cup"],
  ["/login", "Sign in"],
];

export function LabPanel({ on, campuses }: { on: boolean; campuses: CampusOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [remembered, setRemembered] = useState(false);
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState("campus");
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const lab = parseLab(Object.fromEntries(params.entries()));

  // Reads browser storage after mount, so the server render and first client render match.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      if (on) localStorage.setItem("bidd-lab", "1");
      setRemembered(on || localStorage.getItem("bidd-lab") === "1");
      setOpen(localStorage.getItem("bidd-lab-open") !== "0");
      setTab(localStorage.getItem("bidd-lab-tab") ?? "campus");
    } catch {
      setRemembered(on);
    }
  }, [on]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!remembered) return null;

  const store = (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  };
  const go = (q: URLSearchParams) => start(() => router.replace(`${pathname}?${q}`, { scroll: false }));
  const apply = (changes: Partial<Lab>) => {
    const q = new URLSearchParams(params.toString());
    q.set("lab", "1");
    for (const [key, value] of Object.entries(changes)) {
      if (String(value) === String(LAB_DEFAULTS[key as keyof Lab])) q.delete(key);
      else q.set(key, String(value));
    }
    go(q);
  };
  const reset = () => {
    const q = new URLSearchParams({ lab: "1" });
    if (lab.school !== LAB_DEFAULTS.school) q.set("school", lab.school);
    go(q);
  };
  const copy = async (what: "link" | "settings") => {
    const settings = Object.fromEntries(LAB_KEYS.map((k) => [k, lab[k]]));
    const text = what === "link" ? window.location.href : JSON.stringify({ path: pathname, ...settings }, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      window.prompt("Copy this", text);
    }
  };
  const hide = () => {
    try {
      localStorage.removeItem("bidd-lab");
    } catch {}
    const q = new URLSearchParams(params.toString());
    q.delete("lab");
    setRemembered(false);
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  const changed = LAB_KEYS.filter((k) => k !== "school" && lab[k] !== LAB_DEFAULTS[k]).length;
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  const presetOn = (set: Partial<Lab>) => Object.entries(set).every(([k, v]) => String(lab[k as keyof Lab]) === String(v));

  if (!open)
    return (
      <button
        onClick={() => {
          setOpen(true);
          store("bidd-lab-open", "1");
        }}
        data-ground="dark"
        className="fixed right-4 bottom-20 z-50 flex items-center gap-2 rounded-full border border-[var(--gray-800)] bg-ink px-4 py-3 text-[14px] font-semibold text-paper shadow-[0_12px_32px_rgba(0,0,0,0.28)] md:bottom-4"
      >
        <Sliders width={18} height={18} /> Lab{changed > 0 && <span className="text-[var(--dim)]">· {changed} changed</span>}
      </button>
    );

  const options = (key: Key) => (
    <fieldset key={key}>
      <legend className="mb-1.5 text-[12px] font-semibold text-[var(--dim)]">{LABELS[key]}</legend>
      <div className="flex flex-wrap gap-1">
        {LAB_OPTIONS[key].map((value) => (
          <button
            key={value}
            aria-pressed={lab[key] === value}
            onClick={() => apply({ [key]: value })}
            className="rounded-full border border-[var(--gray-800)] px-2.5 py-1 text-[12.5px] font-semibold hover:border-[var(--dim)] aria-pressed:border-paper aria-pressed:bg-paper aria-pressed:text-ink"
          >
            {value}
          </button>
        ))}
      </div>
    </fieldset>
  );

  return (
    <aside
      data-ground="dark"
      aria-label="Lab panel"
      className="fixed right-4 bottom-20 z-50 flex max-h-[min(80dvh,720px)] w-[340px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[4px] border border-[var(--gray-800)] bg-ink text-paper shadow-[0_12px_32px_rgba(0,0,0,0.28)] md:bottom-4"
    >
      <div className="flex items-center gap-3 px-4 pt-3">
        <p className="display text-[24px] leading-none">Lab</p>
        <p className="text-[12px] text-[var(--dim)]">{pending ? "Repainting…" : changed ? `${changed} changed from default` : "Brand default"}</p>
        <button
          onClick={() => {
            setOpen(false);
            store("bidd-lab-open", "0");
          }}
          aria-label="Collapse lab"
          className="ml-auto rounded-full p-1.5 text-[var(--dim)] hover:bg-[var(--gray-800)] hover:text-paper"
        >
          <Close width={18} height={18} />
        </button>
      </div>
      <div className="flex gap-1 border-b border-[var(--gray-800)] px-3 pt-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === current.id}
            onClick={() => {
              setTab(t.id);
              store("bidd-lab-tab", t.id);
            }}
            className="-mb-px border-b-2 border-transparent px-2 pb-2 text-[13px] font-semibold text-[var(--dim)] aria-selected:border-paper aria-selected:text-paper"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="no-scrollbar flex-1 space-y-3.5 overflow-y-auto px-4 py-3.5">
        {current.id === "campus" && (
          <fieldset>
            <legend className="mb-1.5 text-[12px] font-semibold text-[var(--dim)]">School</legend>
            <div className="grid grid-cols-4 gap-1">
              {[{ slug: "none", name: "Before sign-in", short: "NONE", primary: "#0B0B0B", secondary: "#FFFFFF" }, ...campuses].map((c) => (
                <button
                  key={c.slug}
                  title={c.name}
                  aria-pressed={lab.school === c.slug}
                  onClick={() => apply({ school: c.slug })}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--gray-800)] px-2 py-1 text-left text-[11px] font-bold tracking-wide hover:border-[var(--dim)] aria-pressed:border-paper aria-pressed:bg-paper aria-pressed:text-ink"
                >
                  <span className="size-3 shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${c.primary} 50%, ${c.secondary} 50%)`, boxShadow: "inset 0 0 0 1px rgb(255 255 255 / .25)" }} />
                  <span className="truncate">{c.short}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {current.id === "look" && (
          <fieldset>
            <legend className="mb-1.5 text-[12px] font-semibold text-[var(--dim)]">Presets</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {LAB_PRESETS.map((p) => (
                <button
                  key={p.id}
                  aria-pressed={presetOn(p.set)}
                  onClick={() => apply(p.set)}
                  className="rounded-[4px] border border-[var(--gray-800)] px-2.5 py-2 text-left hover:border-[var(--dim)] aria-pressed:border-paper aria-pressed:bg-paper aria-pressed:text-ink"
                >
                  <span className="block text-[13px] font-bold">{p.label}</span>
                  <span className="block text-[11.5px] leading-snug opacity-70">{p.note}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {current.keys.map(options)}

        <div className="border-t border-[var(--gray-800)] pt-3 text-[12px] leading-relaxed text-[var(--dim)]">
          <p>
            Go to:{" "}
            {PAGES.map(([p, label], i) => (
              <span key={p}>
                {i > 0 && " · "}
                <a className="underline underline-offset-2 hover:text-paper" href={`${p}?${params.toString()}`}>
                  {label}
                </a>
              </span>
            ))}
          </p>
          <p className="mt-1">
            Codes: Kappa Delta <b className="text-paper">KD2026</b> · Chi Omega <b className="text-paper">XO2026</b>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 border-t border-[var(--gray-800)] p-3">
        <button onClick={() => copy("link")} className="pill pill-paper pill-sm">
          <Link2 width={16} height={16} /> {copied === "link" ? "Copied" : "Copy link"}
        </button>
        <button onClick={() => copy("settings")} className="pill pill-line pill-sm">
          <Copy width={16} height={16} /> {copied === "settings" ? "Copied" : "Settings"}
        </button>
        <button onClick={reset} className="rounded-full px-1.5 text-[12px] font-semibold text-[var(--dim)] hover:text-paper" title="Back to the brand default (keeps the school)">
          Reset
        </button>
        <button onClick={hide} className="rounded-full px-1.5 text-[12px] font-semibold text-[var(--dim)] hover:text-paper" title="Hide the lab on this browser">
          Hide
        </button>
      </div>
    </aside>
  );
}
