import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  or,
} from "drizzle-orm";
import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import {
  ApplyGgsAdminOwnerCorrectionBody,
  ApplyGgsAdminOwnerCorrectionParams,
  ApplyGgsAdminOwnerCorrectionResponse,
  ApproveGgsAdminOwnerCorrectionParams,
  ApproveGgsAdminOwnerCorrectionResponse,
  CreateGgsAdminOwnerCorrectionBody,
  CreateGgsAdminOwnerCorrectionResponse,
  CreateGgsAdminOwnerRecordBody,
  CreateGgsAdminOwnerRecordResponse,
  DeleteGgsAdminOwnerRecordParams,
  GetGgsAdminOwnerCenterQueryParams,
  GetGgsAdminOwnerCenterResponse,
  GetGgsAdminOwnerCenterBackupResponse,
  RejectGgsAdminOwnerCorrectionBody,
  RejectGgsAdminOwnerCorrectionParams,
  RejectGgsAdminOwnerCorrectionResponse,
  RestoreGgsAdminOwnerCenterBackupBody,
  RestoreGgsAdminOwnerCenterBackupResponse,
  UpdateGgsAdminOwnerRecordBody,
  UpdateGgsAdminOwnerRecordParams,
  UpdateGgsAdminOwnerRecordResponse,
} from "@workspace/api-zod";
import {
  db,
  ggsAppointmentsTable,
  ggsCashierTransactionItemsTable,
  ggsCashierTransactionsTable,
  ggsEmployeeAccountsTable,
  ggsEmployeeAttendanceTable,
  ggsOwnerRecordsTable,
  ggsOwnerTransactionCorrectionsTable,
  ggsProductStockMovementsTable,
  ggsProductsTable,
} from "@workspace/db";
import { requireGgsOwner } from "../middlewares/requireGgsOwner";

const router: IRouter = Router();

const ownerRecordTypes = [
  "branch",
  "customer",
  "finance",
  "employee_profile",
  "payroll",
  "settings",
] as const;

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const validDateOnly = (value: string) =>
  dateOnlySchema.safeParse(value).success &&
  !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()) &&
  new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;

