// Mock onboarding after sign-in: chapter, join code, sizes.
import { getChapters } from "@/lib/data";
import { withLab } from "@/lib/lab";
import { plural } from "@/lib/format";
import { chapterName, setup } from "@/lib/page";
import { Shell } from "@/components/shell";
import { OnboardingFlow } from "@/components/onboarding-flow";

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const { lab, campuses, campus, cid } = await setup(searchParams);
  const chapters = (await getChapters(cid)).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: chapterName(c, lab),
    letters: lab.names === "letters",
    sub: `${lab.names === "letters" ? `${c.national_org} · ` : ""}${c.kind === "sorority" ? "Sorority" : "Fraternity"} · ${plural(c.members, "member")}`,
  }));
  const gateOpen = { ...lab, gate: "unlocked" as const };
  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav="home">
      <OnboardingFlow campus={campus?.name ?? "Campus"} chapters={chapters} feedHref={withLab("/", gateOpen)} closetHref={withLab("/c/me", lab)} />
    </Shell>
  );
}
