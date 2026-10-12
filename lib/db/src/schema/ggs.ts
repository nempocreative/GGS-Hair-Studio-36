import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const ggsSiteContentTable = pgTable("ggs_site_content", {
  id: text("id").primaryKey().default("main"),
  brandName: text("brand_name").notNull().default("GGS"),
  tagline: text("tagline").notNull(),
  introduction: text("introduction").notNull(),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  openingHours: text("opening_hours").notNull().default(""),
  instagramHandle: text("instagram_handle").notNull().default(""),
  heroImageUrl: text("hero_image_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const ggsServicesTable = pgTable("ggs_services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  durationMinutes: integer("duration_minutes").notNull(),
  price: integer("price").notNull(),
  active: boolean("active").notNull().default(true),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ggsAppointmentsTable = pgTable("ggs_appointments", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  serviceId: integer("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  servicePrice: integer("service_price").notNull(),
  appointmentDate: date("appointment_date", { mode: "string" }).notNull(),
  appointmentTime: text("appointment_time").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
