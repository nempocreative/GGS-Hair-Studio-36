import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const ggsEmployeeAccountsTable = pgTable(
  "ggs_employee_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: text("employee_id").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("ggs_employee_accounts_employee_id_unique").on(
      table.employeeId,
    ),
  ],
);

export const ggsEmployeeSessionsTable = pgTable(
  "ggs_employee_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => ggsEmployeeAccountsTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ggs_employee_sessions_employee_id_idx").on(table.employeeId),
    index("ggs_employee_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const insertGgsEmployeeAccountSchema = createInsertSchema(
  ggsEmployeeAccountsTable,
).omit({
  id: true,
  active: true,
  createdAt: true,
  updatedAt: true,
});
export const insertGgsEmployeeSessionSchema = createInsertSchema(
  ggsEmployeeSessionsTable,
).omit({
  createdAt: true,
});

export type InsertGgsEmployeeAccount = z.infer<
  typeof insertGgsEmployeeAccountSchema
>;
export type InsertGgsEmployeeSession = z.infer<
  typeof insertGgsEmployeeSessionSchema
>;
export type GgsEmployeeAccount =
  typeof ggsEmployeeAccountsTable.$inferSelect;
export type GgsEmployeeSession =
  typeof ggsEmployeeSessionsTable.$inferSelect;
