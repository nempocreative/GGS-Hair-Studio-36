import { clerkClient, getAuth } from "@clerk/express";
import { and, asc, count, eq, gte, lt, sql } from "drizzle-orm";
import { Router, type IRouter, type RequestHandler } from "express";
import {
  CreateGgsAppointmentBody,
  CreateGgsAppointmentResponse,
  CreateGgsProductBody,
  CreateGgsProductResponse,
  CreateGgsServiceBody,
  CreateGgsServiceResponse,
  DeleteGgsServiceParams,
  DeleteGgsProductParams,
  GetGgsAdminProductsResponse,
  GetGgsAdminAppointmentsResponse,
  GetGgsAdminServicesResponse,
  GetGgsAdminSummaryResponse,
  GetGgsPublicServicesResponse,
  GetGgsPublicProductsResponse,
  GetGgsSiteResponse,
  UpdateGgsAppointmentBody,
  UpdateGgsAppointmentParams,
  UpdateGgsAppointmentResponse,
  UpdateGgsServiceBody,
  UpdateGgsServiceParams,
  UpdateGgsServiceResponse,
  UpdateGgsProductBody,
  UpdateGgsProductParams,
  UpdateGgsProductResponse,
  UpdateGgsSiteBody,
  UpdateGgsSiteResponse,
} from "@workspace/api-zod";
import {
  db,
  ggsAppointmentsTable,
  ggsProductsTable,
  ggsServicesTable,
  ggsSiteContentTable,
} from "@workspace/db";

const router: IRouter = Router();

const defaultSite = {
  id: "main",
  brandName: "GGS",
  tagline: "Ceritakan yang kamu inginkan. Kita pilih layanan yang pas untuk rambutmu.",
  introduction:
    "Kami mulai dengan mendengar apa yang kamu suka, kebiasaanmu merawat rambut, dan perubahan yang kamu inginkan.",
  phone: "",
  address: "",
  openingHours: "",
  instagramHandle: "",
  heroImageUrl: null,
};

const defaultServices = [
  {
    name: "Signature Cut",
    category: "Cut & Styling",
    description: "Potongan presisi yang dirancang untuk gaya dan rutinitasmu.",
    durationMinutes: 45,
    price: 250000,
    active: true,
    imageUrl: null,
    sortOrder: 1,
  },
  {
    name: "Color Expression",
    category: "Color",
    description: "Warna personal dengan konsultasi dan hasil yang berkilau.",
    durationMinutes: 120,
    price: 850000,
    active: true,
    imageUrl: null,
    sortOrder: 2,
  },
  {
    name: "Care Ritual",
    category: "Hair Care",
    description: "Perawatan intensif untuk rambut yang lebih lembut dan sehat.",
    durationMinutes: 60,
    price: 420000,
    active: true,
    imageUrl: null,
    sortOrder: 3,
  },
  {
    name: "Event Finish",
    category: "Styling",
    description: "Styling akhir untuk acara spesial dan momen pentingmu.",
    durationMinutes: 60,
    price: 500000,
    active: true,
    imageUrl: null,
    sortOrder: 4,
  },
];

let seedPromise: Promise<void> | undefined;

async function ensureInitialContent(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      await db.transaction(async (tx) => {
        await tx
          .insert(ggsSiteContentTable)
          .values(defaultSite)
          .onConflictDoNothing();

        const [site] = await tx
          .select({ id: ggsSiteContentTable.id })
          .from(ggsSiteContentTable)
          .where(eq(ggsSiteContentTable.id, "main"))
          .limit(1);

        if (site) {
          const [service] = await tx
            .select({ id: ggsServicesTable.id })
            .from(ggsServicesTable)
            .limit(1);
          if (!service) {
            await tx.insert(ggsServicesTable).values(defaultServices);
          }
        }
      });
    })().catch((error: unknown) => {
      seedPromise = undefined;
      throw error;
    });
  }
  await seedPromise;
}

