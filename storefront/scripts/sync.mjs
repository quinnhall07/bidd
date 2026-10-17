// Copies the brand kit and the mock data into the app before dev and build.
// brand/ and mock/ stay the source of truth; the copies are gitignored.
import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(app, "..");
const copy = (from, to) => {
  mkdirSync(dirname(join(app, to)), { recursive: true });
  cpSync(join(repo, from), join(app, to), { recursive: true });
};

copy("brand/theme/campus.ts", "lib/brand/campus.ts");
copy("brand/theme/bidd.css", "app/bidd.css");
copy("brand/react/bidd-logo.tsx", "lib/brand/bidd-logo.tsx");
for (const f of readdirSync(join(repo, "mock")).filter((f) => f.endsWith(".json"))) copy(`mock/${f}`, `lib/mock/${f}`);
copy("mock/photos", "public/photos");
console.log("synced brand kit and mock data");
