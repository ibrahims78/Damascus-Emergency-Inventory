import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const isDesktopMode = process.env.DAMASCUS_DESKTOP === "1";
export const desktopMode = isDesktopMode;

if (!isDesktopMode && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const postgresPool = isDesktopMode
  ? null
  : new Pool({ connectionString: process.env.DATABASE_URL });

const desktopDataDir = resolve(
  process.env.DAMASCUS_DATA_DIR || ".damascus-desktop-data",
);
const desktopClient = isDesktopMode ? new PGlite(desktopDataDir) : null;

/**
 * The API keeps its existing PostgreSQL implementation for Replit and hosted
 * deployments. Desktop builds use the same PostgreSQL dialect through PGlite,
 * which gives Electron a durable local database without requiring users to
 * install PostgreSQL on Windows.
 */
export const pool: any = postgresPool;
// Drizzle is constructed for both modes so TypeScript retains the schema
// inference used throughout the API. The PostgreSQL client is never queried
// when desktop mode is active.
const postgresDb = drizzlePostgres(postgresPool as any, { schema });
type AppDatabase = typeof postgresDb;

export const db: AppDatabase = isDesktopMode
  ? (drizzlePglite(desktopClient!, { schema }) as unknown as AppDatabase)
  : postgresDb!;

async function initializeDesktopDatabase(): Promise<void> {
  if (!desktopClient) return;

  const existing = await desktopClient.query<{ tableName: string | null }>(
    `select to_regclass('public.users') as "tableName"`,
  );
  if (existing.rows[0]?.tableName) return;

  const schemaPath = process.env.DAMASCUS_SCHEMA_PATH;
  if (!schemaPath) {
    throw new Error(
      "DAMASCUS_SCHEMA_PATH must point to the bundled desktop database schema.",
    );
  }

  const schemaSql = await readFile(schemaPath, "utf8");
  const statements = schemaSql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await desktopClient.exec(statement);
  }
}

export const databaseReady = isDesktopMode
  ? initializeDesktopDatabase()
  : Promise.resolve();

export * from "./schema";