const payloadSchemas = {
  branch: z.object({
    name: z.string().trim().min(2).max(100),
    address: z.string().max(300).optional().default(""),
    phone: z.string().max(40).optional().default(""),
    active: z.boolean().optional().default(true),
  }),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(40),
    email: z.string().trim().email().max(254).optional().or(z.literal("")),
    dateOfBirth: dateOnlySchema.optional().or(z.literal("")),
    occupation: z.string().max(120).optional().default(""),
    social: z.string().max(200).optional().default(""),
    membershipType: z.string().max(100).optional().default(""),
    memberId: z.string().max(100).optional().default(""),
    memberExpiry: dateOnlySchema.optional().or(z.literal("")),
    memberBenefit: z.string().max(1000).optional().default(""),
    points: z.number().int().min(0).max(1_000_000).optional().default(0),
    notes: z.string().max(1200).optional().default(""),
    active: z.boolean().optional().default(true),
  }),
  finance: z.object({
    type: z.enum(["expense", "stock_purchase", "advance", "deduction"]),
    date: dateOnlySchema,
    title: z.string().trim().min(2).max(180),
    amount: z.number().int().min(0).max(2_000_000_000),
    employeeId: z.string().max(100).optional().default(""),
    quantity: z.number().int().min(0).max(1_000_000).optional().default(0),
    unitCost: z.number().int().min(0).max(2_000_000_000).optional().default(0),
    note: z.string().max(1200).optional().default(""),
  }),
  employee_profile: z.object({
    branchId: z.string().max(100).optional().default(""),
    jobTitle: z.string().max(100).optional().default(""),
    salaryMode: z.enum(["commission_only", "salary_plus_commission", "fixed_salary"]).default("commission_only"),
    baseSalary: z.number().int().min(0).max(2_000_000_000).default(0),
    commissionService: z.number().min(0).max(100).default(40),
    commissionTreatment: z.number().min(0).max(100).default(30),
    commissionBeauty: z.number().min(0).max(100).default(10),
    mealPerDay: z.number().int().min(0).max(2_000_000).default(30_000),
    standardStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("09:00"),
    bankName: z.string().max(100).optional().default(""),
    bankAccountName: z.string().max(120).optional().default(""),
    bankAccountNumber: z.string().max(80).optional().default(""),
    active: z.boolean().optional().default(true),
  }),
  payroll: z.object({
    employeeId: z.string().min(1).max(100),
    period: z.string().regex(/^\d{4}-\d{2}$/),
    jobTitle: z.string().max(100).optional().default(""),
    baseSalary: z.number().int().min(0).max(2_000_000_000),
    commissionService: z.number().int().min(0).max(2_000_000_000),
    commissionTreatment: z.number().int().min(0).max(2_000_000_000),
    commissionBeauty: z.number().int().min(0).max(2_000_000_000),
    meal: z.number().int().min(0).max(2_000_000_000),
    deductions: z.number().int().min(0).max(2_000_000_000),
    advances: z.number().int().min(0).max(2_000_000_000),
    lateDeduction: z.number().int().min(0).max(2_000_000_000),
    gross: z.number().int().min(0).max(2_000_000_000),
    net: z.number().int().min(0).max(2_000_000_000),
  }),
  settings: z.object({
    receipt: z.object({
      businessName: z.string().max(120).optional().default("GGS Hair Studio"),
      branchLabel: z.string().max(120).optional().default(""),
      tagline: z.string().max(200).optional().default(""),
      receiptSize: z.enum(["58mm", "80mm"]).optional().default("80mm"),
      footer: z.string().max(500).optional().default(""),
      showFooter: z.boolean().optional().default(true),
      showMessage: z.boolean().optional().default(true),
      receiptMessages: z.array(z.string().max(180)).max(12).optional().default([]),
      showSocial: z.boolean().optional().default(false),
      socialText: z.string().max(180).optional().default(""),
      showQr: z.boolean().optional().default(false),
      qrText: z.string().max(300).optional().default(""),
      logoUrl: z.string().max(1000).optional().default(""),
    }).optional(),
    social: z.object({
      instagram: z.string().max(300).optional().default(""),
      facebook: z.string().max(300).optional().default(""),
      tiktok: z.string().max(300).optional().default(""),
      whatsapp: z.string().max(60).optional().default(""),
      bookingUrl: z.string().max(1000).optional().default(""),
    }).optional(),
    reminders: z.object({
      followUp: z.string().max(1000).optional().default("Halo {nama}, terima kasih sudah berkunjung ke GGS Hair Studio. Kami siap menyambut Anda kembali."),
      birthday: z.string().max(1000).optional().default("Selamat ulang tahun, {nama}! Semoga hari Anda menyenangkan. Salam hangat dari GGS Hair Studio."),
    }).optional(),
    kpi: z.object({
      attitudeWeight: z.number().int().min(0).max(100).optional().default(20),
      attendanceWeight: z.number().int().min(0).max(100).optional().default(30),
      productivityWeight: z.number().int().min(0).max(100).optional().default(50),
      targetTransactions: z.number().int().min(1).max(10000).optional().default(165),
      productTreatmentTarget: z.number().int().min(0).max(10000).optional().default(15),
      lateTier1Minutes: z.number().int().min(1).max(240).optional().default(30),
      lateTier2Minutes: z.number().int().min(1).max(240).optional().default(60),
      lateTier3Minutes: z.number().int().min(1).max(240).optional().default(90),
      lateTier1Deduction: z.number().int().min(0).max(2_000_000).optional().default(10000),
      lateTier2Deduction: z.number().int().min(0).max(2_000_000).optional().default(15000),
      lateTier3Deduction: z.number().int().min(0).max(2_000_000).optional().default(20000),
      lateTier4Deduction: z.number().int().min(0).max(2_000_000).optional().default(30000),
    }).optional(),
  }),
} satisfies Record<(typeof ownerRecordTypes)[number], z.ZodType>;

type OwnerRecordType = (typeof ownerRecordTypes)[number];

function jakartaDateStart(date: string) {
  return new Date(`${date}T00:00:00+07:00`);
}

function asDateString(value: string | Date | undefined | null) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value || null;
}

function serializeOwnerRecord(
  record: typeof ggsOwnerRecordsTable.$inferSelect,
) {
  return {
    ...record,
    recordDate: record.recordDate ?? null,
    branchId: record.branchId ?? null,
    employeeId: record.employeeId ?? null,
    data: record.data ?? {},
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function serializeCorrection(
  correction: typeof ggsOwnerTransactionCorrectionsTable.$inferSelect & {
    receiptNumber: string;
  },
) {
  return {
    id: correction.id,
    transactionId: correction.transactionId,
    receiptNumber: correction.receiptNumber,
    status: correction.status,
    reason: correction.reason,
    proposedCustomerName: correction.proposedCustomerName,
    proposedEmployeeName: correction.proposedEmployeeName,
    proposedDiscountAmount: correction.proposedDiscountAmount,
    proposedAmountReceived: correction.proposedAmountReceived,
    proposedPaymentMethod: correction.proposedPaymentMethod,
    rejectReason: correction.rejectReason,
    beforeSnapshot: correction.beforeSnapshot,
    afterSnapshot: correction.afterSnapshot,
    createdAt: correction.createdAt.toISOString(),
    approvedAt: correction.approvedAt?.toISOString() ?? null,
    rejectedAt: correction.rejectedAt?.toISOString() ?? null,
    appliedAt: correction.appliedAt?.toISOString() ?? null,
  };
}

function validOwnerPayload(
  type: OwnerRecordType,
  data: unknown,
): { success: true; data: Record<string, unknown> } | { success: false; error: string } {
  const parsed = payloadSchemas[type].safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((issue) => issue.message).join("; ") };
  }
  if (type === "finance") {
    const value = parsed.data as z.infer<typeof payloadSchemas.finance>;
    if (!validDateOnly(value.date)) return { success: false, error: "Tanggal keuangan tidak valid." };
    if (value.type === "advance" && !value.employeeId.trim()) {
      return { success: false, error: "Kasbon harus dikaitkan dengan karyawan." };
    }
  }
  if (type === "customer") {
    const value = parsed.data as z.infer<typeof payloadSchemas.customer>;
    if (value.dateOfBirth && !validDateOnly(value.dateOfBirth)) {
      return { success: false, error: "Tanggal lahir tidak valid." };
    }
    if (value.memberExpiry && !validDateOnly(value.memberExpiry)) {
      return { success: false, error: "Tanggal akhir member tidak valid." };
    }
  }
  return { success: true, data: parsed.data as Record<string, unknown> };
}

