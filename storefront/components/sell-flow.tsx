"use client";
// Sell: photo → "Fill with AI" → check it → post. A real photo goes to /api/ai-listing (Gemma 4); no key, an error or
// 8s without an answer falls back silently to the on-device demo fill (sell-ai.tsx). Samples always use the demo fill.
// Live when NEXT_PUBLIC_BIDD_API_URL is set and a session token is around: POST /api/listings, upload the photo,
// PATCH status active. Any miss falls back to the mock success so the demo never breaks.
import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { accessToken, apiUrl, isLive } from "@/lib/api";
import { buyerFee, money } from "@/lib/format";
import { Alert, Arrow, Check, Close, Plus, Trophy } from "./icons";
import {
  API_TAG,
  CATEGORIES,
  CONDITIONS,
  MOMENTS,
  SAMPLES,
  SIZES,
  averageColor,
  conditionLabel,
  fillFromPhoto,
  repairFill,
  sizeLabel,
  type Category,
  type Condition,
  type Fill,
  type Moment,
  type Sample,
  type Size,
} from "./sell-ai";

type Photo = { url: string; name: string; bytes: number; file: File | null; sample: Sample | null };
type Phase = "pick" | "ready" | "reading" | "form" | "posting" | "done";
type Form = { title: string; brand: string; category: Category | null; size: Size | null; condition: Condition | null; price: string; tags: Moment[]; description: string };

/** How it sells: a timed campus auction (deck 05/06: "Timed auction. Top bid wins.") or a fixed buy-now price. */
type Mode = "auction" | "now";
type Sale = { mode: Mode; hours: number };

const EMPTY: Form = { title: "", brand: "", category: null, size: null, condition: null, price: "", tags: [], description: "" };
const DURATIONS: [number, string][] = [
  [1, "1h"],
  [6, "6h"],
  [24, "24h"],
  [72, "3d"],
];
const durationLabel = (h: number) => DURATIONS.find(([v]) => v === h)?.[1] ?? `${h}h`;
const STAGES = ["Finding the garment", "Reading the brand and tag", "Checking condition", "Pricing against your campus"];
const READ_MS = 2100;
/** How long a real photo waits on the model before the demo fill takes over. */
const AI_MS = 8000;
const MAX_BYTES = 4 * 1024 * 1024;

/** Wall clock for the "read in 2.1s" badge; only ever called from event handlers. */
const clock = () => performance.now();
const toCents = (price: string) => Math.round(Number.parseFloat(price.replace(/[^0-9.]/g, "")) * 100);

