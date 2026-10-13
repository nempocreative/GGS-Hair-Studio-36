import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const ggsVouchersTable = pgTable(
  "ggs_vouchers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    value: text("value").notNull(),
    code: text("code"),
    startsAt: date("starts_at", { mode: "string" }),
    expiresAt: date("expires_at", { mode: "string" }),
    active: boolean("active").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("ggs_vouchers_code_unique").on(table.code)],
);

export const insertGgsVoucherSchema = createInsertSchema(ggsVouchersTable).omit({
  id: true,
  createdAt: true,
});

export type InsertGgsVoucher = z.infer<typeof insertGgsVoucherSchema>;
export type GgsVoucher = typeof ggsVouchersTable.$inferSelect;