function normalizeRecordInput(input: {
  recordType: OwnerRecordType;
  recordKey: string;
  branchId?: string;
  employeeId?: string;
  recordDate?: string | Date;
  recordPeriod?: string;
  status?: string;
  data: Record<string, unknown>;
}) {
  const payload = validOwnerPayload(input.recordType, input.data);
  if (!payload.success) return payload;
  const recordDate = asDateString(input.recordDate);
  if (recordDate && !validDateOnly(recordDate)) {
    return { success: false as const, error: "Tanggal catatan tidak valid." };
  }
  const expectedPeriod =
    input.recordType === "payroll" && typeof payload.data.period === "string"
      ? payload.data.period
      : input.recordPeriod;
  return {
    success: true as const,
    values: {
      recordType: input.recordType,
      recordKey: input.recordKey.trim(),
      branchId: input.branchId?.trim() || null,
      employeeId:
        input.employeeId?.trim() ||
        (typeof payload.data.employeeId === "string" ? payload.data.employeeId : null),
      recordDate:
        recordDate ??
        (typeof payload.data.date === "string" ? payload.data.date : null),
      recordPeriod: expectedPeriod || null,
      status:
        input.status?.trim() ||
        (input.recordType === "payroll" ? "draft" : "active"),
      data: payload.data,
      updatedAt: new Date(),
    },
  };
}

async function seedOwnerBranches() {
  const [existing] = await db
    .select({ id: ggsOwnerRecordsTable.id })
    .from(ggsOwnerRecordsTable)
    .where(eq(ggsOwnerRecordsTable.recordType, "branch"))
    .limit(1);
  if (existing) return;

  const branches = [
    { recordKey: "ggs-garut-1", name: "GGS Garut 1" },
    { recordKey: "ggs-garut-2", name: "GGS Garut 2" },
    { recordKey: "ggs-bandung", name: "GGS Bandung" },
  ];
  await db
    .insert(ggsOwnerRecordsTable)
    .values(
      branches.map(({ recordKey, name }) => ({
        recordType: "branch",
        recordKey,
        status: "active",
        data: { name, address: "", phone: "", active: true },
      })),
    )
    .onConflictDoNothing();
}

