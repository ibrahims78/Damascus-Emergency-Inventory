import { integer, jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

export const backupRestorePointTable = pgTable("backup_restore_points", {
  id: text("id").primaryKey(),
  packageHash: text("package_hash").notNull(),
  encryptedPackage: text("encrypted_package").notNull(),
  createdBy: integer("created_by"),
  status: text("status").notNull().$type<"available" | "rolled-back">().default("available"),
  summary: jsonb("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
});

export const backupRestorePreviewTable = pgTable("backup_restore_previews", {
  token: text("token").primaryKey(),
  packageHash: text("package_hash").notNull(),
  mode: text("mode").notNull().$type<"full" | "merge">(),
  report: jsonb("report").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BackupRestorePoint = typeof backupRestorePointTable.$inferSelect;