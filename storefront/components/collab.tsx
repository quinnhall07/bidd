// Who made a drop, spelled out: the Greek chapter × the company × the university.
// Each party is labeled, so a judge can read the collab at a glance. Never touches the Bidd logo.
import { chapterName } from "@/lib/page";
import { SHORT, type Lab } from "@/lib/lab";
import type { Campus, Chapter, Drop } from "@/lib/types";

type Tone = "field" | "dark" | "light";

function UniversityMark({ campus, lab, tone, size }: { campus: Campus; lab: Lab; tone: Tone; size: number }) {
  if (lab.logos === "official" && campus.logo_url) {
    const src = tone === "light" ? campus.logo_url : (campus.logo_url_dark ?? campus.logo_url);
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={`${campus.name} logo`} width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
  }
  return <span className="display leading-none" style={{ fontSize: size * 0.72 }}>{lab.logos === "badge" ? (SHORT[campus.slug] ?? campus.name) : campus.name}</span>;
}

/** Full lockup: three labeled parties separated by ×. */
export function CollabLockup({ drop, chapter, campus, lab, tone = "field", size = 40 }: { drop: Drop; chapter: Chapter; campus: Campus; lab: Lab; tone?: Tone; size?: number }) {
  const caption = tone === "light" ? "muted" : tone === "dark" ? "text-[var(--dim)]" : "field-soft";
  const parties = [
    {
      key: "greek",
      mark: <span className="display leading-none whitespace-nowrap" style={{ fontSize: size * 0.72 }}>{lab.names === "letters" ? chapter.letters : chapter.national_org}</span>,
      label: lab.names === "letters" ? `${chapter.national_org} · chapter` : "Chapter",
    },
    {
      key: "company",
      mark: <span className="display leading-none whitespace-nowrap" style={{ fontSize: size * 0.72 }}>{drop.company.name}</span>,
      label: drop.company.role === "brand" ? "Brand partner · demo" : "Licensed vendor · demo",
    },
    ...(drop.university_licensed
      ? [{ key: "university", mark: <UniversityMark campus={campus} lab={lab} tone={tone} size={size} />, label: `${campus.name} · officially licensed` }]
      : []),
  ];
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3" aria-label="Collab">
      {parties.map((p, i) => (
        <div key={p.key} className="flex items-start gap-4">
          {i > 0 && (
            <span className="flex items-center justify-center" style={{ height: size }} aria-hidden="true">
              <span className="display leading-none opacity-80" style={{ fontSize: size * 0.62 }}>
                ×
              </span>
            </span>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-end" style={{ height: size }}>
              {p.mark}
            </div>
            <span className={`text-[12px] font-semibold ${caption}`}>{p.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** One-line version for cards: ΚΔ × White Fox × Alabama. */
export function collabLine(drop: Drop, chapter: Chapter, campus: Campus, lab: Lab) {
  return [chapterName(chapter, lab), drop.company.name, drop.university_licensed ? campus.name : null].filter(Boolean).join(" × ");
}
