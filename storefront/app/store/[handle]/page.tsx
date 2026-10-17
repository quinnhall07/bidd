// A student store. The saved store (name, accent, banner) is read client-side in StoreView; a direct link to an
// unknown handle still shows the campus demo viewer's store, so the page never 404s mid-demo.
import type { Metadata } from "next";
import { byState, withLab } from "@/lib/lab";
import { plural } from "@/lib/format";
import { setup } from "@/lib/page";
import { Shell } from "@/components/shell";
import { GridSkeleton, ListingGrid } from "@/components/listing";
import { EmptyState } from "@/components/empty-state";
import { StoreView } from "@/components/store-view";
import { storeOwner } from "../store";

export const metadata: Metadata = { title: "Store · Bidd" };

type Params = Record<string, string | string[] | undefined>;

export default async function StorePage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<Params> }) {
  const { handle: raw } = await params;
  const handle = decodeURIComponent(raw).replace(/^@/, "").toLowerCase();
  const { lab, campuses, campus, cid } = await setup(searchParams);
  const owner = await storeOwner(campus, cid);
  const active = byState(owner.listings.filter((l) => l.status === "active"), lab);
  const sellHref = withLab("/sell", lab);

  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav="closet">
      <StoreView handle={handle} fallback={owner.fallback} domain={owner.domain} sold={owner.sold} followers={owner.followers} sellHref={sellHref}>
        <div className="flex flex-wrap items-end justify-between gap-4 border-t-2 border-ink pt-6">
          <h2 className="display text-[clamp(2.25rem,4vw,3.25rem)]">In the store.</h2>
          <p className="muted num text-[15px]">
            {plural(active.length, "piece")} · timed auctions and buy now
          </p>
        </div>
        <div className="pt-6">
          {lab.state === "loading" ? (
            <GridSkeleton count={5} />
          ) : active.length ? (
            <ListingGrid listings={active} lab={lab} />
          ) : (
            <EmptyState size="s" title="Nothing listed yet." body="List your first piece: one photo, about 30 seconds. Run it as a timed auction or sell it at a set price." />
          )}
        </div>
      </StoreView>
    </Shell>
  );
}
