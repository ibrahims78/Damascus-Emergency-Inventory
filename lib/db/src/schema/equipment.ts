import {
  pgTable,
  serial,
  text,
  integer,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const equipmentTable = pgTable("equipment", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  equipmentType: text("equipment_type"),
  model: text("model"),
  serialNumber: text("serial_number").unique(),
  condition: text("condition")
    .notNull()
    .$type<"good" | "maintenance" | "broken" | "consumed" | "needs_inspection">(),
  manufactureYear: integer("manufacture_year"),
  originCountry: text("origin_country"),
  currentHolder: text("current_holder"),
  notes: text("notes"),
  quantity: integer("quantity").notNull().default(1),
  minQuantity: integer("min_quantity").notNull().default(0),
  // Maintenance tracking fields
  maintenanceSentAt: date("maintenance_sent_at"),
  maintenanceReturnedAt: date("maintenance_returned_at"),
  maintenanceNotes: text("maintenance_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertEquipmentSchema = createInsertSchema(equipmentTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipmentTable.$inferSelect;