export function SellFlow({
  campus,
  chapter,
  allIn,
  closetHref,
  cupHref,
  feedHref,
}: {
  campus: string | null;
  chapter: string | null;
  allIn: boolean;
  closetHref: string;
  cupHref: string;
  feedHref: string;
}) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [ai, setAi] = useState<{ ms: number; range: [number, number]; model: boolean } | null>(null);
  const [stage, setStage] = useState(0);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [sale, setSale] = useState<Sale>({ mode: "auction", hours: 24 });
  const input = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  useEffect(() => () => {
    if (photo?.file) URL.revokeObjectURL(photo.url);
  }, [photo]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function choose(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) return setError("That file isn't a photo. Try a JPEG, PNG or WebP.");
    setError(null);
    setPhoto({ url: URL.createObjectURL(file), name: file.name, bytes: file.size, file, sample: null });
    setForm(EMPTY);
    setAi(null);
    setPhase("ready");
  }

  function pickSample(s: Sample) {
    setError(null);
    setPhoto({ url: s.src, name: `${s.id}.jpg`, bytes: 0, file: null, sample: s });
    setForm(EMPTY);
    setAi(null);
    setPhase("ready");
  }

  // Drops anywhere in the flow land here, so a stray drop never makes the browser open the file and leave the page.
  function onDragOver(e: DragEvent) {
    e.preventDefault();
    if (phase !== "reading" && phase !== "posting") setDrag(true);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    if (phase === "reading" || phase === "posting") return;
    choose(e.dataTransfer.files?.[0]);
  }

  async function fillWithAi() {
    if (!photo) return;
    const started = clock();
    setPhase("reading");
    setStage(0);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = STAGES.map((_, i) => window.setTimeout(() => setStage(i), (READ_MS / STAGES.length) * i));
    const [read] = await Promise.all([
      photo.sample ? { fill: photo.sample.fill, model: false } : readPhoto(photo, campus),
      new Promise((r) => timers.current.push(window.setTimeout(r, READ_MS))),
    ]);
    apply(read.fill);
    setAi({ ms: clock() - started, range: read.fill.range, model: read.model });
    setPhase("form");
  }

  function apply(f: Fill) {
    setForm({
      title: f.title,
      brand: f.brand,
      category: f.category,
      size: f.size,
      condition: f.condition,
      price: String(f.priceCents / 100),
      tags: f.tags,
      description: f.description,
    });
  }

  function fillMyself() {
    setAi(null);
    setForm(EMPTY);
    setPhase("form");
  }

  function reset() {
    setPhoto(null);
    setForm(EMPTY);
    setAi(null);
    setError(null);
    setLive(false);
    setPhase("pick");
  }

  const cents = toCents(form.price);
  const priceOk = Number.isFinite(cents) && cents >= 100 && cents <= 100000;
  const missing = [
    form.title.trim().length < 3 && "a title",
    !form.size && "a size",
    !form.condition && "the condition",
    !priceOk && (sale.mode === "auction" ? "a starting bid from $1 to $1,000" : "a price from $1 to $1,000"),
  ].filter(Boolean) as string[];

  async function post() {
    if (!photo || missing.length) return;
    setPhase("posting");
    // An unreachable API must not hold the demo on "Posting…": give live 12s, then fall back to the mock success.
    const attempt = publishLive(form, cents, photo, sale).catch(() => null);
    const capped = Promise.race([attempt,new Promise<null>((r) => setTimeout(() => r(null), 12000))]);
    const [ok] = await Promise.all([capped, new Promise((r) => setTimeout(r, 900))]);
    setLive(Boolean(ok));
    setPhase("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (phase === "done" && photo) {
    return (
      <Done
        photo={photo}
        form={form}
        cents={cents}
        sale={sale}
        allIn={allIn}
        live={live}
        campus={campus}
        chapter={chapter}
        closetHref={closetHref}
        cupHref={cupHref}
        feedHref={feedHref}
        onAnother={reset}
      />
    );
  }

  const reading = phase === "reading";

  return (
    <div className="column pt-10 pb-24 md:pt-14" onDragOver={onDragOver} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
      <style href="sell-scan" precedence="default">{`
        @keyframes sell-scan { 0% { top: 0% } 100% { top: 100% } }
        @keyframes sell-blink { 50% { opacity: .35 } }
      `}</style>
      <p className="muted text-[14px] font-semibold">Sell{campus ? ` · ${campus}` : ""}</p>
      <h1 className="display mt-3 text-[clamp(3rem,6vw,5rem)]">Snap it. We fill it in.</h1>
      <p className="muted mt-4 max-w-[58ch] text-[17px] leading-relaxed">
        One photo and about 30 seconds. AI reads the piece and drafts the listing; you check it and post. 0% seller fee
        {chapter ? `, and every sale is points for ${chapter}.` : "."}
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        {/* Photo */}
        <div className="lg:sticky lg:top-[calc(var(--header)+24px)] lg:self-start">
          <input ref={input} id="sell-photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only"
            onChange={(e) => {
              choose(e.target.files?.[0] ?? undefined);
              e.target.value = ""; // so picking the same file again after "Remove photo" still fires
            }}
          />
          {photo ? (
            <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-[var(--gray-50)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="Your photo" className={`absolute inset-0 size-full object-cover transition-[filter] duration-700 ${reading ? "saturate-[0.6]" : ""}`} />
              {reading && <Scanner stage={stage} />}
              {phase === "form" && ai && (
                <span className="field absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold" style={{ animation: "rise-in 0.5s var(--ease-out-expo) both" }}>
                  <Check width={14} height={14} strokeWidth={3} /> Read in {(ai.ms / 1000).toFixed(1)}s
                </span>
              )}
              {!reading && (
                <button type="button" onClick={reset} aria-label="Remove photo" className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-paper text-ink shadow-[0_1px_2px_rgb(0_0_0/0.15)]">
                  <Close width={18} height={18} />
                </button>
              )}
            </div>
          ) : (
            <label
              htmlFor="sell-photo"
              data-drag={drag || undefined}
              className="group flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-4 rounded-[4px] border-2 border-dashed border-[var(--gray-200)] bg-[var(--gray-50)] p-8 text-center transition-colors duration-300 hover:border-ink data-[drag]:border-solid data-[drag]:border-[var(--campus-line)] data-[drag]:bg-paper"
            >
              <span className="grid size-16 place-items-center rounded-full bg-ink text-paper transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-105 group-data-[drag]:scale-110">
                <Plus width={28} height={28} />
              </span>
              <span className="display text-[clamp(2rem,3.4vw,2.75rem)]">{drag ? "Drop it." : "Add a photo."}</span>
              <span className="muted max-w-[30ch] text-[15px] leading-relaxed">Drag it here or tap to choose. JPEG, PNG or WebP. Good light, whole piece in frame.</span>
            </label>
          )}

          {error && (
            <p role="alert" className="mt-3 flex items-center gap-2 text-[14px] font-semibold">
              <Alert width={18} height={18} className="text-[var(--campus-line)]" /> {error}
            </p>
          )}

          <div className="mt-5">
            <p className="muted text-[13px] font-semibold">{photo ? "Or try another sample" : "No photo handy? Try a sample"}</p>
            <ul className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
              {SAMPLES.map((s) => (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    disabled={reading}
                    onClick={() => pickSample(s)}
                    aria-pressed={photo?.sample?.id === s.id}
                    aria-label={`Use sample: ${s.label}`}
                    className="block size-16 overflow-hidden rounded-[4px] border-2 border-transparent transition-[border-color,opacity] duration-300 hover:border-ink disabled:opacity-40 aria-pressed:border-[var(--campus-line)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.src} alt="" className="size-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Listing */}
        <div>
          {phase === "pick" && <HowItWorks />}

          {phase === "ready" && (
            <div className="rounded-[4px] border-2 border-ink p-[clamp(20px,2.4vw,32px)]" style={{ animation: "rise-in 0.5s var(--ease-out-expo) both" }}>
              <span className="stamp">
                <span className="stamp-dot" /> Photo in
              </span>
              <h2 className="display mt-5 text-[clamp(2.25rem,4vw,3.25rem)]">Let AI write it.</h2>
              <p className="muted mt-3 max-w-[48ch] text-[16px] leading-relaxed">
                Title, brand, category, size, condition, a price that sells{campus ? ` at ${campus}` : ""} and the Moments it fits. You can change anything after.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button type="button" className="pill pill-ink" onClick={fillWithAi}>
                  Fill with AI <Arrow width={18} height={18} />
                </button>
                <button type="button" className="pill pill-line" onClick={fillMyself}>
                  I&apos;ll fill it in
                </button>
              </div>
            </div>
          )}

          {reading && <FormSkeleton stage={stage} />}

          {(phase === "form" || phase === "posting") && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                post();
              }}
              className="grid gap-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="display text-[clamp(2.25rem,4vw,3.25rem)]">{ai ? "Here's your listing." : "Your listing."}</h2>
                {ai ? (
                  <span className="stamp">
                    <span className="stamp-dot" /> {ai.model ? "Filled by Gemma 4" : "Filled by AI · demo"}
                  </span>
                ) : (
                  <button type="button" className="pill pill-line pill-sm" onClick={fillWithAi}>
                    Fill with AI instead
                  </button>
                )}
              </div>

              <Field i={0} id="sell-title" label="Title" hint={`${form.title.length}/80`}>
                <input id="sell-title" value={form.title} maxLength={80} onChange={(e) => set("title", e.target.value)} placeholder="Crimson rush dress" className={INPUT} />
              </Field>

              <SaleChoice sale={sale} onChange={setSale} campus={campus} />

              <div className="grid gap-7 sm:grid-cols-2">
                <Field i={1} id="sell-brand" label="Brand">
                  <input id="sell-brand" value={form.brand} maxLength={60} onChange={(e) => set("brand", e.target.value)} placeholder="Lulus, Aritzia, vintage…" className={INPUT} />
                </Field>
                <Field i={2} id="sell-price" label={sale.mode === "auction" ? "Starting bid" : "Buy-now price"} hint={ai ? `Similar sold for ${money(ai.range[0])}–${money(ai.range[1])}` : undefined}>
                  <div className="relative">
                    <span className="num pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-[16px] font-bold">$</span>
                    <input
                      id="sell-price"
                      inputMode="decimal"
                      value={form.price}
                      onChange={(e) => set("price", e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="45"
                      className={`${INPUT} num pl-9 font-bold`}
                    />
                  </div>
                </Field>
              </div>

              <Fees cents={priceOk ? cents : null} />

              <Group i={3} label="Category">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" aria-pressed={form.category === c} onClick={() => set("category", c)} className="chip">
                    {c}
                  </button>
                ))}
              </Group>

              <Group i={4} label="Size">
                {SIZES.map((s) => (
                  <button key={s} type="button" aria-pressed={form.size === s} onClick={() => set("size", s)} className="chip min-w-12 justify-center">
                    {sizeLabel(s)}
                  </button>
                ))}
              </Group>

              <Group i={5} label="Condition">
                {CONDITIONS.map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={form.condition === id} onClick={() => set("condition", id)} className="chip">
                    {label}
                  </button>
                ))}
              </Group>

              <Group i={6} label="Moments" hint="Where it shows up in Discover. Pick up to 3.">
                {MOMENTS.map((m) => {
                  const on = form.tags.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={on}
                      disabled={!on && form.tags.length >= 3}
                      onClick={() => set("tags", on ? form.tags.filter((t) => t !== m) : [...form.tags, m])}
                      className="chip disabled:opacity-40"
                    >
                      {m}
                    </button>
                  );
                })}
              </Group>

              <Field i={7} id="sell-desc" label="Description" hint={`${form.description.length}/1000`}>
                <textarea
                  id="sell-desc"
                  rows={4}
                  maxLength={1000}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Fit, how often it's been worn, anything a buyer should know."
                  className="w-full resize-y rounded-[4px] border-2 border-[var(--gray-200)] px-5 py-3.5 text-[16px] leading-relaxed outline-none transition-colors placeholder:text-[var(--gray-600)] focus:border-ink"
                />
              </Field>

              <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] -mx-[var(--gutter)] border-t border-[var(--gray-100)] bg-paper px-[var(--gutter)] py-4 md:bottom-0 md:mx-0 md:px-0">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <button type="submit" className="pill pill-ink" disabled={missing.length > 0 || phase === "posting"}>
                    {phase === "posting" ? (
                      <>
                        Posting<span style={{ animation: "sell-blink 1s infinite" }}>…</span>
                      </>
                    ) : (
                      <>
                        {sale.mode === "auction" ? "Start the auction" : "Post it"} <Arrow width={18} height={18} />
                      </>
                    )}
                  </button>
                  <p className="muted text-[14px]">
                    {missing.length
                      ? `Add ${missing.join(", ")} to post.`
                      : sale.mode === "auction"
                        ? `Bids start at ${money(cents, true)} and run ${durationLabel(sale.hours)}. Top bid wins.`
                        : `You keep ${money(cents, true)}. Shows on ${campus ?? "your campus"}'s rack right away.`}
                  </p>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const INPUT =
  "h-12 w-full rounded-full border-2 border-[var(--gray-200)] px-5 text-[16px] outline-none transition-colors placeholder:text-[var(--gray-600)] focus:border-ink";

