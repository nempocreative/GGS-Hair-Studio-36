import { clerkClient, getAuth } from "@clerk/express";
import {
  and,
  asc,
  count,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { Router, type IRouter, type RequestHandler } from "express";
import {
  CreateGgsAppointmentBody,
  CreateGgsAppointmentResponse,
  CreateGgsProductBody,
  CreateGgsProductResponse,
  CreateGgsServiceBody,
  CreateGgsServiceResponse,
  CreateGgsVoucherBody,
  CreateGgsVoucherResponse,
  DeleteGgsServiceParams,
  DeleteGgsProductParams,
  DeleteGgsVoucherParams,
  GetGgsAdminProductsResponse,
  GetGgsAdminAppointmentsResponse,
  GetGgsAdminServicesResponse,
  GetGgsAdminVouchersResponse,
  GetGgsAdminSummaryResponse,
  GetGgsPublicServicesResponse,
  GetGgsPublicProductsResponse,
  GetGgsPublicVouchersResponse,
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
  UpdateGgsVoucherBody,
  UpdateGgsVoucherParams,
  UpdateGgsVoucherResponse,
} from "@workspace/api-zod";
import {
  db,
  ggsAppointmentsTable,
  ggsProductsTable,
  ggsServicesTable,
  ggsSiteContentTable,
  ggsVouchersTable,
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
  {
    name: "Layered Cut",
    category: "Cut & Styling",
    description: "Potongan berlayer untuk memberi bentuk dan gerak pada rambut.",
    durationMinutes: 60,
    price: 300000,
    active: true,
    imageUrl: null,
    sortOrder: 5,
  },
  {
    name: "Blow & Volume",
    category: "Styling",
    description: "Blow dry dengan volume dan bentuk sesuai gaya yang diinginkan.",
    durationMinutes: 45,
    price: 175000,
    active: true,
    imageUrl: null,
    sortOrder: 6,
  },
  {
    name: "Creambath Relax",
    category: "Hair Care",
    description: "Creambath dan pijatan kulit kepala untuk momen perawatan yang lebih santai.",
    durationMinutes: 60,
    price: 160000,
    active: true,
    imageUrl: null,
    sortOrder: 7,
  },
  {
    name: "Smoothing Sleek",
    category: "Smoothing",
    description: "Smoothing untuk tampilan rambut lebih halus dan mudah ditata.",
    durationMinutes: 180,
    price: 750000,
    active: true,
    imageUrl: null,
    sortOrder: 8,
  },
  {
    name: "Cukur Pria",
    category: "Cut & Styling",
    description: "Potongan pria untuk kebutuhan harian.",
    durationMinutes: 30,
    price: 60000,
    active: true,
    imageUrl: null,
    sortOrder: 10,
  },
  {
    name: "Cukur + Cuci",
    category: "Cut & Styling",
    description: "Potong rambut dilanjutkan dengan cuci rambut.",
    durationMinutes: 45,
    price: 80000,
    active: true,
    imageUrl: null,
    sortOrder: 11,
  },
  {
    name: "Skin Fade",
    category: "Cut & Styling",
    description: "Potongan fade dengan pengerjaan lebih detail.",
    durationMinutes: 45,
    price: 90000,
    active: true,
    imageUrl: null,
    sortOrder: 12,
  },
  {
    name: "Cukur + Styling",
    category: "Cut & Styling",
    description: "Potong rambut dan penataan akhir.",
    durationMinutes: 45,
    price: 100000,
    active: true,
    imageUrl: null,
    sortOrder: 13,
  },
  {
    name: "Cukur + Cuci + Styling",
    category: "Cut & Styling",
    description: "Paket potong, cuci, dan penataan rambut.",
    durationMinutes: 60,
    price: 125000,
    active: true,
    imageUrl: null,
    sortOrder: 14,
  },
  {
    name: "Taper Modern",
    category: "Cut & Styling",
    description: "Potongan taper dengan sisi meruncing dan garis yang bersih.",
    durationMinutes: 40,
    price: 70000,
    active: true,
    imageUrl: null,
    sortOrder: 15,
  },
  {
    name: "Crew Cut",
    category: "Cut & Styling",
    description: "Potongan pendek rapi yang mudah ditata untuk rutinitas harian.",
    durationMinutes: 35,
    price: 60000,
    active: true,
    imageUrl: null,
    sortOrder: 16,
  },
  {
    name: "Textured Styling",
    category: "Styling",
    description: "Penataan bertekstur untuk memberi kesan lebih bervolume.",
    durationMinutes: 30,
    price: 50000,
    active: true,
    imageUrl: null,
    sortOrder: 17,
  },
  {
    name: "Cuci & Styling",
    category: "Styling",
    description: "Keramas dilanjutkan dengan penataan sesuai gaya yang diinginkan.",
    durationMinutes: 35,
    price: 45000,
    active: true,
    imageUrl: null,
    sortOrder: 18,
  },
  {
    name: "Warna Natural",
    category: "Color",
    description: "Warna rambut dengan hasil natural setelah konsultasi.",
    durationMinutes: 100,
    price: 250000,
    active: true,
    imageUrl: null,
    sortOrder: 19,
  },
  {
    name: "Highlight Rambut",
    category: "Color",
    description: "Teknik highlight untuk memberi dimensi pada warna rambut.",
    durationMinutes: 120,
    price: 350000,
    active: true,
    imageUrl: null,
    sortOrder: 20,
  },
  {
    name: "Buzz Cut",
    category: "Cut & Styling",
    description: "Potongan sangat pendek yang praktis dan mudah dirawat.",
    durationMinutes: 25,
    price: 45000,
    active: true,
    imageUrl: null,
    sortOrder: 21,
  },
];

const defaultProducts = [
  {
    name: "GGS Daily Balance Shampoo",
    category: "Contoh · Perawatan rambut",
    description: "Contoh katalog awal untuk rutinitas keramas harian.",
    price: 129000,
    stock: 18,
    active: true,
    imageUrl: "/ai-product-shampoo.jpg",
    sortOrder: 1,
  },
  {
    name: "GGS Soft Balance Conditioner",
    category: "Contoh · Perawatan rambut",
    description: "Contoh katalog awal untuk melengkapi rutinitas perawatan rambut.",
    price: 145000,
    stock: 15,
    active: true,
    imageUrl: "/ai-product-conditioner.jpg",
    sortOrder: 2,
  },
  {
    name: "GGS Deep Care Hair Mask",
    category: "Contoh · Hair treatment",
    description: "Contoh produk perawatan intensif untuk katalog GGS.",
    price: 189000,
    stock: 12,
    active: true,
    imageUrl: "/ai-product-hair-mask.jpg",
    sortOrder: 3,
  },
  {
    name: "GGS Nourish Hair Oil",
    category: "Contoh · Hair oil",
    description: "Contoh produk minyak rambut untuk melengkapi katalog.",
    price: 165000,
    stock: 14,
    active: true,
    imageUrl: "/ai-product-hair-oil.jpg",
    sortOrder: 4,
  },
  {
    name: "GGS Scalp Balance Tonic",
    category: "Contoh · Perawatan kulit kepala",
    description: "Contoh produk perawatan kulit kepala untuk katalog GGS.",
    price: 155000,
    stock: 10,
    active: true,
    imageUrl: "/ai-product-scalp-tonic.jpg",
    sortOrder: 5,
  },
  {
    name: "GGS Shine Repair Serum",
    category: "Contoh · Hair serum",
    description: "Contoh serum rambut sebagai pilihan perawatan di rumah.",
    price: 179000,
    stock: 11,
    active: true,
    imageUrl: "/ai-product-serum.jpg",
    sortOrder: 6,
  },
  {
    name: "GGS Daily Leave-In Cream",
    category: "Contoh · Leave-in care",
    description: "Contoh leave-in care untuk melengkapi pilihan produk GGS.",
    price: 149000,
    stock: 16,
    active: true,
    imageUrl: "/ai-product-leave-in.jpg",
    sortOrder: 7,
  },
  {
    name: "GGS Texture Styling Cream",
    category: "Contoh · Styling",
    description: "Contoh krim styling sebagai bagian dari katalog produk GGS.",
    price: 139000,
    stock: 13,
    active: true,
    imageUrl: "/ai-product-styling-cream.jpg",
    sortOrder: 8,
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

          const [product] = await tx
            .select({ id: ggsProductsTable.id })
            .from(ggsProductsTable)
            .limit(1);
          if (!product) {
            await tx.insert(ggsProductsTable).values(defaultProducts);
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

function serializeVoucher(voucher: typeof ggsVouchersTable.$inferSelect) {
  return {
    id: voucher.id,
    name: voucher.name,
    value: voucher.value,
    code: voucher.code,
    startsAt: voucher.startsAt,
    expiresAt: voucher.expiresAt,
    active: voucher.active,
  };
}

function todayInJakarta(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

function normalizeVoucherInput(input: {
  name: string;
  value: string;
  code: string | null;
  startsAt: string | Date | null;
  expiresAt: string | Date | null;
  active: boolean;
}) {
  const calendarDate = (value: string | Date | null) =>
    value instanceof Date ? value.toISOString().slice(0, 10) : value;
  const normalized = {
    ...input,
    name: input.name.trim(),
    value: input.value.trim(),
    code: input.code?.trim().replace(/\s+/g, "").toUpperCase() || null,
    startsAt: calendarDate(input.startsAt),
    expiresAt: calendarDate(input.expiresAt),
  };

  if (!normalized.name || !normalized.value) {
    return { error: "Nama voucher dan nilai penawaran harus diisi." } as const;
  }
  if (normalized.active && !normalized.code) {
    return { error: "Isi kode sebelum mengaktifkan voucher." } as const;
  }
  if (
    normalized.startsAt &&
    normalized.expiresAt &&
    normalized.startsAt > normalized.expiresAt
  ) {
    return { error: "Tanggal akhir harus sama atau setelah tanggal mulai." } as const;
  }
  return { data: normalized } as const;
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

router.get("/ggs/vouchers", async (_req, res): Promise<void> => {
  await ensureInitialContent();
  const today = todayInJakarta();
  const vouchers = await db
    .select()
    .from(ggsVouchersTable)
    .where(
      and(
        eq(ggsVouchersTable.active, true),
        isNotNull(ggsVouchersTable.code),
        sql`btrim(${ggsVouchersTable.code}) <> ''`,
        or(
          isNull(ggsVouchersTable.startsAt),
          lte(ggsVouchersTable.startsAt, today),
        ),
        or(
          isNull(ggsVouchersTable.expiresAt),
          gte(ggsVouchersTable.expiresAt, today),
        ),
      ),
    )
    .orderBy(asc(ggsVouchersTable.sortOrder), asc(ggsVouchersTable.name));

  const parsedVouchers = GetGgsPublicVouchersResponse.parse(
    vouchers.map((voucher) => ({
      id: voucher.id,
      name: voucher.name,
      value: voucher.value,
      code: voucher.code ?? "",
      expiresAt: voucher.expiresAt,
    })),
  );
  res.json(
    parsedVouchers.map((voucher, index) => ({
      ...voucher,
      expiresAt: vouchers[index].expiresAt,
    })),
  );
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

router.get("/ggs/admin/vouchers", async (_req, res): Promise<void> => {
  await ensureInitialContent();
  const vouchers = await db
    .select()
    .from(ggsVouchersTable)
    .orderBy(asc(ggsVouchersTable.sortOrder), asc(ggsVouchersTable.name));
  const parsedVouchers = GetGgsAdminVouchersResponse.parse(
    vouchers.map(serializeVoucher),
  );
  res.json(
    parsedVouchers.map((voucher, index) => ({
      ...voucher,
      startsAt: vouchers[index].startsAt,
      expiresAt: vouchers[index].expiresAt,
    })),
  );
});

router.post("/ggs/admin/vouchers", async (req, res): Promise<void> => {
  const parsed = CreateGgsVoucherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const normalized = normalizeVoucherInput(parsed.data);
  if (!normalized.data) {
    res.status(400).json({ error: normalized.error });
    return;
  }
  if (normalized.data.code) {
    const [duplicate] = await db
      .select({ id: ggsVouchersTable.id })
      .from(ggsVouchersTable)
      .where(eq(ggsVouchersTable.code, normalized.data.code))
      .limit(1);
    if (duplicate) {
      res.status(409).json({ error: "Kode voucher sudah digunakan." });
      return;
    }
  }

  await ensureInitialContent();
  const [voucher] = await db
    .insert(ggsVouchersTable)
    .values({ ...normalized.data, sortOrder: 99 })
    .returning();
  const response = CreateGgsVoucherResponse.parse(serializeVoucher(voucher));
  res.status(201).json({
    ...response,
    startsAt: voucher.startsAt,
    expiresAt: voucher.expiresAt,
  });
});

router.patch("/ggs/admin/vouchers/:id", async (req, res): Promise<void> => {
  const params = UpdateGgsVoucherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGgsVoucherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const normalized = normalizeVoucherInput(parsed.data);
  if (!normalized.data) {
    res.status(400).json({ error: normalized.error });
    return;
  }
  if (normalized.data.code) {
    const [duplicate] = await db
      .select({ id: ggsVouchersTable.id })
      .from(ggsVouchersTable)
      .where(eq(ggsVouchersTable.code, normalized.data.code))
      .limit(1);
    if (duplicate && duplicate.id !== params.data.id) {
      res.status(409).json({ error: "Kode voucher sudah digunakan." });
      return;
    }
  }

  const [voucher] = await db
    .update(ggsVouchersTable)
    .set(normalized.data)
    .where(eq(ggsVouchersTable.id, params.data.id))
    .returning();
  if (!voucher) {
    res.status(404).json({ error: "Voucher tidak ditemukan." });
    return;
  }
  const response = UpdateGgsVoucherResponse.parse(serializeVoucher(voucher));
  res.json({
    ...response,
    startsAt: voucher.startsAt,
    expiresAt: voucher.expiresAt,
  });
});

router.delete("/ggs/admin/vouchers/:id", async (req, res): Promise<void> => {
  const params = DeleteGgsVoucherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [voucher] = await db
    .delete(ggsVouchersTable)
    .where(eq(ggsVouchersTable.id, params.data.id))
    .returning({ id: ggsVouchersTable.id });
  if (!voucher) {
    res.status(404).json({ error: "Voucher tidak ditemukan." });
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
