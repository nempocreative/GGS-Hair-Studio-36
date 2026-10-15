import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";

export const ggsCashierSettingsTable = pgTable("ggs_cashier_settings", {
  id: integer("id").primaryKey().default(1),
  taxRate: integer("tax_rate").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertGgsCashierSettingsSchema = createInsertSchema(
  ggsCashierSettingsTable,
).omit({ id: true, updatedAt: true });

export type InsertGgsCashierSettings = z.infer<
  typeof insertGgsCashierSettingsSchema
>;
export type GgsCashierSettings =
  typeof ggsCashierSettingsTable.$inferSelect;