const rise = (i: number) => ({ animation: `rise-in 0.55s var(--ease-out-expo) ${i * 55}ms both` });

function Field({ i, id, label, hint, children }: { i: number; id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div style={rise(i)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[14px] font-semibold">
          {label}
        </label>
        {hint && <span className="muted num text-[13px]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Group({ i, label, hint, children }: { i: number; label: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset style={rise(i)}>
      <legend className="mb-2.5 text-[14px] font-semibold">
        {label}
        {hint && <span className="muted ml-2 font-normal">{hint}</span>}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function SaleChoice({ sale, onChange, campus }: { sale: Sale; onChange: (s: Sale) => void; campus: string | null }) {
  const options: [Mode, string, string][] = [
    ["auction", "Timed auction", `Set a starting bid. ${campus ?? "Your campus"} bids until the timer ends; top bid wins.`],
    ["now", "Buy now", "Set a price. First to buy it gets it."],
  ];
  return (
    <fieldset style={rise(1)}>
      <legend className="mb-2.5 text-[14px] font-semibold">How do you want to sell?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map(([id, label, body]) => (
          <button
            key={id}
            type="button"
            aria-pressed={sale.mode === id}
            onClick={() => onChange({ ...sale, mode: id })}
            className="rounded-[4px] border-2 border-[var(--gray-200)] p-4 text-left transition-[border-color] duration-200 hover:border-[var(--gray-400)] aria-pressed:border-ink"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-[16px] font-semibold">{label}</span>
              <span className={`grid size-5 place-items-center rounded-full border-2 ${sale.mode === id ? "border-ink bg-ink text-paper" : "border-[var(--gray-200)]"}`}>
                {sale.mode === id && <Check width={12} height={12} strokeWidth={3.5} />}
              </span>
            </span>
            <span className="muted mt-1 block text-[14px] leading-relaxed">{body}</span>
          </button>
        ))}
      </div>
      {sale.mode === "auction" && (
        <div className="mt-4" style={{ animation: "rise-in 0.4s var(--ease-out-expo) both" }}>
          <p className="mb-2.5 text-[14px] font-semibold">
            Auction length <span className="muted ml-2 font-normal">Bidding opens the moment you post.</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map(([h, label]) => (
              <button key={h} type="button" aria-pressed={sale.hours === h} onClick={() => onChange({ ...sale, hours: h })} className="chip min-w-14 justify-center">
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </fieldset>
  );
}

/** 0% seller fee; buyer pays 5% + $0.50 (PRODUCT.md, lib/format buyerFee). */
function Fees({ cents }: { cents: number | null }) {
  return (
    <div className="grid gap-1.5 rounded-[4px] bg-[var(--gray-50)] px-5 py-4 text-[14px]" style={rise(3)}>
      <p className="flex justify-between gap-4">
        <span className="font-semibold">You keep</span>
        <span className="num font-bold">{cents ? money(cents, true) : "—"}</span>
      </p>
      <p className="muted flex justify-between gap-4">
        <span>Buyer pays</span>
        <span className="num">{cents ? `${money(cents + buyerFee(cents), true)} with fee` : "—"}</span>
      </p>
      <p className="muted mt-1 text-[13px]">0% seller fee; buyer pays 5% + $0.50.</p>
    </div>
  );
}

function Scanner({ stage }: { stage: number }) {
  return (
    <>
      <span className="absolute inset-0 bg-ink/25" />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 h-[3px] bg-[var(--campus-on-dark)] shadow-[0_0_24px_6px_var(--campus-on-dark)]"
        style={{ animation: `sell-scan ${READ_MS / 2}ms ease-in-out infinite alternate` }}
      />
      {["top-4 left-4 border-t-[3px] border-l-[3px]", "top-4 right-4 border-t-[3px] border-r-[3px]", "bottom-[76px] left-4 border-b-[3px] border-l-[3px]", "bottom-[76px] right-4 border-b-[3px] border-r-[3px]"].map((c) => (
        <span key={c} aria-hidden="true" className={`absolute size-8 border-paper ${c}`} />
      ))}
      <div data-ground="dark" className="absolute inset-x-0 bottom-0 bg-ink px-5 py-4 text-paper" role="status" aria-live="polite">
        <p className="flex items-center gap-2.5 text-[15px] font-semibold">
          <span className="size-2 rounded-full bg-[var(--campus-on-dark)]" style={{ animation: "sell-blink 0.8s infinite" }} />
          Reading your photo…
        </p>
        <p className="muted mt-0.5 text-[13px]">{STAGES[stage]}</p>
      </div>
    </>
  );
}

function FormSkeleton({ stage }: { stage: number }) {
  return (
    <div className="grid gap-7" aria-busy="true" aria-label="Filling in your listing">
      <div className="flex items-center justify-between gap-3">
        <div className="skeleton h-10 w-[58%] rounded-[2px]" />
        <span className="muted num text-[13px] font-semibold">
          {stage + 1}/{STAGES.length}
        </span>
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="grid gap-2">
          <div className="skeleton h-3.5 w-24 rounded-[2px]" />
          <div className={`skeleton h-12 rounded-full ${i % 2 ? "w-[70%]" : "w-full"}`} />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {[64, 88, 72, 96, 80].map((w, i) => (
          <div key={i} className="skeleton h-9 rounded-full" style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    ["Add a photo", "The whole piece, good light. A mirror pic works."],
    ["AI fills it in", "Title, brand, size, condition, a price and its Moments, in a couple of seconds."],
    ["Check it and post", "Change anything. It's on your campus rack the moment you post."],
  ];
  return (
    <div>
      <ol className="grid gap-px overflow-hidden rounded-[4px] border-2 border-ink bg-ink">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-5 bg-paper p-[clamp(20px,2.4vw,32px)]">
            <span className="display text-[44px] leading-none text-[var(--campus-line)]">{i + 1}</span>
            <div>
              <p className="text-[17px] font-semibold">{t}</p>
              <p className="muted mt-1 text-[15px] leading-relaxed">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="muted mt-5 text-[14px] leading-relaxed">0% seller fee; buyer pays 5% + $0.50. You meet up on campus to hand it off.</p>
    </div>
  );
}

function Done({
  photo,
  form,
  cents,
  sale,
  allIn,
  live,
  campus,
  chapter,
  closetHref,
  cupHref,
  feedHref,
  onAnother,
}: {
  photo: Photo;
  form: Form;
  cents: number;
  sale: Sale;
  allIn: boolean;
  live: boolean;
  campus: string | null;
  chapter: string | null;
  closetHref: string;
  cupHref: string;
  feedHref: string;
  onAnother: () => void;
}) {
  const brandLine = form.brand.trim() || form.category || "Other";
  const auction = sale.mode === "auction";
  const ends = durationLabel(sale.hours);
  return (
    <div className="column pt-10 pb-24 md:pt-14">
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_280px] md:items-start md:gap-14 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div style={{ animation: "rise-in 0.6s var(--ease-out-expo) both" }}>
          <span className="stamp">
            <span className="stamp-dot" /> {live ? `Live on ${campus ?? "Bidd"}` : "Demo listing"}
          </span>
          <h1 className="display mt-5 text-[clamp(3rem,6vw,5rem)]">{auction ? "Bidding is open." : <>It&apos;s on the rack.</>}</h1>
          {auction && (
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-ink px-4 py-2 text-[15px] font-semibold">
              <span className="size-2 rounded-full bg-[var(--campus-line)]" style={{ animation: "sell-blink 1s infinite" }} />
              Bidding opens now · ends in {ends}
            </p>
          )}
          <p className="muted mt-4 max-w-[52ch] text-[17px] leading-relaxed">
            {auction ? (
              <>
                {form.title.trim()} starts at {money(cents, true)}. {campus ?? "Your campus"} bids until the timer ends; the top bid wins, then you pick a meetup spot.
              </>
            ) : (
              <>
                {form.title.trim()} is up for {money(cents, true)}. We&apos;ll ping you when someone wants it, then you pick a meetup spot.
              </>
            )}
          </p>
          <div data-ground="dark" className="mt-8 flex max-w-[560px] items-start gap-4 rounded-[4px] bg-ink p-5 text-paper">
            <Trophy width={24} height={24} className="mt-0.5 shrink-0 text-[var(--campus-on-dark)]" />
            <p className="text-[16px] leading-relaxed">
              <span className="font-semibold">Counts toward {chapter ? `${chapter}'s` : "your chapter's"} Closet Cup when it sells.</span>{" "}
              <span className="muted">Every completed sale is 10 points.</span>
            </p>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={closetHref} className="pill pill-ink">
              See your closet <Arrow width={18} height={18} />
            </Link>
            <button type="button" className="pill pill-line" onClick={onAnother}>
              <Plus width={18} height={18} /> Sell another
            </button>
            {/* closetHref is withLab("/c/me"); swapping the path keeps ?school and the lab params. */}
            <Link href={closetHref.replace("/c/me", "/store/new")} className="pill pill-line">
              Open your store
            </Link>
            <Link href={cupHref} className="pill pill-line">
              Closet Cup
            </Link>
          </div>
          <Link href={feedHref} className="muted mt-6 inline-block text-[14px] font-semibold underline-offset-4 hover:text-ink hover:underline">
            Back to the feed
          </Link>
        </div>

        {/* Preview, in the shape of components/listing.tsx's card. */}
        <div style={{ animation: "rise-in 0.6s var(--ease-out-expo) 120ms both" }}>
          <p className="muted mb-3 text-[13px] font-semibold">How buyers see it</p>
          <div className="group relative">
            <div className="photo relative overflow-hidden bg-[var(--gray-50)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]" />
              <span className="field display absolute bottom-0 left-0 px-3 pt-1.5 pb-1 text-[22px]">{auction ? `Bids · ${ends}` : "Just in"}</span>
            </div>
            <div className="mt-2.5 grid gap-0.5 text-[14px] leading-snug">
              <p className="truncate font-semibold">{brandLine}</p>
              <p className="muted truncate">{form.size ? sizeLabel(form.size) : ""}</p>
              <p className="num font-bold">
                {auction && <span className="muted mr-1.5 text-[12px] font-semibold">Start bid</span>}
                {allIn ? money(cents + buyerFee(cents), true) : money(cents)}
                {allIn && <span className="muted ml-1.5 text-[12px] font-semibold">all-in</span>}
              </p>
            </div>
          </div>
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {form.condition && <li className="chip chip-quiet">{conditionLabel(form.condition)}</li>}
            {form.tags.map((t) => (
              <li key={t} className="chip chip-quiet">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* Live publishing. The fetches are local (lib/api.ts belongs to another track); the session comes from lib/api. */

/** Track A's session (in-memory access token, refreshed from bidd.refreshToken), then a few legacy keys. */
async function sessionToken(): Promise<string | null> {
  try {
    const t = await accessToken();
    if (t) return t;
  } catch {
    // refresh failed or the API is unreachable: try the legacy keys, then fall back to the mock success
  }
  return readToken();
}

function readToken(): string | null {
  try {
    for (const store of [sessionStorage, localStorage]) {
      for (const k of ["bidd.accessToken", "bidd-access-token", "bidd_access_token", "accessToken"]) {
        const v = store.getItem(k);
        if (v) return v;
      }
      for (const k of ["bidd.session", "bidd-session", "bidd_session", "session"]) {
        const raw = store.getItem(k);
        if (!raw) continue;
        try {
          const s = JSON.parse(raw) as { accessToken?: string; session?: { accessToken?: string } };
          const t = s.accessToken ?? s.session?.accessToken;
          if (t) return t;
        } catch {
          // not JSON
        }
      }
    }
  } catch {
    // storage blocked
  }
  return null;
}

/* AI fill. Real photos ask Gemma 4 through /api/ai-listing; anything short of a usable answer in AI_MS gets the demo fill. */

async function readPhoto(photo: Photo, campus: string | null): Promise<{ fill: Fill; model: boolean }> {
  const fill = await askModel(photo, campus);
  if (fill) return { fill, model: true };
  const rgb = await averageColor(photo.url);
  return { fill: fillFromPhoto(photo.name, photo.bytes, rgb, campus), model: false };
}

/** The route's fill, re-checked against the form's enums, or null (no key, rate limit, error, bad answer, timeout). */
async function askModel(photo: Photo, campus: string | null): Promise<Fill | null> {
  const ctrl = new AbortController();
  let timer = 0;
  const attempt = (async () => {
    try {
      const body = new FormData();
      // 1024px is more than the model's image budget uses and keeps the upload small (Vercel caps bodies at 4.5 MB).
      body.append("photo", await shrink(photo, 1024), "photo.jpg");
      if (campus) body.append("campus", campus);
      const res = await fetch("/api/ai-listing", { method: "POST", body, signal: ctrl.signal });
      if (!res.ok) return null;
      const data = (await res.json()) as { fill?: unknown };
      return repairFill(data.fill);
    } catch {
      return null;
    }
  })();
  const timeout = new Promise<null>((r) => {
    timer = window.setTimeout(() => {
      ctrl.abort();
      r(null);
    }, AI_MS);
  });
  const fill = await Promise.race([attempt, timeout]);
  window.clearTimeout(timer);
  return fill;
}

/** Phone photos can be huge: re-encode to JPEG, max 2000px (or `max`), so the upload stays under 4 MB. */
async function shrink(photo: Photo, max = 2000): Promise<Blob> {
  const blob = photo.file ?? (await (await fetch(photo.url)).blob());
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const out = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    if (out && out.size <= MAX_BYTES) return out;
  } catch {
    // fall through to the original
  }
  return blob;
}

/** POST draft → upload photo → PATCH active. Returns the listing id, or null to fall back to the mock success. */
async function publishLive(form: Form, cents: number, photo: Photo, sale: Sale): Promise<string | null> {
  if (!isLive()) return null;
  const token = await sessionToken();
  if (!token) return null;
  const auth = { Authorization: `Bearer ${token}` };
  let draftId: string | null = null;
  try {
    const created = await fetch(apiUrl("/api/listings"), {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim(),
        brand: form.brand.trim() || null,
        priceCents: cents,
        size: form.size,
        condition: form.condition,
        tags: form.tags.map((t) => API_TAG[t]).filter(Boolean),
      }),
    });
    if (!created.ok) return null;
    const { listing } = (await created.json()) as { listing: { id: string } };
    draftId = listing.id;
    const path = `/api/listings/${encodeURIComponent(listing.id)}`;

    const body = new FormData();
    body.append("photo", await shrink(photo), "photo.jpg");
    const uploaded = await fetch(apiUrl(`${path}/media`), { method: "POST", headers: auth, body });
    if (!uploaded.ok) throw new Error("upload failed");

    const published = await fetch(apiUrl(path), {
      method: "PATCH",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    if (!published.ok) throw new Error("publish failed");
    // Timed auction (backend contract): best effort; a failure leaves a live buy-now listing and never blocks the success.
    if (sale.mode === "auction") {
      await fetch(apiUrl(`${path}/auction`), {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ startCents: cents, hours: sale.hours }),
      }).catch(() => null);
    }
    return listing.id;
  } catch {
    // Don't leave a half-made draft on the seller's account; best effort, never blocks the fallback.
    if (draftId) {
      fetch(apiUrl(`/api/listings/${encodeURIComponent(draftId)}`), {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "removed" }),
      }).catch(() => {});
    }
    return null;
  }
}
