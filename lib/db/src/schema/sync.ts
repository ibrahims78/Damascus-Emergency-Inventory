import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export type SyncNodeType = "windows" | "android" | "web";
export type SyncChangeType =
  | "create"
  | "update"
  | "delete"
  | "correction"
  | "system-reconciliation";
export type SyncChangeStatus =
  | "local-pending"
  | "exported"
  | "received"
  | "validated"
  | "applied"
  | "duplicate"
  | "rejected"
  | "conflict"
  | "superseded";

/**
 * One durable identity per installation/database. The sequence is reserved
 * inside the same transaction that records a local change.
 */
export const nodeIdentityTable = pgTable("node_identity", {
  id: serial("id").primaryKey(),
  nodeId: text("node_id").notNull().unique(),
  installationId: text("installation_id").notNull().unique(),
  nodeType: text("node_type").notNull().$type<SyncNodeType>(),
  keyId: text("key_id"),
  originSequence: integer("origin_sequence").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Compatibility map for legacy integer primary keys. Keeping this separate
 * lets PostgreSQL, PGlite, and IndexedDB use the same canonical identity
 * without rewriting every existing business table in the first migration.
 */
export const syncEntityIdsTable = pgTable(
  "sync_entity_ids",
  {
    id: serial("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    localId: integer("local_id").notNull(),
    globalId: text("global_id").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("sync_entity_ids_entity_local_unique").on(table.entityType, table.localId),
    index("sync_entity_ids_entity_type_idx").on(table.entityType),
  ],
);

export const syncChangeLogTable = pgTable(
  "sync_change_log",
  {
    changeId: text("change_id").primaryKey(),
    operationId: text("operation_id").notNull().unique(),
    entityType: text("entity_type").notNull(),
    entityGlobalId: text("entity_global_id").notNull(),
    localEntityId: integer("local_entity_id"),
    changeType: text("change_type").notNull().$type<SyncChangeType>(),
    payload: jsonb("payload").notNull(),
    originNodeId: text("origin_node_id").notNull(),
    originSequence: integer("origin_sequence").notNull(),
    causedByChangeId: text("caused_by_change_id"),
    parentRevision: text("parent_revision"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    status: text("status").notNull().$type<SyncChangeStatus>().default("local-pending"),
    rejectionCode: text("rejection_code"),
  },
  (table) => [
    index("sync_change_log_origin_sequence_idx").on(table.originNodeId, table.originSequence),
    index("sync_change_log_entity_idx").on(table.entityType, table.entityGlobalId),
    index("sync_change_log_status_idx").on(table.status),
  ],
);

export const syncOutboxTable = pgTable(
  "sync_outbox",
  {
    id: serial("id").primaryKey(),
    changeId: text("change_id")
      .notNull()
      .references(() => syncChangeLogTable.changeId, { onDelete: "cascade" }),
    status: text("status").notNull().$type<"pending" | "exported" | "acknowledged">().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    exportedAt: timestamp("exported_at", { withTimezone: true }),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  },
  (table) => [unique("sync_outbox_change_unique").on(table.changeId)],
);

export const syncInboxTable = pgTable(
  "sync_inbox",
  {
    id: serial("id").primaryKey(),
    changeId: text("change_id").notNull().unique(),
    originNodeId: text("origin_node_id").notNull(),
    status: text("status").notNull().$type<"received" | "validated" | "applied" | "duplicate" | "rejected" | "conflict">().default("received"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    rejectionCode: text("rejection_code"),
  },
  (table) => [index("sync_inbox_status_idx").on(table.status)],
);

export const syncCursorTable = pgTable("sync_cursors", {
  id: serial("id").primaryKey(),
  peerNodeId: text("peer_node_id").notNull().unique(),
  vector: jsonb("vector").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const syncConflictTable = pgTable(
  "sync_conflicts",
  {
    id: serial("id").primaryKey(),
    changeId: text("change_id").notNull().unique(),
    conflictCode: text("conflict_code").notNull(),
    details: jsonb("details").notNull(),
    status: text("status").notNull().$type<"open" | "resolved" | "deferred">().default("open"),
    resolvedBy: integer("resolved_by"),
    resolution: text("resolution"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [index("sync_conflicts_status_idx").on(table.status)],
);

export const syncTombstoneTable = pgTable(
  "sync_tombstones",
  {
    id: serial("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityGlobalId: text("entity_global_id").notNull(),
    deletedByChangeId: text("deleted_by_change_id").notNull(),
    originNodeId: text("origin_node_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    propagated: boolean("propagated").notNull().default(false),
  },
  (table) => [
    unique("sync_tombstones_entity_unique").on(table.entityType, table.entityGlobalId),
    index("sync_tombstones_propagated_idx").on(table.propagated),
  ],
);