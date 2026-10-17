// Shared page setup: lab state, the viewer's campus, and which campus's data to read.
import { getCampus, getCampuses } from "./data";
import { parseLab, type Lab } from "./lab";
import type { Chapter } from "./types";

type Params = Record<string, string | string[] | undefined>;

export async function setup(searchParams: Promise<Params>) {
  const params = await searchParams;
  const lab = parseLab(params);
  const campuses = await getCampuses();
  // school=none is before sign-in: black and white, with Alabama's feed standing in for "across the SEC".
  const campus = lab.school === "none" ? null : ((await getCampus(lab.school)) ?? (await getCampus("ua")));
  const cid = campus?.slug ?? "ua";
  return { params, lab, campuses, campus, cid, now: Date.now() };
}

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

/** Chapter names: real names in plain text, or the Greek letters (lab names=letters). */
export const chapterName = (chapter: Pick<Chapter, "national_org" | "letters">, lab: Lab) =>
  lab.names === "letters" ? chapter.letters : chapter.national_org;
