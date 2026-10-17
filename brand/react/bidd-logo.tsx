// Bidd logo components: the outlined B1DD wordmark and the B1 mark.
// The letters follow `currentColor`; the 1 takes the campus (ink before sign-in).
//   <BiddWordmark className="h-7 text-ink" />                   header on white
//   <BiddMark className="size-10 text-paper" tone="dark" />      on black grounds
// Generated from brand/logo/source/b1dd-outlines.json (Archivo Italic, wdth 62, wght 900, outlined).
// Regenerate the SVG files with brand/scripts/logos.mjs; keep these paths in step with that JSON.
import type { SVGProps } from "react";

type Tone = "light" | "dark";
type LogoProps = SVGProps<SVGSVGElement> & { title?: string; tone?: Tone };

const B = "M-5 0L115 -688L362 -688Q412 -688 449 -672.5Q486 -657 506 -626Q526 -595 526 -549Q526 -498 507 -460.5Q488 -423 458 -398Q428 -373 394 -359L393 -355Q431 -339 456 -311.5Q481 -284 481 -228Q481 -160 448.5 -108.5Q416 -57 363 -28.5Q310 0 249 0ZM201 -160L249 -160Q260 -160 272 -168Q284 -176 292 -193.5Q300 -211 300 -238Q300 -255 292 -266.5Q284 -278 270 -278L222 -278ZM247 -420L289 -420Q298 -420 307 -424.5Q316 -429 323.5 -438.5Q331 -448 335.5 -462.5Q340 -477 340 -497Q340 -514 332 -525.5Q324 -537 310 -537L268 -537Z";
const ONE = "M466 0L489 -134L579 -134L638 -466L547 -466L567 -581Q590 -583 618 -593Q646 -603 675 -618Q704 -633 732 -651.5Q760 -670 782 -689L840 -689L742 -134L833 -134L810 0Z";
const D1 = "M864 0L984 -688L1200 -688Q1298 -688 1339 -641.5Q1380 -595 1380 -497Q1380 -463 1375.5 -423.5Q1371 -384 1363 -337Q1343 -223 1312.5 -148Q1282 -73 1230.5 -36.5Q1179 0 1095 0ZM1074 -158L1102 -158Q1117 -158 1127 -164.5Q1137 -171 1143.5 -185.5Q1150 -200 1154.5 -222.5Q1159 -245 1165 -276Q1179 -355 1186 -396.5Q1193 -438 1195.5 -457Q1198 -476 1198 -487Q1198 -501 1195 -510.5Q1192 -520 1185.5 -525Q1179 -530 1167 -530L1139 -530Z";
const D2 = "M1373 0L1493 -688L1709 -688Q1807 -688 1848 -641.5Q1889 -595 1889 -497Q1889 -463 1884.5 -423.5Q1880 -384 1872 -337Q1852 -223 1821.5 -148Q1791 -73 1739.5 -36.5Q1688 0 1604 0ZM1583 -158L1611 -158Q1626 -158 1636 -164.5Q1646 -171 1652.5 -185.5Q1659 -200 1663.5 -222.5Q1668 -245 1674 -276Q1688 -355 1695 -396.5Q1702 -438 1704.5 -457Q1707 -476 1707 -487Q1707 -501 1704 -510.5Q1701 -520 1694.5 -525Q1688 -530 1676 -530L1648 -530Z";

const oneFill = (tone: Tone) =>
  tone === "dark" ? "var(--campus-on-dark, currentColor)" : "var(--campus-line, currentColor)";

export function BiddWordmark({ title = "Bidd", tone = "light", ...props }: LogoProps) {
  return (
    <svg viewBox="-5 -689 1894 689" role="img" aria-label={title} {...props}>
      <path d={B} fill="currentColor" />
      <path d={ONE} style={{ fill: oneFill(tone) }} />
      <path d={D1} fill="currentColor" />
      <path d={D2} fill="currentColor" />
    </svg>
  );
}

export function BiddMark({ title = "Bidd", tone = "light", ...props }: LogoProps) {
  return (
    <svg viewBox="-5 -689 845 689" role="img" aria-label={title} {...props}>
      <path d={B} fill="currentColor" />
      <path d={ONE} style={{ fill: oneFill(tone) }} />
    </svg>
  );
}