router.get(
  "/ggs/admin/owner-center",
  requireGgsOwner,
  async (req, res): Promise<void> => {
    const parsed = GetGgsAdminOwnerCenterQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const fromDate = asDateString(parsed.data.fromDate as string | Date);
    const toDate = asDateString(parsed.data.toDate as string | Date);
    if (!fromDate || !toDate || !validDateOnly(fromDate) || !validDateOnly(toDate) || fromDate > toDate) {
      res.status(400).json({ error: "Rentang tanggal laporan tidak valid." });
      return;
    }

    await seedOwnerBranches();
    const rangeStart = jakartaDateStart(fromDate);
    const rangeEnd = new Date(jakartaDateStart(toDate).getTime() + 24 * 60 * 60 * 1000);
    const transactionRows = await db
      .select()
      .from(ggsCashierTransactionsTable)
      .where(
        and(
          gte(ggsCashierTransactionsTable.createdAt, rangeStart),
          lt(ggsCashierTransactionsTable.createdAt, rangeEnd),
        ),
      )
      .orderBy(desc(ggsCashierTransactionsTable.createdAt), desc(ggsCashierTransactionsTable.id))
      .limit(500);
    const transactionIds = transactionRows.map((transaction) => transaction.id);
    const itemRows = transactionIds.length
      ? await db
          .select()
          .from(ggsCashierTransactionItemsTable)
          .where(inArray(ggsCashierTransactionItemsTable.transactionId, transactionIds))
          .orderBy(asc(ggsCashierTransactionItemsTable.id))
      : [];
    const itemsByTransaction = new Map<number, typeof itemRows>();
    for (const item of itemRows) {
      const existing = itemsByTransaction.get(item.transactionId) ?? [];
      existing.push(item);
      itemsByTransaction.set(item.transactionId, existing);
    }

    const attendanceRows = await db
      .select({
        id: ggsEmployeeAttendanceTable.id,
        employeeId: ggsEmployeeAccountsTable.id,
        employeeCode: ggsEmployeeAccountsTable.employeeId,
        employeeName: ggsEmployeeAccountsTable.name,
        attendanceDate: ggsEmployeeAttendanceTable.attendanceDate,
        checkInAt: ggsEmployeeAttendanceTable.checkInAt,
        checkOutAt: ggsEmployeeAttendanceTable.checkOutAt,
      })
      .from(ggsEmployeeAttendanceTable)
      .innerJoin(
        ggsEmployeeAccountsTable,
        eq(ggsEmployeeAttendanceTable.employeeId, ggsEmployeeAccountsTable.id),
      )
      .where(
        and(
          gte(ggsEmployeeAttendanceTable.attendanceDate, fromDate),
          lte(ggsEmployeeAttendanceTable.attendanceDate, toDate),
        ),
      )
      .orderBy(desc(ggsEmployeeAttendanceTable.attendanceDate), asc(ggsEmployeeAccountsTable.name))
      .limit(1000);

    const stockMovements = await db
      .select()
      .from(ggsProductStockMovementsTable)
      .where(
        and(
          gte(ggsProductStockMovementsTable.createdAt, rangeStart),
          lt(ggsProductStockMovementsTable.createdAt, rangeEnd),
        ),
      )
      .orderBy(desc(ggsProductStockMovementsTable.createdAt))
      .limit(500);
    const ownerRecordRows = await db
      .select()
      .from(ggsOwnerRecordsTable)
      .orderBy(desc(ggsOwnerRecordsTable.updatedAt))
      .limit(5000);
    const scopedRecords = ownerRecordRows.filter((record) => {
      if (record.recordType === "finance" && record.recordDate) {
        return record.recordDate >= fromDate && record.recordDate <= toDate;
      }
      if (record.recordType === "payroll" && record.recordPeriod) {
        return record.recordPeriod >= fromDate.slice(0, 7) && record.recordPeriod <= toDate.slice(0, 7);
      }
      return true;
    });
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
    const products = await db
      .select({
        id: ggsProductsTable.id,
        name: ggsProductsTable.name,
        category: ggsProductsTable.category,
        description: ggsProductsTable.description,
        price: ggsProductsTable.price,
        stock: ggsProductsTable.stock,
        active: ggsProductsTable.active,
        imageUrl: ggsProductsTable.imageUrl,
        sortOrder: ggsProductsTable.sortOrder,
        createdAt: ggsProductsTable.createdAt,
      })
      .from(ggsProductsTable)
      .orderBy(asc(ggsProductsTable.sortOrder), asc(ggsProductsTable.id));
    const appointmentRows = await db
      .select({ status: ggsAppointmentsTable.status })
      .from(ggsAppointmentsTable)
      .where(
        and(
          gte(ggsAppointmentsTable.appointmentDate, fromDate),
          lte(ggsAppointmentsTable.appointmentDate, toDate),
        ),
      );
    const corrections = await db
      .select({
        correction: ggsOwnerTransactionCorrectionsTable,
        receiptNumber: ggsCashierTransactionsTable.receiptNumber,
      })
      .from(ggsOwnerTransactionCorrectionsTable)
      .innerJoin(
        ggsCashierTransactionsTable,
        eq(
          ggsOwnerTransactionCorrectionsTable.transactionId,
          ggsCashierTransactionsTable.id,
        ),
      )
      .orderBy(desc(ggsOwnerTransactionCorrectionsTable.createdAt))
      .limit(100);

    const response = GetGgsAdminOwnerCenterResponse.parse({
      fromDate,
      toDate,
      records: scopedRecords.map(serializeOwnerRecord),
      employees: employees.map((employee) => ({
        ...employee,
        createdAt: employee.createdAt.toISOString(),
      })),
      transactions: transactionRows.map((transaction) => ({
        ...transaction,
        cancellationReason: transaction.cancellationReason ?? null,
        voucherCode: transaction.voucherCode ?? null,
        total:
          transaction.subtotal -
          transaction.discountAmount +
          transaction.taxAmount,
        createdAt: transaction.createdAt.toISOString(),
        items: (itemsByTransaction.get(transaction.id) ?? []).map((item) => item),
      })),
      attendance: attendanceRows.map((attendance) => ({
        ...attendance,
        checkInAt: attendance.checkInAt.toISOString(),
        checkOutAt: attendance.checkOutAt?.toISOString() ?? null,
      })),
      stockMovements: stockMovements.map((movement) => ({
        ...movement,
        createdAt: movement.createdAt.toISOString(),
      })),
      appointments: {
        total: appointmentRows.length,
        completed: appointmentRows.filter((appointment) => appointment.status === "completed").length,
        pending: appointmentRows.filter((appointment) => appointment.status === "pending").length,
        cancelled: appointmentRows.filter((appointment) => appointment.status === "cancelled").length,
      },
      products: products.map((product) => ({
        ...product,
        imageUrl: product.imageUrl ?? null,
        createdAt: product.createdAt.toISOString(),
      })),
      correctionRequests: corrections.map(({ correction, receiptNumber }) =>
        serializeCorrection({ ...correction, receiptNumber }),
      ),
    });
    res.json(response);
  },
);