function serializeSite(site: typeof defaultSite | (typeof ggsSiteContentTable.$inferSelect)) {
  return {
    brandName: site.brandName,
    tagline: site.tagline,
    introduction: site.introduction,
    phone: site.phone,
    address: site.address,
    openingHours: site.openingHours,
    instagramHandle: site.instagramHandle,
    heroImageUrl: site.heroImageUrl,
  };
}

function serializeService(service: typeof ggsServicesTable.$inferSelect) {
  return {
    id: service.id,
    name: service.name,
    category: service.category,
    description: service.description,
    durationMinutes: service.durationMinutes,
    price: service.price,
    active: service.active,
    imageUrl: service.imageUrl,
  };
}

function serializeProduct(product: typeof ggsProductsTable.$inferSelect) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    price: product.price,
    stock: product.stock,
    active: product.active,
    imageUrl: product.imageUrl,
  };
}

function serializeAppointment(
  appointment: typeof ggsAppointmentsTable.$inferSelect,
) {
  return {
    id: appointment.id,
    customerName: appointment.customerName,
    email: appointment.email,
    phone: appointment.phone,
    serviceId: appointment.serviceId,
    serviceName: appointment.serviceName,
    appointmentDate: appointment.appointmentDate,
    appointmentTime: appointment.appointmentTime,
    notes: appointment.notes,
    status: appointment.status,
    createdAt: appointment.createdAt.toISOString(),
  };
}

const requireGgsOwner: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Masuk untuk membuka CMS GGS." });
    return;
  }

  const allowedEmail = process.env.GGS_ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail) {
    req.log.error("GGS_ADMIN_EMAIL is not configured");
    res.status(503).json({ error: "Akses admin belum dikonfigurasi." });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const isAllowedOwner = user.emailAddresses.some(
      (email) =>
        email.emailAddress.trim().toLowerCase() === allowedEmail &&
        email.verification?.status === "verified",
    );
    if (!isAllowedOwner) {
      res.status(403).json({ error: "Akun ini tidak memiliki akses CMS GGS." });
      return;
    }
    next();
  } catch (error) {
    req.log.error({ err: error }, "Failed to verify GGS CMS owner");
    res.status(401).json({ error: "Sesi masuk tidak dapat diverifikasi." });
  }
};

router.get("/ggs/site", async (_req, res): Promise<void> => {
  await ensureInitialContent();
  const [site] = await db
    .select()
    .from(ggsSiteContentTable)
    .where(eq(ggsSiteContentTable.id, "main"))
    .limit(1);
  res.json(GetGgsSiteResponse.parse(serializeSite(site ?? defaultSite)));
});

router.get("/ggs/services", async (_req, res): Promise<void> => {
  await ensureInitialContent();
  const services = await db
    .select()
    .from(ggsServicesTable)
    .where(eq(ggsServicesTable.active, true))
    .orderBy(asc(ggsServicesTable.sortOrder), asc(ggsServicesTable.name));
  res.json(GetGgsPublicServicesResponse.parse(services.map(serializeService)));
});

router.get("/ggs/products", async (_req, res): Promise<void> => {
  await ensureInitialContent();
  const products = await db
    .select()
    .from(ggsProductsTable)
    .where(eq(ggsProductsTable.active, true))
    .orderBy(asc(ggsProductsTable.sortOrder), asc(ggsProductsTable.name));
  res.json(GetGgsPublicProductsResponse.parse(products.map(serializeProduct)));
});

