"use client";
// Ticking countdown in tabular figures. Starts from the server's clock so the first render matches.
import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

export function formatLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}D ${pad(h)}:${pad(m)}` : `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
}

export function Countdown({ to, serverNow, className = "" }: { to: string; serverNow: number; className?: string }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    // Switch from the server clock to the real one after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={`num ${className}`} role="timer" aria-live="off">
      {formatLeft(Date.parse(to) - now)}
    </span>
  );
}