router.post(
  "/ggs/admin/owner-center/records",
  requireGgsOwner,
  async (req, res): Promise<void> => {
    const parsed = CreateGgsAdminOwnerRecordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const normalized = normalizeRecordInput(parsed.data);
    if (!normalized.success) {
      res.status(400).json({ error: normalized.error });
      return;
    }
    const [existing] = await db
      .select({ id: ggsOwnerRecordsTable.id })
      .from(ggsOwnerRecordsTable)
      .where(
        and(
          eq(ggsOwnerRecordsTable.recordType, normalized.values.recordType),
          eq(ggsOwnerRecordsTable.recordKey, normalized.values.recordKey),
        ),
      )
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "Kunci data sudah digunakan." });
      return;
    }
    const [created] = await db
      .insert(ggsOwnerRecordsTable)
      .values(normalized.values)
      .returning();
    req.log.info({ category: created.recordType }, "GGS owner record created");
    res.status(201).json(
      CreateGgsAdminOwnerRecordResponse.parse(serializeOwnerRecord(created)),
    );
  },
);

router.patch(
  "/ggs/admin/owner-center/records/:id",
  requireGgsOwner,
  async (req, res): Promise<void> => {
    const params = UpdateGgsAdminOwnerRecordParams.safeParse(req.params);
    const parsed = UpdateGgsAdminOwnerRecordBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: params.error?.message ?? parsed.error?.message });
      return;
    }
    const [current] = await db
      .select()
      .from(ggsOwnerRecordsTable)
      .where(eq(ggsOwnerRecordsTable.id, params.data.id))
      .limit(1);
    if (!current) {
      res.status(404).json({ error: "Data pemilik tidak ditemukan." });
      return;
    }
    if (current.recordType === "finance" && current.status === "archived") {
      res.status(409).json({ error: "Catatan keuangan yang diarsipkan tidak dapat diubah." });
      return;
    }
    const nextData = parsed.data.data ?? current.data;
    const validation = validOwnerPayload(
      current.recordType as OwnerRecordType,
      nextData,
    );
    if (!validation.success) {
      res.status(400).json({ error: validation.error });
      return;
    }
    const recordKey = parsed.data.recordKey?.trim() ?? current.recordKey;
    const [duplicate] = await db
      .select({ id: ggsOwnerRecordsTable.id })
      .from(ggsOwnerRecordsTable)
      .where(
        and(
          eq(ggsOwnerRecordsTable.recordType, current.recordType),
          eq(ggsOwnerRecordsTable.recordKey, recordKey),
        ),
      )
      .limit(1);
    if (duplicate && duplicate.id !== current.id) {
      res.status(409).json({ error: "Kunci data sudah digunakan." });
      return;
    }
    const recordDate = asDateString(parsed.data.recordDate as string | Date | undefined);
    if (recordDate && !validDateOnly(recordDate)) {
      res.status(400).json({ error: "Tanggal catatan tidak valid." });
      return;
    }
    const [updated] = await db
      .update(ggsOwnerRecordsTable)
      .set({
        recordKey,
        branchId:
          parsed.data.branchId === undefined
            ? current.branchId
            : parsed.data.branchId.trim() || null,
        employeeId:
          parsed.data.employeeId === undefined
            ? current.employeeId
            : parsed.data.employeeId.trim() || null,
        recordDate: parsed.data.recordDate === undefined ? current.recordDate : recordDate,
        recordPeriod: parsed.data.recordPeriod ?? current.recordPeriod,
        status: parsed.data.status ?? current.status,
        data: validation.data,
        updatedAt: new Date(),
      })
      .where(eq(ggsOwnerRecordsTable.id, current.id))
      .returning();
    req.log.info({ category: updated.recordType }, "GGS owner record updated");
    res.json(UpdateGgsAdminOwnerRecordResponse.parse(serializeOwnerRecord(updated)));
  },
);

router.delete(
  "/ggs/admin/owner-center/records/:id",
  requireGgsOwner,
  async (req, res): Promise<void> => {
    const parsed = DeleteGgsAdminOwnerRecordParams.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [record] = await db
      .select()
      .from(ggsOwnerRecordsTable)
      .where(eq(ggsOwnerRecordsTable.id, parsed.data.id))
      .limit(1);
    if (!record) {
      res.status(404).json({ error: "Data pemilik tidak ditemukan." });
      return;
    }
    const archivedStatus =
      record.recordType === "finance" || record.recordType === "payroll"
        ? "void"
        : "archived";
    await db
      .update(ggsOwnerRecordsTable)
      .set({ status: archivedStatus, updatedAt: new Date() })
      .where(eq(ggsOwnerRecordsTable.id, record.id));
    req.log.info({ category: record.recordType }, "GGS owner record archived");
    res.status(204).end();
  },
);

