// Open your store: verified student sellers create a storefront (mock: saved in the browser).
import type { Metadata } from "next";
import { labQuery, withLab } from "@/lib/lab";
import { setup } from "@/lib/page";
import { Shell } from "@/components/shell";
import { StoreCreate } from "@/components/store-create";
import { bannersFor, paletteFor, storeOwner } from "../store";

export const metadata: Metadata = { title: "Open your store · Bidd" };

type Params = Record<string, string | string[] | undefined>;

export default async function StoreNewPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { lab, campuses, campus, cid } = await setup(searchParams);
  const owner = await storeOwner(campus, cid);

  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav="sell">
      <StoreCreate
        verified={owner.verified}
        campus={campus?.name ?? "your campus"}
        domain={owner.domain}
        ownerName={owner.viewer?.name ?? ""}
        palette={paletteFor(campus)}
        banners={bannersFor(campus)}
        sold={owner.sold}
        followers={owner.followers}
        query={labQuery(lab).toString()}
        loginHref={withLab("/login", lab)}
        sellHref={withLab("/sell", lab)}
      />
    </Shell>
  );
}
