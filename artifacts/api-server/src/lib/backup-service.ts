import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  createSyncPackage,
  packageSummary,
  readSyncPackage,
  type SyncPackage,
  type SyncRecord,
} from "@workspace/backup-format";
import { and, eq, gt } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  backupRestorePreviewTable,
  backupRestorePointTable,
  nodeIdentityTable,
} from "@workspace/db";

export { packageSummary };

const MAX_PACKAGE_BYTES = 48 * 1024 * 1024;
const SERVER_SCHEMA_VERSION = "2026.08";
const RESTORE_POINT_PASSWORD = process.env.SESSION_SECRET || "development-restore-point-key";

const TABLES = [
  "categories",
  "items",
  "equipment",
  "recipients",
  "exit_reasons",
  "system_settings",
  "transactions",
  "inventory_batches",
  "transaction_batch_allocations",
  "personal_custodies",
  "custody_returns",
  "damage_records",
  "central_returns",
  "audit_log",
] as const;
type BackupTable = (typeof TABLES)[number];

const TABLE_ENTITY_TYPES: Record<BackupTable, string> = Object.fromEntries(
  TABLES.map((table) => [table, table]),
) as Record<BackupTable, string>;

const TABLES_WITH_USERS = [...TABLES, "users"] as const;

type QueryExecutor = {
  execute(query: ReturnType<typeof sql>): Promise<unknown>;
};

function rowsFromResult(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  }
  return [];
}

async function queryRows(
  executor: QueryExecutor,
  table: string,
  orderBy = "id",
): Promise<Record<string, unknown>[]> {
  const result = await executor.execute(sql.raw(`SELECT * FROM "${table}" ORDER BY "${orderBy}"`));
  return rowsFromResult(result);
}

export async function collectBackupRecords(executor: QueryExecutor = db): Promise<SyncRecord[]> {
  const records: SyncRecord[] = [];
  for (const table of TABLES_WITH_USERS) {
    const rows =
      table === "users"
        ? rowsFromResult(
            await executor.execute(
              sql.raw(
                'SELECT "id", "username", "full_name", "role", "is_active", "created_at" FROM "users" ORDER BY "id"',
              ),
            ),
          )
        : await queryRows(executor, table);
    records.push(
      ...rows.map((data) => ({
        entityType: table,
        localId: typeof data.id === "number" ? data.id : null,
        data,
      })),
    );
  }
  return records;
}

async function collectChanges(executor: QueryExecutor = db) {
  const rows = await queryRows(executor, "sync_change_log", "origin_sequence");
  return rows.map((row) => ({
    changeId: String(row.change_id),
    operationId: String(row.operation_id),
    entityType: String(row.entity_type),
    entityGlobalId: String(row.entity_global_id),
    changeType: String(row.change_type),
    payload: (row.payload ?? {}) as Record<string, unknown>,
    originNodeId: String(row.origin_node_id),
    originSequence: Number(row.origin_sequence),
    parentRevision: row.parent_revision == null ? null : String(row.parent_revision),
    createdAt: row.created_at == null ? undefined : new Date(String(row.created_at)).toISOString(),
  }));
}

export async function createFullBackup(password: string): Promise<Buffer> {
  const [identity] = await db
    .select({ nodeId: nodeIdentityTable.nodeId })
    .from(nodeIdentityTable)
    .limit(1);
  const records = await collectBackupRecords();
  const changes = await collectChanges();
  return createSyncPackage({
    password,
    packageType: "full-backup",
    schemaVersion: SERVER_SCHEMA_VERSION,
    sourceNodeId: identity?.nodeId ?? "web-uninitialized",
    records,
    changes,
  });
}

export function decodePackage(packageBase64: string, password: string): SyncPackage {
  if (!packageBase64 || packageBase64.length > Math.ceil((MAX_PACKAGE_BYTES * 4) / 3) + 1024) {
    throw new Error("حجم حزمة المزامنة أكبر من الحد المسموح");
  }
  let buffer: Buffer;
  try {
    buffer = Buffer.from(packageBase64, "base64");
  } catch {
    throw new Error("ترميز الحزمة غير صالح");
  }
  return readSyncPackage(buffer, password, { maxBytes: MAX_PACKAGE_BYTES });
}

export type RestoreMode = "full" | "merge";
export type RestoreRecordResult = {
  entityType: string;
  localId?: number | null;
  status: "applied" | "duplicate" | "rejected" | "conflict" | "skipped";
  code?: string;
};
export type RestoreReport = {
  mode: RestoreMode;
  packageHash: string;
  packageType: string;
  counts: {
    total: number;
    applied: number;
    duplicate: number;
    rejected: number;
    conflict: number;
    skipped: number;
  };
  records: RestoreRecordResult[];
};

function tableForEntity(entityType: string): BackupTable | undefined {
  return TABLES.find((table) => TABLE_ENTITY_TYPES[table] === entityType);
}

function validateRecord(record: SyncRecord): string | undefined {
  if (!record.data || typeof record.data !== "object" || Array.isArray(record.data)) {
    return "invalid-record-data";
  }
  if (typeof record.data.id !== "number" || !Number.isInteger(record.data.id) || record.data.id < 1) {
    return "invalid-primary-key";
  }
  if (record.entityType === "items") {
    const currentStock = Number(record.data.current_stock ?? 0);
    const minStock = Number(record.data.min_stock ?? 0);
    if (currentStock < 0 || minStock < 0) return "negative-item-balance";
  }
  if (record.entityType === "inventory_batches") {
    const received = Number(record.data.received_quantity);
    const remaining = Number(record.data.remaining_quantity);
    if (received <= 0 || remaining < 0 || remaining > received) return "invalid-batch-balance";
  }
  return undefined;
}