router.post(
  "/ggs/admin/owner-center/corrections",
  requireGgsOwner,
  async (req, res): Promise<void> => {
    const parsed = CreateGgsAdminOwnerCorrectionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const latest = await db
      .select({ id: ggsCashierTransactionsTable.id })
      .from(ggsCashierTransactionsTable)
      .orderBy(desc(ggsCashierTransactionsTable.createdAt), desc(ggsCashierTransactionsTable.id))
      .limit(3);
    if (!latest.some((row) => row.id === parsed.data.transactionId)) {
      res.status(404).json({ error: "Koreksi hanya dapat diajukan untuk tiga transaksi terbaru." });
      return;
    }
    const [transaction] = await db
      .select()
      .from(ggsCashierTransactionsTable)
      .where(eq(ggsCashierTransactionsTable.id, parsed.data.transactionId))
      .limit(1);
    if (!transaction) {
      res.status(404).json({ error: "Transaksi tidak ditemukan." });
      return;
    }
    if (transaction.status !== "completed") {
      res.status(409).json({ error: "Transaksi yang dibatalkan tidak dapat dikoreksi." });
      return;
    }
    if (
      parsed.data.proposedDiscountAmount > transaction.subtotal ||
      parsed.data.proposedAmountReceived <
        transaction.subtotal -
          parsed.data.proposedDiscountAmount +
          transaction.taxAmount
    ) {
      res.status(400).json({ error: "Diskon atau jumlah pembayaran tidak sesuai dengan total transaksi." });
      return;
    }
    const [openRequest] = await db
      .select({ id: ggsOwnerTransactionCorrectionsTable.id })
      .from(ggsOwnerTransactionCorrectionsTable)
      .where(
        and(
          eq(ggsOwnerTransactionCorrectionsTable.transactionId, transaction.id),
          or(
            eq(ggsOwnerTransactionCorrectionsTable.status, "pending"),
            eq(ggsOwnerTransactionCorrectionsTable.status, "approved"),
          ),
        ),
      )
      .limit(1);
    if (openRequest) {
      res.status(409).json({ error: "Transaksi ini sudah memiliki pengajuan koreksi aktif." });
      return;
    }
    const [created] = await db
      .insert(ggsOwnerTransactionCorrectionsTable)
      .values({
        transactionId: transaction.id,
        reason: parsed.data.reason.trim(),
        proposedCustomerName: parsed.data.proposedCustomerName.trim(),
        proposedEmployeeName: parsed.data.proposedEmployeeName.trim(),
        proposedDiscountAmount: parsed.data.proposedDiscountAmount,
        proposedAmountReceived: parsed.data.proposedAmountReceived,
        proposedPaymentMethod: parsed.data.proposedPaymentMethod.trim(),
      })
      .returning();
    req.log.info({ transactionId: transaction.id }, "GGS transaction correction requested");
    res.status(201).json(
      CreateGgsAdminOwnerCorrectionResponse.parse({
        ...serializeCorrection({ ...created, receiptNumber: transaction.receiptNumber }),
      }),
    );
  },
);

router.post(
  "/ggs/admin/owner-center/corrections/:id/approve",
  requireGgsOwner,
  async (req, res): Promise<void> => {
    const params = ApproveGgsAdminOwnerCorrectionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const code = randomInt(100000, 1_000_000).toString();
    const approvalCodeHash = createHash("sha256").update(code).digest("hex");
    const [approved] = await db
      .update(ggsOwnerTransactionCorrectionsTable)
      .set({
        status: "approved",
        approvalCodeHash,
        approvedAt: new Date(),
        rejectReason: null,
      })
      .where(
        and(
          eq(ggsOwnerTransactionCorrectionsTable.id, params.data.id),
          eq(ggsOwnerTransactionCorrectionsTable.status, "pending"),
        ),
      )
      .returning();
    if (!approved) {
      const [existing] = await db
        .select()
        .from(ggsOwnerTransactionCorrectionsTable)
        .where(eq(ggsOwnerTransactionCorrectionsTable.id, params.data.id))
        .limit(1);
      if (!existing) {
        res.status(404).json({ error: "Pengajuan koreksi tidak ditemukan." });
        return;
      }
      res.status(409).json({ error: "Pengajuan koreksi tidak lagi menunggu persetujuan." });
      return;
    }
    const [transaction] = await db
      .select({ receiptNumber: ggsCashierTransactionsTable.receiptNumber })
      .from(ggsCashierTransactionsTable)
      .where(eq(ggsCashierTransactionsTable.id, approved.transactionId))
      .limit(1);
    if (!transaction) {
      res.status(404).json({ error: "Transaksi tidak ditemukan." });
      return;
    }
    req.log.info({ transactionId: approved.transactionId }, "GGS transaction correction approved");
    res.json(
      ApproveGgsAdminOwnerCorrectionResponse.parse({
        correction: serializeCorrection({
          ...approved,
          receiptNumber: transaction.receiptNumber,
        }),
        approvalCode: code,
      }),
    );
  },
);

