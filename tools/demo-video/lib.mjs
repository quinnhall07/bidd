// Recording harness: drives the live site in Chrome and captures Chrome's own screencast frames
// (sharper than Playwright's recordVideo), then encodes them to a constant-30fps H.264 clip.
// A fake cursor is drawn into the page so viewers can follow the clicks.
import { chromium } from "playwright";
import ffmpeg from "ffmpeg-static";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const W = 1920;
export const H = 1080;
export const BASE = process.env.BASE_URL || "https://bidd-sage.vercel.app";

// Drawn in the page on every navigation: a cursor dot that follows mouse events, with a click ring.
const CURSOR = `
(() => {
  const mount = () => {
    if (document.getElementById("__demo_cursor")) return;
    const s = document.createElement("style");
    s.textContent = "#__demo_cursor{position:fixed;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(17,17,17,.55);border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35);z-index:2147483647;pointer-events:none;transition:transform .12s ease}"
      + "#__demo_cursor.down{transform:scale(.7)}"
      + ".__demo_ring{position:fixed;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:3px solid rgba(17,17,17,.6);z-index:2147483646;pointer-events:none;animation:__demo_ring .5s ease-out forwards}"
      + "@keyframes __demo_ring{to{transform:scale(2.6);opacity:0}}"
      + "#__demo_caption{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:rgba(17,17,17,.88);color:#fff;font:600 20px/1.3 system-ui,sans-serif;padding:10px 18px;border-radius:999px;z-index:2147483645;pointer-events:none;letter-spacing:.01em}"
      + "html{scroll-behavior:auto!important}";
    document.documentElement.appendChild(s);
    const c = document.createElement("div");
    c.id = "__demo_cursor";
    const p = window.__demoPos || { x: ${W / 2}, y: ${H / 2} };
    c.style.left = p.x + "px"; c.style.top = p.y + "px";
    document.documentElement.appendChild(c);
    addEventListener("mousemove", (e) => { window.__demoPos = { x: e.clientX, y: e.clientY }; c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }, true);
    addEventListener("mousedown", (e) => { c.classList.add("down"); const r = document.createElement("div"); r.className = "__demo_ring"; r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px"; document.documentElement.appendChild(r); setTimeout(() => r.remove(), 600); }, true);
    addEventListener("mouseup", () => c.classList.remove("down"), true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Record one segment: `fn(demo)` drives the page; the clip is written to `out`. */
export async function record(name, fn, { out = "clips", mobile = false } = {}) {
  const vw = mobile ? 430 : W, vh = mobile ? 932 : H;
  const frames = join(out, `.frames-${name}`);
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });

  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--force-color-profile=srgb", "--hide-scrollbars"] });
  const context = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  await context.addInitScript(CURSOR);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  const shots = []; // { file, t }
  let n = 0;
  cdp.on("Page.screencastFrame", async ({ data, sessionId, metadata }) => {
    const file = join(frames, `${String(n++).padStart(6, "0")}.jpg`);
    writeFileSync(file, Buffer.from(data, "base64"));
    shots.push({ file, t: metadata.timestamp });
    try { await cdp.send("Page.screencastFrameAck", { sessionId }); } catch {}
  });

  let pos = { x: vw / 2, y: vh / 2 };
  const demo = {
    page,
    hold: (ms) => sleep(ms),
    async go(path) {
      await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 60000 }).catch(() => page.waitForLoadState("load"));
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.mouse.move(pos.x, pos.y);
    },
    /** Glide the cursor to an element (locator or selector) in a human-ish arc. */
    async moveTo(target, { ms = 650 } = {}) {
      const loc = typeof target === "string" ? page.locator(target).first() : target;
      await loc.scrollIntoViewIfNeeded().catch(() => {});
      const box = await loc.boundingBox();
      if (!box) throw new Error(`moveTo: no box for ${target}`);
      const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      const steps = Math.max(12, Math.round(ms / 16));
      for (let i = 1; i <= steps; i++) {
        const k = i / steps, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        await page.mouse.move(pos.x + (to.x - pos.x) * e, pos.y + (to.y - pos.y) * e);
        await sleep(ms / steps);
      }
      pos = to;
      return loc;
    },
    async click(target, opts = {}) {
      const loc = await demo.moveTo(target, opts);
      await sleep(180);
      await page.mouse.down(); await sleep(90); await page.mouse.up();
      await sleep(opts.after ?? 500);
      return loc;
    },
    async type(target, text, { delay = 70 } = {}) {
      const loc = await demo.click(target, { after: 200 });
      await loc.fill("");
      await page.keyboard.type(text, { delay });
      await sleep(300);
    },
    /** Smooth scroll by `dy` pixels over `ms`. */
    async scroll(dy, ms = 1200) {
      const steps = Math.round(ms / 16);
      for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await sleep(16); }
      await sleep(250);
    },
    /** Smoothly bring an element near the top third of the screen. */
    async scrollTo(target, ms = 1200) {
      const loc = typeof target === "string" ? page.locator(target).first() : target;
      const box = await loc.boundingBox();
      if (box) await demo.scroll(box.y - vh * 0.22, ms);
      return loc;
    },
    /** Small on-screen caption pill (used for honest "simulated for the demo" notes). */
    async caption(text) {
      await page.evaluate((t) => {
        let el = document.getElementById("__demo_caption");
        if (!t) return el?.remove();
        if (!el) { el = document.createElement("div"); el.id = "__demo_caption"; document.documentElement.appendChild(el); }
        el.textContent = t;
      }, text);
    },
  };

  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: vw * (mobile ? 2 : 1), maxHeight: vh * (mobile ? 2 : 1), everyNthFrame: 1 });
  let error = null;
  try { await fn(demo); await sleep(400); } catch (e) { error = e; }
  await cdp.send("Page.stopScreencast").catch(() => {});
  const endT = Date.now() / 1000;
  await browser.close();

  if (!shots.length) throw error || new Error(`${name}: no frames captured`);
  // Concat list with real per-frame durations, then resample to a constant 30fps H.264 clip.
  const list = shots.map((s, i) => {
    const next = i + 1 < shots.length ? shots[i + 1].t : Math.max(endT, s.t + 0.5);
    return `file '${s.file.replace(/\\/g, "/").split("/").pop()}'\nduration ${Math.max(0.001, next - s.t).toFixed(4)}`;
  }).join("\n") + `\nfile '${shots.at(-1).file.replace(/\\/g, "/").split("/").pop()}'\n`;
  writeFileSync(join(frames, "list.txt"), list);
  const mp4 = join(out, `${name}.mp4`);
  const scale = mobile ? `scale=-2:${H},pad=${W}:${H}:(ow-iw)/2:0:color=0x111111` : `scale=${W}:${H}`;
  const r = spawnSync(ffmpeg, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(frames, "list.txt"),
    "-vf", `${scale},format=yuv420p`, "-r", "30", "-fps_mode", "cfr", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-movflags", "+faststart", mp4], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${name}: ffmpeg failed`);
  rmSync(frames, { recursive: true, force: true });
  if (error) throw Object.assign(error, { clip: mp4 });
  return mp4;
}
