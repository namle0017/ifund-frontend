// C8 / ADR-004: copy a released BE OpenAPI artifact, verify its SHA-256 and pin it in contracts/contract.lock.json.
// Usage: node scripts/sync-contract.mjs <path-or-url-to-fund-platform-api.vX.Y.Z.json>
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/sync-contract.mjs <artifact path or URL>");
  process.exit(2);
}

const read = async (p) => (p.startsWith("http") ? Buffer.from(await (await fetch(p)).arrayBuffer()) : readFile(p));
const artifact = await read(source);
const expected = (await read(`${source}.sha256`)).toString("utf8").split(/\s+/)[0].toLowerCase();
const actual = createHash("sha256").update(artifact).digest("hex");
if (actual !== expected) {
  console.error(`Checksum mismatch: expected ${expected}, got ${actual}`);
  process.exit(1);
}

const name = basename(source.split("?")[0]);
const version = /v(\d+\.\d+\.\d+)\.json$/.exec(name)?.[1];
await writeFile(`contracts/openapi/${name}`, artifact);
await writeFile("contracts/contract.lock.json", JSON.stringify({ file: `contracts/openapi/${name}`, version, sha256: actual }, null, 2) + "\n");
console.log(`Pinned ${name} (${actual})`);
