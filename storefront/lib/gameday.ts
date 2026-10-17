// Gameday (deck slide 08): every campus's big-game drop, and this week's matchups side by side.
// Mock config: the matchups and how many people set a reminder. Later this reads a games table.
import { getCampuses, getDrop, getDrops } from "./data";
import type { Campus, Chapter, Drop } from "./types";

export const GAMEDAY_SLUG = "gameday-tee";

/** This week's big games. Each side links to its own campus's gameday drop. */
export const MATCHUPS: { id: string; away: string; home: string; kickoff: string; day: string; reminders: Record<string, number> }[] = [
  { id: "ua-lsu", away: "ua", home: "lsu", kickoff: "2026-10-25T00:30:00.000Z", day: "Sat · 7:30 PM CT", reminders: { ua: 412, lsu: 388 } },
  { id: "uf-uky", away: "uf", home: "uky", kickoff: "2026-10-24T16:00:00.000Z", day: "Sat · 11:00 AM CT", reminders: { uf: 276, uky: 301 } },
];

export type GamedaySide = { campus: Campus; drop: Drop; chapter: Chapter; sealedBids: number; reminders: number };

/** Every campus's gameday drop, in conference order. */
export async function getGamedayDrops(): Promise<{ campus: Campus; drop: Drop }[]> {
  const campuses = await getCampuses();
  const rows = await Promise.all(
    campuses.map(async (campus) => ({ campus, drop: (await getDrops(campus.slug)).find((d) => d.slug === GAMEDAY_SLUG) })),
  );
  return rows.filter((r): r is { campus: Campus; drop: Drop } => Boolean(r.drop));
}

async function side(slug: string, reminders: number): Promise<GamedaySide | null> {
  const campus = (await getCampuses()).find((c) => c.slug === slug);
  const data = await getDrop(slug, GAMEDAY_SLUG);
  if (!campus || !data) return null;
  // The rivalry count: sealed bids on the campus's 1-of-1 this week.
  const auction = (await getDrops(slug)).find((d) => d.kind === "auction");
  return { campus, drop: data.drop, chapter: data.chapter, sealedBids: auction?.auction?.bid_count ?? 0, reminders };
}

export async function getMatchups() {
  const rows = await Promise.all(
    MATCHUPS.map(async (m) => {
      const [away, home] = await Promise.all([side(m.away, m.reminders[m.away] ?? 0), side(m.home, m.reminders[m.home] ?? 0)]);
      return away && home ? { ...m, sides: [away, home] as const } : null;
    }),
  );
  return rows.filter((r) => r !== null);
}