router.post("/ggs/appointments", async (req, res): Promise<void> => {
  const parsed = CreateGgsAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await ensureInitialContent();
  const data = parsed.data;
  const [service] = await db
    .select()
    .from(ggsServicesTable)
    .where(
      and(
        eq(ggsServicesTable.id, data.serviceId),
        eq(ggsServicesTable.active, true),
      ),
    )
    .limit(1);
  if (!service) {
    res.status(400).json({ error: "Layanan ini tidak tersedia." });
    return;
  }

  const dateParts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const datePart = (type: string) =>
    dateParts.find((part) => part.type === type)?.value ?? "";
  const todayInJakarta =
    `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
  const requestedDate = data.appointmentDate.toISOString().slice(0, 10);
  if (requestedDate < todayInJakarta) {
    res.status(400).json({ error: "Pilih tanggal hari ini atau setelahnya." });
    return;
  }

  const [appointment] = await db
    .insert(ggsAppointmentsTable)
    .values({
      customerName: data.customerName,
      email: data.email,
      phone: data.phone,
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      appointmentDate: requestedDate,
      appointmentTime: data.appointmentTime,
      notes: data.notes,
    })
    .returning();

  const parsedAppointment = CreateGgsAppointmentResponse.parse(
    serializeAppointment(appointment),
  );
  res.status(201).json({
    ...parsedAppointment,
    appointmentDate: appointment.appointmentDate,
  });
});

router.use("/ggs/admin", requireGgsOwner);

router.get("/ggs/admin/summary", async (_req, res): Promise<void> => {
  await ensureInitialContent();
  const [total] = await db
    .select({ value: count() })
    .from(ggsAppointmentsTable);
  const [pending] = await db
    .select({ value: count() })
    .from(ggsAppointmentsTable)
    .where(eq(ggsAppointmentsTable.status, "pending"));
  const [confirmed] = await db
    .select({ value: count() })
    .from(ggsAppointmentsTable)
    .where(eq(ggsAppointmentsTable.status, "confirmed"));
  const [activeServices] = await db
    .select({ value: count() })
    .from(ggsServicesTable)
    .where(eq(ggsServicesTable.active, true));

  const today = new Date();
  const monthStart = `${today.toISOString().slice(0, 7)}-01`;
  const nextMonth = new Date(`${monthStart}T00:00:00.000Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const monthEndExclusive = nextMonth.toISOString().slice(0, 10);
  const [revenue] = await db
    .select({
      value: sql<number>`coalesce(sum(${ggsAppointmentsTable.servicePrice}), 0)`,
    })
    .from(ggsAppointmentsTable)
    .where(
      and(
        eq(ggsAppointmentsTable.status, "completed"),
        gte(ggsAppointmentsTable.appointmentDate, monthStart),
        lt(ggsAppointmentsTable.appointmentDate, monthEndExclusive),
      ),
    );

  res.json(
    GetGgsAdminSummaryResponse.parse({
      totalAppointments: total.value,
      pendingAppointments: pending.value,
      confirmedAppointments: confirmed.value,
      activeServices: activeServices.value,
      monthlyRevenue: Number(revenue.value),
    }),
  );
});

router.patch("/ggs/admin/site", async (req, res): Promise<void> => {
  const parsed = UpdateGgsSiteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Masukkan setidaknya satu perubahan." });
    return;
  }

  await ensureInitialContent();
  const [site] = await db
    .update(ggsSiteContentTable)
    .set(parsed.data)
    .where(eq(ggsSiteContentTable.id, "main"))
    .returning();
  res.json(UpdateGgsSiteResponse.parse(serializeSite(site)));
});

router.get("/ggs/admin/services", async (_req, res): Promise<void> => {
  await ensureInitialContent();
  const services = await db
    .select()
    .from(ggsServicesTable)
    .orderBy(asc(ggsServicesTable.sortOrder), asc(ggsServicesTable.name));
  res.json(GetGgsAdminServicesResponse.parse(services.map(serializeService)));
});

router.post("/ggs/admin/services", async (req, res): Promise<void> => {
  const parsed = CreateGgsServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureInitialContent();
  const [service] = await db
    .insert(ggsServicesTable)
    .values({ ...parsed.data, sortOrder: 99 })
    .returning();
  res
    .status(201)
    .json(CreateGgsServiceResponse.parse(serializeService(service)));
});