function insertStatement(table: BackupTable, data: Record<string, unknown>) {
  const columns = Object.keys(data).filter((column) => /^[a-z][a-z0-9_]*$/.test(column));
  if (columns.length === 0) throw new Error("empty-record");
  return sql`INSERT INTO ${sql.identifier(table)}
    (${sql.join(columns.map((column) => sql.identifier(column)), sql`, `)})
    VALUES (${sql.join(columns.map((column) => sql`${data[column]}`), sql`, `)})
    ON CONFLICT DO NOTHING`;
}

async function deleteBusinessRows(tx: QueryExecutor) {
  for (const table of [...TABLES].reverse()) {
    await tx.execute(sql.raw(`DELETE FROM "${table}"`));
  }
}

function newReport(pkg: SyncPackage, mode: RestoreMode): RestoreReport {
  return {
    mode,
    packageHash: pkg.packageHash,
    packageType: pkg.manifest.packageType,
    counts: { total: pkg.records.length, applied: 0, duplicate: 0, rejected: 0, conflict: 0, skipped: 0 },
    records: [],
  };
}

export function previewRestore(pkg: SyncPackage, mode: RestoreMode): RestoreReport {
  const report = newReport(pkg, mode);
  for (const record of pkg.records) {
    const result: RestoreRecordResult = {
      entityType: record.entityType,
      localId: record.localId,
      status: "applied",
    };
    if (record.entityType === "users") {
      result.status = "skipped";
      result.code = "users-not-restored";
    } else if (!tableForEntity(record.entityType)) {
      result.status = "rejected";
      result.code = "unknown-entity-type";
    } else {
      const error = validateRecord(record);
      if (error) {
        result.status = "rejected";
        result.code = error;
      }
    }
    report.records.push(result);
    report.counts[result.status] += 1;
  }
  return report;
}

export async function applyRestore(pkg: SyncPackage, mode: RestoreMode): Promise<RestoreReport> {
  const report = previewRestore(pkg, mode);
  if (report.counts.rejected > 0) {
    throw new Error("لا يمكن تطبيق حزمة تحتوي على سجلات مرفوضة؛ راجع المعاينة");
  }
  await db.transaction(async (tx) => {
    if (mode === "full") await deleteBusinessRows(tx);
    for (const record of pkg.records) {
      const result = report.records.find(
        (candidate) => candidate.entityType === record.entityType && candidate.localId === record.localId,
      );
      if (!result || result.status === "skipped") continue;
      const table = tableForEntity(record.entityType);
      if (!table) continue;
      try {
        const inserted = (await tx.execute(insertStatement(table, record.data))) as { rowCount?: number };
        if (Number(inserted.rowCount ?? 0) > 0) {
          result.status = "applied";
        } else {
          result.status = "duplicate";
        }
      } catch (error) {
        if (mode === "full") throw error;
        result.status = "conflict";
        result.code = error instanceof Error ? error.message.slice(0, 160) : "database-conflict";
      }
    }
  });
  report.counts = { total: report.records.length, applied: 0, duplicate: 0, rejected: 0, conflict: 0, skipped: 0 };
  for (const record of report.records) report.counts[record.status] += 1;
  return report;
}

export async function createRestorePoint(userId: number | null, packageBuffer: Buffer, report: RestoreReport) {
  const id = randomUUID();
  await db.insert(backupRestorePointTable).values({
    id,
    packageHash: report.packageHash,
    encryptedPackage: packageBuffer.toString("base64"),
    createdBy: userId,
    summary: report,
  });
  return id;
}

export async function createPreview(pkg: SyncPackage, mode: RestoreMode) {
  const report = previewRestore(pkg, mode);
  const token = randomUUID();
  await db.insert(backupRestorePreviewTable).values({
    token,
    packageHash: pkg.packageHash,
    mode,
    report,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });
  return { token, report, summary: packageSummary(pkg) };
}

export async function consumePreview(token: string, packageHash: string, mode: RestoreMode) {
  const [preview] = await db
    .select()
    .from(backupRestorePreviewTable)
    .where(
      and(
        eq(backupRestorePreviewTable.token, token),
        eq(backupRestorePreviewTable.packageHash, packageHash),
        eq(backupRestorePreviewTable.mode, mode),
        gt(backupRestorePreviewTable.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!preview) throw new Error("المعاينة غير موجودة أو منتهية؛ يجب تنفيذ Dry Run جديد قبل الاستعادة");
  await db.delete(backupRestorePreviewTable).where(eq(backupRestorePreviewTable.token, token));
  return preview;
}

export async function getRestorePoint(id: string) {
  const [point] = await db
    .select()
    .from(backupRestorePointTable)
    .where(eq(backupRestorePointTable.id, id))
    .limit(1);
  return point;
}

export async function rollbackRestorePoint(id: string) {
  const point = await getRestorePoint(id);
  if (!point) throw new Error("نقطة الاستعادة غير موجودة");
  const pkg = readSyncPackage(Buffer.from(point.encryptedPackage, "base64"), RESTORE_POINT_PASSWORD, {
    maxBytes: MAX_PACKAGE_BYTES,
  });
  const report = await applyRestore(pkg, "full");
  await db
    .update(backupRestorePointTable)
    .set({ status: "rolled-back", rolledBackAt: new Date() })
    .where(eq(backupRestorePointTable.id, id));
  return report;
}

export function packageBufferToBase64(buffer: Buffer) {
  return buffer.toString("base64");
}

export function serverRestorePointPassword() {
  return RESTORE_POINT_PASSWORD;
}