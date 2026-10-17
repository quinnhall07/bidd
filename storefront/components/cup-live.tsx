"use client";
// Closet Cup live overlay. Renders the mock board immediately; when NEXT_PUBLIC_BIDD_API_URL is set
// and a session exists (lib/api), GET /api/cup replaces points and sales for chapters it can match.
// Any miss (live off, signed out, 401, network, another campus, empty standings) keeps the mock board, silently.
import { useEffect, useState } from "react";
import { getCup as getLiveCup, hasSession, isLive, tryLive, type CupResponse } from "@/lib/api";
import type { Lab } from "@/lib/lab";
import type { Row } from "@/components/cup";
import { CupBoard } from "@/components/cup-board";

type Standing = CupResponse["campus"]["standings"][number];

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** The API reports the signed-in member's campus; only overlay when that is the campus on screen. */
function sameCampus(data: CupResponse, rows: Row[]) {
  const here = norm(rows[0]?.campus.name);
  if (!here) return false;
  const yours = Array.isArray(data.conference) ? data.conference.find((c) => c.isYourCampus) : undefined;
  return yours ? norm(yours.shortName) === here || norm(yours.name) === here : norm(data.campus?.name) === here;
}

function overlay(rows: Row[], standings: Standing[]): Row[] | null {
  const byName = new Map(standings.filter((s) => s && typeof s.name === "string").map((s) => [norm(s.name), s]));
  let hits = 0;
  const next = rows.map((r) => {
    const s = byName.get(norm(r.national_org)) ?? byName.get(norm(r.chapter.name));
    if (!s || !Number.isFinite(s.points) || !Number.isFinite(s.sales)) return r;
    hits++;
    const avg = r.sales_count ? r.gmv_cents / r.sales_count : 3000;
    return { ...r, points: s.points, sales_count: s.sales, gmv_cents: Math.round(avg * s.sales) };
  });
  return hits ? next.sort((a, b) => b.points - a.points) : null;
}

type Props = { rows: Row[]; lab: Lab; mine?: string | null; scope: "campus" | "sec"; title: string; zero?: boolean };

export function CupLive(props: Props) {
  const { rows, scope, zero } = props;
  const [live, setLive] = useState<Row[] | null>(null);

  useEffect(() => {
    // The API's conference view is campus totals, not one national org, so only the campus board overlays.
    if (!isLive() || scope !== "campus" || zero || !hasSession()) return;
    let active = true;
    tryLive(getLiveCup)
      .then((data) => {
        if (!active || !data || !sameCampus(data, rows)) return;
        const standings = data.campus?.standings;
        if (Array.isArray(standings) && standings.length) setLive(overlay(rows, standings));
      })
      .catch(() => {
        // tryLive already swallows failures; this only guards a bad response shape. Stay on mock.
      });
    return () => {
      active = false;
    };
  }, [rows, scope, zero]);

  return <CupBoard {...props} rows={live ?? rows} live={!!live} />;
}
