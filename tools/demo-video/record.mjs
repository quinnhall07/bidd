// node record.mjs [segment ...]  — records the named segments (default: all in order.mjs) into clips/<name>.mp4
import { record } from "./lib.mjs";
import { ORDER } from "./segments/order.mjs";

const names = process.argv.slice(2).length ? process.argv.slice(2) : ORDER;
let failed = 0;
for (const name of names) {
  const mod = await import(`./segments/${name}.mjs`);
  const t0 = Date.now();
  try {
    const clip = await record(name, mod.default, { mobile: Boolean(mod.mobile) });
    console.log(`ok   ${name} -> ${clip} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}: ${e.message}${e.clip ? ` (partial clip: ${e.clip})` : ""}`);
  }
}
process.exit(failed ? 1 : 0);
