// CI gate: the pinned artifact must still match its recorded checksum.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
const lock = JSON.parse(await readFile("contracts/contract.lock.json", "utf8"));
const actual = createHash("sha256").update(await readFile(lock.file)).digest("hex");
if (actual !== lock.sha256) {
  console.error(`Pinned contract changed: ${lock.file}`);
  process.exit(1);
}
console.log(`Contract OK: v${lock.version}`);
