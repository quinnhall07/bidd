// node join.mjs  — joins clips/<segment>.mp4 in ORDER into bidd-demo.mp4 (all clips share codec settings, so no re-encode)
import ffmpeg from "ffmpeg-static";
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { ORDER } from "./segments/order.mjs";

const missing = ORDER.filter((n) => !existsSync(`clips/${n}.mp4`));
if (missing.length) { console.error("missing clips:", missing.join(", ")); process.exit(1); }
writeFileSync("clips/join.txt", ORDER.map((n) => `file '${n}.mp4'`).join("\n") + "\n");
const r = spawnSync(ffmpeg, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "clips/join.txt", "-c", "copy", "-movflags", "+faststart", "bidd-demo.mp4"], { stdio: "inherit" });
process.exit(r.status ?? 1);
