// node frames.mjs <clip.mp4> <out-dir> [everySeconds=2]  — contact frames for reviewing a clip
import ffmpeg from "ffmpeg-static";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
const [clip, out, every = "2"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
spawnSync(ffmpeg, ["-y", "-loglevel", "error", "-i", clip, "-vf", `fps=1/${every},scale=960:-2`, `${out}/f-%03d.jpg`], { stdio: "inherit" });
