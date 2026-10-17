"use client";
// Open your store: gated on a school-email-verified student. Mock: the campus's demo viewer is verified.
// Create saves to localStorage (event handler only, never during render) and routes to /store/<handle>.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Arrow, Check, Lock } from "./icons";
import { STORE_KEY, StoreHeader, VerifiedBadge, handleError, readStores, toHandle, type Store } from "./store-header";

const INPUT =
  "h-12 w-full rounded-full border-2 border-[var(--gray-200)] px-5 text-[16px] outline-none transition-colors placeholder:text-[var(--gray-600)] focus:border-ink";

export function StoreCreate({
  verified,
  campus,
  domain,
  ownerName,
  palette,
  banners,
  sold,
  followers,
  query,
  loginHref,
  sellHref,
}: {
  verified: boolean;
  campus: string;
  domain: string | null;
  ownerName: string;
  palette: string[];
  banners: { src: string; label: string }[];
  sold: number;
  followers: number;
  query: string;
  loginHref: string;
  sellHref: string;
}) {
  const router = useRouter();
  const first = ownerName.split(" ")[0] || "My";
  const [name, setName] = useState(`${first}'s Closet`);
  const [handle, setHandle] = useState(toHandle(`${first}.closet`));
  const [touched, setTouched] = useState(false);
  const [bio, setBio] = useState("");
  const [accent, setAccent] = useState(palette[0]);
  const [banner, setBanner] = useState(banners[0]?.src ?? "");
  const [taken, setTaken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const error = taken === handle ? `@${handle} is taken.` : handleError(handle, () => false);
  const ok = verified && !error && name.trim().length >= 2;

  function create() {
    if (!ok) return;
    const stores = readStores();
    if (stores[handle] && stores[handle].owner !== ownerName) return setTaken(handle);
    setSaving(true);
    const store: Store = { handle, name: name.trim(), bio: bio.trim(), accent, banner, campus, owner: ownerName };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ ...stores, [handle]: store }));
    } catch {
      // storage blocked: the store page falls back to the demo closet
    }
    router.push(`/store/${handle}${query ? `?${query}` : ""}`);
  }

  if (!verified) {
    return (
      <div className="column pt-10 pb-24 md:pt-14">
        <p className="muted text-[14px] font-semibold">Student stores</p>
        <h1 className="display mt-3 text-[clamp(3rem,6vw,5rem)]">Verify to open a store.</h1>
        <div className="mt-8 flex max-w-[560px] items-start gap-4 rounded-[4px] border-2 border-ink p-[clamp(20px,2.4vw,32px)]">
          <Lock width={24} height={24} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-[17px] font-semibold">Stores are for verified students only.</p>
            <p className="muted mt-1 text-[15px] leading-relaxed">Sign in with your school email. Once it&apos;s verified, you can open a store on your campus in under a minute.</p>
            <Link href={loginHref} className="pill pill-ink mt-6">
              Verify your school email <Arrow width={18} height={18} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="column pt-10 pb-24 md:pt-14">
      <p className="muted text-[14px] font-semibold">Student stores · {campus}</p>
      <h1 className="display mt-3 text-[clamp(3rem,6vw,5rem)]">Open your store.</h1>
      <p className="muted mt-4 max-w-[58ch] text-[17px] leading-relaxed">
        Your own storefront on {campus}&apos;s rack: your name, your colors, your pieces. List with a timed auction or buy now. Only verified students can sell.
      </p>
      <div className="mt-6">
        <VerifiedBadge domain={domain} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        <form
          className="grid gap-7"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <Field id="store-name" label="Store name" hint={`${name.length}/40`}>
            <input
              id="store-name"
              value={name}
              maxLength={40}
              onChange={(e) => {
                setName(e.target.value);
                if (!touched) setHandle(toHandle(e.target.value));
              }}
              placeholder="Taylor's Closet"
              className={INPUT}
            />
          </Field>

          <Field id="store-handle" label="Handle" hint={error ?? `bidd.shop/@${handle}`} bad={Boolean(error) && handle.length > 0}>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-[16px] font-bold">@</span>
              <input
                id="store-handle"
                value={handle}
                maxLength={20}
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(error)}
                onChange={(e) => {
                  setTouched(true);
                  setHandle(toHandle(e.target.value));
                }}
                className={`${INPUT} pl-10 pr-12 font-semibold aria-[invalid=true]:border-[var(--campus-line)]`}
              />
              {!error && (
                <span className="absolute top-1/2 right-4 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-ink text-paper" aria-label="Handle available">
                  <Check width={14} height={14} strokeWidth={3} />
                </span>
              )}
            </div>
          </Field>

          <Field id="store-bio" label="Bio" hint={`${bio.length}/160`}>
            <textarea
              id="store-bio"
              rows={3}
              maxLength={160}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Rush dresses, gameday fits, worn once. Meetups at the Ferg."
              className="w-full resize-y rounded-[4px] border-2 border-[var(--gray-200)] px-5 py-3.5 text-[16px] leading-relaxed outline-none transition-colors placeholder:text-[var(--gray-600)] focus:border-ink"
            />
          </Field>

          <Group label="Accent" hint={`From ${campus}'s colors`}>
            {palette.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={accent === c}
                aria-label={`Accent ${c}`}
                onClick={() => setAccent(c)}
                className="grid size-12 place-items-center rounded-full border-2 border-[var(--gray-200)] transition-[border-color] duration-200 aria-pressed:border-ink"
              >
                <span className="size-8 rounded-full" style={{ backgroundColor: c }} />
              </button>
            ))}
          </Group>

          <Group label="Banner">
            <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-5">
              {banners.map((b) => (
                <button
                  key={b.src}
                  type="button"
                  aria-pressed={banner === b.src}
                  aria-label={`Banner: ${b.label}`}
                  onClick={() => setBanner(b.src)}
                  className="aspect-square overflow-hidden rounded-[4px] border-2 border-transparent transition-[border-color] duration-200 hover:border-[var(--gray-400)] aria-pressed:border-ink"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.src} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          </Group>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[var(--gray-100)] pt-5">
            <button type="submit" className="pill pill-ink" disabled={!ok || saving}>
              {saving ? "Opening…" : "Open my store"} <Arrow width={18} height={18} />
            </button>
            <Link href={sellHref} className="muted text-[14px] font-semibold underline-offset-4 hover:text-ink hover:underline">
              Just list a piece instead
            </Link>
          </div>
        </form>

        <div className="lg:sticky lg:top-[calc(var(--header)+24px)] lg:self-start">
          <p className="muted mb-3 text-[13px] font-semibold">Live preview</p>
          <div className="overflow-hidden rounded-[4px] border-2 border-ink">
            <StoreHeader store={{ handle, name, bio, accent, banner }} domain={domain} sold={sold} followers={followers} preview />
          </div>
          <p className="muted mt-3 text-[13px] leading-relaxed">Your listings show below the header. Bidd never prints merch; stores are for your own pieces.</p>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, hint, bad, children }: { id: string; label: string; hint?: string; bad?: boolean; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[14px] font-semibold">
          {label}
        </label>
        {hint && <span className={`num text-right text-[13px] ${bad ? "font-semibold text-[var(--campus-line)]" : "muted"}`}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Group({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-[14px] font-semibold">
        {label}
        {hint && <span className="muted ml-2 font-normal">{hint}</span>}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}
