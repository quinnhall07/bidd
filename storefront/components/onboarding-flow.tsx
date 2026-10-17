"use client";
// Onboarding (build.md /onboarding): pick your chapter (join code optional), then your sizes.
// Live mode (NEXT_PUBLIC_BIDD_API_URL set and signed in): chapters come from GET /api/organizations, the student adds a
// display name, and Continue sends POST /api/onboarding. A chapter pick is a request until an officer approves it.
// No session or a failed load falls back to the mock flow silently.
// A real student finishes on their real campus: the feed and sell links carry ?school=<GET /api/me campus slug>.
import Link from "next/link";
import { useEffect, useState } from "react";
import { errorMessage, getMe, getOrganizations, hasSession, isLive, isUnreachable, onboarding } from "@/lib/api";
import { primeSessionUser, refreshSessionUser } from "@/lib/session-user";
import { Alert, Arrow, Check } from "./icons";

type ChapterOption = { id: string; slug: string; name: string; sub: string; letters: boolean };

const SIZES = {
  Tops: ["XS", "S", "M", "L", "XL"],
  Dresses: ["0", "2", "4", "6", "8", "10"],
  Shoes: ["6", "7", "8", "9", "10", "11"],
};

const KIND: Record<string, string> = { sorority: "Sorority", fraternity: "Fraternity", brand: "Brand", other: "Organization" };

