import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { equipmentTable } from "./equipment";
import { recipientsTable } from "./recipients";
import { exitReasonsTable } from "./exit_reasons";
import { usersTable } from "./users";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().$type<"in" | "out" | "init" | "adjust">(),
  itemType: text("item_type").notNull().$type<"item" | "equipment">(),
  itemId: integer("item_id").references(() => itemsTable.id),
  equipmentId: integer("equipment_id").references(() => equipmentTable.id),
  quantity: integer("quantity"),
  recipientId: integer("recipient_id").references(() => recipientsTable.id),
  recipientNameSnap: text("recipient_name_snap"),
  recipientPerson: text("recipient_person"),
  exitReasonId: integer("exit_reason_id").references(() => exitReasonsTable.id),
  exitReasonSnap: text("exit_reason_snap"),
  documentNumber: text("document_number").notNull().unique(),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
