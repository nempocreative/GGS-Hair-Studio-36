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
    customerProfileId: integer("customer_profile_id"),
    branchId: text("branch_id"),
    paymentMethod: text("payment_method").notNull(),
    status: text("status").notNull().default("completed"),
    cancellationReason: text("cancellation_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledByEmployeeId: text("cancelled_by_employee_id"),
    cancelledByEmployeeName: text("cancelled_by_employee_name"),
    subtotal: integer("subtotal").notNull(),
    discountAmount: integer("discount_amount").notNull().default(0),
    voucherCode: text("voucher_code"),
    voucherName: text("voucher_name"),
    taxRate: integer("tax_rate").notNull().default(0),
    taxAmount: integer("tax_amount").notNull().default(0),
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
    index("ggs_cashier_transactions_register_status_created_idx").on(
      table.register,
      table.status,
      table.createdAt,
    ),
    index("ggs_cashier_transactions_branch_created_idx").on(
      table.branchId,
      table.createdAt,
    ),
    index("ggs_cashier_transactions_customer_profile_idx").on(
      table.customerProfileId,
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
