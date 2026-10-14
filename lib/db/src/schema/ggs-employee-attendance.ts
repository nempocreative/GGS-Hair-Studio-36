import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  date,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { ggsEmployeeAccountsTable } from "./ggs-employees";

export const ggsEmployeeAttendanceTable = pgTable(
  "ggs_employee_attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => ggsEmployeeAccountsTable.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date", { mode: "string" }).notNull(),
    checkInAt: timestamp("check_in_at", { withTimezone: true }).notNull(),
    checkOutAt: timestamp("check_out_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("ggs_employee_attendance_employee_date_unique").on(
      table.employeeId,
      table.attendanceDate,
    ),
    index("ggs_employee_attendance_date_idx").on(table.attendanceDate),
  ],
);

export const ggsEmployeeAttendanceChallengesTable = pgTable(
  "ggs_employee_attendance_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull().unique(),
    createdByEmployeeId: uuid("created_by_employee_id")
      .notNull()
      .references(() => ggsEmployeeAccountsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("ggs_employee_attendance_challenges_expiry_idx").on(table.expiresAt),
  ],
);

export const ggsEmployeeAttendanceChallengeUsesTable = pgTable(
  "ggs_employee_attendance_challenge_uses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => ggsEmployeeAttendanceChallengesTable.id, {
        onDelete: "cascade",
      }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => ggsEmployeeAccountsTable.id, { onDelete: "cascade" }),
    usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ggs_employee_attendance_challenge_employee_unique").on(
      table.challengeId,
      table.employeeId,
    ),
    index("ggs_employee_attendance_challenge_uses_employee_idx").on(
      table.employeeId,
    ),
  ],
);

export const insertGgsEmployeeAttendanceSchema = createInsertSchema(
  ggsEmployeeAttendanceTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGgsEmployeeAttendance = z.infer<
  typeof insertGgsEmployeeAttendanceSchema
>;
export type GgsEmployeeAttendance =
  typeof ggsEmployeeAttendanceTable.$inferSelect;
