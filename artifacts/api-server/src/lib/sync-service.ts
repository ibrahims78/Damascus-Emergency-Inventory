import { randomUUID } from "node:crypto";
import {
  db,
  nodeIdentityTable,
  syncChangeLogTable,
  syncEntityIdsTable,
  syncOutboxTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import type { SyncChangeType, SyncNodeType } from "@workspace/db";

type SyncDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type LocalChangeInput = {
  nodeId: string;
  operationId?: string;
  originSequence?: number;
  entityType: string;
  localEntityId?: number | null;
  globalId?: string;
  changeType: SyncChangeType;
  payload: Record<string, unknown>;
  parentRevision?: string | null;
};

export async function ensureNodeIdentity(nodeType: SyncNodeType = "web") {
  const current = await db.query.nodeIdentityTable.findFirst();
  if (current) return current;

  const values = {
    nodeId: randomUUID(),
    installationId: randomUUID(),
    nodeType,
    keyId: null,
    originSequence: 0,
  } as const;

  try {
    const [created] = await db.insert(nodeIdentityTable).values(values).returning();
    return created;
  } catch (error) {
    // Two startup requests may race on first boot. The unique constraint is
    // the lock; return the winner rather than creating a second identity.
    const winner = await db.query.nodeIdentityTable.findFirst();
    if (winner) return winner;
    throw error;
  }
}

export async function reserveOriginSequence(tx: SyncDbTransaction, nodeId: string) {
  const [updated] = await tx
    .update(nodeIdentityTable)
    .set({
      originSequence: sql`${nodeIdentityTable.originSequence} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(nodeIdentityTable.nodeId, nodeId))
    .returning({ originSequence: nodeIdentityTable.originSequence });

  if (!updated) {
    throw new Error("SYNC_NODE_IDENTITY_NOT_FOUND");
  }
  return updated.originSequence;
}

export async function ensureEntityIdentity(
  tx: SyncDbTransaction,
  entityType: string,
  localId: number,
  requestedGlobalId?: string,
) {
  const [existing] = await tx
    .select()
    .from(syncEntityIdsTable)
    .where(and(eq(syncEntityIdsTable.entityType, entityType), eq(syncEntityIdsTable.localId, localId)))
    .limit(1);
  if (existing) return existing.globalId;

  const globalId = requestedGlobalId ?? randomUUID();
  await tx
    .insert(syncEntityIdsTable)
    .values({ entityType, localId, globalId })
    .onConflictDoNothing();

  const [created] = await tx
    .select({ globalId: syncEntityIdsTable.globalId })
    .from(syncEntityIdsTable)
    .where(and(eq(syncEntityIdsTable.entityType, entityType), eq(syncEntityIdsTable.localId, localId)))
    .limit(1);
  if (!created) throw new Error("SYNC_ENTITY_IDENTITY_NOT_CREATED");
  return created.globalId;
}

export async function recordLocalChange(
  tx: SyncDbTransaction,
  input: LocalChangeInput,
) {
  const operationId = input.operationId ?? randomUUID();
  const changeId = randomUUID();
  const globalId =
    input.globalId ??
    (input.localEntityId == null
      ? randomUUID()
      : await ensureEntityIdentity(tx, input.entityType, input.localEntityId));

  await tx.insert(syncChangeLogTable).values({
    changeId,
    operationId,
    entityType: input.entityType,
    entityGlobalId: globalId,
    localEntityId: input.localEntityId ?? null,
    changeType: input.changeType,
    payload: input.payload,
    originNodeId: input.nodeId,
    originSequence:
      input.originSequence ?? (await reserveOriginSequence(tx, input.nodeId)),
    parentRevision: input.parentRevision ?? null,
    status: "local-pending",
  });

  await tx.insert(syncOutboxTable).values({ changeId, status: "pending" });
  return { changeId, operationId, globalId };
}