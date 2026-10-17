# SEC campus seed data: color sources and caveats

Researched 2026-10-17. All hex values come from each university's own brand or visual-identity pages (academic, not athletics) unless a caveat says otherwise. No logos, marks or mascots were downloaded or used.

- **ua (Alabama)**: https://brand.ua.edu/visual-identity/colors/. Crimson Flame #9E1B32 + Capstone Gray #828A8F (grey secondary). Students: crimson.ua.edu (oit.ua.edu). Greek 13,000+: ofsl.sa.ua.edu GLS one-pager, Jan 2025. Athletics not checked.
- **uark (Arkansas)**: https://brand.uark.edu/graphic-identity/colors/web-colors.php. Razorback Red #9D2235 + Apple Blossom (white). The print page lists Razorback Red as RGB 161/0/47 (#A1002F), which conflicts with the web hex. Greek: null (only an undated "~30%"). Athletics not checked.
- **auburn (Auburn)**: https://ocm.auburn.edu/brand-center/colors.php. Auburn Blue #0B2341 (very dark) + Auburn Orange #E86100. Athletics hex unverified: third-party #0C2340 / #E87722 / #F26522. Greek ~10,000: studentaffairs.auburn.edu 2025-26 Greek Life Report.
- **uf (Florida)**: https://brandcenter.ufl.edu/color/. Core Orange #FA4616 + Core Blue #0021A5. Greek 8,300+: greeks.ufl.edu Guide to Florida Greeks 2025-26. Athletics not checked.
- **uga (Georgia)**: https://brand.uga.edu/color. Bulldog Red #BA0C2F + Arch Black #000000 (black is listed first in UGA's primary palette). Greek 9,481: UGA Student Affairs 2025 Greek Life Report. Athletics not checked.
- **uky (Kentucky)**: https://brand.uky.edu/sites/default/files/2025-04/uky-006-guidelines-new-april-8.pdf. Wildcat Blue #0033A0 + White. The web palette page (brand.uky.edu/our-identity/color-palette) shows colors only as an image without hex values, so the hex comes from the PDF. Greek: null (IFC site's 5,900+ is undated and unofficial). Athletics not checked.
- **lsu (LSU)**: https://www.lsu.edu/communications/files/brand-guide.pdf. Official LSU Purple #461D7C + Official LSU Gold #FDD023. Athletics media page (lsusports.net/media) gives the same hex. Greek 7,000+: lsu.edu/greeks/scorecard 2025-26.
- **olemiss (Ole Miss)**: https://brand.olemiss.edu/brand-guidelines/visual/colors. Lyceum Red #CF142B + Oxford Blue #142142 (near-black navy). The page returned HTTP 403 to direct fetch and curl, so values were confirmed through search-index extracts of this page (two separate queries matched). Athletics unverified: third-party #CE1126 / #14213D. Greek 10,700+: olemiss.edu FSL page (2025).
- **msstate (Mississippi State)**: https://brand.msstate.edu/assets/materials/msstatecolors.pdf. Maroon #5D1725 + Light Grey #C1C6C8 (Dark Grey is listed as #777777, but its RGB 117/120/123 = #75787B). Athletics uses the same maroon (hailstate.com branding portal). Greek: null.
- **mizzou (Missouri)**: https://brand.missouri.edu/visual-identity/colors/. Mizzou Gold #FDB719 (very light) + Tiger Paw Black #000000. The athletics toolkit (brand.missouri.edu/athletics-branding-toolkit) confirms the same gold. umsystem.edu email is shared by all UM System campuses. Greek 7,500+: studentaffairs.missouri.edu FSL page (undated).
- **ou (Oklahoma)**: https://www.ou.edu/brand/creative-platform/design-system/colors. Oklahoma Crimson #841617. Oklahoma Cream is print-only with no official hex, and OU says to use white or black digitally, so the secondary is #FFFFFF. Cream #DDCBA4 is third-party only. Greek 7,400+: ou.edu/studentlife/fsps. Athletics not checked.
- **sc (South Carolina)**: https://sc.edu/about/offices_and_divisions/communications/toolbox/colors/. Garnet #73000A + Black #000000. Students: email.sc.edu (2018 IT email-domain standard, eds103). Greek 9,879: Spring 2026 Greek report. Athletics not checked.
- **utk (Tennessee)**: https://brand.utk.edu/standards/colors. Tennessee Orange #FF8200 (fails text contrast on white) + White; Smokey #4B4B4B is the accent and black is banned. Students: vols.utk.edu (oit.utk.edu). Greek: null (29% only). Athletics not checked.
- **utexas (Texas)**: https://umac.utexas.edu/brand-center/visual-identity/. Burnt Orange #BF5700 + White; Charcoal #333F48 is the neutral. Students: my.utexas.edu (tech.utexas.edu "Understanding emails at UT Austin"). Bare utexas.edu for students is unverified. Greek 5,782: deanofstudents.utexas.edu/sfl/quickfacts.php (2023-24). Athletics not checked.
- **tamu (Texas A&M)**: https://marcomm.tamu.edu/creative-platform/visual-style/brand-colors. Aggie Maroon #500000 (very dark) + White. The old brandguide.tamu.edu URL redirects. Students: tamu.edu forwarding + email.tamu.edu mailbox (service.tamu.edu KB). Greek 5,778 is fall 2021 data (stories.tamu.edu). Athletics not checked.
- **vanderbilt (Vanderbilt)**: https://brand.vanderbilt.edu/color/. Flat Gold #CFAE70 (light) + Black #1C1C1C. Athletics (brand.vanderbilt.edu/athletics/) uses Flat Gold #CFAE70 + Rich Black #000000. Greek: null (33% only).

## Flags for the "campus 1" derivation

- **Black or grey primary:** none. Every primary is a saturated hue, so the secondary-fallback rule never triggers on this data set.
- **Very light primary** (contrast against white below 3:1): mizzou #FDB719 (1.8:1), vanderbilt #CFAE70 (2.1:1), utk #FF8200 (2.5:1). uf #FA4616 is borderline at 3.5:1.
- **Near-black but saturated primary** (contrast against black about 1.3:1): auburn #0B2341, tamu #500000.
- **Black or near-black secondary:** uga, sc, mizzou (#000000), vanderbilt (#1C1C1C), olemiss (#142142 navy).
- **White secondary:** uark, uky, ou, utk, utexas, tamu. Each school's JSON notes give a non-white official alternative.
- **Grey secondary:** ua #828A8F, msstate #C1C6C8.
