import { createInsertSchema } from "drizzle-zod";
import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const ggsProductStockMovementsTable = pgTable(
  "ggs_product_stock_movements",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull(),
    productName: text("product_name").notNull(),
    movementType: text("movement_type").notNull(),
    quantityChange: integer("quantity_change").notNull(),
    previousStock: integer("previous_stock").notNull(),
    newStock: integer("new_stock").notNull(),
    note: text("note").notNull(),
    employeeId: text("employee_id").notNull(),
    employeeName: text("employee_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ggs_product_stock_movements_created_idx").on(table.createdAt),
    index("ggs_product_stock_movements_product_created_idx").on(
      table.productId,
      table.createdAt,
    ),
  ],
);

export const insertGgsProductStockMovementSchema = createInsertSchema(
  ggsProductStockMovementsTable,
).omit({
  id: true,
  createdAt: true,
});

export type InsertGgsProductStockMovement = z.infer<
  typeof insertGgsProductStockMovementSchema
>;
export type GgsProductStockMovement =
  typeof ggsProductStockMovementsTable.$inferSelect;
