import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  boolean,
  date,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const ggsCashierAnnouncementsTable = pgTable(
  "ggs_cashier_announcements",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    category: text("category").notNull().default("info"),
    startsAt: date("starts_at", { mode: "string" }),
    expiresAt: date("expires_at", { mode: "string" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const insertGgsCashierAnnouncementSchema = createInsertSchema(
  ggsCashierAnnouncementsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertGgsCashierAnnouncement = z.infer<
  typeof insertGgsCashierAnnouncementSchema
>;
export type GgsCashierAnnouncement =
  typeof ggsCashierAnnouncementsTable.$inferSelect;
