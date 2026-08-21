const fs = require("node:fs");
const path = require("node:path");

const webSource = path.resolve(__dirname, "../../../artifacts/web/dist/public");
const apiSource = path.resolve(__dirname, "../../../artifacts/api-server/dist");
const schemaSource = path.resolve(__dirname, "../../../lib/db/desktop-schema.sql");
const bundledPgliteSource = path.resolve(__dirname, "../node_modules/@electric-sql/pglite");
const workspacePgliteSource = path.resolve(__dirname, "../../../node_modules/.pnpm/@electric-sql+pglite@0.3.16/node_modules/@electric-sql/pglite");
const pgliteSource = fs.existsSync(path.join(bundledPgliteSource, "dist", "pglite.wasm"))
  ? bundledPgliteSource
  : workspacePgliteSource;
const pgliteDist = path.join(pgliteSource, "dist");
const appRoot = path.resolve(__dirname, "../app");

if (!fs.existsSync(path.join(webSource, "index.html"))) {
  throw new Error(`Built web application not found at ${webSource}`);
}

if (!fs.existsSync(path.join(apiSource, "index.mjs"))) {
  throw new Error(`Built API server not found at ${apiSource}`);
}

if (!fs.existsSync(schemaSource)) {
  throw new Error(`Desktop database schema not found at ${schemaSource}`);
}

for (const asset of ["pglite.wasm", "pglite.data"]) {
  if (!fs.existsSync(path.join(pgliteDist, asset))) {
    throw new Error(`PGlite runtime asset not found at ${path.join(pgliteDist, asset)}`);
  }
}

fs.rmSync(appRoot, { recursive: true, force: true });
fs.mkdirSync(appRoot, { recursive: true });
fs.cpSync(webSource, path.join(appRoot, "web"), { recursive: true });
fs.mkdirSync(path.join(appRoot, "api"), { recursive: true });
for (const asset of ["index.mjs", "index.mjs.map", "table.sql"]) {
  fs.copyFileSync(path.join(apiSource, asset), path.join(appRoot, "api", asset));
}
fs.mkdirSync(path.join(appRoot, "schema"), { recursive: true });
fs.copyFileSync(schemaSource, path.join(appRoot, "schema", "desktop-schema.sql"));
for (const asset of ["pglite.wasm", "pglite.data"]) {
  fs.copyFileSync(path.join(pgliteDist, asset), path.join(appRoot, "api", asset));
}

console.log(`Copied web, API, PGlite runtime, and desktop database assets to ${appRoot}`);