router.post(
  "/ggs/admin/owner-center/corrections/:id/reject",
  requireGgsOwner,
  async (req, res): Promise<void> => {
    const params = RejectGgsAdminOwnerCorrectionParams.safeParse(req.params);
    const parsed = RejectGgsAdminOwnerCorrectionBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: params.error?.message ?? parsed.error?.message });
      return;
    }
    const [rejected] = await db
      .update(ggsOwnerTransactionCorrectionsTable)
      .set({
        status: "rejected",
        rejectReason: parsed.data.reason.trim(),
        approvalCodeHash: null,
        rejectedAt: new Date(),
      })
      .where(
        and(
          eq(ggsOwnerTransactionCorrectionsTable.id, params.data.id),
          eq(ggsOwnerTransactionCorrectionsTable.status, "pending"),
        ),
      )
      .returning();
    if (!rejected) {
      const [existing] = await db
        .select()
        .from(ggsOwnerTransactionCorrectionsTable)
        .where(eq(ggsOwnerTransactionCorrectionsTable.id, params.data.id))
        .limit(1);
      if (!existing) {
        res.status(404).json({ error: "Pengajuan koreksi tidak ditemukan." });
        return;
      }
      res.status(409).json({ error: "Pengajuan koreksi tidak lagi menunggu persetujuan." });
      return;
    }
    const [transaction] = await db
      .select({ receiptNumber: ggsCashierTransactionsTable.receiptNumber })
      .from(ggsCashierTransactionsTable)
      .where(eq(ggsCashierTransactionsTable.id, rejected.transactionId))
      .limit(1);
    if (!transaction) {
      res.status(404).json({ error: "Transaksi tidak ditemukan." });
      return;
    }
    req.log.info({ transactionId: rejected.transactionId }, "GGS transaction correction rejected");
    res.json(
      RejectGgsAdminOwnerCorrectionResponse.parse({
        ...serializeCorrection({ ...rejected, receiptNumber: transaction.receiptNumber }),
      }),
    );
  },
);

router.post(
  "/ggs/admin/owner-center/corrections/:id/apply",
  requireGgsOwner,
  async (req, res): Promise<void> => {
    const params = ApplyGgsAdminOwnerCorrectionParams.safeParse(req.params);
    const parsed = ApplyGgsAdminOwnerCorrectionBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: params.error?.message ?? parsed.error?.message });
      return;
    }
    const suppliedHash = createHash("sha256")
      .update(parsed.data.approvalCode.trim())
      .digest();
    const result = await db.transaction(async (tx) => {
      const [correction] = await tx
        .select()
        .from(ggsOwnerTransactionCorrectionsTable)
        .where(eq(ggsOwnerTransactionCorrectionsTable.id, params.data.id))
        .limit(1)
        .for("update");
      if (!correction) return { kind: "missing" as const };
      if (correction.status !== "approved" || !correction.approvalCodeHash) {
        return { kind: "not-approved" as const };
      }
      const expectedHash = Buffer.from(correction.approvalCodeHash, "hex");
      if (
        expectedHash.length !== suppliedHash.length ||
        !timingSafeEqual(expectedHash, suppliedHash)
      ) {
        return { kind: "bad-code" as const };
      }
      const [transaction] = await tx
        .select()
        .from(ggsCashierTransactionsTable)
        .where(eq(ggsCashierTransactionsTable.id, correction.transactionId))
        .limit(1);
      if (!transaction) return { kind: "missing-transaction" as const };
      const total =
        transaction.subtotal -
        correction.proposedDiscountAmount +
        transaction.taxAmount;
      if (correction.proposedDiscountAmount > transaction.subtotal || correction.proposedAmountReceived < total) {
        return { kind: "invalid-proposal" as const };
      }
      const beforeSnapshot = {
        customerName: transaction.customerName,
        employeeName: transaction.employeeName,
        discountAmount: transaction.discountAmount,
        amountReceived: transaction.amountReceived,
        paymentMethod: transaction.paymentMethod,
        changeAmount: transaction.changeAmount,
      };
      const changeAmount = correction.proposedAmountReceived - total;
      await tx
        .update(ggsCashierTransactionsTable)
        .set({
          customerName: correction.proposedCustomerName,
          employeeName: correction.proposedEmployeeName,
          discountAmount: correction.proposedDiscountAmount,
          amountReceived: correction.proposedAmountReceived,
          paymentMethod: correction.proposedPaymentMethod,
          changeAmount,
        })
        .where(eq(ggsCashierTransactionsTable.id, transaction.id));
      const afterSnapshot = {
        customerName: correction.proposedCustomerName,
        employeeName: correction.proposedEmployeeName,
        discountAmount: correction.proposedDiscountAmount,
        amountReceived: correction.proposedAmountReceived,
        paymentMethod: correction.proposedPaymentMethod,
        changeAmount,
      };
      const [applied] = await tx
        .update(ggsOwnerTransactionCorrectionsTable)
        .set({
          status: "applied",
          approvalCodeHash: null,
          beforeSnapshot,
          afterSnapshot,
          appliedAt: new Date(),
        })
        .where(
          and(
            eq(ggsOwnerTransactionCorrectionsTable.id, correction.id),
            eq(ggsOwnerTransactionCorrectionsTable.status, "approved"),
          ),
        )
        .returning();
      if (!applied) return { kind: "not-approved" as const };
      return {
        kind: "applied" as const,
        correction: { ...applied, receiptNumber: transaction.receiptNumber },
      };
    });
    if (result.kind === "missing" || result.kind === "missing-transaction") {
      res.status(404).json({ error: "Pengajuan atau transaksi tidak ditemukan." });
      return;
    }
    if (result.kind === "not-approved") {
      res.status(409).json({ error: "Persetujuan tidak tersedia atau sudah digunakan." });
      return;
    }
    if (result.kind === "invalid-proposal") {
      res.status(409).json({ error: "Nilai koreksi tidak lagi valid untuk transaksi ini." });
      return;
    }
    if (result.kind === "bad-code") {
      res.status(400).json({ error: "Kode persetujuan salah." });
      return;
    }
    req.log.info({ transactionId: result.correction.transactionId }, "GGS transaction correction applied");
    res.json(
      ApplyGgsAdminOwnerCorrectionResponse.parse(
        serializeCorrection(result.correction),
      ),
    );
  },
);

