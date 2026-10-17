"use client";
// Drop sponsorship request for brands. Mock: nothing is sent; submitting shows the success state.
import { useState } from "react";
import { Alert, Check } from "./icons";

const INPUT =
  "h-12 w-full rounded-full border-2 border-[var(--gray-200)] bg-paper px-5 text-[16px] text-ink outline-none transition-colors placeholder:text-[var(--gray-600)] focus:border-ink";

export function BrandSponsor({ campuses, initial }: { campuses: { slug: string; name: string }[]; initial: string }) {
  const [brand, setBrand] = useState("");
  const [email, setEmail] = useState("");
  const [campus, setCampus] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ brand: string; campus: string } | null>(null);

  const submit = () => {
    if (!brand.trim()) return setError("Add your brand name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Add a work email we can reply to.");
    setError(null);
    setSent({ brand: brand.trim(), campus: campuses.find((c) => c.slug === campus)?.name ?? campus });
  };

  if (sent)
    return (
      <div role="status" className="animate-[rise-in_0.45s_var(--ease-out-expo)] rounded-[4px] bg-paper p-6 text-ink motion-reduce:animate-none">
        <p className="flex items-center gap-2 text-[18px] font-bold">
          <Check width={20} height={20} strokeWidth={3} /> Request received for {sent.brand} at {sent.campus}.
        </p>
        <p className="muted mt-2 text-[15px] leading-relaxed">
          Next we match you with chapters on campus, set the piece count and the minimum bid, and line up your fulfillment or the chapter&apos;s licensed vendor. Demo only: nothing was sent.
        </p>
        <button type="button" className="mt-4 text-[15px] font-bold underline underline-offset-4" onClick={() => setSent(null)}>
          Sponsor another drop
        </button>
      </div>
    );

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-4"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-[14px] font-semibold">
          Brand name
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Your brand" className={INPUT} autoComplete="organization" />
        </label>
        <label className="grid gap-2 text-[14px] font-semibold">
          Work email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@brand.com" className={INPUT} autoComplete="email" />
        </label>
        <label className="grid gap-2 text-[14px] font-semibold">
          Campus
          <select value={campus} onChange={(e) => setCampus(e.target.value)} className={INPUT}>
            {campuses.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="pill pill-paper">
          Request a drop
        </button>
        <p className="flex min-h-6 items-center gap-2 text-[15px] font-semibold" role="status">
          {error && (
            <>
              <Alert width={20} height={20} /> {error}
            </>
          )}
        </p>
      </div>
    </form>
  );
}