export function OnboardingFlow({ campus: mockCampus, chapters: mockChapters, feedHref, closetHref }: { campus: string; chapters: ChapterOption[]; feedHref: string; closetHref: string }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [chapter, setChapter] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  // Live mode: on only once the API answered for a signed-in student.
  const [live, setLive] = useState<{ campus: string; slug: string; chapters: ChapterOption[]; badge: string } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const chapters = live?.chapters ?? mockChapters;
  const campus = live?.campus ?? mockCampus;
  const picked = chapters.find((c) => c.id === chapter);
  // Live: same lab params, but the campus is the account's (never one picked from the URL or the email domain).
  const onCampus = (href: string, path?: string) => {
    if (!live?.slug) return href;
    const [p, q] = href.split("?");
    const params = new URLSearchParams(q);
    params.set("school", live.slug);
    return `${path ?? p}?${params}`;
  };

  useEffect(() => {
    if (!isLive() || !hasSession()) return;
    let cancelled = false;
    Promise.all([getMe(), getOrganizations()])
      .then(([me, orgs]) => {
        if (cancelled) return;
        primeSessionUser(me);
        setDisplayName((n) => n || me.user.displayName || "");
        // A mock chapter picked before the API answered isn't a real organization id.
        setChapter((c) => (c === "none" || orgs.some((o) => o.id === c) ? c : null));
        setLive({
          campus: me.campus.shortName,
          slug: me.campus.slug,
          badge: me.badges[0]?.label ?? "School email verified",
          chapters: orgs.map((o) => ({
            id: o.id,
            slug: o.id,
            name: o.name,
            letters: false,
            sub: [KIND[o.kind] ?? "Organization", o.nationalOrg && o.nationalOrg !== o.name ? o.nationalOrg : null].filter(Boolean).join(" · "),
          })),
        });
      })
      .catch(() => {
        /* signed out, offline or API down: stay on the mock flow */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const name = displayName.trim();
  const nameOk = name.length >= 2 && name.length <= 40;

  const submit = async () => {
    if (!live) return setStep(2);
    setBusy(true);
    setError(null);
    try {
      const res = await onboarding({ displayName: name, ...(chapter && chapter !== "none" ? { organizationId: chapter } : {}) });
      setPending(res.chapterRequest?.status === "pending");
      // The display name just changed: refresh the header's copy of /api/me.
      void refreshSessionUser();
      setStep(2);
    } catch (e) {
      // API gone mid-flow: keep the demo moving instead of stranding the student on step 1.
      if (isUnreachable(e)) setStep(2);
      else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const toggle = (s: string) => setSizes((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]));

  return (
    <div className="column pt-10 pb-24 md:pt-14">
      <p className="muted text-[14px] font-semibold">{step < 3 ? `Step ${step} of 2` : "Done"}</p>

      {step === 1 && (
        <>
          <h1 className="display mt-3 text-[clamp(3rem,6vw,5rem)]">Pick your chapter.</h1>
          <p className="muted mt-4 max-w-[56ch] text-[17px] leading-relaxed">
            {live
              ? "Every piece you sell on Bidd is points for your chapter in the Fall Cup. An officer approves your request, then your sales count."
              : "Every piece you sell on Bidd is points for your chapter in the Fall Cup. You can change this later."}
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {chapters.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={chapter === c.id}
                  onClick={() => setChapter(c.id)}
                  className="flex h-full w-full flex-col items-start gap-3 rounded-[4px] border-2 border-[var(--gray-200)] p-5 text-left transition-colors duration-300 hover:border-ink aria-pressed:border-[var(--campus)] aria-pressed:bg-[var(--campus)] aria-pressed:text-[var(--campus-ink)]"
                >
                  <span className={`display ${c.letters ? "text-[44px]" : "text-[30px]"}`}>{c.name}</span>
                  <span className="text-[14px] font-semibold opacity-80">{c.sub}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                aria-pressed={chapter === "none"}
                onClick={() => setChapter("none")}
                className="flex h-full w-full flex-col items-start gap-3 rounded-[4px] border-2 border-dashed border-[var(--gray-200)] p-5 text-left hover:border-ink aria-pressed:border-solid aria-pressed:border-ink"
              >
                <span className="text-[17px] font-semibold">I&apos;m not in a chapter</span>
                <span className="muted text-[14px]">You can still buy and sell. Your sales just don&apos;t count toward a chapter.</span>
              </button>
            </li>
          </ul>
          {live && (
            <div className="mt-8 max-w-[460px]">
              <label htmlFor="display-name" className="text-[14px] font-semibold">
                Your name on Bidd
              </label>
              <input
                id="display-name"
                value={displayName}
                maxLength={40}
                autoComplete="nickname"
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setError(null);
                }}
                placeholder="First name works"
                className="mt-2 h-12 w-full rounded-full border-2 border-ink px-5 text-[16px] font-semibold outline-none placeholder:font-normal placeholder:text-[var(--gray-600)] focus:border-[var(--campus-line)]"
              />
              <p className="muted mt-2 text-[14px]">Buyers see this on your listings. Never your email.</p>
            </div>
          )}
          {!live && chapter && chapter !== "none" && (
            <div className="mt-8 max-w-[460px]">
              <label htmlFor="join" className="text-[14px] font-semibold">
                Join code (optional)
              </label>
              <input
                id="join"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="From your officers"
                className="mt-2 h-12 w-full rounded-full border-2 border-ink px-5 text-[16px] font-semibold uppercase outline-none placeholder:normal-case placeholder:font-normal placeholder:text-[var(--gray-600)] focus:border-[var(--campus-line)]"
              />
              <p className="muted mt-2 text-[14px]">With the code you skip the gate: your chapter closet and its drops unlock right away.</p>
            </div>
          )}
          {live && (
            <p className="mt-6 flex min-h-6 items-start gap-2 text-[15px] font-semibold" role="status">
              {error && (
                <>
                  <Alert width={20} height={20} className="mt-0.5 shrink-0" /> {error}
                </>
              )}
            </p>
          )}
          <button type="button" className={`pill pill-ink ${live ? "mt-4" : "mt-10"}`} disabled={!chapter || busy || (!!live && !nameOk)} onClick={() => void submit()}>
            {busy ? "Saving…" : "Continue"} <Arrow width={18} height={18} />
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="display mt-3 text-[clamp(3rem,6vw,5rem)]">Your sizes.</h1>
          <p className="muted mt-4 max-w-[56ch] text-[17px] leading-relaxed">We use these for &quot;My sizes&quot; in search, so the feed shows what fits first.</p>
          <div className="mt-8 grid gap-6">
            {Object.entries(SIZES).map(([group, list]) => (
              <fieldset key={group}>
                <legend className="mb-3 text-[15px] font-semibold">{group}</legend>
                <div className="flex flex-wrap gap-2">
                  {list.map((s) => {
                    const key = `${group}:${s}`;
                    return (
                      <button key={key} type="button" aria-pressed={sizes.includes(key)} onClick={() => toggle(key)} className="chip min-w-14 justify-center">
                        {s}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <button type="button" className="pill pill-ink" onClick={() => setStep(3)}>
              {sizes.length ? "Save my sizes" : "Skip for now"} <Arrow width={18} height={18} />
            </button>
            <button type="button" className="pill pill-line" onClick={() => setStep(1)}>
              Back
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="display mt-3 text-[clamp(3rem,6vw,5rem)]">You&apos;re 1 of 1.</h1>
          <ul className="mt-6 grid max-w-[560px] gap-3 text-[17px]">
            <li className="flex items-center gap-3">
              <Check width={20} height={20} strokeWidth={2.5} className="text-[var(--campus-line)]" /> {`${live?.badge ?? "School email verified"} · ${campus}`}
            </li>
            <li className="flex items-center gap-3">
              <Check width={20} height={20} strokeWidth={2.5} className="text-[var(--campus-line)]" />
              {picked ? `${picked.name}${live ? (pending ? ", waiting on an officer" : "") : code ? ", closet unlocked" : ""}` : "No chapter for now"}
            </li>
            <li className="flex items-center gap-3">
              <Check width={20} height={20} strokeWidth={2.5} className="text-[var(--campus-line)]" />
              {sizes.length ? `Sizes: ${sizes.map((s) => s.split(":")[1]).join(", ")}` : "Sizes: add them any time"}
            </li>
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={onCampus(feedHref)} className="pill pill-ink">
              Go to the feed <Arrow width={18} height={18} />
            </Link>
            <Link href={live ? onCampus(closetHref, "/sell") : closetHref} className="pill pill-line">
              Post your first piece
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