router.get(
  "/ggs/admin/owner-center/backup",
  requireGgsOwner,
  async (_req, res): Promise<void> => {
    const records = await db
      .select()
      .from(ggsOwnerRecordsTable)
      .where(
        or(
          eq(ggsOwnerRecordsTable.recordType, "branch"),
          eq(ggsOwnerRecordsTable.recordType, "customer"),
          eq(ggsOwnerRecordsTable.recordType, "finance"),
          eq(ggsOwnerRecordsTable.recordType, "employee_profile"),
          eq(ggsOwnerRecordsTable.recordType, "payroll"),
          eq(ggsOwnerRecordsTable.recordType, "settings"),
        ),
      )
      .orderBy(asc(ggsOwnerRecordsTable.recordType), asc(ggsOwnerRecordsTable.id))
      .limit(5000);
    res.json(
      GetGgsAdminOwnerCenterBackupResponse.parse({
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        records: records.map(serializeOwnerRecord),
      }),
    );
  },
);

router.post(
  "/ggs/admin/owner-center/backup",
  requireGgsOwner,
  async (req, res): Promise<void> => {
    const parsed = RestoreGgsAdminOwnerCenterBackupBody.safeParse(req.body);
    if (!parsed.success || parsed.data.formatVersion !== 1) {
      res.status(400).json({ error: parsed.success ? "Versi backup tidak didukung." : parsed.error.message });
      return;
    }
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    for (const item of parsed.data.records) {
      const normalized = normalizeRecordInput(item);
      if (!normalized.success) {
        skipped += 1;
        continue;
      }
      const [existing] = await db
        .select({ id: ggsOwnerRecordsTable.id, recordType: ggsOwnerRecordsTable.recordType })
        .from(ggsOwnerRecordsTable)
        .where(
          and(
            eq(ggsOwnerRecordsTable.recordType, normalized.values.recordType),
            eq(ggsOwnerRecordsTable.recordKey, normalized.values.recordKey),
          ),
        )
        .limit(1);
      if (existing && ["finance", "payroll"].includes(existing.recordType)) {
        skipped += 1;
        continue;
      }
      await db
        .insert(ggsOwnerRecordsTable)
        .values(normalized.values)
        .onConflictDoUpdate({
          target: [
            ggsOwnerRecordsTable.recordType,
            ggsOwnerRecordsTable.recordKey,
          ],
          set: {
            branchId: normalized.values.branchId,
            employeeId: normalized.values.employeeId,
            recordDate: normalized.values.recordDate,
            recordPeriod: normalized.values.recordPeriod,
            status: normalized.values.status,
            data: normalized.values.data,
            updatedAt: new Date(),
          },
        });
      if (existing) updated += 1;
      else imported += 1;
    }
    req.log.info({ imported, updated, skipped }, "GGS owner backup restored");
    res.json(
      RestoreGgsAdminOwnerCenterBackupResponse.parse({
        imported,
        updated,
        skipped,
      }),
    );
  },
);

export default router;
