import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  gt,
  inArray,
  isNull,
  lt,
  sum,
} from "drizzle-orm";
import {
  Router,
  type IRouter,
  type Request,
  type Response,
} from "express";
import {
  CheckInGgsEmployeeAttendanceBody,
  CreateGgsAdminEmployeeBody,
  CreateGgsAdminEmployeeResponse,
  CreateGgsEmployeeCashierTransactionBody,
  CreateGgsEmployeeCashierTransactionResponse,
  CreateGgsEmployeeAttendanceChallengeBody,
  CreateGgsEmployeeAttendanceChallengeResponse,
  GetGgsEmployeeCashierTransactionsResponse,
  GetGgsEmployeeAttendanceHistoryResponse,
  GetGgsAdminEmployeesResponse,
  GetGgsEmployeeAttendanceTodayResponse,
  GetGgsEmployeeBookingsResponse,
  GetGgsEmployeeCashierSessionResponse,
  GetGgsEmployeeSessionResponse,
  CheckInGgsEmployeeAttendanceResponse,
  CheckOutGgsEmployeeAttendanceBody,
  CheckOutGgsEmployeeAttendanceResponse,
  LoginGgsEmployeeBody,
  LoginGgsEmployeeResponse,
  LogoutGgsEmployeeCashierResponse,
  UnlockGgsEmployeeCashierBody,
  UnlockGgsEmployeeCashierResponse,
  UpdateGgsAdminEmployeeBody,
  UpdateGgsAdminEmployeeParams,
  UpdateGgsAdminEmployeeResponse,
  type GgsEmployeeCashierRegister,
} from "@workspace/api-zod";
import {
  db,
  ggsAppointmentsTable,
  ggsCashierTransactionItemsTable,
  ggsCashierTransactionsTable,
  ggsEmployeeAccountsTable,
  ggsEmployeeAttendanceChallengeUsesTable,
  ggsEmployeeAttendanceChallengesTable,
  ggsEmployeeAttendanceTable,
  ggsEmployeeSessionsTable,
  ggsProductsTable,
  ggsServicesTable,
} from "@workspace/db";
import {
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "../lib/account-security";
import { requireGgsOwner } from "../middlewares/requireGgsOwner";

const router: IRouter = Router();
const employeeCookieName = "ggs_employee_session";
const employeeCookiePath = "/api/ggs/employee";
const employeeSessionMaxAgeMs = 1000 * 60 * 60 * 12;
const cashierSessionMaxAgeMs = 1000 * 60 * 60 * 8;
const attemptWindowMs = 15 * 60 * 1000;
const attemptLimit = 10;
const loginAttempts = new Map<string, { count: number; expiresAt: number }>();
const cashierPasswordEnvKeys: Record<GgsEmployeeCashierRegister, string> = {
  ggs_beauty: "GGS_BEAUTY_CASHIER_PASSWORD",
  barber_ggs: "GGS_BARBER_CASHIER_PASSWORD",
};
const attendanceSalonLocation = {
  latitude: -7.20282,
  longitude: 107.8898963,
  radiusMeters: 100,
  maxAccuracyMeters: 100,
};
const attendanceChallengeLifetimeMs = 45_000;

class AttendanceMutationFailure extends Error {
  constructor(message: string) {
    super(message);
  }
}

class CashierPaymentFailure extends Error {
  constructor(
    message: string,
    readonly status: 400 | 409,
  ) {
    super(message);
  }
}

type AttendanceLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

type PricedCashierItem = {
  itemType: "service" | "product";
  itemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

function distanceToSalonMeters(latitude: number, longitude: number) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = radians(latitude - attendanceSalonLocation.latitude);
  const longitudeDelta = radians(longitude - attendanceSalonLocation.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(attendanceSalonLocation.latitude)) *
      Math.cos(radians(latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    earthRadiusMeters *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function attendanceLocationFailure(location: AttendanceLocation): string | null {
  if (location.accuracy > attendanceSalonLocation.maxAccuracyMeters) {
    return "Akurasi GPS belum cukup. Aktifkan lokasi presisi lalu coba lagi.";
  }
  if (
    distanceToSalonMeters(location.latitude, location.longitude) >
    attendanceSalonLocation.radiusMeters
  ) {
    return "Absensi hanya dapat dilakukan di area salon.";
  }
  return null;
}

type EmployeeRecord = {
  id: string;
  employeeId: string;
  name: string;
  active: boolean;
  createdAt: Date;
};

function cookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: employeeCookiePath,
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}

function serializeEmployee(employee: EmployeeRecord) {
  return {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    active: employee.active,
    createdAt: employee.createdAt.toISOString(),
  };
}

function normalizeEmployeeId(employeeId: string) {
  return employeeId.trim().toUpperCase();
}

function jakartaAttendanceDate(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function jakartaCashierDateRange(date = new Date()) {
  const day = jakartaAttendanceDate(date);
  const startAt = new Date(`${day}T00:00:00.000+07:00`);
  return {
    day,
    startAt,
    endAt: new Date(startAt.getTime() + 24 * 60 * 60 * 1000),
  };
}

function serializeAttendance(
  attendanceDate: string,
  attendance?: typeof ggsEmployeeAttendanceTable.$inferSelect,
) {
  return {
    attendanceDate,
    status: !attendance
      ? "not_started"
      : attendance.checkOutAt
        ? "checked_out"
        : "checked_in",
    checkInAt: attendance?.checkInAt.toISOString() ?? null,
    checkOutAt: attendance?.checkOutAt?.toISOString() ?? null,
  };
}

function attemptKeys(req: Request, employeeId: string) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const identity = createHash("sha256")
    .update(normalizeEmployeeId(employeeId))
    .digest("hex");
  return [`ip:${ip}`, `employee:${identity}`];
}

function canAttemptLogin(keys: string[]) {
  const now = Date.now();
  let allowed = true;

  for (const key of keys) {
    const existing = loginAttempts.get(key);
    if (!existing || existing.expiresAt <= now) {
      loginAttempts.set(key, {
        count: 1,
        expiresAt: now + attemptWindowMs,
      });
      continue;
    }
    if (existing.count >= attemptLimit) {
      allowed = false;
      continue;
    }
    existing.count += 1;
  }

  for (const [key, attempt] of loginAttempts) {
    if (attempt.expiresAt <= now) loginAttempts.delete(key);
  }

  return allowed;
}

function isCashierRegister(value: string | null): value is GgsEmployeeCashierRegister {
  return value === "ggs_beauty" || value === "barber_ggs";
}

function cashierAttemptKeys(req: Request, register: GgsEmployeeCashierRegister) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return [`cashier:${register}:ip:${ip}`];
}

function matchesConfiguredPassword(candidate: string, expected: string) {
  const candidateDigest = createHash("sha256").update(candidate).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}

async function getEmployeeForSession(
  req: Request,
  res: Response,
): Promise<EmployeeRecord | null> {
  const token = req.cookies?.[employeeCookieName];
  if (typeof token !== "string" || token.length === 0) {
    res.clearCookie(employeeCookieName, cookieOptions());
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const [employee] = await db
    .select({
      id: ggsEmployeeAccountsTable.id,
      employeeId: ggsEmployeeAccountsTable.employeeId,
      name: ggsEmployeeAccountsTable.name,
      active: ggsEmployeeAccountsTable.active,
      createdAt: ggsEmployeeAccountsTable.createdAt,
    })
    .from(ggsEmployeeSessionsTable)
    .innerJoin(
      ggsEmployeeAccountsTable,
      eq(ggsEmployeeSessionsTable.employeeId, ggsEmployeeAccountsTable.id),
    )
    .where(
      and(
        eq(ggsEmployeeSessionsTable.tokenHash, tokenHash),
        gt(ggsEmployeeSessionsTable.expiresAt, new Date()),
        eq(ggsEmployeeAccountsTable.active, true),
      ),
    )
    .limit(1);

  if (!employee) {
    await db
      .delete(ggsEmployeeSessionsTable)
      .where(eq(ggsEmployeeSessionsTable.tokenHash, tokenHash));
    res.clearCookie(employeeCookieName, cookieOptions());
    return null;
  }
  return employee;
}

async function requireActiveCashier(
  req: Request,
  res: Response,
): Promise<{
  employee: EmployeeRecord;
  register: GgsEmployeeCashierRegister;
} | null> {
  const employee = await getEmployeeForSession(req, res);
  if (!employee) {
    res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
    return null;
  }

  const token = req.cookies?.[employeeCookieName];
  if (typeof token !== "string" || token.length === 0) {
    res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const [session] = await db
    .select({
      cashierRegister: ggsEmployeeSessionsTable.cashierRegister,
      cashierExpiresAt: ggsEmployeeSessionsTable.cashierExpiresAt,
    })
    .from(ggsEmployeeSessionsTable)
    .where(eq(ggsEmployeeSessionsTable.tokenHash, tokenHash))
    .limit(1);

  if (
    !session ||
    !isCashierRegister(session.cashierRegister) ||
    !session.cashierExpiresAt ||
    session.cashierExpiresAt.getTime() <= Date.now()
  ) {
    if (session?.cashierRegister !== null && session) {
      await db
        .update(ggsEmployeeSessionsTable)
        .set({ cashierRegister: null, cashierExpiresAt: null })
        .where(eq(ggsEmployeeSessionsTable.tokenHash, tokenHash));
    }
    res.status(403).json({ error: "Buka akses kasir dengan kata sandi unit." });
    return null;
  }

  return { employee, register: session.cashierRegister };
}

function serializeCashierTransaction(
  transaction: typeof ggsCashierTransactionsTable.$inferSelect,
  items: (typeof ggsCashierTransactionItemsTable.$inferSelect)[],
) {
  return {
    receiptNumber: transaction.receiptNumber,
    register: transaction.register,
    customerName: transaction.customerName,
    paymentMethod: transaction.paymentMethod,
    subtotal: transaction.subtotal,
    amountReceived: transaction.amountReceived,
    changeAmount: transaction.changeAmount,
    createdAt: transaction.createdAt.toISOString(),
    items: items.map((item) => ({
      itemType: item.itemType,
      itemId: item.itemId,
      name: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
  };
}

router.post("/ggs/employee/login", async (req, res): Promise<void> => {
  const parsed = LoginGgsEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const employeeId = normalizeEmployeeId(parsed.data.employeeId);
  const keys = attemptKeys(req, employeeId);
  if (!canAttemptLogin(keys)) {
    res.status(429).json({ error: "Terlalu banyak percobaan masuk." });
    return;
  }

  const [employee] = await db
    .select()
    .from(ggsEmployeeAccountsTable)
    .where(eq(ggsEmployeeAccountsTable.employeeId, employeeId))
    .limit(1);

  const passwordMatches = employee
    ? await verifyPassword(parsed.data.password, employee.passwordHash)
    : false;
  if (!employee || !employee.active || !passwordMatches) {
    res.status(401).json({ error: "ID karyawan atau kata sandi tidak sesuai." });
    return;
  }

  for (const key of keys) loginAttempts.delete(key);

  const token = randomBytes(32).toString("base64url");
  await db.insert(ggsEmployeeSessionsTable).values({
    tokenHash: hashSessionToken(token),
    employeeId: employee.id,
    expiresAt: new Date(Date.now() + employeeSessionMaxAgeMs),
  });
  res.cookie(employeeCookieName, token, {
    ...cookieOptions(employeeSessionMaxAgeMs),
  });

  res.json(
    LoginGgsEmployeeResponse.parse(
      serializeEmployee({
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        active: employee.active,
        createdAt: employee.createdAt,
      }),
    ),
  );
});

router.get("/ggs/employee/session", async (req, res): Promise<void> => {
  const employee = await getEmployeeForSession(req, res);
  if (!employee) {
    res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
    return;
  }
  res.json(GetGgsEmployeeSessionResponse.parse(serializeEmployee(employee)));
});

router.post("/ggs/employee/logout", async (req, res): Promise<void> => {
  const token = req.cookies?.[employeeCookieName];
  if (typeof token === "string" && token.length > 0) {
    await db
      .delete(ggsEmployeeSessionsTable)
      .where(eq(ggsEmployeeSessionsTable.tokenHash, hashSessionToken(token)));
  }
  res.clearCookie(employeeCookieName, cookieOptions());
  res.sendStatus(204);
});

router.get(
  "/ggs/employee/cashier/session",
  async (req, res): Promise<void> => {
    const employee = await getEmployeeForSession(req, res);
    if (!employee) {
      res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
      return;
    }

    const token = req.cookies?.[employeeCookieName];
    const [session] =
      typeof token === "string"
        ? await db
            .select({
              cashierRegister: ggsEmployeeSessionsTable.cashierRegister,
              cashierExpiresAt: ggsEmployeeSessionsTable.cashierExpiresAt,
            })
            .from(ggsEmployeeSessionsTable)
            .where(eq(ggsEmployeeSessionsTable.tokenHash, hashSessionToken(token)))
            .limit(1)
        : [];
    const now = Date.now();
    const active = Boolean(
      session &&
        isCashierRegister(session.cashierRegister) &&
        session.cashierExpiresAt &&
        session.cashierExpiresAt.getTime() > now,
    );

    if (session && !active && session.cashierRegister !== null) {
      await db
        .update(ggsEmployeeSessionsTable)
        .set({ cashierRegister: null, cashierExpiresAt: null })
        .where(eq(ggsEmployeeSessionsTable.tokenHash, hashSessionToken(token!)));
    }

    res.json(
      GetGgsEmployeeCashierSessionResponse.parse({
        active,
        register: active ? session?.cashierRegister : null,
        expiresAt: active ? session?.cashierExpiresAt : null,
      }),
    );
  },
);

router.post(
  "/ggs/employee/cashier/access",
  async (req, res): Promise<void> => {
    const parsed = UnlockGgsEmployeeCashierBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const employee = await getEmployeeForSession(req, res);
    if (!employee) {
      res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
      return;
    }

    const secret = process.env[cashierPasswordEnvKeys[parsed.data.register]];
    if (!secret || secret.length < 8 || secret.length > 128) {
      res.status(503).json({
        error: "Kata sandi kasir harus terdiri dari 8 sampai 128 karakter.",
      });
      return;
    }

    const attemptKeysForRegister = cashierAttemptKeys(req, parsed.data.register);
    if (!canAttemptLogin(attemptKeysForRegister)) {
      res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi nanti." });
      return;
    }
    if (!matchesConfiguredPassword(parsed.data.password, secret)) {
      res.status(403).json({ error: "Kata sandi kasir tidak sesuai." });
      return;
    }
    for (const key of attemptKeysForRegister) loginAttempts.delete(key);

    const token = req.cookies?.[employeeCookieName];
    if (typeof token !== "string") {
      res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
      return;
    }
    const tokenHash = hashSessionToken(token);
    const [employeeSession] = await db
      .select({ expiresAt: ggsEmployeeSessionsTable.expiresAt })
      .from(ggsEmployeeSessionsTable)
      .where(
        and(
          eq(ggsEmployeeSessionsTable.tokenHash, tokenHash),
          gt(ggsEmployeeSessionsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!employeeSession) {
      res.status(401).json({ error: "Sesi karyawan tidak aktif. Silakan masuk kembali." });
      return;
    }

    const expiresAt = new Date(
      Math.min(Date.now() + cashierSessionMaxAgeMs, employeeSession.expiresAt.getTime()),
    );
    const [updatedSession] = await db
      .update(ggsEmployeeSessionsTable)
      .set({
        cashierRegister: parsed.data.register,
        cashierExpiresAt: expiresAt,
      })
      .where(eq(ggsEmployeeSessionsTable.tokenHash, tokenHash))
      .returning({ tokenHash: ggsEmployeeSessionsTable.tokenHash });
    if (!updatedSession) {
      res.status(401).json({ error: "Sesi karyawan tidak aktif. Silakan masuk kembali." });
      return;
    }

    res.json(
      UnlockGgsEmployeeCashierResponse.parse({
        register: parsed.data.register,
        expiresAt,
      }),
    );
  },
);

router.post(
  "/ggs/employee/cashier/logout",
  async (req, res): Promise<void> => {
    const employee = await getEmployeeForSession(req, res);
    if (!employee) {
      res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
      return;
    }

    const token = req.cookies?.[employeeCookieName];
    if (typeof token === "string") {
      await db
        .update(ggsEmployeeSessionsTable)
        .set({ cashierRegister: null, cashierExpiresAt: null })
        .where(eq(ggsEmployeeSessionsTable.tokenHash, hashSessionToken(token)));
    }
    LogoutGgsEmployeeCashierResponse.parse(undefined);
    res.sendStatus(204);
  },
);

router.get(
  "/ggs/employee/cashier/transactions",
  async (req, res): Promise<void> => {
    const cashier = await requireActiveCashier(req, res);
    if (!cashier) return;

    const { day, startAt, endAt } = jakartaCashierDateRange();
    const conditions = and(
      eq(ggsCashierTransactionsTable.register, cashier.register),
      gte(ggsCashierTransactionsTable.createdAt, startAt),
      lt(ggsCashierTransactionsTable.createdAt, endAt),
    );
    const [totals] = await db
      .select({
        transactionCount: count(),
        totalCollected: sum(ggsCashierTransactionsTable.subtotal),
      })
      .from(ggsCashierTransactionsTable)
      .where(conditions);
    const transactions = await db
      .select()
      .from(ggsCashierTransactionsTable)
      .where(conditions)
      .orderBy(desc(ggsCashierTransactionsTable.createdAt))
      .limit(20);
    const transactionIds = transactions.map((transaction) => transaction.id);
    const items = transactionIds.length
      ? await db
          .select()
          .from(ggsCashierTransactionItemsTable)
          .where(inArray(ggsCashierTransactionItemsTable.transactionId, transactionIds))
          .orderBy(asc(ggsCashierTransactionItemsTable.id))
      : [];
    const itemsByTransaction = new Map<
      number,
      (typeof ggsCashierTransactionItemsTable.$inferSelect)[]
    >();
    for (const item of items) {
      const transactionItems = itemsByTransaction.get(item.transactionId) ?? [];
      transactionItems.push(item);
      itemsByTransaction.set(item.transactionId, transactionItems);
    }

    res.json(
      GetGgsEmployeeCashierTransactionsResponse.parse({
        register: cashier.register,
        date: day,
        totalCollected: Number(totals?.totalCollected ?? 0),
        transactionCount: Number(totals?.transactionCount ?? 0),
        transactions: transactions.map((transaction) =>
          serializeCashierTransaction(
            transaction,
            itemsByTransaction.get(transaction.id) ?? [],
          ),
        ),
      }),
    );
  },
);

router.post(
  "/ggs/employee/cashier/transactions",
  async (req, res): Promise<void> => {
    const cashier = await requireActiveCashier(req, res);
    if (!cashier) return;

    const parsed = CreateGgsEmployeeCashierTransactionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const mergedItems = new Map<
      string,
      { itemType: "service" | "product"; itemId: number; quantity: number }
    >();
    for (const item of parsed.data.items) {
      const key = `${item.itemType}:${item.itemId}`;
      const existing = mergedItems.get(key);
      const quantity = (existing?.quantity ?? 0) + item.quantity;
      if (quantity > 99) {
        res.status(400).json({ error: "Jumlah item tidak boleh lebih dari 99." });
        return;
      }
      mergedItems.set(key, {
        itemType: item.itemType,
        itemId: item.itemId,
        quantity,
      });
    }
    const requestedItems = [...mergedItems.values()];
    const serviceIds = requestedItems
      .filter((item) => item.itemType === "service")
      .map((item) => item.itemId);
    const productIds = requestedItems
      .filter((item) => item.itemType === "product")
      .map((item) => item.itemId);

    try {
      const transaction = await db.transaction(async (tx) => {
        const services = serviceIds.length
          ? await tx
              .select()
              .from(ggsServicesTable)
              .where(inArray(ggsServicesTable.id, serviceIds))
          : [];
        const products = productIds.length
          ? await tx
              .select()
              .from(ggsProductsTable)
              .where(inArray(ggsProductsTable.id, productIds))
              .for("update")
          : [];
        const servicesById = new Map(services.map((service) => [service.id, service]));
        const productsById = new Map(products.map((product) => [product.id, product]));
        const pricedItems: PricedCashierItem[] = [];

        for (const item of requestedItems) {
          if (item.itemType === "service") {
            const service = servicesById.get(item.itemId);
            if (!service || !service.active) {
              throw new CashierPaymentFailure(
                "Salah satu layanan sudah tidak tersedia. Perbarui katalog lalu coba lagi.",
                400,
              );
            }
            pricedItems.push({
              itemType: "service",
              itemId: service.id,
              name: service.name,
              quantity: item.quantity,
              unitPrice: service.price,
              lineTotal: service.price * item.quantity,
            });
          } else {
            const product = productsById.get(item.itemId);
            if (!product || !product.active) {
              throw new CashierPaymentFailure(
                "Salah satu produk sudah tidak tersedia. Perbarui katalog lalu coba lagi.",
                400,
              );
            }
            if (product.stock < item.quantity) {
              throw new CashierPaymentFailure(
                `Stok ${product.name} tidak mencukupi. Stok tersedia: ${product.stock}.`,
                409,
              );
            }
            pricedItems.push({
              itemType: "product",
              itemId: product.id,
              name: product.name,
              quantity: item.quantity,
              unitPrice: product.price,
              lineTotal: product.price * item.quantity,
            });
          }
        }

        const subtotal = pricedItems.reduce(
          (total, item) => total + item.lineTotal,
          0,
        );
        if (
          !Number.isSafeInteger(subtotal) ||
          subtotal > 2_147_483_647 ||
          parsed.data.amountReceived > 2_147_483_647
        ) {
          throw new CashierPaymentFailure(
            "Total pembayaran melewati batas yang dapat dicatat.",
            400,
          );
        }
        if (
          parsed.data.paymentMethod === "cash" &&
          parsed.data.amountReceived < subtotal
        ) {
          throw new CashierPaymentFailure(
            "Uang yang diterima belum mencukupi total pembayaran.",
            400,
          );
        }
        if (
          parsed.data.paymentMethod !== "cash" &&
          parsed.data.amountReceived !== subtotal
        ) {
          throw new CashierPaymentFailure(
            "Untuk pembayaran non-tunai, jumlah yang diterima harus sama dengan total.",
            400,
          );
        }

        for (const item of requestedItems) {
          if (item.itemType !== "product") continue;
          const product = productsById.get(item.itemId);
          if (!product) continue;
          await tx
            .update(ggsProductsTable)
            .set({ stock: product.stock - item.quantity })
            .where(eq(ggsProductsTable.id, product.id));
        }

        const receiptNumber = `GGS-${jakartaAttendanceDate().replaceAll("-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`;
        const [savedTransaction] = await tx
          .insert(ggsCashierTransactionsTable)
          .values({
            receiptNumber,
            register: cashier.register,
            employeeId: cashier.employee.id,
            employeeName: cashier.employee.name,
            customerName: parsed.data.customerName?.trim() ?? "",
            paymentMethod: parsed.data.paymentMethod,
            subtotal,
            amountReceived: parsed.data.amountReceived,
            changeAmount:
              parsed.data.paymentMethod === "cash"
                ? parsed.data.amountReceived - subtotal
                : 0,
          })
          .returning();
        if (!savedTransaction) {
          throw new Error("Cashier transaction was not saved.");
        }

        const savedItems = await tx
          .insert(ggsCashierTransactionItemsTable)
          .values(
            pricedItems.map((item) => ({
              transactionId: savedTransaction.id,
              itemType: item.itemType,
              itemId: item.itemId,
              itemName: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          )
          .returning();

        return serializeCashierTransaction(savedTransaction, savedItems);
      });

      res
        .status(201)
        .json(CreateGgsEmployeeCashierTransactionResponse.parse(transaction));
    } catch (error) {
      if (error instanceof CashierPaymentFailure) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error;
    }
  },
);

router.get("/ggs/employee/bookings", async (req, res): Promise<void> => {
  const employee = await getEmployeeForSession(req, res);
  if (!employee) {
    res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
    return;
  }

  const appointments = await db
    .select({
      id: ggsAppointmentsTable.id,
      customerName: ggsAppointmentsTable.customerName,
      phone: ggsAppointmentsTable.phone,
      serviceName: ggsAppointmentsTable.serviceName,
      appointmentDate: ggsAppointmentsTable.appointmentDate,
      appointmentTime: ggsAppointmentsTable.appointmentTime,
      notes: ggsAppointmentsTable.notes,
      status: ggsAppointmentsTable.status,
    })
    .from(ggsAppointmentsTable)
    .orderBy(
      asc(ggsAppointmentsTable.appointmentDate),
      asc(ggsAppointmentsTable.appointmentTime),
    );

  res.json(GetGgsEmployeeBookingsResponse.parse(appointments));
});

router.get(
  "/ggs/employee/attendance/today",
  async (req, res): Promise<void> => {
    const employee = await getEmployeeForSession(req, res);
    if (!employee) {
      res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
      return;
    }

    const attendanceDate = jakartaAttendanceDate();
    const [attendance] = await db
      .select()
      .from(ggsEmployeeAttendanceTable)
      .where(
        and(
          eq(ggsEmployeeAttendanceTable.employeeId, employee.id),
          eq(ggsEmployeeAttendanceTable.attendanceDate, attendanceDate),
        ),
      )
      .limit(1);

    res.json(
      GetGgsEmployeeAttendanceTodayResponse.parse(
        serializeAttendance(attendanceDate, attendance),
      ),
    );
  },
);

router.get(
  "/ggs/employee/attendance/history",
  async (req, res): Promise<void> => {
    const employee = await getEmployeeForSession(req, res);
    if (!employee) {
      res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
      return;
    }

    const attendanceDate = jakartaAttendanceDate();
    const history = await db
      .select()
      .from(ggsEmployeeAttendanceTable)
      .where(
        and(
          eq(ggsEmployeeAttendanceTable.employeeId, employee.id),
          lt(ggsEmployeeAttendanceTable.attendanceDate, attendanceDate),
        ),
      )
      .orderBy(desc(ggsEmployeeAttendanceTable.attendanceDate))
      .limit(5);

    res.json(
      GetGgsEmployeeAttendanceHistoryResponse.parse(
        history.map((attendance) =>
          serializeAttendance(attendance.attendanceDate, attendance),
        ),
      ),
    );
  },
);

router.post(
  "/ggs/employee/attendance/qr",
  async (req, res): Promise<void> => {
    const employee = await getEmployeeForSession(req, res);
    if (!employee) {
      res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
      return;
    }

    const parsed = CreateGgsEmployeeAttendanceChallengeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const locationError = attendanceLocationFailure(parsed.data);
    if (locationError) {
      res.status(403).json({ error: locationError });
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + attendanceChallengeLifetimeMs);
    const challengeToken = randomBytes(32).toString("base64url");
    await db
      .delete(ggsEmployeeAttendanceChallengesTable)
      .where(lt(ggsEmployeeAttendanceChallengesTable.expiresAt, now));
    await db.insert(ggsEmployeeAttendanceChallengesTable).values({
      tokenHash: hashSessionToken(challengeToken),
      createdByEmployeeId: employee.id,
      expiresAt,
    });

    res.status(201).json(
      CreateGgsEmployeeAttendanceChallengeResponse.parse({
        challengeToken,
        expiresAt: expiresAt.toISOString(),
      }),
    );
  },
);

router.post(
  "/ggs/employee/attendance/check-in",
  async (req, res): Promise<void> => {
    const employee = await getEmployeeForSession(req, res);
    if (!employee) {
      res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
      return;
    }

    const parsed = CheckInGgsEmployeeAttendanceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const locationError = attendanceLocationFailure(parsed.data);
    if (locationError) {
      res.status(403).json({ error: locationError });
      return;
    }

    const attendanceDate = jakartaAttendanceDate();
    const checkedInAt = new Date();
    let attendance: typeof ggsEmployeeAttendanceTable.$inferSelect;
    try {
      attendance = await db.transaction(async (tx) => {
        const [challenge] = await tx
          .select()
          .from(ggsEmployeeAttendanceChallengesTable)
          .where(
            eq(
              ggsEmployeeAttendanceChallengesTable.tokenHash,
              hashSessionToken(parsed.data.challengeToken),
            ),
          )
          .limit(1);
        if (!challenge || challenge.expiresAt.getTime() <= checkedInAt.getTime()) {
          throw new AttendanceMutationFailure(
            "QR absensi tidak valid atau sudah kedaluwarsa.",
          );
        }

        const [existingAttendance] = await tx
          .select({ id: ggsEmployeeAttendanceTable.id })
          .from(ggsEmployeeAttendanceTable)
          .where(
            and(
              eq(ggsEmployeeAttendanceTable.employeeId, employee.id),
              eq(ggsEmployeeAttendanceTable.attendanceDate, attendanceDate),
            ),
          )
          .limit(1);
        if (existingAttendance) {
          throw new AttendanceMutationFailure("Anda sudah absen masuk hari ini.");
        }

        const [challengeUse] = await tx
          .insert(ggsEmployeeAttendanceChallengeUsesTable)
          .values({ challengeId: challenge.id, employeeId: employee.id })
          .onConflictDoNothing({
            target: [
              ggsEmployeeAttendanceChallengeUsesTable.challengeId,
              ggsEmployeeAttendanceChallengeUsesTable.employeeId,
            ],
          })
          .returning({ id: ggsEmployeeAttendanceChallengeUsesTable.id });
        if (!challengeUse) {
          throw new AttendanceMutationFailure(
            "QR ini sudah digunakan untuk absensi Anda. Muat QR terbaru.",
          );
        }

        const [createdAttendance] = await tx
          .insert(ggsEmployeeAttendanceTable)
          .values({
            employeeId: employee.id,
            attendanceDate,
            checkInAt: checkedInAt,
          })
          .onConflictDoNothing({
            target: [
              ggsEmployeeAttendanceTable.employeeId,
              ggsEmployeeAttendanceTable.attendanceDate,
            ],
          })
          .returning();
        if (!createdAttendance) {
          throw new AttendanceMutationFailure("Anda sudah absen masuk hari ini.");
        }
        return createdAttendance;
      });
    } catch (error) {
      if (error instanceof AttendanceMutationFailure) {
        res.status(409).json({ error: error.message });
        return;
      }
      throw error;
    }

    res.status(201).json(
      CheckInGgsEmployeeAttendanceResponse.parse(
        serializeAttendance(attendanceDate, attendance),
      ),
    );
  },
);

router.post(
  "/ggs/employee/attendance/check-out",
  async (req, res): Promise<void> => {
    const employee = await getEmployeeForSession(req, res);
    if (!employee) {
      res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
      return;
    }

    const parsed = CheckOutGgsEmployeeAttendanceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const locationError = attendanceLocationFailure(parsed.data);
    if (locationError) {
      res.status(403).json({ error: locationError });
      return;
    }

    const attendanceDate = jakartaAttendanceDate();
    const checkedOutAt = new Date();
    let attendance: typeof ggsEmployeeAttendanceTable.$inferSelect;
    try {
      attendance = await db.transaction(async (tx) => {
        const [challenge] = await tx
          .select()
          .from(ggsEmployeeAttendanceChallengesTable)
          .where(
            eq(
              ggsEmployeeAttendanceChallengesTable.tokenHash,
              hashSessionToken(parsed.data.challengeToken),
            ),
          )
          .limit(1);
        if (!challenge || challenge.expiresAt.getTime() <= checkedOutAt.getTime()) {
          throw new AttendanceMutationFailure(
            "QR absensi tidak valid atau sudah kedaluwarsa.",
          );
        }

        const [existingAttendance] = await tx
          .select()
          .from(ggsEmployeeAttendanceTable)
          .where(
            and(
              eq(ggsEmployeeAttendanceTable.employeeId, employee.id),
              eq(ggsEmployeeAttendanceTable.attendanceDate, attendanceDate),
            ),
          )
          .limit(1);
        if (!existingAttendance) {
          throw new AttendanceMutationFailure("Absen masuk terlebih dahulu.");
        }
        if (existingAttendance.checkOutAt) {
          throw new AttendanceMutationFailure("Anda sudah absen pulang hari ini.");
        }

        const [challengeUse] = await tx
          .insert(ggsEmployeeAttendanceChallengeUsesTable)
          .values({ challengeId: challenge.id, employeeId: employee.id })
          .onConflictDoNothing({
            target: [
              ggsEmployeeAttendanceChallengeUsesTable.challengeId,
              ggsEmployeeAttendanceChallengeUsesTable.employeeId,
            ],
          })
          .returning({ id: ggsEmployeeAttendanceChallengeUsesTable.id });
        if (!challengeUse) {
          throw new AttendanceMutationFailure(
            "QR ini sudah digunakan untuk absensi Anda. Muat QR terbaru.",
          );
        }

        const [updatedAttendance] = await tx
          .update(ggsEmployeeAttendanceTable)
          .set({ checkOutAt: checkedOutAt })
          .where(
            and(
              eq(ggsEmployeeAttendanceTable.id, existingAttendance.id),
              isNull(ggsEmployeeAttendanceTable.checkOutAt),
            ),
          )
          .returning();
        if (!updatedAttendance) {
          throw new AttendanceMutationFailure(
            "Absensi sudah diperbarui. Muat ulang halaman.",
          );
        }
        return updatedAttendance;
      });
    } catch (error) {
      if (error instanceof AttendanceMutationFailure) {
        res.status(409).json({ error: error.message });
        return;
      }
      throw error;
    }

    res.json(
      CheckOutGgsEmployeeAttendanceResponse.parse(
        serializeAttendance(attendanceDate, attendance),
      ),
    );
  },
);

router.get(
  "/ggs/admin/employees",
  requireGgsOwner,
  async (_req, res): Promise<void> => {
  const employees = await db
    .select({
      id: ggsEmployeeAccountsTable.id,
      employeeId: ggsEmployeeAccountsTable.employeeId,
      name: ggsEmployeeAccountsTable.name,
      active: ggsEmployeeAccountsTable.active,
      createdAt: ggsEmployeeAccountsTable.createdAt,
    })
    .from(ggsEmployeeAccountsTable)
    .orderBy(asc(ggsEmployeeAccountsTable.name));

  res.json(
    GetGgsAdminEmployeesResponse.parse(
      employees.map((employee) =>
        serializeEmployee({
          ...employee,
          createdAt: employee.createdAt,
        }),
      ),
    ),
  );
  },
);

router.post(
  "/ggs/admin/employees",
  requireGgsOwner,
  async (req, res): Promise<void> => {
  const parsed = CreateGgsAdminEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const employeeId = normalizeEmployeeId(parsed.data.employeeId);
  const name = parsed.data.name.trim();
  if (name.length < 2) {
    res.status(400).json({ error: "Nama karyawan minimal 2 karakter." });
    return;
  }

  const [existing] = await db
    .select({ id: ggsEmployeeAccountsTable.id })
    .from(ggsEmployeeAccountsTable)
    .where(eq(ggsEmployeeAccountsTable.employeeId, employeeId))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "ID karyawan sudah digunakan." });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const [employee] = await db
    .insert(ggsEmployeeAccountsTable)
    .values({ employeeId, name, passwordHash })
    .onConflictDoNothing({
      target: ggsEmployeeAccountsTable.employeeId,
    })
    .returning({
      id: ggsEmployeeAccountsTable.id,
      employeeId: ggsEmployeeAccountsTable.employeeId,
      name: ggsEmployeeAccountsTable.name,
      active: ggsEmployeeAccountsTable.active,
      createdAt: ggsEmployeeAccountsTable.createdAt,
    });

  if (!employee) {
    res.status(409).json({ error: "ID karyawan sudah digunakan." });
    return;
  }
  res.status(201).json(
    CreateGgsAdminEmployeeResponse.parse(
      serializeEmployee({
        ...employee,
        createdAt: employee.createdAt,
      }),
    ),
  );
  },
);

router.patch(
  "/ggs/admin/employees/:id",
  requireGgsOwner,
  async (req, res): Promise<void> => {
    const params = UpdateGgsAdminEmployeeParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateGgsAdminEmployeeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const employeeId =
      parsed.data.employeeId === undefined
        ? undefined
        : normalizeEmployeeId(parsed.data.employeeId);
    const name =
      parsed.data.name === undefined ? undefined : parsed.data.name.trim();
    if (name !== undefined && name.length < 2) {
      res.status(400).json({ error: "Nama karyawan minimal 2 karakter." });
      return;
    }

    if (employeeId) {
      const [existing] = await db
        .select({ id: ggsEmployeeAccountsTable.id })
        .from(ggsEmployeeAccountsTable)
        .where(eq(ggsEmployeeAccountsTable.employeeId, employeeId))
        .limit(1);
      if (existing && existing.id !== params.data.id) {
        res.status(409).json({ error: "ID karyawan sudah digunakan." });
        return;
      }
    }

    const updates: Partial<typeof ggsEmployeeAccountsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (employeeId !== undefined) updates.employeeId = employeeId;
    if (name !== undefined) updates.name = name;
    if (parsed.data.active !== undefined) updates.active = parsed.data.active;
    if (parsed.data.password !== undefined) {
      updates.passwordHash = await hashPassword(parsed.data.password);
    }

    const [employee] = await db
      .update(ggsEmployeeAccountsTable)
      .set(updates)
      .where(eq(ggsEmployeeAccountsTable.id, params.data.id))
      .returning({
        id: ggsEmployeeAccountsTable.id,
        employeeId: ggsEmployeeAccountsTable.employeeId,
        name: ggsEmployeeAccountsTable.name,
        active: ggsEmployeeAccountsTable.active,
        createdAt: ggsEmployeeAccountsTable.createdAt,
      });
    if (!employee) {
      res.status(404).json({ error: "Akun karyawan tidak ditemukan." });
      return;
    }

    if (parsed.data.active === false || parsed.data.password !== undefined) {
      await db
        .delete(ggsEmployeeSessionsTable)
        .where(eq(ggsEmployeeSessionsTable.employeeId, employee.id));
    }

    res.json(
      UpdateGgsAdminEmployeeResponse.parse(
        serializeEmployee({
          ...employee,
          createdAt: employee.createdAt,
        }),
      ),
    );
  },
);

export default router;
