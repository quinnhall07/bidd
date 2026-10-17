"use client";
// Sign-in: school email → 6-digit code → campus confirmation. The campus comes from the email
// domain, and the page repaints in its colors the moment it's verified.
// Mock mode (no NEXT_PUBLIC_BIDD_API_URL): no email is sent and any 6 digits work.
// Live mode: real codes through the Bidd API, with Cloudflare Turnstile when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { campusTheme } from "@/lib/brand/campus";
import { BiddWordmark } from "@/lib/brand/bidd-logo";
import { errorMessage, getMe, isLive, isUnreachable, requestCode, verifyCode, type MeResponse, type RequestCodeResponse } from "@/lib/api";
import { Alert, Arrow, Check } from "./icons";

export type LoginCampus = {
  slug: string;
  name: string;
  full_name: string;
  email_domains: string[];
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  logo_url_dark: string | null;
};

const DEMO = [
  { label: "Alabama", email: "taylorm@crimson.ua.edu" },
  { label: "Ole Miss", email: "taylorm@go.olemiss.edu" },
  { label: "LSU", email: "taylorm@lsu.edu" },
  { label: "Vanderbilt (new campus)", email: "taylorm@vanderbilt.edu" },
];

const match = (email: string, campuses: LoginCampus[]) => {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return campuses.find((c) => c.email_domains.some((d) => domain === d || domain.endsWith(`.${d}`))) ?? null;
};

const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void; "error-callback"?: () => void }) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
const turnstile = () => (typeof window === "undefined" ? undefined : (window as unknown as { turnstile?: Turnstile }).turnstile);

let turnstileLoad: Promise<void> | null = null;
const loadTurnstile = () =>
  (turnstileLoad ??= new Promise<void>((resolve, reject) => {
    if (turnstile()) return resolve();
    const el = document.createElement("script");
    el.src = TURNSTILE_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      turnstileLoad = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(el);
  }));

/** The API's campus, matched to our campus palette by slug, or built from the API's theme colors. */
const fromMe = (me: MeResponse, email: string, campuses: LoginCampus[]): LoginCampus =>
  campuses.find((c) => c.slug === me.campus.slug) ??
  match(email, campuses) ?? {
    slug: me.campus.slug,
    name: me.campus.shortName,
    full_name: me.campus.name,
    email_domains: [email.split("@")[1] ?? ""],
    primary_color: me.campus.theme.primary ?? "#111111",
    secondary_color: me.campus.theme.secondary ?? "#777777",
    logo_url: null,
    logo_url_dark: null,
  };

/** When /api/me can't answer: our palette by email domain, else a black-and-white card named by request-code. */
const fallbackCampus = (email: string, campuses: LoginCampus[], sent: RequestCodeResponse["campus"] | null): LoginCampus | null =>
  match(email, campuses) ??
  (sent
    ? {
        slug: "",
        name: sent.shortName,
        full_name: sent.name,
        email_domains: [email.split("@")[1] ?? ""],
        primary_color: "#111111",
        secondary_color: "#777777",
        logo_url: null,
        logo_url_dark: null,
      }
    : null);

