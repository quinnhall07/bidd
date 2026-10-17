// Live listing page: a real listing from the Bidd API (posted through /sell in live mode, linked from the home page's
// "Fresh on campus" row). The frame is server-rendered like /item/[id]; the listing itself loads in the browser after
// sign-in (components/live-listing.tsx), because the session and the short-lived photo URLs only exist there.
import type { Metadata } from "next";
import { setup } from "@/lib/page";
import { Shell } from "@/components/shell";
import { LiveListing } from "@/components/live-listing";

export const metadata: Metadata = { title: "Listing · Bidd" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LiveListingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { lab, campuses, campus } = await setup(searchParams);
  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav="item">
      <LiveListing key={id} id={id} lab={lab} campusSlug={campus?.slug ?? null} campusName={campus?.name ?? null} />
    </Shell>
  );
}
