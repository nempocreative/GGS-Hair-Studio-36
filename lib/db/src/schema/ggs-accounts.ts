import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type GgsAccountIdentifierType = "email" | "whatsapp";

export const ggsCustomerAccountsTable = pgTable(
  "ggs_customer_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    identifierType: text("identifier_type")
      .$type<GgsAccountIdentifierType>()
      .notNull(),
    identifier: text("identifier").notNull(),
    passwordHash: text("password_hash").notNull(),
    points: integer("points").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ggs_customer_accounts_identifier_unique").on(
      table.identifierType,
      table.identifier,
    ),
  ],
);

export const ggsCustomerSessionsTable = pgTable(
  "ggs_customer_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => ggsCustomerAccountsTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ggs_customer_sessions_account_id_idx").on(table.accountId),
    index("ggs_customer_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const insertGgsCustomerAccountSchema = createInsertSchema(
  ggsCustomerAccountsTable,
).omit({
  id: true,
  points: true,
  createdAt: true,
});

export type InsertGgsCustomerAccount = z.infer<
  typeof insertGgsCustomerAccountSchema
>;
export type GgsCustomerAccount = typeof ggsCustomerAccountsTable.$inferSelect;
export type GgsCustomerSession = typeof ggsCustomerSessionsTable.$inferSelect;
