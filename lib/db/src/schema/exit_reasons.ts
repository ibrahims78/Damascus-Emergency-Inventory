import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const exitReasonsTable = pgTable("exit_reasons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const insertExitReasonSchema = createInsertSchema(exitReasonsTable).omit({
  id: true,
});
export type InsertExitReason = z.infer<typeof insertExitReasonSchema>;
export type ExitReason = typeof exitReasonsTable.$inferSelect;
