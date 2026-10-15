import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ggsCashierTransactionsTable } from "./ggs-cashier";

export const ggsOwnerRecordsTable = pgTable(
  "ggs_owner_records",
  {
    id: serial("id").primaryKey(),
    recordType: text("record_type").notNull(),
    recordKey: text("record_key").notNull(),
    branchId: text("branch_id"),
    employeeId: text("employee_id"),
    recordDate: date("record_date", { mode: "string" }),
    recordPeriod: text("record_period"),
    status: text("status").notNull().default("active"),
    data: jsonb("data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("ggs_owner_records_type_key_unique").on(
      table.recordType,
      table.recordKey,
    ),
    index("ggs_owner_records_type_date_idx").on(
      table.recordType,
      table.recordDate,
    ),
    index("ggs_owner_records_branch_period_idx").on(
      table.branchId,
      table.recordPeriod,
    ),
  ],
);

export const insertGgsOwnerRecordSchema = createInsertSchema(
  ggsOwnerRecordsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGgsOwnerRecord = z.infer<typeof insertGgsOwnerRecordSchema>;
export type GgsOwnerRecord = typeof ggsOwnerRecordsTable.$inferSelect;

export const ggsOwnerTransactionCorrectionsTable = pgTable(
  "ggs_owner_transaction_corrections",
  {
    id: serial("id").primaryKey(),
    transactionId: integer("transaction_id")
      .notNull()
      .references(() => ggsCashierTransactionsTable.id, {
        onDelete: "restrict",
      }),
    status: text("status").notNull().default("pending"),
    reason: text("reason").notNull(),
    proposedCustomerName: text("proposed_customer_name").notNull(),
    proposedEmployeeName: text("proposed_employee_name").notNull(),
    proposedDiscountAmount: integer("proposed_discount_amount").notNull(),
    proposedAmountReceived: integer("proposed_amount_received").notNull(),
    proposedPaymentMethod: text("proposed_payment_method").notNull(),
    approvalCodeHash: text("approval_code_hash"),
    rejectReason: text("reject_reason"),
    beforeSnapshot: jsonb("before_snapshot").$type<Record<string, unknown> | null>(),
    afterSnapshot: jsonb("after_snapshot").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
  },
  (table) => [
    index("ggs_owner_transaction_corrections_transaction_idx").on(
      table.transactionId,
      table.createdAt,
    ),
    index("ggs_owner_transaction_corrections_status_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);

export const insertGgsOwnerTransactionCorrectionSchema = createInsertSchema(
  ggsOwnerTransactionCorrectionsTable,
).omit({ id: true, createdAt: true });

export type InsertGgsOwnerTransactionCorrection = z.infer<
  typeof insertGgsOwnerTransactionCorrectionSchema
>;
export type GgsOwnerTransactionCorrection =
  typeof ggsOwnerTransactionCorrectionsTable.$inferSelect;
