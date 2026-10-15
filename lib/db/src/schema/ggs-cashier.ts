import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const ggsCashierTransactionsTable = pgTable(
  "ggs_cashier_transactions",
  {
    id: serial("id").primaryKey(),
    receiptNumber: text("receipt_number").notNull().unique(),
    register: text("register").notNull(),
    employeeId: text("employee_id").notNull(),
    employeeName: text("employee_name").notNull(),
    customerName: text("customer_name").notNull().default(""),
    paymentMethod: text("payment_method").notNull(),
    subtotal: integer("subtotal").notNull(),
    amountReceived: integer("amount_received").notNull(),
    changeAmount: integer("change_amount").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ggs_cashier_transactions_register_created_idx").on(
      table.register,
      table.createdAt,
    ),
  ],
);

export const ggsCashierTransactionItemsTable = pgTable(
  "ggs_cashier_transaction_items",
  {
    id: serial("id").primaryKey(),
    transactionId: integer("transaction_id")
      .notNull()
      .references(() => ggsCashierTransactionsTable.id, {
        onDelete: "cascade",
      }),
    itemType: text("item_type").notNull(),
    itemId: integer("item_id").notNull(),
    itemName: text("item_name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (table) => [
    index("ggs_cashier_transaction_items_transaction_idx").on(
      table.transactionId,
    ),
  ],
);

export const insertGgsCashierTransactionSchema = createInsertSchema(
  ggsCashierTransactionsTable,
).omit({
  id: true,
  createdAt: true,
});

export const insertGgsCashierTransactionItemSchema = createInsertSchema(
  ggsCashierTransactionItemsTable,
).omit({
  id: true,
});

export type InsertGgsCashierTransaction = z.infer<
  typeof insertGgsCashierTransactionSchema
>;
export type InsertGgsCashierTransactionItem = z.infer<
  typeof insertGgsCashierTransactionItemSchema
>;
export type GgsCashierTransaction =
  typeof ggsCashierTransactionsTable.$inferSelect;
export type GgsCashierTransactionItem =
  typeof ggsCashierTransactionItemsTable.$inferSelect;