router.patch("/ggs/admin/services/:id", async (req, res): Promise<void> => {
  const params = UpdateGgsServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGgsServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [service] = await db
    .update(ggsServicesTable)
    .set(parsed.data)
    .where(eq(ggsServicesTable.id, params.data.id))
    .returning();
  if (!service) {
    res.status(404).json({ error: "Layanan tidak ditemukan." });
    return;
  }
  res.json(UpdateGgsServiceResponse.parse(serializeService(service)));
});

router.delete("/ggs/admin/services/:id", async (req, res): Promise<void> => {
  const params = DeleteGgsServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [service] = await db
    .delete(ggsServicesTable)
    .where(eq(ggsServicesTable.id, params.data.id))
    .returning({ id: ggsServicesTable.id });
  if (!service) {
    res.status(404).json({ error: "Layanan tidak ditemukan." });
    return;
  }
  res.sendStatus(204);
});

router.get("/ggs/admin/products", async (_req, res): Promise<void> => {
  await ensureInitialContent();
  const products = await db
    .select()
    .from(ggsProductsTable)
    .orderBy(asc(ggsProductsTable.sortOrder), asc(ggsProductsTable.name));
  res.json(GetGgsAdminProductsResponse.parse(products.map(serializeProduct)));
});

router.post("/ggs/admin/products", async (req, res): Promise<void> => {
  const parsed = CreateGgsProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureInitialContent();
  const [product] = await db
    .insert(ggsProductsTable)
    .values({ ...parsed.data, sortOrder: 99 })
    .returning();
  res.status(201).json(CreateGgsProductResponse.parse(serializeProduct(product)));
});

router.patch("/ggs/admin/products/:id", async (req, res): Promise<void> => {
  const params = UpdateGgsProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGgsProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db
    .update(ggsProductsTable)
    .set(parsed.data)
    .where(eq(ggsProductsTable.id, params.data.id))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Produk tidak ditemukan." });
    return;
  }
  res.json(UpdateGgsProductResponse.parse(serializeProduct(product)));
});

router.delete("/ggs/admin/products/:id", async (req, res): Promise<void> => {
  const params = DeleteGgsProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db
    .delete(ggsProductsTable)
    .where(eq(ggsProductsTable.id, params.data.id))
    .returning({ id: ggsProductsTable.id });
  if (!product) {
    res.status(404).json({ error: "Produk tidak ditemukan." });
    return;
  }
  res.sendStatus(204);
});

router.get("/ggs/admin/appointments", async (_req, res): Promise<void> => {
  await ensureInitialContent();
  const appointments = await db
    .select()
    .from(ggsAppointmentsTable)
    .orderBy(
      asc(ggsAppointmentsTable.appointmentDate),
      asc(ggsAppointmentsTable.appointmentTime),
    );
  const parsedAppointments = GetGgsAdminAppointmentsResponse.parse(
    appointments.map(serializeAppointment),
  );
  res.json(
    parsedAppointments.map((appointment, index) => ({
      ...appointment,
      appointmentDate: appointments[index].appointmentDate,
    })),
  );
});

router.patch(
  "/ggs/admin/appointments/:id",
  async (req, res): Promise<void> => {
    const params = UpdateGgsAppointmentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateGgsAppointmentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [appointment] = await db
      .update(ggsAppointmentsTable)
      .set({ status: parsed.data.status })
      .where(eq(ggsAppointmentsTable.id, params.data.id))
      .returning();
    if (!appointment) {
      res.status(404).json({ error: "Booking tidak ditemukan." });
      return;
    }
    const parsedAppointment = UpdateGgsAppointmentResponse.parse(
      serializeAppointment(appointment),
    );
    res.json({
      ...parsedAppointment,
      appointmentDate: appointment.appointmentDate,
    });
  },
);

export default router;