export function LoginFlow({ campuses, labQuery, initialEmail, logos }: { campuses: LoginCampus[]; labQuery: string; initialEmail: string; logos: string }) {
  const router = useRouter();
  // If the API can't be reached (backend down, CORS, wrong URL), the page drops to the mock sign-in for this visit.
  const [offline, setOffline] = useState(false);
  const live = isLive() && !offline;
  const [step, setStep] = useState<"email" | "code" | "campus">("email");
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  // Live mode only.
  const [busy, setBusy] = useState(false);
  const [sentCampus, setSentCampus] = useState<RequestCodeResponse["campus"] | null>(null);
  const [liveCampus, setLiveCampus] = useState<LoginCampus | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(true);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);
  const widgetBox = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const useCaptcha = live && TURNSTILE_KEY.length > 0;
  const campus = step === "campus" ? (live ? liveCampus : match(email, campuses)) : null;

  // Turnstile renders on the email step, and only in live mode with a site key.
  useEffect(() => {
    if (!useCaptcha || step !== "email") return;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        const t = turnstile();
        if (cancelled || !t || !widgetBox.current) return;
        widgetId.current = t.render(widgetBox.current, {
          sitekey: TURNSTILE_KEY,
          callback: (token) => {
            setCaptcha(token);
            setCaptchaError(false);
          },
          "expired-callback": () => setCaptcha(null),
          "error-callback": () => setCaptchaError(true),
        });
      })
      .catch(() => {
        if (!cancelled) setCaptchaError(true);
      });
    return () => {
      cancelled = true;
      if (widgetId.current) turnstile()?.remove(widgetId.current);
      widgetId.current = null;
      setCaptcha(null);
    };
  }, [useCaptcha, step]);

  const sendMock = (e: string) => {
    if (!match(e, campuses))
      return setError(
        e.endsWith(".edu")
          ? `Bidd isn't open at ${e.split("@")[1]} yet. We're adding campuses fast. Ask your chapter to bring Bidd to your school.`
          : "Use your school email, the one that ends in .edu. That's how Bidd knows your campus.",
      );
    setEmail(e);
    setError(null);
    setStep("code");
    setTimeout(() => boxes.current[0]?.focus(), 50);
  };

  const sendLive = async (e: string) => {
    // If the check itself can't load (no internet), let the API answer instead of locking the button.
    if (useCaptcha && !captcha && !captchaError) return setError("Finish the quick check below first.");
    setBusy(true);
    setError(null);
    try {
      const res = await requestCode(e, captcha ?? undefined);
      setSentCampus(res.campus ?? null);
      setCode(Array(6).fill(""));
      setStep("code");
      setTimeout(() => boxes.current[0]?.focus(), 50);
    } catch (err) {
      // A Turnstile hostname that isn't allowed yet fails as captcha_failed: fall back to the demo sign-in too.
      if (isUnreachable(err) || (err as { code?: string })?.code === "captcha_failed") {
        setOffline(true);
        sendMock(e);
      } else setError(errorMessage(err));
    } finally {
      // Turnstile tokens are single use.
      if (widgetId.current) turnstile()?.reset(widgetId.current);
      setCaptcha(null);
      setBusy(false);
    }
  };

  const verifyLive = async (digits: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await verifyCode(email, digits);
      setNeedsOnboarding(res.needsOnboarding);
      const me = await getMe().catch(() => null);
      setLiveCampus(me ? fromMe(me, email, campuses) : fallbackCampus(email, campuses, sentCampus));
      setStep("campus");
    } catch (err) {
      if (isUnreachable(err) && match(email, campuses)) {
        setOffline(true);
        setStep("campus");
        return;
      }
      setError(errorMessage(err));
      setCode(Array(6).fill(""));
      setTimeout(() => boxes.current[0]?.focus(), 50);
    } finally {
      setBusy(false);
    }
  };

  const finish = (digits: string) => {
    if (live) void verifyLive(digits);
    else setTimeout(() => setStep("campus"), 250);
  };
  const theme = campus ? campusTheme({ primary: campus.primary_color, secondary: campus.secondary_color }) : undefined;

  const send = (value = email) => {
    const e = value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return setError("Enter your full school email, like you@crimson.ua.edu.");
    if (live) {
      // The API decides which schools are open; its message is shown as-is.
      setEmail(e);
      return void sendLive(e);
    }
    sendMock(e);
  };

  const put = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = d;
    setCode(next);
    if (d && i < 5) boxes.current[i + 1]?.focus();
    if (next.every(Boolean) && !busy) finish(next.join(""));
  };

  const domain = email.split("@")[1];
  const query = campus
    ? new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(labQuery)), ...(campus.slug ? { school: campus.slug } : {}) })
    : null;
  const next = query ? (live && !needsOnboarding ? `/?${query}` : `/onboarding?${query}`) : "/";

  return (
    <div style={theme as CSSProperties} data-duo="tape" className="grid min-h-dvh bg-paper text-ink md:grid-cols-2">
      {/* Poster side: black and white until the campus arrives, then the 1 and the stripe take its colors. */}
      <div data-ground="dark" className="relative flex flex-col justify-between overflow-hidden bg-ink p-[clamp(24px,4vw,56px)] text-paper">
        <Link href={labQuery ? `/?${labQuery}` : "/"} aria-label="Bidd home">
          <BiddWordmark tone="dark" className="h-8 w-auto text-paper" />
        </Link>
        <div className="py-16">
          <p className="display text-[clamp(4rem,9vw,8.5rem)]">Be 1 of 1.</p>
          <p className="mt-5 max-w-[34ch] text-[clamp(17px,1.6vw,20px)] leading-relaxed text-[var(--dim)]">
            The closet for college Greek life, on every campus. Resell your rush wardrobe, shop your chapter&apos;s drops, and every sale counts toward your chapter.
          </p>
        </div>
        <p className="text-[13px] text-[var(--dim)]">
          {live ? "We email a 6-digit code to your school address. No passwords." : "Demo sign-in. No email is sent, and any 6-digit code works."}
        </p>
        {campus && <div className="tape absolute inset-x-0 bottom-0" aria-hidden="true" />}
      </div>

      <div className="flex flex-col justify-center p-[clamp(24px,5vw,72px)]">
        <div className="w-full max-w-[460px]">
          {step === "email" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <h1 className="display text-[clamp(3rem,5vw,4.5rem)]">Sign in.</h1>
              <p className="muted mt-4 text-[17px] leading-relaxed">Bidd is campus-verified. Use your school email and your campus comes with it.</p>
              <label htmlFor="email" className="mt-8 block text-[14px] font-semibold">
                School email
              </label>
              <div className="mt-2 flex gap-2 rounded-full border-2 border-ink p-1.5 focus-within:border-[var(--campus-line)]">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@crimson.ua.edu"
                  className="min-w-0 flex-1 bg-transparent px-4 text-[17px] outline-none placeholder:text-[var(--gray-600)]"
                />
                <button className="pill pill-ink pill-sm" disabled={busy || (useCaptcha && !captcha && !captchaError)}>
                  {busy ? "Sending…" : "Send code"}
                </button>
              </div>
              {useCaptcha && (
                <div className="mt-4">
                  <div ref={widgetBox} className="min-h-[65px]" />
                  {captchaError && <p className="muted mt-2 text-[14px]">The quick check didn&apos;t load. Refresh the page to try again.</p>}
                </div>
              )}
              <p className="mt-3 flex min-h-6 items-start gap-2 text-[15px] font-semibold" role="status">
                {error && (
                  <>
                    <Alert width={20} height={20} className="mt-0.5 shrink-0" /> {error}
                  </>
                )}
              </p>
              {!live && (
              <div className="mt-8 border-t border-[var(--gray-100)] pt-6">
                <p className="text-[14px] font-semibold">Demo accounts</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DEMO.map((d) => (
                    <button
                      key={d.email}
                      type="button"
                      className="chip chip-quiet"
                      onClick={() => {
                        setEmail(d.email);
                        send(d.email);
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              )}
            </form>
          )}

          {step === "code" && (
            <div>
              <h1 className="display text-[clamp(3rem,5vw,4.5rem)]">Check your email.</h1>
              <p className="muted mt-4 text-[17px] leading-relaxed">
                We sent a 6-digit code to <b className="text-ink">{email}</b>. {live ? "It expires in 10 minutes." : "For the demo, any 6 digits work."}
              </p>
              <div
                className="mt-8 flex gap-2"
                onPaste={(e) => {
                  const v = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                  if (v.length === 6 && !busy) {
                    e.preventDefault();
                    setCode(v.split(""));
                    finish(v);
                  }
                }}
              >
                {code.map((c, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      boxes.current[i] = el;
                    }}
                    value={c}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label={`Digit ${i + 1}`}
                    disabled={busy}
                    onChange={(e) => {
                      if (live) setError(null);
                      put(i, e.target.value);
                    }}
                    onKeyDown={(e) => e.key === "Backspace" && !c && i > 0 && boxes.current[i - 1]?.focus()}
                    className="h-[60px] w-[52px] rounded-[4px] border-2 border-ink bg-paper text-center text-[24px] font-semibold outline-none focus:border-[var(--campus-line)]"
                  />
                ))}
              </div>
              {live && (
                <p className="mt-3 flex min-h-6 items-start gap-2 text-[15px] font-semibold" role="status">
                  {busy ? (
                    <span className="muted">Checking your code…</span>
                  ) : (
                    error && (
                      <>
                        <Alert width={20} height={20} className="mt-0.5 shrink-0" /> {error}
                      </>
                    )
                  )}
                </p>
              )}
              <button
                type="button"
                className="mt-6 text-[15px] font-semibold underline underline-offset-4"
                onClick={() => {
                  if (live) setError(null);
                  setStep("email");
                }}
              >
                {live ? "Get a new code or use a different email" : "Use a different email"}
              </button>
            </div>
          )}

          {step === "campus" && campus && (
            <div>
              <div className="flex items-center gap-4">
                {logos === "official" && campus.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={campus.logo_url} alt={`${campus.name} logo`} width={72} height={72} className="size-[72px] object-contain" />
                ) : (
                  <span className="field display inline-flex h-14 items-center rounded-[4px] px-3 pt-1 text-[28px]">{campus.name}</span>
                )}
                <span className="stamp">
                  <Check width={16} height={16} strokeWidth={3} /> School email verified
                </span>
              </div>
              <h1 className="display mt-8 text-[clamp(3rem,5vw,4.5rem)]">You&apos;re in at {campus.name}.</h1>
              <p className="mt-5 flex flex-wrap items-center gap-x-2 text-[17px] font-semibold">
                {domain} <Arrow width={18} height={18} /> {campus.full_name}
              </p>
              <p className="muted mt-3 text-[16px] leading-relaxed">
                {live && !needsOnboarding ? (
                  <>Welcome back. Your feed, drops and the Cup are {campus.name}&apos;s.</>
                ) : (
                  <>Your feed, drops and the Cup are {campus.name}&apos;s now. Next, pick your chapter so your sales count toward it.</>
                )}
              </p>
              <div className="tape mt-8" aria-hidden="true" />
              <button type="button" className="pill pill-ink mt-8" onClick={() => router.push(next)}>
                {live && !needsOnboarding ? "Go to the feed" : "Pick your chapter"} <Arrow width={18} height={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
