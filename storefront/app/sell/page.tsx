// Sell: one photo in, a filled listing out. The AI fill is a demo (on-device heuristics, no model);
// publishing goes to the API when NEXT_PUBLIC_BIDD_API_URL is set and falls back to a mock success otherwise.
import type { Metadata } from "next";
import { getChapters, getViewer } from "@/lib/data";
import { withLab } from "@/lib/lab";
import { chapterName, setup } from "@/lib/page";
import { Shell } from "@/components/shell";
import { SellFlow } from "@/components/sell-flow";

export const metadata: Metadata = { title: "Sell · Bidd" };

type Params = Record<string, string | string[] | undefined>;

export default async function SellPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { lab, campuses, campus, cid } = await setup(searchParams);
  const viewer = campus ? await getViewer(cid) : null;
  const chapters = await getChapters(cid);
  const mine = chapters.find((c) => c.id === viewer?.chapter_id) ?? null;

  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav="sell">
      <SellFlow
        campus={campus?.name ?? null}
        chapter={mine ? chapterName(mine, lab) : null}
        allIn={lab.v === "b"}
        closetHref={withLab("/c/me", lab)}
        cupHref={withLab("/cup", lab)}
        feedHref={withLab("/", lab)}
      />
    </Shell>
  );
}
