#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  if (process.argv[index].startsWith("--")) args.set(process.argv[index], process.argv[index + 1]);
}
const inputPath = args.get("--input");
const outputPath = args.get("--output") || "legacy-baseline-report.json";
if (!inputPath) {
  console.error("Usage: node scripts/legacy-baseline-report.mjs --input legacy.json [--output report.json]");
  process.exit(2);
}

const raw = JSON.parse(await readFile(inputPath, "utf8"));
const state = raw?.data ?? raw;
const collections = ["users", "categories", "items", "equipment", "recipients", "transactions", "batches", "custodies", "auditLog"];
const sensitive = /password|secret|token|cookie|session|private.?key|api.?key|credential/i;
const report = {
  reportId: randomUUID(),
  createdAt: new Date().toISOString(),
  source: inputPath,
  mode: "read-only-baseline",
  counts: Object.fromEntries(collections.map((name) => [name, Array.isArray(state?.[name]) ? state[name].length : 0])),
  mappings: [],
  generatedGlobalIds: 0,
  duplicateLocalKeys: [],
  sensitivePaths: [],
  warnings: [],
};

function walk(value, path) {
  if (Array.isArray(value)) return value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (sensitive.test(key)) report.sensitivePaths.push(`${path}.${key}`);
    walk(nested, `${path}.${key}`);
  }
}
walk(state, "$");

for (const entityType of collections) {
  const rows = Array.isArray(state?.[entityType]) ? state[entityType] : [];
  const seen = new Set();
  for (const row of rows) {
    const localId = row?.id ?? row?.localId;
    if (localId == null) {
      report.warnings.push(`${entityType}: row without local id`);
      continue;
    }
    const key = `${entityType}:${localId}`;
    if (seen.has(key)) report.duplicateLocalKeys.push(key);
    seen.add(key);
    if (!row.globalId) report.generatedGlobalIds += 1;
    report.mappings.push({ entityType, localId, globalId: row.globalId || randomUUID() });
  }
}

if (report.sensitivePaths.length) {
  report.warnings.push("Sensitive fields detected; baseline must be reviewed and scrubbed before export.");
}
if (report.duplicateLocalKeys.length) {
  report.warnings.push("Duplicate local identities detected; automatic merge is disabled.");
}
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  reportId: report.reportId,
  outputPath,
  collections: report.counts,
  mappings: report.mappings.length,
  sensitivePaths: report.sensitivePaths.length,
  duplicateLocalKeys: report.duplicateLocalKeys.length,
  automaticApply: false,
}, null, 2));