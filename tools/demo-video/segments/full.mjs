// One continuous walkthrough in deck order, paced for live narration. Every step is best-effort.
export default async function (d) {
  const p = d.page;
  const btn = (re) => p.getByRole("button", { name: re }).first();
  const link = (re) => p.getByRole("link", { name: re }).first();
  const step = async (fn) => { try { await fn(); } catch (e) { console.log("  skip:", e.message.split("\n")[0].slice(0, 120)); } };
  const tryClick = (loc, opts) => step(async () => { await loc.waitFor({ state: "visible", timeout: 4000 }); await d.click(loc, opts); });

  await p.route("https://bidd-api.vercel.app/**", (r) => r.abort());

  // Hook + campus lock
  await d.go("/?school=none&drop=live"); await d.hold(3500); await d.scroll(600, 1500); await d.hold(1500);
  await d.go("/login");
  await step(async () => { await d.type(p.locator("input[type=email], input[name=email]").first(), "you@gmail.com"); await tryClick(btn(/send|continue|code/i)); await d.hold(2200); });
  await tryClick(btn(/alabama/i), { after: 1200 });
  await step(async () => { const boxes = p.locator("input[inputmode=numeric]"); if (await boxes.count()) { await d.click(boxes.first(), { after: 150 }); await p.keyboard.type("123456", { delay: 160 }); } });
  await d.hold(3500);

  // Campus feed
  await d.go("/?school=ua&drop=live"); await d.hold(3000); await d.scroll(900, 2200); await d.hold(1800); await d.scroll(900, 2200); await d.hold(1800);

  // Gemma 4 smart search
  await step(async () => { await d.type(p.locator("header input[type=search], header input").first(), "something sparkly for a date party under 50", { delay: 45 }); await p.keyboard.press("Enter"); await p.waitForLoadState("networkidle").catch(() => {}); await d.hold(4500); });

  // List it: sell with AI fill + timed auction
  await d.go("/sell?school=ua"); await d.hold(1500);
  await step(async () => { await p.locator("input[type=file]").first().setInputFiles(process.env.DEMO_PHOTO); await d.hold(1500); });
  await tryClick(btn(/fill with ai/i), { after: 6500 });
  await d.scroll(500, 1200); await d.hold(1500);
  await tryClick(btn(/start the auction|post it|list it/i), { after: 2800 });

  // Bid it: live open bidding
  await d.go("/item/ua-l07?school=ua"); await d.hold(1800);
  await step(async () => { const box = p.getByText(/live bidding/i).first(); await d.scrollTo(box, 900); });
  await tryClick(btn(/^\$\d+/), { after: 1500 });
  await d.hold(9000);
  await tryClick(btn(/^\$\d+/), { after: 1500 }); await d.hold(2500);

  // Swap it: buy, Exchange Spot, QR handoff
  await d.go("/item/ua-l03?school=ua"); await d.hold(1500);
  await tryClick(btn(/buy/i), { after: 1500 });
  await tryClick(p.getByText(/gorgas|ferguson|library/i).first(), { after: 900 });
  await tryClick(btn(/confirm|meetup/i), { after: 3500 });
  await d.hold(2500);
  await tryClick(btn(/scan to confirm|seller/i), { after: 3500 });

  // Drops: sealed bid on a brand collab, then the result
  await d.go("/drop/white-fox?school=ua&drop=live"); await d.hold(2500);
  await step(async () => { const i = p.locator("input[inputmode=numeric], input[type=number]").first(); await i.waitFor({ timeout: 4000 }); await d.type(i, "84"); });
  await tryClick(btn(/place sealed bid/i), { after: 3000 });
  await d.go("/drop/white-fox?school=ua&drop=ended&bid=won"); await d.hold(3500);

  // Gameday: your school, the matchup, every campus
  await d.go("/gameday?school=ua&drop=live"); await d.hold(2500);
  await step(async () => { await d.scrollTo(p.getByText(/the matchup/i).first(), 1500); });
  await d.hold(3500);
  await step(async () => { await d.scrollTo(p.getByText(/every campus/i).first(), 1500); });
  await d.hold(3000);
  await step(async () => { await d.scrollTo(p.getByText(/the matchup/i).first(), 1200); const l = p.locator("a[href*='school=lsu']").first(); await l.waitFor({ timeout: 3000 }); await d.click(l, { after: 3500 }); });

  // Any university: the same app in four campuses' colors
  for (const s of ["lsu", "uf", "uky", "ua"]) { await d.go(`/?school=${s}&drop=live`); await d.hold(2000); }

  // Brands + sponsorship, student store, Cup, ambassadors
  await d.go("/brands?school=ua"); await d.hold(2500); await d.scroll(900, 2000); await d.hold(2000); await d.scroll(1200, 2200); await d.hold(1800);
  await d.go("/store/new?school=ua"); await d.hold(1500);
  await step(async () => { await d.type(p.locator("input").first(), "Taylor's Closet"); });
  await d.hold(2500);
  await tryClick(btn(/open my store|create|open/i), { after: 3000 });
  await d.go("/cup?school=ua&motion=on"); await d.hold(3500); await d.scroll(700, 1500); await d.hold(2000);
  await d.go("/ambassadors?school=ua"); await d.hold(2000);
  await tryClick(btn(/apply/i), { after: 2500 });
  await d.go("/?school=ua&drop=live"); await d.hold(3000);
}
